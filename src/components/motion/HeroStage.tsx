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
  variant = "page",
  sections,
  tone = "bright",
}: {
  /** طبقة الصورة — تُمرَّر من الخادم عشان next/image يحتفظ بـ priority. */
  image: ReactNode;
  children: ReactNode;
  /** لوحة الزاوية السفلية — أرقام الطبق فوق الصورة. */
  aside?: ReactNode;
  /**
   * `flagship` للرئيسية: ملء الشاشة، وغوص مثبّت، ودليل أقسام.
   * `page` لبقية الصفحات: أقصر، بلا تثبيت — صفحة داخلية تُقرأ لا تُشاهَد،
   * وتثبيت بنرها يؤخّر الزائر عن المحتوى اللي جاء له.
   */
  variant?: "flagship" | "page";
  /** دليل الأقسام أسفل البنر الرئيسي. */
  sections?: string[];
  /**
   * طبيعة الصورة المصدر، لا المزاج المطلوب. `bright` لصورة مضيئة تحتاج
   * تعتيماً قوياً، و`dark` لصورة خلفيتها غامقة أصلاً: نفس التعتيم عليها
   * يطفئ الأكل مع الخلفية فتصير البقعة كلها سوداء بلا بطل.
   */
  tone?: "bright" | "dark";
}) {
  const flagship = variant === "flagship";
  const g = GRADE[tone];
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // الغوص يُثبَّت على الشاشات الواسعة فقط. التثبيت على اللمس يقاتل تمرير
      // المتصفح الأصلي ويحس متقطّعاً، والجوال أصلاً يمرّر بسرعة فما يشوف
      // المشهد المثبّت إلا لمحة.
      mm.add(
        {
          wide: "(prefers-reduced-motion: no-preference) and (min-width: 1024px)",
          glide: "(prefers-reduced-motion: no-preference) and (max-width: 1023px)",
        },
        (ctx) => {
          const { wide } = ctx.conditions as { wide: boolean; glide: boolean };
          const dive = wide && flagship;

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
          tl.to(plate.current, { scale: dive ? 1.1 : 1.05, ease: "none" }, 0);
          if (dive) {
            tl.to(copy.current, { y: -70, autoAlpha: 0, ease: "none" }, 0);
          }
        }
      );

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      className={
        "relative w-full overflow-hidden " +
        (flagship
          ? "h-[min(calc(100svh-68px),620px)] min-h-[540px] lg:h-[min(calc(100svh-68px),860px)]"
          : "h-[340px] sm:h-[400px] lg:h-[460px]")
      }
      style={{ background: BRAND.ink }}
    >
      {/* ١ — الطبق.
          والتدرّج اللوني (contrast/saturate) قبل أي تعتيم: التعتيم وحده
          يطفئ الطبق مع الخلفية فيصير المشهد رمادياً كله. رفع التباين ينزّل
          الظلال ويطلّع الضوء، فتبقى الخلفية تغرق والطبق يطلع منها. */}
      <div
        ref={plate}
        className="absolute inset-0 will-change-transform"
        style={{ filter: g.filter }}
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
            linear-gradient(to left, ${BRAND.ink}FA 0%, ${BRAND.ink}E0 34%, ${BRAND.ink}8C 62%, ${BRAND.ink}${g.farEdge} 100%),
            radial-gradient(70% 60% at 82% 46%, ${BRAND.lime}1F 0%, transparent 60%),
            radial-gradient(55% 55% at 30% 38%, ${BRAND.orange}1C 0%, transparent 65%),
            radial-gradient(125% 95% at 46% 46%, transparent 24%, ${BRAND.ink}${g.vignette} 100%),
            linear-gradient(to bottom, ${BRAND.ink}A6 0%, transparent 18%, transparent 62%, ${BRAND.ink}F7 100%),
            linear-gradient(0deg, ${BRAND.ink}${g.flat}, ${BRAND.ink}${g.flat})
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
          background: `radial-gradient(46% 46% at 32% 36%, ${BRAND.orange}${g.spot} 0%, ${BRAND.lime}0F 45%, transparent 72%)`,
        }}
      />

      {/* ٣ — دليل الأقسام أسفل البنر.
          موضعه أسفل لا أعلى: البنر يُثبَّت مع النزول فيصير سقفه سقف الشاشة،
          وشريط التنقّل اللاصق يغطّي أي شي هناك.
          وأرقام لاتينية متباعدة، وعربي بلا تباعد: تباعد الحروف في العربي
          يفكّ وصلها فتُقرأ الكلمة مقطّعة. */}
      <div
        aria-hidden
        className={
          "absolute bottom-0 inset-x-0 items-center gap-7 px-7 h-12 text-[10px] font-bold " +
          (sections && sections.length > 0 ? "hidden md:flex" : "hidden")
        }
        style={{ color: "#FFFFFF4D" }}
      >
        {(sections ?? []).map((s, i) => (
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
      {aside && <div className="absolute bottom-14 left-6 hidden lg:block">{aside}</div>}

    </section>
  );
}

// قوّة التدرّج حسب الصورة المصدر. الفرق مو ذوقاً: صورة خلفيتها سوداء أصلاً
// (ستيك على حجر أسود) لو انضاف لها نفس تعتيم صورة مضيئة انطفأ الأكل معها،
// فتصير البقعة كلها سوداء بلا بطل. فالغامقة تُعتَّم أقل ويُرفع ضوء بقعتها.
const GRADE = {
  bright: { farEdge: "40", vignette: "E6", flat: "59", spot: "24", filter: "contrast(1.2) saturate(1.14) brightness(0.96)" },
  dark: { farEdge: "1A", vignette: "B3", flat: "1F", spot: "33", filter: "contrast(1.14) saturate(1.22) brightness(1.12)" },
} as const;
