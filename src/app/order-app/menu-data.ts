// قراءة المنيو لتطبيق العميل — مكان واحد تستخدمه الشاشة الرئيسية وصفحة الصنف.
//
// سياسة RLS على ops_menu_items هي اللي تحجب غير المعتمد؛ ما نفلتر هنا باليد.
// الوصفة (الجرامات والطريقة والتكلفة) محجوبة عن العميل، فنحسب القيم الغذائية
// على الخادم من نسخة المكوّنات المرفقة مع البناء، ونرجّع للعميل أسماء المكوّنات
// فقط — نفس اللي يوجد على أي ملصق غذائي، بدون أي رقم من الوصفة.

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeMenu, type Ingredient, type MenuItem, type RecipeLine, type Settings } from "@/lib/ops/engine";
import baseSettings from "@/data/ops/settings.json";
import { mealPhoto } from "@/lib/brand-photo";
import type { CustomerMealDetail } from "@/components/order/MealDetail";

export async function loadCustomerMenu(): Promise<CustomerMealDetail[]> {
  const supabase = await createClient();
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
    opsNote: "",
    method: "",
    engGroup: String(m.eng_group ?? ""),
  }));

  const approvedIds = new Set(items.map((m) => m.id));
  const computed = computeMenu({
    ingredients: ingredients as Ingredient[],
    recipes: (recipes as RecipeLine[]).filter((r) => approvedIds.has(r.sku)),
    menu: items,
    rotation: { slotLabels: [], slotRule: [], days: [], rules: "" },
    settings: baseSettings as unknown as Settings,
    // الصفحة ما تحسب اعتمادات: RLS أصلاً ما ترجّع إلا المعتمد.
    gateDefs: [],
    ingApprovalDefs: [],
  });

  return computed.map((c) => ({
    id: c.item.id,
    name: c.item.name,
    nameEn: c.item.nameEn,
    section: c.item.section,
    kcal: Math.round(c.kcal),
    protein: Math.round(c.protein),
    carb: Math.round(c.carb),
    fat: Math.round(c.fat),
    price: c.price,
    allergens: c.allergens,
    photo: mealPhoto(c.item.id),
    grams: Math.round(c.rawWeight),
    reheat: c.item.reheat,
    shelfLifeH: c.item.shelfLifeH,
    // أسماء فقط — بدون جرامات ولا ترتيب الوصفة
    ingredientNames: c.lines.filter((l) => !l.missing).map((l) => l.name),
  }));
}
