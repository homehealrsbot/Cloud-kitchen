"use client";

import Link from "next/link";
import { T } from "@/lib/kitchen-shared";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChevronRight, TrendingDown, Flame, Beef } from "lucide-react";


const WEIGHT_HISTORY = [
  { d: "الأسبوع 1", kg: 82 },
  { d: "الأسبوع 2", kg: 81.2 },
  { d: "الأسبوع 3", kg: 80.6 },
  { d: "الأسبوع 4", kg: 80.1 },
  { d: "الأسبوع 5", kg: 79.3 },
  { d: "الأسبوع 6", kg: 78.8 },
];

const DIARY_INIT = [
  { meal: "شوفان بروتين + فواكه", kcal: 380, protein: 28, time: "8:00 ص" },
  { meal: "صدر دجاج مشوي + أرز بني", kcal: 420, protein: 42, time: "1:30 م" },
];

export default function ProgressPage() {
  // مذكرة الطعام ثابتة حالياً (بيانات تجريبية) — تتعبى من الاشتراك لما نربط قاعدة البيانات
  const diary = DIARY_INIT;

  const totalKcal = diary.reduce((a, d) => a + d.kcal, 0);
  const totalProtein = diary.reduce((a, d) => a + d.protein, 0);
  const startWeight = WEIGHT_HISTORY[0].kg;
  const currentWeight = WEIGHT_HISTORY[WEIGHT_HISTORY.length - 1].kg;
  const lost = Math.round((startWeight - currentWeight) * 10) / 10;

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-sm" style={{ color: T.brand }}>تتبع تقدمك</span>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        {/* ملخص الوزن */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: T.good }}>
              <TrendingDown size={14} />
              نزلت {lost} كجم
            </div>
            <div className="text-xs" style={{ color: T.inkSoft }}>الوزن الحالي: {currentWeight} كجم</div>
          </div>
          <div style={{ width: "100%", height: 140 }}>
            <ResponsiveContainer>
              <LineChart data={WEIGHT_HISTORY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 9, fill: T.inkSoft }} axisLine={{ stroke: T.border }} tickLine={false} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: `1px solid ${T.border}` }} />
                <Line type="monotone" dataKey="kg" stroke={T.brandBright} strokeWidth={3} dot={{ r: 3, fill: T.brandBright }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* مذكرة السعرات اليومية */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4" style={{ background: T.brandTint }}>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.brand }}>
              <Flame size={13} /> سعرات اليوم
            </div>
            <div className="text-xl font-extrabold" style={{ color: T.brand }}>{totalKcal}</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: T.goodTint }}>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.good }}>
              <Beef size={13} /> بروتين اليوم
            </div>
            <div className="text-xl font-extrabold" style={{ color: T.good }}>{totalProtein}غ</div>
          </div>
        </div>

        {/* مذكرة الطعام */}
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-xs font-bold mb-3">مذكرة الطعام اليوم</div>
          <div className="space-y-2">
            {diary.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                <div>
                  <div className="text-sm font-medium">{d.meal}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{d.time}</div>
                </div>
                <div className="text-xs text-left" style={{ color: T.inkSoft }}>
                  {d.kcal} سعرة
                  <br />
                  {d.protein}غ بروتين
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] mt-6" style={{ color: T.inkSoft }}>
          مذكرة الطعام تتحدث تلقائياً كل ما وصلتك وجبة جديدة من اشتراكك
        </div>
      </div>
    </div>
  );
}
