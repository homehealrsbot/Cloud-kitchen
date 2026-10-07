import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Wallet, HeartPulse, Truck } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const FEATURES = [
  { icon: HeartPulse, title: "مطابقة صحية ذكية", desc: "وجباتك تُختار بناءً على هدفك ووزنك وحساسياتك — مو قائمة عامة واحدة للجميع." },
  { icon: ShieldCheck, title: "مطابقة القيم الغذائية الفعلية", desc: "نوثّق كل دفعة فعلياً قبل التسليم — القيم المكتوبة نفسها الموجودة بالوجبة." },
  { icon: Wallet, title: "محفظة مسبقة الدفع", desc: "تدفع الباقة مرة وحدة، والوجبات تُخصم يومياً تلقائياً — بدون أي دفعات إضافية." },
  { icon: Truck, title: "توصيل موثّق", desc: "كل تسليم يوثّق بموقع فعلي — يحمي طلبك ويضمن وصوله صح." },
];

export default function Home() {
  return (
    <div style={{ background: "#FCF6F2", color: "#2B1B14" }} className="min-h-screen w-full">
      <SiteNav />

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <Image src="/logo-mark.png" alt="Macro meals" width={80} height={80} className="rounded-2xl mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#A84F2E" }}>
          وجبات صحية تُطابق جسمك، لا تُفرض عليك
        </h1>
        <p className="text-sm md:text-base mb-8 max-w-xl mx-auto" style={{ color: "#7A6153" }}>
          اشتراك وجبات يومي مبني على هدفك الصحي الفعلي — تحضير طازج، مطابقة غذائية موثّقة، وتحكم كامل بيدك.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/order-app/onboarding" className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ background: "#D67A4F" }}>
            ابدأ اشتراكك الآن
          </Link>
          <Link href="/menu" className="rounded-full px-6 py-3 text-sm font-bold" style={{ border: "1px solid #F0DFD3", color: "#2B1B14" }}>
            تصفح القائمة
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl p-5 flex items-start gap-3.5" style={{ background: "white", border: "1px solid #F0DFD3" }}>
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: "#FBEEE6", color: "#A84F2E" }}>
                <f.icon size={20} />
              </div>
              <div>
                <div className="text-sm font-bold mb-1">{f.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: "#7A6153" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA band */}
      <div className="w-full py-14" style={{ background: "linear-gradient(135deg, #A84F2E, #D67A4F)" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-xl md:text-2xl font-extrabold text-white mb-3">جاهز تبدأ؟</h2>
          <p className="text-sm text-white/90 mb-6">خطتك تتحدد بدقيقتين، ووجبتك الأولى توصلك بكرة</p>
          <Link href="/order-app/onboarding" className="inline-block rounded-full px-7 py-3 text-sm font-bold" style={{ background: "white", color: "#A84F2E" }}>
            ابدأ اشتراكك
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
