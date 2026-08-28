import Link from "next/link";
import Image from "next/image";

export default function SiteFooter() {
  return (
    <div className="w-full border-t mt-16" style={{ borderColor: "#F0DFD3", background: "#FFFFFF" }}>
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-mark.png" alt="Food Style" width={32} height={32} className="rounded-lg" />
          <span className="font-bold text-sm" style={{ color: "#A84F2E" }}>Food Style</span>
        </div>
        <div className="flex items-center gap-5 text-xs font-semibold" style={{ color: "#7A6153" }}>
          <Link href="/about">من نحن</Link>
          <Link href="/menu">القائمة</Link>
          <Link href="/pricing">الأسعار</Link>
          <Link href="/contact">تواصل معنا</Link>
        </div>
        <div className="text-[11px]" style={{ color: "#7A6153" }}>
          نظام تشغيل: Food Style — مبني بواسطة سَلِس حلول
        </div>
      </div>
    </div>
  );
}
