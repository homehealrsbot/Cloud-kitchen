import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Users, ShieldCheck } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { getStaffSession } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import NotConfigured from "@/components/auth/NotConfigured";
import TeamManager from "@/components/admin/TeamManager";
import GateDefManager from "@/components/admin/GateDefManager";
import PermissionMatrix from "@/components/admin/PermissionMatrix";
import { listApprovalDefs, listTeam } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "الفريق والصلاحيات — Macro Meals" };

export default async function TeamPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;

  // الـ layout و proxy.ts يفحصان الجلسة والدور قبل هذي الصفحة، وهذا فحص
  // ثالث لأن Next يقيّم مكوّن الصفحة على أي حال.
  const session = await getStaffSession();
  if (!session) return <NotConfigured />;

  const [team, defs] = await Promise.all([listTeam(), listApprovalDefs()]);

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-symbol.png" alt="Macro Meals" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Macro Meals</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>الفريق والصلاحيات</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            لوحات التحكم <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Users size={18} style={{ color: T.brand }} />
          <h1 className="text-lg font-extrabold">الفريق والصلاحيات</h1>
        </div>
        <p className="text-xs leading-relaxed mb-6 max-w-2xl" style={{ color: T.inkSoft }}>
          من هنا تضيف الموظفين وتعطيهم الأدوار وتوقفهم. الدور يحدد إيش يشوف
          الموظف وإيش يعدّل، وهو مفروض في قاعدة البيانات لا في الواجهة — فتعديل
          المتصفح أو استدعاء الـAPI مباشرة ما يفيد شي.
        </p>

        <TeamManager team={team} myEmail={session.email} />

        <div className="flex items-center gap-2 mt-10 mb-1">
          <ShieldCheck size={18} style={{ color: T.brand }} />
          <h2 className="text-lg font-extrabold">من يعتمد ماذا</h2>
        </div>
        <p className="text-xs leading-relaxed mb-5 max-w-2xl" style={{ color: T.inkSoft }}>
          كل بوابة اعتماد لها مالك واحد: الدور اللي يختمها. من هنا تنقل الملكية أو
          تضيف بوابة جديدة أو توقف واحدة. التغيير يسري فوراً على الشاشات وعلى شرط
          النشر في قاعدة البيانات.
        </p>
        <GateDefManager gateDefs={defs.gates} approvalDefs={defs.approvals} />

        <div className="mt-10">
          <PermissionMatrix gateDefs={defs.gates} approvalDefs={defs.approvals} />
        </div>
      </div>
    </div>
  );
}
