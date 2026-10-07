import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { T } from "@/lib/kitchen-shared";

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
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-sm" style={{ color: T.brand }}>{title}</span>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-10">
        <div className="rounded-2xl p-8 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="rounded-full flex items-center justify-center mx-auto mb-4" style={{ width: 52, height: 52, background: T.brandTint, color: T.brand }}>
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
            className="inline-block mt-5 rounded-full px-5 py-2.5 text-xs font-bold text-white"
            style={{ background: T.brandBright }}
          >
            رجوع للقائمة
          </Link>
        </div>
      </div>
    </div>
  );
}
