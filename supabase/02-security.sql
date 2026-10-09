-- سَلِس حلول — Cloud Kitchen: Row Level Security + صلاحيات الإدارة
-- Row Level Security, admin registry, and access policies.
--
-- شغّل هذا الملف في Supabase SQL editor بعد schema.sql.
-- Run AFTER schema.sql. The script is idempotent — safe to re-run, and safe
-- to run against a database that already has data.
--
-- ليش هذا الملف ضروري: مفتاح anon موجود داخل حزمة المتصفح (NEXT_PUBLIC_*)،
-- يعني أي زائر يقدر يستخدمه. بدون RLS أي شخص يقرأ ويكتب في كل الجداول —
-- أسماء العملاء وجوالاتهم وعناوينهم وأهدافهم الصحية.
-- The anon key ships inside the browser bundle, so it is public by design.
-- It is only safe when RLS is enabled on every table.

-- ---------------------------------------------------------------------------
-- 1) سجل المشرفين — من يملك صلاحية لوحات التحكم
--    Admin registry. Rows are provisioned with the service role (or from the
--    Supabase dashboard) — never from the browser.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'staff'
               check (role in ('staff', 'kitchen', 'quality', 'executive', 'owner')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) ربط العميل بحساب تسجيل الدخول
--    Link a customer row to an auth account, so a logged-in customer can be
--    scoped to their own data. Nullable: existing rows stay valid, and a
--    customer with no linked account simply matches no policy (deny by default).
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3) دوال مساعدة (security definer)
--    Helpers used by the policies below. They are SECURITY DEFINER so a policy
--    can consult admin_users / customers without tripping over those tables'
--    own RLS (which would recurse). search_path is pinned to '' and every name
--    is fully qualified — otherwise the search_path is caller-controlled.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1 from public.admin_users au
       where au.user_id = auth.uid()
     );
$$;

create or replace function public.is_customer_owner(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1 from public.customers c
       where c.id = p_customer_id
         and c.user_id = auth.uid()
     );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_customer_owner(uuid) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_customer_owner(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) تشغيل RLS على كل الجداول — المنع هو الأصل
--    Enable RLS everywhere. With RLS on and no matching policy, access is
--    denied; the service role bypasses RLS and is for server-side use only.
-- ---------------------------------------------------------------------------
alter table public.admin_users   enable row level security;
alter table public.customers     enable row level security;
alter table public.meals         enable row level security;
alter table public.subscriptions enable row level security;
alter table public.orders        enable row level security;
alter table public.order_events  enable row level security;

-- الـ views تتجاوز RLS بشكل افتراضي لأنها تشتغل بصلاحيات مالكها.
-- A view runs with its owner's privileges unless security_invoker is on, which
-- would let anon read all of `orders` straight through these two views.
alter view public.tomorrow_production_plan set (security_invoker = on);
alter view public.today_delivery_zones     set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- 5) السياسات / Policies
-- ---------------------------------------------------------------------------

-- 5.1 admin_users — كل واحد يشوف صفه، والمشرف يشوف الكل. لا كتابة من المتصفح.
--     Read-only from the client; no insert/update/delete policy exists, so
--     promoting an admin requires the service role on purpose.
drop policy if exists admin_users_read_self  on public.admin_users;
drop policy if exists admin_users_read_admin on public.admin_users;

create policy admin_users_read_self on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy admin_users_read_admin on public.admin_users
  for select to authenticated
  using (public.is_admin());

-- 5.2 meals — قائمة الوجبات المتاحة عامة (التطبيق يقرأها بـ available = true).
--     أي وجبة غير متاحة، وأي كتابة، تحتاج مشرف.
drop policy if exists meals_public_read  on public.meals;
drop policy if exists meals_admin_read   on public.meals;
drop policy if exists meals_admin_insert on public.meals;
drop policy if exists meals_admin_update on public.meals;
drop policy if exists meals_admin_delete on public.meals;

create policy meals_public_read on public.meals
  for select to anon, authenticated
  using (available = true);

create policy meals_admin_read on public.meals
  for select to authenticated
  using (public.is_admin());

create policy meals_admin_insert on public.meals
  for insert to authenticated
  with check (public.is_admin());

create policy meals_admin_update on public.meals
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy meals_admin_delete on public.meals
  for delete to authenticated
  using (public.is_admin());

-- 5.3 customers — العميل يشوف ويعدّل صفه هو بس. المشرف يشوف الكل.
--     ملاحظة: ما فيه سياسة insert — تسجيل عميل جديد يصير عبر الخادم
--     (service role) مع تحقق من المدخلات، لا من المتصفح مباشرة.
--     No insert policy on purpose: signup must go through a server route that
--     validates input, not straight from the browser.
drop policy if exists customers_read_self   on public.customers;
drop policy if exists customers_update_self on public.customers;
drop policy if exists customers_admin_all   on public.customers;

create policy customers_read_self on public.customers
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy customers_update_self on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy customers_admin_all on public.customers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5.4 subscriptions — مربوطة بالعميل صاحبها.
drop policy if exists subscriptions_read_own on public.subscriptions;
drop policy if exists subscriptions_admin_all on public.subscriptions;

create policy subscriptions_read_own on public.subscriptions
  for select to authenticated
  using (public.is_customer_owner(customer_id));

create policy subscriptions_admin_all on public.subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5.5 orders — العميل يقرأ طلباته هو. التعديل على الحالة للمشرف.
drop policy if exists orders_read_own  on public.orders;
drop policy if exists orders_admin_all on public.orders;

create policy orders_read_own on public.orders
  for select to authenticated
  using (public.is_customer_owner(customer_id));

create policy orders_admin_all on public.orders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5.6 order_events — تتبع الطلب: العميل يقرأ أحداث طلباته فقط.
drop policy if exists order_events_read_own  on public.order_events;
drop policy if exists order_events_admin_all on public.order_events;

create policy order_events_read_own on public.order_events
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and public.is_customer_owner(o.customer_id)
    )
  );

create policy order_events_admin_all on public.order_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6) تعيين أول مشرف — نفّذه يدوياً بعد إنشاء المستخدم
--    Promote the first admin by hand, after creating the user in
--    Supabase Auth (Dashboard > Authentication > Users > Add user):
--
--    insert into public.admin_users (user_id, role)
--    select id, 'owner' from auth.users where email = 'you@example.com'
--    on conflict (user_id) do update set role = 'owner';
-- ---------------------------------------------------------------------------
