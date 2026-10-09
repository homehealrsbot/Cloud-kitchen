"use client";

import Link from "next/link";
import Image from "next/image";
import { TrendingUp, ChefHat, ShieldCheck, ArrowLeft } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";

const T = {
  bg: "#FCF6F2",
  surface: "#FFFFFF",
  border: "#F0DFD3",
  ink: "#2B1B14",
  inkSoft: "#7A6153",
  brand: "#A84F2E",
  brandBright: "#D67A4F",
  brandTint: "#FBEEE6",
};

export default function AdminLanding() {
  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full flex flex-col items-center justify-center px-6">
      <Image src="/logo-mark.png" alt="Food Style" width={64} height={64} className="rounded-2xl mb-4" />
      <h1 className="text-xl font-extrabold mb-1" style={{ color: T.brand }}>لوحات التحكم</h1>
      <p className="text-xs mb-3" style={{ color: T.inkSoft }}>اختر اللوحة المناسبة لدورك</p>
      <div className="mb-7">
        <SignOutButton color={T.inkSoft} />
      </div>

      <div className="w-full max-w-md space-y-4">
        <Link
          href="/admin/executive"
          className="flex items-center gap-4 rounded-2xl p-5 transition-transform hover:scale-[1.01]"
          style={{ background: T.surface, border: `1.5px solid ${T.border}` }}
        >
          <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: T.brandTint, color: T.brand }}>
            <TrendingUp size={24} />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold">لوحة الإدارة التنفيذية</div>
            <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
              الاشتراكات، الإيرادات، التكاليف، صافي الربح، والتوزيع الجغرافي
            </div>
          </div>
          <ArrowLeft size={18} style={{ color: T.inkSoft }} />
        </Link>

        <Link
          href="/admin/kitchen"
          className="flex items-center gap-4 rounded-2xl p-5 transition-transform hover:scale-[1.01]"
          style={{ background: T.surface, border: `1.5px solid ${T.border}` }}
        >
          <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: T.brandTint, color: T.brand }}>
            <ChefHat size={24} />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold">لوحة المطبخ</div>
            <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
              خطة الإنتاج، المخزون، الطلبات اليومية، وإدارة القائمة
            </div>
          </div>
          <ArrowLeft size={18} style={{ color: T.inkSoft }} />
        </Link>

        <Link
          href="/admin/approvals"
          className="flex items-center gap-4 rounded-2xl p-5 transition-transform hover:scale-[1.01]"
          style={{ background: T.surface, border: `1.5px solid ${T.border}` }}
        >
          <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: T.brandTint, color: T.brand }}>
            <ShieldCheck size={24} />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold">قسم الجودة والمتابعة</div>
            <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
              مراجعة والموافقة على أي إدخال جديد قبل ما ينشر للعميل
            </div>
          </div>
          <ArrowLeft size={18} style={{ color: T.inkSoft }} />
        </Link>
      </div>

      <p className="text-[11px] mt-8 text-center max-w-md" style={{ color: T.inkSoft }}>
        الفصل بين اللوحتين يحمي الأرقام المالية الحساسة، ويخلي كل فريق يشوف بس اللي يخصه
      </p>
    </div>
  );
}
