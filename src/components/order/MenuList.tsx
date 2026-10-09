"use client";

// الشاشة الرئيسية في تطبيق العميل — مبنية على شاشة «HOME» في دليل الهوية:
// رأس غابي فيه التحية وبطاقة الماكروز، ثم بطاقات الوجبات على أرضية كريمية.
//
// ملاحظة على بطاقة الماكروز: الدليل يرسمها كـ«هدف اليوم» مع رقم هدف (1,850).
// ما فيه مصدر لهذا الرقم في النظام — الهدف اليومي مُدخل من قسم التغذية وما
// انضبط بعد. فالحلقة تعرض مجموع اختيار العميل فعلياً، والأشرطة تعرض نسبة
// طاقة كل ماكرو — أرقام محسوبة من الوصفات، مو تقديرات. أول ما يُدخل القسم
// أهدافاً يومية لكل هدف صحي، تتحوّل نفس البطاقة لتقدّم مقابل الهدف.

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { BRAND, MACRO, type MacroKey } from "@/lib/brand";
import { MacroBar, MacroChip, energySplit } from "@/components/brand/Macro";
import { AppHeader } from "@/components/order/AppShell";

export interface CustomerMeal {
  id: string;
  name: string;
  nameEn: string;
  section: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  price: number;
  allergens: string;
  photo: string;
}

export default function MenuList({
  meals,
  greetingName,
  kicker,
  signedIn,
}: {
  meals: CustomerMeal[];
  greetingName: string;
  kicker?: string;
  signedIn: boolean;
}) {
  const [cart, setCart] = useState<Record<string, boolean>>({});
  const chosen = useMemo(() => meals.filter((m) => cart[m.id]), [meals, cart]);

  const totals = chosen.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carb: a.carb + m.carb,
      fat: a.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
  const split = energySplit(totals.protein, totals.carb, totals.fat);
  const totalPrice = chosen.reduce((a, m) => a + m.price, 0);

  return (
    <>
      <AppHeader kicker={kicker ?? (signedIn ? "أهلاً" : "أكل حقيقي.. ماكروز محسوبة.")} heading={greetingName}>
        <div className="rounded-2xl p-4" style={{ background: BRAND.forestLight }}>
          <div className="text-xs font-bold mb-3" style={{ color: BRAND.sage }}>ماكروز اختيارك</div>
          <div className="flex items-center gap-4">
            <Ring kcal={Math.round(totals.kcal)} split={split} />
            <div className="flex-1 space-y-2.5">
              <MacroBar macro="protein" pct={split.protein} />
              <MacroBar macro="carbs" pct={split.carbs} />
              <MacroBar macro="fat" pct={split.fat} />
            </div>
          </div>
          <p className="text-[10.5px] leading-relaxed mt-3.5" style={{ color: BRAND.sage }}>
            {chosen.length === 0
              ? "اختر وجباتك وتتحدّث الأرقام فوراً — محسوبة من الوصفة الفعلية لكل صنف."
              : `${chosen.length} وجبة · ${Math.round(totalPrice)} ﷼ · النسب من طاقة الاختيار.`}
            {" "}الهدف اليومي بالسعرات يجي من قسم التغذية، وما انضبط بعد.
          </p>
        </div>
      </AppHeader>

      <main className="max-w-md mx-auto px-5 pt-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-extrabold">وجبات اليوم</h2>
          <span className="text-[11px]" style={{ color: T.inkSoft }}>
            <span className="num">{meals.length}</span> {meals.length === 1 ? "صنف معتمد" : meals.length === 2 ? "صنفان معتمدان" : meals.length <= 10 ? "أصناف معتمدة" : "صنفاً معتمداً"}
          </span>
        </div>

        <div className="space-y-3">
          {meals.map((m) => {
            const picked = !!cart[m.id];
            return (
              <div
                key={m.id}
                className="rounded-2xl p-3"
                style={{
                  background: T.surface,
                  border: `1.5px solid ${picked ? BRAND.lime : T.border}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <Link href={`/order-app/meal/${encodeURIComponent(m.id)}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: BRAND.forest }}>
                      <Image src={m.photo} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-extrabold truncate">{m.name}</span>
                      <span className="block text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
                        {m.section} · <span className="num">{Math.round(m.kcal)}</span> سعرة ·{" "}
                        <span className="num font-bold" style={{ color: T.brand }}>{m.price} ﷼</span>
                      </span>
                    </span>
                  </Link>
                  <button
                    onClick={() => setCart((c) => ({ ...c, [m.id]: !c[m.id] }))}
                    aria-label={picked ? `إزالة ${m.name}` : `إضافة ${m.name}`}
                    aria-pressed={picked}
                    className="rounded-full w-9 h-9 flex items-center justify-center shrink-0"
                    style={{ background: picked ? T.good : BRAND.lime, color: picked ? "#FFFFFF" : T.onBright }}
                  >
                    {picked ? <Check size={17} /> : <Plus size={17} />}
                  </button>
                </div>

                <div className="flex gap-1.5 mt-3">
                  <MacroChip macro="protein" value={Math.round(m.protein)} size="sm" />
                  <MacroChip macro="carbs" value={Math.round(m.carb)} size="sm" />
                  <MacroChip macro="fat" value={Math.round(m.fat)} size="sm" />
                </div>

                {m.allergens !== "لا يوجد" && (
                  <div className="text-[11px] mt-2.5" style={{ color: T.warn }}>يحتوي: {m.allergens}</div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

/**
 * حلقة السعرات — نفس حلقة شاشة الهوية، مرسومة SVG بدون أي مكتبة.
 *
 * الحلقة تقسم طاقة الاختيار على الماكروز الثلاثة بألوان الهوية. اخترناها
 * قسمة بدل «نسبة من هدف» لأن الهدف اليومي ما له مصدر في النظام، وما نرسم
 * مقاماً مخترعاً. القسمة رقم كامل بذاته ولا يحتاج هدفاً.
 */
function Ring({ kcal, split }: { kcal: number; split: { protein: number; carbs: number; fat: number } }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const arcs: { key: MacroKey; pct: number }[] = [
    { key: "protein", pct: split.protein },
    { key: "carbs", pct: split.carbs },
    { key: "fat", pct: split.fat },
  ];
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: 86, height: 86 }}>
      <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden>
        <circle cx="43" cy="43" r={r} fill="none" stroke="#FFFFFF1F" strokeWidth="8" />
        {arcs.map((a) => {
          const len = (c * a.pct) / 100;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={a.key}
              cx="43" cy="43" r={r} fill="none"
              stroke={MACRO[a.key].bg} strokeWidth="8"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 43 43)"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-lg font-extrabold leading-none" style={{ color: "#FFFFFF" }}>
          {kcal.toLocaleString("en-US")}
        </span>
        <span className="text-[9px] mt-1" style={{ color: BRAND.sage }}>سعرة</span>
      </div>
    </div>
  );
}
