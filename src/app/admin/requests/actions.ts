"use server";

// إرسال المسوّدة والبتّ في الطلبات.
//
// الإرسال ما يلمس البيانات الحيّة أبداً: يكتب صفوف طلبات بحالة pending فقط.
// والتطبيق ما يصير إلا من decide_change في القاعدة، وهي الوحيدة اللي تتجاوز
// RLS، ومحصورة بالقائمة البيضاء في ops_change_kinds.
//
// استثناء واحد مقصود: لو المُرسل هو نفسه صاحب سلطة الاعتماد، نبتّ له فوراً
// بعد الإرسال. ما نخفي الخطوة — الطلب يُسجَّل، ويظهر في السجل أنه اعتمد نفسه.
// البديل (أن يعتمد التنفيذي طلباته بنفسه يدوياً) طقس بلا فائدة.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, type StaffSession } from "@/lib/supabase/auth";
import { ROLES, isRole, sealsGate } from "@/lib/ops/roles";
import type { ChangeKind, StagedChange } from "@/lib/ops/changes";
import type { ActionResult } from "@/lib/ops/types";

type Row = Record<string, unknown>;
type Supa = Awaited<ReturnType<typeof createClient>>;

export interface SubmitOutcome {
  ok: boolean;
  /** عدد الطلبات اللي انكتبت */
  submitted: number;
  /** عدد اللي طُبِّق فوراً لأن المُرسل هو المعتمِد */
  applied: number;
  /** عدد اللي بقي ينتظر اعتماد غيره */
  pending: number;
  errors: string[];
}

function toKind(r: Row): ChangeKind {
  return {
    kind: String(r.kind),
    label: String(r.label ?? ""),
    area: String(r.area ?? ""),
    targetTable: String(r.target_table ?? ""),
    strategy: String(r.strategy ?? "upsert") as ChangeKind["strategy"],
    keyColumns: (r.key_columns as string[]) ?? [],
    patchColumns: (r.patch_columns as string[]) ?? [],
    requesterRoles: (r.requester_roles as string[]) ?? [],
    approverRole: String(r.approver_role ?? "executive"),
    active: r.active !== false,
    note: String(r.note ?? ""),
  };
}

export async function loadChangeKinds(): Promise<ChangeKind[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ops_change_kinds").select("*").order("area").order("kind");
  return ((data ?? []) as Row[]).map(toKind);
}

/**
 * فحوص السلطة اللي ما تقدر القاعدة تسويها وحدها.
 *
 * RLS تعرف «مين يقدر يرسل هذا النوع» من requester_roles، لكن ما تعرف أن
 * بوابة رقم ٣ مملوكة للجودة وبوابة ٧ للتنفيذي — هذي في صف التعريف. فنقرأه
 * هنا ونفحص بنفس تعبير sealsGate المستخدم في سياسة RLS على ops_gates.
 */
async function extraAuthority(
  supabase: Supa,
  session: StaffSession,
  item: StagedChange,
): Promise<string | null> {
  if (item.kind === "gate.set") {
    const idx = Number(item.targetKey.gate_index);
    const { data } = await supabase
      .from("ops_gate_defs")
      .select("label, owner_role, active")
      .eq("gate_index", idx)
      .maybeSingle();
    if (!data) return `البوابة ${idx} غير معرّفة`;
    if (!data.active) return `بوابة «${data.label}» موقوفة`;
    if (!data.owner_role) return `بوابة «${data.label}» محسوبة — ما تُختم يدوياً`;
    if (!sealsGate(session.role, data.owner_role)) {
      return `بوابة «${data.label}» يختمها ${roleLabel(data.owner_role)} وحده`;
    }
  }
  if (item.kind === "ing_approval.set") {
    const idx = Number(item.targetKey.approval_index);
    const { data } = await supabase
      .from("ops_ing_approval_defs")
      .select("label, owner_role, active")
      .eq("approval_index", idx)
      .maybeSingle();
    if (!data) return `الاعتماد ${idx} غير معرّف`;
    if (!data.active) return `اعتماد «${data.label}» موقوف`;
    if (!sealsGate(session.role, data.owner_role)) {
      return `اعتماد «${data.label}» يختمه ${roleLabel(data.owner_role)} وحده`;
    }
  }
  return null;
}

function roleLabel(r: string | null): string {
  return isRole(r) ? ROLES[r].label : "دور غير معروف";
}

