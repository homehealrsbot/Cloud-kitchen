"use client";

import { useState } from "react";
import { Flame, Beef, Check, Plus } from "lucide-react";
import { T } from "@/lib/kitchen-shared";

export interface CustomerMeal {
  id: string;
  name: string;
  section: string;
  kcal: number;
  protein: number;
  price: number;
  allergens: string;
}

export default function MenuList({ meals }: { meals: CustomerMeal[] }) {
  const [cart, setCart] = useState<Record<string, boolean>>({});
  const count = Object.values(cart).filter(Boolean).length;

  return (
    <>
      {count > 0 && (
        <div className="rounded-xl px-4 py-2.5 mb-3 text-xs font-bold" style={{ background: T.goodTint, color: T.good }}>
          في السلة: {count}
        </div>
      )}
      <div className="space-y-2.5">
        {meals.map((m) => {
          const picked = !!cart[m.id];
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl p-3 border"
              style={{ borderColor: picked ? T.brandBright : T.border, background: "white" }}
            >
              <div className="w-12 h-12 rounded-xl shrink-0" style={{ background: T.brandTint }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{m.name}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: T.inkSoft }}>
                    <Flame size={11} /> {m.kcal} سعرة
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: T.inkSoft }}>
                    <Beef size={11} /> {m.protein}غ
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: T.brand }}>{m.price} ﷼</span>
                </div>
                {m.allergens !== "لا يوجد" && (
                  <div className="text-[11px] mt-0.5" style={{ color: T.warn }}>يحتوي: {m.allergens}</div>
                )}
              </div>
              <button
                onClick={() => setCart((c) => ({ ...c, [m.id]: !c[m.id] }))}
                aria-label={picked ? `إزالة ${m.name}` : `إضافة ${m.name}`}
                className="rounded-full w-8 h-8 flex items-center justify-center text-white shrink-0"
                style={{ background: picked ? T.good : T.brandBright }}
              >
                {picked ? <Check size={16} /> : <Plus size={16} />}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
