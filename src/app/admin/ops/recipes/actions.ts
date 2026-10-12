"use server";

// تسجيل قياس الـyield من المطبخ.
//
// ليش إجراء خادم لا مسار اعتماد مثل بقية تعديلات الوصفة: القياس واقعة لا
// تعريف. المطبخ وزن الطبق فعلاً، والرقم صار موجوداً سواء اعتمده أحد أو لا —
// فتأجيله حتى يعتمده المالك يعني أن السجل يكذب على الفترة الفاصلة. نفس قرار
// سجل مراقبة النقاط الحرجة: «واقعة تُسجَّل فوراً، ما تمر بمسار الاعتماد».
//
// والفحص هنا طبقة أولى للواجهة لا الحاكم. الحاكم في القاعدة:
//   • سياسة kitchen records yield checks تحدد من يكتب
//   • محفّز yield_check_verdict يحسب النسبة والفرق والحكم — فالموظف ما يكتب
//     حكماً على قياسه، ولا يكتب التساهل الذي يُحاكَم به
//   • ما فيه update ولا delete على الجدول: القياس الخاطئ يُعاد تسجيله صفاً
//     جديداً، فلا يتحوّل «مخالف» إلى «مطابق» بإعادة كتابة الوزن
// فرسائل القاعدة عربية ومكتوبة للمستخدم، ونعرضها كما هي.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/auth";
import { ROLES, can } from "@/lib/ops/roles";
import { YIELD_VERDICT_LABEL, type YieldVerdict } from "@/lib/ops/engine";
import type { ActionResult } from "@/lib/ops/types";

const DENIED: ActionResult = { ok: false, error: "دورك الحالي ما يملك صلاحية تسجيل القياس" };

export async function recordYieldCheck(input: {
  sku: string;
  date: string;
  rawWeightG: number;
  cookedWeightG: number;
  note: string;
}): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session || !can(session.role, "yield.check")) return DENIED;

  const raw = Number(input.rawWeightG);
  const cooked = Number(input.cookedWeightG);
  if (!(raw > 0)) return { ok: false, error: "الوزن النيئ لازم يكون أكبر من صفر" };
  if (!(cooked > 0)) return { ok: false, error: "الوزن المطبوخ لازم يكون أكبر من صفر" };
  if (!input.sku) return { ok: false, error: "الصنف مطلوب" };
  if (!input.date) return { ok: false, error: "التاريخ مطلوب" };

  const supabase = await createClient();
  const by = session.name || session.email;

  const { data, error } = await supabase
    .from("ops_yield_checks")
    .insert({
      sku: input.sku,
      check_date: input.date,
      raw_weight_g: raw,
      cooked_weight_g: cooked,
      note: input.note.trim(),
      recorded_by: session.userId,
      recorded_by_name: by,
    })
    .select("verdict, yield_pct, deviation_pct")
    .maybeSingle();

  if (error) {
    if (/row-level security|permission denied/i.test(error.message)) return DENIED;
    return { ok: false, error: error.message };
  }

  // القاعدة هي اللي حكمت — الرسالة تنقل حكمها لا توقّعنا
  const verdict = (data?.verdict ?? "NO_SPEC") as YieldVerdict;
  const pct = data?.yield_pct === null || data?.yield_pct === undefined ? null : Number(data.yield_pct);
  const dev = data?.deviation_pct === null || data?.deviation_pct === undefined ? null : Number(data.deviation_pct);

  await supabase.from("ops_audit").insert({
    user_id: session.userId,
    role: ROLES[session.role].label,
    by,
    area: "الوصفات",
    text:
      `قياس yield · ${input.sku} · ${raw}جم ← ${cooked}جم` +
      (pct === null ? "" : ` (${Math.round(pct * 100)}%)`) +
      ` · ${YIELD_VERDICT_LABEL[verdict]}` +
      (dev === null ? "" : ` · الفرق ${(dev * 100).toFixed(1)}%`),
  });

  revalidatePath("/admin/ops/recipes");
  revalidatePath("/admin/ops");
  return { ok: true };
}
