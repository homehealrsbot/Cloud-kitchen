"use client";

// تعريف بوابات الاعتماد — هنا تُمنح السلطة.
//
// الإدارة التنفيذية تحدد: إيش البوابات، ومين يختم كل واحدة، وأي بوابة ترجع
// «بانتظار الاعتماد» لو تعدّلت الوصفة. الأقسام تعتمد؛ ما تعرّف.
//
// الصفوف اللي تظهر هنا هي نفسها اللي يقرأها المحرك وتقرأها سياسات RLS، فعدد
// البوابات وشرط النشر يتغيّران من هذي الشاشة بلا تعديل كود.

import { useState, useTransition } from "react";
import { ShieldCheck, Plus, Cpu } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { GateDef, IngApprovalDef, GateKind } from "@/lib/ops/engine";
import { ROLES, Role, isRole } from "@/lib/ops/roles";
import { setGateDef, setIngApprovalDef } from "@/app/admin/ops/actions";

const KIND_LABEL: Record<GateKind, string> = {
  standard: "عامة",
  kitchen_pilot: "مطبخ + Pilot (محسوبة)",
  shelf: "صلاحية",
  price: "سعر وهامش",
};

const SEAL_ROLES: Role[] = ["quality", "kitchen", "executive"];

export default function GateDefManager({
  gateDefs,
  approvalDefs,
}: {
  gateDefs: GateDef[];
  approvalDefs: IngApprovalDef[];
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const nextIndex = Math.max(-1, ...gateDefs.map((d) => d.index)) + 1;
  const [draft, setDraft] = useState({ label: "", kind: "standard" as GateKind, ownerRole: "quality" as Role });

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText = "تم الحفظ") {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "تعذّر الحفظ" });
    });
  }

  const activeCount = gateDefs.filter((d) => d.active).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} style={{ color: T.brand }} />
          <div className="font-semibold text-sm">بوابات اعتماد الصنف — {activeCount} نشطة</div>
        </div>
        <p className="text-[11px] leading-relaxed mb-4" style={{ color: T.inkSoft }}>
          الصنف ما يُباع إلا لما تكون كل بوابة نشطة معتمدة له. شرط النشر هذا مفروض في
          قاعدة البيانات نفسها، فعدد البوابات اللي تحدده هنا هو العدد اللي تطبّقه القاعدة
          — بلا تعديل كود.
        </p>

        <div className="space-y-2">
          {[...gateDefs].sort((a, b) => a.index - b.index).map((d) => (
            <div
              key={d.index}
              className="rounded-xl px-3.5 py-3"
              style={{ background: T.bg, opacity: d.active ? 1 : 0.55 }}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: T.surface, color: T.inkSoft }}>
                      {d.index}
                    </span>
                    <span className="text-sm font-bold">{d.label}</span>
                    <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: T.surface, color: T.inkSoft }}>
                      {KIND_LABEL[d.kind]}
                    </span>
                    {!d.active && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 font-bold" style={{ background: "#fdecea", color: "#a32019" }}>
                        موقوفة
                      </span>
                    )}
                  </div>
                  {d.ownerRole === null && (
                    <div className="flex items-center gap-1.5 text-[10px] mt-1" style={{ color: T.inkSoft }}>
                      <Cpu size={11} /> محسوبة من تجارب Pilot وقرار الشيف — ما يختمها أحد يدوياً
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* مين يختمها */}
                  {d.ownerRole === null ? (
                    <span className="text-[11px] font-bold rounded-lg px-2.5 py-1.5" style={{ background: T.surface, color: T.inkSoft }}>
                      محسوبة
                    </span>
                  ) : (
                    <select
                      value={isRole(d.ownerRole) ? d.ownerRole : ""}
                      disabled={pending}
                      onChange={(e) =>
                        run(() =>
                          setGateDef({
                            index: d.index,
                            label: d.label,
                            kind: d.kind,
                            ownerRole: e.target.value,
                            resetsOnRecipeChange: d.resetsOnRecipeChange,
                            active: d.active,
                            note: d.note,
                          }),
                        )
                      }
                      className="rounded-lg px-2 py-1.5 text-[11px] outline-none"
                      style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
                    >
                      {SEAL_ROLES.map((r) => (
                        <option key={r} value={r}>يختمها: {ROLES[r].label}</option>
                      ))}
                    </select>
                  )}

                  {/* ترجع للاعتماد لو تعدّلت الوصفة */}
                  <button
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        setGateDef({
                          index: d.index,
                          label: d.label,
                          kind: d.kind,
                          ownerRole: d.ownerRole,
                          resetsOnRecipeChange: !d.resetsOnRecipeChange,
                          active: d.active,
                          note: d.note,
                        }),
                      )
                    }
                    className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-45"
                    style={
                      d.resetsOnRecipeChange
                        ? { background: T.brandTint, color: T.brand }
                        : { background: T.surface, color: T.inkSoft, border: `1px solid ${T.border}` }
                    }
                    title="لو تعدّلت الوصفة، هل ترجع هذي البوابة لبانتظار الاعتماد؟"
                  >
                    {d.resetsOnRecipeChange ? "ترجع بتعديل الوصفة" : "ما ترجع"}
                  </button>

                  <button
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        setGateDef({
                          index: d.index,
                          label: d.label,
                          kind: d.kind,
                          ownerRole: d.ownerRole,
                          resetsOnRecipeChange: d.resetsOnRecipeChange,
                          active: !d.active,
                          note: d.note,
                        }),
                      )
                    }
                    className="rounded-lg px-3 py-1.5 text-[10px] font-bold disabled:opacity-45"
                    style={
                      d.active
                        ? { background: "#fdecea", color: "#a32019" }
                        : { background: T.brandTint, color: T.brand }
                    }
                  >
                    {d.active ? "إيقاف" : "تنشيط"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* إضافة بوابة */}
        {adding ? (
          <div className="mt-3 rounded-xl p-3.5" style={{ background: T.bg, border: `1px dashed ${T.border}` }}>
            <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr_1fr_auto] gap-2.5">
              <input
                autoFocus
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="اسم البوابة (مثال: اعتماد التغليف)"
                className="rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
              />
              <select
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as GateKind })}
                className="rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
              >
                {(Object.keys(KIND_LABEL) as GateKind[]).map((k) => (
                  <option key={k} value={k}>{KIND_LABEL[k]}</option>
                ))}
              </select>
              <select
                value={draft.ownerRole}
                disabled={draft.kind === "kitchen_pilot"}
                onChange={(e) => setDraft({ ...draft, ownerRole: e.target.value as Role })}
                className="rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-45"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
              >
                {SEAL_ROLES.map((r) => (
                  <option key={r} value={r}>يختمها: {ROLES[r].label}</option>
                ))}
              </select>
              <button
                disabled={pending || !draft.label.trim()}
                onClick={() =>
                  run(
                    () =>
                      setGateDef({
                        index: nextIndex,
                        label: draft.label,
                        kind: draft.kind,
                        ownerRole: draft.kind === "kitchen_pilot" ? null : draft.ownerRole,
                        resetsOnRecipeChange: false,
                        active: true,
                        note: "",
                      }).then((r) => {
                        if (r.ok) {
                          setDraft({ ...draft, label: "" });
                          setAdding(false);
                        }
                        return r;
                      }),
                    "أُضيفت البوابة — صارت شرطاً للنشر",
                  )
                }
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#0B1410] disabled:opacity-45"
                style={{ background: T.brandBright }}
              >
                {pending ? "..." : "أضف"}
              </button>
            </div>
            <p className="text-[11px] mt-2.5 leading-relaxed" style={{ color: T.warn }}>
              تنبيه: إضافة بوابة ترفع شرط النشر فوراً — كل الأصناف اللي كانت جاهزة تصير
              «بانتظار الاعتماد» لحد ما تُعتمد البوابة الجديدة لها، وتختفي من المنيو العام.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-3 flex items-center gap-1.5 text-xs font-bold"
            style={{ color: T.brand }}
          >
            <Plus size={14} /> أضف بوابة
          </button>
        )}

        {msg && (
          <div
            className="rounded-xl px-3 py-2.5 mt-3 text-xs leading-relaxed"
            style={{ background: msg.ok ? T.brandTint : "#fdecea", color: msg.ok ? T.brand : "#a32019" }}
          >
            {msg.text}
          </div>
        )}
      </div>

      {/* اعتمادات المكوّن */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="font-semibold text-sm mb-1">اعتمادات المكوّن</div>
        <p className="text-[11px] leading-relaxed mb-4" style={{ color: T.inkSoft }}>
          كل مكوّن يمر على هذي الاعتمادات. اعتماد السعر يظهر فقط لمن عنده صلاحية المالية.
        </p>
        <div className="space-y-2">
          {[...approvalDefs].sort((a, b) => a.index - b.index).map((d) => (
            <div
              key={d.index}
              className="rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap"
              style={{ background: T.bg, opacity: d.active ? 1 : 0.55 }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: T.surface, color: T.inkSoft }}>
                  {d.index}
                </span>
                <span className="text-sm font-bold">{d.label}</span>
                {!d.active && (
                  <span className="text-[10px] rounded-full px-2 py-0.5 font-bold" style={{ background: "#fdecea", color: "#a32019" }}>
                    موقوف
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={isRole(d.ownerRole) ? d.ownerRole : ""}
                  disabled={pending}
                  onChange={(e) =>
                    run(() =>
                      setIngApprovalDef({
                        index: d.index,
                        label: d.label,
                        kind: d.kind,
                        ownerRole: e.target.value,
                        active: d.active,
                        note: d.note,
                      }),
                    )
                  }
                  className="rounded-lg px-2 py-1.5 text-[11px] outline-none"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
                >
                  {SEAL_ROLES.map((r) => (
                    <option key={r} value={r}>يعتمده: {ROLES[r].label}</option>
                  ))}
                </select>
                <button
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      setIngApprovalDef({
                        index: d.index,
                        label: d.label,
                        kind: d.kind,
                        ownerRole: d.ownerRole,
                        active: !d.active,
                        note: d.note,
                      }),
                    )
                  }
                  className="rounded-lg px-3 py-1.5 text-[10px] font-bold disabled:opacity-45"
                  style={
                    d.active ? { background: "#fdecea", color: "#a32019" } : { background: T.brandTint, color: T.brand }
                  }
                >
                  {d.active ? "إيقاف" : "تنشيط"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
