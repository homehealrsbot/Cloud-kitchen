"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { Loader2, LogIn, UserPlus, AlertCircle, MailCheck } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import type { AuthState } from "@/app/login/actions";

type Mode = "signin" | "signup";

export default function AuthForm({
  mode,
  action,
  next,
}: {
  mode: Mode;
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const isSignup = mode === "signup";

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="flex flex-col items-center mb-7">
        <Image src="/logo-mark.png" alt="Macro meals" width={60} height={60} className="rounded-2xl mb-3" />
        <span className="font-extrabold text-lg" style={{ color: T.brand }}>Macro meals</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h1 className="text-lg font-extrabold mb-1">{isSignup ? "إنشاء حساب" : "تسجيل الدخول"}</h1>
        <p className="text-xs mb-5" style={{ color: T.inkSoft }}>
          {isSignup ? "سجّل بإيميلك وابدأ اشتراكك" : "دخول العملاء وفريق العمل"}
        </p>

        {state.notice ? (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-4" style={{ background: T.goodTint }}>
            <MailCheck size={16} style={{ color: T.good }} className="mt-0.5 shrink-0" />
            <p className="text-[12px] leading-relaxed font-medium" style={{ color: T.good }}>{state.notice}</p>
          </div>
        ) : null}

        {state.error ? (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-4" style={{ background: T.warnTint }}>
            <AlertCircle size={16} style={{ color: T.warn }} className="mt-0.5 shrink-0" />
            <p className="text-[12px] leading-relaxed font-bold" style={{ color: T.warn }}>{state.error}</p>
          </div>
        ) : null}

        <form action={formAction} className="space-y-3">
          {next ? <input type="hidden" name="next" value={next} /> : null}

          {isSignup ? (
            <div>
              <label htmlFor="full_name" className="text-[11px] font-bold block mb-1.5" style={{ color: T.inkSoft }}>
                الاسم الكامل
              </label>
              <input
                id="full_name"
                name="full_name"
                autoComplete="name"
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
                style={{ borderColor: T.border }}
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="text-[11px] font-bold block mb-1.5" style={{ color: T.inkSoft }}>
              الإيميل
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              dir="ltr"
              autoComplete="email"
              className="w-full rounded-xl border px-3 py-2.5 text-sm text-left"
              style={{ borderColor: T.border }}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-[11px] font-bold block mb-1.5" style={{ color: T.inkSoft }}>
              كلمة المرور {isSignup ? "(8 أحرف على الأقل)" : ""}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              dir="ltr"
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="w-full rounded-xl border px-3 py-2.5 text-sm text-left"
              style={{ borderColor: T.border }}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: T.brandBright }}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : isSignup ? <UserPlus size={16} /> : <LogIn size={16} />}
            {pending ? "جاري…" : isSignup ? "إنشاء الحساب" : "دخول"}
          </button>
        </form>

        <div className="text-center text-xs mt-5" style={{ color: T.inkSoft }}>
          {isSignup ? (
            <>عندك حساب؟ <Link href="/login" className="font-bold" style={{ color: T.brand }}>سجّل دخول</Link></>
          ) : (
            <>جديد معنا؟ <Link href="/signup" className="font-bold" style={{ color: T.brand }}>أنشئ حساب</Link></>
          )}
        </div>
      </div>

      <p className="text-[11px] mt-6 text-center max-w-sm leading-relaxed" style={{ color: T.inkSoft }}>
        حسابات فريق العمل تُضاف من الإدارة — ما تُنشأ من هذي الصفحة.
      </p>
    </div>
  );
}
