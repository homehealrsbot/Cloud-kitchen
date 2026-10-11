// جسم شاشة الصنف — شاشة «MEAL» في دليل الهوية.
//
// منفصل عن الصفحة عشان الصفحة تبقى قراءة بيانات فقط، والعرض يكون قابلاً
// للمعاينة والاختبار بمعزل عن قاعدة البيانات.

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ChevronRight, Flame, Snowflake } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { BRAND } from "@/lib/brand";
import { MacroChip } from "@/components/brand/Macro";
import type { CustomerMeal } from "@/components/order/MenuList";

export interface CustomerMealDetail extends CustomerMeal {
  grams: number;
  reheat: string;
  ingredientNames: string[];
  shelfLifeH: number;
}

export default function MealDetail({ meal }: { meal: CustomerMealDetail }) {
  return (
    <>
      <div className="relative h-60" style={{ background: BRAND.forest }}>
        <Image src={meal.photo} alt="" fill priority sizes="100vw" className="object-cover" />
        <Link
          href="/order-app"
          aria-label="رجوع"
          className="absolute top-4 right-4 rounded-full w-9 h-9 flex items-center justify-center"
          style={{ background: "#FFFFFFE6", color: BRAND.forest }}
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      <div className="-mt-5 relative rounded-t-[28px] pt-6" style={{ background: T.bg }}>
      <main className="max-w-md mx-auto px-5">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold leading-tight">{meal.name}</h1>
            {meal.nameEn && (
              <div className="text-[11px] mt-0.5" dir="ltr" style={{ color: T.inkSoft }}>{meal.nameEn}</div>
            )}
          </div>
          <div className="text-left shrink-0">
            <div className="num text-2xl font-extrabold leading-none" style={{ color: BRAND.forest }}>{meal.kcal}</div>
            <div className="text-[10px] mt-1" style={{ color: T.inkSoft }}>سعرة</div>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          <MacroChip macro="protein" value={meal.protein} />
          <MacroChip macro="carbs" value={meal.carb} />
          <MacroChip macro="fat" value={meal.fat} />
        </div>

        <Section title="المكوّنات">
          <div className="flex flex-wrap gap-1.5">
            {meal.ingredientNames.map((n, i) => (
              <span
                key={`${n}-${i}`}
                className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
                style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
              >
                {n}
              </span>
            ))}
          </div>
          <p className="text-[11px] mt-2.5" style={{ color: meal.allergens === "لا يوجد" ? T.inkSoft : T.warn }}>
            {meal.allergens === "لا يوجد"
              ? "ما يحتوي على أي من المواد المسبّبة للحساسية المعلنة."
              : `يحتوي على: ${meal.allergens}`}
          </p>
        </Section>

        <Section title="الحفظ والتسخين">
          <div className="grid grid-cols-2 gap-2">
            <Fact icon={<Snowflake size={15} />} text={`يحفظ مبرّد ${meal.shelfLifeH} ساعة`} />
            <Fact icon={<Flame size={15} />} text={meal.reheat || "طريقة التسخين ما انكتبت بعد"} />
          </div>
        </Section>

        <div
          className="rounded-2xl px-4 py-3 mb-4 text-[11px] leading-relaxed"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.inkSoft }}
        >
          وزن المكوّنات قبل الطبخ <span className="num font-bold">{meal.grams}</span> غ ·
          السعر <span className="num font-bold" style={{ color: T.brand }}>{meal.price} ﷼</span> ·
          القسم {meal.section}
        </div>

        <Link
          href="/order-app"
          className="block text-center rounded-2xl py-3.5 text-sm font-extrabold"
          style={{ background: BRAND.forest, color: "#FFFFFF" }}
        >
          رجوع للقائمة واختيار الصنف
        </Link>
        <p className="text-[11px] text-center mt-2.5 mb-2" style={{ color: T.inkSoft }}>
          تثبيت الطلب يحتاج نظام الطلبات — المرحلة القادمة.
        </p>
      </main>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="text-sm font-extrabold mb-2.5">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11.5px] font-semibold"
      style={{ background: T.surface, border: `1px solid ${T.border}` }}
    >
      <span style={{ color: BRAND.limeText }}>{icon}</span>
      <span className="min-w-0">{text}</span>
    </div>
  );
}
