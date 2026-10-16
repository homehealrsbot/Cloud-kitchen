// تعريف أنواع لمكوّن Aurora القادم من React Bits كـ JSX.
//
// بدونه يستنتج TypeScript من الوجهة المفكوكة أن كل خاصية بلا قيمة افتراضية
// (time, dpr, style) مطلوبة، فيرفض أي استعمال واقعي للمكوّن. والتعريف هنا
// يصف ما يقبله فعلاً، ويبقى الملف الأصلي كما جاء من المكتبة بلا تعديل.

import type { CSSProperties } from "react";

export interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  time?: number;
  height?: number;
  scale?: number;
  glow?: number;
  brightness?: number;
  layers?: number;
  direction?: "top" | "bottom" | "left" | "right";
  mouseInteraction?: boolean;
  intro?: boolean;
  opacity?: number;
  lightMode?: boolean;
  paused?: boolean;
  dpr?: number;
  className?: string;
  style?: CSSProperties;
}

declare const Aurora: (props: AuroraProps) => JSX.Element;
export default Aurora;
