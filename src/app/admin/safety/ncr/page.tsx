"use client";

// سجل عدم المطابقة.
//
// أي موظف يرفع بلاغاً — منع التبليغ أخطر من بلاغ زائد. والجودة تحلل وتغلق،
// والحرجة يغلقها التنفيذي وحده. والإغلاق بلا سبب جذري وإجراء تصحيحي ترفضه
// القاعدة، فما يصير السجل مجرد قائمة «مغلقة» بلا معالجة.
//
// والبلاغات اللي مصدرها «سجل CCP» ما يرفعها أحد: القاعدة تفتحها لحظة تسجيل
// قراءة خارج الحد.

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Plus, Link2 } from "lucide-react";
import { can } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import {
  NCR_SEVERITY_LABEL,
  NCR_STATUS_LABEL,
  type NcrSeverity,
  type NcrStatus,
  type Nonconformance,
} from "@/lib/safety/types";
import * as actions from "../actions";
import { AccessNote, Card, CardTitle, Kpi, Note, SafetyShell, T, useSafety } from "@/components/safety/ui";

type Filter = "open" | "all" | "closed";

const SEVERITY_TONE: Record<NcrSeverity, { background: string; color: string }> = {
  minor: { background: "#FBF1DC", color: T.accentText },
  major: { background: T.warnTint, color: T.warn },
  critical: { background: "#fdecea", color: "#a32019" },
};

export default function NcrPage() {
  const s = useSafety();
  const session = useSession();
  const role = session?.role ?? null;
  const canRaise = can(role, "ncr.raise");
  const canManage = can(role, "ncr.manage");

  const [filter, setFilter] = useState<Filter>("open");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const [draft, setDraft] = useState({
    severity: "minor" as NcrSeverity,
    source: "",
    description: "",
    immediateAction: "",
    dueDate: "",
  });

  const list = useMemo(() => {
    if (filter === "all") return s.ncr;
    if (filter === "closed") return s.ncr.filter((n) => n.status === "closed");
    return s.ncr.filter((n) => n.status !== "closed");
  }, [s.ncr, filter]);

  const open = s.ncr.filter((n) => n.status !== "closed");
  const overdue = open.filter((n) => n.dueDate && n.dueDate < new Date().toISOString().slice(0, 10));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "تعذّر الحفظ" });
    });
  }

  return (
    <SafetyShell title="سجل عدم المطابقة" subtitle="كل انحراف يُوثَّق ويُغلق بسبب جذري وإجراء">
      <AccessNote
        canEdit={canManage}
        editText="أنت تحلل وتغلق. الإغلاق يحتاج سبباً جذرياً وإجراءً تصحيحياً — والقاعدة ترفضه بدونهما. والحرجة يغلقها التنفيذي وحده."
        viewText={canRaise ? "تقدر ترفع بلاغاً. المعالجة والإغلاق من صلاحية الجودة والتنفيذي." : "عرض فقط."}
      />

      {msg && <Note ok={msg.ok} text={msg.text} />}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Kpi label="مفتوحة" value={open.length} tone={open.length > 0 ? "hold" : "good"} />
        <Kpi label="حرجة مفتوحة" value={open.filter((n) => n.severity === "critical").length} tone="hold" />
        <Kpi label="تجاوزت موعدها" value={overdue.length} tone={overdue.length > 0 ? "warn" : "good"} />
      </div>

      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          {(["open", "closed", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold"
              style={filter === f ? { background: T.brand, color: "#fff" } : { background: T.brandTint, color: T.brand }}
            >
              {f === "open" ? "المفتوحة" : f === "closed" ? "المغلقة" : "الكل"}
            </button>
          ))}
        </div>
        {canRaise && !adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: T.brand }}>
            <Plus size={14} /> ارفع بلاغاً
          </button>
        )}
      </div>

      {adding && (
        <Card className="mb-5">
          <CardTitle icon={<AlertTriangle size={16} />}>بلاغ عدم مطابقة جديد</CardTitle>
          <div className="space-y-2.5">
            <textarea
              autoFocus
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="إيش اللي صار بالضبط؟"
              rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: T.border, background: T.bg, color: T.ink }}
            />
            <input
              value={draft.immediateAction}
              onChange={(e) => setDraft({ ...draft, immediateAction: e.target.value })}
              placeholder="الإجراء الفوري اللي اتُّخذ (إن وُجد)"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: T.border, background: T.bg, color: T.ink }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={draft.severity}
                onChange={(e) => setDraft({ ...draft, severity: e.target.value as NcrSeverity })}
                className="rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: T.border, background: T.bg, color: T.ink }}
              >
                {(Object.keys(NCR_SEVERITY_LABEL) as NcrSeverity[]).map((v) => (
                  <option key={v} value={v}>خطورة: {NCR_SEVERITY_LABEL[v]}</option>
                ))}
              </select>
              <input
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                placeholder="المصدر (شكوى، تفتيش، مورد...)"
                className="rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: T.border, background: T.bg, color: T.ink }}
              />
              <input
                type="date"
                dir="ltr"
                value={draft.dueDate}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                className="rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: T.border, background: T.bg, color: T.ink }}
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={pending || !draft.description.trim()}
                onClick={() =>
                  run(
                    () =>
                      actions
                        .raiseNcr({ ...draft, dueDate: draft.dueDate || null })
                        .then((r) => {
                          if (r.ok) {
                            setDraft({ severity: "minor", source: "", description: "", immediateAction: "", dueDate: "" });
                            setAdding(false);
                          }
                          return r;
                        }),
                    "رُفع البلاغ",
                  )
                }
                className="rounded-xl px-5 py-2 text-sm font-bold text-[#0B1410] disabled:opacity-45"
                style={{ background: T.brandBright }}
              >
                {pending ? "..." : "ارفع"}
              </button>
              <button onClick={() => setAdding(false)} className="rounded-xl px-4 py-2 text-sm font-bold" style={{ color: T.inkSoft }}>
                إلغاء
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {list.map((n) => (
          <NcrRow key={n.id} ncr={n} canManage={canManage} pending={pending} onRun={run} />
        ))}
        {list.length === 0 && (
          <div className="text-xs py-10 text-center" style={{ color: T.inkSoft }}>
            {filter === "open" ? "ما فيه عدم مطابقة مفتوحة" : "ما فيه سجلات"}
          </div>
        )}
      </div>
    </SafetyShell>
  );
}

