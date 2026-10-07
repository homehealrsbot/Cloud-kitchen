"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, CalendarDays, Check } from "lucide-react";
import { saveDeliveryDays, T } from "@/lib/kitchen-shared";


const DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export default function DeliveryDaysPage() {
  const [selected, setSelected] = useState<string[]>(["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء"]);
  const [saved, setSaved] = useState(false);

  function toggle(day: string) {
    setSaved(false);
    setSelected((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function save() {
    if (selected.length === 0) return;
    saveDeliveryDays(selected);
    setSaved(true);
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} style={{ color: T.brand }} />
            <span className="font-bold text-sm" style={{ color: T.brand }}>أيام التوصيل</span>
          </div>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <p className="text-xs mb-5" style={{ color: T.inkSoft }}>
          اختر الأيام اللي تبي تستلم فيها وجبتك — يومي التوصيل يتحدد على هذا الأساس بالضبط، وتقدر تعدّل أي وقت.
        </p>

        <div className="space-y-2 mb-6">
          {DAYS.map((day) => {
            const isSelected = selected.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggle(day)}
                className="w-full flex items-center justify-between rounded-2xl p-3.5 transition-colors"
                style={{
                  background: isSelected ? T.brandTint : T.surface,
                  border: `1.5px solid ${isSelected ? T.brandBright : T.border}`,
                }}
              >
                <span className="text-sm font-bold">{day}</span>
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{ width: 24, height: 24, background: isSelected ? T.brandBright : T.brandTint, color: isSelected ? "#fff" : T.brand }}
                >
                  {isSelected && <Check size={13} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl p-4 mb-6 text-center" style={{ background: T.brandTint }}>
          <span className="text-sm font-bold" style={{ color: T.brand }}>{selected.length} أيام توصيل بالأسبوع</span>
        </div>

        <button
          onClick={save}
          disabled={selected.length === 0}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-40"
          style={{ background: saved ? T.good : T.brandBright }}
        >
          {saved ? <Check size={16} /> : null}
          {saved ? "تم الحفظ" : "حفظ أيام التوصيل"}
        </button>
      </div>
    </div>
  );
}
