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

-- مهم: هذا الملف ينشئ الجداول فقط، وبدون RLS كل الجداول مفتوحة للقراءة والكتابة
-- لأي شخص يملك مفتاح anon — وهو موجود داخل حزمة المتصفح.
-- شغّل `supabase/02-security.sql` بعد هذا الملف مباشرة. فيه:
--   • تفعيل Row Level Security على كل الجداول + سياسات الوصول
--   • جدول admin_users وصلاحيات لوحة التحكم
--   • security_invoker على الـ views فوق (وإلا تتجاوز RLS)
--
-- IMPORTANT: run supabase/02-security.sql immediately after this file.
