"use client";

// قشرة تطبيق العميل — مأخوذة من شاشات التطبيق في دليل الهوية.
//
// البنية: رأس غابي بزوايا سفلية مدوّرة، جسم كريمي، وشريط تبويب سفلي أبيض.
// الشاشات كانت كل وحدة تبني رأسها بنفسها، فطلع التطبيق مثل مجموعة صفحات
// مو مثل تطبيق واحد.

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarDays, Home, UserRound, UtensilsCrossed } from "lucide-react";
import { BRAND, LOGO } from "@/lib/brand";
import { T } from "@/lib/kitchen-shared";

const TABS = [
  { href: "/order-app", label: "الرئيسية", icon: Home },
  { href: "/order-app/build-meal", label: "ابنِ وجبتك", icon: UtensilsCrossed },
  { href: "/order-app/subscription", label: "خطتي", icon: CalendarDays },
  { href: "/order-app/health-profile", label: "حسابي", icon: UserRound },
] as const;

export function AppTabs() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t"
      style={{ background: T.surface, borderColor: T.border }}
    >
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-1 py-2.5"
              style={{ color: active ? BRAND.forest : T.inkSoft }}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
              <span className={`text-[10px] ${active ? "font-extrabold" : "font-semibold"}`}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * رأس غابي. `heading` هو العنوان الكبير، و`children` محتوى إضافي داخل الرأس
 * (بطاقة ماكروز اليوم مثلاً).
 */
export function AppHeader({
  kicker,
  heading,
  children,
}: {
  kicker?: string;
  heading: string;
  children?: ReactNode;
}) {
  return (
    <header
      className="rounded-b-[28px] px-5 pt-5 pb-6"
      style={{ background: BRAND.forest }}
    >
      <div className="max-w-md mx-auto">
        {/* الاتجاه عربي: التحية على اليمين والرمز على اليسار، مثل الشاشة في الدليل */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            {kicker && <div className="text-xs mb-0.5" style={{ color: BRAND.sage }}>{kicker}</div>}
            <div className="text-xl font-extrabold leading-none" style={{ color: "#FFFFFF" }}>{heading}</div>
          </div>
          <Image src={LOGO.symbolOnDark} alt="Macro Meals" width={38} height={38} priority />
        </div>
        {children}
      </div>
    </header>
  );
}

/** الغلاف الكامل: خلفية كريمية + مساحة أسفل للشريط + الشريط نفسه. */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full" style={{ background: T.bg, color: T.ink }}>
      <div className="pb-24">{children}</div>
      <AppTabs />
    </div>
  );
}
