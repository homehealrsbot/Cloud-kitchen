"use server";

// دفعات الصلاحية. الكاتب يُسجَّل من الجلسة، فما ينفع ينتحل أحد اسم موظف ثاني.
//
// قراءات الحرارة انتقلت لسجل مراقبة النقاط الحرجة: كانت تُحكم بـ SAFE_RANGES
// مكتوبة في الكود، وصارت تُحكم بحدود حرجة تحددها الجودة في القاعدة.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/auth";
import type { ActionResult } from "@/lib/ops/types";

export async function addExpiryBatch(formData: FormData): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return { ok: false, error: "لازم تسجّل دخول كموظف" };

  const name = String(formData.get("name") ?? "").trim();
  const batch = String(formData.get("batch") ?? "").trim();
  const expiry = String(formData.get("expiry_date") ?? "").trim();

  if (!name) return { ok: false, error: "اكتب اسم المكوّن" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return { ok: false, error: "تاريخ الصلاحية غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.from("safety_expiry_batches").insert({
    name, batch: batch || "—", expiry_date: expiry, recorded_by: session.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/expiry");
  return { ok: true };
}

export async function markBatchConsumed(id: number): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return { ok: false, error: "لازم تسجّل دخول كموظف" };

  const supabase = await createClient();
  const { error } = await supabase.from("safety_expiry_batches").update({ consumed: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/expiry");
  return { ok: true };
}
