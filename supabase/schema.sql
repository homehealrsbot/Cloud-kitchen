-- ============================================================================
-- Macro meals — Cloud Kitchen
-- سكيما كاملة لمشروع Supabase جديد. نفّذ هذا الملف مرة واحدة في SQL Editor،
-- وبعده نفّذ supabase/seed.sql لتحميل بيانات العمليات الحقيقية.
--
-- مبدأ الأمان: المنع هو الأصل. كل جدول عليه RLS، وما يُفتح إلا اللي يحتاجه
-- التطبيق فعلياً. مفتاح anon يُرسل للمتصفح بطبيعته، فـ RLS هو الحماية الوحيدة.
--
-- التسجيل: العميل يسجّل بنفسه بالإيميل. الموظف لا يسجّل نفسه أبداً — تُضاف
-- حسابات الموظفين يدوياً (القسم 12 فيه الطريقة، و supabase/staff.sql فيه أوامر جاهزة).
-- ============================================================================

-- ============================================================================
-- 1) الأدوار والموظفون
-- ============================================================================

create type staff_role as enum ('executive', 'kitchen', 'quality');

create table staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       staff_role not null,
  name       text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table staff is
  'من هو موظف وبأي دور. الصف هنا هو مصدر الصلاحية الوحيد — لا يُنشأ من التطبيق.';

-- سكيما خاصة للدوال المساعدة. PostgREST يكشف public فقط، فأي دالة هنا
-- غير قابلة للنداء من /rest/v1/rpc — والسياسات تناديها عادي لأن الصلاحية
-- محفوظة بـ grant usage أدناه.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- دوال مساعدة: security definer عشان تقرأ staff بدون ما تدخل في حلقة RLS
-- (سياسة على جدول تقرأ staff، وسياسة staff تقرأ staff... الخ)
create or replace function private.current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where user_id = auth.uid() and active
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from staff where user_id = auth.uid() and active)
$$;

-- هل دور المستخدم الحالي ضمن القائمة المسموحة؟
create or replace function private.has_role(allowed staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_staff_role() = any(allowed), false)
$$;

-- الإدارة التنفيذية أو لا شي. تُنادى من بداية كل دالّة تمسّ الفريق.
create or replace function private.require_executive()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.has_role(array['executive']::staff_role[]) then
    raise exception 'هذا الإجراء من صلاحية الإدارة التنفيذية فقط';
  end if;
end;
$$;

-- ---------- قراءة الفريق وكتابته ----------
-- جدول staff ما عليه أي سياسة كتابة في RLS بقصد: ولا عميل يرقّي نفسه، ولا
-- حتى حساب تنفيذي يكتب فيه مباشرة عبر /rest/v1. الطريق الوحيد هاتان
-- الدالّتان، وكل واحدة تفحص دور المنادي بنفسها قبل أي شي.
--
-- وهما security definer بالضرورة لا بالاختيار: تقرآن auth.users (وما هي
-- مكشوفة لأحد) وتكتبان في جدول محجوب بـRLS. فالتنبيه عليهما في مدقّق
-- Supabase متوقَّع — المقصود أن تكونا البابين الوحيدين.
create or replace function public.staff_list()
returns table (user_id uuid, email text, role staff_role, name text, active boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform private.require_executive();
  return query
    select s.user_id, u.email::text, s.role, s.name, s.active, s.created_at
    from staff s
    join auth.users u on u.id = s.user_id
    order by s.active desc, s.role, s.name;
end;
$$;

-- يضيف موظفاً بالإيميل أو يعدّل دوره أو يوقفه.
--
-- ما ننشئ حساباً هنا: الموظف لازم يكون له حساب في auth.users أولاً. لو
-- أنشأناه من هنا، صار بإمكان التنفيذي يولّد حسابات بلا كلمة سر يملكها
-- أصحابها — والإيميل المجهول أسوأ من الرفض.
create or replace function public.staff_set(
  p_email  text,
  p_role   staff_role,
  p_name   text default '',
  p_active boolean default true
)
returns table (user_id uuid, email text, role staff_role, name text, active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_email text := lower(trim(p_email));
begin
  perform private.require_executive();

  if v_email = '' then
    raise exception 'الإيميل مطلوب';
  end if;

  select u.id into v_id from auth.users u where lower(u.email) = v_email;
  if v_id is null then
    raise exception 'ما فيه حساب بهذا الإيميل. يسجّل صاحبه من صفحة التسجيل أو تضيفه من لوحة Supabase، وبعدها تعطيه الدور من هنا.';
  end if;

  insert into staff as s (user_id, role, name, active)
  values (v_id, p_role, coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)), p_active)
  on conflict on constraint staff_pkey do update
    set role = excluded.role, name = excluded.name, active = excluded.active;

  return query
    select s.user_id, v_email, s.role, s.name, s.active from staff s where s.user_id = v_id;
end;
$$;

-- آخر تنفيذي نشط ما يُوقَف ولا يُحذف ولا يتغيّر دوره.
--
-- بلا هذا المحفّز، غلطة واحدة تقفل النظام على نفسه: ما بقي أحد يقدر يضيف
-- موظفاً ولا يعتمد طلباً ولا يرجّع الصلاحية — ولا يُفتح إلا من لوحة Supabase.
create or replace function private.protect_last_executive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare others int;
begin
  select count(*) into others
    from staff
   where role = 'executive' and active and user_id <> old.user_id;

  if tg_op = 'DELETE' then
    if old.role = 'executive' and old.active and others = 0 then
      raise exception 'ما يمكن حذف آخر حساب إدارة تنفيذية نشط — عيّن تنفيذياً آخر أولاً';
    end if;
    return old;
  end if;

  if old.role = 'executive' and old.active
     and not (new.role = 'executive' and new.active)
     and others = 0 then
    raise exception 'ما يمكن إيقاف أو تغيير دور آخر حساب إدارة تنفيذية نشط — عيّن تنفيذياً آخر أولاً';
  end if;

  return new;
end;
$$;

create trigger trg_protect_last_executive
  before delete or update on staff
  for each row execute function private.protect_last_executive();

-- ============================================================================
-- 2) العملاء
-- ============================================================================

create table customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text unique,
  email       text,
  health_goal text check (health_goal in ('تنزيل وزن', 'ثبات الوزن', 'زيادة عضل')),
  zone        text,
  address     text,
  -- الملف الصحي (كان محفوظاً في المتصفح)
  weight_kg   numeric(5,1),
  height_cm   numeric(5,1),
  conditions  text[] not null default '{}',
  allergies   text[] not null default '{}',
  cuisines    text[] not null default '{}',   -- المطابخ المفضلة
  delivery_days text[] not null default '{}', -- أيام التوصيل المختارة
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_customers_user on customers(user_id);

-- صف العميل يُنشأ تلقائياً عند التسجيل — ما نعتمد على الواجهة تسويه
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into customers (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============================================================================
-- 3) بيانات العمليات — المكوّنات والمنيو والوصفات
-- ============================================================================

create table ops_ingredients (
  key           text primary key,
  name          text not null,
  name_en       text not null default '',
  kcal          numeric(8,2) not null default 0,
  protein       numeric(8,2) not null default 0,
  carb          numeric(8,2) not null default 0,
  fat           numeric(8,2) not null default 0,
  fiber         numeric(8,2) not null default 0,
  price         numeric(10,2) not null default 0,   -- ر.س / كجم
  allergen_text text not null default '',
  source        text not null default '',          -- مصدر القيم الغذائية، لا المورد
  flags         jsonb not null default '{}'::jsonb,  -- {gluten:true, nuts:false, ...}
  hidden        text not null default '',
  -- المورد: بوابة «مكوّنات وموردون» واعتماد «اعتماد المورد» بلا خانة يُكتب فيها
  -- المورد = اعتماد بلا اسم. الجودة تكتبه، والتنفيذي يكتب تاريخ عرض السعر.
  supplier         text not null default '',
  supplier_note    text not null default '',
  price_quote_date date,
  sort_order    int not null default 0,
  updated_at    timestamptz not null default now()
);

create table ops_menu_items (
  id           text primary key,                     -- C01, M03, F02 ...
  section      text not null,                        -- رئيسي / فطور / سناك / شوربة / سلطة / حلا
  category     text not null default '',             -- دجاج / لحم / سمك / ربيان ...
  name         text not null,
  name_en      text not null default '',
  cuisine      text not null default '',
  identity     text not null default '',             -- خليجي / عربي / آسيوي ...
  shelf_life_h int not null default 48,
  reheat       text not null default '',
  ops_note     text not null default '',
  method       text not null default '',
  eng_group    text not null default '',
  sort_order   int not null default 0,
  updated_at   timestamptz not null default now()
);

create index idx_menu_section on ops_menu_items(section);

create table ops_recipe_lines (
  id         bigserial primary key,
  sku        text not null references ops_menu_items(id) on delete cascade,
  type       text not null check (type in ('P','C','V','S')),
  ing        text not null references ops_ingredients(key),
  grams      numeric(8,2) not null check (grams > 0),
  sort_order int not null default 0
);

create index idx_recipe_sku on ops_recipe_lines(sku);

-- ============================================================================
-- 4) الإعدادات وجدول الدوران
-- ============================================================================

-- صف واحد فقط. jsonb لأن الشكل يطابق نوع Settings في المحرك حرفياً،
-- وتفكيكه لأعمدة يعني تعديل السكيما كل ما أضفنا إعداد.
create table ops_settings (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table ops_rotation_meta (
  id          int primary key default 1 check (id = 1),
  slot_labels text[] not null,
  slot_rule   text[] not null,
  day_labels  text[] not null,
  rules       text not null default ''
);

create table ops_rotation (
  day_index int  not null,
  slot      int  not null,
  sku       text not null references ops_menu_items(id),
  primary key (day_index, slot)
);

-- ============================================================================
-- 5) بوابات الجودة واعتماد المكوّنات
-- ============================================================================

