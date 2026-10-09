import Link from "next/link";
import Image from "next/image";
import { BRAND, ESSENCE, LOGO } from "@/lib/brand";

export default function SiteFooter() {
  return (
    <footer className="w-full" style={{ background: BRAND.forest, color: "#FFFFFF" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-9">
          <div className="max-w-xs">
            <Image src={LOGO.onDark} alt="Macro Meals" width={180} height={40} className="h-8 w-auto mb-4" />
            <p className="text-sm leading-relaxed" style={{ color: BRAND.sage }}>
              {ESSENCE.ar.line1} {ESSENCE.ar.line2}
            </p>
          </div>

          <div className="flex gap-12 sm:gap-16">
            <div>
              <div className="text-[11px] font-bold mb-3" style={{ color: BRAND.lime }}>المنصة</div>
              <div className="flex flex-col gap-2.5 text-sm" style={{ color: "#FFFFFFCC" }}>
                <Link href="/menu">المنيو</Link>
                <Link href="/pricing">الباقات</Link>
                <Link href="/order-app">التطبيق</Link>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold mb-3" style={{ color: BRAND.lime }}>العلامة</div>
              <div className="flex flex-col gap-2.5 text-sm" style={{ color: "#FFFFFFCC" }}>
                <Link href="/about">كيف نشتغل</Link>
                <Link href="/contact">تواصل معنا</Link>
                <Link href="/login">دخول الفريق</Link>
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]"
          style={{ borderTop: "1px solid #FFFFFF1A", color: BRAND.sage }}
        >
          <span>© {new Date().getFullYear()} Macro Meals</span>
          <span>الماكروز اللي على الملصق هي نفسها اللي في الوجبة.</span>
        </div>
      </div>
    </footer>
  );
}
