"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";

const T = {
  bg: "#FCF6F2",
  surface: "#FFFFFF",
  border: "#F0DFD3",
  ink: "#2B1B14",
  inkSoft: "#7A6153",
  brand: "#A84F2E",
  warn: "#C0392B",
  warnTint: "#FBEBE0",
};

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("عبّي البريد وكلمة المرور");
      return;
    }

    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // رسالة عامة — ما نكشف إذا البريد موجود أو لا.
      // Deliberately generic: don't reveal whether the account exists, and
      // don't surface the provider's internal error text.
      setError("البريد أو كلمة المرور غير صحيحة");
      setBusy(false);
      return;
    }

    // refresh() عشان الخادم يقرأ كوكي الجلسة الجديد.
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div
      style={{ background: T.bg, color: T.ink }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-6"
    >
      <Image src="/logo-mark.png" alt="Food Style" width={56} height={56} className="rounded-2xl mb-4" />
      <h1 className="text-xl font-extrabold mb-1" style={{ color: T.brand }}>
        تسجيل الدخول
      </h1>
      <p className="text-xs mb-7" style={{ color: T.inkSoft }}>
        لوحات التحكم للمشرفين فقط
      </p>

      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: T.surface, border: `1.5px solid ${T.border}` }}
      >
        <div>
          <label htmlFor="email" className="block text-xs font-bold mb-2">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            required
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: `1.5px solid ${T.border}`, background: T.bg }}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-bold mb-2">
            كلمة المرور
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={200}
            required
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: `1.5px solid ${T.border}`, background: T.bg }}
          />
        </div>

        {error && (
          <div
            className="rounded-xl px-3 py-2 text-xs font-bold"
            style={{ background: T.warnTint, color: T.warn }}
            role="alert"
          >
            {error}
          </div>
        )}

        {!configured && (
          <div
            className="rounded-xl px-3 py-2 text-xs leading-relaxed"
            style={{ background: T.warnTint, color: T.warn }}
          >
            Supabase غير مربوط. انسخ <code>.env.example</code> إلى <code>.env.local</code>، وشغّل{" "}
            <code>supabase/schema.sql</code> ثم <code>supabase/02-security.sql</code>.
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: T.brand }}
        >
          {busy ? "جاري الدخول…" : "دخول"}
        </button>
      </form>
    </div>
  );
}
