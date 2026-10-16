"use client";

// ظهور مع النزول، ولفّ العناوين كلمة كلمة.
//
// قاعدة العربي هنا هي الحاكمة: التقسيم بالكلمة لا بالحرف. تقطيع العربي إلى
// حروف يفصل الحرف عن جاره فتتفكك الكلمة بصرياً («مــاكــروز»)، ولهذا كل
// SplitText في هذا الملف type: "words" — ولا استثناء.
//
// وجُرِّب BlurText من React Bits لهذا الغرض فأسقط حرفاً من «نبني» ولصق
// «عليها» بـ«كل»، فاستُبعد. GSAP SplitText يرجّع النص حرفياً.

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
}

/**
 * عنوان يظهر كلمة كلمة عند الوصول إليه.
 *
 * `once` افتراضياً: إعادة التشغيل مع كل مرور تجعل الصفحة تتحرك كلما تمرّر
 * فوقها — مزعج في صفحة يُقرأ فيها كلام، لا في عرض تقديمي.
 */
export function Words({
  children,
  as: Tag = "h2",
  className,
  style,
  delay = 0,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = new SplitText(el, { type: "words" });
        gsap.from(split.words, {
          yPercent: 120,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.07,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref} className={className} style={{ ...style, overflow: "hidden" }}>
      {children}
    </Tag>
  );
}

/** كتلة تظهر مع النزول — أبناؤها يتتابعون واحداً ورا الثاني. */
export function Reveal({
  children,
  className,
  style,
  stagger = 0.09,
  y = 28,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  stagger?: number;
  y?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const kids = el.children.length ? Array.from(el.children) : [el];
        gsap.from(kids, {
          y,
          autoAlpha: 0,
          duration: 0.7,
          stagger,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}

/** صورة تتنفّس مع التمرير — حركة طفيفة تعطي عمقاً بلا دوخة. */
export function Parallax({
  children,
  amount = 8,
  className,
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(el, {
          yPercent: -amount,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
