// تطبيق العميل — المنيو يجي من قاعدة البيانات.
//
// ما يظهر هنا إلا الأصناف المعتمدة من كل بوابة نشطة. الفلترة تفرضها سياسة
// RLS في قاعدة البيانات نفسها، مو كود الواجهة — يعني ما ينفع تجاوزها من المتصفح.

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/auth";
import MenuList from "@/components/order/MenuList";
import AppShell, { AppHeader } from "@/components/order/AppShell";
import NotConfigured from "@/components/auth/NotConfigured";
import { loadCustomerMenu } from "./menu-data";
import { getProfile } from "./profile-actions";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/order-app/delivery-days", label: "أيام التوصيل" },
  { href: "/order-app/wallet", label: "باقتي" },
  { href: "/order-app/progress", label: "تتبع تقدمي" },
  { href: "/order-app/consultation", label: "استشارة تغذية" },
];

export default async function OrderApp() {
  if (!isSupabaseConfigured) return <NotConfigured />;

  const [user, meals, profile] = await Promise.all([getCurrentUser(), loadCustomerMenu(), getProfile()]);

  // التحية من صف العميل نفسه — ما نخترع اسماً ولا هدفاً ما سجّله
  const name = (profile?.fullName ?? "").trim();
  const kicker = profile?.healthGoal ? `هدفك: ${profile.healthGoal}` : undefined;

  return (
    <AppShell>
      {meals.length === 0 ? (
        <>
          <AppHeader kicker={kicker ?? "أكل حقيقي.. ماكروز محسوبة."} heading={name || "ماكرو ميلز"} />
          <main className="max-w-md mx-auto px-5 pt-6">
            <div className="rounded-2xl p-8 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <UtensilsCrossed size={32} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
              <div className="text-sm font-bold mb-1">القائمة قيد التجهيز</div>
              <p className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
                ما ينشر أي صنف للعميل إلا بعد اعتماده من كل بوابات الجودة النشطة.
              </p>
            </div>
          </main>
        </>
      ) : (
        <MenuList meals={meals} greetingName={name || "ماكرو ميلز"} kicker={kicker} signedIn={!!user} />
      )}

      <div className="max-w-md mx-auto px-5 pt-6">
        {!user ? (
          <Link
            href="/login"
            className="block text-center rounded-2xl py-3.5 text-sm font-extrabold"
            style={{ background: T.brandBright, color: T.onBright }}
          >
            سجّل دخولك عشان تبدأ خطتك
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-2xl py-3 text-center text-xs font-bold"
                style={{ background: T.surface, color: T.brand, border: `1px solid ${T.border}` }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
