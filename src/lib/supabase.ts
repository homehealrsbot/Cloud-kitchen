import { createBrowserClient } from "@supabase/ssr";

// القيم تُقرأ من متغيرات البيئة — شوف .env.example
// أنشئ مشروع مجاني على supabase.com وحط الرابط والمفتاح هنا (أو في .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
