"use client";

// بوابة المطبخ — القرار، لا الختم.
//
// الشيف يشوف فحوصاً محسوبة من البيانات (ما فيها إدخال يدوي يُجمّل): الوصفة
// مكتملة، كل مكوّناتها معروفة، السعرات متسقة مع الماكروز، والتجارب الناجحة
// بالعدد المطلوب. ثم يسجّل قراره باسمه وتاريخه.
//
// البوابة نفسها ما يختمها الشيف: القاعدة تحسبها من التجارب + القرار بمحفّز
// (private.sync_kitchen_pilot_gate)، وسياسة RLS ترفض أي ختم يدوي لها لأن
// owner_role عندها null. فما ينفع أحد يختصر التجارب.

import { useMemo, useState } from "react";
import { ChefHat, Search, CheckCircle2, AlertTriangle } from "lucide-react";
import { GateStatus, SECTIONS, gateOfKind } from "@/lib/ops/engine";
import { can } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import { SkuView, useOps } from "@/lib/ops/store";
import * as actions from "../actions";
import {
  AccessNote, Card, CardTitle, ErrorNote, Kpi, Loading, OpsShell, PENDING_COLOR, Pill, StatusBadge, T, num,
} from "@/components/ops/ui";

type Filter = "all" | "ready" | "blocked";

