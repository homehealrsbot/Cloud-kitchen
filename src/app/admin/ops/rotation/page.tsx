"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, RotateCcw, BarChart3 } from "lucide-react";
import { LUNCH_SLOTS, checkRotation, slotOptions } from "@/lib/ops/engine";
import { can } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import { useOps } from "@/lib/ops/store";
import * as actions from "../actions";
import { AccessNote, Card, CardTitle, ErrorNote, Loading, OpsShell, Pill, StatusBadge, T, TableWrap, Td, Th, num } from "@/components/ops/ui";

const MEAL_GROUPS = ["فطور", "غداء", "عشاء", "سناك", "شوربة", "سلطة", "حلا"];
const FRIDAY_DISHES = ["كبسة", "مجبوس", "مندي"];

export default function RotationPage() {
  const ops = useOps();
  const session = useSession();
  const canEdit = can(session?.role, "rotation.edit");
  const [day, setDay] = useState(0);
  const [error, setError] = useState("");

  const check = useMemo(() => checkRotation(ops.data), [ops.data]);

  if (!ops.ready) {
    return (
      <OpsShell title="جدول الدوران">
        <Loading />
      </OpsShell>
    );
  }

  const rot = ops.data.rotation;
  const nameOf = (id: string) => ops.skuMap.get(id)?.sku.item.name ?? id;

  // قاعدة غداء الجمعة: فيه كبسة أو مجبوس أو مندي
  function fridayOk(di: number): boolean | null {
    if (!rot.days[di].label.includes("الجمعة")) return null;
    return LUNCH_SLOTS.some((s) => FRIDAY_DISHES.some((d) => nameOf(rot.days[di].slots[s]).includes(d)));
  }

  function dayIssues(di: number): string[] {
    const c = check.days[di];
    const issues: string[] = [];
    if (!c.ruleOk) issues.push(`توزيع الأطباق الرئيسية ${c.chicken} دجاج / ${c.meat} لحم / ${c.seafood} بحري (المطلوب 4 / 2 / 2)`);
    if (c.duplicateLunchDinner.length) issues.push(`مكرر بين الغداء والعشاء: ${c.duplicateLunchDinner.map(nameOf).join("، ")}`);
    if (c.repeatedFromYesterday.length) issues.push(`تكرر من اليوم السابق: ${c.repeatedFromYesterday.map(nameOf).join("، ")}`);
    if (!c.gulfArabOk) issues.push(`أطباق خليجية/عربية ${c.gulfArabCount} من 8 (الحد الأدنى 3)`);
    if (fridayOk(di) === false) issues.push("غداء الجمعة ما فيه كبسة أو مجبوس أو مندي");
    const holds = rot.days[di].slots.filter((id) => ops.skuMap.get(id)?.quality.status === "HOLD");
    if (holds.length) issues.push(`أصناف متوقفة في اليوم: ${[...new Set(holds)].map(nameOf).join("، ")}`);
    return issues;
  }

  const issues = dayIssues(day);
  const edited = ops.state.rotation !== null;

  return (
    <OpsShell title="جدول الدوران" subtitle="14 يوم — كل يوم: 4 فطور · 4 غداء · 4 عشاء · 4 سناك · شوربتان · سلطتان · حلاوتان">
      <AccessNote
        canEdit={canEdit}
        editText="تقدر تبدّل صنف أي خانة بصنف من نفس الفئة. الفحص تحت يتحدث مباشرة مع كل تعديل."
        viewText="عرض فقط — تعديل الدوران من صلاحية المطبخ."
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5">
        {rot.days.map((d, i) => {
          const bad = dayIssues(i).length > 0;
          return (
            <Pill key={d.label} active={i === day} onClick={() => { setDay(i); setError(""); }}>
              {d.label} {bad ? "⚠" : ""}
            </Pill>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardTitle
            icon={<CalendarDays size={17} />}
            aside={
              canEdit && edited ? (
                <button
                  onClick={async () => {
                    const r = await actions.resetRotation();
                    setError(r.ok ? "" : r.error);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold"
                  style={{ color: T.inkSoft }}
                >
                  <RotateCcw size={12} /> إرجاع الجدول للأصل
                </button>
              ) : null
            }
          >
            أصناف يوم {rot.days[day].label}
          </CardTitle>
          <ErrorNote text={error} />
          <div className="space-y-4">
            {MEAL_GROUPS.map((group) => (
              <div key={group}>
                <div className="text-[11px] font-bold mb-2" style={{ color: T.brand }}>{group}</div>
                <div className="space-y-2">
                  {rot.slotLabels.map((label, slot) => {
                    if (!label.startsWith(group)) return null;
                    const id = rot.days[day].slots[slot];
                    const view = ops.skuMap.get(id);
                    return (
                      <div key={slot} className="flex items-center gap-2 rounded-xl px-3 py-2 flex-wrap" style={{ background: T.bg }}>
                        <span className="text-[11px] w-16 shrink-0" style={{ color: T.inkSoft }}>
                          {rot.slotRule[slot] !== group ? rot.slotRule[slot] : label}
                        </span>
                        <div className="flex-1 min-w-[180px]">
                          {canEdit ? (
                            <select
                              aria-label={label}
                              value={id}
                              onChange={async (e) => {
                                const r = await actions.setRotationSlot(day, slot, e.target.value);
                                setError(r.ok ? "" : r.error);
                              }}
                              className="w-full rounded-lg border px-2 py-1.5 text-xs font-bold"
                              style={{ borderColor: T.border, background: "#FFFDF5" }}
                            >
                              {slotOptions(ops.data, slot).map((m) => (
                                <option key={m.id} value={m.id}>{m.id} · {m.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs font-bold">{id} · {view?.sku.item.name}</span>
                          )}
                        </div>
                        {view && <StatusBadge status={view.quality.status} small />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>فحص قواعد اليوم</CardTitle>
          <div className="space-y-2">
            <Rule ok={check.days[day].ruleOk} text={`${check.days[day].chicken} دجاج / ${check.days[day].meat} لحم / ${check.days[day].seafood} بحري`} hint="المطلوب 4 / 2 / 2" />
            <Rule ok={check.days[day].duplicateLunchDinner.length === 0} text="ما فيه صنف مكرر بين الغداء والعشاء" />
            <Rule ok={check.days[day].repeatedFromYesterday.length === 0} text="ما فيه صنف رئيسي مكرر من أمس" />
            <Rule ok={check.days[day].gulfArabOk} text={`${check.days[day].gulfArabCount} أطباق خليجية/عربية من 8`} hint="الحد الأدنى 3" />
            {fridayOk(day) !== null && <Rule ok={fridayOk(day) === true} text="غداء الجمعة فيه كبسة أو مجبوس أو مندي" />}
          </div>
          {issues.length > 0 && (
            <div className="rounded-xl px-3 py-2.5 mt-4" style={{ background: T.warnTint }}>
              <div className="text-[11px] font-bold mb-1" style={{ color: T.warn }}>يحتاج مراجعة</div>
              <ul className="text-[11px] leading-relaxed list-disc pr-4" style={{ color: T.warn }}>
                {issues.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}
          <div className="text-[10px] mt-4 leading-relaxed" style={{ color: T.inkSoft }}>{rot.rules}</div>
        </Card>
      </div>

      {/* تكرار كل صنف */}
      <Card>
        <CardTitle icon={<BarChart3 size={17} />}>تكرار كل صنف خلال 14 يوم</CardTitle>
        <TableWrap>
          <thead>
            <tr>
              <Th>رقم</Th>
              <Th>الصنف</Th>
              <Th>القسم</Th>
              <Th>مرات الظهور / 14 يوم</Th>
              <Th>في الأسبوع (≈)</Th>
            </tr>
          </thead>
          <tbody>
            {ops.computed.map((c) => {
              const n = check.counts[c.item.id] ?? 0;
              return (
                <tr key={c.item.id} className="border-t" style={{ borderColor: T.border }}>
                  <Td>{c.item.id}</Td>
                  <Td strong>{c.item.name}</Td>
                  <Td>{c.item.section}</Td>
                  <Td strong><span style={{ color: n === 0 ? T.warn : T.ink }}>{n}</span></Td>
                  <Td>{num(n / 2, 1)}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Card>
    </OpsShell>
  );
}

function Rule({ ok, text, hint }: { ok: boolean; text: string; hint?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: ok ? T.goodTint : T.warnTint }}>
      {ok ? <CheckCircle2 size={15} style={{ color: T.good }} className="mt-0.5 shrink-0" /> : <XCircle size={15} style={{ color: T.warn }} className="mt-0.5 shrink-0" />}
      <div>
        <div className="text-xs font-bold" style={{ color: ok ? T.good : T.warn }}>{text}</div>
        {hint && <div className="text-[10px] mt-0.5" style={{ color: T.inkSoft }}>{hint}</div>}
      </div>
    </div>
  );
}
