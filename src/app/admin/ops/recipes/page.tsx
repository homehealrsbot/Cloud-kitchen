"use client";

import { useMemo, useState } from "react";
import { BookOpen, Plus, Trash2, Save, Undo2, CheckCircle2, AlertTriangle } from "lucide-react";
import { GATES, ING_TYPE_LABEL, IngType, MAX_RECIPE_LINES, SECTIONS, GATES_RESET_ON_RECIPE_CHANGE } from "@/lib/ops/engine";
import { can, useSession } from "@/lib/ops/roles";
import { actions, useOps } from "@/lib/ops/store";
import { AccessNote, Card, CardTitle, ErrorNote, Loading, OpsShell, StatusBadge, T, TableWrap, Td, Th, num, pct, sar } from "@/components/ops/ui";

type DraftLine = { type: IngType; ing: string; grams: string };
const TYPES: IngType[] = ["P", "C", "V", "S"];

export default function RecipesPage() {
  const ops = useOps();
  const session = useSession();
  const role = session?.role ?? null;
  const canEdit = can(role, "recipes.edit");
  const showFinance = can(role, "finance.view");
  const [skuId, setSkuId] = useState("C01");
  const [draft, setDraft] = useState<DraftLine[] | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const view = ops.skuMap.get(skuId) ?? ops.skus[0];
  const ingMap = useMemo(() => new Map(ops.data.ingredients.map((i) => [i.key, i])), [ops.data.ingredients]);

  if (!ops.ready || !view) {
    return (
      <OpsShell title="الوصفات">
        <Loading />
      </OpsShell>
    );
  }

  const { sku } = view;
  const original: DraftLine[] = sku.lines.map((l) => ({ type: l.type, ing: l.ing, grams: String(l.grams) }));
  const lines = draft ?? original;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(original);

  // حساب مباشر للمسودة (قبل الحفظ)
  const totals = lines.reduce(
    (a, l) => {
      const ing = ingMap.get(l.ing);
      const g = Number(l.grams) || 0;
      if (!ing) return a;
      return {
        grams: a.grams + g,
        kcal: a.kcal + (g / 100) * ing.kcal,
        protein: a.protein + (g / 100) * ing.protein,
        carb: a.carb + (g / 100) * ing.carb,
        fat: a.fat + (g / 100) * ing.fat,
        cost: a.cost + (g / 1000) * ing.price,
      };
    },
    { grams: 0, kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0 },
  );
  const kcalDiff = totals.kcal ? Math.abs(totals.kcal - (4 * totals.protein + 4 * totals.carb + 9 * totals.fat)) / totals.kcal : 0;
  const kcalOk = kcalDiff <= ops.data.settings.kcalDiffMax;
  // نستخدم نفس القائمة اللي يطبقها المخزن فعلياً عند الحفظ — بدل أرقام مكتوبة يدوياً تختلف عنه
  const readyGatesAffected = GATES_RESET_ON_RECIPE_CHANGE.filter((gi) => view.gates[gi] === "READY").map((gi) => GATES[gi]);

  function pick(id: string) {
    setSkuId(id);
    setDraft(null);
    setError("");
    setSaved("");
  }
  function edit(i: number, patch: Partial<DraftLine>) {
    setSaved("");
    setDraft(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    if (lines.length >= MAX_RECIPE_LINES) {
      setError(`أقصى عدد سطور في الوصفة ${MAX_RECIPE_LINES}`);
      return;
    }
    setSaved("");
    setDraft([...lines, { type: "S", ing: ops.data.ingredients[0].key, grams: "" }]);
  }
  function removeLine(i: number) {
    setSaved("");
    setDraft(lines.filter((_, idx) => idx !== i));
  }
  function save() {
    const r = actions.saveRecipe(sku.item.id, lines.map((l) => ({ type: l.type, ing: l.ing, grams: Number(l.grams) })));
    if (r.ok) {
      setDraft(null);
      setError("");
      setSaved(
        readyGatesAffected.length
          ? `تم الحفظ. رجعت هذي البوابات للاعتماد: ${readyGatesAffected.join("، ")}`
          : "تم حفظ الوصفة",
      );
    } else setError(r.error);
  }

  return (
    <OpsShell title="الوصفات" subtitle="وزن نيء صافٍ بالجرام للحصة الأساسية (Balanced) — القيم الغذائية تُحسب تلقائياً">
      <AccessNote
        canEdit={canEdit}
        editText="تقدر تعدّل الجرامات وتضيف أو تحذف مكوّن. بعد الحفظ، أي بوابة معتمدة لهذا الصنف (الوصفة، الحساسية، التغذية، الملصق، السعر) ترجع «بانتظار الاعتماد» عشان الجودة تراجع التغيير."
        viewText="عرض فقط — تعديل الوصفات من صلاحية المطبخ."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* قائمة الأصناف */}
        <Card className="lg:col-span-1 lg:max-h-[720px] lg:overflow-y-auto">
          <div className="lg:hidden">
            <select
              value={sku.item.id}
              onChange={(e) => pick(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm font-bold"
              style={{ borderColor: T.border, background: "#FFFDF5" }}
            >
              {ops.computed.map((c) => (
                <option key={c.item.id} value={c.item.id}>{c.item.id} · {c.item.name}</option>
              ))}
            </select>
          </div>
          <div className="hidden lg:block space-y-3">
            {SECTIONS.map((sec) => (
              <div key={sec}>
                <div className="text-[11px] font-bold mb-1.5" style={{ color: T.brand }}>{sec}</div>
                <div className="space-y-1">
                  {ops.computed.filter((c) => c.item.section === sec).map((c) => {
                    const active = c.item.id === sku.item.id;
                    return (
                      <button
                        key={c.item.id}
                        onClick={() => pick(c.item.id)}
                        className="w-full text-right rounded-lg px-2.5 py-1.5 text-xs"
                        style={active ? { background: T.brand, color: "#fff", fontWeight: 700 } : { background: "transparent", color: T.ink }}
                      >
                        <span className="opacity-70">{c.item.id}</span> · {c.item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* الوصفة */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardTitle icon={<BookOpen size={17} />} aside={<StatusBadge status={view.quality.status} small />}>
              {sku.item.id} · {sku.item.name}
            </CardTitle>
            <TableWrap>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>النوع</Th>
                  <Th>المكوّن</Th>
                  <Th>جرام</Th>
                  <Th>سعرات</Th>
                  <Th>بروتين</Th>
                  <Th>كارب</Th>
                  <Th>دهون</Th>
                  {showFinance && <Th>التكلفة</Th>}
                  {canEdit && <Th />}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const ing = ingMap.get(l.ing);
                  const g = Number(l.grams) || 0;
                  return (
                    <tr key={i} className="border-t" style={{ borderColor: T.border }}>
                      <Td>{i + 1}</Td>
                      <Td>
                        {canEdit ? (
                          <select
                            aria-label="نوع المكوّن"
                            value={l.type}
                            onChange={(e) => edit(i, { type: e.target.value as IngType })}
                            className="rounded-lg border px-1.5 py-1 text-[11px]"
                            style={{ borderColor: T.border, background: "#FFFDF5" }}
                          >
                            {TYPES.map((t) => <option key={t} value={t}>{ING_TYPE_LABEL[t]}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: T.inkSoft }}>{ING_TYPE_LABEL[l.type]}</span>
                        )}
                      </Td>
                      <Td strong>
                        {canEdit ? (
                          <select
                            aria-label="المكوّن"
                            value={l.ing}
                            onChange={(e) => edit(i, { ing: e.target.value })}
                            className="rounded-lg border px-1.5 py-1 text-xs font-bold max-w-[200px]"
                            style={{ borderColor: T.border, background: "#FFFDF5" }}
                          >
                            {ops.data.ingredients.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}
                          </select>
                        ) : (
                          ing?.name ?? l.ing
                        )}
                      </Td>
                      <Td>
                        {canEdit ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            aria-label="جرام"
                            min={0}
                            value={l.grams}
                            onChange={(e) => edit(i, { grams: e.target.value })}
                            className="rounded-lg border px-2 py-1 text-sm text-center font-bold"
                            style={{ borderColor: T.border, width: 76, background: "#FFFDF5" }}
                          />
                        ) : (
                          <span className="font-bold">{num(g, 0)}</span>
                        )}
                      </Td>
                      <Td>{ing ? num((g / 100) * ing.kcal, 0) : "—"}</Td>
                      <Td>{ing ? num((g / 100) * ing.protein, 1) : "—"}</Td>
                      <Td>{ing ? num((g / 100) * ing.carb, 1) : "—"}</Td>
                      <Td>{ing ? num((g / 100) * ing.fat, 1) : "—"}</Td>
                      {showFinance && <Td>{ing ? sar((g / 1000) * ing.price) : "—"}</Td>}
                      {canEdit && (
                        <Td>
                          <button onClick={() => removeLine(i)} aria-label="حذف السطر" style={{ color: T.warn }}>
                            <Trash2 size={14} />
                          </button>
                        </Td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: T.brand }}>
                  <Td />
                  <Td />
                  <Td strong>الإجمالي</Td>
                  <Td strong>{num(totals.grams, 0)}</Td>
                  <Td strong>{num(totals.kcal, 0)}</Td>
                  <Td strong>{num(totals.protein, 1)}</Td>
                  <Td strong>{num(totals.carb, 1)}</Td>
                  <Td strong>{num(totals.fat, 1)}</Td>
                  {showFinance && <Td strong>{sar(totals.cost)}</Td>}
                  {canEdit && <Td />}
                </tr>
              </tfoot>
            </TableWrap>

            <div className="flex items-center gap-2 mt-4 text-[11px]" style={{ color: kcalOk ? T.good : T.warn }}>
              {kcalOk ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              فرق السعرات عن حساب الماكروز: {pct(kcalDiff)} (الحد المقبول {pct(ops.data.settings.kcalDiffMax, 0)})
            </div>

            {canEdit && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <button
                  onClick={addLine}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
                  style={{ background: T.brandTint, color: T.brand }}
                >
                  <Plus size={13} /> إضافة مكوّن ({lines.length}/{MAX_RECIPE_LINES})
                </button>
                <button
                  onClick={save}
                  disabled={!dirty}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: T.brandBright }}
                >
                  <Save size={13} /> حفظ الوصفة
                </button>
                {dirty && (
                  <button
                    onClick={() => { setDraft(null); setError(""); }}
                    className="flex items-center gap-1 text-xs font-bold"
                    style={{ color: T.inkSoft }}
                  >
                    <Undo2 size={13} /> تراجع
                  </button>
                )}
              </div>
            )}
            {canEdit && dirty && readyGatesAffected.length > 0 && (
              <div className="text-[11px] mt-3 font-bold" style={{ color: "#B7791F" }}>
                تنبيه: الحفظ يرجّع هذي البوابات المعتمدة للمراجعة: {readyGatesAffected.join("، ")} — والصنف يطلع من «جاهز للبيع» لحد ما تعتمده الجودة من جديد.
              </div>
            )}
            <ErrorNote text={error} />
            {saved && <div className="text-xs font-bold mt-3" style={{ color: T.good }}>{saved}</div>}
          </Card>

          <Card>
            <CardTitle>ملخص الصنف (المحفوظ)</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Mini label="وزن نيء" value={`${num(sku.rawWeight, 0)} جم`} />
              <Mini label="سعرات" value={num(sku.kcal, 0)} />
              <Mini label="بروتين" value={`${num(sku.protein, 0)} جم`} />
              <Mini label="الحساسية" value={sku.allergens} />
              {sku.isMain && <Mini label="Lean" value={`${num(sku.kcalLean, 0)} سعرة · ${num(sku.proteinLean, 0)} جم`} />}
              {sku.isMain && <Mini label="Performance" value={`${num(sku.kcalPerf, 0)} سعرة · ${num(sku.proteinPerf, 0)} جم`} />}
              <Mini label="قليل الكارب" value={sku.lowCarb ? "نعم" : "لا"} />
              <Mini label="بروتين عالٍ" value={sku.highProtein ? "نعم" : "لا"} />
              {showFinance && <Mini label="تكلفة المكوّنات" value={sar(sku.ingCost)} />}
              {showFinance && <Mini label="السعر المقترح" value={sar(sku.price, 0)} />}
              {showFinance && <Mini label="التكلفة التشغيلية الكاملة" value={sar(sku.fullCost)} />}
              {showFinance && <Mini label="هامش المساهمة" value={pct(sku.contributionPct)} />}
            </div>
          </Card>
        </div>
      </div>
    </OpsShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
      <div className="text-[10px] mb-1" style={{ color: T.inkSoft }}>{label}</div>
      <div className="text-xs font-bold leading-relaxed">{value}</div>
    </div>
  );
}
