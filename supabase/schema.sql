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
  source        text not null default '',
  flags         jsonb not null default '{}'::jsonb,  -- {gluten:true, nuts:false, ...}
  hidden        text not null default '',
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

create table safety_temperature_log (
  id         bigserial primary key,
  unit       text not null,                 -- الثلاجة / الفريزر
  reading    numeric(5,1) not null,
  passed     boolean not null,
  staff_name text not null default '',
  note       text not null default '',
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now()
);

create index idx_temp_log_at on safety_temperature_log(recorded_at desc);

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
alter table ops_gates         enable row level security;
alter table ops_ing_approvals enable row level security;
alter table ops_pilot_trials  enable row level security;
alter table ops_kitchen_gate  enable row level security;
alter table ops_shelf_life    enable row level security;
alter table ops_production    enable row level security;
alter table ops_units_sold    enable row level security;
alter table ops_audit         enable row level security;
alter table safety_temperature_log enable row level security;
alter table safety_expiry_batches  enable row level security;

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
create policy "staff reads temperature log" on safety_temperature_log
  for select to authenticated using (private.is_staff());

create policy "staff appends temperature log" on safety_temperature_log
  for insert to authenticated
  with check ((select private.is_staff()) and recorded_by = (select auth.uid()));

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
  if new.price is distinct from old.price and r is distinct from 'executive' then
    raise exception 'تعديل سعر المكوّن من صلاحية الإدارة التنفيذية فقط';
  end if;

  if ( new.kcal, new.protein, new.carb, new.fat, new.fiber,
       new.flags, new.hidden, new.allergen_text, new.source )
     is distinct from
     ( old.kcal, old.protein, old.carb, old.fat, old.fiber,
       old.flags, old.hidden, old.allergen_text, old.source )
     and r is distinct from 'quality' then
    raise exception 'تعديل القيم الغذائية والحساسية من صلاحية الجودة والمتابعة فقط';
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

-- ============================================================================
-- 12) صلاحيات الجداول (السياسات أعلاه هي الحاكم الفعلي)
-- ============================================================================

-- Supabase يمنح anon و authenticated كل الصلاحيات على أي جدول جديد في public
-- عبر default privileges، فنسحبها أولاً ثم نمنح اللي يحتاجه التطبيق فعلاً.
-- RLS هو الحاكم، وهذا طبقة ثانية: لو تعطّلت RLS بالغلط الزائر لسا ما يكتب.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
  end loop;
end $$;

grant select on ops_ingredients to authenticated;
grant update on ops_ingredients to authenticated;
grant select on
  ops_menu_items, ops_gates, ops_shelf_life, ops_gate_defs, ops_ing_approval_defs
  to anon;
grant select, insert, update, delete on
  ops_menu_items, ops_recipe_lines, ops_settings, ops_rotation, ops_rotation_meta,
  ops_gates, ops_ing_approvals, ops_shelf_life, ops_production, ops_units_sold,
  ops_gate_defs, ops_ing_approval_defs, ops_pilot_trials, ops_kitchen_gate
  to authenticated;
grant select, insert on ops_audit to authenticated;
grant select, insert on safety_temperature_log to authenticated;
grant select, insert, update on safety_expiry_batches to authenticated;
grant usage, select on sequence safety_temperature_log_id_seq to authenticated;
grant usage, select on sequence safety_expiry_batches_id_seq to authenticated;
grant usage, select on sequence ops_audit_id_seq to authenticated;
grant usage, select on sequence ops_recipe_lines_id_seq to authenticated;
grant select, update on customers to authenticated;
grant select on staff to authenticated;

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
