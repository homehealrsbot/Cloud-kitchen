import Link from "next/link";
import { Clock } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { BRAND } from "@/lib/brand";
import AppShell, { AppHeader } from "@/components/order/AppShell";

/**
 * حالة صريحة لميزة ما انبنى لها جدول في قاعدة البيانات بعد.
 *
 * بديل مقصود عن الأرقام الوهمية: هذي الصفحات كانت تعرض رصيد باقة ومسار وزن
 * ومواعيد مكتوبة في الكود — توحي بنظام شغّال وهو مو موجود. عرض الحقيقة أنفع
 * للعميل وللفريق من رقم مخترع.
 */
export default function ComingSoon({
  title,
  what,
  needs,
}: {
  title: string;
  what: string;
  needs: string;
}) {
  return (
    <AppShell>
      <AppHeader kicker="ماكرو ميلز" heading={title} />

      <main className="max-w-md mx-auto px-5 pt-6">
        <div className="rounded-2xl p-8 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div
            className="rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ width: 52, height: 52, background: T.brandTint, color: BRAND.limeText }}
          >
            <Clock size={24} />
          </div>
          <div className="text-sm font-bold mb-2">{what}</div>
          <p className="text-xs leading-relaxed mb-4" style={{ color: T.inkSoft }}>{needs}</p>
          <div className="rounded-xl px-4 py-3 text-[11px] leading-relaxed" style={{ background: T.bg, color: T.inkSoft }}>
            ما نعرض أرقاماً تقديرية أو بيانات تجريبية في هذي الشاشة — تظهر البيانات
            لما يرتبط النظام بجدولها الفعلي.
          </div>
          <Link
            href="/order-app"
            className="inline-block mt-5 rounded-full px-5 py-2.5 text-xs font-extrabold"
            style={{ background: T.brandBright, color: T.onBright }}
          >
            رجوع للقائمة
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
