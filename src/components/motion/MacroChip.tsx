"use client";

// شارة ماكرو — نفس كود الألوان في الموقع والتطبيق والملصق.
//
// الرقم يعدّ إلى قيمته عند الظهور. الأرقام غربية ومحجوزة العرض (tabular)، فما
// يرتجف عرض الشارة وهي تعدّ — وهذا سبب وجود .num في globals لا تزيين.
//
// والعدّاد يُتجاوز عند طلب تقليل الحركة: الرقم يظهر نهائياً من أول لحظة. رقم
// غذائي يتراقص أمام من طلب السكون ليس «حركة أخف»، هو نفس الإزعاج.

import { useSyncExternalStore } from "react";
import CountUp from "@/components/react-bits/CountUp";
import { MACRO } from "@/lib/brand";

export default function MacroChip({
  macro,
  value,
}: {
  macro: keyof typeof MACRO;
  value: number;
}) {
  const m = MACRO[macro];
  // تفضيل تقليل الحركة مصدر خارجي يتغيّر، لا حالة نضبطها مرة في أثر:
  // useSyncExternalStore يقرأه ويتابع تغيّره، ويرجّع false على الخادم فيتطابق
  // أول رسم مع الخادم ولا يومض الرقم عند الإماهة.
  const animate = useSyncExternalStore(subscribeMotionPref, readMotionPref, () => false);

  return (
    <span
      className="rounded-lg px-2.5 py-1.5 text-center leading-none"
      style={{
        background: m.bg,
        color: m.fg,
        border: macro === "fat" ? "1px solid #E4DCCB" : undefined,
      }}
    >
      {/* dir=ltr على الرقم ووحدته: في RTL يعكس الـflex ترتيبهما فتُقرأ «g42».
          والوحدة تلتصق بالرقم في كل اللغات، فاتجاهها لاتيني لا اتجاه الصفحة. */}
      <span
        dir="ltr"
        className="num flex items-baseline justify-center text-sm font-extrabold"
      >
        {animate ? <CountUp to={value} duration={1.1} /> : value}
        <span>g</span>
      </span>
      <span className="block text-[9px] font-bold mt-0.5">{m.label}</span>
    </span>
  );
}

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMotionPref(onChange: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function readMotionPref() {
  return !window.matchMedia(MOTION_QUERY).matches;
}
