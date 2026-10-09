// بوابة الإدارة من جهة الخادم.
//
// الدور يُقرأ هنا من جلسة Supabase + جدول staff، قبل ما تُرسل أي صفحة للمتصفح،
// وبعدها يُحقن في RoleProvider عشان مكوّنات العميل تعرف إيش تعرض.
// middleware يفحص نفس الشي قبل الوصول لهنا — هذا الفحص الثاني دفاع بالعمق
// عشان لو تغيّر matcher مستقبلاً ما تنكشف الصفحات.

import { redirect } from "next/navigation";
import AdminGate from "@/components/ops/AdminGate";
import DraftBar from "@/components/ops/DraftBar";
import NotConfigured from "@/components/auth/NotConfigured";
import { RoleProvider } from "@/lib/ops/session";
import { DraftProvider } from "@/lib/ops/draft";
import { getCurrentUser } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// لوحات الإدارة تعتمد على جلسة المستخدم ودوره، فما تُبنى مسبقاً ولا تُخزَّن:
// صفحة إدارة مُخزَّنة مسبقاً ممكن تُقدَّم لشخص غير مصرّح له.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <NotConfigured />;

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/ops");
  if (!user.staff) redirect("/no-access");

  // المسوّدة فوق كل شاشات الإدارة: الموظف يتنقّل بين تبويبات الوحدة الواحدة
  // ومسوّدته معه، ويرسلها دفعة وحدة.
  return (
    <RoleProvider value={user.staff}>
      <DraftProvider>
        <AdminGate>{children}</AdminGate>
        <DraftBar />
      </DraftProvider>
    </RoleProvider>
  );
}
