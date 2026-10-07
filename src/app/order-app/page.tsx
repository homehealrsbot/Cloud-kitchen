// تطبيق العميل — المنيو يجي من قاعدة البيانات.
//
// ما يظهر هنا إلا الأصناف المعتمدة بالكامل (8 بوابات جودة). الفلترة تفرضها سياسة
// RLS في قاعدة البيانات نفسها، مو كود الواجهة — يعني ما ينفع تجاوزها من المتصفح.

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { computeMenu, type Ingredient, type MenuItem, type RecipeLine, type Settings } from "@/lib/ops/engine";
import baseSettings from "@/data/ops/settings.json";
import MenuList, { type CustomerMeal } from "@/components/order/MenuList";
import NotConfigured from "@/components/auth/NotConfigured";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/order-app/health-profile", label: "ملفي الصحي" },
  { href: "/order-app/build-meal", label: "ابنِ وجبتك" },
  { href: "/order-app/delivery-days", label: "أيام التوصيل" },
  { href: "/order-app/wallet", label: "باقتي" },
  { href: "/order-app/progress", label: "تتبع تقدمي" },
  { href: "/order-app/subscription", label: "إدارة اشتراكي" },
  { href: "/order-app/consultation", label: "استشارة تغذية" },
];

async function loadApprovedMeals(): Promise<CustomerMeal[]> {
  const supabase = await createClient();

  // RLS ترجّع الأصناف المعتمدة فقط. الوصفات والمكوّنات محجوبة عن العميل،
  // فنحسب القيم الغذائية من نسخة المكوّنات العامة المرفقة مع التطبيق.
  const { data: menu } = await supabase.from("ops_menu_items").select("*");
  if (!menu || menu.length === 0) return [];

  const [{ default: ingredients }, { default: recipes }] = await Promise.all([
    import("@/data/ops/ingredients.json"),
    import("@/data/ops/recipes.json"),
  ]);

  const items: MenuItem[] = menu.map((m) => ({
    id: String(m.id),
    section: String(m.section ?? ""),
    category: String(m.category ?? ""),
    name: String(m.name ?? ""),
    nameEn: String(m.name_en ?? ""),
    cuisine: String(m.cuisine ?? ""),
    identity: String(m.identity ?? ""),
    shelfLifeH: Number(m.shelf_life_h ?? 0),
    reheat: String(m.reheat ?? ""),
    opsNote: String(m.ops_note ?? ""),
    method: String(m.method ?? ""),
    engGroup: String(m.eng_group ?? ""),
  }));

  const approvedIds = new Set(items.map((m) => m.id));
  const computed = computeMenu({
    ingredients: ingredients as Ingredient[],
    recipes: (recipes as RecipeLine[]).filter((r) => approvedIds.has(r.sku)),
    menu: items,
    rotation: { slotLabels: [], slotRule: [], days: [], rules: "" },
    settings: baseSettings as unknown as Settings,
  });

  return computed.map((c) => ({
    id: c.item.id,
    name: c.item.name,
    section: c.item.section,
    kcal: Math.round(c.kcal),
    protein: Math.round(c.protein),
    price: c.price,
    allergens: c.allergens,
  }));
}

export default async function OrderApp() {
  if (!isSupabaseConfigured) return <NotConfigured />;

  const [user, meals] = await Promise.all([getCurrentUser(), loadApprovedMeals()]);

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-extrabold">اختر وجبتك</h1>
        {!user && (
          <Link href="/login" className="text-xs font-bold rounded-full px-3 py-1.5" style={{ background: T.brandTint, color: T.brand }}>
            تسجيل دخول
          </Link>
        )}
      </div>
      <p className="text-xs mb-4" style={{ color: T.inkSoft }}>
        {meals.length > 0
          ? `${meals.length} صنف معتمد للبيع`
          : "ما فيه أصناف معتمدة للبيع حالياً"}
      </p>

      {user && (
        <div className="flex gap-2 flex-wrap mb-5">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11px] font-bold rounded-full px-3 py-1.5"
              style={{ background: "white", color: T.brand, border: `1px solid ${T.border}` }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      {meals.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "white", border: `1px solid ${T.border}` }}>
          <UtensilsCrossed size={32} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
          <div className="text-sm font-bold mb-1">القائمة قيد التجهيز</div>
          <p className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
            ما ينشر أي صنف للعميل إلا بعد اعتماد بوابات الجودة الثمانية كاملة.
          </p>
        </div>
      ) : (
        <MenuList meals={meals} />
      )}
    </main>
  );
}
