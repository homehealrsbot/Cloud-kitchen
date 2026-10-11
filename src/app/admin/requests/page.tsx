// شاشة الطلبات: «بانتظار قرارك» و«طلباتي».
//
// RLS هي اللي تحدد إيش يوصل: الموظف يشوف طلباته، والمعتمِد يشوف اللي ينتظر
// قراره. فحتى لو عدّل أحد الواجهة، ما يقرأ طلب غيره.

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getStaffSession } from "@/lib/supabase/auth";
import NotConfigured from "@/components/auth/NotConfigured";
import RequestsBoard from "@/components/ops/RequestsBoard";
import { loadChangeKinds } from "./actions";
import type { ChangeRequest, ChangeStatus } from "@/lib/ops/changes";

export const dynamic = "force-dynamic";
export const metadata = { title: "الطلبات — Macro Meals" };

type Row = Record<string, unknown>;

/** تنسيق ثابت على الخادم — تقويم ميلادي وتوقيت الرياض، فما يختلف بين جهازين. */
function fmt(iso: string): string {
  return new Date(iso).toLocaleString("ar-SA-u-ca-gregory", {
    timeZone: "Asia/Riyadh",
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default async function RequestsPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;

  const session = await getStaffSession();
  const supabase = await createClient();

  const [{ data }, kinds] = await Promise.all([
    supabase
      .from("ops_change_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(300),
    loadChangeKinds(),
  ]);
  const byKind = new Map(kinds.map((k) => [k.kind, k]));

  const requests: ChangeRequest[] = ((data ?? []) as Row[]).map((r) => {
    const k = byKind.get(String(r.kind));
    const status = String(r.status) as ChangeStatus;
    return {
      id: Number(r.id),
      batchId: String(r.batch_id),
      kind: String(r.kind),
      kindLabel: k?.label ?? String(r.kind),
      area: k?.area ?? "",
      targetKey: (r.target_key as Record<string, unknown>) ?? {},
      patch: (r.patch as Record<string, unknown>) ?? {},
      before: (r.before_val as Record<string, unknown>) ?? null,
      summary: String(r.summary ?? ""),
      status,
      requestedByName: String(r.requested_by_name ?? ""),
      requestedByRole: String(r.requested_by_role ?? ""),
      requestedAtText: fmt(String(r.requested_at)),
      decidedByName: r.decided_by_name ? String(r.decided_by_name) : null,
      decidedAtText: r.decided_at ? fmt(String(r.decided_at)) : null,
      decisionNote: String(r.decision_note ?? ""),
      error: String(r.error ?? ""),
      canDecide: status === "pending" && !!session && k?.approverRole === session.role,
      mine: !!session && String(r.requested_by) === session.userId,
    };
  });

  return <RequestsBoard requests={requests} />;
}
