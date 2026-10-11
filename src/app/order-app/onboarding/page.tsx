import { redirect } from "next/navigation";
import { getProfile } from "../profile-actions";
import OnboardingFlow from "@/components/order/OnboardingFlow";
import NotConfigured from "@/components/auth/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "إعداد اشتراكك — Macro Meals" };

// قبل: خطط اشتراك من localStorage يديرها المطعم من صفحة محذوفة الآن.
// صار الإعداد يحفظ الهدف الصحي والمطابخ المفضلة في حساب العميل فعلياً.
export default async function OnboardingPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/order-app/onboarding");
  return <OnboardingFlow profile={profile} />;
}
