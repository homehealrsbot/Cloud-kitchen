"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Stethoscope, Calendar, Clock, CheckCircle2, Bell } from "lucide-react";
import { T } from "@/lib/kitchen-shared";


const SLOTS = ["اليوم 5:00 م", "اليوم 7:30 م", "غداً 10:00 ص", "غداً 4:00 م", "بعد غد 11:00 ص"];

type Booking = { slot: string; bookedAt: string; reminded: boolean };

export default function ConsultationPage() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  function confirmBooking() {
    if (!selectedSlot) return;
    setBooking({
      slot: selectedSlot,
      bookedAt: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      reminded: false,
    });
  }

  function cancelBooking() {
    setBooking(null);
    setSelectedSlot(null);
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} style={{ color: T.brand }} />
            <span className="font-bold text-sm" style={{ color: T.brand }}>استشارة تغذية</span>
          </div>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6" style={{ background: T.brandTint }}>
          <Bell size={16} style={{ color: T.brand }} className="mt-0.5 shrink-0" />
          <p className="text-[11.5px] leading-relaxed" style={{ color: T.brand }}>
            موعدك يتحجز فوراً بالنظام، مو وعد بمكالمة. تذكير تلقائي قبل الموعد يضمن ما ننساه.
          </p>
        </div>

        {!booking ? (
          <>
            <div className="text-xs font-bold mb-3" style={{ color: T.inkSoft }}>اختر موعداً متاحاً</div>
            <div className="space-y-2 mb-5">
              {SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                  style={{
                    background: selectedSlot === slot ? T.brandBright : T.surface,
                    color: selectedSlot === slot ? "#fff" : T.ink,
                    border: `1px solid ${selectedSlot === slot ? T.brandBright : T.border}`,
                  }}
                >
                  <Calendar size={15} />
                  {slot}
                </button>
              ))}
            </div>
            <button
              onClick={confirmBooking}
              disabled={!selectedSlot}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-40"
              style={{ background: T.brandBright }}
            >
              تأكيد الحجز
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 text-center" style={{ background: T.goodTint }}>
              <CheckCircle2 size={36} style={{ color: T.good }} className="mx-auto mb-2" />
              <div className="text-sm font-bold" style={{ color: T.good }}>تم حجز موعدك</div>
              <div className="text-xs mt-1 flex items-center justify-center gap-1.5" style={{ color: T.inkSoft }}>
                <Clock size={13} /> {booking.slot}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2 text-xs font-bold mb-1">
                <Bell size={14} style={{ color: T.brand }} />
                تذكير تلقائي مفعّل
              </div>
              <div className="text-[11px]" style={{ color: T.inkSoft }}>
                بنرسل لك تنبيه قبل الموعد بـ 30 دقيقة — بدون ما تحتاج تتابع بنفسك
              </div>
            </div>

            <button
              onClick={cancelBooking}
              className="w-full rounded-2xl py-3 text-xs font-bold"
              style={{ background: "transparent", color: T.warn, border: `1px solid ${T.warn}` }}
            >
              إلغاء الموعد
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