create type gate_status as enum ('READY', 'PENDING', 'HOLD');
create type pilot_result as enum ('PASS', 'FAIL');

-- ---------- تعريفات البوابات: بيانات، لا ثوابت ----------
--
-- كانت البوابات ثماني بوابات مكتوبة في الكود، وعددها (8) مكتوب في شرط النشر
-- و CHECK (gate_index between 0 and 7). يعني إضافة بوابة = تعديل كود وقاعدة.
-- الآن التعريفات صفوف: الإدارة التنفيذية تضيف وتوقف وتنقل الملكية من شاشة
-- «الفريق والصلاحيات»، والمحرك وسياسات RLS يقرأون العدد والملكية من هنا.
--
-- kind هو العقد الثابت بين البيانات والمعادلات (ما يُغيّره المستخدم بحرية):
--   standard      بوابة عامة
--   kitchen_pilot محسوبة من تجارب Pilot + قرار الشيف (owner_role = null)
--   shelf         بوابة الصلاحية — يربطها المحرك بتنبيه الصلاحية الطويلة
--   price         بوابة السعر والهامش
--
-- owner_role = الدور الوحيد اللي يختم البوابة. null = محسوبة فما يختمها أحد.
create table ops_gate_defs (
  gate_index               int  primary key,
  label                    text not null,
  kind                     text not null default 'standard'
    check (kind in ('standard', 'kitchen_pilot', 'shelf', 'price')),
  owner_role               staff_role,
  resets_on_recipe_change  boolean not null default false,
  active                   boolean not null default true,
  note                     text not null default ''
);

comment on table ops_gate_defs is
  'بوابات اعتماد الصنف. العدد والملكية مُدخلات من الإدارة التنفيذية — شرط النشر يُحسب منها.';

create table ops_ing_approval_defs (
  approval_index int  primary key,
  label          text not null,
  kind           text not null default 'standard'
    check (kind in ('standard', 'supplier', 'allergen', 'price')),
  owner_role     staff_role,
  active         boolean not null default true,
  note           text not null default ''
);

-- ---------- محاور قرار الإطلاق (GO / NO-GO) ----------
-- ورقة «لوحة_التحكم» في ملف العمليات: قرار واحد فوق وتحته جدول المحاور.
-- المحاور هنا مُدخلات مثل البوابات: التنفيذي يوقف محوراً أو يعيد ترتيبه أو
-- يسمّيه بلغته. المكتوب في الكود هو «كيف يُحسب كل نوع» فقط، ولهذا kind
-- محصور بقائمة: نوع ما له محرك = محور يرجّع صفراً بلا سبب مفهوم.
create table ops_launch_axes (
  axis_index int  primary key,
  label      text not null,
  kind       text not null
    check (kind in ('kitchen_gate', 'sku_gates', 'ingredients', 'food_safety', 'production')),
  active     boolean not null default true,
  note       text not null default ''
);

comment on table ops_launch_axes is
  'محاور جاهزية الإطلاق. القرار يُحسب منها ومن حد الإطلاق الأدنى في الإعدادات — ما فيه رقم مكتوب باليد.';

-- ---------- حالات البوابات لكل صنف ----------
-- gate_index مفتاح أجنبي على التعريفات، لا مجال أرقام مكتوب.
-- approved_by_name / approved_at: الاعتماد بلا اسم وتاريخ مو اعتماد.
create table ops_gates (
  sku              text not null references ops_menu_items(id) on delete cascade,
  gate_index       int  not null references ops_gate_defs(gate_index) on delete cascade,
  status           gate_status not null default 'PENDING',
  note             text not null default '',
  approved_by_name text,
  approved_at      timestamptz,
  updated_by       uuid references auth.users(id),
  updated_at       timestamptz not null default now(),
  primary key (sku, gate_index)
);

create table ops_ing_approvals (
  ing_key          text not null references ops_ingredients(key) on delete cascade,
  approval_index   int  not null references ops_ing_approval_defs(approval_index) on delete cascade,
  status           gate_status not null default 'PENDING',
  note             text not null default '',
  approved_by_name text,
  approved_at      timestamptz,
  updated_by       uuid references auth.users(id),
  updated_at       timestamptz not null default now(),
  primary key (ing_key, approval_index)
);

-- ---------- مُدخلات بوابة المطبخ ----------
-- الجودة تسجّل التجارب، والشيف يقرّر. كم تجربة ناجحة مطلوبة؟ مُدخل في
-- ops_settings.data->'pilotPassesRequired' — لا رقم هنا ولا في الكود.
create table ops_pilot_trials (
  sku              text not null references ops_menu_items(id) on delete cascade,
  trial_index      int  not null check (trial_index >= 1),
  result           pilot_result,
  cooked_portion_g numeric,
  trial_date       date,
  notes            text not null default '',
  recorded_by      uuid references auth.users(id),
  recorded_at      timestamptz not null default now(),
  primary key (sku, trial_index)
);

create table ops_kitchen_gate (
  sku           text primary key references ops_menu_items(id) on delete cascade,
  chef_decision gate_status not null default 'PENDING',
  chef_name     text not null default '',
  approved_at   timestamptz,
  note          text not null default '',
  updated_by    uuid references auth.users(id),
  updated_at    timestamptz not null default now()
);

-- صلاحية معلنة معدّلة لصنف (تتجاوز قيمة المنيو)
create table ops_shelf_life (
  sku        text primary key references ops_menu_items(id) on delete cascade,
  hours      int not null check (hours > 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 6) خطة الإنتاج وهندسة المنيو
-- ============================================================================

create table ops_production (
  day_index  int not null,
  slot       int not null,
  portions   int not null check (portions >= 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (day_index, slot)
);

create table ops_units_sold (
  sku        text primary key references ops_menu_items(id) on delete cascade,
  units      int not null check (units >= 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 7) سجل التعديلات
-- ============================================================================

create table ops_audit (
  id      bigserial primary key,
  ts      timestamptz not null default now(),
  user_id uuid references auth.users(id),
  role    text not null default '',
  by      text not null default '',
  area    text not null default '',
  text    text not null
);

create index idx_audit_ts on ops_audit(ts desc);

-- ============================================================================
-- 7.5) سجلات السلامة الغذائية
-- ============================================================================
-- سجلات مطلوبة فعلياً ضمن اشتراطات السلامة الغذائية. كانت الصفحات تعرض قراءات
-- وهمية "ناجحة" مكتوبة في الكود — وهذا أخطر نوع بيانات وهمية لأنه يوحي بالتزام
-- ما صار. الآن كل قراءة لها كاتب ووقت فعلي.

-- قراءات حرارة التخزين كان لها جدول منفصل (safety_temperature_log) بحدود
-- مكتوبة في كود التطبيق. انتقلت لسجل مراقبة النقاط الحرجة في القسم 7.6:
-- الحدود صارت صفوفاً تحددها الجودة، والقراءة تُحكم بها في القاعدة.

create table safety_expiry_batches (
  id          bigserial primary key,
  name        text not null,
  batch       text not null default '',
  expiry_date date not null,
  consumed    boolean not null default false,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now()
);

create index idx_expiry_date on safety_expiry_batches(expiry_date);

-- ============================================================================
-- 7.6) إدارة سلامة الغذاء: HACCP، الحدود الحرجة، PRP، ISO، عدم المطابقة
-- ============================================================================
--
-- نفس مبدأ بوابات الاعتماد: ما فيه رقم في الكود. الحدود الحرجة (حرارة الثلاجة،
-- حرارة قلب الطبخ، زمن التبريد) كانت مكتوبة في src/lib/safety.ts كـ SAFE_RANGES
-- ثابتة — وهي أسوأ مكان لرقم ثابت: الجودة هي اللي تحددها حسب المنتج والجهة
-- الرقابية، وتتغيّر.
--
-- التقسيم: تعريفات تكتبها الجودة، وإدخالات يسجّلها المطبخ، وتوقيع ثانٍ للاعتماد.

create table safety_haccp_steps (
  step_index      int primary key,
  label           text not null,
  stage           text not null default '',   -- استلام / تخزين / تحضير / طبخ / تبريد / تسليم
  hazard          text not null default '',
  hazard_type     text not null default 'biological'
    check (hazard_type in ('biological', 'chemical', 'physical', 'allergen')),
  control_measure text not null default '',
  is_ccp          boolean not null default false,
  ccp_code        text not null default '',
  active          boolean not null default true,
  note            text not null default ''
);

comment on table safety_haccp_steps is
  'خطة HACCP: كل خطوة في المسار، خطرها، وإجراء ضبطها. تحددها الجودة.';

-- حد واحد أو أكثر لكل خطوة حرجة. نوع الحد يحدد كيف يُقاس ويُحكم عليه:
--   numeric  → قراءة رقمية بين min و max (أي طرف null = غير محدود)
--   boolean  → فحص نعم/لا
create table safety_critical_limits (
  id                bigserial primary key,
  step_index        int not null references safety_haccp_steps(step_index) on delete cascade,
  parameter         text not null,
  limit_kind        text not null default 'numeric' check (limit_kind in ('numeric', 'boolean')),
  min_value         numeric,
  max_value         numeric,
  unit              text not null default '',
  monitoring_method text not null default '',
  frequency         text not null default '',
  corrective_action text not null default '',
  active            boolean not null default true,
  sort_order        int not null default 0,
  constraint numeric_limit_has_a_bound
    check (limit_kind <> 'numeric' or min_value is not null or max_value is not null)
);

create index idx_critical_limits_step on safety_critical_limits(step_index);

-- المطبخ يسجّل القراءة، والقاعدة تحكم عليها من الحد الحرج — لا من رأي المسجّل.
-- والجودة تعتمد السجل لاحقاً بتوقيع ثانٍ لا ينفع يكون نفس الشخص.
create table safety_ccp_log (
  id                bigserial primary key,
  limit_id          bigint not null references safety_critical_limits(id) on delete cascade,
  log_date          date not null default current_date,
  shift             text not null default '',
  reading_value     numeric,
  reading_bool      boolean,
  passed            boolean not null default false,  -- يحسبها محفّز
  out_of_limit_note text not null default '',
  corrective_action text not null default '',
  recorded_by       uuid references auth.users(id),
  recorded_by_name  text not null default '',
  recorded_at       timestamptz not null default now(),
  verified_by       uuid references auth.users(id),
  verified_by_name  text,
  verified_at       timestamptz
);

create index idx_ccp_log_date on safety_ccp_log(log_date desc);
create index idx_ccp_log_limit on safety_ccp_log(limit_id);

create table safety_prp_programs (
  code        text primary key,
  label       text not null,
  category    text not null default '',
  owner_role  staff_role,
  frequency   text not null default '',
  description text not null default '',
  active      boolean not null default true,
  sort_order  int not null default 0
);

create table safety_prp_log (
  id               bigserial primary key,
  prp_code         text not null references safety_prp_programs(code) on delete cascade,
  log_date         date not null default current_date,
  done             boolean not null default false,
  note             text not null default '',
  recorded_by      uuid references auth.users(id),
  recorded_by_name text not null default '',
  recorded_at      timestamptz not null default now(),
  unique (prp_code, log_date)
);

create index idx_prp_log_date on safety_prp_log(log_date desc);

create table safety_iso_clauses (
  clause      text primary key,
  title       text not null,
  requirement text not null default '',
  status      text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'implemented', 'verified', 'not_applicable')),
  evidence    text not null default '',
  owner_role  staff_role,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  sort_order  int not null default 0
);

