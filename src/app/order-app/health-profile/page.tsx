"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, HeartPulse, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

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

// قائمة الوجبات مع بيانات الحساسية والسعرات لغرض المطابقة
const MEALS = [
  { name: "صدر دجاج مشوي + أرز بني", kcal: 420, carb: "متوسط", allergens: [] as string[] },
  { name: "سلمون مشوي + كينوا", kcal: 460, carb: "متوسط", allergens: [] as string[] },
  { name: "شوفان بروتين + فواكه", kcal: 380, carb: "مرتفع", allergens: ["مكسرات"] },
  { name: "سلطة دجاج + حمص وطحينة", kcal: 400, carb: "منخفض", allergens: ["سمسم"] },
];

const CONDITIONS = ["سكري", "ضغط مرتفع", "كوليسترول مرتفع"];
const ALLERGIES = ["مكسرات", "سمسم", "غلوتين", "ألبان"];

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "نقص وزن", goal: "زيادة عضل" };
  if (bmi < 25) return { label: "وزن طبيعي", goal: "ثبات الوزن" };
  if (bmi < 30) return { label: "زيادة وزن", goal: "تنزيل وزن" };
  return { label: "سمنة", goal: "تنزيل وزن" };
}

export default function HealthProfilePage() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [result, setResult] = useState<null | {
    bmi: number;
    category: string;
    goal: string;
    calorieTarget: number;
    recommended: typeof MEALS;
    excluded: { meal: (typeof MEALS)[number]; reason: string }[];
  }>(null);

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  function analyze() {
    const w = Number(weight);
    const h = Number(height) / 100;
    if (!w || !h) return;

    const bmi = Math.round((w / (h * h)) * 10) / 10;
    const cat = bmiCategory(bmi);

    // تقدير مبسط للسعرات المستهدفة (تقريبي، لأغراض التوصية فقط)
    let calorieTarget = Math.round(w * 24); // معدل أيضي تقريبي
    if (cat.goal === "تنزيل وزن") calorieTarget = Math.round(calorieTarget * 0.85);
    if (cat.goal === "زيادة عضل") calorieTarget = Math.round(calorieTarget * 1.15);

    const recommended: typeof MEALS = [];
    const excluded: { meal: (typeof MEALS)[number]; reason: string }[] = [];

    MEALS.forEach((meal) => {
      const hasAllergen = meal.allergens.some((a) => allergies.includes(a));
      if (hasAllergen) {
        excluded.push({ meal, reason: `يحتوي ${meal.allergens.find((a) => allergies.includes(a))} — ضمن حساسياتك` });
        return;
      }
      if (conditions.includes("سكري") && meal.carb === "مرتفع") {
        excluded.push({ meal, reason: "نسبة كاربوهيدرات مرتفعة — غير مناسب لمرضى السكري" });
        return;
      }
      recommended.push(meal);
    });

    setResult({ bmi, category: cat.label, goal: cat.goal, calorieTarget, recommended, excluded });
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse size={18} style={{ color: T.brand }} />
            <span className="font-bold text-sm" style={{ color: T.brand }}>ملفك الصحي</span>
          </div>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <p className="text-xs mb-5 leading-relaxed" style={{ color: T.inkSoft }}>
          عبّي بياناتك عشان نقترح لك وجبات تناسب هدفك — هذي أداة مطابقة تفضيلات غذائية عامة، مو تشخيص طبي.
          لأي حالة صحية مزمنة، استشر أخصائي تغذية أو طبيبك أولاً.
        </p>

        <div className="rounded-2xl p-4 mb-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input
              placeholder="الوزن (كجم)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              placeholder="الطول (سم)"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
          </div>

          <div className="text-xs font-bold mb-2" style={{ color: T.inkSoft }}>حالات صحية (اختياري)</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => toggle(conditions, setConditions, c)}
                className="text-xs rounded-full px-3 py-1.5 font-semibold border transition-colors"
                style={{
                  background: conditions.includes(c) ? T.brandBright : T.surface,
                  color: conditions.includes(c) ? "#fff" : T.inkSoft,
                  borderColor: conditions.includes(c) ? T.brandBright : T.border,
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="text-xs font-bold mb-2" style={{ color: T.inkSoft }}>حساسية غذائية (اختياري)</div>
          <div className="flex flex-wrap gap-2 mb-1">
            {ALLERGIES.map((a) => (
              <button
                key={a}
                onClick={() => toggle(allergies, setAllergies, a)}
                className="text-xs rounded-full px-3 py-1.5 font-semibold border transition-colors"
                style={{
                  background: allergies.includes(a) ? T.warn : T.surface,
                  color: allergies.includes(a) ? "#fff" : T.inkSoft,
                  borderColor: allergies.includes(a) ? T.warn : T.border,
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={analyze}
          className="w-full rounded-xl py-3 text-sm font-extrabold text-white mb-6"
          style={{ background: T.brandBright }}
        >
          اقترح وجباتي
        </button>

        {result && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="rounded-xl p-3 text-center" style={{ background: T.brandTint }}>
                <div className="text-xs" style={{ color: T.inkSoft }}>مؤشر الكتلة</div>
                <div className="text-sm font-extrabold" style={{ color: T.brand }}>{result.bmi}</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: T.brandTint }}>
                <div className="text-xs" style={{ color: T.inkSoft }}>التصنيف</div>
                <div className="text-sm font-extrabold" style={{ color: T.brand }}>{result.category}</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: T.brandTint }}>
                <div className="text-xs" style={{ color: T.inkSoft }}>سعرات يومية</div>
                <div className="text-sm font-extrabold" style={{ color: T.brand }}>{result.calorieTarget}</div>
              </div>
            </div>

            <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: T.good }}>
              <CheckCircle2 size={14} /> وجبات موصى بها لك ({result.recommended.length})
            </div>
            <div className="space-y-2 mb-5">
              {result.recommended.map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: T.goodTint }}>
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="text-xs" style={{ color: T.inkSoft }}>{m.kcal} سعرة</span>
                </div>
              ))}
              {result.recommended.length === 0 && (
                <div className="text-xs" style={{ color: T.inkSoft }}>ما فيه وجبات مطابقة حالياً — راجع فريق المطعم لخيارات خاصة.</div>
              )}
            </div>

            {result.excluded.length > 0 && (
              <>
                <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: T.warn }}>
                  <XCircle size={14} /> وجبات مستبعدة ({result.excluded.length})
                </div>
                <div className="space-y-2">
                  {result.excluded.map(({ meal, reason }) => (
                    <div key={meal.name} className="rounded-xl px-3 py-2.5" style={{ background: T.warnTint }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{meal.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] mt-1" style={{ color: "#9A4B1C" }}>
                        <AlertTriangle size={12} /> {reason}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
