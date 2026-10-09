"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { T, WEEK_DAYS } from "@/lib/kitchen-shared";
import { saveDeliveryDays } from "@/app/order-app/profile-actions";
import AppShell, { AppHeader } from "@/components/order/AppShell";

export default function DeliveryDaysForm({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function toggle(day: string) {
    setMsg(""); setError("");
    setSelected((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function save() {
    setMsg(""); setError("");
    start(async () => {
      const r = await saveDeliveryDays(selected);
      if (r.ok) setMsg("تم حفظ أيام التوصيل");
      else setError(r.error);
    });
  }

  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...initial].sort());

  return (
    <AppShell>
      <AppHeader kicker="خطتي" heading="أيام التوصيل" />

      <div className="max-w-md mx-auto px-5 py-6">
        <p className="text-xs mb-5" style={{ color: T.inkSoft }}>
          اختر الأيام اللي تبي تستلم فيها وجبتك. تُحفظ في حسابك ويشوفها المطبخ في جدولة التوصيل.
        </p>

        <div className="space-y-2 mb-6">
          {WEEK_DAYS.map((day) => {
            const on = selected.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggle(day)}
                aria-pressed={on}
                className="w-full flex items-center justify-between rounded-2xl p-3.5 transition-colors"
                style={{ background: on ? T.brandTint : T.surface, border: `1.5px solid ${on ? T.brandBright : T.border}` }}
              >
                <span className="text-sm font-bold">{day}</span>
                <span
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{ width: 24, height: 24, background: on ? T.brandBright : T.brandTint, color: T.onBright }}
                >
                  {on && <Check size={13} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl p-4 mb-5 text-center" style={{ background: T.brandTint }}>
          <span className="text-sm font-bold" style={{ color: T.brand }}>
            {selected.length} أيام توصيل بالأسبوع
          </span>
        </div>

        <button
          onClick={save}
          disabled={pending || selected.length === 0 || !dirty}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-[#0B1410] disabled:opacity-40"
          style={{ background: T.brandBright }}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {pending ? "جاري الحفظ…" : dirty ? "حفظ أيام التوصيل" : "محفوظ"}
        </button>

        {msg && <div className="text-xs font-bold text-center mt-3" style={{ color: T.good }}>{msg}</div>}
        {error && <div className="text-xs font-bold text-center mt-3" style={{ color: T.warn }}>{error}</div>}
      </div>
    </AppShell>
  );
}