-- أي موظف يرفع، والجودة تحلل وتغلق. الحرجة يغلقها التنفيذي.
create table safety_nonconformance (
  id                 bigserial primary key,
  raised_at          timestamptz not null default now(),
  raised_by          uuid references auth.users(id),
  raised_by_name     text not null default '',
  source             text not null default '',
  ccp_log_id         bigint references safety_ccp_log(id) on delete set null,
  severity           text not null default 'minor'
    check (severity in ('minor', 'major', 'critical')),
  description        text not null,
  immediate_action   text not null default '',
  root_cause         text not null default '',
  corrective_action  text not null default '',
  preventive_action  text not null default '',
  status             text not null default 'open'
    check (status in ('open', 'investigating', 'action_taken', 'closed')),
  due_date           date,
  closed_by          uuid references auth.users(id),
  closed_by_name     text,
  closed_at          timestamptz,
  updated_at         timestamptz not null default now()
);

create index idx_ncr_status on safety_nonconformance(status, raised_at desc);

-- ============================================================================
-- 7.8) طلبات التغيير — مسوّدة ثم إرسال ثم اعتماد
-- ============================================================================
--
-- قبل: كل ضغطة زر كانت تكتب في القاعدة فوراً. يعني ما فيه «تراجع»، وما فيه
-- مراجعة قبل الأثر، والموظف يغيّر رقماً يمسّ السعر أو الاعتماد بلا ما يشوفه
-- أحد. صار المسار:
--
--   ١ · مسوّدة في الصفحة   — لا شي يُكتب، والموظف يجمّع تعديلاته ويراجعها
--   ٢ · إرسال              — تُكتب هنا كطلبات بحالة pending، والبيانات الحيّة ما تتغيّر
--   ٣ · اعتماد             — صاحب السلطة يقبل أو يرفض، وعند القبول فقط يُطبَّق
--
-- وإذا كان المُرسل هو نفسه صاحب سلطة الاعتماد، يُطبَّق فوراً ويُسجَّل أنه
-- اعتمد نفسه — ما نخفي الخطوة، نسجّلها.

create type change_status as enum ('pending', 'applied', 'rejected', 'failed');
create type change_strategy as enum ('upsert', 'insert', 'replace_lines');

-- القائمة البيضاء. دالة التطبيق ما تكتب في أي جدول ولا عمود خارج الصف هنا،
-- فحتى لو انبعث طلب مزوّر ما يقدر يلمس عموداً ما هو مكتوب في patch_columns.
-- وهي بيانات لا كود: التنفيذي يوقف نوعاً أو ينقل سلطة اعتماده لدور ثاني.
create table ops_change_kinds (
  kind           text primary key,
  label          text not null,
  area           text not null,                       -- للعرض والتجميع
  target_table   text not null,
  strategy       change_strategy not null default 'upsert',
  key_columns    text[] not null default '{}',
  patch_columns  text[] not null,
  requester_roles staff_role[] not null default '{executive,kitchen,quality}',
  approver_role  staff_role not null default 'executive',
  active         boolean not null default true,
  note           text not null default ''
);

comment on table ops_change_kinds is
  'أنواع التغيير المسموح بها وقائمة أعمدتها البيضاء. سلطة الاعتماد عمود هنا، لا شرط في الكود.';

-- ---------- حرس القائمة البيضاء ----------
-- الأعمدة البنيوية هنا كود لا بيانات: target_table و strategy و key_columns و
-- patch_columns هي اللي تحدد إيش يقدر private.apply_change يكتب وفي أي جدول.
-- لو صارت قابلة للتعديل من داخل النظام، صار بإمكان من يملك نوعاً واحداً أن
-- يوسّعه ليكتب أي عمود في أي جدول — فيسقط الحصر كله. فتُعدَّل من الهجرة فقط.
--
-- وصف change_kind.set محمي أكثر: هو النوع اللي يعدّل القواعد. لو قدر أحد
-- يوسّع requester_roles عليه، صار يعطي نفسه سلطة الاعتماد على كل شي.
create or replace function private.guard_change_kinds()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $g$
begin
  if tg_op = 'DELETE' then
    raise exception 'أنواع التغيير ما تُحذف — أوقفها بـ active = false حتى يبقى سجل الطلبات القديمة مفهوماً';
  end if;

  if new.kind           is distinct from old.kind
  or new.target_table   is distinct from old.target_table
  or new.strategy       is distinct from old.strategy
  or new.key_columns    is distinct from old.key_columns
  or new.patch_columns  is distinct from old.patch_columns then
    raise exception 'بنية نوع التغيير (الجدول والاستراتيجية والأعمدة) تُعدَّل من الهجرة فقط — هي القائمة البيضاء نفسها';
  end if;

  if old.kind = 'change_kind.set'
  and (new.requester_roles is distinct from old.requester_roles
    or new.approver_role   is distinct from old.approver_role
    or new.active          is distinct from old.active) then
    raise exception 'سلطة تعديل القواعد نفسها ثابتة على الإدارة التنفيذية — ما تُنقل من داخل النظام';
  end if;

  return new;
end;
$g$;

create trigger trg_change_kinds_guard
  before update or delete on ops_change_kinds
  for each row execute function private.guard_change_kinds();

create table ops_change_requests (
  id                bigserial primary key,
  batch_id          uuid not null,                    -- كل ضغطة «إرسال» دفعة واحدة
  kind              text not null references ops_change_kinds(kind),
  target_key        jsonb not null default '{}'::jsonb,
  patch             jsonb not null,
  before_val        jsonb,                            -- القيمة قبل التغيير، للمراجعة
  summary           text not null,                    -- جملة عربية يقرأها المعتمِد
  status            change_status not null default 'pending',
  requested_by      uuid not null references auth.users(id),
  requested_by_name text not null default '',
  requested_by_role staff_role not null,
  requested_at      timestamptz not null default now(),
  decided_by        uuid references auth.users(id),
  decided_by_name   text,
  decided_at        timestamptz,
  decision_note     text not null default '',
  error             text not null default ''
);

create index idx_change_req_status on ops_change_requests(status, requested_at desc);
create index idx_change_req_batch  on ops_change_requests(batch_id);
create index idx_change_req_by     on ops_change_requests(requested_by, requested_at desc);

-- ============================================================================
-- 8) تحديث updated_at تلقائياً
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_customers_updated    before update on customers        for each row execute function set_updated_at();
create trigger trg_ingredients_updated  before update on ops_ingredients  for each row execute function set_updated_at();
create trigger trg_menu_updated         before update on ops_menu_items   for each row execute function set_updated_at();
create trigger trg_settings_updated     before update on ops_settings     for each row execute function set_updated_at();
create trigger trg_gates_updated        before update on ops_gates        for each row execute function set_updated_at();
create trigger trg_ingappr_updated      before update on ops_ing_approvals for each row execute function set_updated_at();
create trigger trg_shelf_updated        before update on ops_shelf_life   for each row execute function set_updated_at();
create trigger trg_production_updated   before update on ops_production   for each row execute function set_updated_at();
create trigger trg_units_updated        before update on ops_units_sold   for each row execute function set_updated_at();

-- ============================================================================
-- 9) Row Level Security
-- ============================================================================
-- جدول الصلاحيات مأخوذ من MATRIX في src/lib/ops/roles.ts — نفس التوزيع بالضبط،
-- بس مطبّق في قاعدة البيانات بحيث ما ينفع تجاوزه من المتصفح.
--
--   القراءة  : الموظفون الثلاثة يشوفون بيانات العمليات
--   الأسعار  : التنفيذي فقط
--   الوصفات/الإنتاج/الدوران : المطبخ يعدّل
--   البوابات/الحساسية/الصلاحية : الجودة تعدّل
--   بوابة السعر + الإعدادات + المبيعات + السجل : التنفيذي
--   العميل   : يشوف صفه هو، والأصناف الجاهزة للبيع فقط

