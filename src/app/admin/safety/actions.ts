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
import type { IsoStatus, LimitKind, NcrSeverity, NcrStatus } from "@/lib/safety/types";

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

// ---------------- خطة HACCP والحدود الحرجة (الجودة) ----------------

export async function setHaccpStep(input: {
  index: number;
  label: string;
  stage: string;
  hazard: string;
  hazardType: string;
  controlMeasure: string;
  isCcp: boolean;
  ccpCode: string;
  active: boolean;
  note: string;
}): Promise<ActionResult> {
  const ctx = await guard("safety.plan");
  if (isDenial(ctx)) return ctx;

  if (!Number.isInteger(input.index) || input.index < 1) return { ok: false, error: "رقم الخطوة لازم يكون 1 فأكثر" };
  if (!input.label.trim()) return { ok: false, error: "اسم الخطوة مطلوب" };
  if (!["biological", "chemical", "physical", "allergen"].includes(input.hazardType)) {
    return { ok: false, error: "نوع الخطر غير معروف" };
  }

  const { error } = await ctx.supabase.from("safety_haccp_steps").upsert({
    step_index: input.index,
    label: input.label.trim(),
    stage: input.stage.trim(),
    hazard: input.hazard.trim(),
    hazard_type: input.hazardType,
    control_measure: input.controlMeasure.trim(),
    is_ccp: input.isCcp,
    ccp_code: input.isCcp ? input.ccpCode.trim() : "",
    active: input.active,
    note: input.note.trim(),
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "خطة HACCP", `خطوة ${input.index} «${input.label.trim()}»${input.isCcp ? " — نقطة حرجة" : ""}`);
  return done(["/admin/safety", "/admin/safety/ccp"]);
}

export async function setCriticalLimit(input: {
  id: number | null;
  stepIndex: number;
  parameter: string;
  kind: LimitKind;
  min: number | null;
  max: number | null;
  unit: string;
  method: string;
  frequency: string;
  correctiveAction: string;
  active: boolean;
}): Promise<ActionResult> {
  const ctx = await guard("safety.plan");
  if (isDenial(ctx)) return ctx;

  if (!input.parameter.trim()) return { ok: false, error: "اسم العنصر المُراقَب مطلوب" };
  if (input.kind === "numeric" && input.min === null && input.max === null) {
    return { ok: false, error: "الحد العددي لازم له طرف أدنى أو أعلى على الأقل" };
  }
  if (input.kind === "numeric" && input.min !== null && input.max !== null && input.min > input.max) {
    return { ok: false, error: "الحد الأدنى أكبر من الأعلى" };
  }
  if (!input.correctiveAction.trim()) {
    return { ok: false, error: "الإجراء التصحيحي مطلوب — حد بلا إجراء عند تجاوزه ما ينفع" };
  }

  const row = {
    step_index: input.stepIndex,
    parameter: input.parameter.trim(),
    limit_kind: input.kind,
    min_value: input.kind === "numeric" ? input.min : null,
    max_value: input.kind === "numeric" ? input.max : null,
    unit: input.unit.trim(),
    monitoring_method: input.method.trim(),
    frequency: input.frequency.trim(),
    corrective_action: input.correctiveAction.trim(),
    active: input.active,
  };

  const { error } = input.id
    ? await ctx.supabase.from("safety_critical_limits").update(row).eq("id", input.id)
    : await ctx.supabase.from("safety_critical_limits").insert(row);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "الحدود الحرجة", `${input.id ? "تعديل" : "إضافة"} حد: ${input.parameter.trim()}`);
  return done(["/admin/safety", "/admin/safety/ccp"]);
}

// ---------------- سجل المراقبة اليومي (المطبخ يسجّل) ----------------

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

// ---------------- بنود ISO ----------------

export async function setIsoClause(clause: string, status: IsoStatus, evidence: string): Promise<ActionResult> {
  const ctx = await guard("safety.plan");
  if (isDenial(ctx)) return ctx;

  const valid: IsoStatus[] = ["not_started", "in_progress", "implemented", "verified", "not_applicable"];
  if (!valid.includes(status)) return { ok: false, error: "حالة غير معروفة" };
  if ((status === "implemented" || status === "verified") && !evidence.trim()) {
    return { ok: false, error: "البند المطبَّق يحتاج دليلاً مكتوباً" };
  }

  const { error } = await ctx.supabase
    .from("safety_iso_clauses")
    .update({
      status,
      evidence: evidence.trim(),
      updated_by: ctx.session.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("clause", clause);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "ISO 22000", `بند ${clause}: ${status}`);
  return done(["/admin/safety"]);
}

// ---------------- عدم المطابقة ----------------

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

export async function updateNcr(input: {
  id: number;
  status: NcrStatus;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  dueDate: string | null;
}): Promise<ActionResult> {
  const ctx = await guard("ncr.manage");
  if (isDenial(ctx)) return ctx;

  const closing = input.status === "closed";
  const { error } = await ctx.supabase
    .from("safety_nonconformance")
    .update({
      status: input.status,
      root_cause: input.rootCause.trim(),
      corrective_action: input.correctiveAction.trim(),
      preventive_action: input.preventiveAction.trim(),
      due_date: input.dueDate || null,
      closed_by: closing ? ctx.session.userId : null,
      closed_by_name: closing ? who(ctx) : null,
      closed_at: closing ? new Date().toISOString() : null,
    })
    .eq("id", input.id);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "عدم المطابقة", `بلاغ رقم ${input.id}: ${input.status}`);
  return done(["/admin/safety/ncr", "/admin/safety"]);
}
