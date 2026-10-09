"use server";

// ما بقي هنا إلا العمليات اللي ما تمر بمسار الاعتماد.
//
// كل تعديل على بيانات العمليات صار يمر من المسوّدة ← الإرسال ← الاعتماد
// (src/lib/ops/stage.ts و src/app/admin/requests/actions.ts)، والكتابة الفعلية
// من private.apply_change وحدها. ولهذا حُذفت من هنا دوال التعديل القديمة
// كلها: كل Server Action هي نقطة اتصال قائمة بذاتها، فتركها بعد ما بطل
// استعمالها يبقي باباً مفتوحاً لتجاوز الاعتماد بلا أي فائدة.
//
// الباقي: إرجاع البيانات للأصل — وهو ما يحذف شي أصلاً، يشرح الطريق فقط.

import { createClient } from "@/lib/supabase/server";
import { getStaffSession, type StaffSession } from "@/lib/supabase/auth";
import { Cap, ROLES, can } from "@/lib/ops/roles";
import type { ActionResult } from "@/lib/ops/types";

const DENIED: ActionResult = { ok: false, error: "دورك الحالي ما يملك صلاحية هذا التعديل" };

type Ctx = { session: StaffSession; supabase: Awaited<ReturnType<typeof createClient>> };

/** يتحقق من الدور ويجهّز العميل، أو يرجّع رفضاً. */
async function guard(cap: Cap): Promise<Ctx | ActionResult> {
  const session = await getStaffSession();
  if (!session || !can(session.role, cap)) return DENIED;
  return { session, supabase: await createClient() };
}

function isDenial(v: Ctx | ActionResult): v is ActionResult {
  return "ok" in v;
}

async function writeAudit(ctx: Ctx, area: string, text: string) {
  await ctx.supabase.from("ops_audit").insert({
    user_id: ctx.session.userId,
    role: ROLES[ctx.session.role].label,
    by: ctx.session.name || ctx.session.email,
    area,
    text,
  });
}

export async function resetRotation(): Promise<ActionResult> {
  const ctx = await guard("rotation.edit");
  if (isDenial(ctx)) return ctx;
  await writeAudit(ctx, "جدول الدوران", "طلب إرجاع جدول الدوران للأصل");
  return {
    ok: false,
    error: "الإرجاع للأصل يتم بإعادة تنفيذ supabase/seed.sql — عدّل الخانات يدوياً أو راجع الإدارة",
  };
}
export async function resetAll(): Promise<ActionResult> {
  const ctx = await guard("data.reset");
  if (isDenial(ctx)) return ctx;
  await writeAudit(ctx, "النظام", "طلب إرجاع بيانات العمليات للأصل");
  return {
    ok: false,
    error:
      "الإرجاع للأصل صار يتم بإعادة تنفيذ supabase/seed.sql على قاعدة البيانات — " +
      "ما نحذف بيانات حقيقية من الواجهة.",
  };
}
