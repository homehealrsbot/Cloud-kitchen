"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { GateStatus, SECTIONS, SkuStatus, gateOfKind } from "@/lib/ops/engine";
import { ROLES, can, isRole, sealsGate } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import { SkuView, useOps } from "@/lib/ops/store";
import * as actions from "../actions";
import { AccessNote, ErrorNote, Kpi, Loading, NumInput, OpsShell, Pill, StatusBadge, T, TriState, num, pct, sar } from "@/components/ops/ui";

type StatusFilter = "all" | SkuStatus;

export default function QualityPage() {
  const ops = useOps();
  const session = useSession();
  const role = session?.role ?? null;
  const canShelf = can(role, "quality.editShelfLife");
  // بوابة الصلاحية ما نعرفها برقم: نسألها بنوعها من التعريفات
  const shelfGate = gateOfKind(ops.data.gateDefs, "shelf");
  // إيش يختم دوري وإيش لغيري — من التعريفات، فالنص ما يكذب لو تغيّرت
  const myGates = ops.gateDefs.filter((d) => sealsGate(role, d.ownerRole));
  const otherGates = ops.gateDefs.filter((d) => d.ownerRole !== null && !sealsGate(role, d.ownerRole));
  const computedGates = ops.gateDefs.filter((d) => d.ownerRole === null);
  const showFinance = can(role, "finance.view");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [section, setSection] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hold, setHold] = useState<{ sku: string; gate: number; text: string } | null>(null);

  if (!ops.ready) {
    return (
      <OpsShell title="بوابات الجودة">
        <Loading />
      </OpsShell>
    );
  }

  const count = (s: SkuStatus) => ops.skus.filter((v) => v.quality.status === s).length;
  const list = ops.skus.filter((v) => {
    if (status !== "all" && v.quality.status !== status) return false;
    if (section !== "all" && v.sku.item.section !== section) return false;
    if (q.trim() && !`${v.sku.item.id} ${v.sku.item.name} ${v.sku.item.nameEn}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  async function setGate(v: SkuView, gi: number, next: GateStatus) {
    if (next === "HOLD") {
      setHold({ sku: v.sku.item.id, gate: gi, text: "" });
      return;
    }
    const r = await actions.setGate(v.sku.item.id, gi, next, "");
    setError(r.ok ? "" : r.error);
    setHold(null);
  }

  return (
    <OpsShell
      title="بوابات الاعتماد"
      subtitle={`كل صنف يمر على ${ops.gateDefs.length} بوابة — ما يُباع إلا لما تكون كلها معتمدة`}
    >
      <AccessNote
        canEdit={myGates.length > 0}
        editText={
          `أنت تختم: ${myGates.map((d) => `«${d.label}»`).join("، ")}. الإيقاف يحتاج سبب مكتوب.` +
          (otherGates.length
            ? ` وباقي البوابات (${otherGates.map((d) => d.label).join("، ")}) لأدوار ثانية — ما تقدر تختمها بدالهم.`
            : "") +
          (computedGates.length
            ? ` و«${computedGates.map((d) => d.label).join("، ")}» محسوبة من تجارب Pilot وقرار الشيف، ما تُختم يدوياً.`
            : "")
        }
        viewText="عرض فقط — دورك الحالي ما يختم أي بوابة. كل بوابة لها مالك محدد في تعريفها، والمطبخ ما يعتمد شغله بنفسه."
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Kpi label="جاهز للبيع" value={count("READY")} tone="good" />
        <Kpi label="بانتظار الاعتماد" value={count("PENDING")} tone="warn" />
        <Kpi label="متوقف" value={count("HOLD")} tone="hold" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 flex-1 min-w-[200px]" style={{ borderColor: T.border, background: T.surface }}>
          <Search size={14} style={{ color: T.inkSoft }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الرقم" className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <Pill active={status === "all"} onClick={() => setStatus("all")}>كل الحالات</Pill>
        <Pill active={status === "READY"} onClick={() => setStatus("READY")}>جاهز</Pill>
        <Pill active={status === "PENDING"} onClick={() => setStatus("PENDING")}>بانتظار</Pill>
        <Pill active={status === "HOLD"} onClick={() => setStatus("HOLD")}>متوقف</Pill>
      </div>
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        <Pill active={section === "all"} onClick={() => setSection("all")}>كل الأقسام</Pill>
        {SECTIONS.map((s) => (
          <Pill key={s} active={section === s} onClick={() => setSection(s)}>{s}</Pill>
        ))}
      </div>

      <ErrorNote text={error} />

      <div className="space-y-3">
        {list.map((v) => {
          const { sku } = v;
          const isOpen = open === sku.item.id;
          const ingKeys = [...new Set(sku.lines.map((l) => l.ing))];
          const supplierOk = ingKeys.filter((k) => ops.ingApprovals(k)[0] === "READY").length;
          const allergenOk = ingKeys.filter((k) => ops.ingApprovals(k)[1] === "READY").length;
          return (
            <div key={sku.item.id} className="rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <button
                onClick={async () => { setOpen(isOpen ? null : sku.item.id); setHold(null); setError(""); }}
                className="w-full text-right flex items-center gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">
                    <span style={{ color: T.inkSoft }}>{sku.item.id}</span> · {sku.item.name}
                  </div>
                  <div className="text-[11px] mt-1 flex items-center gap-2 flex-wrap" style={{ color: T.inkSoft }}>
                    <span>{sku.item.section}</span>
                    <span>·</span>
                    <span>{v.quality.readyCount} من {v.quality.total} بوابات</span>
                    {v.quality.blocker && (
                      <>
                        <span>·</span>
                        <span style={{ color: v.quality.status === "HOLD" ? T.warn : "#B7791F" }}>العائق: {v.quality.blocker}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex gap-1">
                  {ops.gateDefs.map((d) => (
                    <span
                      key={d.index}
                      title={d.label}
                      className="inline-block rounded-sm"
                      style={{
                        width: 10,
                        height: 18,
                        background:
                          v.gates[d.index] === "READY" ? T.good : v.gates[d.index] === "HOLD" ? T.warn : "#E8D9A8",
                      }}
                    />
                  ))}
                </div>
                <StatusBadge status={v.quality.status} small />
                {isOpen ? <ChevronUp size={15} style={{ color: T.inkSoft }} /> : <ChevronDown size={15} style={{ color: T.inkSoft }} />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  {v.quality.alert && (
                    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-3" style={{ background: T.warnTint, color: T.warn }}>
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <div className="text-[11px] leading-relaxed font-bold">
                        تنبيه آلي: {v.quality.alert}. الصنف متوقف تلقائياً لحد ما تعتمد بوابة «صلاحية» أو تنزّل الصلاحية المعلنة لـ {ops.data.settings.shelfLifeApprovalH} ساعة أو أقل.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* البوابات */}
                    <div className="lg:col-span-3 space-y-2">
                      {ops.gateDefs.map((d) => {
                        const gi = d.index;
                        // مين يعدّل؟ صاحب البوابة في تعريفها. والمحسوبة ما يعدّلها أحد.
                        const computed = d.ownerRole === null;
                        const editable = sealsGate(role, d.ownerRole);
                        const holding = hold && hold.sku === sku.item.id && hold.gate === gi;
                        const stamp = v.stamps[gi];
                        return (
                          <div key={gi} className="rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <ShieldCheck size={14} style={{ color: v.gates[gi] === "READY" ? T.good : T.inkSoft }} />
                                <span className="text-xs font-bold">{d.label}</span>
                                <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: T.surface, color: T.inkSoft }}>
                                  {computed ? "محسوبة" : isRole(d.ownerRole) ? ROLES[d.ownerRole].label : d.ownerRole}
                                </span>
                              </div>
                              <TriState value={v.gates[gi]} disabled={!editable} onChange={(next) => setGate(v, gi, next)} />
                            </div>
                            {computed && (
                              <div className="text-[10px] mt-1.5" style={{ color: T.inkSoft }}>
                                تتحدد من تجارب Pilot وقرار الشيف — <a href="/admin/ops/kitchen-gate" className="underline">بوابة المطبخ</a>
                              </div>
                            )}
                            {v.gates[gi] === "READY" && stamp?.by && (
                              <div className="text-[10px] mt-1.5" style={{ color: T.good }}>
                                اعتمدها {stamp.by}
                                {stamp.at ? ` · ${new Date(stamp.at).toLocaleDateString("ar-SA")}` : ""}
                              </div>
                            )}
                            {v.gates[gi] !== "READY" && v.notes[gi] && (
                              <div className="text-[11px] mt-2" style={{ color: T.warn }}>{v.notes[gi]}</div>
                            )}
                            {holding && (
                              <div className="flex gap-2 mt-2">
                                <input
                                  autoFocus
                                  value={hold.text}
                                  onChange={(e) => setHold({ ...hold, text: e.target.value })}
                                  placeholder="سبب الإيقاف (إجباري)"
                                  className="flex-1 rounded-lg border px-3 py-1.5 text-xs"
                                  style={{ borderColor: T.border, background: T.surface }}
                                />
                                <button
                                  disabled={!hold.text.trim()}
                                  onClick={async () => {
                                    const r = await actions.setGate(sku.item.id, gi, "HOLD", hold.text);
                                    setError(r.ok ? "" : r.error);
                                    if (r.ok) setHold(null);
                                  }}
                                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                                  style={{ background: T.warn }}
                                >
                                  تأكيد الإيقاف
                                </button>
                                <button onClick={() => setHold(null)} className="text-xs font-bold" style={{ color: T.inkSoft }}>إلغاء</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* معلومات تساعد على القرار */}
                    <div className="lg:col-span-2 space-y-2">
                      <Fact label="مسببات الحساسية (محسوبة من الوصفة)" value={sku.allergens} warn={sku.allergens !== "لا يوجد"} />
                      {sku.hiddenAllergens.length > 0 && (
                        <Fact label="مواد خفية محتملة — اطلب إقرار المورد" value={sku.hiddenAllergens.join(" · ")} warn />
                      )}
                      <Fact
                        label="اتساق التغذية (فرق السعرات عن الماكروز)"
                        value={`${pct(sku.kcalDiff)} — الحد ${pct(ops.data.settings.kcalDiffMax, 0)}`}
                        ok={sku.kcalDiffOk}
                        warn={!sku.kcalDiffOk}
                      />
                      <Fact label="القيم للحصة" value={`${num(sku.kcal, 0)} سعرة · ${num(sku.protein, 0)} بروتين · ${num(sku.carb, 0)} كارب · ${num(sku.fat, 0)} دهون`} />
                      <Fact label="موردون معتمدون لمكوّنات الصنف" value={`${supplierOk} من ${ingKeys.length}`} ok={supplierOk === ingKeys.length} />
                      <Fact label="إقرار حساسية من المورد" value={`${allergenOk} من ${ingKeys.length}`} ok={allergenOk === ingKeys.length} />
                      <div className="rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                        <div className="text-[10px] mb-1.5" style={{ color: T.inkSoft }}>الصلاحية المعلنة (ساعة عند ≤5°م)</div>
                        {canShelf ? (
                          <NumInput
                            ariaLabel="الصلاحية المعلنة"
                            value={sku.item.shelfLifeH}
                            min={1}
                            onCommit={async (val) => {
                              const r = await actions.setShelfLife(sku.item.id, val ?? 0);
                              setError(r.ok ? "" : r.error);
                            }}
                          />
                        ) : (
                          <div className="text-xs font-bold">{sku.item.shelfLifeH}</div>
                        )}
                        {shelfGate && v.gates[shelfGate.index] !== "READY" && (
                          <div className="text-[10px] mt-1.5" style={{ color: T.inkSoft }}>
                            بوابة «{shelfGate.label}» ما اعتُمدت بعد
                          </div>
                        )}
                      </div>
                      {showFinance && (
                        <Fact
                          label="السعر والهامش"
                          value={`${sar(sku.price, 0)} · تكلفة كاملة ${sar(sku.fullCost)} · هامش ${pct(sku.contributionPct)}`}
                          warn={sku.marginAlert}
                          ok={!sku.marginAlert}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <div className="text-xs py-10 text-center" style={{ color: T.inkSoft }}>ما فيه أصناف تطابق الفلتر</div>}
      </div>
    </OpsShell>
  );
}

function Fact({ label, value, warn, ok }: { label: string; value: string; warn?: boolean; ok?: boolean }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: warn ? T.warnTint : T.bg }}>
      <div className="text-[10px] mb-1" style={{ color: T.inkSoft }}>{label}</div>
      <div className="text-xs font-bold flex items-center gap-1.5 leading-relaxed" style={{ color: warn ? T.warn : T.ink }}>
        {ok && <CheckCircle2 size={13} style={{ color: T.good }} className="shrink-0" />}
        {value}
      </div>
    </div>
  );
}
