import Link from "next/link";
import Image from "next/image";
import { Leaf, Scale, Target, ArrowLeft } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { BRAND, ESSENCE, MACRO, PILLARS, STEPS } from "@/lib/brand";

export const metadata = {
  title: "Macro Meals — أكل حقيقي.. ماكروز محسوبة",
  description:
    "وجبات يطبخها شيفاتنا طازجة كل يوم، البروتين والكارب والدهون محسوبة على هدفك، وتوصلك لباب بيتك.",
};

const PILLAR_ICONS = [Leaf, Scale, Target];

export default function Home() {
  return (
    <div className="min-h-screen w-full" style={{ background: BRAND.cream, color: BRAND.ink }}>
      <SiteNav />

      {/* ---------- البنر الرئيسي ---------- */}
      <section style={{ background: BRAND.forest }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-6 py-12 lg:py-0">
          {/* النص — يمين في RTL */}
          <div className="lg:py-20 order-2 lg:order-1">
            <span
              className="inline-block rounded-full px-3.5 py-1.5 text-[11px] font-bold mb-6"
              style={{ border: `1px solid ${BRAND.lime}55`, color: BRAND.lime }}
            >
              يطبخها شيف · ماكروز محسوبة · طازجة يومياً
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.15] mb-5">
              <span style={{ color: "#FFFFFF" }}>{ESSENCE.ar.line1}</span>
              <br />
              <span style={{ color: BRAND.lime }}>{ESSENCE.ar.line2}</span>
            </h1>

            <p className="text-sm sm:text-base leading-relaxed mb-8 max-w-md" style={{ color: BRAND.mist }}>
              وجبات يطبخها شيفاتنا، البروتين والكارب والدهون محسوبة على هدفك،
              وتوصلك طازجة لباب بيتك.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/order-app/onboarding"
                className="rounded-full px-7 py-3.5 text-sm font-extrabold"
                style={{ background: BRAND.lime, color: BRAND.ink }}
              >
                ابنِ خطتك
              </Link>
              <Link
                href="/menu"
                className="rounded-full px-7 py-3.5 text-sm font-extrabold"
                style={{ border: "1.5px solid #FFFFFF59", color: "#FFFFFF" }}
              >
                شوف المنيو
              </Link>
            </div>

            <div className="flex items-center gap-5 sm:gap-7 mt-9 flex-wrap text-[11px] font-bold" style={{ color: BRAND.sage }}>
              <span className="flex items-center gap-1.5"><Target size={13} style={{ color: BRAND.lime }} /> بروتين عالي</span>
              <span className="flex items-center gap-1.5"><Leaf size={13} style={{ color: BRAND.lime }} /> مكونات طازجة</span>
              <span className="flex items-center gap-1.5"><Scale size={13} style={{ color: BRAND.lime }} /> ماكروز متوازنة</span>
            </div>
          </div>

          {/* الصورة — يسار في RTL، تنزف خارج الحاوية على الشاشات الكبيرة */}
          <div className="order-1 lg:order-2 relative lg:h-[520px]">
            <div className="relative h-56 sm:h-80 lg:h-full lg:-mx-16">
              <Image
                src="/brand/hero-bowl.jpg"
                alt="بول الدجاج المشوي مع الخضار والحبوب"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover lg:object-contain object-center"
              />
            </div>

            {/* شارة الماكروز — نفس كود الألوان في كل مكان */}
            <div
              className="absolute bottom-0 right-0 lg:right-4 rounded-2xl px-3.5 py-3 shadow-lg"
              style={{ background: BRAND.cream }}
            >
              <div className="text-[11px] font-extrabold mb-2">بول الدجاج المشوي</div>
              <div className="flex gap-1.5">
                <MacroChip macro="protein" value={42} />
                <MacroChip macro="carbs" value={18} />
                <MacroChip macro="fat" value={12} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- الركائز ---------- */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">ليش ماكرو ميلز</h2>
        <p className="text-sm mb-10" style={{ color: "#5C6B62" }}>ثلاث ركائز نبني عليها كل طبق.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
        </div>
      </section>

      {/* ---------- ثلاث خطوات ---------- */}
      <section style={{ background: BRAND.forest }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ color: "#FFFFFF" }}>
            ثلاث خطوات..
          </h2>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-10" style={{ color: BRAND.lime }}>
            لين هدفك.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          <Link
            href="/order-app/onboarding"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold mt-10"
            style={{ background: BRAND.lime, color: BRAND.ink }}
          >
            ابدأ من هنا <ArrowLeft size={16} />
          </Link>
        </div>
      </section>

      {/* ---------- المنيو ---------- */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <div className="rounded-[2rem] overflow-hidden grid grid-cols-1 lg:grid-cols-2" style={{ background: BRAND.forest }}>
          <div className="relative h-60 lg:h-auto lg:min-h-[320px] order-1 lg:order-2">
            <Image
              src="/brand/menu-bowl.jpg"
              alt="أطباق المنيو"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="p-8 sm:p-12 order-2 lg:order-1">
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
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/** شارة ماكرو — نفس كود الألوان في الموقع والتطبيق والملصق. */
function MacroChip({ macro, value }: { macro: keyof typeof MACRO; value: number }) {
  const m = MACRO[macro];
  return (
    <span
      className="rounded-lg px-2.5 py-1.5 text-center leading-none"
      style={{ background: m.bg, color: m.fg, border: macro === "fat" ? "1px solid #E4DCCB" : undefined }}
    >
      <span className="num block text-sm font-extrabold">{value}g</span>
      <span className="block text-[9px] font-bold mt-0.5">{m.label}</span>
    </span>
  );
}