alter table staff             enable row level security;
alter table customers         enable row level security;
alter table ops_ingredients   enable row level security;
alter table ops_menu_items    enable row level security;
alter table ops_recipe_lines  enable row level security;
alter table ops_settings      enable row level security;
alter table ops_rotation_meta enable row level security;
alter table ops_rotation      enable row level security;
alter table ops_gate_defs     enable row level security;
alter table ops_ing_approval_defs enable row level security;
alter table ops_launch_axes   enable row level security;
alter table ops_change_kinds  enable row level security;
alter table ops_change_requests enable row level security;
alter table ops_gates         enable row level security;
alter table ops_ing_approvals enable row level security;
alter table ops_pilot_trials  enable row level security;
alter table ops_kitchen_gate  enable row level security;
alter table ops_shelf_life    enable row level security;
alter table ops_production    enable row level security;
alter table ops_units_sold    enable row level security;
alter table ops_audit         enable row level security;
alter table safety_expiry_batches  enable row level security;
alter table safety_haccp_steps     enable row level security;
alter table safety_critical_limits enable row level security;
alter table safety_ccp_log         enable row level security;
alter table safety_prp_programs    enable row level security;
alter table safety_prp_log         enable row level security;
alter table safety_iso_clauses     enable row level security;
alter table safety_nonconformance  enable row level security;

-- ---------- staff ----------
-- الموظف يقرأ صفه (يعرف دوره). التنفيذي يقرأ الكل.
-- ما فيه أي سياسة INSERT/UPDATE/DELETE: إضافة الموظفين من لوحة Supabase فقط.
create policy "staff reads own row" on staff
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "executive reads all staff" on staff
  for select to authenticated
  using (private.has_role(array['executive']::staff_role[]));

-- ---------- customers ----------
create policy "customer reads own row" on customers
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "customer updates own row" on customers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- الموظفون يشوفون العملاء (تشغيل الطلبات والتوصيل)
create policy "staff reads customers" on customers
  for select to authenticated
  using (private.is_staff());

-- ---------- ops_menu_items ----------
-- العميل والزائر: الأصناف الجاهزة للبيع فقط = كل بوابة نشطة لها صف READY
-- لهذا الصنف. نفس شرط deriveSkuQuality في المحرك، لكن هنا ما ينفع تجاوزه.
--
-- ليش «كل بوابة نشطة لها صف» ومو «عدد صفوف READY = عدد البوابات»؟ لأن المقارنة
-- بعددين فيها ثغرتان: لو ما فيه بوابات معرّفة يصير 0 = 0 فينشر كل شي، وصف
-- READY لبوابة موقوفة يُحسب فيكمّل العدد بدل بوابة نشطة ناقصة.
create policy "public reads sellable menu" on ops_menu_items
  for select to anon, authenticated
  using (
    exists (select 1 from ops_gate_defs where active)
    and not exists (
      select 1 from ops_gate_defs d
      where d.active
        and not exists (
          select 1 from ops_gates g
          where g.sku = ops_menu_items.id
            and g.gate_index = d.gate_index
            and g.status = 'READY'
        )
    )
  );

create policy "staff reads all menu" on ops_menu_items
  for select to authenticated using (private.is_staff());

create policy "kitchen updates menu" on ops_menu_items
  for update to authenticated
  using (private.has_role(array['kitchen']::staff_role[]))
  with check (private.has_role(array['kitchen']::staff_role[]));

-- ---------- ops_ingredients ----------
create policy "staff reads ingredients" on ops_ingredients
  for select to authenticated using (private.is_staff());

-- الجودة تعدّل القيم الغذائية والحساسية؛ التنفيذي يعدّل السعر.
-- مهم: RLS يعمل على مستوى الصف لا العمود، وكل مستخدمي التطبيق يشتركون في نفس دور
-- Postgres (authenticated) — فـ GRANT على الأعمدة لا يقدر يفرّق بين الجودة والتنفيذي.
-- الفصل الفعلي بين الأعمدة يفرضه trigger أسفل هذا القسم.
create policy "quality or executive updates ingredients" on ops_ingredients
  for update to authenticated
  using (private.has_role(array['quality','executive']::staff_role[]))
  with check (private.has_role(array['quality','executive']::staff_role[]));

-- ---------- ops_recipe_lines ----------
create policy "staff reads recipes" on ops_recipe_lines
  for select to authenticated using (private.is_staff());

create policy "kitchen writes recipes" on ops_recipe_lines
  for all to authenticated
  using (private.has_role(array['kitchen']::staff_role[]))
  with check (private.has_role(array['kitchen']::staff_role[]));

-- ---------- ops_settings / rotation_meta ----------
create policy "staff reads settings" on ops_settings
  for select to authenticated using (private.is_staff());

create policy "executive writes settings" on ops_settings
  for all to authenticated
  using (private.has_role(array['executive']::staff_role[]))
  with check (private.has_role(array['executive']::staff_role[]));

create policy "staff reads rotation meta" on ops_rotation_meta
  for select to authenticated using (private.is_staff());

-- ---------- ops_rotation ----------
create policy "staff reads rotation" on ops_rotation
  for select to authenticated using (private.is_staff());

create policy "kitchen writes rotation" on ops_rotation
  for all to authenticated
  using (private.has_role(array['kitchen']::staff_role[]))
  with check (private.has_role(array['kitchen']::staff_role[]));

-- ---------- ops_gates ----------
-- القراءة مفتوحة للزائر لأن سياسة المنيو أعلاه تعتمد على عدّ البوابات،
-- ولأن العميل يستفيد من معرفة إن الصنف معتمد. ما فيها معلومة حساسة.
create policy "anyone reads gates" on ops_gates
  for select to anon, authenticated using (true);

-- مين يختم البوابة؟ owner_role في تعريفها. سياسة واحدة لكل البوابات بدل
-- «السابعة للتنفيذي وما عداها للجودة» — فنقل ملكية بوابة أو إضافة واحدة ما
-- يحتاج تعديل سياسة. و owner_role = null (المحسوبة) ما يختمها أحد: المحفّز
-- في القسم 11 هو اللي يكتبها، و SECURITY DEFINER يتجاوز RLS.
create policy "gate owner writes gates" on ops_gates
  for all to authenticated
  using (
    exists (
      select 1 from ops_gate_defs d
      where d.gate_index = ops_gates.gate_index
        and d.active and d.owner_role is not null
        and private.has_role(array[d.owner_role])
    )
  )
  with check (
    exists (
      select 1 from ops_gate_defs d
      where d.gate_index = ops_gates.gate_index
        and d.active and d.owner_role is not null
        and private.has_role(array[d.owner_role])
    )
  );

-- ---------- ops_gate_defs / ops_ing_approval_defs ----------
-- القراءة مفتوحة: سياسة المنيو أعلاه تقرأها، والعميل ما فيها شي حساس له.
-- الكتابة للتنفيذي فقط — هنا تُمنح السلطة، فالقسم ما يعطي نفسه بوابة.
create policy "anyone reads gate defs" on ops_gate_defs
  for select to anon, authenticated using (true);

create policy "executive writes gate defs" on ops_gate_defs
  for all to authenticated
  using (private.has_role(array['executive']::staff_role[]))
  with check (private.has_role(array['executive']::staff_role[]));

create policy "anyone reads ing approval defs" on ops_ing_approval_defs
  for select to anon, authenticated using (true);

create policy "executive writes ing approval defs" on ops_ing_approval_defs
  for all to authenticated
  using (private.has_role(array['executive']::staff_role[]))
  with check (private.has_role(array['executive']::staff_role[]));

-- ---------- ops_launch_axes ----------
-- كل موظف يقرأ لوحة الجاهزية: هي اللي تقول لقسمه وش يوقف الإطلاق. وتعريف
-- المحاور نفسها للتنفيذي وحده — نفس قاعدة البوابات، فالقسم ما يشيل المحور
-- اللي يقيسه.
create policy "staff reads launch axes" on ops_launch_axes
  for select to authenticated
  using (private.has_role(array['executive','kitchen','quality']::staff_role[]));

create policy "executive writes launch axes" on ops_launch_axes
  for all to authenticated
  using (private.has_role(array['executive']::staff_role[]))
  with check (private.has_role(array['executive']::staff_role[]));

-- ---------- ops_ing_approvals ----------
create policy "staff reads ing approvals" on ops_ing_approvals
  for select to authenticated using (private.is_staff());

create policy "approval owner writes ing approvals" on ops_ing_approvals
  for all to authenticated
  using (
    exists (
      select 1 from ops_ing_approval_defs d
      where d.approval_index = ops_ing_approvals.approval_index
        and d.active and d.owner_role is not null
        and private.has_role(array[d.owner_role])
    )
  )
  with check (
    exists (
      select 1 from ops_ing_approval_defs d
      where d.approval_index = ops_ing_approvals.approval_index
        and d.active and d.owner_role is not null
        and private.has_role(array[d.owner_role])
    )
  );

-- ---------- ops_pilot_trials / ops_kitchen_gate ----------
-- فصل الطرفين بقصد: الجودة تسجّل التجارب، والمطبخ يقرّر. فما فيه طرف يعتمد
-- شغله بنفسه من الطرفين.
create policy "staff reads pilot trials" on ops_pilot_trials
  for select to authenticated using ((select private.is_staff()));

create policy "quality writes pilot trials" on ops_pilot_trials
  for all to authenticated
  using (private.has_role(array['quality']::staff_role[]))
  with check (private.has_role(array['quality']::staff_role[]));

