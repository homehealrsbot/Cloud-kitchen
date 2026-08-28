import Link from "next/link";
import { Flame, Beef } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const MEALS = [
  { name: "صدر دجاج مشوي + أرز بني", kcal: 420, protein: 42, price: 32, tag: "الأكثر طلباً" },
  { name: "سلمون مشوي + كينوا", kcal: 460, protein: 38, price: 42, tag: "غني بالأوميغا 3" },
  { name: "شوفان بروتين + فواكه", kcal: 380, protein: 28, price: 22, tag: "مثالي للفطور" },
  { name: "سلطة دجاج + حمص وطحينة", kcal: 400, protein: 35, price: 28, tag: "خفيف ومشبع" },
];

function MealIcon() {
  return (
    <div
      className="w-full rounded-2xl flex items-center justify-center"
      style={{ height: 140, background: "linear-gradient(135deg, #FBEEE6, #FCF6F2)" }}
    >
      <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="34" fill="#D67A4F" opacity="0.18" />
        <circle cx="50" cy="50" r="24" stroke="#A84F2E" strokeWidth="4" fill="none" />
        <path d="M38 50 L46 58 L64 40" stroke="#A84F2E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

export default function MenuPage() {
  return (
    <div style={{ background: "#FCF6F2", color: "#2B1B14" }} className="min-h-screen w-full">
      <SiteNav />

      <div className="max-w-5xl mx-auto px-6 py-14 text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ color: "#A84F2E" }}>القائمة</h1>
        <p className="text-sm max-w-lg mx-auto" style={{ color: "#7A6153" }}>
          نماذج من وجباتنا — القائمة الكاملة تتحدث أسبوعياً وتُخصص حسب خطتك الصحية
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {MEALS.map((m) => (
            <div key={m.name} className="rounded-2xl p-4" style={{ background: "white", border: "1px solid #F0DFD3" }}>
              <MealIcon />
              <div className="flex items-center justify-between mt-3 mb-1">
                <div className="text-sm font-bold">{m.name}</div>
                <span className="text-[10px] font-bold rounded-full px-2 py-1" style={{ background: "#FBEEE6", color: "#A84F2E" }}>
                  {m.tag}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1 text-xs" style={{ color: "#7A6153" }}>
                  <Flame size={13} style={{ color: "#D67A4F" }} /> {m.kcal} سعرة
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: "#7A6153" }}>
                  <Beef size={13} style={{ color: "#A84F2E" }} /> {m.protein}غ بروتين
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold" style={{ color: "#A84F2E" }}>{m.price} ﷼</span>
                <Link href="/order-app/onboarding" className="text-xs font-bold rounded-full px-4 py-2 text-white" style={{ background: "#D67A4F" }}>
                  اطلبها ضمن اشتراكك
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
