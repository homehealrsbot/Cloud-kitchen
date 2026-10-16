// تعريف أنواع لمكوّن CountUp القادم من React Bits كـ JSX — انظر Aurora.d.ts.

import type { CSSProperties } from "react";

export interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  startWhen?: boolean;
  separator?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

declare const CountUp: (props: CountUpProps) => JSX.Element;
export default CountUp;
