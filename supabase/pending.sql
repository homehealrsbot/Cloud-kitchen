-- ============================================================================
-- ما تبقّى تطبيقه على قاعدة الإنتاج
-- ============================================================================
--
-- هذا الملف ليس جزءاً من المخطط: هو ما حاولت تطبيقه ففشل الموصّل. ست محاولات
-- (apply_migration و execute_sql) انتهت كلها بمهلة ٦٠ ثانية، وتحققت من حالة
-- القاعدة بعد كل واحدة فما طُبِّق منها شيء. والقراءات كانت فورية طول الوقت،
-- ونجحت قبلها هجرات أصغر في نفس الجلسة — فالعلّة في الموصّل لا في القاعدة.
--
-- الصقه كما هو في محرر SQL بلوحة Supabase (أو supabase db push). بعده يصير
-- الحذف النهائي عاملاً، وامسح هذا الملف.
--
-- وحتى يُطبَّق: الإضافة والأرشفة تعملان كاملتين، ولا نوع تغيير مسجَّل يستخدم
-- استراتيجية الحذف — فما فيه زر يعتمد على فرع غائب.

-- ---------- ١) فرع الحذف في apply_change ----------
-- الموجود الآن على القاعدة لا يعرف 'delete'، فأي طلب بها يسقط في فرع
-- replace_lines ويطلب مصفوفة rows. لهذا لم أسجّل أنواع الحذف بعد.

create or replace function private.apply_change(p_kind text, p_key jsonb, p_patch jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare
  k ops_change_kinds%rowtype; bad text; all_cols text[];
  col_list text; sel_list text; set_list text; where_list text;
  n_rows bigint; c text;
begin
  select * into k from ops_change_kinds where kind = p_kind and active;
  if not found then raise exception 'نوع تغيير غير معروف أو موقوف: %', p_kind; end if;

  select string_agg(key, '، ') into bad from jsonb_object_keys(p_key) as t(key)
   where key <> all (k.key_columns);
  if bad is not null then raise exception 'أعمدة مفتاح غير مسموحة في «%»: %', k.label, bad; end if;
  foreach c in array k.key_columns loop
    if not (p_key ? c) then raise exception 'عمود مفتاح ناقص في «%»: %', k.label, c; end if;
    if jsonb_typeof(p_key -> c) = 'null' then raise exception 'قيمة مفتاح فاضية في «%»: %', k.label, c; end if;
  end loop;

  -- الحذف بلا patch بطبعه، وreplace_lines تحمل rows لا أعمدة
  if k.strategy not in ('replace_lines', 'delete') then
    select string_agg(key, '، ') into bad from jsonb_object_keys(p_patch) as t(key)
     where key <> all (k.patch_columns);
    if bad is not null then raise exception 'أعمدة تعديل غير مسموحة في «%»: %', k.label, bad; end if;
    if p_patch = '{}'::jsonb then raise exception 'طلب «%» بلا أي تعديل', k.label; end if;
  end if;

  if k.strategy = 'insert' then
    all_cols := (select array_agg(key order by key) from jsonb_object_keys(p_patch) as t(key));
    col_list := (select string_agg(quote_ident(x), ', ') from unnest(all_cols) x);
    sel_list := (select string_agg('r.' || quote_ident(x), ', ') from unnest(all_cols) x);
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) r',
      k.target_table, col_list, sel_list, k.target_table) using p_patch;

  elsif k.strategy = 'upsert' then
    set_list := (select string_agg(quote_ident(key) || ' = r.' || quote_ident(key), ', ')
                   from jsonb_object_keys(p_patch) as t(key));
    where_list := (select string_agg(format('t.%I = r.%I', x, x), ' and ') from unnest(k.key_columns) x);
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where %s',
      k.target_table, set_list, k.target_table, where_list) using (p_key || p_patch);
    get diagnostics n_rows = row_count;
    if n_rows = 0 then
      all_cols := (select array_agg(key order by key) from jsonb_object_keys(p_key || p_patch) as t(key));
      col_list := (select string_agg(quote_ident(x), ', ') from unnest(all_cols) x);
      sel_list := (select string_agg('r.' || quote_ident(x), ', ') from unnest(all_cols) x);
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) r',
        k.target_table, col_list, sel_list, k.target_table) using (p_key || p_patch);
    end if;

  elsif k.strategy = 'delete' then
    -- حذف بالمفتاح وحده. ولا نسكت على مفتاح ما طابق شيئاً: «نجح» على حذفٍ لم
    -- يحذف يترك المعتمِد يظن أن الصف اختفى وهو قائم.
    where_list := (select string_agg(format('t.%I = r.%I', x, x), ' and ') from unnest(k.key_columns) x);
    execute format('delete from public.%I t using jsonb_populate_record(null::public.%I, $1) r where %s',
      k.target_table, k.target_table, where_list) using p_key;
    get diagnostics n_rows = row_count;
    if n_rows = 0 then
      raise exception 'طلب «%»: ما فيه صف بهذا المفتاح — حُذف قبل الاعتماد؟', k.label;
    end if;

  else
    if jsonb_typeof(p_patch -> 'rows') <> 'array' then
      raise exception 'طلب «%» يحتاج مصفوفة rows', k.label;
    end if;
    perform private.replace_lines(k.target_table, k.key_columns, p_key, p_patch -> 'rows', k.patch_columns);
  end if;
