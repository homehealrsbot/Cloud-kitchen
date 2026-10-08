// صفحة القائمة العامة — تقرأ الأصناف المعتمدة من قاعدة البيانات.
//
// قبل: 4 أصناف مكتوبة في الكود مع وسوم مثل "الأكثر طلباً" ما لها أساس في أي بيانات.

import Link from "next/link";
import { Beef, Flame, UtensilsCrossed } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { T } from "@/lib/kitchen-shared";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { computeMenu, type Ingredient, type MenuItem, type RecipeLine, type Settings } from "@/lib/ops/engine";
import baseSettings from "@/data/ops/settings.json";

export const dynamic = "force-dynamic";

function MealIcon() {
  return (
    <div className="w-full rounded-2xl flex items-center justify-center" style={{ height: 120, background: `linear-gradient(135deg, ${T.brandTint}, ${T.bg})` }}>
      <svg width="48" height="48" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle cx="50" cy="50" r="34" fill={T.brandBright} opacity="0.18" />
        <circle cx="50" cy="50" r="24" stroke={T.brand} strokeWidth="4" fill="none" />
        <path d="M38 50 L46 58 L64 40" stroke={T.brand} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

async function loadMenu() {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("ops_menu_items").select("*");
  if (!data || data.length === 0) return [];

  const [{ default: ingredients }, { default: recipes }] = await Promise.all([
    import("@/data/ops/ingredients.json"),
    import("@/data/ops/recipes.json"),
  ]);

  const items: MenuItem[] = data.map((m) => ({
    id: String(m.id), section: String(m.section ?? ""), category: String(m.category ?? ""),
    name: String(m.name ?? ""), nameEn: String(m.name_en ?? ""), cuisine: String(m.cuisine ?? ""),
    identity: String(m.identity ?? ""), shelfLifeH: Number(m.shelf_life_h ?? 0),
    reheat: "", opsNote: "", method: "", engGroup: String(m.eng_group ?? ""),
  }));
  const ids = new Set(items.map((m) => m.id));

  return computeMenu({
    ingredients: ingredients as Ingredient[],
    recipes: (recipes as RecipeLine[]).filter((r) => ids.has(r.sku)),
    menu: items,
    rotation: { slotLabels: [], slotRule: [], days: [], rules: "" },
    settings: baseSettings as unknown as Settings,
    // الصفحة العامة ما تحسب اعتمادات: سياسة RLS على ops_menu_items أصلاً ما
    // ترجّع إلا الأصناف اللي كل بواباتها النشطة معتمدة، فاللي يوصل هنا مُعتمد.
    gateDefs: [],
    ingApprovalDefs: [],
  });
}

export default async function MenuPage() {
  const meals = await loadMenu();

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <SiteNav />

      <div className="max-w-5xl mx-auto px-6 py-14 text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ color: T.brand }}>القائمة</h1>
        <p className="text-sm max-w-lg mx-auto" style={{ color: T.inkSoft }}>
          {meals.length > 0
            ? "أصنافنا المعتمدة — القيم الغذائية محسوبة من الوصفة الفعلية لكل صنف"
            : "القائمة قيد التجهيز"}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        {meals.length === 0 ? (
          <div className="rounded-2xl p-10 text-center max-w-md mx-auto" style={{ background: "white", border: `1px solid ${T.border}` }}>
            <UtensilsCrossed size={30} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
            <div className="text-sm font-bold mb-1">ما فيه أصناف معتمدة للنشر حالياً</div>
            <p className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
              ما ينشر أي صنف إلا بعد اعتماد بوابات الجودة الثمانية كاملة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {meals.map((m) => (
              <div key={m.item.id} className="rounded-2xl p-4" style={{ background: "white", border: `1px solid ${T.border}` }}>
                <MealIcon />
                <div className="flex items-start justify-between gap-2 mt-3 mb-1">
                  <div className="text-sm font-bold">{m.item.name}</div>
                  <span className="text-[10px] font-bold rounded-full px-2 py-1 shrink-0" style={{ background: T.brandTint, color: T.brand }}>
                    {m.item.section}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1 text-xs" style={{ color: T.inkSoft }}>
                    <Flame size={13} style={{ color: T.brandBright }} /> {Math.round(m.kcal)} سعرة
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: T.inkSoft }}>
                    <Beef size={13} style={{ color: T.brand }} /> {Math.round(m.protein)}غ بروتين
                  </div>
                </div>
                {m.allergens !== "لا يوجد" && (
                  <div className="text-[11px] mb-2" style={{ color: T.warn }}>يحتوي: {m.allergens}</div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-extrabold" style={{ color: T.brand }}>{m.price} ﷼</span>
                  <Link href="/signup" className="text-xs font-bold rounded-full px-4 py-2 text-white" style={{ background: T.brandBright }}>
                    ابدأ اشتراكك
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
