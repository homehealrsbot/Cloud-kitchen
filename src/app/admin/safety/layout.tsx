// يقرأ وحدة سلامة الغذاء من القاعدة على الخادم ويمرّرها لشاشاتها.
// ما يشوفه كل دور تحدده سياسات RLS — القراءة نفسها مفلترة من القاعدة.

import { loadSafetySnapshot } from "@/lib/safety/server-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import NotConfigured from "@/components/auth/NotConfigured";
import SafetyDataProvider from "@/components/safety/SafetyDataProvider";

export const dynamic = "force-dynamic";

export default async function SafetyLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const snapshot = await loadSafetySnapshot();
  return <SafetyDataProvider snapshot={snapshot}>{children}</SafetyDataProvider>;
}