create policy "staff reads kitchen gate" on ops_kitchen_gate
  for select to authenticated using ((select private.is_staff()));

create policy "kitchen writes kitchen gate" on ops_kitchen_gate
  for all to authenticated
  using (private.has_role(array['kitchen']::staff_role[]))
  with check (private.has_role(array['kitchen']::staff_role[]));

-- ---------- ops_shelf_life ----------
create policy "anyone reads shelf life" on ops_shelf_life
  for select to anon, authenticated using (true);

create policy "quality writes shelf life" on ops_shelf_life
  for all to authenticated
  using (private.has_role(array['quality']::staff_role[]))
  with check (private.has_role(array['quality']::staff_role[]));

-- ---------- ops_production ----------
create policy "staff reads production" on ops_production
  for select to authenticated using (private.is_staff());

create policy "kitchen writes production" on ops_production
  for all to authenticated
  using (private.has_role(array['kitchen']::staff_role[]))
  with check (private.has_role(array['kitchen']::staff_role[]));

-- ---------- ops_units_sold ----------
create policy "executive reads units sold" on ops_units_sold
  for select to authenticated
  using (private.has_role(array['executive']::staff_role[]));

create policy "executive writes units sold" on ops_units_sold
  for all to authenticated
  using (private.has_role(array['executive']::staff_role[]))
  with check (private.has_role(array['executive']::staff_role[]));

-- ---------- ops_audit ----------
-- التنفيذي يقرأ السجل. أي موظف يكتب فيه (كل تعديل يسجّل نفسه).
-- ما فيه UPDATE ولا DELETE لأي أحد — السجل للإضافة فقط.
create policy "executive reads audit" on ops_audit
  for select to authenticated
  using (private.has_role(array['executive']::staff_role[]));

create policy "staff appends audit" on ops_audit
  for insert to authenticated
  with check ((select private.is_staff()) and user_id = (select auth.uid()));

-- ---------- سجلات السلامة ----------
-- الأدوار الثلاثة تقرأ وتكتب (مطبخ وجودة وتنفيذي) — مطابق لـ legacy.safetyLogs
create policy "staff reads expiry batches" on safety_expiry_batches
  for select to authenticated using (private.is_staff());

create policy "staff writes expiry batches" on safety_expiry_batches
  for insert to authenticated
  with check ((select private.is_staff()) and recorded_by = (select auth.uid()));

create policy "staff updates expiry batches" on safety_expiry_batches
  for update to authenticated
  using (private.is_staff()) with check (private.is_staff());

-- ملاحظة: ما فيه سياسة UPDATE ولا DELETE على سجل الحرارة — السجل للإضافة فقط
-- عشان ما تُعدَّل قراءة بعد تسجيلها.

-- ---------- إدارة سلامة الغذاء ----------
-- الخطة والتعريفات: كل الموظفين يقرأون، والجودة وحدها تكتب.
create policy "staff reads haccp steps" on safety_haccp_steps
  for select to authenticated using ((select private.is_staff()));
create policy "quality writes haccp steps" on safety_haccp_steps
  for all to authenticated
  using (private.has_role(array['quality']::staff_role[]))
  with check (private.has_role(array['quality']::staff_role[]));

create policy "staff reads critical limits" on safety_critical_limits
  for select to authenticated using ((select private.is_staff()));
create policy "quality writes critical limits" on safety_critical_limits
  for all to authenticated
  using (private.has_role(array['quality']::staff_role[]))
  with check (private.has_role(array['quality']::staff_role[]));

create policy "staff reads prp programs" on safety_prp_programs
  for select to authenticated using ((select private.is_staff()));
create policy "quality writes prp programs" on safety_prp_programs
  for all to authenticated
  using (private.has_role(array['quality']::staff_role[]))
  with check (private.has_role(array['quality']::staff_role[]));

create policy "staff reads iso clauses" on safety_iso_clauses
  for select to authenticated using ((select private.is_staff()));
create policy "quality writes iso clauses" on safety_iso_clauses
  for all to authenticated
  using (private.has_role(array['quality']::staff_role[]))
  with check (private.has_role(array['quality']::staff_role[]));

-- السجل اليومي: المطبخ يسجّل والجودة تعتمد. كلاهما يحتاج update على الصف،
-- فالفصل بين «من يسجّل» و«من يعتمد» يفرضه محفّز على مستوى العمود (القسم 11)
-- لا سياسة على مستوى الصف.
create policy "staff reads ccp log" on safety_ccp_log
  for select to authenticated using ((select private.is_staff()));
create policy "kitchen and quality write ccp log" on safety_ccp_log
  for all to authenticated
  using (private.has_role(array['kitchen', 'quality']::staff_role[]))
  with check (private.has_role(array['kitchen', 'quality']::staff_role[]));

create policy "staff reads prp log" on safety_prp_log
  for select to authenticated using ((select private.is_staff()));
create policy "kitchen and quality write prp log" on safety_prp_log
  for all to authenticated
  using (private.has_role(array['kitchen', 'quality']::staff_role[]))
  with check (private.has_role(array['kitchen', 'quality']::staff_role[]));

-- عدم المطابقة: أي موظف يرفعها ويقرأها — لأن اللي يشوف المشكلة أول هو اللي
-- يبلّغ، ومنع التبليغ أسوأ من بلاغ زائد. والمعالجة والإغلاق للجودة والتنفيذي.
create policy "staff reads ncr" on safety_nonconformance
  for select to authenticated using ((select private.is_staff()));
create policy "staff raises ncr" on safety_nonconformance
  for insert to authenticated with check ((select private.is_staff()));
create policy "quality and executive update ncr" on safety_nonconformance
  for update to authenticated
  using (private.has_role(array['quality', 'executive']::staff_role[]))
  with check (private.has_role(array['quality', 'executive']::staff_role[]));

-- ---------- طلبات التغيير ----------
create policy "staff reads change kinds" on ops_change_kinds
  for select to authenticated using ((select private.is_staff()));
create policy "executive writes change kinds" on ops_change_kinds
  for all to authenticated
  using (private.has_role(array['executive']::staff_role[]))
  with check (private.has_role(array['executive']::staff_role[]));

-- الموظف يشوف طلباته، والمعتمِد يشوف اللي ينتظر قراره. وما فيه سياسة update
-- ولا delete إطلاقاً: الحالة ما تتغيّر إلا من decide_change، فلا أحد يعلّم
-- طلبه «مقبول» ولا يمحي أثر طلب رُفض.
create policy "requester reads own requests" on ops_change_requests
  for select to authenticated
  using (requested_by = (select auth.uid()));

create policy "approver reads pending requests" on ops_change_requests
  for select to authenticated
  using (
    exists (
      select 1 from ops_change_kinds k
       where k.kind = ops_change_requests.kind
         and private.has_role(array[k.approver_role])
    )
  );

create policy "staff submits own requests" on ops_change_requests
  for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and status = 'pending'
    and requested_by_role = (select private.current_staff_role())
    and exists (
      select 1 from ops_change_kinds k
       where k.kind = ops_change_requests.kind
         and k.active
         and private.has_role(k.requester_roles)
    )
  );

-- ============================================================================
-- 10) فصل الأعمدة: السعر للتنفيذي، القيم الغذائية للجودة
-- ============================================================================
-- ليش trigger ومو GRANT على الأعمدة: كل مستخدمي التطبيق — مطبخ وجودة وتنفيذي —
-- يتصلون بنفس دور Postgres وهو authenticated. فأي GRANT على عمود ينطبق عليهم
-- كلهم بالتساوي ولا يفرّق بينهم. الدور الفعلي معروف فقط وقت التنفيذ من جدول staff،
-- فالمكان الصحيح للفحص هو trigger يقرأ الدور ويقارن القيم القديمة بالجديدة.

create or replace function private.enforce_ingredient_column_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r staff_role := private.current_staff_role();
begin
  if ( new.price, new.price_quote_date ) is distinct from ( old.price, old.price_quote_date )
     and r is distinct from 'executive' then
    raise exception 'تعديل سعر المكوّن وتاريخ عرضه من صلاحية الإدارة التنفيذية فقط';
  end if;

  if ( new.kcal, new.protein, new.carb, new.fat, new.fiber,
       new.flags, new.hidden, new.allergen_text, new.source,
       new.supplier, new.supplier_note )
     is distinct from
     ( old.kcal, old.protein, old.carb, old.fat, old.fiber,
       old.flags, old.hidden, old.allergen_text, old.source,
       old.supplier, old.supplier_note )
     and r is distinct from 'quality' then
    raise exception 'تعديل القيم الغذائية والحساسية والمورد من صلاحية الجودة والمتابعة فقط';
  end if;

  return new;
end;
$$;

create trigger trg_ingredient_column_roles
  before update on ops_ingredients
  for each row execute function private.enforce_ingredient_column_roles();

-- ============================================================================
-- 11) البوابة المحسوبة: تجارب Pilot + قرار الشيف
-- ============================================================================
--
-- البوابة اللي نوعها kitchen_pilot ما يختمها أحد يدوياً (owner_role = null
-- فسياسة ops_gates ترفضها). هذا المحفّز هو اللي يكتبها، ويعيد حسابها كل ما
-- تغيّر مُدخل من مُدخلاتها: تجربة، قرار شيف، سطر وصفة، أو إعداد عدد التجارب.
--
-- القاعدة: قرار الشيف HOLD = HOLD فوراً. غير كذا: وصفة فيها سطور، وما فيها
-- مكوّن مجهول، وتجارب ناجحة >= المطلوب، وقرار الشيف READY → READY.
--
-- اتساق السعرات مع الماكروز ما يُفحص هنا: معادلة في المحرك، ويُفرض وقت تسجيل
-- قرار الشيف في Server Action. تكرار المحرك في SQL أسوأ من فحص في مكان واحد.

