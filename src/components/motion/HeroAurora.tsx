"use client";

// شفق خلف الهيرو — أقوى لحظة بصرية في الموقع.
//
// Aurora من React Bits (MIT + Commons Clause: تُستعمل في منتجنا ولا تُباع ولا
// يُعاد توزيعها). ما تحتاج مكتبة رسوم: تكتب WebGL2 بنفسها.
//
// والألوان من الهوية لا من افتراضي المكوّن (بنفسجي/أخضر فاقع): ليموني وغابي
// وحدهما. القوة هنا من الحركة والعمق لا من ألوان دخيلة — علامة أكل صحي تبيع
// الثقة، وسطح نيون خلف طبق دجاج يناقض ما تبيعه.
//
// ويُطفأ كلياً عند طلب تقليل الحركة، وفي الشاشات الصغيرة: لوحة WebGL تعمل
// باستمرار تأكل بطارية الجوال بلا مقابل، والهيرو على الجوال صورة وطبق أصلاً.

import { useEffect, useState } from "react";
import Aurora from "@/components/react-bits/Aurora";
import { BRAND } from "@/lib/brand";

export default function HeroAurora() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");
    const decide = () => setOn(!reduce.matches && wide.matches);
    decide();
    reduce.addEventListener("change", decide);
    wide.addEventListener("change", decide);
    return () => {
      reduce.removeEventListener("change", decide);
      wide.removeEventListener("change", decide);
    };
  }, []);

  if (!on) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: 0.55 }}
    >
      <Aurora
        colorStops={[BRAND.forest, BRAND.lime, BRAND.limeDeep]}
        amplitude={0.9}
        blend={0.6}
        speed={0.45}
        height={0.7}
        glow={0.5}
        brightness={0.9}
        layers={2}
        mouseInteraction={false}
      />
    </div>
  );
}
