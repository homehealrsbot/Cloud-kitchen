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
import { MATRIX, ROLES, can, capForPath, useSession } from "@/lib/ops/roles";

export default function AdminGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useSession();

  const cap = capForPath(pathname);
  // ما فيه قاعدة لهذا المسار (مثل /admin نفسها) → يكفي إنه موظف
  const allowed = cap ? can(session?.role, cap) : !!session;
  if (allowed) return <>{children}</>;

  const allowedRoles = cap ? MATRIX[cap].map((r) => ROLES[r].label).join(" · ") : "";
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