create or replace function private.sync_kitchen_pilot_gate(p_sku text) returns void
language plpgsql security definer set search_path = public as $fn$
declare
  v_gate     int;
  v_required int;
  v_passes   int;
  v_fails    int;
  v_lines    int;
  v_unknown  int;
  v_decision gate_status;
  v_chef     text;
  v_chef_at  timestamptz;
  v_status   gate_status;
  v_note     text;
begin
  select gate_index into v_gate
    from ops_gate_defs where kind = 'kitchen_pilot' and active
    order by gate_index limit 1;
  if v_gate is null then return; end if;

  -- القيمة 0 مُدخل مشروع («قرار الشيف يكفي»)، أما غياب المفتاح فمعناه
  -- «غير مُعد» وتبقى البوابة معلّقة — فما يصير النقص تجاوزاً.
  select (data->>'pilotPassesRequired')::int into v_required from ops_settings where id = 1;

  select count(*) filter (where result = 'PASS'),
         count(*) filter (where result = 'FAIL')
    into v_passes, v_fails
    from ops_pilot_trials where sku = p_sku;

  select count(*), count(*) filter (where i.key is null)
    into v_lines, v_unknown
    from ops_recipe_lines l
    left join ops_ingredients i on i.key = l.ing
    where l.sku = p_sku;

  select chef_decision, chef_name, approved_at
    into v_decision, v_chef, v_chef_at
    from ops_kitchen_gate where sku = p_sku;
  v_decision := coalesce(v_decision, 'PENDING');

  if v_decision = 'HOLD' then
    v_status := 'HOLD';
    v_note   := 'أوقفها المطبخ';
  elsif v_lines = 0 then
    v_status := 'PENDING';
    v_note   := 'ما فيه سطور وصفة';
  elsif v_unknown > 0 then
    v_status := 'PENDING';
    v_note   := 'الوصفة فيها ' || v_unknown || ' مكوّن غير موجود في قاعدة المكوّنات';
  elsif v_required is null then
    v_status := 'PENDING';
    v_note   := 'عدد تجارب Pilot المطلوبة غير مُعد في الإعدادات';
  elsif v_passes < v_required then
    v_status := 'PENDING';
    v_note   := 'تجارب ناجحة ' || v_passes || ' من ' || v_required
                || case when v_fails > 0 then ' (وفاشلة ' || v_fails || ')' else '' end;
  elsif v_decision <> 'READY' then
    v_status := 'PENDING';
    v_note   := 'التجارب مكتملة — بانتظار قرار الشيف';
  else
    v_status := 'READY';
    v_note   := '';
  end if;

  insert into ops_gates (sku, gate_index, status, note, approved_by_name, approved_at)
  values (p_sku, v_gate, v_status, v_note,
          case when v_status = 'READY' then nullif(v_chef, '') end,
          case when v_status = 'READY' then coalesce(v_chef_at, now()) end)
  on conflict (sku, gate_index) do update
    set status           = excluded.status,
        note             = excluded.note,
        approved_by_name = excluded.approved_by_name,
        approved_at      = excluded.approved_at,
        updated_at       = now();
end;
$fn$;

create or replace function private.tg_sync_kitchen_pilot() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  perform private.sync_kitchen_pilot_gate(coalesce(new.sku, old.sku));
  return null;
end;
$fn$;

create or replace function private.tg_sync_pilot_from_recipe() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  perform private.sync_kitchen_pilot_gate(coalesce(new.sku, old.sku));
  return null;
end;
$fn$;

-- تغيّر الإعدادات أو التعريفات يعيد حساب كل الأصناف (العدد المطلوب تغيّر)
create or replace function private.tg_resync_all_kitchen_pilot() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare r record;
begin
  for r in select sku from ops_pilot_trials union select sku from ops_kitchen_gate loop
    perform private.sync_kitchen_pilot_gate(r.sku);
  end loop;
  return null;
end;
$fn$;

create trigger sync_kitchen_pilot_from_trials
  after insert or update or delete on ops_pilot_trials
  for each row execute function private.tg_sync_kitchen_pilot();

create trigger sync_kitchen_pilot_from_chef
  after insert or update on ops_kitchen_gate
  for each row execute function private.tg_sync_kitchen_pilot();

create trigger sync_kitchen_pilot_from_recipe
  after insert or update or delete on ops_recipe_lines
  for each row execute function private.tg_sync_pilot_from_recipe();

create trigger resync_kitchen_pilot_on_settings
  after update on ops_settings
  for each statement execute function private.tg_resync_all_kitchen_pilot();

create trigger resync_kitchen_pilot_on_gate_defs
  after insert or update or delete on ops_gate_defs
  for each statement execute function private.tg_resync_all_kitchen_pilot();

-- ---------- تعديل الوصفة يرجّع بواباتها للاعتماد ----------
--
-- ليش في القاعدة ومو في التطبيق: اللي يعدّل الوصفة هو المطبخ، والبوابات
-- المتأثرة ملك الجودة والتنفيذي. فلو حاول التطبيق يرجّعها بهوية المطبخ
-- ترفضه سياسة ops_gates — وهي محقّة: المطبخ ما يفتح ولا يسكّر بوابات غيره.
-- والمحفّز SECURITY DEFINER يسوّيها بلا ما نمنح المطبخ صلاحية ما يستحقها.
--
-- وأهم: صار الإرجاع يشتغل مع أي تعديل وصفة، من التطبيق أو من الـAPI مباشرة،
-- فما يعتمد على أمانة الكود.

create or replace function private.tg_reset_gates_on_recipe_change() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_sku text := coalesce(new.sku, old.sku);
  v_labels text;
begin
  with reset as (
    update ops_gates g
       set status = 'PENDING',
           note = 'رجعت للاعتماد: تعدّلت الوصفة',
           approved_by_name = null,
           approved_at = null,
           updated_at = now()
     where g.sku = v_sku
       and g.status = 'READY'
       and exists (
         select 1 from ops_gate_defs d
         where d.gate_index = g.gate_index
           and d.active
           and d.resets_on_recipe_change
           and d.owner_role is not null   -- المحسوبة لها محفّزها الخاص
       )
    returning g.gate_index
  )
  select string_agg(d.label, '، ' order by d.gate_index) into v_labels
    from reset r join ops_gate_defs d on d.gate_index = r.gate_index;

  if v_labels is not null then
    insert into ops_audit (role, "by", area, text)
    values ('النظام', 'محفّز قاعدة البيانات', 'بوابات الاعتماد',
            v_sku || ' · تعدّلت الوصفة فرجعت للاعتماد: ' || v_labels);
  end if;
  return null;
end;
$fn$;

create trigger reset_gates_on_recipe_change
  after insert or update or delete on ops_recipe_lines
  for each row execute function private.tg_reset_gates_on_recipe_change();

-- ---------- سلامة الغذاء: الحكم على القراءة وفصل التوقيعين ----------
--
-- لو خلّينا «ناجح/راسب» حقلاً يملأه الموظف، صار بإمكانه يكتب «ناجح» على قراءة
-- خارج الحد. المحفّز يقرأ الحد من تعريفه ويحكم، ويرفض الحفظ بلا إجراء تصحيحي
-- إذا رسبت القراءة — فالسجل ما يكتمل إلا بما يثبت المعالجة.

create or replace function private.tg_judge_ccp_reading() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare l record;
begin
  select * into l from safety_critical_limits where id = new.limit_id;
  if l is null then raise exception 'حد حرج غير معرّف'; end if;
  if not l.active then raise exception 'الحد الحرج «%» موقوف', l.parameter; end if;

  if l.limit_kind = 'numeric' then
    if new.reading_value is null then
      raise exception 'القراءة مطلوبة لـ«%»', l.parameter;
    end if;
    new.passed :=
      (l.min_value is null or new.reading_value >= l.min_value) and
      (l.max_value is null or new.reading_value <= l.max_value);
    new.reading_bool := null;
  else
    if new.reading_bool is null then
      raise exception 'نتيجة الفحص مطلوبة لـ«%»', l.parameter;
    end if;
    new.passed := new.reading_bool;
    new.reading_value := null;
  end if;

  if not new.passed and coalesce(trim(new.corrective_action), '') = '' then
    raise exception 'القراءة خارج الحد المسموح — الإجراء التصحيحي إجباري';
  end if;

  return new;
end;
$fn$;

create trigger judge_ccp_reading
  before insert or update on safety_ccp_log
  for each row execute function private.tg_judge_ccp_reading();

-- توقيع ثانٍ: المسجّل ما يعتمد نفسه، والمعتمد يُقفل
create or replace function private.tg_ccp_verification_rules() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare r staff_role := private.current_staff_role();
begin
  if tg_op = 'INSERT' then
    if new.verified_by is not null or new.verified_at is not null then
      raise exception 'الاعتماد يتم بخطوة منفصلة بعد التسجيل';
    end if;
    new.recorded_by := coalesce(new.recorded_by, (select auth.uid()));
    return new;
  end if;

  if (new.verified_by, new.verified_at) is distinct from (old.verified_by, old.verified_at) then
    if r is distinct from 'quality' then
      raise exception 'اعتماد سجل المراقبة من صلاحية الجودة والمتابعة فقط';
    end if;
    if new.verified_by is not null and new.verified_by = old.recorded_by then
      raise exception 'ما ينفع يعتمد السجل نفس من سجّله — لازم توقيع ثانٍ';
    end if;
  end if;

  if old.verified_at is not null
     and (new.reading_value, new.reading_bool, new.limit_id, new.log_date)
         is distinct from (old.reading_value, old.reading_bool, old.limit_id, old.log_date) then
    raise exception 'السجل معتمد — ما تتعدّل قراءته. ارفع عدم مطابقة بدلاً من ذلك';
  end if;

  return new;
