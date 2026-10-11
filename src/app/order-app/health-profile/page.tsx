import { redirect } from "next/navigation";
import { getProfile } from "../profile-actions";
import HealthProfileForm from "@/components/order/HealthProfileForm";
import NotConfigured from "@/components/auth/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ALLERGENS } from "@/lib/ops/engine";

export const dynamic = "force-dynamic";
export const metadata = { title: "ملفك الصحي — Macro Meals" };

export default async function HealthProfilePage() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/order-app/health-profile");

  // قائمة الحساسيات من نفس المصدر اللي يستخدمه المطبخ — مو قائمة منفصلة
  const allergens = ALLERGENS.map((a) => a.label);
  return <HealthProfileForm profile={profile} allergens={allergens} />;
}
