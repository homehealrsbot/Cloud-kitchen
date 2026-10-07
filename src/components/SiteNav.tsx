"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/about", label: "من نحن" },
  { href: "/menu", label: "القائمة" },
  { href: "/pricing", label: "الأسعار" },
  { href: "/contact", label: "تواصل معنا" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <div className="w-full border-b sticky top-0 z-20" style={{ borderColor: "#F0DFD3", background: "#FFFFFFEE", backdropFilter: "blur(6px)" }}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo-mark.png" alt="Macro meals" width={38} height={38} className="rounded-lg" />
          <span className="font-extrabold text-base" style={{ color: "#A84F2E" }}>Macro meals</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-semibold transition-colors"
              style={{ color: pathname === n.href ? "#A84F2E" : "#7A6153" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/order-app/onboarding"
          className="rounded-full px-4 py-2 text-xs font-bold text-white"
          style={{ background: "#D67A4F" }}
        >
          ابدأ اشتراكك
        </Link>
      </div>
      {/* شريط تنقل مبسط للجوال */}
      <div className="md:hidden max-w-5xl mx-auto px-6 pb-3 flex items-center gap-4 overflow-x-auto">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="text-xs font-semibold shrink-0"
            style={{ color: pathname === n.href ? "#A84F2E" : "#7A6153" }}
          >
            {n.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
