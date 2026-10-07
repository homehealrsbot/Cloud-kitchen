"use server";

// تسجيل قراءات الحرارة ودفعات الصلاحية. القيم تُفحص على الخادم، والكاتب يُسجَّل
// من الجلسة — فما ينفع ينتحل أحد اسم موظف ثاني.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/auth";
import type { ActionResult } from "@/lib/ops/types";
import { SAFE_RANGES } from "@/lib/safety";

export async function logTemperature(formData: FormData): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return { ok: false, error: "لازم تسجّل دخول كموظف" };

  const unit = String(formData.get("unit") ?? "");
  const raw = String(formData.get("reading") ?? "").trim();
  const staffName = String(formData.get("staff_name") ?? "").trim() || session.name || session.email;
  const note = String(formData.get("note") ?? "").trim();

  const range = SAFE_RANGES[unit];
  if (!range) return { ok: false, error: "وحدة التخزين غير معروفة" };
  if (raw === "") return { ok: false, error: "أدخل القراءة" };

  const reading = Number(raw);
  if (!Number.isFinite(reading)) return { ok: false, error: "القراءة لازم تكون رقم" };

  const passed = reading >= range.min && reading <= range.max;
  if (!passed && !note) {
    return { ok: false, error: "القراءة خارج النطاق الآمن — سجّل الإجراء المتخذ قبل الحفظ" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("safety_temperature_log").insert({
    unit, reading, passed, staff_name: staffName, note, recorded_by: session.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/temperature-log");
  return { ok: true };
}

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
