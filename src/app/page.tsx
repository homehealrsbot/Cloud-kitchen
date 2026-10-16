import Link from "next/link";
import Image from "next/image";
import { Leaf, Scale, Target, ArrowLeft } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SmoothScroll from "@/components/motion/SmoothScroll";
import HeroStage from "@/components/motion/HeroStage";
import MacroChip from "@/components/motion/MacroChip";
import { Parallax, Reveal, Words } from "@/components/motion/Reveal";
import SiteFooter from "@/components/SiteFooter";
import { BRAND, ESSENCE, PILLARS, STEPS } from "@/lib/brand";

export const metadata = {
  title: "Macro Meals — أكل حقيقي.. ماكروز محسوبة",
  description:
    "وجبات يطبخها شيفاتنا طازجة كل يوم، البروتين والكارب والدهون محسوبة على هدفك، وتوصلك لباب بيتك.",
};

const PILLAR_ICONS = [Leaf, Scale, Target];

export default function Home() {
  return (
    <div className="min-h-screen w-full" style={{ background: BRAND.cream, color: BRAND.ink }}>
      <SmoothScroll />
      <SiteNav />

      {/* ---------- البنر الرئيسي ---------- */}
      <HeroStage
        image={
          <Image
            src="/brand/hero-bowl.jpg"
            alt="بول الدجاج المشوي مع الخضار والحبوب"
            fill
            priority
            sizes="100vw"
            className="object-cover [object-position:56%_40%] lg:[object-position:58%_30%]"
          />
        }
        aside={
          <div
            className="rounded-2xl px-4 py-3.5"
            style={{
              background: "#0B1410A6",
              border: "1px solid #FFFFFF1F",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <div className="text-[11px] font-extrabold mb-2.5" style={{ color: "#FFFFFFD9" }}>
              بول الدجاج المشوي
            </div>
            <div className="flex gap-1.5">
              <MacroChip macro="protein" value={42} />
              <MacroChip macro="carbs" value={18} />
              <MacroChip macro="fat" value={12} />
            </div>
          </div>
        }
      >
        {/* السطر العلوي: لاتيني متباعد، وعربي بلا تباعد — التباعد يفكّ وصل العربي */}
        <div className="flex items-center gap-2.5 mb-7 text-[10px] sm:text-[11px] font-bold">
          <span className="num tracking-[0.3em]" style={{ color: BRAND.lime }}>
            No.01
          </span>
          <span style={{ color: "#FFFFFF38" }}>{"//"}</span>
          <span style={{ color: "#FFFFFF8A" }}>يطبخها شيف · طازجة يومياً</span>
        </div>

        <h1 className="text-[2.6rem] sm:text-6xl lg:text-[4.6rem] font-extrabold leading-[1.05] mb-6">
          <Words as="span" className="block" style={{ color: "#FFFFFF" }}>
            {ESSENCE.ar.line1}
          </Words>
          <Words as="span" className="block" style={{ color: BRAND.lime }} delay={0.12}>
            {ESSENCE.ar.line2}
          </Words>
        </h1>

        <p
          className="text-sm sm:text-base leading-relaxed mb-9 max-w-sm"
          style={{ color: "#FFFFFFA6" }}
        >
          وجبات يطبخها شيفاتنا، البروتين والكارب والدهون محسوبة على هدفك،
          وتوصلك طازجة لباب بيتك.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/order-app/onboarding"
            className="rounded-full px-7 py-3.5 text-sm font-extrabold transition-transform hover:scale-[1.03]"
            style={{ background: BRAND.lime, color: BRAND.ink }}
          >
            ابنِ خطتك
          </Link>
          <Link
            href="/menu"
            className="rounded-full px-7 py-3.5 text-sm font-extrabold transition-colors"
            style={{ border: "1.5px solid #FFFFFF4D", color: "#FFFFFF" }}
          >
            شوف المنيو
          </Link>
        </div>

        <div
          className="flex items-center gap-5 sm:gap-7 mt-9 flex-wrap text-[11px] font-bold"
          style={{ color: "#FFFFFF73" }}
        >
          <span className="flex items-center gap-1.5"><Target size={13} style={{ color: BRAND.lime }} /> بروتين عالي</span>
          <span className="flex items-center gap-1.5"><Leaf size={13} style={{ color: BRAND.lime }} /> مكونات طازجة</span>
          <span className="flex items-center gap-1.5"><Scale size={13} style={{ color: BRAND.lime }} /> ماكروز متوازنة</span>
        </div>
      </HeroStage>

      {/* ---------- الركائز ---------- */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <Words className="text-2xl sm:text-3xl font-extrabold mb-2">ليش ماكرو ميلز</Words>
        <Words as="p" className="text-sm mb-10" style={{ color: "#5C6B62" }} delay={0.1}>
          ثلاث ركائز نبني عليها كل طبق.
        </Words>

        <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => {
            const Icon = PILLAR_ICONS[i];
            return (
              <div
                key={p.title}
                className="rounded-3xl p-7"
                style={{ background: "#FFFFFF", border: "1px solid #E4DCCB" }}
              >
                <span
                  className="rounded-2xl flex items-center justify-center mb-5"
                  style={{ width: 52, height: 52, background: BRAND.lime, color: BRAND.ink }}
                >
                  <Icon size={24} />
                </span>
                <div className="text-lg font-extrabold mb-1">{p.title}</div>
                <div className="text-[11px] font-bold mb-3" style={{ color: BRAND.limeDeep }}>{p.titleEn}</div>
                <p className="text-sm leading-relaxed" style={{ color: "#5C6B62" }}>{p.body}</p>
              </div>
            );
          })}
        </Reveal>
      </section>

      {/* ---------- ثلاث خطوات ---------- */}
      <section style={{ background: BRAND.forest }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <Words className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ color: "#FFFFFF" }}>
            ثلاث خطوات..
          </Words>
          <Words className="text-2xl sm:text-3xl font-extrabold mb-10" style={{ color: BRAND.lime }} delay={0.12}>
            لين هدفك.
          </Words>

          <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-3xl p-7 relative overflow-hidden"
                style={{ background: BRAND.forestLight, border: "1px solid #FFFFFF14" }}
              >
                <span
                  className="absolute top-5 left-6 text-5xl font-extrabold leading-none select-none"
                  style={{ color: "#FFFFFF0F" }}
                >
                  {s.n}
                </span>
                <div className="text-lg font-extrabold mb-1.5" style={{ color: "#FFFFFF" }}>{s.title}</div>
                <p className="text-sm" style={{ color: BRAND.sage }}>{s.body}</p>
              </div>
            ))}
          </Reveal>

          <Link
            href="/order-app/onboarding"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold mt-10 transition-transform hover:scale-[1.03]"
            style={{ background: BRAND.lime, color: BRAND.ink }}
          >
            ابدأ من هنا <ArrowLeft size={16} />
          </Link>
        </div>
      </section>

      {/* ---------- المنيو ---------- */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <div className="rounded-[2rem] overflow-hidden grid grid-cols-1 lg:grid-cols-2" style={{ background: BRAND.forest }}>
          <Parallax className="relative h-60 lg:h-auto lg:min-h-[320px] order-1 lg:order-2" amount={6}>
            <Image
              src="/brand/menu-bowl.jpg"
              alt="أطباق المنيو"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </Parallax>
          <Reveal className="p-8 sm:p-12 order-2 lg:order-1">
            <span
              className="inline-block rounded-full px-3 py-1 text-[10px] font-bold mb-5"
              style={{ border: `1px solid ${BRAND.lime}55`, color: BRAND.lime }}
            >
              منيو الأسبوع
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-4">
              <span style={{ color: "#FFFFFF" }}>منيو جديد..</span>
              <br />
              <span style={{ color: BRAND.lime }}>كل أسبوع.</span>
            </h2>
            <p className="text-sm leading-relaxed mb-7" style={{ color: BRAND.mist }}>
              أطباق على دورة أربعة أسابيع، عشان ما يتكرر عليك أسبوع.
            </p>
            <Link
              href="/menu"
              className="inline-block rounded-full px-6 py-3 text-sm font-extrabold"
              style={{ background: BRAND.lime, color: BRAND.ink }}
            >
              شوف المنيو
            </Link>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

