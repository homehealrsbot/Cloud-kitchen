import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ClipboardList, LogOut, ShieldCheck, TrendingUp, ChefHat } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { OPS_MODULES } from "@/lib/ops/modules";
import { ROLES, can } from "@/lib/ops/roles";
import { getStaffSession } from "@/lib/supabase/auth";
import NotConfigured from "@/components/auth/NotConfigured";
import { signOut } from "../login/actions";

export const metadata = { title: "لوحات التحكم — Macro meals" };

const ROLE_ICON = {
  executive: <TrendingUp size={22} />,
  kitchen: <ChefHat size={22} />,
  quality: <ShieldCheck size={22} />,
};

// صفحة البداية للموظف. ما فيها اختيار دور — الدور يجي من حسابه.
export default async function AdminHome() {
  // الـ layout يتحقق من الجلسة قبل هذي الصفحة، لكن Next يقيّم مكوّن الصفحة على أي حال،
  // فما نستخدم non-null assertion هنا.
  const session = await getStaffSession();
  if (!session) return <NotConfigured />;
  const role = session.role;
  const modules = OPS_MODULES.filter((m) => can(role, m.view));

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full flex flex-col items-center px-6 py-12">
      <Image src="/logo-mark.png" alt="Macro meals" width={60} height={60} className="rounded-2xl mb-4" />
      <h1 className="text-xl font-extrabold mb-1" style={{ color: T.brand }}>لوحات التحكم</h1>

      <div className="w-full max-w-md rounded-2xl px-4 py-3 my-6 flex items-center justify-between gap-3" style={{ background: T.brandTint }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="rounded-full flex items-center justify-center shrink-0" style={{ width: 38, height: 38, background: T.surface, color: T.brand }}>
            {ROLE_ICON[role]}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold" style={{ color: T.brand }}>{ROLES[role].label}</div>
            <div className="text-[11px] truncate" dir="ltr" style={{ color: T.inkSoft }}>
              {session.name || session.email}
            </div>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="flex items-center gap-1 text-xs font-bold shrink-0" style={{ color: T.inkSoft }}>
            <LogOut size={13} /> خروج
          </button>
        </form>
      </div>

      <Link
        href="/admin/ops"
        className="w-full max-w-md flex items-center gap-4 rounded-2xl p-5 mb-4 transition-transform hover:scale-[1.01]"
        style={{ background: T.surface, border: `1.5px solid ${T.brandBright}` }}
      >
        <span className="rounded-full flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: T.brandTint, color: T.brand }}>
          <ClipboardList size={24} />
        </span>
        <span className="flex-1">
          <span className="block text-base font-bold">مركز العمليات</span>
          <span className="block text-xs mt-1" style={{ color: T.inkSoft }}>
            المنيو، الإنتاج، الجودة، الوصفات — كل شي من مكان واحد
          </span>
        </span>
        <ArrowLeft size={18} style={{ color: T.inkSoft }} />
      </Link>

      <div className="w-full max-w-md">
        <div className="text-[11px] font-bold mb-2" style={{ color: T.inkSoft }}>
          المتاح لدورك ({modules.length})
        </div>
        <div className="grid grid-cols-2 gap-2">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-xl px-3 py-2.5 text-xs font-bold"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
            >
              {m.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-[11px] mt-8 text-center max-w-md leading-relaxed" style={{ color: T.inkSoft }}>
        صلاحيات دورك مفروضة في قاعدة البيانات نفسها، مو بس في الواجهة — أي تعديل خارج صلاحيتك
        ترفضه قاعدة البيانات.
      </p>
    </div>
  );
}
