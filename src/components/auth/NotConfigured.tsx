import Link from "next/link";
import { Database } from "lucide-react";
import { T } from "@/lib/kitchen-shared";

// تظهر بدل صفحات الدخول والإدارة إذا متغيرات Supabase ناقصة.
// الهدف: رسالة واضحة فيها الخطوات، بدل خطأ غامض وقت التشغيل.
export default function NotConfigured() {
  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 60, height: 60, background: T.brandTint, color: T.brand }}>
        <Database size={28} />
      </div>
      <h1 className="text-lg font-extrabold mb-2">قاعدة البيانات غير مربوطة بعد</h1>
      <p className="text-xs leading-relaxed max-w-md mb-5" style={{ color: T.inkSoft }}>
        النظام يحتاج مشروع Supabase عشان تشتغل الحسابات وبيانات العمليات. الخطوات كاملة في
        ملف <span className="font-bold" dir="ltr">README.md</span> تحت «ربط قاعدة البيانات».
      </p>
      <div className="rounded-xl px-5 py-4 text-right max-w-md w-full mb-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="text-[11px] font-bold mb-2" style={{ color: T.inkSoft }}>المطلوب في ملف .env.local</div>
        <pre className="text-[11px] overflow-x-auto" dir="ltr" style={{ color: T.ink }}>
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
        </pre>
      </div>
      <Link href="/" className="rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brand }}>
        رجوع للرئيسية
      </Link>
    </div>
  );
}