function NcrRow({
  ncr,
  canManage,
  pending,
  onRun,
}: {
  ncr: Nonconformance;
  canManage: boolean;
  pending: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({
    status: ncr.status,
    rootCause: ncr.rootCause,
    correctiveAction: ncr.correctiveAction,
    preventiveAction: ncr.preventiveAction,
    dueDate: ncr.dueDate ?? "",
  });

  const tone = SEVERITY_TONE[ncr.severity];
  const closed = ncr.status === "closed";

  return (
    <div className="rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}`, opacity: closed ? 0.72 : 1 }}>
      <button onClick={() => setOpen(!open)} className="w-full text-right px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={tone}>
              {NCR_SEVERITY_LABEL[ncr.severity]}
            </span>
            <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: T.bg, color: T.inkSoft }}>
              {NCR_STATUS_LABEL[ncr.status]}
            </span>
            {ncr.ccpLogId && (
              <span className="flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5" style={{ background: T.bg, color: T.inkSoft }}>
                <Link2 size={10} /> من سجل المراقبة
              </span>
            )}
          </div>
          <div className="text-sm font-medium leading-relaxed">{ncr.description}</div>
          <div className="text-[10px] mt-1" style={{ color: T.inkSoft }}>
            {ncr.raisedByName || "—"} · {new Date(ncr.raisedAt).toLocaleDateString("ar-SA")}
            {ncr.dueDate ? ` · الموعد ${ncr.dueDate}` : ""}
            {ncr.closedByName ? ` · أغلقها ${ncr.closedByName}` : ""}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          {ncr.immediateAction && (
            <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: T.bg }}>
              <span style={{ color: T.inkSoft }}>الإجراء الفوري: </span>
              {ncr.immediateAction}
            </div>
          )}

          {!canManage ? (
            <div className="rounded-lg px-3 py-2 text-[11px] space-y-1" style={{ background: T.bg, color: T.inkSoft }}>
              <div>السبب الجذري: {ncr.rootCause || "لم يُحدَّد بعد"}</div>
              <div>الإجراء التصحيحي: {ncr.correctiveAction || "لم يُحدَّد بعد"}</div>
              <div>الإجراء الوقائي: {ncr.preventiveAction || "لم يُحدَّد بعد"}</div>
              <div className="pt-1">المعالجة والإغلاق من صلاحية الجودة والتنفيذي.</div>
            </div>
          ) : (
            <>
              <textarea
                value={d.rootCause}
                onChange={(e) => setD({ ...d, rootCause: e.target.value })}
                placeholder="السبب الجذري — ليش صار؟ (إجباري للإغلاق)"
                rows={2}
                className="w-full rounded-xl border px-3 py-2 text-xs"
                style={{ borderColor: T.border, background: T.bg, color: T.ink }}
              />
              <input
                value={d.correctiveAction}
                onChange={(e) => setD({ ...d, correctiveAction: e.target.value })}
                placeholder="الإجراء التصحيحي — إيش سوّينا للحالة هذي؟ (إجباري للإغلاق)"
                className="w-full rounded-xl border px-3 py-2 text-xs"
                style={{ borderColor: T.border, background: T.bg, color: T.ink }}
              />
              <input
                value={d.preventiveAction}
                onChange={(e) => setD({ ...d, preventiveAction: e.target.value })}
                placeholder="الإجراء الوقائي — إيش يمنع تكرارها؟"
                className="w-full rounded-xl border px-3 py-2 text-xs"
                style={{ borderColor: T.border, background: T.bg, color: T.ink }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  dir="ltr"
                  value={d.dueDate}
                  onChange={(e) => setD({ ...d, dueDate: e.target.value })}
                  className="rounded-xl border px-3 py-1.5 text-xs"
                  style={{ borderColor: T.border, background: T.bg, color: T.ink }}
                />
                {(Object.keys(NCR_STATUS_LABEL) as NcrStatus[]).map((st) => (
                  <button
                    key={st}
                    disabled={pending}
                    onClick={() =>
                      onRun(
                        () => actions.updateNcr({ id: ncr.id, ...d, status: st, dueDate: d.dueDate || null }),
                        st === "closed" ? "أُغلق البلاغ" : `الحالة: ${NCR_STATUS_LABEL[st]}`,
                      )
                    }
                    className="rounded-lg px-3 py-1.5 text-[10px] font-bold disabled:opacity-40"
                    style={
                      ncr.status === st
                        ? { background: T.brand, color: "#fff" }
                        : { background: T.bg, color: T.inkSoft, border: `1px solid ${T.border}` }
                    }
                  >
                    {NCR_STATUS_LABEL[st]}
                  </button>
                ))}
              </div>
              {ncr.severity === "critical" && (
                <div className="text-[10px]" style={{ color: T.warn }}>
                  بلاغ حرج — الإغلاق من صلاحية الإدارة التنفيذية وحدها.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
