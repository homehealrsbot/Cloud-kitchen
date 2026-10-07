"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ShieldCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  T,
  PendingMeal,
  RejectedMeal,
  Meal,
  usePendingMeals,
  savePendingMeals,
  useRejectedMeals,
  saveRejectedMeals,
  loadPublishedLocalMeals,
  savePublishedLocalMeals,
} from "@/lib/kitchen-shared";
import { createClient } from "@/lib/supabase";

export default function ApprovalsPage() {
  // القائمتان تُقرآن من التخزين مباشرة (بدون useEffect) وتتحدثان تلقائياً بعد أي حفظ
  const pending = usePendingMeals();
  const rejected = useRejectedMeals();
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function approve(item: PendingMeal) {
    setError("");
    const published: Meal = { id: item.id, name: item.name, price: item.price, kcal: item.kcal, available: true };
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (url) {
      // مهم: نكتب في قاعدة البيانات أولاً ونتحقق من النتيجة. لو حذفنا من قائمة الانتظار
      // قبل الكتابة وفشلت الكتابة، تضيع الوجبة نهائياً بلا أي أثر.
      const supabase = createClient();
      const { error: insertError } = await supabase.from("meals").insert({
        name: item.name,
        price: item.price,
        kcal: item.kcal,
        protein_g: item.proteinG ?? 0,
        carb_g: item.carbG ?? 0,
        fat_g: item.fatG ?? 0,
        goal_tag: item.goalTag ?? "ثبات الوزن",
      });
      if (insertError) {
        // الوجبة تبقى في قائمة الانتظار — يقدر يحاول مرة ثانية
        setError(`ما تم النشر: ${insertError.message} — الوجبة باقية في قائمة الانتظار، حاول مرة ثانية.`);
        return;
      }
    } else {
      savePublishedLocalMeals([published, ...loadPublishedLocalMeals()]);
    }

    // النشر نجح — الآن نحذفها من قائمة الانتظار
    savePendingMeals(pending.filter((p) => p.id !== item.id));
  }

  function reject(item: PendingMeal) {
    const reason = reasonDrafts[item.id]?.trim();
    if (!reason) return;
    setError("");
    const rejectedItem: RejectedMeal = {
      ...item,
      reason,
      rejectedAt: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
    };
    // نسجّل الرفض أولاً، وبعدها نحذف من الانتظار — عشان ما يضيع السجل لو تعطّل التخزين
    saveRejectedMeals([rejectedItem, ...rejected]);
    savePendingMeals(pending.filter((p) => p.id !== item.id));
    setReasonDrafts((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
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
          <div className="flex items-center gap-3">
            <Link href="/admin/ops/quality" className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: T.brand }}>
              بوابات الجودة (53 صنف)
            </Link>
            <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
              رجوع لاختيار اللوحة
              <ChevronRight size={13} />
            </Link>
          </div>
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

        {error && (
          <div className="text-xs font-bold rounded-xl px-4 py-3 mb-4" style={{ background: T.warnTint, color: T.warn }}>
            {error}
          </div>
        )}

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
              <div className="text-[11px]" style={{ color: T.inkSoft }}>
                {item.kcal} سعرة · {item.price} ﷼ · أرسلها {item.submittedBy} — {item.submittedAt}
              </div>
              {item.goalTag ? (
                <div className="text-[11px] mb-3" style={{ color: T.inkSoft }}>
                  {item.proteinG}غ بروتين · {item.carbG}غ كارب · {item.fatG}غ دهون · الهدف: {item.goalTag}
                </div>
              ) : (
                <div className="text-[11px] mb-3 font-bold" style={{ color: T.warn }}>
                  إدخال قديم بدون قيم غذائية — راجعه مع المطبخ قبل النشر (بينشر بأصفار والهدف «ثبات الوزن»)
                </div>
              )}

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
