import { redirect } from "next/navigation";
import { getProfile } from "../profile-actions";
import DeliveryDaysForm from "@/components/order/DeliveryDaysForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import NotConfigured from "@/components/auth/NotConfigured";

export const dynamic = "force-dynamic";
export const metadata = { title: "أيام التوصيل — Food Style" };

export default async function DeliveryDaysPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/order-app/delivery-days");
  return <DeliveryDaysForm initial={profile.deliveryDays} />;
}
