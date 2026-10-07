-- سَلِس حلول — Cloud Kitchen Subscription System
-- Supabase / PostgreSQL schema
-- Run this in the Supabase SQL editor after creating your project.

-- 1) العملاء (المشتركين)
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text unique not null,
  email text,
  health_goal text not null check (health_goal in ('تنزيل وزن', 'ثبات الوزن', 'زيادة عضل')),
  zone text not null,           -- الحي / منطقة التوصيل
  address text,
  created_at timestamptz not null default now()
);

-- 2) الوجبات (يدخلها المطعم من لوحة التحكم)
create table meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(6,2) not null,
  kcal int not null,
  protein_g int not null,
  carb_g int not null,
  fat_g int not null,
  ingredients text[] not null default '{}',
  goal_tag text not null check (goal_tag in ('تنزيل وزن', 'ثبات الوزن', 'زيادة عضل')),
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) الاشتراكات
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  plan text not null default 'أسبوعية',   -- أسبوعية / شهرية
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  renewal_date date not null,
  created_at timestamptz not null default now()
);

-- 4) الطلبات (كل وجبة يومية مرتبطة باشتراك)
create table orders (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete set null,
  customer_id uuid not null references customers(id) on delete cascade,
  meal_id uuid not null references meals(id),
  status text not null default 'received'
    check (status in ('received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  zone text not null,
  scheduled_for date not null default current_date,
  created_at timestamptz not null default now()
);

-- 5) سجل أحداث الطلب (للتتبع اللحظي بالتطبيق)
create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  event_type text not null,   -- received / preparing / out_for_delivery / delivered
  note text,
  created_at timestamptz not null default now()
);

-- فهارس مفيدة للاستعلامات المتكررة
create index idx_orders_scheduled_for on orders(scheduled_for);
create index idx_orders_status on orders(status);
create index idx_subscriptions_status on subscriptions(status);

-- View: خطة إنتاج الغد — إجمالي كل صنف مطلوب لليوم التالي
create view tomorrow_production_plan as
select
  m.id as meal_id,
  m.name as meal_name,
  count(o.id) as required_count
from orders o
join meals m on m.id = o.meal_id
where o.scheduled_for = current_date + interval '1 day'
  and o.status != 'cancelled'
group by m.id, m.name;

-- View: جدولة التوصيل حسب الحي لليوم
create view today_delivery_zones as
select
  zone,
  count(*) as delivery_count
from orders
where scheduled_for = current_date
  and status != 'cancelled'
group by zone;

-- ملاحظة: فعّل Row Level Security (RLS) قبل الإطلاق الفعلي، وأضف policies
-- تسمح للعميل يشوف بياناته هو بس، ولوحة التحكم (service role) تشوف كل شي.
-- alter table customers enable row level security;
-- alter table orders enable row level security;
-- ... إلخ


-- ============================================================================
-- 6) Row Level Security (RLS) — إجباري قبل أي إطلاق فعلي
-- ============================================================================
-- ليش هذا القسم هو الأهم في الملف:
-- مفتاح NEXT_PUBLIC_SUPABASE_ANON_KEY يُرسل للمتصفح بطبيعته — أي زائر يقدر يقرأه من
-- devtools. يعني RLS هو الحماية الوحيدة فعلياً، مو إخفاء المفتاح. وبدونه أي شخص يقدر:
--   • يقرأ جدول customers كامل (الأسماء، الجوالات، الإيميلات، العناوين، الأهداف الصحية)
--   • يكتب أو يحذف أي صف في أي جدول
--
-- القاعدة المتبعة هنا: المنع هو الأصل (default deny). ما نفتح إلا اللي يحتاجه التطبيق
-- فعلياً، وهو استعلام واحد: قراءة الوجبات المتاحة لصفحة العميل.
--
-- على قاعدة بيانات موجودة مسبقاً: نفّذ هذا القسم وحده، الباقي تم تنفيذه سابقاً.