end;
$fn$;

-- ---------- ٢) الحرس يُسقط الأبناء الحاملين محفّزات أولاً ----------
-- الحرس الموجود على القاعدة يفحص الارتباطات ويمنع الحذف المرتبط — وهذا
-- مُختبَر وعامل. وما ينقصه: إسقاط الأبناء بأنفسنا. بدونه حتى الصنف النطيف
-- ما يُحذف: التسلسل يُسقط أسطر الوصفة وتجارب Pilot وقرار الشيف، فتشتغل
-- محفّزاتها وتكتب في ops_gates لصنفٍ اختفى في نفس العبارة فينتهك
-- ops_gates_sku_fkey. مُختبَر: ZZ01 النطيف فشل بهذا السبب بالضبط.

create or replace function private.tg_guard_menu_item_delete() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare v_why text;
begin
  if exists (select 1 from ops_gates where sku = old.id and status = 'READY') then
    v_why := 'له بوابات اعتماد مختومة';
  elsif exists (select 1 from ops_units_sold where sku = old.id and units > 0) then
    v_why := 'له مبيعات مسجّلة';
  elsif exists (select 1 from ops_rotation where sku = old.id) then
    v_why := 'مُدرج في جدول الدوران';
  elsif exists (select 1 from ops_yield_checks where sku = old.id) then
    v_why := 'له قياسات yield مسجّلة';
  end if;

  if v_why is not null then
    raise exception 'ما ينفع حذف «%» نهائياً: % — أرشفه بـ active=false ويبقى سجله', old.id, v_why
      using errcode = 'foreign_key_violation';
  end if;

  delete from ops_pilot_trials where sku = old.id;
  delete from ops_kitchen_gate  where sku = old.id;
  delete from ops_recipe_lines  where sku = old.id;
  delete from ops_gates         where sku = old.id;

  return old;
end $fn$;

-- ---------- ٣) أنواع الحذف النهائي ----------
-- تُسجَّل بعد الفرع أعلاه لا قبله: نوعٌ باستراتيجية لا تعرفها الدالّة يسقط
-- في فرع replace_lines ويفشل برسالة «يحتاج مصفوفة rows».

insert into ops_change_kinds
  (kind, label, area, target_table, strategy, key_columns, patch_columns,
   requester_roles, approver_role, active, note)
values
  ('menu_item.delete', 'حذف صنف نهائياً', 'المنيو', 'ops_menu_items',
   'delete'::change_strategy, array['id']::text[], '{}'::text[],
   array['executive'::staff_role], 'executive'::staff_role, true,
   'حذف نهائي — للمسوّدات وحدها. محفّز يمنعه إذا كان للصنف بوابة مختومة أو مبيعات أو خانة جدول أو قياس yield.'),

  ('ingredient.delete', 'حذف مكوّن نهائياً', 'المكوّنات', 'ops_ingredients',
   'delete'::change_strategy, array['key']::text[], '{}'::text[],
   array['executive'::staff_role], 'executive'::staff_role, true,
   'حذف نهائي. المفتاح الأجنبي يمنعه إن كان في وصفة، والمحفّز يمنعه إن كان له اعتماد مختوم أو سعر.')
on conflict (kind) do nothing;

-- ---------- ٤) تحقّق بعد اللصق ----------
-- المتوقع: delete_branch = true, guard_clears = true, delete_kinds = 2
select
  (select position('= ''delete''' in pg_get_functiondef(p.oid)) > 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'apply_change')              as delete_branch,
  (select position('ops_pilot_trials where sku' in pg_get_functiondef(p.oid)) > 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'tg_guard_menu_item_delete') as guard_clears,
  (select count(*) from ops_change_kinds
    where kind in ('menu_item.delete', 'ingredient.delete'))                 as delete_kinds;
