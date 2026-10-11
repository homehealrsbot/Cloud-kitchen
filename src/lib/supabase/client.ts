"use client";

// عميل Supabase للمتصفح. الجلسة تُحفظ في الكوكيز (مو localStorage) عشان
// الخادم يقدر يقرأها ويتحقق من الدور قبل ما يرسل أي صفحة إدارة.

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase غير مُعد. انسخ .env.example إلى .env.local وحط فيه NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
