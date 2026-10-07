"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrendingUp, ChefHat, ShieldCheck, ArrowLeft, LogOut, ClipboardList } from "lucide-react";
import Link from "next/link";
import { T } from "@/lib/kitchen-shared";
import { ROLES, Role, setSession, useMounted, useSession } from "@/lib/ops/roles";

const ICONS: Record<Role, React.ReactNode> = {
  executive: <TrendingUp size={24} />,
  kitchen: <ChefHat size={24} />,
  quality: <ShieldCheck size={24} />,
};

const ORDER: Role[] = ["executive", "kitchen", "quality"];

export default function AdminLanding() {
  const router = useRouter();
  const mounted = useMounted();
  const session = useSession();
  const [name, setName] = useState("");

  function enter(role: Role) {
    setSession({ role, name: name.trim() || (session?.role === role ? session.name : "") });
    router.push(ROLES[role].home);
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10">
      <Image src="/logo-mark.png" alt="Food Style" width={64} height={64} className="rounded-2xl mb-4" />
      <h1 className="text-xl font-extrabold mb-1" style={{ color: T.brand }}>لوحات التحكم</h1>
      <p className="text-xs mb-6" style={{ color: T.inkSoft }}>ادخل بدورك — كل دور يشوف ويعدّل اللي يخصه فقط</p>

      {mounted && session && (
        <div className="w-full max-w-md rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3" style={{ background: T.brandTint }}>
          <div className="text-xs" style={{ color: T.brand }}>
            داخل الآن بدور: <span className="font-bold">{ROLES[session.role].label}</span>
            {session.name ? ` · ${session.name}` : ""}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/ops" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.brand }}>
              <ClipboardList size={13} /> مركز العمليات
            </Link>
            <button onClick={() => setSession(null)} className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
              <LogOut size={13} /> خروج
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md mb-4">
        <label className="text-[11px] font-bold block mb-1.5" style={{ color: T.inkSoft }}>
          اسمك (اختياري — يظهر في سجل التعديلات)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: الشيف أحمد"
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: T.border, background: T.surface }}
        />
      </div>

      <div className="w-full max-w-md space-y-4">
        {ORDER.map((role) => (
          <button
            key={role}
            onClick={() => enter(role)}
            className="w-full text-right flex items-center gap-4 rounded-2xl p-5 transition-transform hover:scale-[1.01]"
            style={{ background: T.surface, border: `1.5px solid ${mounted && session?.role === role ? T.brandBright : T.border}` }}
          >
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: T.brandTint, color: T.brand }}>
              {ICONS[role]}
            </div>
            <div className="flex-1">
              <div className="text-base font-bold">{ROLES[role].label}</div>
              <div className="text-xs mt-1 leading-relaxed" style={{ color: T.inkSoft }}>{ROLES[role].desc}</div>
            </div>
            <ArrowLeft size={18} style={{ color: T.inkSoft }} />
          </button>
        ))}
      </div>

      <p className="text-[11px] mt-8 text-center max-w-md leading-relaxed" style={{ color: T.inkSoft }}>
        الفصل بين الأدوار حالياً على مستوى الشاشات فقط (بدون كلمة مرور). الحماية الفعلية تتفعّل مع ربط قاعدة البيانات وحسابات الموظفين.
      </p>
    </div>
  );
}
