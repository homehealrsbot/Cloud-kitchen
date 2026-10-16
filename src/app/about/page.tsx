import Image from "next/image";
import { Target, ShieldCheck, Users, Sparkles } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SmoothScroll from "@/components/motion/SmoothScroll";
import HeroStage from "@/components/motion/HeroStage";
import { Reveal, Words } from "@/components/motion/Reveal";
import SiteFooter from "@/components/SiteFooter";
import { T } from "@/lib/kitchen-shared";
import { BRAND } from "@/lib/brand";

const VALUES = [
  { icon: ShieldCheck, title: "شفافية كاملة", desc: "القيم الغذائية المكتوبة نفسها الموجودة بالوجبة — نوثّق كل دفعة قبل ما تطلع من المطبخ." },
  { icon: Users, title: "تحكم بيدك", desc: "إيقاف أو إلغاء اشتراكك فوري وذاتي، بدون اتصال أو موافقة من أحد." },
  { icon: Target, title: "مبني على هدفك", desc: "وجباتك تُطابق وزنك وهدفك الصحي فعلياً، مو تصنيف عام واحد للجميع." },
  { icon: Sparkles, title: "تقنية من الأساس", desc: "كل خطوة من التحضير للتوصيل مؤتمتة ومراقبة — نتائج ثابتة كل مرة." },
];

export default function AboutPage() {
  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <SmoothScroll />
      <SiteNav />

      <HeroStage
        image={
          <Image
            src="/brand/hero-salmon-tray.jpg"
            alt="صينية سلمون مع الكينوا والخضار المشوية"
            fill
            priority
            sizes="100vw"
            className="object-cover scale-x-[-1] [object-position:45%_55%]"
          />
        }
      >
        <span
          className="inline-block rounded-full px-3 py-1 text-[10px] font-bold mb-5"
          style={{ border: `1px solid ${BRAND.lime}55`, color: BRAND.lime }}
        >
          كيف نشتغل
        </span>
        <Words as="h1" className="text-[2.2rem] sm:text-5xl font-extrabold leading-[1.2] mb-4" style={{ color: "#FFFFFF" }}>
          من نحن
        </Words>
        <p className="text-sm leading-relaxed max-w-md" style={{ color: "#FFFFFFA6" }}>
          مطبخ سحابي متخصص باشتراكات الوجبات الصحية اليومية. ما نقدم قائمة عامة
          واحدة للجميع — نبني خطتك من هدفك الصحي الفعلي، ونجهزها طازجة كل يوم،
          ونوثّق كل خطوة من التحضير للتوصيل.
        </p>
      </HeroStage>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl p-5 flex items-start gap-3.5" style={{ background: "white", border: `1px solid ${T.border}` }}>
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: T.brandTint, color: T.brand }}>
                <v.icon size={20} />
              </div>
              <div>
                <div className="text-sm font-bold mb-1">{v.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </Reveal>
      </div>

      <SiteFooter />
    </div>
  );
}
