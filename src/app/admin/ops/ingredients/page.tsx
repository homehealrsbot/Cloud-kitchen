"use client";

import { Fragment, useState } from "react";
import { Search, ChevronDown, ChevronUp, Save } from "lucide-react";
import { ALLERGENS, AllergenKey, IngApprovalDef, Ingredient } from "@/lib/ops/engine";
import { ROLES, Role, can, isRole, sealsGate } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import { IngredientSpecs, useOps } from "@/lib/ops/store";
import * as actions from "../actions";
import { AccessNote, Card, ErrorNote, Loading, NumInput, OpsShell, Pill, T, TableWrap, Td, Th, TriState, num, sar, statusColors } from "@/components/ops/ui";

type Filter = "all" | "allergen" | "pending";

export default function IngredientsPage() {
  const ops = useOps();
  const session = useSession();
  const role = session?.role ?? null;
  const canSpecs = can(role, "ingredients.editSpecs");
  const canPrice = can(role, "ingredients.editPrice");
  const showFinance = can(role, "finance.view");
  // أي اعتمادات يختمها دوري؟ من تعريفاتها في القاعدة
  const myApprovals = ops.approvalDefs.filter((d) => sealsGate(role, d.ownerRole));
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!ops.ready) {
    return (
      <OpsShell title="المكوّنات">
        <Loading />
      </OpsShell>
    );
  }

  const usage = new Map<string, number>();
  for (const l of ops.data.recipes) usage.set(l.ing, (usage.get(l.ing) ?? 0) + 1);

  const list = ops.data.ingredients.filter((ing) => {
    if (q.trim() && !(`${ing.name} ${ing.nameEn}`.toLowerCase().includes(q.trim().toLowerCase()))) return false;
    if (filter === "allergen") return ALLERGENS.some((a) => ing.flags[a.key]) || !!ing.hidden;
    if (filter === "pending") return ops.ingApprovals(ing.key).some((s) => s !== "READY");
    return true;
  });

  const anyEdit = canSpecs || canPrice || myApprovals.length > 0;
  const cols = 8 + (showFinance ? 1 : 0);

  return (
    <OpsShell title="المكوّنات" subtitle={`${ops.data.ingredients.length} مكوّن — القيم لكل 100 جم (نيء ما لم يُذكر)`}>
      <AccessNote
        canEdit={anyEdit}
        editText={
          canSpecs
            ? "تقدر تعدّل القيم الغذائية ومسببات الحساسية، وتعتمد المورد وإقرار الحساسية لكل مكوّن. افتح أي مكوّن للتعديل."
            : "تقدر تعدّل سعر كل مكوّن وتوثّق السعر بعرض المورد. افتح أي مكوّن للتعديل."
        }
        viewText="عرض فقط — القيم الغذائية والحساسية من صلاحية الجودة، والأسعار من صلاحية الإدارة التنفيذية."
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 flex-1 min-w-[200px]" style={{ borderColor: T.border, background: T.surface }}>
          <Search size={14} style={{ color: T.inkSoft }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المكوّن"
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>الكل</Pill>
        <Pill active={filter === "allergen"} onClick={() => setFilter("allergen")}>فيه حساسية</Pill>
        <Pill active={filter === "pending"} onClick={() => setFilter("pending")}>اعتماد ناقص</Pill>
      </div>

      <Card>
        <ErrorNote text={error} />
        <TableWrap>
          <thead>
            <tr>
              <Th>المكوّن</Th>
              <Th>سعرات</Th>
              <Th>بروتين</Th>
              <Th>كارب</Th>
              <Th>دهون</Th>
              <Th>الحساسية</Th>
              <Th>الاعتماد</Th>
              {showFinance && <Th>السعر / كجم</Th>}
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.map((ing) => {
              const flags = ALLERGENS.filter((a) => ing.flags[a.key]);
              const approvals = ops.ingApprovals(ing.key);
              const isOpen = open === ing.key;
              return (
                <Fragment key={ing.key}>
                  <tr className="border-t cursor-pointer" style={{ borderColor: T.border }} onClick={() => { setOpen(isOpen ? null : ing.key); setError(""); }}>
                    <Td>
                      <div className="font-bold">{ing.name}</div>
                      <div className="text-[10px]" style={{ color: T.inkSoft }}>
                        {ing.nameEn} · في {usage.get(ing.key) ?? 0} وصفة
                      </div>
                    </Td>
                    <Td>{num(ing.kcal, 0)}</Td>
                    <Td>{num(ing.protein, 1)}</Td>
                    <Td>{num(ing.carb, 1)}</Td>
                    <Td>{num(ing.fat, 1)}</Td>
                    <Td>
                      {flags.length === 0 && !ing.hidden ? (
                        <span style={{ color: T.inkSoft }}>—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {flags.map((a) => (
                            <span key={a.key} className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: T.warnTint, color: T.warn }}>{a.label}</span>
                          ))}
                          {ing.hidden && (
                            <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: "#FBF1DC", color: "#B7791F" }}>خفي: {ing.hidden}</span>
                          )}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        {ops.approvalDefs.map((d) => {
                          if (d.kind === "price" && !showFinance) return null;
                          return (
                            <span
                              key={d.index}
                              title={d.label}
                              className="inline-block rounded-full"
                              style={{ width: 9, height: 9, background: statusColors(approvals[d.index] ?? "PENDING").fg }}
                            />
                          );
                        })}
                      </div>
                    </Td>
                    {showFinance && <Td strong>{sar(ing.price)}</Td>}
                    <Td>{isOpen ? <ChevronUp size={14} style={{ color: T.inkSoft }} /> : <ChevronDown size={14} style={{ color: T.inkSoft }} />}</Td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={cols} className="px-2 pb-4">
                        <Editor
                          key={ing.key}
                          ing={ing}
                          approvals={approvals}
                          defs={ops.approvalDefs}
                          stamps={ops.ingApprovalStamps(ing.key)}
                          role={role}
                          canSpecs={canSpecs}
                          canPrice={canPrice}
                          showFinance={showFinance}
                          onError={setError}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </TableWrap>
        {list.length === 0 && <div className="text-xs py-8 text-center" style={{ color: T.inkSoft }}>ما فيه مكوّنات تطابق البحث</div>}
      </Card>
    </OpsShell>
  );
}

function Editor({
  ing,
  approvals,
  defs,
  stamps,
  role,
  canSpecs,
  canPrice,
  showFinance,
  onError,
}: {
  ing: Ingredient;
  approvals: ("READY" | "PENDING" | "HOLD")[];
  defs: IngApprovalDef[];
  stamps: Record<number, { by: string; at: string }>;
  role: Role | null;
  canSpecs: boolean;
  canPrice: boolean;
  showFinance: boolean;
  onError: (e: string) => void;
}) {
  const [specs, setSpecs] = useState<IngredientSpecs>({
    kcal: ing.kcal,
    protein: ing.protein,
    carb: ing.carb,
    fat: ing.fat,
    fiber: ing.fiber,
    hidden: ing.hidden,
    flags: { ...ing.flags },
    supplier: ing.supplier,
    supplierNote: ing.supplierNote,
  });
  const [savedMsg, setSavedMsg] = useState("");
  const fields: { k: "kcal" | "protein" | "carb" | "fat" | "fiber"; label: string }[] = [
    { k: "kcal", label: "سعرات" },
    { k: "protein", label: "بروتين (جم)" },
    { k: "carb", label: "كارب (جم)" },
    { k: "fat", label: "دهون (جم)" },
    { k: "fiber", label: "ألياف (جم)" },
  ];

  return (
    <div className="rounded-xl p-4" style={{ background: T.bg }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* القيم الغذائية والحساسية */}
        <div>
          <div className="text-[11px] font-bold mb-2" style={{ color: T.brand }}>القيم الغذائية لكل 100 جم</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {fields.map((f) => (
              <label key={f.k} className="text-[10px]" style={{ color: T.inkSoft }}>
                <span className="block mb-1">{f.label}</span>
                <NumInput
                  ariaLabel={f.label}
                  value={specs[f.k]}
                  step={0.1}
                  disabled={!canSpecs}
                  onCommit={async (v) => { setSavedMsg(""); setSpecs((s) => ({ ...s, [f.k]: v ?? 0 })); }}
                />
              </label>
            ))}
          </div>
          <div className="text-[11px] font-bold mb-2" style={{ color: T.brand }}>مسببات الحساسية</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ALLERGENS.map((a) => {
              const on = specs.flags[a.key as AllergenKey];
              return (
                <button
                  key={a.key}
                  disabled={!canSpecs}
                  aria-pressed={on}
                  onClick={async () => { setSavedMsg(""); setSpecs((s) => ({ ...s, flags: { ...s.flags, [a.key]: !on } })); }}
                  className="text-[11px] font-bold rounded-full px-2.5 py-1"
                  style={on ? { background: T.warn, color: "#fff" } : { background: T.surface, color: T.inkSoft, border: `1px solid ${T.border}` }}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
          <label className="text-[10px] block" style={{ color: T.inkSoft }}>
            <span className="block mb-1">مواد خفية محتملة (تحتاج إقرار المورد)</span>
            <input
              value={specs.hidden}
              disabled={!canSpecs}
              onChange={async (e) => { setSavedMsg(""); setSpecs((s) => ({ ...s, hidden: e.target.value })); }}
              className="w-full rounded-lg border px-3 py-1.5 text-xs disabled:opacity-60"
              style={{ borderColor: T.border, background: canSpecs ? "#FFFDF5" : T.bg, color: T.ink }}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <label className="text-[10px] block" style={{ color: T.inkSoft }}>
              <span className="block mb-1">المورد المعتمد</span>
              <input
                value={specs.supplier}
                disabled={!canSpecs}
                placeholder="اسم المورد"
                onChange={(e) => { setSavedMsg(""); setSpecs((s) => ({ ...s, supplier: e.target.value })); }}
                className="w-full rounded-lg border px-3 py-1.5 text-xs disabled:opacity-60"
                style={{ borderColor: T.border, background: canSpecs ? "#FFFDF5" : T.bg, color: T.ink }}
              />
            </label>
            <label className="text-[10px] block" style={{ color: T.inkSoft }}>
              <span className="block mb-1">ملاحظة المورد (شهادات، بديل، قيود)</span>
              <input
                value={specs.supplierNote}
                disabled={!canSpecs}
                onChange={(e) => { setSavedMsg(""); setSpecs((s) => ({ ...s, supplierNote: e.target.value })); }}
                className="w-full rounded-lg border px-3 py-1.5 text-xs disabled:opacity-60"
                style={{ borderColor: T.border, background: canSpecs ? "#FFFDF5" : T.bg, color: T.ink }}
              />
            </label>
          </div>
          {ing.source && (
            <div className="text-[10px] mt-2" style={{ color: T.inkSoft }}>
              مصدر القيم الغذائية: {ing.source}
            </div>
          )}
          {canSpecs && (
            <button
              onClick={async () => {
                const r = await actions.setIngredientSpecs(ing.key, specs);
                onError(r.ok ? "" : r.error);
                setSavedMsg(r.ok ? "تم الحفظ — ينعكس فوراً على كل الوصفات اللي تستخدم المكوّن" : "");
              }}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white mt-3"
              style={{ background: T.brandBright }}
            >
              <Save size={13} /> حفظ القيم
            </button>
          )}
          {savedMsg && <div className="text-[11px] font-bold mt-2" style={{ color: T.good }}>{savedMsg}</div>}
        </div>

        {/* الاعتمادات والسعر */}
        <div>
          <div className="text-[11px] font-bold mb-2" style={{ color: T.brand }}>اعتماد المكوّن</div>
          <div className="space-y-2">
            {defs.map((d) => {
              if (d.kind === "price" && !showFinance) return null;
              const i = d.index;
              const editable = sealsGate(role, d.ownerRole);
              const stamp = stamps[i];
              return (
                <div key={i} className="rounded-lg px-3 py-2" style={{ background: T.surface }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs">
                      {d.label}
                      <span className="text-[10px] mr-1.5" style={{ color: T.inkSoft }}>
                        ({isRole(d.ownerRole) ? ROLES[d.ownerRole].label : "محسوب"})
                      </span>
                    </span>
                    <TriState
                      value={approvals[i] ?? "PENDING"}
                      disabled={!editable}
                      allowHold={false}
                      onChange={async (v) => {
                        const r = await actions.setIngApproval(ing.key, i, v);
                        onError(r.ok ? "" : r.error);
                      }}
                    />
                  </div>
                  {approvals[i] === "READY" && stamp?.by && (
                    <div className="text-[10px] mt-1" style={{ color: T.good }}>
                      اعتمده {stamp.by}
                      {stamp.at ? ` · ${new Date(stamp.at).toLocaleDateString("ar-SA")}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {showFinance && (
            <div className="mt-4">
              <div className="text-[11px] font-bold mb-2" style={{ color: T.brand }}>السعر (ر.س / كجم صافٍ)</div>
              <NumInput
                ariaLabel="السعر"
                value={ing.price}
                step={0.5}
                width={110}
                disabled={!canPrice}
                onCommit={async (v) => {
                  const r = await actions.setIngredientPrice(ing.key, v ?? 0);
                  onError(r.ok ? "" : r.error);
                }}
              />
              <label className="text-[10px] block mt-2.5" style={{ color: T.inkSoft }}>
                <span className="block mb-1">تاريخ عرض السعر</span>
                <input
                  type="date"
                  dir="ltr"
                  defaultValue={ing.priceQuoteDate ?? ""}
                  disabled={!canPrice}
                  onChange={async (e) => {
                    const r = await actions.setIngredientPrice(ing.key, ing.price, e.target.value);
                    onError(r.ok ? "" : r.error);
                  }}
                  className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-60"
                  style={{ borderColor: T.border, background: canPrice ? "#FFFDF5" : T.bg, color: T.ink }}
                />
              </label>
              <div className="text-[10px] mt-1.5" style={{ color: T.inkSoft }}>
                تغيير السعر ينعكس فوراً على تكلفة وسعر كل الأصناف اللي تستخدم المكوّن.
                و«سعر موثّق» ما يُعتمد إلا بسعر وتاريخ عرض.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
