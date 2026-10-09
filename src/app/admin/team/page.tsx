import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Users, ShieldCheck, ScrollText } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { getStaffSession } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import NotConfigured from "@/components/auth/NotConfigured";
import TeamManager from "@/components/admin/TeamManager";
import GateDefManager from "@/components/admin/GateDefManager";
import PermissionMatrix from "@/components/admin/PermissionMatrix";
import RuleManager from "@/components/admin/RuleManager";
import { listApprovalDefs, listLaunchAxes, listTeam } from "./actions";
import { loadChangeKinds } from "@/app/admin/requests/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "القواعد والصلاحيات — Macro Meals" };

export default async function TeamPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;

  // الـ layout و proxy.ts يفحصان الجلسة والدور قبل هذي الصفحة، وهذا فحص
  // ثالث لأن Next يقيّم مكوّن الصفحة على أي حال.
  const session = await getStaffSession();
  if (!session) return <NotConfigured />;

  const [team, defs, kinds, axes] = await Promise.all([
    listTeam(),
    listApprovalDefs(),
    loadChangeKinds(),
    listLaunchAxes(),
  ]);

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-symbol.png" alt="Macro Meals" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Macro Meals</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>القواعد والصلاحيات</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            لوحات التحكم <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-lg font-extrabold mb-1">القواعد والصلاحيات</h1>
        <p className="text-xs leading-relaxed mb-5 max-w-2xl" style={{ color: T.inkSoft }}>
          أربع طبقات، كل واحدة تجاوب سؤالاً: مين يدخل، ومين يختم، ومين يرسل
          ويعتمد، وإيش شروط الإطلاق. كلها مفروضة في قاعدة البيانات لا في
          الواجهة — فتعديل المتصفح أو استدعاء الـAPI مباشرة ما يفيد شي.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { href: "#team", label: "١· الفريق" },
            { href: "#gates", label: "٢· من يختم" },
            { href: "#rules", label: "٣· من يرسل ويعتمد" },
            { href: "#matrix", label: "٤· جدول الصلاحيات" },
          ].map((x) => (
            <a
              key={x.href}
              href={x.href}
              className="rounded-xl px-3 py-1.5 text-[11px] font-bold"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
            >
              {x.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-1" id="team">
          <Users size={18} style={{ color: T.brand }} />
          <h2 className="text-lg font-extrabold">١· الفريق — مين يدخل أصلاً</h2>
        </div>
        <p className="text-xs leading-relaxed mb-5 max-w-2xl" style={{ color: T.inkSoft }}>
          العميل يسجّل نفسه؛ الموظف لا. تضيف إيميله هنا بدور، وبعدها يدخل بنفس
          الإيميل ويلقى شاشاته. وما يمكن إيقاف آخر حساب تنفيذي نشط — القاعدة
          ترفضه حتى ما تُقفل على نفسك.
        </p>

        <TeamManager team={team} myEmail={session.email} />

        <div className="flex items-center gap-2 mt-12 mb-1" id="gates">
          <ShieldCheck size={18} style={{ color: T.brand }} />
          <h2 className="text-lg font-extrabold">٢· من يختم — بوابات النشر</h2>
        </div>
        <p className="text-xs leading-relaxed mb-5 max-w-2xl" style={{ color: T.inkSoft }}>
          كل بوابة اعتماد لها مالك واحد: الدور اللي يختمها. من هنا تنقل الملكية أو
          تضيف بوابة جديدة أو توقف واحدة. التغيير يسري فوراً على الشاشات وعلى شرط
          النشر في قاعدة البيانات.
        </p>
        <GateDefManager gateDefs={defs.gates} approvalDefs={defs.approvals} />

        <div className="flex items-center gap-2 mt-12 mb-1" id="rules">
          <ScrollText size={18} style={{ color: T.brand }} />
          <h2 className="text-lg font-extrabold">٣· من يرسل ومن يعتمد</h2>
        </div>
        <p className="text-xs leading-relaxed mb-5 max-w-2xl" style={{ color: T.inkSoft }}>
          الختم يسمح للصنف ينشر؛ وهذي الطبقة تحكم كل رقم قبله: مين يقدر يرسل
          تعديلاً ومين يبتّ فيه. والتعديلات هنا نفسها تمر بالمسار — تتجمّع
          مسوّدة وتنرسل، فنقل سلطة يبقى له سجل باسمك ووقته.
        </p>
        <RuleManager kinds={kinds} axes={axes} />

        <div className="mt-12" id="matrix">
          <PermissionMatrix gateDefs={defs.gates} approvalDefs={defs.approvals} />
        </div>
      </div>
    </div>
  );
}
