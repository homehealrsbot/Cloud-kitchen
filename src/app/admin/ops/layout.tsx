// يقرأ صورة بيانات العمليات من قاعدة البيانات على الخادم ويمرّرها لشاشات العمليات.
// ما يشوفه كل دور تحدده سياسات RLS، فالقراءة نفسها مفلترة من القاعدة.

import { loadOpsSnapshot } from "@/lib/ops/server-data";
import OpsDataProvider from "@/components/ops/OpsDataProvider";
import NotConfigured from "@/components/auth/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  // الـ layout الأب يتكفّل بهذي الحالة، لكن نحميها هنا كمان لأن Next يقيّم
  // الـ layouts المتداخلة أثناء البناء حتى لو الأب ما عرض أبناءه.
  if (!isSupabaseConfigured) return <NotConfigured />;

  const snapshot = await loadOpsSnapshot();
  return <OpsDataProvider snapshot={snapshot}>{children}</OpsDataProvider>;
}
