"use client";

// سجل مراقبة النقاط الحرجة — الإدخال اليومي.
//
// المطبخ يسجّل القراءة فقط. «ناجح/راسب» ما هو خانة يملأها أحد: القاعدة تحكم
// بالحد الحرج المعرّف للعنصر، وترفض حفظ قراءة خارج الحد بلا إجراء تصحيحي،
// وتفتح عدم مطابقة تلقائياً. والجودة تعتمد بتوقيع ثانٍ لا ينفع يكون نفس المسجّل.

import { useMemo, useState, useTransition } from "react";
import { ClipboardList, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { can } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import { judgeReading, limitText, type CriticalLimit } from "@/lib/safety/types";
import * as actions from "../actions";
import { AccessNote, Card, CardTitle, Kpi, Note, SafetyShell, T, useSafety } from "@/components/safety/ui";

export default function CcpLogPage() {
  const s = useSafety();
  const session = useSession();
  const role = session?.role ?? null;
  const canLog = can(role, "safety.log");
  const canVerify = can(role, "safety.verify");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const stepOf = useMemo(() => new Map(s.steps.map((st) => [st.index, st])), [s.steps]);
  const activeLimits = useMemo(
    () => s.limits.filter((l) => l.active && stepOf.get(l.stepIndex)?.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [s.limits, stepOf],
  );
  const dayLog = useMemo(() => s.log.filter((e) => e.date === date), [s.log, date]);
  const limitById = useMemo(() => new Map(s.limits.map((l) => [l.id, l])), [s.limits]);

  const recordedToday = new Set(dayLog.map((e) => e.limitId));
  const failedToday = dayLog.filter((e) => !e.passed).length;
  const unverified = dayLog.filter((e) => !e.verifiedAt).length;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "تعذّر الحفظ" });
    });
  }

  return (
    <SafetyShell title="سجل مراقبة النقاط الحرجة" subtitle="القراءة تُسجَّل، والحكم عليها من الحد الحرج">
      <AccessNote
        canEdit={canLog}
        editText={
          "سجّل القراءة كما قستها بالضبط. النظام يحكم عليها بالحد الحرج — ما تقدر تعلّمها «ناجحة». " +
          "وإذا خرجت عن الحد، الإجراء التصحيحي إجباري، وتُفتح عدم مطابقة تلقائياً." +
          (canVerify ? " وأنت تعتمد سجلات غيرك، لا سجلاتك." : "")
        }
        viewText="عرض فقط — تسجيل المراقبة من صلاحية المطبخ والجودة."
      />

      {msg && <Note ok={msg.ok} text={msg.text} />}

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <label className="text-xs font-bold" style={{ color: T.inkSoft }}>تاريخ السجل</label>
        <input
          type="date"
          dir="ltr"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: T.border, background: T.surface, color: T.ink }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Kpi
          label="مُسجَّل اليوم"
          value={`${recordedToday.size} / ${activeLimits.length}`}
          tone={recordedToday.size === activeLimits.length ? "good" : "warn"}
        />
        <Kpi label="خارج الحد" value={failedToday} tone={failedToday > 0 ? "hold" : "good"} />
        <Kpi label="بانتظار الاعتماد" value={unverified} tone={unverified > 0 ? "warn" : "good"} />
      </div>

      <Card className="mb-6">
        <CardTitle icon={<ClipboardList size={17} />}>قراءات {date}</CardTitle>
        {activeLimits.length === 0 ? (
          <div className="text-xs py-6 text-center" style={{ color: T.inkSoft }}>
            ما فيه حدود حرجة نشطة — تضعها الجودة من شاشة الخطة
          </div>
        ) : (
          <div className="space-y-2">
            {activeLimits.map((l) => (
              <LimitRow
                key={l.id}
                limit={l}
                stepLabel={stepOf.get(l.stepIndex)?.label ?? ""}
                ccpCode={stepOf.get(l.stepIndex)?.ccpCode ?? ""}
                entries={dayLog.filter((e) => e.limitId === l.id)}
                date={date}
                canLog={canLog}
                canVerify={canVerify}
                myId={session?.userId ?? ""}
                pending={pending}
                onRun={run}
              />
            ))}
          </div>
        )}
      </Card>

      {/* آخر القراءات الخارجة عن الحد عبر كل الأيام */}
      {s.log.some((e) => !e.passed) && (
        <Card>
          <CardTitle icon={<XCircle size={17} />}>آخر الخروج عن الحدود</CardTitle>
          <div className="space-y-1.5">
            {s.log
              .filter((e) => !e.passed)
              .slice(0, 12)
              .map((e) => {
                const l = limitById.get(e.limitId);
                return (
                  <div key={e.id} className="rounded-lg px-3 py-2 text-[11px]" style={{ background: T.bg }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold">{l?.parameter ?? "—"}</span>
                      <span dir="ltr" style={{ color: T.inkSoft }}>{e.date}</span>
                    </div>
                    <div className="mt-0.5" style={{ color: T.warn }}>
                      القراءة {e.readingValue ?? (e.readingBool ? "نعم" : "لا")} {l?.unit} — المسموح {l ? limitText(l) : "—"}
                    </div>
                    {e.correctiveAction && (
                      <div className="mt-0.5" style={{ color: T.inkSoft }}>الإجراء: {e.correctiveAction}</div>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </SafetyShell>
  );
}

function LimitRow({
  limit,
  stepLabel,
  ccpCode,
  entries,
  date,
  canLog,
  canVerify,
  myId,
  pending,
  onRun,
}: {
  limit: CriticalLimit;
  stepLabel: string;
  ccpCode: string;
  entries: ReturnType<typeof useSafety>["log"];
  date: string;
  canLog: boolean;
  canVerify: boolean;
  myId: string;
  pending: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void;
}) {
  const [value, setValue] = useState("");
  const [bool, setBool] = useState<boolean | null>(null);
  const [shift, setShift] = useState("");
  const [corrective, setCorrective] = useState("");

  const num = value.trim() === "" ? null : Number(value);
  const preview = judgeReading(limit, num, bool);
  const needsCorrective = preview === false;
  const canSubmit =
    canLog && !pending && (limit.kind === "numeric" ? num !== null && !Number.isNaN(num) : bool !== null) &&
    (!needsCorrective || corrective.trim() !== "");

  function submit() {
    onRun(
      () =>
        actions
          .recordCcpReading({
            limitId: limit.id,
            date,
            shift,
            value: limit.kind === "numeric" ? num : null,
            bool: limit.kind === "boolean" ? bool : null,
            correctiveAction: corrective,
            note: "",
          })
          .then((r) => {
            if (r.ok) {
              setValue("");
              setBool(null);
              setCorrective("");
            }
            return r;
          }),
      preview === false ? "سُجّلت القراءة وفُتحت عدم مطابقة" : "سُجّلت القراءة",
    );
  }

  return (
    <div className="rounded-xl px-4 py-3" style={{ background: T.bg }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {ccpCode && (
              <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: T.warnTint, color: T.warn }}>
                {ccpCode}
              </span>
            )}
            <span className="text-sm font-bold">{limit.parameter}</span>
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: T.inkSoft }}>
            {stepLabel} · {limit.frequency || "—"}
          </div>
        </div>
        <span className="text-[11px] font-bold rounded-lg px-2.5 py-1 shrink-0" style={{ background: T.brandTint, color: T.brand }}>
          المسموح {limitText(limit)}
        </span>
      </div>

      {/* القراءات المسجّلة لهذا اليوم */}
      {entries.length > 0 && (
        <div className="space-y-1 mb-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 flex-wrap text-[11px]"
              style={{ background: T.surface }}
            >
              <span className="flex items-center gap-1.5">
                {e.passed ? (
                  <CheckCircle2 size={13} style={{ color: T.good }} />
                ) : (
                  <XCircle size={13} style={{ color: T.warn }} />
                )}
                <span className="font-bold">
                  {e.readingValue ?? (e.readingBool ? "نعم" : "لا")} {limit.unit}
                </span>
                {e.shift && <span style={{ color: T.inkSoft }}>· {e.shift}</span>}
                <span style={{ color: T.inkSoft }}>· {e.recordedByName}</span>
              </span>

              {e.verifiedAt ? (
                <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: T.goodTint, color: T.good }}>
                  اعتمدها {e.verifiedByName}
                </span>
              ) : canVerify && e.recordedBy !== myId ? (
                <button
                  disabled={pending}
                  onClick={() => onRun(() => actions.verifyCcpReading(e.id), "اعتُمدت القراءة")}
                  className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-45"
                  style={{ background: T.brandBright }}
                >
                  <ShieldCheck size={11} className="inline ml-1" /> اعتماد
                </button>
              ) : (
                <span className="text-[10px]" style={{ color: T.inkSoft }}>
                  {canVerify && e.recordedBy === myId ? "سجّلتها بنفسك — يعتمدها غيرك" : "بانتظار اعتماد الجودة"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* إدخال قراءة جديدة */}
      {canLog && (
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-2 items-start">
          {limit.kind === "numeric" ? (
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d.-]/g, ""))}
              placeholder={`القراءة ${limit.unit}`}
              className="w-32 rounded-lg border px-2.5 py-1.5 text-xs"
              style={{
                borderColor: preview === false ? T.warn : T.border,
                background: T.surface,
                color: preview === false ? T.warn : T.ink,
              }}
            />
          ) : (
            <span className="inline-flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              {([[true, "نعم"], [false, "لا"]] as [boolean, string][]).map(([v, label]) => (
                <button
                  key={label}
                  onClick={() => setBool(bool === v ? null : v)}
                  className="px-3 py-1.5 text-[11px] font-bold"
                  style={
                    bool === v
                      ? { background: v ? T.good : T.warn, color: "#fff" }
                      : { background: T.surface, color: T.inkSoft }
                  }
                >
                  {label}
                </button>
              ))}
            </span>
          )}

          <div className="space-y-2">
            <input
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              placeholder="الوردية (اختياري)"
              className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
              style={{ borderColor: T.border, background: T.surface }}
            />
            {needsCorrective && (
              <div>
                <input
                  autoFocus
                  value={corrective}
                  onChange={(e) => setCorrective(e.target.value)}
                  placeholder="الإجراء التصحيحي (إجباري)"
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                  style={{ borderColor: T.warn, background: T.surface }}
                />
                <div className="text-[10px] mt-1 leading-relaxed" style={{ color: T.warn }}>
                  القراءة خارج الحد. المقترح في الخطة: {limit.correctiveAction}
                </div>
              </div>
            )}
          </div>

          <button
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-35"
            style={{ background: preview === false ? T.warn : T.brandBright }}
          >
            {pending ? "..." : "سجّل"}
          </button>
        </div>
      )}
    </div>
  );
}
