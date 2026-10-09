// تحميل وحدة سلامة الغذاء من Supabase (على الخادم).
//
// كل القراءات محكومة بـ RLS: غير الموظف يرجّع له فاضي من القاعدة نفسها،
// مو لأن الواجهة خفته.

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  CcpEntry,
  CriticalLimit,
  HaccpStep,
  IsoClause,
  Nonconformance,
  PrpEntry,
  PrpProgram,
  SafetySnapshot,
} from "./types";

type Row = Record<string, unknown>;

const str = (v: unknown, d = "") => (v === null || v === undefined ? d : String(v));
const numOrNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function emptySafetySnapshot(): SafetySnapshot {
  return { steps: [], limits: [], log: [], prpPrograms: [], prpLog: [], isoClauses: [], ncr: [] };
}

/**
 * يقرأ الوحدة كاملة في طلب واحد متوازي.
 *
 * السجل اليومي محدود بآخر 60 يوماً: السجلات التاريخية تُراجَع بالتقارير، وجرّ
 * كل شي لكل فتح شاشة يكبر مع الوقت بلا فائدة.
 */
export async function loadSafetySnapshot(days = 60): Promise<SafetySnapshot> {
  if (!isSupabaseConfigured) return emptySafetySnapshot();
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const [steps, limits, log, prp, prpLog, iso, ncr] = await Promise.all([
    supabase.from("safety_haccp_steps").select("*").order("step_index"),
    supabase.from("safety_critical_limits").select("*").order("sort_order"),
    supabase.from("safety_ccp_log").select("*").gte("log_date", sinceDate).order("log_date", { ascending: false }).limit(1000),
    supabase.from("safety_prp_programs").select("*").order("sort_order"),
    supabase.from("safety_prp_log").select("*").gte("log_date", sinceDate).order("log_date", { ascending: false }).limit(1000),
    supabase.from("safety_iso_clauses").select("*").order("sort_order"),
    supabase.from("safety_nonconformance").select("*").order("raised_at", { ascending: false }).limit(300),
  ]);

  return {
    steps: ((steps.data ?? []) as Row[]).map(
      (r): HaccpStep => ({
        index: Number(r.step_index),
        label: str(r.label),
        stage: str(r.stage),
        hazard: str(r.hazard),
        hazardType: str(r.hazard_type, "biological") as HaccpStep["hazardType"],
        controlMeasure: str(r.control_measure),
        isCcp: Boolean(r.is_ccp),
        ccpCode: str(r.ccp_code),
        active: Boolean(r.active),
        note: str(r.note),
      }),
    ),
    limits: ((limits.data ?? []) as Row[]).map(
      (r): CriticalLimit => ({
        id: Number(r.id),
        stepIndex: Number(r.step_index),
        parameter: str(r.parameter),
        kind: str(r.limit_kind, "numeric") as CriticalLimit["kind"],
        min: numOrNull(r.min_value),
        max: numOrNull(r.max_value),
        unit: str(r.unit),
        method: str(r.monitoring_method),
        frequency: str(r.frequency),
        correctiveAction: str(r.corrective_action),
        active: Boolean(r.active),
        sortOrder: Number(r.sort_order ?? 0),
      }),
    ),
    log: ((log.data ?? []) as Row[]).map(
      (r): CcpEntry => ({
        id: Number(r.id),
        limitId: Number(r.limit_id),
        date: str(r.log_date),
        shift: str(r.shift),
        readingValue: numOrNull(r.reading_value),
        readingBool: r.reading_bool === null || r.reading_bool === undefined ? null : Boolean(r.reading_bool),
        passed: Boolean(r.passed),
        outOfLimitNote: str(r.out_of_limit_note),
        correctiveAction: str(r.corrective_action),
        recordedBy: r.recorded_by ? String(r.recorded_by) : null,
        recordedByName: str(r.recorded_by_name),
        recordedAt: str(r.recorded_at),
        verifiedBy: r.verified_by ? String(r.verified_by) : null,
        verifiedByName: r.verified_by_name ? String(r.verified_by_name) : null,
        verifiedAt: r.verified_at ? String(r.verified_at) : null,
      }),
    ),
    prpPrograms: ((prp.data ?? []) as Row[]).map(
      (r): PrpProgram => ({
        code: str(r.code),
        label: str(r.label),
        category: str(r.category),
        ownerRole: r.owner_role ? String(r.owner_role) : null,
        frequency: str(r.frequency),
        description: str(r.description),
        active: Boolean(r.active),
        sortOrder: Number(r.sort_order ?? 0),
      }),
    ),
    prpLog: ((prpLog.data ?? []) as Row[]).map(
      (r): PrpEntry => ({
        id: Number(r.id),
        code: str(r.prp_code),
        date: str(r.log_date),
        done: Boolean(r.done),
        note: str(r.note),
        recordedByName: str(r.recorded_by_name),
      }),
    ),
    isoClauses: ((iso.data ?? []) as Row[]).map(
      (r): IsoClause => ({
        clause: str(r.clause),
        title: str(r.title),
        requirement: str(r.requirement),
        status: str(r.status, "not_started") as IsoClause["status"],
        evidence: str(r.evidence),
        ownerRole: r.owner_role ? String(r.owner_role) : null,
        sortOrder: Number(r.sort_order ?? 0),
      }),
    ),
    ncr: ((ncr.data ?? []) as Row[]).map(
      (r): Nonconformance => ({
        id: Number(r.id),
        raisedAt: str(r.raised_at),
        raisedByName: str(r.raised_by_name),
        source: str(r.source),
        ccpLogId: numOrNull(r.ccp_log_id),
        severity: str(r.severity, "minor") as Nonconformance["severity"],
        description: str(r.description),
        immediateAction: str(r.immediate_action),
        rootCause: str(r.root_cause),
        correctiveAction: str(r.corrective_action),
        preventiveAction: str(r.preventive_action),
        status: str(r.status, "open") as Nonconformance["status"],
        dueDate: r.due_date ? String(r.due_date) : null,
        closedByName: r.closed_by_name ? String(r.closed_by_name) : null,
        closedAt: r.closed_at ? String(r.closed_at) : null,
      }),
    ),
  };
}
