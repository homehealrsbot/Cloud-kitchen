// مسار تأكيد الإيميل. Supabase يرسل رابطاً فيه token_hash و type،
// وهنا نبدّله بجلسة فعلية ونحوّل المستخدم للمكان الصح.

import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/safe-redirect";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) redirect("/");

  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (!tokenHash || !type) {
    redirect("/login?error=" + encodeURIComponent("رابط التأكيد ناقص أو غير صالح"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    redirect("/login?error=" + encodeURIComponent("رابط التأكيد منتهي أو مستخدم — اطلب رابطاً جديداً"));
  }

  redirect(safeNextPath(next, "/order-app"));
}
