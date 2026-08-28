"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Meal = {
  id: string;
  name: string;
  price: number;
  kcal: number;
  available: boolean;
};

const DEMO_MEALS: Meal[] = [
  { id: "1", name: "صدر دجاج مشوي + أرز بني", price: 32, kcal: 420, available: true },
  { id: "2", name: "سلمون مشوي + كينوا", price: 42, kcal: 460, available: true },
  { id: "3", name: "شوفان بروتين + فواكه", price: 22, kcal: 380, available: true },
];

export default function OrderApp() {
  const [meals, setMeals] = useState<Meal[]>(DEMO_MEALS);
  const [cart, setCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return;

    const supabase = createClient();
    supabase
      .from("meals")
      .select("id,name,price,kcal,available")
      .eq("available", true)
      .then(({ data, error }) => {
        if (!error && data) setMeals(data as Meal[]);
      });
  }, []);

  const cartCount = Object.values(cart).filter(Boolean).length;

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-extrabold">اختر وجبتك</h1>
        {cartCount > 0 && (
          <span
            className="text-xs font-bold rounded-full px-3 py-1 text-white"
            style={{ background: "#D67A4F" }}
          >
            السلة: {cartCount}
          </span>
        )}
      </div>
      <p className="text-xs mb-3" style={{ color: "#7A6153" }}>
        مطابقة لهدفك: تنزيل وزن
      </p>
      <Link
        href="/order-app/health-profile"
        className="inline-block text-xs font-bold rounded-full px-3 py-1.5 mb-3"
        style={{ background: "#FBEEE6", color: "#A84F2E" }}
      >
        عبّي ملفك الصحي عشان نطابق وجباتك تلقائياً ←
      </Link>

      <div className="flex gap-2 flex-wrap mb-5">
        <Link
          href="/order-app/build-meal"
          className="text-[11px] font-bold rounded-full px-3 py-1.5"
          style={{ background: "white", color: "#A84F2E", border: "1px solid #F0DFD3" }}
        >
          ابنِ وجبتك
        </Link>
        <Link
          href="/order-app/delivery-days"
          className="text-[11px] font-bold rounded-full px-3 py-1.5"
          style={{ background: "white", color: "#A84F2E", border: "1px solid #F0DFD3" }}
        >
          أيام التوصيل
        </Link>
        <Link
          href="/order-app/wallet"
          className="text-[11px] font-bold rounded-full px-3 py-1.5"
          style={{ background: "white", color: "#A84F2E", border: "1px solid #F0DFD3" }}
        >
          محفظتي
        </Link>
        <Link
          href="/order-app/onboarding"
          className="text-[11px] font-bold rounded-full px-3 py-1.5"
          style={{ background: "white", color: "#A84F2E", border: "1px solid #F0DFD3" }}
        >
          اختر خطتك
        </Link>
        <Link
          href="/order-app/progress"
          className="text-[11px] font-bold rounded-full px-3 py-1.5"
          style={{ background: "white", color: "#A84F2E", border: "1px solid #F0DFD3" }}
        >
          تتبع تقدمي
        </Link>
        <Link
          href="/order-app/subscription"
          className="text-[11px] font-bold rounded-full px-3 py-1.5"
          style={{ background: "white", color: "#A84F2E", border: "1px solid #F0DFD3" }}
        >
          إدارة اشتراكي
        </Link>
        <Link
          href="/order-app/consultation"
          className="text-[11px] font-bold rounded-full px-3 py-1.5"
          style={{ background: "white", color: "#A84F2E", border: "1px solid #F0DFD3" }}
        >
          احجز استشارة تغذية
        </Link>
        <Link
          href="/order-app/delivery-proof"
          className="text-[11px] font-bold rounded-full px-3 py-1.5"
          style={{ background: "white", color: "#A84F2E", border: "1px solid #F0DFD3" }}
        >
          تأكيد تسليم (تجربة)
        </Link>
      </div>

      <div className="space-y-2.5">
        {meals.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-2xl p-3 border"
            style={{ borderColor: "#F0DFD3", background: "white" }}
          >
            <div
              className="w-12 h-12 rounded-xl shrink-0"
              style={{ background: "#FBEEE6" }}
            />
            <div className="flex-1">
              <div className="text-sm font-bold">{m.name}</div>
              <div className="text-xs" style={{ color: "#7A6153" }}>
                {m.kcal} سعرة · {m.price} ﷼
              </div>
            </div>
            <button
              onClick={() => setCart((c) => ({ ...c, [m.id]: !c[m.id] }))}
              className="rounded-full w-8 h-8 flex items-center justify-center text-white text-lg font-bold transition-colors"
              style={{ background: cart[m.id] ? "#2E9E6D" : "#D67A4F" }}
            >
              {cart[m.id] ? "✓" : "+"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
