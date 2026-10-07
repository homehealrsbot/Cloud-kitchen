"use client";

// بوابة الأدوار: تتحقق إن الدور الحالي مسموح له بالصفحة قبل عرضها.
// فصل على مستوى الواجهة فقط — الحماية الفعلية تجي مع تسجيل الدخول الحقيقي.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { MATRIX, ROLES, can, capForPath, useMounted, useSession } from "@/lib/ops/roles";

export default function AdminGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mounted = useMounted();
  const session = useSession();

  // صفحة اختيار الدور مفتوحة دائماً
  if (pathname === "/admin") return <>{children}</>;

  if (!mounted) {
    return <div style={{ background: T.bg }} className="min-h-screen w-full" />;
  }

  const cap = capForPath(pathname);
  const allowed = cap ? can(session?.role, cap) : !!session;
  if (allowed) return <>{children}</>;

  const allowedRoles = cap ? MATRIX[cap].map((r) => ROLES[r].label).join(" · ") : "";
  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 60, height: 60, background: T.warnTint, color: T.warn }}>
        <ShieldAlert size={28} />
      </div>
      <h1 className="text-lg font-extrabold mb-2">
        {session ? "هذي الصفحة خارج صلاحيات دورك" : "اختر دورك أولاً"}
      </h1>
      <p className="text-xs leading-relaxed max-w-sm mb-1" style={{ color: T.inkSoft }}>
        {session
          ? `دورك الحالي: ${ROLES[session.role].label}.`
          : "لازم تدخل بدور محدد عشان تفتح لوحات التحكم."}
      </p>
      {allowedRoles && (
        <p className="text-xs leading-relaxed max-w-sm mb-5" style={{ color: T.inkSoft }}>
          الصفحة متاحة لـ: {allowedRoles}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <Link href="/admin" className="rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brand }}>
          {session ? "تبديل الدور" : "اختيار الدور"}
        </Link>
        {session && (
          <Link href="/admin/ops" className="rounded-lg px-4 py-2 text-xs font-bold" style={{ background: T.brandTint, color: T.brand }}>
            مركز العمليات
          </Link>
        )}
      </div>
    </div>
  );
}
