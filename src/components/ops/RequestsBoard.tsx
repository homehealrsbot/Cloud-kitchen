"use client";

// لوحة الطلبات: «بانتظار قرارك» فوق، وتحتها سجل الطلبات.
//
// المعتمِد يشوف الملخّص والقيمة قبل وبعد قبل ما يقرّر — الاعتماد على اسم
// النوع وحده مو اعتماد.

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock, Inbox, Loader2, ThumbsDown } from "lucide-react";
import { Card, CardTitle, Kpi, OpsShell, PENDING_COLOR, T } from "@/components/ops/ui";
import { CHANGE_STATUS_LABEL, type ChangeRequest, type ChangeStatus } from "@/lib/ops/changes";
import { decideChange } from "@/app/admin/requests/actions";
import { useRouter } from "next/navigation";

const TONE: Record<ChangeStatus, { bg: string; fg: string }> = {
  pending: { bg: "#F3EFEC", fg: PENDING_COLOR },
  applied: { bg: T.goodTint, fg: T.good },
  rejected: { bg: "#EFEAE6", fg: "#5C6B62" },
  failed: { bg: T.warnTint, fg: T.warn },
};

export default function RequestsBoard({ requests }: { requests: ChangeRequest[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const waiting = requests.filter((r) => r.canDecide);
  const mine = requests.filter((r) => r.mine);
  const minePending = mine.filter((r) => r.status === "pending").length;

  async function decide(id: number, approve: boolean) {
    setBusy(id);
    setError("");
    const r = await decideChange(id, approve, approve ? "" : note);
    setBusy(null);
    setRejecting(null);
    setNote("");
    if (!r.ok) setError(r.error);
    router.refresh();
  }

  return (
    <OpsShell title="الطلبات" subtitle="التعديلات المرسلة وحالتها — لا شي يُطبَّق قبل الاعتماد">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="بانتظار قرارك" value={waiting.length} tone={waiting.length ? "warn" : undefined} />
        <Kpi label="طلباتي المعلّقة" value={minePending} />
        <Kpi label="طلباتي كلها" value={mine.length} />
        <Kpi label="فشل تطبيقها" value={requests.filter((r) => r.status === "failed").length} tone={requests.some((r) => r.status === "failed") ? "hold" : undefined} />
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mb-5 text-xs font-bold" style={{ background: T.warnTint, color: T.warn }}>
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardTitle icon={<Inbox size={17} />}>بانتظار قرارك ({waiting.length})</CardTitle>
        {waiting.length === 0 ? (
          <div className="text-xs py-8 text-center" style={{ color: T.inkSoft }}>
            ما فيه طلب ينتظر قرارك.
          </div>
        ) : (
          <div className="space-y-2.5">
            {waiting.map((r) => (
              <div key={r.id} className="rounded-xl p-4" style={{ background: T.bg }}>
                <Head r={r} />
                <Diff r={r} />

                {rejecting === r.id ? (
                  <div className="mt-3">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="سبب الرفض — يوصل صاحب الطلب"
                      className="w-full rounded-lg border px-3 py-2 text-xs mb-2"
                      style={{ borderColor: T.border, background: T.surface }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(r.id, false)}
                        disabled={busy === r.id || !note.trim()}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: T.warn }}
                      >
                        {busy === r.id ? "..." : "تأكيد الرفض"}
                      </button>
                      <button
                        onClick={() => { setRejecting(null); setNote(""); }}
                        className="text-xs font-bold"
                        style={{ color: T.inkSoft }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => decide(r.id, true)}
                      disabled={busy !== null}
                      className="rounded-lg px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: T.brandBright, color: T.onBright }}
                    >
                      {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      اعتمد وطبّق
                    </button>
                    <button
                      onClick={() => { setRejecting(r.id); setNote(""); }}
                      disabled={busy !== null}
                      className="rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: T.surface, color: T.warn, border: `1px solid ${T.border}` }}
                    >
                      <ThumbsDown size={13} /> ارفض
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle icon={<Clock size={17} />}>سجل الطلبات ({requests.length})</CardTitle>
        {requests.length === 0 ? (
          <div className="text-xs py-8 text-center" style={{ color: T.inkSoft }}>
            ما انرسل أي طلب بعد. عدّل في أي شاشة واضغط «إرسال» ويظهر هنا.
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <details key={r.id} className="rounded-xl" style={{ background: T.bg }}>
                <summary className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer list-none">
                  <span className="flex items-center gap-2 min-w-0">
                    <ChevronDown size={13} style={{ color: T.inkSoft }} className="shrink-0" />
                    <span className="text-xs truncate">{r.summary}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <Badge status={r.status} />
                    <span className="text-[10px]" style={{ color: T.inkSoft }}>{r.requestedByName}</span>
                  </span>
                </summary>
                <div className="px-4 pb-3">
                  <Head r={r} />
                  <Diff r={r} />
                  {r.decidedByName && (
                    <div className="text-[11px] mt-2" style={{ color: T.inkSoft }}>
                      {r.status === "rejected" ? "رفضه" : "بتّ فيه"} {r.decidedByName} · {r.decidedAtText ?? ""}
                      {r.decisionNote ? ` — ${r.decisionNote}` : ""}
                    </div>
                  )}
                  {r.error && (
                    <div className="text-[11px] mt-2 rounded-lg px-3 py-2" style={{ background: T.warnTint, color: T.warn }}>
                      سبب الفشل: {r.error}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>
    </OpsShell>
  );
}

function Badge({ status }: { status: ChangeStatus }) {
  const t = TONE[status];
  return (
    <span className="text-[10px] font-bold rounded-full px-2.5 py-0.5 whitespace-nowrap" style={{ background: t.bg, color: t.fg }}>
      {CHANGE_STATUS_LABEL[status]}
    </span>
  );
}

function Head({ r }: { r: ChangeRequest }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
      <div className="min-w-0">
        <div className="text-sm font-bold">{r.summary}</div>
        <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
          {r.area} · {r.kindLabel} · {r.requestedByName} · {r.requestedAtText}
        </div>
      </div>
      <Badge status={r.status} />
    </div>
  );
}

/** القيمة قبل وبعد لكل حقل — المعتمِد يحتاج يشوف الفرق لا اسم النوع. */
function Diff({ r }: { r: ChangeRequest }) {
  const rows = Object.keys(r.patch);
  if (rows.length === 0) return null;
  if (rows.length === 1 && rows[0] === "rows") {
    const n = Array.isArray(r.patch.rows) ? (r.patch.rows as unknown[]).length : 0;
    return (
      <div className="text-[11px]" style={{ color: T.inkSoft }}>
        استبدال كامل بـ <span className="num font-bold">{n}</span> سطر
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {rows.map((c) => (
        <span key={c} className="text-[10.5px] rounded-lg px-2.5 py-1" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <span style={{ color: T.inkSoft }}>{fieldLabel(c)}: </span>
          {r.before && c in r.before && (
            <span style={{ color: T.inkSoft, textDecoration: "line-through" }}>{show(r.before[c])} </span>
          )}
          <span className="font-bold">{show(r.patch[c])}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * أسماء الأعمدة كما يقرأها المعتمِد.
 *
 * المعتمِد مو مبرمجاً: «portions» ما تعني له شي، و«حصص» تعني. وأي عمود ما له
 * ترجمة هنا يظهر باسمه كما هو بدل ما يختفي — اختفاؤه أسوأ من ظهوره بالإنجليزي.
 */
const FIELD_LABEL: Record<string, string> = {
  status: "الحالة", note: "ملاحظة", approved_by_name: "المعتمِد", approved_at: "تاريخ الاعتماد",
  portions: "حصص", hours: "ساعات الصلاحية", units: "وحدات مباعة", price: "السعر",
  price_quote_date: "تاريخ عرض السعر", kcal: "سعرات", protein: "بروتين", carb: "كارب",
  fat: "دهون", fiber: "ألياف", supplier: "المورد", supplier_note: "ملاحظة المورد",
  hidden: "مواد خفية", flags: "مسبّبات الحساسية", allergen_text: "نص الحساسية",
  result: "نتيجة التجربة", cooked_portion_g: "وزن الحصة المطبوخة", trial_date: "تاريخ التجربة",
  notes: "ملاحظات", chef_decision: "قرار الشيف", chef_name: "اسم الشيف",
  sku: "الصنف", label: "الاسم", kind: "النوع", owner_role: "الدور المالك", active: "مُفعّل",
  resets_on_recipe_change: "يُصفَّر عند تعديل الوصفة", data: "الإعدادات",
  root_cause: "السبب الجذري", corrective_action: "الإجراء التصحيحي",
  preventive_action: "الإجراء الوقائي", due_date: "تاريخ الاستحقاق",
  closed_at: "تاريخ الإغلاق", evidence: "الدليل", severity: "الخطورة",
};

function fieldLabel(c: string): string {
  return FIELD_LABEL[c] ?? c;
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "object") return "…";
  return String(v);
}
