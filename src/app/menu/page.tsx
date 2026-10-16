// صفحة القائمة العامة — تقرأ الأصناف المعتمدة من قاعدة البيانات.
//
// قبل: 4 أصناف مكتوبة في الكود مع وسوم مثل "الأكثر طلباً" ما لها أساس في أي بيانات.

import Link from "next/link";
import { Flame, UtensilsCrossed } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SmoothScroll from "@/components/motion/SmoothScroll";
import HeroStage from "@/components/motion/HeroStage";
import { Reveal, Words } from "@/components/motion/Reveal";
import SiteFooter from "@/components/SiteFooter";
import Image from "next/image";
import { T } from "@/lib/kitchen-shared";
import { BRAND } from "@/lib/brand";
import { MacroChip } from "@/components/brand/Macro";
import { mealPhoto } from "@/lib/brand-photo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { computeMenu, type Ingredient, type MenuItem, type RecipeLine, type Settings } from "@/lib/ops/engine";
import baseSettings from "@/data/ops/settings.json";

export const dynamic = "force-dynamic";

async function loadMenu() {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("ops_menu_items").select("*").neq("active", false);
  if (!data || data.length === 0) return [];

  const [{ default: ingredients }, { default: recipes }] = await Promise.all([
    import("@/data/ops/ingredients.json"),
    import("@/data/ops/recipes.json"),
  ]);

  const items: MenuItem[] = data.map((m) => ({
    id: String(m.id), active: true, section: String(m.section ?? ""), category: String(m.category ?? ""),
    name: String(m.name ?? ""), nameEn: String(m.name_en ?? ""), cuisine: String(m.cuisine ?? ""),
    identity: String(m.identity ?? ""), shelfLifeH: Number(m.shelf_life_h ?? 0),
    reheat: "", opsNote: "", method: "", engGroup: String(m.eng_group ?? ""),
  }));
  const ids = new Set(items.map((m) => m.id));

  return computeMenu({
    ingredients: (ingredients as Omit<Ingredient, "active">[]).map((i) => ({ ...i, active: true })),
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
      <SmoothScroll />
      <SiteNav />

      {/* بنر المنيو */}
      <HeroStage
        tone="dark"
        image={
          <Image
            src="/brand/hero-steak-bowl.jpg"
            alt="طبق ستيك مع الهليون والطماطم والبطاطس"
            fill
            priority
            sizes="100vw"
            quality={90}
            className="object-cover scale-x-[-1] [object-position:40%_50%]"
          />
        }
      >
        <span
          className="inline-block rounded-full px-3 py-1 text-[10px] font-bold mb-5"
          style={{ border: `1px solid ${BRAND.lime}55`, color: BRAND.lime }}
        >
          منيو الأسبوع
        </span>
        <h1 className="text-[2.2rem] sm:text-5xl font-extrabold leading-[1.2] mb-4">
          <Words as="span" className="block" style={{ color: "#FFFFFF" }}>منيو جديد..</Words>
          <Words as="span" className="block" style={{ color: BRAND.lime }} delay={0.12}>كل أسبوع.</Words>
        </h1>
        <p className="text-sm leading-relaxed max-w-md" style={{ color: "#FFFFFFA6" }}>
          {meals.length > 0
            ? `${meals.length} طبق معتمد، والقيم الغذائية محسوبة من الوصفة الفعلية لكل صنف — لا تقديرات.`
            : "المنيو قيد التجهيز."}
        </p>
      </HeroStage>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14">
        {meals.length === 0 ? (
          <div className="rounded-2xl p-10 text-center max-w-md mx-auto" style={{ background: "white", border: `1px solid ${T.border}` }}>
            <UtensilsCrossed size={30} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
            <div className="text-sm font-bold mb-1">ما فيه أصناف معتمدة للنشر حالياً</div>
            <p className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
              ما ينشر أي صنف إلا بعد اعتماد كل بوابات الجودة النشطة.
            </p>
          </div>
        ) : (
          <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" stagger={0.06}>
            {meals.map((m) => (
              <div
                key={m.item.id}
                className="rounded-3xl overflow-hidden flex flex-col"
                style={{ background: "white", border: `1px solid ${T.border}` }}
              >
                <div className="relative h-40" style={{ background: BRAND.forest }}>
                  <Image
                    src={mealPhoto(m.item.id)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover opacity-95"
                  />
                  <span
                    className="absolute top-3 right-3 text-[10px] font-bold rounded-full px-2.5 py-1"
                    style={{ background: BRAND.cream, color: BRAND.ink }}
                  >
                    {m.item.section}
                  </span>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="text-sm font-extrabold leading-snug">{m.item.name}</div>
                  {m.item.nameEn && (
                    <div className="text-[11px] mt-0.5" dir="ltr" style={{ color: T.inkSoft }}>{m.item.nameEn}</div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs mt-2.5 mb-3" style={{ color: T.inkSoft }}>
                    <Flame size={13} style={{ color: BRAND.orange }} />
                    <span className="num font-bold">{Math.round(m.kcal)}</span> سعرة
                  </div>

                  <div className="flex gap-1.5">
                    <MacroChip macro="protein" value={Math.round(m.protein)} />
                    <MacroChip macro="carbs" value={Math.round(m.carb)} />
                    <MacroChip macro="fat" value={Math.round(m.fat)} />
                  </div>

                  {m.allergens !== "لا يوجد" && (
                    <div className="text-[11px] mt-3" style={{ color: T.warn }}>يحتوي: {m.allergens}</div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4">
                    <span className="num text-base font-extrabold" style={{ color: T.brand }}>{m.price} ﷼</span>
                    <Link
                      href="/order-app/onboarding"
                      className="text-xs font-extrabold rounded-full px-4 py-2"
                      style={{ background: T.brandBright, color: T.onBright }}
                    >
                      اطلب الآن
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </Reveal>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
