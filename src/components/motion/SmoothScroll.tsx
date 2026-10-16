"use client";

// سكرول ناعم للصفحات التسويقية وحدها.
//
// ليش ما هو في layout الجذر: الـlayout يغلّف /admin و /order-app كذلك، ولوحة
// العمليات فيها جداول طويلة وقوائم تمرير داخلية — سكرول مخصّص فوقها يقاتل
// تمريرها ويجعل الإدخال يحس ثقيلاً. فيُركَّب في الصفحات الخمس التسويقية فقط.
//
// والربط بـ ScrollTrigger ضروري لا تجميلي: Lenis يحرّك الصفحة بنفسه، فلو ترك
// ScrollTrigger يقرأ موضع المتصفح وحده تأخّرت المشاهد عن الصفحة وبانت متقطّعة.
// نُحدّثه من حدث Lenis، ونقود Lenis من ticker الـGSAP، فيصيران على ساعة واحدة.
//
// ومن يطلب تقليل الحركة من نظامه ما يحصل سكرول مخصّصاً أبداً — يرجع للسكرول
// الأصلي كما هو، لا نسخة مخفّفة منه.

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // روابط المرساة داخل الصفحة تمشي على نفس المحرّك، وإلا قفزت قفزاً
    // بينما بقية الصفحة تنساب.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -80 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
