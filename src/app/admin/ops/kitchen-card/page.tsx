"use client";

import { useMemo, useState } from "react";
import { Flame, Clock, AlertTriangle, Snowflake, Microwave, ListOrdered } from "lucide-react";
import { ING_TYPE_LABEL, LEVELS, Level, SECTIONS, computeKitchenCard } from "@/lib/ops/engine";
import { useOps } from "@/lib/ops/store";
import { Card, CardTitle, Loading, NumInput, OpsShell, Pill, PrintButton, StatusBadge, T, TableWrap, Td, Th, num } from "@/components/ops/ui";

function initialParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export default function KitchenCardPage() {
  const ops = useOps();
  // يقبل ?sku=C01&batch=40 من صفحة الإنتاج. الصفحة تُعرض في المتصفح فقط (بعد بوابة الأدوار)، فقراءة الرابط هنا آمنة.
  const [skuId, setSkuId] = useState(() => initialParam("sku") ?? "C01");
  const [level, setLevel] = useState<Level>("balanced");
  const [batch, setBatch] = useState(() => {
    const b = Number(initialParam("batch"));
    return b > 0 ? Math.floor(b) : 50;
  });

  const view = ops.skuMap.get(skuId) ?? ops.skus[0];
  const effectiveLevel: Level = view?.sku.isMain ? level : "balanced";
  const card = useMemo(
    () => (view ? computeKitchenCard(ops.data, view.sku, effectiveLevel, batch) : null),
    [ops.data, view, effectiveLevel, batch],
  );

  if (!ops.ready || !view || !card) {
    return (
      <OpsShell title="بطاقة المطبخ">
        <Loading />
      </OpsShell>
    );
  }

  const { sku } = view;
  const allergenList = sku.allergens === "لا يوجد" ? [] : sku.allergens.split("، ");

  return (
    <OpsShell
      title="بطاقة المطبخ"
      subtitle="اختر الصنف والمستوى وعدد حصص الدفعة — تظهر الأوزان وطريقة التحضير والحساسية والصلاحية"
      actions={<PrintButton label="طباعة البطاقة" />}
    >
      {/* الاختيارات */}
      <Card className="mb-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold block mb-1.5" style={{ color: T.inkSoft }}>الصنف</label>
            <select
              value={view.sku.item.id}
              onChange={(e) => setSkuId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm font-bold"
              style={{ borderColor: T.border, background: "#FFFDF5" }}
            >
              {SECTIONS.map((sec) => (
                <optgroup key={sec} label={sec}>
                  {ops.computed.filter((c) => c.item.section === sec).map((c) => (
                    <option key={c.item.id} value={c.item.id}>{c.item.id} · {c.item.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1.5" style={{ color: T.inkSoft }}>المستوى</label>
            <div className="flex items-center gap-2">
              {LEVELS.map((l) => (
                <Pill key={l.key} active={effectiveLevel === l.key} onClick={() => sku.isMain && setLevel(l.key)}>
                  {l.label}
                </Pill>
              ))}
            </div>
            {!sku.isMain && (
              <div className="text-[10px] mt-1.5" style={{ color: T.inkSoft }}>المستويات تنطبق على الأطباق الرئيسية فقط</div>
            )}
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1.5" style={{ color: T.inkSoft }}>حصص الدفعة</label>
            <NumInput ariaLabel="حصص الدفعة" value={batch} min={1} width={110} onCommit={(v) => setBatch(v && v > 0 ? Math.floor(v) : 1)} />
          </div>
        </div>
      </Card>

      {/* رأس البطاقة */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="text-xl font-extrabold" style={{ color: T.brand }}>{sku.item.name}</div>
            <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
              {sku.item.id} · {sku.item.nameEn} · {sku.item.section} · مطبخ {sku.item.cuisine}
            </div>
          </div>
          <StatusBadge status={view.quality.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Info label="المستوى" value={LEVELS.find((l) => l.key === effectiveLevel)?.label ?? ""} />
          <Info label="حصص الدفعة" value={num(card.batch)} />
          <Info label="وزن نيء / حصة" value={`${num(card.rawPerPortion, 0)} جم`} />
          <Info label="إجمالي الدفعة" value={`${num(card.batchKg, 2)} كجم`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl px-4 py-3" style={{ background: allergenList.length ? T.warnTint : T.goodTint }}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold mb-1.5" style={{ color: allergenList.length ? T.warn : T.good }}>
              <AlertTriangle size={13} /> مسببات الحساسية
            </div>
            {allergenList.length === 0 ? (
              <div className="text-sm font-bold" style={{ color: T.good }}>لا يوجد</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allergenList.map((a) => (
                  <span key={a} className="text-xs font-bold rounded-full px-2.5 py-1 text-white" style={{ background: T.warn }}>{a}</span>
                ))}
              </div>
            )}
            {sku.hiddenAllergens.length > 0 && (
              <div className="text-[11px] mt-2 leading-relaxed" style={{ color: T.inkSoft }}>
                مواد خفية محتملة (تحتاج إقرار المورد): {sku.hiddenAllergens.join(" · ")}
              </div>
            )}
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: T.bg }}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold mb-1.5" style={{ color: T.inkSoft }}>
              <Clock size={13} /> الصلاحية
            </div>
            <div className="text-sm font-bold">{sku.item.shelfLifeH} ساعة عند ≤5°م</div>
            {view.quality.alert && (
              <div className="text-[11px] mt-1 font-bold" style={{ color: T.warn }}>{view.quality.alert}</div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* الأوزان */}
        <Card className="lg:col-span-2">
          <CardTitle icon={<ListOrdered size={17} />}>مكوّنات الدفعة</CardTitle>
          <TableWrap>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>المكوّن</Th>
                <Th>النوع</Th>
                <Th>جم / حصة</Th>
                <Th>كجم للدفعة</Th>
              </tr>
            </thead>
            <tbody>
              {card.lines.map((l, i) => (
                <tr key={i} className="border-t" style={{ borderColor: T.border }}>
                  <Td>{i + 1}</Td>
                  <Td strong>{l.name}</Td>
                  <Td><span style={{ color: T.inkSoft }}>{ING_TYPE_LABEL[l.type]}</span></Td>
                  <Td>{num(l.gramsPerPortion, 1)}</Td>
                  <Td strong><span className="text-sm" style={{ color: T.brand }}>{num(l.batchKg, 3)}</span></Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2" style={{ borderColor: T.brand }}>
                <Td />
                <Td strong>الإجمالي</Td>
                <Td />
                <Td strong>{num(card.rawPerPortion, 1)}</Td>
                <Td strong>{num(card.batchKg, 3)}</Td>
              </tr>
            </tfoot>
          </TableWrap>
        </Card>

        {/* القيم الغذائية */}
        <Card>
          <CardTitle icon={<Flame size={17} />}>القيم الغذائية للحصة</CardTitle>
          <div className="space-y-2">
            {card.nutrition.map((n) => {
              const active = n.level === effectiveLevel;
              return (
                <div
                  key={n.level}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: active ? T.brandTint : T.bg, border: `1px solid ${active ? T.brandBright : "transparent"}` }}
                >
                  <span className="text-xs font-bold">{LEVELS.find((l) => l.key === n.level)?.label}</span>
                  <span className="text-xs">
                    {n.kcal === null ? "—" : (
                      <>
                        <span className="font-bold">{num(n.kcal, 0)}</span> سعرة · <span className="font-bold">{num(n.protein, 0)}</span> جم بروتين
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Info label="كارب (Balanced)" value={`${num(sku.carb, 0)} جم`} />
            <Info label="دهون (Balanced)" value={`${num(sku.fat, 0)} جم`} />
            <Info label="ألياف" value={`${num(sku.fiber, 0)} جم`} />
          </div>
          <div className="text-[10px] mt-3 leading-relaxed" style={{ color: T.inkSoft }}>
            القيم حسابية/تقديرية لحد ما تُعتمد بوابة التغذية — ما تُستخدم على الملصق قبل الاعتماد.
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardTitle icon={<Flame size={17} />}>طريقة التحضير</CardTitle>
          <p className="text-sm leading-loose">{sku.item.method || "—"}</p>
        </Card>
        <Card>
          <CardTitle icon={<Microwave size={17} />}>إعادة التسخين</CardTitle>
          <p className="text-sm leading-loose">{sku.item.reheat || "—"}</p>
        </Card>
        <Card>
          <CardTitle icon={<Snowflake size={17} />}>ملاحظة تشغيلية</CardTitle>
          <p className="text-sm leading-loose">{sku.item.opsNote || "لا توجد ملاحظات خاصة لهذا الصنف."}</p>
        </Card>
      </div>
    </OpsShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
      <div className="text-[10px] mb-1" style={{ color: T.inkSoft }}>{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