end;
$fn$;

create trigger ccp_verification_rules
  before insert or update on safety_ccp_log
  for each row execute function private.tg_ccp_verification_rules();

-- إغلاق عدم المطابقة: بسبب جذري وإجراء، والحرجة للتنفيذي وحده
create or replace function private.tg_ncr_close_rules() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare r staff_role := private.current_staff_role();
begin
  if new.status = 'closed' and coalesce(old.status, '') is distinct from 'closed' then
    if coalesce(trim(new.root_cause), '') = '' or coalesce(trim(new.corrective_action), '') = '' then
      raise exception 'ما ينفع الإغلاق بلا سبب جذري وإجراء تصحيحي';
    end if;
    if new.severity = 'critical' and r is distinct from 'executive' then
      raise exception 'عدم المطابقة الحرجة يغلقها التنفيذي فقط';
    end if;
    if new.severity <> 'critical' and r not in ('quality', 'executive') then
      raise exception 'إغلاق عدم المطابقة من صلاحية الجودة أو التنفيذي';
    end if;
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger ncr_close_rules
  before insert or update on safety_nonconformance
  for each row execute function private.tg_ncr_close_rules();

-- خروج عن الحد يفتح عدم مطابقة تلقائياً — ما نعتمد على أحد يفتحها
create or replace function private.tg_ncr_from_failed_ccp() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare l record;
begin
  if new.passed then return null; end if;
  if exists (select 1 from safety_nonconformance where ccp_log_id = new.id) then return null; end if;

  select cl.parameter, cl.unit, cl.min_value, cl.max_value, s.label as step_label
    into l
    from safety_critical_limits cl
    join safety_haccp_steps s on s.step_index = cl.step_index
   where cl.id = new.limit_id;

  insert into safety_nonconformance
    (raised_by, raised_by_name, source, ccp_log_id, severity, description, immediate_action)
  values (
    new.recorded_by,
    coalesce(nullif(new.recorded_by_name, ''), 'النظام'),
    'سجل CCP',
    new.id,
    'major',
    'خروج عن الحد الحرج: ' || coalesce(l.step_label, '') || ' · ' || coalesce(l.parameter, '') ||
      ' — القراءة ' || coalesce(new.reading_value::text, case when new.reading_bool then 'نعم' else 'لا' end) ||
      ' ' || coalesce(l.unit, '') ||
      ' (المسموح ' || coalesce(l.min_value::text, '—') || ' إلى ' || coalesce(l.max_value::text, '—') || ')',
    new.corrective_action
  );
  return null;
end;
$fn$;

create trigger ncr_from_failed_ccp
  after insert on safety_ccp_log
  for each row execute function private.tg_ncr_from_failed_ccp();

