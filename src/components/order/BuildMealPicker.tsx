"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Beef, Check, Flame, Search } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { BRAND } from "@/lib/brand";
import AppShell, { AppHeader } from "@/components/order/AppShell";
import type { IngType } from "@/lib/ops/engine";

export interface PickerIngredient {
  key: string;
  name: string;
  kcal: number;    // لكل 100 جرام
  protein: number; // لكل 100 جرام
  allergens: string[];
}

const PORTION_G = 100;

export default function BuildMealPicker({
  ingredients,
  allergies,
  typeLabels,
}: {
  ingredients: PickerIngredient[];
  allergies: string[];
  typeLabels: Record<IngType, string>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(needle));
  }, [ingredients, q]);

  const chosen = ingredients.filter((i) => selected.includes(i.key));
  const totalKcal = Math.round(chosen.reduce((a, i) => a + i.kcal, 0));
  const totalProtein = Math.round(chosen.reduce((a, i) => a + i.protein, 0));

  function blockedBy(ing: PickerIngredient): string | null {
    const hit = ing.allergens.find((a) => allergies.includes(a));
    return hit ?? null;
  }

  return (
    <AppShell>
      <AppHeader kicker="من قاعدة مكوّنات المطبخ" heading="ابنِ وجبتك" />

      <div className="max-w-md mx-auto px-5 py-6 pb-32">
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-4" style={{ background: T.brandTint }}>
          <AlertTriangle size={15} style={{ color: T.brand }} className="mt-0.5 shrink-0" />
          <p className="text-[11.5px] leading-relaxed" style={{ color: T.brand }}>
            {allergies.length > 0 ? (
              <>المكوّنات المتعارضة مع حساسياتك ({allergies.join("، ")}) معطّلة تلقائياً.</>
            ) : (
              <>
                ما سجّلت حساسيات بعد —{" "}
                <Link href="/order-app/health-profile" className="underline font-bold">عبّي ملفك الصحي</Link>{" "}
                عشان نعطّل المكوّنات غير المناسبة لك.
              </>
            )}
          </p>
        </div>

        <div className="text-[11px] mb-3" style={{ color: T.inkSoft }}>
          القيم لكل {PORTION_G} جرام، من نفس قاعدة المكوّنات اللي يستخدمها المطبخ ({ingredients.length} مكوّن).
          {" "}الأنواع: {Object.values(typeLabels).join(" · ")}
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3" style={{ color: T.inkSoft }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن مكوّن…"
            className="w-full rounded-xl border pr-9 pl-3 py-2.5 text-sm"
            style={{ borderColor: T.border, background: T.surface }}
          />
        </div>

        <div className="space-y-2">
          {visible.map((ing) => {
            const blocked = blockedBy(ing);
            const on = selected.includes(ing.key);
            return (
              <button
                key={ing.key}
                disabled={!!blocked}
                aria-pressed={on}
                onClick={() => setSelected((p) => (p.includes(ing.key) ? p.filter((x) => x !== ing.key) : [...p, ing.key]))}
                className="w-full flex items-center justify-between gap-2 rounded-2xl p-3.5 text-right transition-colors disabled:opacity-45"
                style={{ background: on ? T.brandTint : T.surface, border: `1.5px solid ${on ? T.brandBright : T.border}` }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{ing.name}</div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: T.inkSoft }}>
                      <Flame size={11} /> {Math.round(ing.kcal)} سعرة
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: T.inkSoft }}>
                      <Beef size={11} /> {Math.round(ing.protein)}غ
                    </span>
                    {blocked && (
                      <span className="text-[11px] font-bold" style={{ color: T.warn }}>يحتوي {blocked}</span>
                    )}
                  </div>
                </div>
                <span
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{ width: 26, height: 26, background: on ? T.brandBright : T.brandTint, color: T.onBright }}
                >
                  {on && <Check size={14} />}
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <div className="text-xs py-8 text-center" style={{ color: T.inkSoft }}>ما فيه مكوّن بهذا الاسم</div>
          )}
        </div>
      </div>

      {chosen.length > 0 && (
        // فوق شريط التبويب مباشرة، لا تحته
        <div className="fixed bottom-[60px] left-0 right-0 z-10 border-t" style={{ background: T.surface, borderColor: T.border }}>
          <div className="max-w-md mx-auto px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4 text-xs" style={{ color: T.inkSoft }}>
                <span className="flex items-center gap-1"><Flame size={13} style={{ color: BRAND.limeText }} /> {totalKcal} سعرة</span>
                <span className="flex items-center gap-1"><Beef size={13} style={{ color: T.brand }} /> {totalProtein}غ بروتين</span>
              </div>
              <span className="text-xs font-bold" style={{ color: T.brand }}>{chosen.length} مكوّن</span>
            </div>
            <p className="text-[11px] text-center" style={{ color: T.inkSoft }}>
              طلب الوجبات المخصصة يحتاج نظام الطلبات — المرحلة القادمة
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
