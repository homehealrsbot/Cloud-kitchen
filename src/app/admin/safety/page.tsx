"use client";

// خطة سلامة الغذاء: خطوات HACCP وحدودها الحرجة، وبرامج PRP اليومية،
// وحالة بنود ISO 22000.
//
// الحدود هنا هي نفسها اللي تحكم على كل قراءة في سجل المراقبة — ما فيه نسخة
// ثانية في الكود. تعديلها هنا يغيّر الحكم فوراً على كل قراءة جديدة.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ShieldCheck, ClipboardCheck, FileCheck2, AlertTriangle, Thermometer } from "lucide-react";
import { can } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import {
  HAZARD_LABEL,
  ISO_STATUS_LABEL,
  type IsoStatus,
  limitText,
} from "@/lib/safety/types";
import * as actions from "./actions";
import { AccessNote, Card, CardTitle, Kpi, Note, SafetyShell, T, useSafety } from "@/components/safety/ui";

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function SafetyPlanPage() {
  const s = useSafety();
  const session = useSession();
  const role = session?.role ?? null;
  const canPlan = can(role, "safety.plan");
  const canLog = can(role, "safety.log");

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const today = TODAY();

  const { limits, prpLog } = s;

  const limitsByStep = useMemo(() => {
    const m = new Map<number, typeof limits>();
    for (const l of limits) {
      const arr = m.get(l.stepIndex) ?? [];
      arr.push(l);
      m.set(l.stepIndex, arr);
    }
    return m;
  }, [limits]);

  const prpToday = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const e of prpLog) if (e.date === today) m.set(e.code, e.done);
    return m;
  }, [prpLog, today]);

  const activeSteps = s.steps.filter((st) => st.active);
  const ccpSteps = activeSteps.filter((st) => st.isCcp);
  const activePrp = s.prpPrograms.filter((p) => p.active);
  const prpDoneToday = activePrp.filter((p) => prpToday.get(p.code)).length;
  const isoDone = s.isoClauses.filter((c) => c.status === "implemented" || c.status === "verified").length;
  const isoScope = s.isoClauses.filter((c) => c.status !== "not_applicable").length;
  const openNcr = s.ncr.filter((n) => n.status !== "closed").length;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText = "تم الحفظ") {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "تعذّر الحفظ" });
    });
  }

  if (s.steps.length === 0) {
    return (
      <SafetyShell title="سلامة الغذاء">
        <Card>
          <div className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
            ما فيه خطة سلامة محمّلة. نفّذ <code>supabase/seed.sql</code> على قاعدة البيانات
            لتحميل خطة البداية، أو أضف الخطوات من حساب الجودة.
          </div>
        </Card>
      </SafetyShell>
    );
  }

  return (
    <SafetyShell
      title="سلامة الغذاء"
      subtitle={`${activeSteps.length} خطوة · ${ccpSteps.length} نقطة حرجة · ${s.limits.filter((l) => l.active).length} حد حرج`}
    >
      <AccessNote
        canEdit={canPlan}
        editText="أنت تضع الخطة والحدود الحرجة. الحد اللي تحدده هنا هو اللي تحكم به القاعدة على كل قراءة — ما فيه نسخة ثانية في الكود."
        viewText="عرض فقط — خطة HACCP والحدود الحرجة من صلاحية الجودة والمتابعة."
      />

      {msg && <Note ok={msg.ok} text={msg.text} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="نقاط حرجة (CCP)" value={ccpSteps.length} hint="خطوات تحتاج مراقبة مستمرة" />
        <Kpi
          label="برامج PRP اليوم"
          value={`${prpDoneToday} / ${activePrp.length}`}
          tone={prpDoneToday === activePrp.length ? "good" : "warn"}
        />
        <Kpi
          label="بنود ISO مطبَّقة"
          value={`${isoDone} / ${isoScope}`}
          tone={isoDone === isoScope ? "good" : "warn"}
        />
        <Kpi label="عدم مطابقة مفتوحة" value={openNcr} tone={openNcr > 0 ? "hold" : "good"} />
      </div>

      {/* ---------- خطة HACCP ---------- */}
      <Card className="mb-6">
        <CardTitle
          icon={<ShieldCheck size={17} />}
          aside={
            <Link href="/admin/safety/ccp" className="text-[11px] font-bold" style={{ color: T.brand }}>
              سجل المراقبة ←
            </Link>
          }
        >
          خطة HACCP
        </CardTitle>

        <div className="space-y-2">
          {activeSteps.map((st) => {
            const limits = limitsByStep.get(st.index)?.filter((l) => l.active) ?? [];
            return (
              <div key={st.index} className="rounded-xl px-4 py-3" style={{ background: T.bg }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: T.surface, color: T.inkSoft }}>
                        {st.stage}
                      </span>
                      <span className="text-sm font-bold">{st.label}</span>
                      {st.isCcp && (
                        <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: T.warnTint, color: T.warn }}>
                          {st.ccpCode || "نقطة حرجة"}
                        </span>
                      )}
                      <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: T.surface, color: T.inkSoft }}>
                        {HAZARD_LABEL[st.hazardType]}
                      </span>
                    </div>
                    <div className="text-[11px] mt-1 leading-relaxed" style={{ color: T.inkSoft }}>
                      الخطر: {st.hazard || "—"}
                    </div>
                    <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: T.inkSoft }}>
                      الضبط: {st.controlMeasure || "—"}
                    </div>
                  </div>
                </div>

                {limits.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {limits.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-lg px-3 py-2 flex items-start justify-between gap-3 flex-wrap"
                        style={{ background: T.surface }}
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold">{l.parameter}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: T.inkSoft }}>
                            {l.method || "—"} · {l.frequency || "—"}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: T.warn }}>
                            عند التجاوز: {l.correctiveAction}
                          </div>
                        </div>
                        <span
                          className="text-[11px] font-bold rounded-lg px-2.5 py-1 whitespace-nowrap shrink-0"
                          style={{ background: T.brandTint, color: T.brand }}
                        >
                          {limitText(l)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {st.isCcp && limits.length === 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] mt-2 font-bold" style={{ color: T.warn }}>
                    <AlertTriangle size={12} /> نقطة حرجة بلا حد — ما فيه معيار تُقاس عليه
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---------- برامج PRP ---------- */}
        <Card>
          <CardTitle icon={<ClipboardCheck size={17} />}>
            برامج المتطلبات الأساسية — اليوم {today}
          </CardTitle>
          <AccessNote
            canEdit={canLog}
            editText="علّم البرنامج لما يُنفَّذ فعلاً. التعليم يُسجَّل باسمك ووقته."
            viewText="عرض فقط — تسجيل تنفيذ البرامج من صلاحية المطبخ والجودة."
          />
          <div className="space-y-1.5">
            {activePrp.map((p) => {
              const done = prpToday.get(p.code) ?? false;
              return (
                <div
                  key={p.code}
                  className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                  style={{ background: T.bg }}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold">
                      <span style={{ color: T.inkSoft }}>{p.code}</span> {p.label}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: T.inkSoft }}>
                      {p.category} · {p.frequency}
                    </div>
                  </div>
                  <button
                    disabled={!canLog || pending}
                    onClick={() => run(() => actions.recordPrp(p.code, today, !done, ""), done ? "أُلغي التعليم" : "سُجّل التنفيذ")}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold disabled:opacity-45"
                    style={
                      done
                        ? { background: T.goodTint, color: T.good }
                        : { background: T.surface, color: T.inkSoft, border: `1px solid ${T.border}` }
                    }
                  >
                    {done ? "نُفّذ ✓" : "لم يُنفّذ"}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ---------- ISO 22000 ---------- */}
        <Card>
          <CardTitle icon={<FileCheck2 size={17} />}>ISO 22000 — حالة البنود</CardTitle>
          <AccessNote
            canEdit={canPlan}
            editText="حدّث حالة كل بند. البند المطبَّق يحتاج دليلاً مكتوباً — القاعدة ترفضه بلا دليل."
            viewText="عرض فقط — تحديث حالة البنود من صلاحية الجودة."
          />
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
            {s.isoClauses.map((c) => (
              <IsoRow key={c.clause} clause={c} canEdit={canPlan} pending={pending} onSave={run} />
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 text-[11px] leading-relaxed" style={{ color: T.inkSoft }}>
        <Thermometer size={12} className="inline ml-1" />
        حدود حرارة الثلاجة والفريزر كانت مكتوبة في كود التطبيق. صارت حدوداً حرجة تحت
        خطوة «التخزين البارد» — تعدّلها الجودة من هنا، والقراءات تُحكم عليها بها.
      </div>
    </SafetyShell>
  );
}

function IsoRow({
  clause,
  canEdit,
  pending,
  onSave,
}: {
  clause: { clause: string; title: string; status: IsoStatus; evidence: string };
  canEdit: boolean;
  pending: boolean;
  onSave: (fn: () => Promise<{ ok: boolean; error?: string }>, okText?: string) => void;
}) {
  const [evidence, setEvidence] = useState(clause.evidence);
  const [open, setOpen] = useState(false);

  const tone =
    clause.status === "verified" || clause.status === "implemented"
      ? { background: T.goodTint, color: T.good }
      : clause.status === "not_applicable"
        ? { background: T.surface, color: T.inkSoft }
        : { background: "#FBF1DC", color: "#B7791F" };

  return (
    <div className="rounded-lg px-3 py-2" style={{ background: T.bg }}>
      <button onClick={() => setOpen(!open)} className="w-full text-right flex items-center justify-between gap-2">
        <span className="text-[11px] min-w-0">
          <span className="font-bold" style={{ color: T.inkSoft }}>{clause.clause}</span> {clause.title}
        </span>
        <span className="text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap shrink-0" style={tone}>
          {ISO_STATUS_LABEL[clause.status]}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <textarea
            value={evidence}
            disabled={!canEdit}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="الدليل: أين يوجد المستند أو السجل الذي يثبت تطبيق هذا البند؟"
            rows={2}
            className="w-full rounded-lg border px-2.5 py-1.5 text-[11px] disabled:opacity-60"
            style={{ borderColor: T.border, background: T.surface, color: T.ink }}
          />
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(ISO_STATUS_LABEL) as IsoStatus[]).map((st) => (
              <button
                key={st}
                disabled={!canEdit || pending}
                onClick={() => onSave(() => actions.setIsoClause(clause.clause, st, evidence), `بند ${clause.clause}: ${ISO_STATUS_LABEL[st]}`)}
                className="rounded-lg px-2.5 py-1 text-[10px] font-bold disabled:opacity-40"
                style={
                  clause.status === st
                    ? { background: T.brand, color: "#fff" }
                    : { background: T.surface, color: T.inkSoft, border: `1px solid ${T.border}` }
                }
              >
                {ISO_STATUS_LABEL[st]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