-- ============================================================================
-- 11.5) تطبيق طلب التغيير
-- ============================================================================
--
-- هذي الدالة هي الباب الوحيد اللي يكتب نيابةً عن طلب معتمَد، وهي الوحيدة في
-- النظام اللي تتجاوز RLS في الكتابة. تجاوزها محصور بثلاث قيود مجتمعة:
--
--   ١ · النوع لازم يكون صفاً نشطاً في ops_change_kinds،
--   ٢ · الجدول المستهدف هو عمود في ذلك الصف — لا يُرسَل من العميل،
--   ٣ · كل عمود في المفتاح أو التعديل لازم يكون مذكوراً في قوائم الصف البيضاء.
--
-- يعني أسوأ ما يقدر عليه طلب مزوّر هو كتابة عمود مسموح أصلاً لنوعه، وهذا
-- بالضبط اللي يفحصه المعتمِد بعينه قبل القبول.
--
-- ليش SECURITY DEFINER أصلاً: سياسات RLS تقول «الجودة وحدها تختم بوابة
-- الجودة». والمعتمِد تنفيذي، فلو طبّقنا بصلاحيته ترفضه السياسة. البديل كان
-- توسيع السياسات نفسها للتنفيذي — وهذا يهدم الفصل بين الأقسام في كل وقت، لا
-- في لحظة الاعتماد وحدها.
-- استبدال مجموعة صفوف تخص مفتاحاً واحداً: أسطر وصفة صنف، أو خانات يوم دوران.
-- هذي الحالة ما تنفع فيها upsert لأن السطر المحذوف لازم يختفي فعلاً، والترقيم
-- تلقائي فما فيه مفتاح ثابت نطابق عليه.
create or replace function private.replace_lines(
  p_table    text,
  p_key_cols text[],
  p_key      jsonb,
  p_rows     jsonb,
  p_cols     text[]
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  bad      text;
  merged   jsonb;
  cols     text[];
  col_list text;
  sel_list text;
  key_pred text;
begin
  select string_agg(distinct key, '، ') into bad
    from jsonb_array_elements(p_rows) e, jsonb_object_keys(e) as t(key)
   where key <> all (p_cols);
  if bad is not null then
    raise exception 'أعمدة غير مسموحة في الصفوف: %', bad;
  end if;

  -- كل صف يحمل مفتاحه، فالصفوف ما تقدر تُكتب خارج نطاق الطلب
  merged := coalesce((select jsonb_agg(e || p_key) from jsonb_array_elements(p_rows) e), '[]'::jsonb);

  key_pred := (select string_agg(format('t.%I is not distinct from k.%I', x, x), ' and ')
                 from unnest(p_key_cols) x);

  execute format(
    'delete from public.%I t using jsonb_populate_record(null::public.%I, $1) k where %s',
    p_table, p_table, key_pred
  ) using p_key;

  if jsonb_array_length(merged) = 0 then
    return;
  end if;

  cols := (select array_agg(distinct key order by key)
             from jsonb_array_elements(merged) e, jsonb_object_keys(e) as t(key));
  col_list := (select string_agg(quote_ident(x), ', ') from unnest(cols) x);
  sel_list := (select string_agg('r.' || quote_ident(x), ', ') from unnest(cols) x);

  execute format(
    'insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1) r',
    p_table, col_list, sel_list, p_table
  ) using merged;
end;
$fn$;

create or replace function private.apply_change(p_kind text, p_key jsonb, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  k             ops_change_kinds%rowtype;
  bad           text;
  all_cols      text[];
  col_list      text;
  sel_list      text;
  set_list      text;
  where_list    text;
  n_rows        bigint;
  c             text;
begin
  select * into k from ops_change_kinds where kind = p_kind and active;
  if not found then
    raise exception 'نوع تغيير غير معروف أو موقوف: %', p_kind;
  end if;

  -- المفتاح: لا عمود زائد ولا ناقص
  select string_agg(key, '، ') into bad
    from jsonb_object_keys(p_key) as t(key)
   where key <> all (k.key_columns);
  if bad is not null then
    raise exception 'أعمدة مفتاح غير مسموحة في «%»: %', k.label, bad;
  end if;
  foreach c in array k.key_columns loop
    if not (p_key ? c) then
      raise exception 'عمود مفتاح ناقص في «%»: %', k.label, c;
    end if;
    -- قيمة مفتاح فاضية ما تطابق أي صف (null = null ترجّع unknown) فتنزلق
    -- لمسار الإدراج وتبني صفاً ثانياً بصمت بدل ما تعدّل الموجود.
    if jsonb_typeof(p_key -> c) = 'null' then
      raise exception 'قيمة مفتاح فاضية في «%»: %', k.label, c;
    end if;
  end loop;

  -- التعديل: داخل القائمة البيضاء، وغير فاضٍ
  if k.strategy <> 'replace_lines' then
    select string_agg(key, '، ') into bad
      from jsonb_object_keys(p_patch) as t(key)
     where key <> all (k.patch_columns);
    if bad is not null then
      raise exception 'أعمدة تعديل غير مسموحة في «%»: %', k.label, bad;
    end if;
    if p_patch = '{}'::jsonb then
      raise exception 'طلب «%» بلا أي تعديل', k.label;
    end if;
  end if;

  if k.strategy = 'insert' then
    all_cols := (select array_agg(key order by key) from jsonb_object_keys(p_patch) as t(key));
    col_list := (select string_agg(quote_ident(x), ', ') from unnest(all_cols) x);
    sel_list := (select string_agg('r.' || quote_ident(x), ', ') from unnest(all_cols) x);
    execute format(
      'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) r',
      k.target_table, col_list, sel_list, k.target_table
    ) using p_patch;

  elsif k.strategy = 'upsert' then
    -- تحديث أولاً، وإدراج فقط إذا ما كان الصف موجوداً.
    --
    -- ما نستخدم insert ... on conflict do update: هي تبني صفاً مقترحاً كاملاً
    -- وتفحص قيود not null عليه قبل ما تكتشف التعارض. والتعديل هنا جزئي بطبعه
    -- (سعر مكوّن بلا اسمه، حالة بند ISO بلا عنوانه) فيطيح الطلب على عمود ما
    -- طلبنا تعديله أصلاً. التحديث ما يمسّ إلا أعمدة التعديل.
    --
    -- jsonb_populate_record يحوّل كل حقل لنوع عموده من rowtype الجدول،
    -- فما نبني قيماً بالنص ولا نخمّن النوع.
    set_list := (select string_agg(quote_ident(key) || ' = r.' || quote_ident(key), ', ')
                   from jsonb_object_keys(p_patch) as t(key));
    where_list := (select string_agg(format('t.%I = r.%I', x, x), ' and ') from unnest(k.key_columns) x);
    execute format(
      'update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where %s',
      k.target_table, set_list, k.target_table, where_list
    ) using (p_key || p_patch);

    -- get diagnostics لا not found: execute ما يحدّث FOUND في PL/pgSQL (تبقى
    -- على قيمة آخر select into قبلها) فلو قرأناها هنا، مسار الإدراج ما يشتغل
    -- أبداً والدالّة ترجّع بلا ما تكتب شيئاً.
    get diagnostics n_rows = row_count;
    if n_rows = 0 then
      all_cols := (select array_agg(key order by key) from jsonb_object_keys(p_key || p_patch) as t(key));
      col_list := (select string_agg(quote_ident(x), ', ') from unnest(all_cols) x);
      sel_list := (select string_agg('r.' || quote_ident(x), ', ') from unnest(all_cols) x);
      execute format(
        'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) r',
        k.target_table, col_list, sel_list, k.target_table
      ) using (p_key || p_patch);
    end if;

  else
    -- replace_lines: استبدال مجموعة صفوف تخص مفتاحاً واحداً (أسطر وصفة مثلاً).
    -- الصفوف الجديدة في p_patch->'rows'.
    if jsonb_typeof(p_patch -> 'rows') <> 'array' then
      raise exception 'طلب «%» يحتاج مصفوفة rows', k.label;
    end if;
    perform private.replace_lines(k.target_table, k.key_columns, p_key, p_patch -> 'rows', k.patch_columns);
  end if;
end;
$fn$;

-- القرار على الطلب. الباب الوحيد اللي يغيّر حالة طلب — ما فيه سياسة update
-- على الجدول أصلاً، فحتى صاحب الطلب ما يقدر يعلّمه مقبولاً.
--
-- لو فشل التطبيق (قيد في القاعدة، صف اختفى، نوع تغيّر) ما نضيّع السبب: نرجع
-- للنقطة قبل المحاولة، ونكتب الحالة failed ونص الخطأ في الصف. الطلب يبقى
-- مرئياً بسببه بدل ما يختفي بصمت.
create or replace function public.decide_change(
  p_id      bigint,
  p_approve boolean,
  p_note    text default ''
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  r         ops_change_requests%rowtype;
  k         ops_change_kinds%rowtype;
  me        uuid := auth.uid();
  my_role   staff_role := private.current_staff_role();
  my_name   text;
  result    text;
begin
  if me is null or my_role is null then
    raise exception 'لازم تسجّل دخول بحساب فريق';
  end if;

  select * into r from ops_change_requests where id = p_id for update;
  if not found then
    raise exception 'الطلب غير موجود';
  end if;
  if r.status <> 'pending' then
    raise exception 'الطلب انبتّ فيه مسبقاً (%)', r.status;
  end if;

  select * into k from ops_change_kinds where kind = r.kind;
  if k.approver_role <> my_role then
    raise exception 'اعتماد «%» من صلاحية % وحده', k.label, k.approver_role;
  end if;

  select name into my_name from staff where user_id = me;

  if not p_approve then
    update ops_change_requests
       set status = 'rejected', decided_by = me, decided_by_name = coalesce(my_name, ''),
           decided_at = now(), decision_note = coalesce(p_note, '')
     where id = p_id;
    insert into ops_audit (user_id, role, by, area, text)
    values (me, my_role::text, coalesce(my_name, ''), k.area,
            'رفض طلب: ' || r.summary || case when coalesce(p_note,'') <> '' then ' — ' || p_note else '' end);
    return 'rejected';
  end if;

  begin
    perform private.apply_change(r.kind, r.target_key, r.patch);
    update ops_change_requests
       set status = 'applied', decided_by = me, decided_by_name = coalesce(my_name, ''),
           decided_at = now(), decision_note = coalesce(p_note, '')
     where id = p_id;
    result := 'applied';
  exception when others then
    update ops_change_requests
       set status = 'failed', decided_by = me, decided_by_name = coalesce(my_name, ''),
           decided_at = now(), decision_note = coalesce(p_note, ''), error = SQLERRM
     where id = p_id;
    result := 'failed';
  end;

  insert into ops_audit (user_id, role, by, area, text)
  values (me, my_role::text, coalesce(my_name, ''), k.area,
          case when result = 'applied' then 'اعتمد وطبّق: ' else 'فشل تطبيق: ' end || r.summary);
  return result;
end;
$fn$;

-- PostgreSQL يمنح EXECUTE لـ PUBLIC على أي دالة جديدة افتراضياً. هاتان
-- الدالتان تتجاوزان RLS، فلو بقي المنح الافتراضي صار أي مستخدم مسجّل قادراً
-- على تطبيق تغيير بلا اعتماد لو وصل لهما بأي طريق. ما نعتمد على أن مخطط
-- private غير مكشوف عبر PostgREST — نسحب المنح صراحةً.
revoke all on function private.apply_change(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.replace_lines(text, text[], jsonb, jsonb, text[]) from public, anon, authenticated;

revoke all on function public.decide_change(bigint, boolean, text) from public, anon;
grant execute on function public.decide_change(bigint, boolean, text) to authenticated;

-- ============================================================================
-- 12) صلاحيات الجداول (السياسات أعلاه هي الحاكم الفعلي)
-- ============================================================================

-- Supabase يمنح anon و authenticated كل الصلاحيات على أي جدول جديد في public
-- عبر default privileges. نسحبها عن الاثنين أولاً ثم نمنح ما يحتاجه التطبيق
-- فعلاً — المنع هو الأصل، والمنح استثناء مكتوب باسمه.
--
-- كان هذا السحب يشمل anon وحده، فبقيت على authenticated صلاحيات كتابة
-- موروثة من الافتراضيات على كل جدول تقريباً. RLS كانت تمسكها، لكن طبقة
-- واحدة ما تكفي لشي بهذا الوزن.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- قراءة ----------
grant select on
  ops_menu_items, ops_gates, ops_shelf_life, ops_gate_defs, ops_ing_approval_defs
  to anon;

grant select on
  ops_ingredients, ops_menu_items, ops_recipe_lines, ops_settings,
  ops_rotation, ops_rotation_meta, ops_gates, ops_ing_approvals, ops_shelf_life,
  ops_production, ops_units_sold, ops_gate_defs, ops_ing_approval_defs,
  ops_pilot_trials, ops_kitchen_gate, ops_launch_axes,
  ops_change_kinds, ops_change_requests, ops_audit,
  safety_haccp_steps, safety_critical_limits, safety_ccp_log,
  safety_prp_programs, safety_prp_log, safety_iso_clauses, safety_nonconformance,
  safety_expiry_batches, customers, staff
  to authenticated;

-- ---------- كتابة ----------
--
-- ما فيه أي منح كتابة على جداول العمليات ولا على خطة السلامة. كل تعديل عليها
-- يمر: مسوّدة ← إرسال ← اعتماد، والكتابة الفعلية من private.apply_change وهي
-- SECURITY DEFINER يملكها postgres فما يمسّها السحب أعلاه. يعني تجاوز
-- الاعتماد بنداء مباشر على الـAPI ما عاد ممكناً، لا بتعديل الواجهة ولا بغيره.
--
-- واللي بقي مفتوحاً وقائع لا تعديلات: قراءة مراقبة لازم تُسجَّل في حينها
-- (ومحفّزها يرفع بلاغ عدم المطابقة فوراً لو خرجت عن الحد)، وبرنامج تمهيدي،
-- ودفعة صلاحية، وبلاغ يُرفع ساعة اكتشافه. معالجة البلاغ وإغلاقه تمران
-- بالاعتماد، ولهذا insert وحده على عدم المطابقة.
grant insert on ops_audit            to authenticated;  -- السجل يُكتب ولا يُعدَّل
grant insert on ops_change_requests  to authenticated;  -- الحالة من decide_change وحدها
grant insert on safety_nonconformance to authenticated; -- الرفع فوري، المعالجة باعتماد
grant insert, update on safety_ccp_log        to authenticated;
grant insert, update on safety_prp_log        to authenticated;
grant insert, update on safety_expiry_batches to authenticated;
grant update on customers to authenticated;                      -- العميل يعدّل صفّه

-- staff ما له منح كتابة بقصد: ولا insert ولا update ولا delete. الكتابة
-- الوحيدة عبر public.staff_set وهي definer تفحص الدور. والمنح هنا كان
-- ميتاً أصلاً (ما فيه سياسة كتابة في RLS) لكن بقاؤه يعني إن أي سياسة
-- كتابة تُضاف يوماً تصير نافذة فوراً.
revoke insert, update, delete on staff from anon, authenticated;

grant usage, select on sequence ops_audit_id_seq              to authenticated;
grant usage, select on sequence ops_change_requests_id_seq    to authenticated;
grant usage, select on sequence safety_ccp_log_id_seq         to authenticated;
grant usage, select on sequence safety_prp_log_id_seq         to authenticated;
grant usage, select on sequence safety_nonconformance_id_seq  to authenticated;
grant usage, select on sequence safety_expiry_batches_id_seq  to authenticated;

-- ============================================================================
-- 13) إضافة حساب موظف (لا تُنفّذ من التطبيق أبداً)
-- ============================================================================
-- 1) Supabase Dashboard → Authentication → Users → Add user
--    حط الإيميل وكلمة المرور، وفعّل Auto Confirm User.
-- 2) انسخ الـ UID وبعدها نفّذ هنا:
--
--    insert into staff (user_id, role, name)
--    values ('<UID>', 'executive', 'اسم الموظف');
--
-- الأدوار المتاحة: 'executive' أو 'kitchen' أو 'quality'.
-- لإيقاف موظف بدون حذفه:  update staff set active = false where user_id = '<UID>';
