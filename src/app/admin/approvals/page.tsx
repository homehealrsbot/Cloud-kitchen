"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ShieldCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  T,
  PendingMeal,
  RejectedMeal,
  Meal,
  loadPendingMeals,
  savePendingMeals,
  loadRejectedMeals,
  saveRejectedMeals,
  loadPublishedLocalMeals,
  savePublishedLocalMeals,
} from "@/lib/kitchen-shared";
import { createClient } from "@/lib/supabase";

export default function ApprovalsPage() {
  const [pending, setPending] = useState<PendingMeal[]>([]);
  const [rejected, setRejected] = useState<RejectedMeal[]>([]);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setPending(loadPendingMeals());
    setRejected(loadRejectedMeals());
  }, []);

  async function approve(item: PendingMeal) {
    const remaining = pending.filter((p) => p.id !== item.id);
    savePendingMeals(remaining);
    setPending(remaining);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) {
      const supabase = createClient();
      await supabase.from("meals").insert({
        name: item.name,
        price: item.price,
        kcal: item.kcal,
        protein_g: 0,
        carb_g: 0,
        fat_g: 0,
        goal_tag: "تنزيل وزن",
      });
    } else {
      const published: Meal = { id: item.id, name: item.name, price: item.price, kcal: item.kcal, available: true };
      const list = [published, ...loadPublishedLocalMeals()];
      savePublishedLocalMeals(list);
    }
  }

  function reject(item: PendingMeal) {
    const reason = reasonDrafts[item.id]?.trim();
    if (!reason) return;
    const remaining = pending.filter((p) => p.id !== item.id);
    savePendingMeals(remaining);
    setPending(remaining);

    const rejectedItem: RejectedMeal = { ...item, reason, rejectedAt: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) };
    const updated = [rejectedItem, ...rejected];
    saveRejectedMeals(updated);
    setRejected(updated);
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={36} height={36} className="rounded-xl" />
            <div>
              <div className="font-bold text-base leading-none" style={{ color: T.brand }}>قسم الجودة والمتابعة</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>مراجعة الإدخالات قبل النشر</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع لاختيار اللوحة
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6" style={{ background: T.brandTint }}>
          <ShieldCheck size={16} style={{ color: T.brand }} className="mt-0.5 shrink-0" />
          <p className="text-[11.5px] leading-relaxed" style={{ color: T.brand }}>
            أي إدخال يدخله المطبخ يظهر هنا أول — ما ينشر للعميل إلا بعد موافقتك هنا. هذا القسم مستقل تماماً عن لوحة المطبخ.
          </p>
        </div>

        {/* قائمة الانتظار */}
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} style={{ color: T.warn }} />
          <div className="text-sm font-bold">بانتظار المراجعة ({pending.length})</div>
        </div>

        {pending.length === 0 && (
          <div className="text-xs py-10 text-center mb-8" style={{ color: T.inkSoft }}>ما فيه شي بانتظار المراجعة حالياً</div>
        )}

        <div className="space-y-3 mb-10">
          {pending.map((item) => (
            <div key={item.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-bold">{item.name}</div>
                <span className="text-[10px] font-bold rounded-full px-2 py-1" style={{ background: T.warnTint, color: T.warn }}>قيد المراجعة</span>
              </div>
              <div className="text-[11px] mb-3" style={{ color: T.inkSoft }}>
                {item.kcal} سعرة · {item.price} ﷼ · أرسلها {item.submittedBy} — {item.submittedAt}
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => approve(item)}
                  className="flex-1 rounded-lg py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  style={{ background: T.good }}
                >
                  <CheckCircle2 size={14} /> موافقة ونشر
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="سبب الرفض (إجباري)"
                  value={reasonDrafts[item.id] || ""}
                  onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="flex-1 rounded-lg border px-3 py-2 text-xs"
                  style={{ borderColor: T.border }}
                />
                <button
                  onClick={() => reject(item)}
                  disabled={!reasonDrafts[item.id]?.trim()}
                  className="rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                  style={{ background: "transparent", color: T.warn, border: `1px solid ${T.warn}` }}
                >
                  <XCircle size={14} /> رفض
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* سجل الرفض */}
        {rejected.length > 0 && (
          <>
            <div className="text-sm font-bold mb-3" style={{ color: T.inkSoft }}>سجل الإدخالات المرفوضة</div>
            <div className="space-y-2">
              {rejected.map((r) => (
                <div key={r.id} className="rounded-xl px-4 py-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{r.name}</div>
                    <span className="text-[10px]" style={{ color: T.inkSoft }}>{r.rejectedAt}</span>
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: T.warn }}>السبب: {r.reason}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
