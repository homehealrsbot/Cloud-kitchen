// هل المشروع مربوط بـ Supabase؟ كل شي يتفرع من هنا.
// القيم تُقرأ من .env.local — شوف .env.example

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * false إذا المتغيرات ناقصة. الصفحات تستخدمها لتعرض رسالة إعداد واضحة
 * بدل ما تطيح بخطأ غامض.
 */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
