import Link from "next/link";
import { Check } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const PLANS = [
  {
    name: "أسبوعية",
    price: "210",
    period: "7 أيام",
    features: ["7 وجبات مطابقة لهدفك", "توصيل يومي", "تغيير الوجبات بمرونة", "إيقاف/إلغاء فوري"],
    highlight: false,
  },
  {
    name: "شهرية",
    price: "900",
    period: "30 يوم",
    features: ["30 وجبة مطابقة لهدفك", "توصيل يومي", "استشارة تغذية مجانية", "تتبع تقدمك بالوزن", "إيقاف/إلغاء فوري", "أولوية بالدعم"],
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div style={{ background: "#FCF6F2", color: "#2B1B14" }} className="min-h-screen w-full">
      <SiteNav />

      <div className="max-w-3xl mx-auto px-6 py-14 text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ color: "#A84F2E" }}>الأسعار</h1>
        <p className="text-sm" style={{ color: "#7A6153" }}>سعر واحد واضح، بدون رسوم مخفية أو خصومات وهمية</p>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className="rounded-2xl p-6"
            style={{
              background: p.highlight ? "linear-gradient(135deg, #A84F2E, #D67A4F)" : "white",
              border: p.highlight ? "none" : "1px solid #F0DFD3",
              color: p.highlight ? "white" : "#2B1B14",
            }}
          >
            {p.highlight && (
              <span className="text-[10px] font-bold rounded-full px-3 py-1 bg-white/20 inline-block mb-3">الأكثر توفيراً</span>
            )}
            <div className="text-base font-bold mb-1">{p.name}</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-extrabold">{p.price}</span>
              <span className="text-sm">﷼</span>
            </div>
            <div className="text-xs mb-5" style={{ color: p.highlight ? "rgba(255,255,255,0.85)" : "#7A6153" }}>
              لكل {p.period}
            </div>
            <div className="space-y-2.5 mb-6">
              {p.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs font-medium">
                  <Check size={14} style={{ color: p.highlight ? "white" : "#2E9E6D" }} />
                  {f}
                </div>
              ))}
            </div>
            <Link
              href="/order-app/onboarding"
              className="block text-center rounded-full py-3 text-sm font-bold"
              style={{
                background: p.highlight ? "white" : "#D67A4F",
                color: p.highlight ? "#A84F2E" : "white",
              }}
            >
              ابدأ الآن
            </Link>
          </div>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
