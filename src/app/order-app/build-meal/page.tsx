"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Flame, Beef, Check, AlertTriangle, Utensils } from "lucide-react";

const T = {
  bg: "#FCF6F2",
  surface: "#FFFFFF",
  border: "#F0DFD3",
  ink: "#2B1B14",
  inkSoft: "#7A6153",
  brand: "#A84F2E",
  brandBright: "#D67A4F",
  brandTint: "#FBEEE6",
  warn: "#C0392B",
  warnTint: "#FBEBE0",
  good: "#2E9E6D",
  goodTint: "#E5F4ED",
};

type Ingredient = { id: string; name: string; category: string; kcal: number; protein: number; allergens: string[] };

const INGREDIENTS: Ingredient[] = [
  { id: "chicken", name: "صدر دجاج مشوي", category: "بروتين", kcal: 165, protein: 31, allergens: [] },
  { id: "salmon", name: "سلمون مشوي", category: "بروتين", kcal: 208, protein: 22, allergens: ["مأكولات بحرية"] },
  { id: "egg", name: "بيض مسلوق", category: "بروتين", kcal: 78, protein: 6, allergens: ["بيض"] },
  { id: "rice", name: "أرز بني", category: "كربوهيدرات", kcal: 112, protein: 3, allergens: [] },
  { id: "quinoa", name: "كينوا", category: "كربوهيدرات", kcal: 120, protein: 4, allergens: [] },
  { id: "bread", name: "خبز حبوب كاملة", category: "كربوهيدرات", kcal: 90, protein: 4, allergens: ["غلوتين"] },
  { id: "broccoli", name: "بروكلي", category: "خضار", kcal: 34, protein: 3, allergens: [] },
  { id: "tomato", name: "طماطم", category: "خضار", kcal: 18, protein: 1, allergens: ["طماطم"] },
  { id: "onion", name: "بصل", category: "خضار", kcal: 40, protein: 1, allergens: ["بصل"] },
  { id: "eggplant", name: "باذنجان مشوي", category: "خضار", kcal: 35, protein: 1, allergens: ["باذنجان"] },
  { id: "hummus", name: "حمص وطحينة", category: "إضافات", kcal: 95, protein: 5, allergens: ["سمسم"] },
  { id: "almonds", name: "لوز مجروش", category: "إضافات", kcal: 82, protein: 3, allergens: ["مكسرات"] },
];

const CATEGORIES = ["بروتين", "كربوهيدرات", "خضار", "إضافات"];

export default function BuildMealPage() {
  const [allergies, setAllergies] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem("foodstyle_customer_allergies") || "[]");
      if (Array.isArray(saved)) setAllergies(saved);
    } catch {
      /* تجاهل */
    }
  }, []);

  function toggle(id: string, blocked: boolean) {
    if (blocked) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const chosen = INGREDIENTS.filter((i) => selected.includes(i.id));
  const totalKcal = chosen.reduce((a, i) => a + i.kcal, 0);
  const totalProtein = chosen.reduce((a, i) => a + i.protein, 0);

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils size={18} style={{ color: T.brand }} />
            <span className="font-bold text-sm" style={{ color: T.brand }}>ابنِ وجبتك</span>
          </div>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 pb-32">
        {allergies.length > 0 ? (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-5" style={{ background: T.brandTint }}>
            <AlertTriangle size={15} style={{ color: T.brand }} className="mt-0.5 shrink-0" />
            <p className="text-[11.5px] leading-relaxed" style={{ color: T.brand }}>
              المكونات اللي تتعارض مع حساسياتك المسجّلة ({allergies.join("، ")}) معطّلة تلقائياً — ما تقدر تختارها.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-5" style={{ background: T.brandTint }}>
            <AlertTriangle size={15} style={{ color: T.brand }} className="mt-0.5 shrink-0" />
            <p className="text-[11.5px] leading-relaxed" style={{ color: T.brand }}>
              ما سجّلت حساسيات بعد —{" "}
              <Link href="/order-app/health-profile" className="underline font-bold">
                عبّي ملفك الصحي
              </Link>{" "}
              عشان نفلتر المكونات المناسبة لك تلقائياً.
            </p>
          </div>
        )}

        {CATEGORIES.map((cat) => (
          <div key={cat} className="mb-6">
            <div className="text-xs font-bold mb-2" style={{ color: T.inkSoft }}>{cat}</div>
            <div className="space-y-2">
              {INGREDIENTS.filter((i) => i.category === cat).map((ing) => {
                const blocked = ing.allergens.some((a) => allergies.includes(a));
                const isSelected = selected.includes(ing.id);
                return (
                  <button
                    key={ing.id}
                    onClick={() => toggle(ing.id, blocked)}
                    disabled={blocked}
                    className="w-full flex items-center justify-between rounded-2xl p-3.5 text-right transition-colors disabled:opacity-45"
                    style={{
                      background: isSelected ? T.brandTint : T.surface,
                      border: `1.5px solid ${isSelected ? T.brandBright : T.border}`,
                    }}
                  >
                    <div>
                      <div className="text-sm font-bold">{ing.name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: T.inkSoft }}>
                          <Flame size={11} /> {ing.kcal} سعرة
                        </span>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: T.inkSoft }}>
                          <Beef size={11} /> {ing.protein}غ
                        </span>
                        {blocked && (
                          <span className="text-[11px] font-bold" style={{ color: T.warn }}>
                            يحتوي {ing.allergens.find((a) => allergies.includes(a))}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="rounded-full flex items-center justify-center shrink-0"
                      style={{ width: 26, height: 26, background: isSelected ? T.brandBright : T.brandTint, color: isSelected ? "#fff" : T.brand }}
                    >
                      {isSelected && <Check size={14} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* شريط الملخص الثابت */}
      {chosen.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t" style={{ background: T.surface, borderColor: T.border }}>
          <div className="max-w-md mx-auto px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4 text-xs" style={{ color: T.inkSoft }}>
                <span className="flex items-center gap-1"><Flame size={13} style={{ color: T.brandBright }} /> {totalKcal} سعرة</span>
                <span className="flex items-center gap-1"><Beef size={13} style={{ color: T.brand }} /> {totalProtein}غ بروتين</span>
              </div>
              <span className="text-xs font-bold" style={{ color: T.brand }}>{chosen.length} مكونات مختارة</span>
            </div>
            <button className="w-full rounded-2xl py-3 text-sm font-bold text-white" style={{ background: T.brandBright }}>
              إضافة وجبتك المخصصة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
