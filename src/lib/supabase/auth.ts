// الجلسة والدور من جهة الخادم — المصدر الموثوق الوحيد للصلاحيات.
//
// قبل هذا التحديث كان الدور محفوظاً في localStorage، يعني أي شخص يعدّله ويدخل
// أي لوحة. الآن الدور يُقرأ من جدول staff عبر جلسة مُوقَّعة، وقاعدة البيانات
// نفسها (RLS) تمنع أي تعديل خارج صلاحية الدور — فتجاوز الواجهة ما يفيد شي.

import { cache } from "react";
import { createClient } from "./server";
import { isSupabaseConfigured } from "./config";

export type Role = "executive" | "kitchen" | "quality";

export interface StaffSession {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

export interface CurrentUser {
  userId: string;
  email: string;
  /** الدور إذا كان موظفاً نشطاً، و null إذا كان عميلاً */
  staff: StaffSession | null;
}

/**
 * المستخدم الحالي ودوره. cache() يخلي الاستدعاءات المتكررة في نفس الطلب
 * تضرب قاعدة البيانات مرة واحدة فقط.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  // getUser() يتحقق من التوكن مع Supabase. لا تستخدم getSession() للتحقق —
  // هي تقرأ الكوكي بدون تحقق، فتنفع للعرض فقط مو للصلاحيات.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: staffRow } = await supabase
    .from("staff")
    .select("role, name")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();

  const email = data.user.email ?? "";
  return {
    userId: data.user.id,
    email,
    staff: staffRow
      ? { userId: data.user.id, email, role: staffRow.role as Role, name: staffRow.name ?? "" }
      : null,
  };
});

export async function getStaffSession(): Promise<StaffSession | null> {
  const user = await getCurrentUser();
  return user?.staff ?? null;
}
