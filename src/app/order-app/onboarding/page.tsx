"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Flame,
  Dumbbell,
  Leaf,
  HeartPulse,
  Baby,
  Check,
  ArrowLeft,
} from "lucide-react";
import { usePlans, T } from "@/lib/kitchen-shared";


const ICONS: Record<string, typeof Flame> = {
  flame: Flame,
  dumbbell: Dumbbell,
  leaf: Leaf,
  heart: HeartPulse,
  baby: Baby,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const plans = usePlans();

  const CUISINES = ["عربي", "آسيوي", "متوسطي", "أمريكي", "هندي"];

  function toggleCuisine(c: string) {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  const stages = ["اختر خطتك", "تفضيلات المطبخ", "التأكيد"];

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-sm" style={{ color: T.brand }}>إعداد اشتراكك</span>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
        {/* مؤشر المراحل */}
        <div className="max-w-md mx-auto px-5 pb-3 flex items-center gap-2">
          {stages.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background: i <= stage ? T.brandBright : T.brandTint,
                  color: i <= stage ? "#fff" : T.brand,
                }}
              >
                {i < stage ? <Check size={12} /> : i + 1}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: i <= stage ? T.brand : T.inkSoft }}>
                {s}
              </span>
              {i < stages.length - 1 && <div className="flex-1 h-px" style={{ background: T.border }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        {stage === 0 && (
          <>
            <h1 className="text-lg font-extrabold mb-1">شنو هدفك؟</h1>
            <p className="text-xs mb-5" style={{ color: T.inkSoft }}>اختر الخطة الأقرب لهدفك — نقدر نعدّلها لك لاحقاً بأي وقت</p>
            <div className="space-y-2.5 mb-6">
              {plans.map((p) => {
                const Icon = ICONS[p.icon] || Leaf;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-right transition-colors"
                    style={{
                      background: selectedPlan === p.id ? T.brandTint : T.surface,
                      border: `1.5px solid ${selectedPlan === p.id ? T.brandBright : T.border}`,
                    }}
                  >
                    <div
                      className="rounded-full flex items-center justify-center shrink-0"
                      style={{ width: 42, height: 42, background: selectedPlan === p.id ? T.brandBright : T.brandTint, color: selectedPlan === p.id ? "#fff" : T.brand }}
                    >
                      <Icon size={19} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{p.name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{p.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStage(1)}
              disabled={!selectedPlan}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-40"
              style={{ background: T.brandBright }}
            >
              التالي
            </button>
          </>
        )}

        {stage === 1 && (
          <>
            <h1 className="text-lg font-extrabold mb-1">إيش مطابخك المفضلة؟</h1>
            <p className="text-xs mb-5" style={{ color: T.inkSoft }}>اختر واحد أو أكثر — نوزع وجباتك عليها بدل ما تكون رتيبة</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {CUISINES.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCuisine(c)}
                  className="rounded-full px-4 py-2 text-sm font-bold border transition-colors"
                  style={{
                    background: cuisines.includes(c) ? T.brandBright : T.surface,
                    color: cuisines.includes(c) ? "#fff" : T.ink,
                    borderColor: cuisines.includes(c) ? T.brandBright : T.border,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStage(0)}
                className="rounded-2xl py-3.5 px-5 text-sm font-bold flex items-center gap-1.5"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}
              >
                <ArrowLeft size={15} /> السابق
              </button>
              <button
                onClick={() => setStage(2)}
                className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-white"
                style={{ background: T.brandBright }}
              >
                التالي
              </button>
            </div>
          </>
        )}

        {stage === 2 && (
          <>
            <h1 className="text-lg font-extrabold mb-5">تأكيد الإعداد</h1>
            <div className="rounded-2xl p-4 mb-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="text-xs" style={{ color: T.inkSoft }}>الخطة</div>
              <div className="text-sm font-bold mt-0.5">{plans.find((p) => p.id === selectedPlan)?.name}</div>
            </div>
            <div className="rounded-2xl p-4 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="text-xs" style={{ color: T.inkSoft }}>المطابخ المفضلة</div>
              <div className="text-sm font-bold mt-0.5">{cuisines.length > 0 ? cuisines.join("، ") : "بدون تفضيل محدد"}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStage(1)}
                className="rounded-2xl py-3.5 px-5 text-sm font-bold flex items-center gap-1.5"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}
              >
                <ArrowLeft size={15} /> السابق
              </button>
              <button
                onClick={() => router.push("/order-app/health-profile")}
                className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-white"
                style={{ background: T.good }}
              >
                تفعيل الخطة ومطابقة الوجبات
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