alter table customers      enable row level security;
alter table meals          enable row level security;
alter table subscriptions  enable row level security;
alter table orders         enable row level security;
alter table order_events   enable row level security;

-- تفعيل RLS بدون policies = منع كامل للجميع. نضيف الآن الاستثناء الوحيد المطلوب:

-- (1) الزائر غير المسجّل يقرأ الوجبات المتاحة فقط — هذا اللي تستعمله /order-app
create policy "public can read available meals"
  on meals for select
  to anon, authenticated
  using (available = true);

-- (2) الموظف المسجّل دخوله يقرأ كل الوجبات (بما فيها غير المتاحة) — لوحة المطبخ
create policy "staff can read all meals"
  on meals for select
  to authenticated
  using (true);

-- (3) الموظف المسجّل دخوله يضيف ويعدّل الوجبات — لوحة الجودة والمطبخ
create policy "staff can insert meals"
  on meals for insert
  to authenticated
  with check (true);

create policy "staff can update meals"
  on meals for update
  to authenticated
  using (true)
  with check (true);

-- ملاحظة مهمة جداً عن لوحات الإدارة:
-- السياسات أعلاه تعطي صلاحية الكتابة لـ authenticated فقط. بما إن المشروع حالياً ما فيه
-- تسجيل دخول (بوابة الأدوار في /admin فصل على مستوى الشاشات فقط)، فإن إضافة وجبة من لوحة
-- الجودة بترجع خطأ صلاحية بعد ربط قاعدة البيانات — وهذا السلوك الصحيح والمقصود.
-- الكود يتعامل معها بشكل سليم: الوجبة تبقى في قائمة الانتظار ويظهر سبب الفشل للمستخدم.
--
-- لتشغيل كتابة الإدارة، فيه مسارين (اختر واحد):
--   أ) Supabase Auth: أنشئ حسابات للموظفين، واستبدل getSession() في src/lib/ops/roles.ts
--      بجلسة Supabase الحقيقية. يُفضّل إضافة جدول staff(user_id, role) وتشديد السياسات
--      أعلاه لتتحقق منه بدل using (true) — عشان أي مستخدم مسجّل ما يصير له صلاحية مطبخ.
--   ب) Route Handler على الخادم يستخدم service_role key (من متغير بيئة خاص بالخادم،
--      بدون بادئة NEXT_PUBLIC_) وتستدعيه الواجهة. الـ service_role يتخطى RLS،
--      فلا يُستخدم أبداً في كود يوصل للمتصفح.
--
-- جداول customers / subscriptions / orders / order_events تبقى بلا أي policy = ممنوعة
-- تماماً على anon. أضف سياساتها لما تبني تسجيل دخول العميل، بحيث يشوف صفوفه هو فقط، مثال:
--   create policy "customer reads own orders" on orders for select
--     to authenticated using (customer_id = auth.uid());


-- ============================================================================
-- 7) تحديث updated_at تلقائياً
-- ============================================================================
-- عمود meals.updated_at كان ياخذ قيمة الإنشاء وما يتغير أبداً عند التعديل.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger meals_set_updated_at
  before update on meals
  for each row
  execute function set_updated_at();


-- ============================================================================
-- 8) بيانات الحساسية على مستوى الوجبة
-- ============================================================================
-- الواجهة توعد العميل بفلترة الحساسية (order-app/health-profile و build-meal)، لكن الفلترة
-- الحالية تعمل على قوائم مكتوبة في الكود لأن الجدول ما فيه عمود حساسية إطلاقاً. هذا العمود
-- يخلي الفلترة ممكنة على البيانات الحقيقية بدل ما تتوقف بصمت عند ربط قاعدة البيانات.

alter table meals add column if not exists allergens text[] not null default '{}';

create index if not exists idx_meals_allergens on meals using gin (allergens);

-- الفلترة من جهة الخادم بعدها تصير:
--   select * from meals where available = true and not (allergens && array['سمسم','مكسرات']);
