"use client";

// شريط التنقّل العام — على الأخضر الغامق، بالشعار الأفقي ونسخة الداكن منه،
// وزر الفعل ليموني بنص حبري كما في دليل الهوية.

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BRAND, LOGO } from "@/lib/brand";

const NAV = [
  { href: "/menu", label: "المنيو" },
  { href: "/pricing", label: "الباقات" },
  { href: "/about", label: "كيف نشتغل" },
  { href: "/order-app", label: "التطبيق" },
  { href: "/contact", label: "تواصل" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full sticky top-0 z-30" style={{ background: BRAND.forest }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-[68px] flex items-center justify-between gap-4">
        {/* الشعار يمين في RTL */}
        <Link href="/" className="shrink-0" aria-label="Macro Meals — الرئيسية">
          <Image
            src={LOGO.onDark}
            alt="Macro Meals"
            width={168}
            height={37}
            priority
            className="h-[26px] sm:h-[30px] w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm font-bold transition-opacity hover:opacity-100"
                style={{ color: active ? BRAND.lime : "#FFFFFF", opacity: active ? 1 : 0.82 }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/order-app/onboarding"
            className="rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap"
            style={{ background: BRAND.lime, color: BRAND.ink }}
          >
            اطلب الآن
          </Link>
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            className="md:hidden rounded-lg p-1.5"
            style={{ color: "#FFFFFF" }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t" style={{ borderColor: "#FFFFFF1A" }}>
          <div className="max-w-6xl mx-auto px-5 py-2">
            {NAV.map((n) => {
              const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-bold"
                  style={{ color: active ? BRAND.lime : "#FFFFFFD9" }}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
