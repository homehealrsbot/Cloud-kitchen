"use client";

// يفحص إن دور المستخدم مسموح له بهذه الصفحة بالتحديد.
//
// الدخول والانتماء لفريق العمل تحقق منهما middleware و admin/layout قبل الوصول
// لهنا. هذا المكوّن يتولى الصلاحية على مستوى الصفحة الواحدة (مثال: المطبخ ممنوع
// من صفحة الإعدادات). وأي كتابة ترفضها قاعدة البيانات بنفسها عبر RLS.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { MATRIX, ROLES, can, capForPath } from "@/lib/ops/roles";
import type { Role } from "@/lib/ops/roles";
import { moduleAllowsRole, moduleForPath } from "@/lib/ops/modules";
import { useSession } from "@/lib/ops/session";

const ALL_ROLES: Role[] = ["executive", "kitchen", "quality"];

export default function AdminGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useSession();

  const cap = capForPath(pathname);
  // شرطان: الصلاحية تقول «مسموح»، والوحدة تقول «يخصّ دورك». الشاشة المخفية من
  // الشريط تبقى مخفية لو كتب أحد مسارها بيده — الإخفاء بلا منع مو إخفاء.
  // ما فيه قاعدة لهذا المسار (مثل /admin نفسها) → يكفي إنه موظف
  const allowed = (cap ? can(session?.role, cap) : !!session) && moduleAllowsRole(pathname, session?.role);
  if (allowed) return <>{children}</>;

  // الأدوار المعروضة لازم تكون اللي تفتح الصفحة فعلاً: تقاطع الصلاحية مع
  // أدوار الوحدة. عرض MATRIX وحدها كان يقول «متاحة للجودة» وهي ممنوعة عنها.
  const mod = moduleForPath(pathname);
  const byCap = cap ? MATRIX[cap] : ALL_ROLES;
  const allowedRoles = byCap
    .filter((r) => !mod || mod.roles.includes(r))
    .map((r) => ROLES[r].label)
    .join(" · ");
  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 60, height: 60, background: T.warnTint, color: T.warn }}>
        <ShieldAlert size={28} />
      </div>
      <h1 className="text-lg font-extrabold mb-2">هذي الصفحة خارج صلاحيات دورك</h1>
      <p className="text-xs leading-relaxed max-w-sm mb-1" style={{ color: T.inkSoft }}>
        دورك الحالي: {session ? ROLES[session.role].label : "—"}
      </p>
      {allowedRoles && (
        <p className="text-xs leading-relaxed max-w-sm mb-5" style={{ color: T.inkSoft }}>
          الصفحة متاحة لـ: {allowedRoles}
        </p>
      )}
      <Link href="/admin/ops" className="rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brand }}>
        مركز العمليات
      </Link>
    </div>
  );
}
