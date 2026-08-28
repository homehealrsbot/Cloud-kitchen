import Image from "next/image";
import { Target, ShieldCheck, Users, Sparkles } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const VALUES = [
  { icon: ShieldCheck, title: "شفافية كاملة", desc: "القيم الغذائية المكتوبة نفسها الموجودة بالوجبة — نوثّق كل دفعة قبل ما تطلع من المطبخ." },
  { icon: Users, title: "تحكم بيدك", desc: "إيقاف أو إلغاء اشتراكك فوري وذاتي، بدون اتصال أو موافقة من أحد." },
  { icon: Target, title: "مبني على هدفك", desc: "وجباتك تُطابق وزنك وهدفك الصحي فعلياً، مو تصنيف عام واحد للجميع." },
  { icon: Sparkles, title: "تقنية من الأساس", desc: "كل خطوة من التحضير للتوصيل مؤتمتة ومراقبة — نتائج ثابتة كل مرة." },
];

export default function AboutPage() {
  return (
    <div style={{ background: "#FCF6F2", color: "#2B1B14" }} className="min-h-screen w-full">
      <SiteNav />

      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <Image src="/logo-mark.png" alt="Food Style" width={64} height={64} className="rounded-2xl mx-auto mb-5" />
        <h1 className="text-2xl md:text-3xl font-extrabold mb-4" style={{ color: "#A84F2E" }}>من نحن</h1>
        <p className="text-sm leading-relaxed" style={{ color: "#7A6153" }}>
          Food Style مطبخ سحابي متخصص باشتراكات الوجبات الصحية اليومية. ما نقدم قائمة عامة واحدة للجميع —
          نبني خطتك من هدفك الصحي الفعلي، ونجهزها طازجة كل يوم، ونوثّق كل خطوة من التحضير للتوصيل بأنظمة مؤتمتة
          مبنية خصيصاً لعملياتنا.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl p-5 flex items-start gap-3.5" style={{ background: "white", border: "1px solid #F0DFD3" }}>
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: "#FBEEE6", color: "#A84F2E" }}>
                <v.icon size={20} />
              </div>
              <div>
                <div className="text-sm font-bold mb-1">{v.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: "#7A6153" }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
