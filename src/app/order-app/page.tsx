"use client";

import { useEffect, useState } from "react";
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

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <h1 className="text-lg font-extrabold mb-1">اختر وجبتك</h1>
      <p className="text-xs mb-5" style={{ color: "#7A6153" }}>
        مطابقة لهدفك: تنزيل وزن
      </p>

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
              className="rounded-full w-8 h-8 flex items-center justify-center text-white text-lg font-bold"
              style={{ background: "#D67A4F" }}
            >
              +
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
