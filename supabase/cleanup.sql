-- ============================================================================
-- تنظيف: حذف دالّتَي اختبار متبقّيتين
-- ============================================================================
-- أثناء التجهيز احتجت أتحقق من سبب انقطاع أداة MCP مع Postgres، فأنشأت
-- دالّتَي فحص صغيرتين. الأداة ما تسمح لي بتنفيذ DROP، فبقيتا في المشروع.
--
-- وضعهما الحالي: منقولتان إلى سكيما private (PostgREST يكشف public فقط، فما
-- هنّ قابلات للنداء من /rest/v1/rpc)، و search_path مثبّت عليهما. يعني ما فيه
-- خطر أمني — بس هما زيادة ما لها داعي.
--
-- نفّذ هذا السطرين مرة واحدة في Supabase SQL Editor وخلصنا منهما:

drop function if exists private._probe_fn(int);
drop function if exists private._probe2(int);

-- للتأكد بعدها (المتوقع: لا نتائج):
-- select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'private' and proname like '\_probe%';
