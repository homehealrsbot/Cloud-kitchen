"use server";

// كل كتابة في وحدة سلامة الغذاء تمر من هنا.
//
// الفحص هنا طبقة أولى للواجهة. الحاكم الفعلي في القاعدة:
//   • سياسات RLS تحدد من يكتب في أي جدول
//   • محفّز judge_ccp_reading يحكم على القراءة من الحد الحرج — لا من المسجّل
//   • محفّز ccp_verification_rules يمنع المسجّل من اعتماد سجله ويقفل المعتمد
//   • محفّز ncr_close_rules يمنع الإغلاق بلا سبب جذري، والحرجة للتنفيذي
// فرسائل الخطأ الراجعة من القاعدة عربية ومكتوبة للمستخدم، ونعرضها كما هي.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, type StaffSession } from "@/lib/supabase/auth";
import { Cap, ROLES, can } from "@/lib/ops/roles";
import type { ActionResult } from "@/lib/ops/types";
import type { NcrSeverity } from "@/lib/safety/types";

const DENIED: ActionResult = { ok: false, error: "دورك الحالي ما يملك صلاحية هذا التعديل" };

type Ctx = { session: StaffSession; supabase: Awaited<ReturnType<typeof createClient>> };

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

function done(paths: string[] = ["/admin/safety"]): ActionResult {
  paths.forEach((p) => revalidatePath(p));
  return { ok: true };
}

function dbError(message: string): ActionResult {
  if (/row-level security|permission denied/i.test(message)) return DENIED;
  return { ok: false, error: message };
}

const who = (ctx: Ctx) => ctx.session.name || ctx.session.email;
export async function recordCcpReading(input: {
  limitId: number;
  date: string;
  shift: string;
  value: number | null;
  bool: boolean | null;
  correctiveAction: string;
  note: string;
}): Promise<ActionResult> {
  const ctx = await guard("safety.log");
  if (isDenial(ctx)) return ctx;

  if (!input.date) return { ok: false, error: "التاريخ مطلوب" };

  const { data, error } = await ctx.supabase
    .from("safety_ccp_log")
    .insert({
      limit_id: input.limitId,
      log_date: input.date,
      shift: input.shift.trim(),
      reading_value: input.value,
      reading_bool: input.bool,
      corrective_action: input.correctiveAction.trim(),
      out_of_limit_note: input.note.trim(),
      recorded_by: ctx.session.userId,
      recorded_by_name: who(ctx),
    })
    .select("passed")
    .maybeSingle();
  if (error) return dbError(error.message);

  // القاعدة هي اللي حكمت، فالرسالة تنقل حكمها لا توقّعنا
  const passed = data?.passed === true;
  await writeAudit(ctx, "سجل المراقبة", `قراءة ${passed ? "ضمن الحد" : "خارج الحد"} · ${input.date}`);
  return done(["/admin/safety/ccp", "/admin/safety", "/admin/safety/ncr"]);
}

export async function verifyCcpReading(id: number): Promise<ActionResult> {
  const ctx = await guard("safety.verify");
  if (isDenial(ctx)) return ctx;

  const { error } = await ctx.supabase
    .from("safety_ccp_log")
    .update({
      verified_by: ctx.session.userId,
      verified_by_name: who(ctx),
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "سجل المراقبة", `اعتماد قراءة رقم ${id}`);
  return done(["/admin/safety/ccp"]);
}

// ---------------- برامج PRP ----------------

export async function recordPrp(code: string, date: string, done_: boolean, note: string): Promise<ActionResult> {
  const ctx = await guard("safety.log");
  if (isDenial(ctx)) return ctx;

  const { error } = await ctx.supabase.from("safety_prp_log").upsert(
    {
      prp_code: code,
      log_date: date,
      done: done_,
      note: note.trim(),
      recorded_by: ctx.session.userId,
      recorded_by_name: who(ctx),
    },
    { onConflict: "prp_code,log_date" },
  );
  if (error) return dbError(error.message);

  await writeAudit(ctx, "برامج PRP", `${code} · ${date}: ${done_ ? "نُفّذ" : "ما نُفّذ"}`);
  return done(["/admin/safety"]);
}
export async function raiseNcr(input: {
  severity: NcrSeverity;
  source: string;
  description: string;
  immediateAction: string;
  dueDate: string | null;
}): Promise<ActionResult> {
  const ctx = await guard("ncr.raise");
  if (isDenial(ctx)) return ctx;

  if (!input.description.trim()) return { ok: false, error: "وصف عدم المطابقة مطلوب" };
  if (!["minor", "major", "critical"].includes(input.severity)) return { ok: false, error: "درجة خطورة غير معروفة" };

  const { error } = await ctx.supabase.from("safety_nonconformance").insert({
    severity: input.severity,
    source: input.source.trim(),
    description: input.description.trim(),
    immediate_action: input.immediateAction.trim(),
    due_date: input.dueDate || null,
    raised_by: ctx.session.userId,
    raised_by_name: who(ctx),
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "عدم المطابقة", `رفع بلاغ (${input.severity}): ${input.description.trim().slice(0, 80)}`);
  return done(["/admin/safety/ncr", "/admin/safety"]);
}