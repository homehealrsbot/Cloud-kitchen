import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { signOut } from "../login/actions";

export const metadata = { title: "لا توجد صلاحية — Macro Meals" };

// يوصل هنا مستخدم مسجّل دخوله لكنه مو موظف وحاول يفتح /admin
export default function NoAccessPage() {
  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 60, height: 60, background: T.warnTint, color: T.warn }}>
        <ShieldAlert size={28} />
      </div>
      <h1 className="text-lg font-extrabold mb-2">حسابك ما له صلاحية إدارة</h1>
      <p className="text-xs leading-relaxed max-w-sm mb-6" style={{ color: T.inkSoft }}>
        لوحات التحكم مخصصة لفريق العمل. إذا كنت من الفريق، راجع الإدارة لإضافة حسابك
        وتحديد دورك.
      </p>
      <div className="flex items-center gap-2">
        <Link href="/order-app" className="rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brand }}>
          تطبيق العميل
        </Link>
        <form action={signOut}>
          <button type="submit" className="rounded-lg px-4 py-2 text-xs font-bold" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}>
            تسجيل خروج
          </button>
        </form>
      </div>
    </div>
  );
}
