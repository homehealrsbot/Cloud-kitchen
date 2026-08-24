"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Clock,
  AlertTriangle,
  ChefHat,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";

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

type Step = { title: string; minutes: number; warning?: string };
type MealProcess = { name: string; steps: Step[] };

const PROCESSES: MealProcess[] = [
  {
    name: "صدر دجاج مشوي + أرز بني",
    steps: [
      { title: "تجهيز الأرز البني (غسل وطبخ)", minutes: 8 },
      { title: "شوي صدر الدجاج", minutes: 12, warning: "تأكد من درجة الحرارة الداخلية 74°م قبل الإخراج" },
      { title: "التجميع والتقديم بالصحن", minutes: 3 },
      { title: "التغليف والختم", minutes: 2, warning: "تحقق من إغلاق العلبة بإحكام قبل التسليم" },
    ],
  },
  {
    name: "سلمون مشوي + كينوا",
    steps: [
      { title: "طبخ الكينوا", minutes: 10 },
      { title: "شوي السلمون", minutes: 9, warning: "لا تتجاوز وقت الطهي — السلمون يجف بسرعة" },
      { title: "التجميع والتقديم", minutes: 3 },
      { title: "التغليف والختم", minutes: 2 },
    ],
  },
  {
    name: "شوفان بروتين + فواكه",
    steps: [
      { title: "تحضير الشوفان بالحليب", minutes: 5 },
      { title: "إضافة البروتين والفواكه والمكسرات", minutes: 2, warning: "يحتوي مكسرات — تأكد من ملصق تحذير الحساسية" },
      { title: "التغليف والختم", minutes: 2 },
    ],
  },
  {
    name: "سلطة دجاج + حمص وطحينة",
    steps: [
      { title: "شوي صدر الدجاج وتقطيعه", minutes: 12, warning: "تأكد من درجة الحرارة الداخلية 74°م" },
      { title: "تجهيز الحمص وصلصة الطحينة", minutes: 4, warning: "يحتوي سمسم (طحينة) — ملصق حساسية إجباري" },
      { title: "تجميع السلطة", minutes: 3 },
      { title: "التغليف والختم", minutes: 2 },
    ],
  },
];

export default function ProcessMapPage() {
  const [selected, setSelected] = useState(0);
  const process = PROCESSES[selected];
  const totalMinutes = process.steps.reduce((a, s) => a + s.minutes, 0);
  const warningsCount = process.steps.filter((s) => s.warning).length;

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      {/* الهيدر */}
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Food Style</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>خارطة تحضير الوجبات</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.brand }}>
            رجوع للوحة التحكم
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-extrabold mb-1">خريطة تحضير الوجبات (Process Map)</h1>
        <p className="text-xs mb-6" style={{ color: T.inkSoft }}>
          خطوات التحضير بالترتيب لكل صنف — بالتوقيت المتوقع والتحذيرات المهمة لفريق المطبخ
        </p>

        {/* اختيار الوجبة */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PROCESSES.map((p, i) => (
            <button
              key={p.name}
              onClick={() => setSelected(i)}
              className="rounded-full px-4 py-2 text-xs font-bold transition-colors"
              style={{
                background: selected === i ? T.brandBright : T.surface,
                color: selected === i ? "#fff" : T.ink,
                border: `1px solid ${selected === i ? T.brandBright : T.border}`,
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* ملخص سريع */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="rounded-full flex items-center justify-center" style={{ width: 42, height: 42, background: T.brandTint, color: T.brand }}>
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xs" style={{ color: T.inkSoft }}>الوقت الإجمالي المتوقع</div>
              <div className="text-lg font-extrabold">{totalMinutes} دقيقة</div>
            </div>
          </div>
          <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 42, height: 42, background: warningsCount > 0 ? T.warnTint : T.goodTint, color: warningsCount > 0 ? T.warn : T.good }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="text-xs" style={{ color: T.inkSoft }}>تحذيرات تحتاج انتباه</div>
              <div className="text-lg font-extrabold" style={{ color: warningsCount > 0 ? T.warn : T.good }}>
                {warningsCount} {warningsCount > 0 ? "تحذير" : "بدون تحذيرات"}
              </div>
            </div>
          </div>
        </div>

        {/* خط الزمن (Process Map) */}
        <div className="relative">
          {process.steps.map((step, i) => {
            const isLast = i === process.steps.length - 1;
            return (
              <div key={i} className="relative flex gap-4 pb-8">
                {/* الخط الرأسي */}
                {!isLast && (
                  <div
                    className="absolute top-11 bottom-0 w-0.5"
                    style={{ right: 21, background: T.border }}
                  />
                )}
                {/* الأيقونة */}
                <div
                  className="rounded-full flex items-center justify-center shrink-0 z-10"
                  style={{
                    width: 44,
                    height: 44,
                    background: step.warning ? T.warnTint : T.brandTint,
                    color: step.warning ? T.warn : T.brand,
                    border: `2px solid ${T.bg}`,
                  }}
                >
                  {isLast ? <PackageCheck size={20} /> : step.warning ? <AlertTriangle size={19} /> : <ChefHat size={19} />}
                </div>

                {/* المحتوى */}
                <div className="flex-1 rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-bold">
                      {i + 1}. {step.title}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold shrink-0" style={{ color: T.brand }}>
                      <Clock size={13} />
                      {step.minutes} د
                    </div>
                  </div>
                  {step.warning && (
                    <div
                      className="flex items-start gap-2 rounded-xl px-3 py-2 mt-2 text-xs font-medium"
                      style={{ background: T.warnTint, color: "#9A4B1C" }}
                    >
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>{step.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* نهاية المسار */}
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: T.good }}>
            <CheckCircle2 size={20} />
            جاهز للتسليم للمندوب
          </div>
        </div>

        <div className="text-center text-[11px] mt-10 pb-4" style={{ color: T.inkSoft }}>
          هذي خارطة توضيحية — عدّل الخطوات والأوقات حسب طريقة التحضير الفعلية بمطبخكم
        </div>
      </div>
    </div>
  );
}