/** يُرسل دفعة المسوّدة كاملة. ما يكتب في البيانات الحيّة ولا حرف. */
export async function submitChanges(items: StagedChange[]): Promise<SubmitOutcome> {
  const fail = (e: string): SubmitOutcome => ({ ok: false, submitted: 0, applied: 0, pending: 0, errors: [e] });

  const session = await getStaffSession();
  if (!session) return fail("لازم تسجّل دخول بحساب فريق");
  if (items.length === 0) return fail("ما فيه تعديلات للإرسال");

  const supabase = await createClient();
  const kinds = new Map((await loadChangeKinds()).map((k) => [k.kind, k]));

  const errors: string[] = [];
  const rows: Row[] = [];
  const batchId = crypto.randomUUID();

  for (const it of items) {
    const k = kinds.get(it.kind);
    if (!k || !k.active) {
      errors.push(`${it.summary}: نوع تغيير غير معروف أو موقوف`);
      continue;
    }
    if (!k.requesterRoles.includes(session.role)) {
      errors.push(`${it.summary}: ${ROLES[session.role].label} ما يرسل «${k.label}»`);
      continue;
    }
    // عمود خارج القائمة البيضاء يُرفض هنا كمان، مو في القاعدة وحدها —
    // عشان صاحب المسوّدة يشوف السبب قبل ما يُكتب أي صف.
    const patchKeys = k.strategy === "replace_lines" ? [] : Object.keys(it.patch);
    const badPatch = patchKeys.filter((c) => !k.patchColumns.includes(c));
    if (badPatch.length) {
      errors.push(`${it.summary}: أعمدة غير مسموحة (${badPatch.join("، ")})`);
      continue;
    }
    const keyCols = Object.keys(it.targetKey);
    const missing = k.keyColumns.filter((c) => !keyCols.includes(c));
    const extra = keyCols.filter((c) => !k.keyColumns.includes(c));
    if (missing.length || extra.length) {
      errors.push(`${it.summary}: مفتاح غير مطابق للنوع`);
      continue;
    }
    if (k.strategy !== "replace_lines" && patchKeys.length === 0) {
      continue; // ما تغيّر شي فعلاً — نتجاهله بصمت
    }

    const authErr = await extraAuthority(supabase, session, it);
    if (authErr) {
      errors.push(`${it.summary}: ${authErr}`);
      continue;
    }

    rows.push({
      batch_id: batchId,
      kind: it.kind,
      target_key: it.targetKey,
      patch: it.patch,
      before_val: it.before,
      summary: it.summary,
      requested_by: session.userId,
      requested_by_name: session.name || session.email,
      requested_by_role: session.role,
    });
  }

  if (rows.length === 0) {
    return { ok: false, submitted: 0, applied: 0, pending: 0, errors: errors.length ? errors : ["ما فيه تعديل فعلي"] };
  }

  const { data: inserted, error } = await supabase
    .from("ops_change_requests")
    .insert(rows)
    .select("id, kind");
  if (error) {
    return fail(/row-level security/i.test(error.message) ? "دورك ما يملك صلاحية إرسال هذي التعديلات" : error.message);
  }

  // بتّ فوري لما يكون المُرسل هو المعتمِد
  let applied = 0;
  let pending = 0;
  for (const r of (inserted ?? []) as Row[]) {
    const k = kinds.get(String(r.kind));
    if (k && k.approverRole === session.role) {
      const { data: res, error: e } = await supabase.rpc("decide_change", {
        p_id: r.id,
        p_approve: true,
        p_note: "المُرسل هو صاحب سلطة الاعتماد",
      });
      if (e) errors.push(e.message);
      else if (res === "applied") applied++;
      else errors.push(`فشل تطبيق الطلب ${String(r.id)}`);
    } else {
      pending++;
    }
  }

  revalidateAll();
  return { ok: errors.length === 0, submitted: rows.length, applied, pending, errors };
}

/** قبول أو رفض طلب. القرار نفسه في القاعدة — هنا نناديه فقط. */
export async function decideChange(id: number, approve: boolean, note = ""): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return { ok: false, error: "لازم تسجّل دخول بحساب فريق" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_change", { p_id: id, p_approve: approve, p_note: note });
  if (error) return { ok: false, error: error.message };
  if (data === "failed") {
    revalidateAll();
    return { ok: false, error: "فشل تطبيق الطلب — السبب مكتوب على الطلب" };
  }
  revalidateAll();
  return { ok: true };
}

function revalidateAll() {
  for (const p of [
    "/admin/requests",
    "/admin/ops",
    "/admin/ops/quality",
    "/admin/ops/production",
    "/admin/ops/ingredients",
    "/admin/ops/recipes",
    "/admin/ops/rotation",
    "/admin/ops/settings",
    "/admin/ops/pilot",
    "/admin/ops/kitchen-gate",
    "/admin/ops/engineering",
    "/admin/safety",
    "/admin/safety/ccp",
    "/admin/safety/ncr",
    "/admin/team",
    "/admin/launch",
    "/admin/executive",
    "/menu",
    "/order-app",
  ]) {
    revalidatePath(p);
  }
}
