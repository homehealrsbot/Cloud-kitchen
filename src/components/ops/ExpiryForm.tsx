"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { addExpiryBatch } from "@/app/admin/safety-actions";
import type { ActionResult } from "@/lib/ops/types";

type State = { error?: string; ok?: boolean };

async function submit(_prev: State, formData: FormData): Promise<State> {
  const r: ActionResult = await addExpiryBatch(formData);
  return r.ok ? { ok: true } : { error: r.error };
}

export default function ExpiryForm() {
  const [state, action, pending] = useActionState<State, FormData>(submit, {});

  return (
    <form action={action} className="rounded-2xl p-4 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="text-xs font-bold mb-3">إضافة دفعة جديدة</div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          name="name" required placeholder="اسم المكوّن"
          className="sm:col-span-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: T.border }}
        />
        <input
          name="expiry_date" type="date" required
          className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: T.border }}
        />
        <input
          name="batch" placeholder="رقم الدفعة"
          className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: T.border }}
        />
      </div>
      <button
        type="submit" disabled={pending}
        className="mt-3 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-[#0B1410] disabled:opacity-60"
        style={{ background: T.brandBright }}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {pending ? "جاري الحفظ…" : "إضافة"}
      </button>
      {state.error && (
        <div className="text-xs font-bold mt-2 rounded-lg px-3 py-2" style={{ background: T.warnTint, color: T.warn }}>
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="text-xs font-bold mt-2 rounded-lg px-3 py-2" style={{ background: T.goodTint, color: T.good }}>
          تمت إضافة الدفعة
        </div>
      )}
    </form>
  );
}
