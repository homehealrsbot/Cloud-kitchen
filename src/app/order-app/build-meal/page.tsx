import { redirect } from "next/navigation";
import { getProfile } from "../profile-actions";
import BuildMealPicker, { type PickerIngredient } from "@/components/order/BuildMealPicker";
import NotConfigured from "@/components/auth/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ALLERGENS, ING_TYPE_LABEL, type AllergenKey } from "@/lib/ops/engine";
import ingredientsJson from "@/data/ops/ingredients.json";
import type { Ingredient } from "@/lib/ops/engine";

export const dynamic = "force-dynamic";
export const metadata = { title: "ابنِ وجبتك — Macro Meals" };

// قبل: 12 مكوّناً مكتوبة في الكود بقيم غذائية منفصلة عن قاعدة المكوّنات الحقيقية.
// الآن نفس الـ80 مكوّن اللي يستخدمها المطبخ، بنفس القيم والحساسيات.
export default async function BuildMealPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/order-app/build-meal");

  const labelByKey = new Map<string, string>(ALLERGENS.map((a) => [a.key, a.label]));

  const items: PickerIngredient[] = (ingredientsJson as Ingredient[])
    .filter((i) => i.kcal > 0)
    .map((i) => ({
      key: i.key,
      name: i.name,
      kcal: i.kcal,
      protein: i.protein,
      // نحوّل أعلام الحساسية إلى أسماء عربية مطابقة لما اختاره العميل في ملفه
      allergens: (Object.keys(i.flags) as AllergenKey[])
        .filter((k) => i.flags[k])
        .map((k) => labelByKey.get(k) ?? k),
    }));

  return (
    <BuildMealPicker
      ingredients={items}
      allergies={profile.allergies}
      typeLabels={ING_TYPE_LABEL}
    />
  );
}
