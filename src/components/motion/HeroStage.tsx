"use client";

// مسرح البنر — الطبق هو البطل، والباقي إضاءة حوله.
//
// البنر القديم كان صورة محشورة في مستطيل على خلفية خضراء مسطّحة: الصورة
// مصوَّرة بإضاءة جانبية درامية، وحشرها في صندوق ضيّع الدراما كلها. هنا الصورة
// تملأ المشهد، والتدرّجات فوقها تعيد بناء الإضاءة: توهّج ليموني من جهة،
// وعتمة من الأطراف، وتدرّج سفلي يسلّم للقسم اللي بعده بدل ما يقطع.
//
// والحركة حركة كاميرا لا حركة عناصر: مع النزول تقرب الكاميرا من الطبق
// (scale) والنص يرتفع ويخفت. هذا اللي يعطي إحساس «الغوص» في المرجع، وهو
// أرخص بكثير من WebGL: تحويلة CSS واحدة على طبقة واحدة.
//
// الشفق (Aurora) مرفوع من هذه الصفحة عمداً: لوحة WebGL شفّافة فوق صورة
// طعام تغسل ألوانها وتخليها ضبابية، وتحتها ما تُرى أصلاً لأن الصورة معتمة.
// بقي الشفق في /menu و /pricing حيث ما فيه صورة تملأ المشهد.

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { BRAND } from "@/lib/brand";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export default function HeroStage({
  image,
  children,
  aside,
}: {
  /** طبقة الصورة — تُمرَّر من الخادم عشان next/image يحتفظ بـ priority. */
  image: ReactNode;
  children: ReactNode;
  /** لوحة الزاوية السفلية — أرقام الطبق فوق الصورة. */
  aside?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // الغوص يُثبَّت على الشاشات الواسعة فقط. التثبيت على اللمس يقاتل تمرير
      // المتصفح الأصلي ويحس متقطّعاً، والجوال أصلاً يمرّر بسرعة فما يشوف
      // المشهد المثبّت إلا لمحة.
      mm.add(
        {
          dive: "(prefers-reduced-motion: no-preference) and (min-width: 1024px)",
          glide: "(prefers-reduced-motion: no-preference) and (max-width: 1023px)",
        },
        (ctx) => {
          const { dive } = ctx.conditions as { dive: boolean; glide: boolean };

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: dive ? "+=70%" : "bottom top",
              scrub: dive ? 0.6 : true,
              pin: dive,
              pinSpacing: dive,
            },
          });

          // الكاميرا تقرب، والنص يرتفع ويخفت قبل ما يختفي المشهد: لو خرجا
          // معاً بنفس السرعة حسّ الواحد إن الصفحة تتزحلق لا إن الكاميرا تمشي.
          tl.to(plate.current, { scale: dive ? 1.22 : 1.1, ease: "none" }, 0);
          if (dive) {
            tl.to(copy.current, { y: -70, autoAlpha: 0, ease: "none" }, 0);
          }
        }
      );

      // شريط المسافة: يمتلئ بمقدار ما قطعته الصفحة كاملةً، لا بمقدار البنر
      // وحده — فهو مؤشّر «وين أنا من الموقع» لا زينة تحت الصورة.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          bar.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: document.documentElement,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.3,
            },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      className="relative w-full overflow-hidden h-[min(calc(100svh-68px),680px)] min-h-[560px] lg:h-[min(calc(100svh-68px),860px)]"
      style={{ background: BRAND.ink }}
    >
      {/* ١ — الطبق. يتجاوز الحدود قليلاً عشان التقريب ما يكشف حوافه.
          والتدرّج اللوني (contrast/saturate) قبل أي تعتيم: التعتيم وحده
          يطفئ الطبق مع الخلفية فيصير المشهد رمادياً كله. رفع التباين ينزّل
          الظلال ويطلّع الضوء، فتبقى الخلفية تغرق والطبق يطلع منها. */}
      <div
        ref={plate}
        className="absolute inset-0 -m-[3%] will-change-transform"
        style={{ filter: "contrast(1.2) saturate(1.14) brightness(0.96)" }}
      >
        {image}
      </div>

      {/* ٢ — إعادة الإضاءة. الصورة مصوَّرة فاتحة نسبياً، والمشهد يحتاجها معتمة
          عشان يبقى الطبق هو الشي المضيء الوحيد. الطبقات من فوق لتحت:
          حجاب جهة النص، وهج ليموني خلف النص، وهج برتقالي دافئ على الطبق
          (دور البرتقالي في الدليل ٥٪ إبراز — وهذا موضعه)، عتمة الأطراف،
          تدرّج علوي وسفلي، ثم تعتيم عام يشدّ المشهد كله للغامق. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to left, ${BRAND.ink}FA 0%, ${BRAND.ink}E0 34%, ${BRAND.ink}8C 62%, ${BRAND.ink}40 100%),
            radial-gradient(70% 60% at 82% 46%, ${BRAND.lime}1F 0%, transparent 60%),
            radial-gradient(55% 55% at 30% 38%, ${BRAND.orange}1C 0%, transparent 65%),
            radial-gradient(125% 95% at 46% 46%, transparent 24%, ${BRAND.ink}E6 100%),
            linear-gradient(to bottom, ${BRAND.ink}A6 0%, transparent 18%, transparent 62%, ${BRAND.ink}F7 100%),
            linear-gradient(0deg, ${BRAND.ink}59, ${BRAND.ink}59)
          `,
        }}
      />

      {/* ٢ب — بقعة الضوء على الطبق. screen يضيف ضوءاً ولا يغسل اللون كما
          يفعل الأبيض الشفّاف، فالطبق يُضاء ويبقى الأسود حوله أسود. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          mixBlendMode: "screen",
          background: `radial-gradient(46% 46% at 32% 36%, ${BRAND.orange}24 0%, ${BRAND.lime}0F 45%, transparent 72%)`,
        }}
      />

      {/* ٣ — شريط الأقسام، فوق المسطرة مباشرة.
          موضعه أسفل لا أعلى: البنر يُثبَّت مع النزول فيصير سقفه سقف الشاشة،
          وشريط التنقّل اللاصق يغطّي أي شي هناك. وأسفلُه يجاور المسطرة فيصيران
          لوحة قياس واحدة: وين أنت، وكم قطعت.
          وأرقام لاتينية متباعدة، وعربي بلا تباعد: تباعد الحروف في العربي
          يفكّ وصلها فتُقرأ الكلمة مقطّعة. */}
      <div
        aria-hidden
        className="absolute bottom-7 inset-x-0 hidden md:flex items-center gap-7 px-7 h-10 text-[10px] font-bold"
        style={{ color: "#FFFFFF4D" }}
      >
        {SECTIONS.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="num tracking-[0.25em]" style={{ color: i === 0 ? BRAND.lime : undefined }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span style={{ color: i === 0 ? "#FFFFFFCC" : undefined }}>{s}</span>
          </span>
        ))}
      </div>

      {/* ٤ — النص. */}
      <div ref={copy} className="relative h-full max-w-6xl mx-auto px-5 sm:px-6 flex items-center">
        <div className="max-w-xl pt-10 md:pt-11">{children}</div>
      </div>

      {/* ٥ — لوحة الزاوية السفلية. */}
      {aside && <div className="absolute bottom-20 left-6 hidden lg:block">{aside}</div>}

      {/* ٦ — شريط المسافة. العلامات من تدرّج متكرّر لا من عناصر: مئة شرطة
          كعنصر DOM مئة عنصر بلا معنى لقارئ الشاشة ولا للمتصفح. */}
      <div aria-hidden className="absolute bottom-0 inset-x-0 h-7">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, #FFFFFF2E 0 1px, transparent 1px 9px),
                              repeating-linear-gradient(90deg, #FFFFFF57 0 1px, transparent 1px 45px)`,
            backgroundSize: "100% 9px, 100% 15px",
            backgroundPosition: "bottom left",
            backgroundRepeat: "repeat-x",
          }}
        />
        <div
          ref={bar}
          className="absolute bottom-0 inset-x-0 h-[2px] origin-right"
          style={{ background: BRAND.lime }}
        />
      </div>
    </section>
  );
}

const SECTIONS = ["الطبق", "الركائز", "الخطوات", "المنيو", "ابدأ"];
