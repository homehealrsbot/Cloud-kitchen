"use client";

// تجارب Pilot — الإدخال الأول في سلسلة الاعتماد.
//
// الجودة تطبخ الصنف فعلياً وتسجّل لكل تجربة: نتيجتها، وزن الحصة بعد الطبخ،
// التاريخ، والملاحظة. عدد التجارب الناجحة المطلوبة مُدخل في الإعدادات
// (pilotPassesRequired) — ما هو رقم مكتوب هنا. ولما يكتمل العدد تنتقل البوابة
// لقرار الشيف في /admin/ops/kitchen-gate، وبعد قراره تُختم البوابة المحسوبة
// في القاعدة بمحفّز. فما فيه أحد يختم بوابة المطبخ بيده.

import { useMemo, useState } from "react";
import { Search, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { PilotResult, SECTIONS, gateOfKind } from "@/lib/ops/engine";
import { can } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import { useOps } from "@/lib/ops/store";
import * as actions from "../actions";
import {
  AccessNote, Card, ErrorNote, Kpi, Loading, OpsShell, PENDING_COLOR, Pill, StatusBadge, T, Td, Th, TableWrap,
} from "@/components/ops/ui";

type Filter = "all" | "done" | "open";

export default function PilotPage() {
  const ops = useOps();
  const session = useSession();
  const role = session?.role ?? null;
  const canEdit = can(role, "pilot.edit");

  const [q, setQ] = useState("");
  const [section, setSection] = useState<string>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pilotGate = gateOfKind(ops.data.gateDefs, "kitchen_pilot");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ops.skus.filter((v) => {
      if (section !== "all" && v.sku.item.section !== section) return false;
      if (filter === "done" && !v.pilot.trialsOk) return false;
      if (filter === "open" && v.pilot.trialsOk) return false;
      if (term && !`${v.sku.item.id} ${v.sku.item.name} ${v.sku.item.nameEn}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [ops.skus, q, section, filter]);

  if (!ops.ready) return <Loading />;

  const required = ops.data.settings.pilotPassesRequired;
  const doneCount = ops.skus.filter((v) => v.pilot.trialsOk).length;

  async function save(skuId: string, trialIndex: number, patch: {
    result: PilotResult | null;
    cookedPortionG: number | null;
    date: string | null;
    notes: string;
  }) {
    setBusy(true);
    const r = await actions.setPilotTrial(skuId, trialIndex, patch);
    setError(r.ok ? "" : r.error);
    setBusy(false);
  }

  if (!pilotGate) {
    return (
      <OpsShell title="تجارب Pilot">
        <Card>
          <div className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
            ما فيه بوابة من نوع «مطبخ + Pilot» نشطة في تعريفات البوابات، فتسجيل التجارب
            ما يترتب عليه شي حالياً. الإدارة التنفيذية تضيفها من شاشة تعريف البوابات.
          </div>
        </Card>
      </OpsShell>
    );
  }

  return (
    <OpsShell
      title="تجارب Pilot"
      subtitle={
        Number.isFinite(required)
          ? `المطلوب ${required} تجربة ناجحة لكل صنف — العدد مُدخل في الإعدادات`
          : "عدد التجارب المطلوبة غير مُعد في الإعدادات"
      }
    >
      <AccessNote
        canEdit={canEdit}
        editText={
          "أنت تسجّل التجارب: النتيجة ووزن الحصة بعد الطبخ والتاريخ. التجربة الفاشلة لازم لها سبب مكتوب. " +
          `ولما تكتمل التجارب الناجحة ينتقل الصنف لقرار الشيف، وبعده تُختم بوابة «${pilotGate.label}» آلياً.`
        }
        viewText="عرض فقط — تسجيل التجارب من صلاحية الجودة."
      />

      <ErrorNote text={error} />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Kpi label="أصناف أكملت التجارب" value={doneCount} tone="good" />
        <Kpi label="أصناف ناقصة" value={ops.skus.length - doneCount} tone="warn" />
        <Kpi label="تجارب مسجّلة" value={ops.skus.reduce((a, v) => a + v.trials.length, 0)} />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2 flex-1 min-w-[200px]"
          style={{ borderColor: T.border, background: T.surface }}
        >
          <Search size={14} style={{ color: T.inkSoft }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برمز الصنف أو اسمه"
            className="flex-1 bg-transparent outline-none text-xs"
          />
        </div>
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>الكل</Pill>
        <Pill active={filter === "open"} onClick={() => setFilter("open")}>ناقصة</Pill>
        <Pill active={filter === "done"} onClick={() => setFilter("done")}>مكتملة</Pill>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Pill active={section === "all"} onClick={() => setSection("all")}>كل الأقسام</Pill>
        {SECTIONS.map((s) => (
          <Pill key={s} active={section === s} onClick={() => setSection(s)}>{s}</Pill>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((v) => {
          const id = v.sku.item.id;
          const isOpen = open === id;
          return (
            <div key={id} className="rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <button
                onClick={() => { setOpen(isOpen ? null : id); setError(""); }}
                className="w-full text-right flex items-center gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">
                    <span style={{ color: T.inkSoft }}>{id}</span> · {v.sku.item.name}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: T.inkSoft }}>
                    {v.sku.item.section} · ناجحة {v.pilot.passes}
                    {v.pilot.required !== null ? ` من ${v.pilot.required}` : ""}
                    {v.pilot.fails > 0 ? ` · فاشلة ${v.pilot.fails}` : ""}
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap"
                  style={
                    v.pilot.trialsOk
                      ? { background: T.goodTint, color: T.good }
                      : { background: "#FBF1DC", color: PENDING_COLOR }
                  }
                >
                  {v.pilot.trialsOk ? "التجارب مكتملة" : "ناقصة"}
                </span>
                <StatusBadge status={v.quality.status} small />
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  <TableWrap minWidth={640}>
                    <thead>
                      <tr>
                        <Th>#</Th>
                        <Th>النتيجة</Th>
                        <Th>وزن الحصة بعد الطبخ (جم)</Th>
                        <Th>التاريخ</Th>
                        <Th>الملاحظة</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows(v.trials.map((t) => t.index), v.pilot.required).map((idx) => {
                        const t = v.trials.find((x) => x.index === idx) ?? null;
                        return (
                          <TrialRow
                            key={idx}
                            index={idx}
                            result={t?.result ?? null}
                            cookedPortionG={t?.cookedPortionG ?? null}
                            date={t?.date ?? null}
                            notes={t?.notes ?? ""}
                            disabled={!canEdit || busy}
                            exists={!!t}
                            onSave={(patch) => save(id, idx, patch)}
                            onClear={async () => {
                              setBusy(true);
                              const r = await actions.clearPilotTrial(id, idx);
                              setError(r.ok ? "" : r.error);
                              setBusy(false);
                            }}
                          />
                        );
                      })}
                    </tbody>
                  </TableWrap>

                  <div className="mt-3 text-[11px] leading-relaxed" style={{ color: T.inkSoft }}>
                    وزن الحصة بعد الطبخ يُسجّل للمقارنة مع وزن الوصفة النيء
                    ({Math.round(v.sku.rawWeight)} جم) — الفرق هو نسبة الفقد في الطبخ.
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="text-xs py-8 text-center" style={{ color: T.inkSoft }}>ما فيه أصناف تطابق البحث</div>
        )}
      </div>
    </OpsShell>
  );
}

/**
 * أرقام خانات التجارب المعروضة: المسجّل فعلاً + خانة فاضية إضافية، وعلى الأقل
 * العدد المطلوب. فلو رفعت الأقسام المطلوب من ٣ لـ٥ ظهرت خانتان جديدتان بلا
 * تعديل كود، ولو سجّلت تجربة سادسة ما اختفت.
 */
function rows(existing: number[], required: number | null): number[] {
  const max = Math.max(required ?? 0, ...existing, 0);
  const out: number[] = [];
  for (let i = 1; i <= max + 1; i++) out.push(i);
  return out;
}

function TrialRow({
  index,
  result,
  cookedPortionG,
  date,
  notes,
  disabled,
  exists,
  onSave,
  onClear,
}: {
  index: number;
  result: PilotResult | null;
  cookedPortionG: number | null;
  date: string | null;
  notes: string;
  disabled: boolean;
  exists: boolean;
  onSave: (patch: { result: PilotResult | null; cookedPortionG: number | null; date: string | null; notes: string }) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState({
    result,
    grams: cookedPortionG === null ? "" : String(cookedPortionG),
    date: date ?? "",
    notes,
  });
  const dirty =
    draft.result !== result ||
    draft.grams !== (cookedPortionG === null ? "" : String(cookedPortionG)) ||
    draft.date !== (date ?? "") ||
    draft.notes !== notes;

  return (
    <tr>
      <Td strong>{index}</Td>
      <Td>
        <span className="inline-flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
          {([["PASS", "ناجحة"], ["FAIL", "فاشلة"]] as [PilotResult, string][]).map(([k, label]) => {
            const active = draft.result === k;
            return (
              <button
                key={k}
                disabled={disabled}
                onClick={() => setDraft({ ...draft, result: active ? null : k })}
                className="px-2.5 py-1 text-[10px] font-bold whitespace-nowrap disabled:opacity-60"
                style={
                  active
                    ? { background: k === "PASS" ? T.good : T.warn, color: "#fff" }
                    : { background: T.surface, color: T.inkSoft }
                }
              >
                {label}
              </button>
            );
          })}
        </span>
      </Td>
      <Td>
        <input
          inputMode="decimal"
          disabled={disabled}
          value={draft.grams}
          onChange={(e) => setDraft({ ...draft, grams: e.target.value.replace(/[^\d.]/g, "") })}
          className="w-24 rounded-lg border px-2 py-1 text-xs"
          style={{ borderColor: T.border, background: T.bg }}
        />
      </Td>
      <Td>
        <input
          type="date"
          dir="ltr"
          disabled={disabled}
          value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          className="rounded-lg border px-2 py-1 text-xs"
          style={{ borderColor: T.border, background: T.bg }}
        />
      </Td>
      <Td>
        <input
          disabled={disabled}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder={draft.result === "FAIL" ? "السبب (إجباري)" : "ملاحظة"}
          className="w-full min-w-[140px] rounded-lg border px-2 py-1 text-xs"
          style={{ borderColor: T.border, background: T.bg }}
        />
      </Td>
      <Td>
        <div className="flex items-center gap-1.5">
          <button
            disabled={disabled || !dirty}
            onClick={() =>
              onSave({
                result: draft.result,
                cookedPortionG: draft.grams.trim() === "" ? null : Number(draft.grams),
                date: draft.date || null,
                notes: draft.notes,
              })
            }
            className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-35"
            style={{ background: T.brandBright }}
          >
            حفظ
          </button>
          {exists && !disabled && (
            <button onClick={onClear} aria-label="حذف التجربة" className="rounded-lg px-1.5 py-1" style={{ color: T.warn }}>
              <Trash2 size={13} />
            </button>
          )}
          {exists && draft.result === "PASS" && !dirty && <CheckCircle2 size={13} style={{ color: T.good }} />}
          {exists && draft.result === "FAIL" && !dirty && <XCircle size={13} style={{ color: T.warn }} />}
        </div>
      </Td>
    </tr>
  );
}
