// عميل Supabase للخادم (Server Components و Server Actions و Route Handlers).
// ملاحظة Next 16: cookies() صارت async، فلازم await.
//
// setAll داخل try/catch لأن Server Component ما يقدر يكتب كوكيز — تحديث الجلسة
// يتولاه middleware. هذا هو النمط الموصى به من Supabase وبدونه تصير مشاكل
// خروج عشوائي من الحساب.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

export async function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase غير مُعد — راجع .env.example");
  }
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // نُداء من Server Component — الكتابة ممنوعة هنا و middleware يتولاها
        }
      },
    },
  });
}
