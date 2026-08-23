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

// بيانات تجريبية تظهر إذا ما وصل المشروع بـ Supabase بعد (شوف .env.example)
const DEMO_MEALS: Meal[] = [
  { id: "1", name: "صدر دجاج مشوي + أرز بني", price: 32, kcal: 420, available: true },
  { id: "2", name: "سلمون مشوي + كينوا", price: 42, kcal: 460, available: true },
  { id: "3", name: "شوفان بروتين + فواكه", price: 22, kcal: 380, available: false },
];

export default function AdminPage() {
  const [meals, setMeals] = useState<Meal[]>(DEMO_MEALS);
  const [usingDemo, setUsingDemo] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [kcal, setKcal] = useState("");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return; // لسة ما تربط Supabase — نكمل بالبيانات التجريبية

    const supabase = createClient();
    supabase
      .from("meals")
      .select("id,name,price,kcal,available")
      .then(({ data, error }) => {
        if (!error && data) {
          setMeals(data as Meal[]);
          setUsingDemo(false);
        }
      });
  }, []);

  const [error, setError] = useState("");

  async function addMeal() {
    if (!name || !price || !kcal) {
      setError("عبّي الحقول الثلاثة كلها (الاسم، السعر، السعرات) قبل الحفظ");
      return;
    }
    setError("");
    const newMeal: Meal = {
      id: crypto.randomUUID(),
      name,
      price: Number(price),
      kcal: Number(kcal),
      available: true,
    };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) {
      const supabase = createClient();
      await supabase.from("meals").insert({
        name,
        price: Number(price),
        kcal: Number(kcal),
        protein_g: 0,
        carb_g: 0,
        fat_g: 0,
        goal_tag: "تنزيل وزن",
      });
    }

    setMeals((prev) => [newMeal, ...prev]);
    setName("");
    setPrice("");
    setKcal("");
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-xl font-extrabold mb-1" style={{ color: "#A84F2E" }}>
        لوحة تحكم المطعم
      </h1>
      <p className="text-xs mb-6" style={{ color: "#7A6153" }}>
        {usingDemo
          ? "تعرض حالياً بيانات تجريبية — اربط Supabase (شوف .env.example) عشان تتصل بقاعدة بيانات حقيقية"
          : "متصل بقاعدة البيانات الفعلية"}
      </p>

      <div className="rounded-2xl p-5 mb-6 border" style={{ borderColor: "#F0DFD3", background: "white" }}>
        <h2 className="text-sm font-bold mb-3">إضافة وجبة جديدة</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <input
            placeholder="اسم الوجبة"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-3 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "#F0DFD3" }}
          />
          <input
            placeholder="السعر"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "#F0DFD3" }}
          />
          <input
            placeholder="السعرات"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            className="col-span-2 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "#F0DFD3" }}
          />
        </div>
        <button
          onClick={addMeal}
          className="rounded-lg px-4 py-2 text-sm font-bold text-white"
          style={{ background: "#D67A4F" }}
        >
          حفظ ونشر
        </button>
        {error && (
          <div className="text-xs font-bold mt-2" style={{ color: "#C0392B" }}>
            {error}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {meals.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-xl px-4 py-3 border"
            style={{ borderColor: "#F0DFD3", background: "white" }}
          >
            <div>
              <div className="text-sm font-bold">{m.name}</div>
              <div className="text-xs" style={{ color: "#7A6153" }}>
                {m.kcal} سعرة · {m.price} ﷼
              </div>
            </div>
            <span
              className="text-[11px] rounded-full px-2.5 py-1"
              style={{
                background: m.available ? "#E5F4ED" : "#FBEBE0",
                color: m.available ? "#2E9E6D" : "#DE7A3E",
              }}
            >
              {m.available ? "متاح" : "غير متاح"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
