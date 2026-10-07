"use server";

// الدخول والتسجيل والخروج كـ Server Actions — كلمة المرور ما تمر أبداً
// في كود يشتغل بالمتصفح، والجلسة تُكتب في كوكي HttpOnly.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AuthState = { error?: string; notice?: string };

// رسائل Supabase إنجليزية — نترجم الشائع منها
function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "الإيميل أو كلمة المرور غير صحيحة";
  if (m.includes("email not confirmed")) return "لازم تأكّد إيميلك أولاً — شوف رسالة التأكيد في بريدك";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "هذا الإيميل مسجّل مسبقاً — سجّل دخول بدل التسجيل";
  if (m.includes("password should be at least")) return "كلمة المرور قصيرة — 8 أحرف على الأقل";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "صيغة الإيميل غير صحيحة";
  if (m.includes("rate limit") || m.includes("too many")) return "محاولات كثيرة — انتظر دقيقة وحاول مرة ثانية";
  return message;
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "Supabase غير مُعد — راجع README" };

  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "عبّي الإيميل وكلمة المرور" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.message) };

  // الموظف يروح لمركز العمليات، والعميل للتطبيق
  const { data: userData } = await supabase.auth.getUser();
  let destination = "/order-app";
  if (userData.user) {
    const { data: staffRow } = await supabase
      .from("staff")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("active", true)
      .maybeSingle();
    if (staffRow) destination = "/admin/ops";
  }

  const next = String(formData.get("next") ?? "");
  revalidatePath("/", "layout");
  redirect(next && next.startsWith("/") ? next : destination);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "Supabase غير مُعد — راجع README" };

  const { email, password } = readCredentials(formData);
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!email || !password) return { error: "عبّي الإيميل وكلمة المرور" };
  if (password.length < 8) return { error: "كلمة المرور لازم 8 أحرف على الأقل" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: translate(error.message) };

  // لو تأكيد الإيميل مفعّل، ما تجي جلسة — نطلب منه يتحقق من بريده
  if (!data.session) {
    return { notice: "أرسلنا لك رسالة تأكيد على إيميلك. افتح الرابط فيها وبعدها سجّل دخول." };
  }

  revalidatePath("/", "layout");
  redirect("/order-app");
}

export async function signOut() {
  if (!isSupabaseConfigured) redirect("/");
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
