// صفحة الصنف في تطبيق العميل.
//
// كل ما يظهر محسوب من الوصفة الفعلية على الخادم: السعرات والماكروز ووزن
// المكوّنات والحساسيات. الوصفة نفسها (الجرامات والطريقة والتكلفة) ما تُرسل
// للمتصفح — العميل يشوف أسماء المكوّنات فقط، مثل أي ملصق غذائي.

import { notFound } from "next/navigation";
import AppShell from "@/components/order/AppShell";
import MealDetail from "@/components/order/MealDetail";
import NotConfigured from "@/components/auth/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadCustomerMenu } from "../../menu-data";

export const dynamic = "force-dynamic";

export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const { id } = await params;

  const meals = await loadCustomerMenu();
  const meal = meals.find((m) => m.id === decodeURIComponent(id));
  // صنف غير معتمد ما يرجع من RLS أصلاً، فعدم وجوده هنا = غير موجود للعميل
  if (!meal) notFound();

  return (
    <AppShell>
      <MealDetail meal={meal} />
    </AppShell>
  );
}