export default function KitchenGatePage() {
  const ops = useOps();
  const session = useSession();
  const role = session?.role ?? null;
  const canDecide = can(role, "kitchenGate.edit");

  const [q, setQ] = useState("");
  const [section, setSection] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [holdText, setHoldText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pilotGate = gateOfKind(ops.data.gateDefs, "kitchen_pilot");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ops.skus.filter((v) => {
      if (section !== "all" && v.sku.item.section !== section) return false;
      if (filter === "ready" && v.pilot.status !== "READY") return false;
      if (filter === "blocked" && v.pilot.status === "READY") return false;
      if (term && !`${v.sku.item.id} ${v.sku.item.name} ${v.sku.item.nameEn}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [ops.skus, q, section, filter]);

  if (!ops.ready) return <Loading />;

  if (!pilotGate) {
    return (
      <OpsShell title="بوابة المطبخ">
        <Card>
          <div className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
            ما فيه بوابة من نوع «مطبخ + Pilot» نشطة في التعريفات، فقرار الشيف ما يترتب
            عليه اعتماد حالياً.
          </div>
        </Card>
      </OpsShell>
    );
  }

  async function decide(v: SkuView, decision: GateStatus, note: string) {
    setBusy(true);
    const r = await actions.setChefDecision(v.sku.item.id, decision, note);
    setError(r.ok ? "" : r.error);
    if (r.ok) setHoldText("");
    setBusy(false);
  }

  const approved = ops.skus.filter((v) => v.pilot.status === "READY").length;
  const held = ops.skus.filter((v) => v.pilot.status === "HOLD").length;

  return (
    <OpsShell
      title="بوابة المطبخ"
      subtitle={`قرار الشيف على «${pilotGate.label}» — الفحوص محسوبة، والختم يتم في القاعدة`}
    >
      <AccessNote
        canEdit={canDecide}
        editText={
          "أنت تسجّل قرار الشيف باسمك وتاريخه. الموافقة ما تمر إلا إذا كانت كل الفحوص المحسوبة ناجحة " +
          "— ومنها التجارب اللي تسجّلها الجودة. الإيقاف يحتاج سبباً مكتوباً، ويقلب الصنف لمتوقف فوراً."
        }
        viewText="عرض فقط — القرار على بوابة المطبخ من صلاحية المطبخ."
      />

      <ErrorNote text={error} />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Kpi label="معتمدة" value={approved} tone="good" />
        <Kpi label="موقوفة من المطبخ" value={held} tone="hold" />
        <Kpi label="بانتظار" value={ops.skus.length - approved - held} tone="warn" />
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
        <Pill active={filter === "blocked"} onClick={() => setFilter("blocked")}>غير معتمدة</Pill>
        <Pill active={filter === "ready"} onClick={() => setFilter("ready")}>معتمدة</Pill>
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
          const p = v.pilot;
          const blocking = p.checks.filter((c) => !c.ok);
          return (
            <div key={id} className="rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <button
                onClick={() => { setOpen(isOpen ? null : id); setHoldText(""); setError(""); }}
                className="w-full text-right flex items-center gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">
                    <span style={{ color: T.inkSoft }}>{id}</span> · {v.sku.item.name}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: T.inkSoft }}>
                    {v.sku.item.section} · {p.checks.filter((c) => c.ok).length} من {p.checks.length} فحوص
                    {p.blocker ? ` · ${p.blocker}` : ""}
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap"
                  style={
                    p.status === "READY"
                      ? { background: T.goodTint, color: T.good }
                      : p.status === "HOLD"
                        ? { background: T.warnTint, color: T.warn }
                        : { background: "#FBF1DC", color: PENDING_COLOR }
                  }
                >
                  {p.status === "READY" ? "معتمدة" : p.status === "HOLD" ? "موقوفة" : "بانتظار"}
                </span>
                <StatusBadge status={v.quality.status} small />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* الفحوص المحسوبة */}
                  <div>
                    <CardTitle icon={<CheckCircle2 size={15} />}>فحوص محسوبة</CardTitle>
                    <div className="space-y-2">
                      {p.checks.map((c) => (
                        <div
                          key={c.label}
                          className="rounded-xl px-3 py-2.5 flex items-start justify-between gap-2"
                          style={{ background: T.bg }}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold">{c.label}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: T.inkSoft }}>{c.detail}</div>
                          </div>
                          <span
                            className="text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0"
                            style={c.ok ? { background: T.goodTint, color: T.good } : { background: T.warnTint, color: T.warn }}
                          >
                            {c.ok ? "سليم" : "غير مكتمل"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed" style={{ background: T.bg, color: T.inkSoft }}>
                      وزن الوصفة النيء {num(v.sku.rawWeight)} جم ·{" "}
                      {v.trials.filter((t) => t.cookedPortionG).length > 0
                        ? `متوسط الحصة بعد الطبخ ${num(
                            v.trials.reduce((a, t) => a + (t.cookedPortionG ?? 0), 0) /
                              Math.max(1, v.trials.filter((t) => t.cookedPortionG).length),
                          )} جم`
                        : "ما سُجّل وزن بعد الطبخ في أي تجربة"}
                    </div>
                  </div>

                  {/* القرار */}
                  <div>
                    <CardTitle icon={<ChefHat size={15} />}>قرار الشيف</CardTitle>

                    {v.chef && (
                      <div className="rounded-xl px-3 py-2.5 mb-3 text-[11px] leading-relaxed" style={{ background: T.bg }}>
                        <div className="font-bold">
                          القرار الحالي:{" "}
                          {v.chef.decision === "READY" ? "موافق" : v.chef.decision === "HOLD" ? "موقوف" : "ما تقرر بعد"}
                        </div>
                        <div style={{ color: T.inkSoft }}>
                          {v.chef.chefName || "—"}
                          {v.chef.approvedAt ? ` · ${new Date(v.chef.approvedAt).toLocaleDateString("ar-SA")}` : ""}
                        </div>
                        {v.chef.note && <div style={{ color: T.warn }}>{v.chef.note}</div>}
                      </div>
                    )}

                    {!canDecide ? (
                      <div className="text-[11px]" style={{ color: T.inkSoft }}>
                        القرار من صلاحية المطبخ.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {blocking.length > 0 && (
                          <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: T.warnTint, color: T.warn }}>
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <div className="text-[11px] leading-relaxed font-bold">
                              الموافقة مقفولة: {blocking.map((c) => c.label).join(" · ")}
                            </div>
                          </div>
                        )}
                        <button
                          disabled={busy || blocking.length > 0}
                          onClick={() => decide(v, "READY", "")}
                          className="w-full rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:opacity-35"
                          style={{ background: T.good }}
                        >
                          موافق — اعتمد الصنف
                        </button>

                        <input
                          value={holdText}
                          onChange={(e) => setHoldText(e.target.value)}
                          placeholder="سبب الإيقاف (إجباري للإيقاف)"
                          className="w-full rounded-xl border px-3 py-2 text-xs"
                          style={{ borderColor: T.border, background: T.bg }}
                        />
                        <button
                          disabled={busy || !holdText.trim()}
                          onClick={() => decide(v, "HOLD", holdText)}
                          className="w-full rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:opacity-35"
                          style={{ background: T.warn }}
                        >
                          أوقف الصنف
                        </button>
                        {v.chef && v.chef.decision !== "PENDING" && (
                          <button
                            disabled={busy}
                            onClick={() => decide(v, "PENDING", "ارتجاع القرار للمراجعة")}
                            className="w-full rounded-xl px-4 py-2 text-[11px] font-bold disabled:opacity-35"
                            style={{ background: T.bg, color: T.inkSoft, border: `1px solid ${T.border}` }}
                          >
                            ارجع القرار لـ«بانتظار»
                          </button>
                        )}
                      </div>
                    )}
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
