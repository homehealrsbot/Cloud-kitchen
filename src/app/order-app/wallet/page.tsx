"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Wallet, Utensils, CheckCircle2, CalendarDays } from "lucide-react";
import { T } from "@/lib/kitchen-shared";


// الباقة تُقاس بالأيام فقط — العميل ما يشوف أي مبلغ مالي أبداً.
// القيمة المالية الفعلية (لو فيه) تُدار من الإدارة التنفيذية داخلياً بس.
const PACKAGE_TOTAL_DAYS = 30;

type Txn = { day: number; meal: string; time: string };

export default function WalletPage() {
  const [daysUsed, setDaysUsed] = useState(6);
  const [transactions, setTransactions] = useState<Txn[]>([
    { day: 6, meal: "سلطة دجاج + حمص وطحينة", time: "اليوم 1:10 م" },
    { day: 5, meal: "سلمون مشوي + كينوا", time: "أمس 12:45 م" },
    { day: 4, meal: "صدر دجاج مشوي + أرز بني", time: "قبل يومين 1:05 م" },
  ]);
  const [claimedToday, setClaimedToday] = useState(false);

  const daysRemaining = PACKAGE_TOTAL_DAYS - daysUsed;
  const usedPct = (daysUsed / PACKAGE_TOTAL_DAYS) * 100;

  function claimTodayMeal() {
    if (claimedToday || daysRemaining <= 0) return;
    setDaysUsed((d) => d + 1);
    setTransactions((prev) => [{ day: daysUsed + 1, meal: "شوفان بروتين + فواكه", time: "الآن" }, ...prev]);
    setClaimedToday(true);
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={18} style={{ color: T.brand }} />
            <span className="font-bold text-sm" style={{ color: T.brand }}>باقتي</span>
          </div>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        {/* رصيد الباقة بالأيام فقط */}
        <div className="rounded-2xl p-5 mb-4 text-white" style={{ background: `linear-gradient(135deg, ${T.brand}, ${T.brandBright})` }}>
          <div className="text-xs opacity-90 mb-1">باقتك الشهرية</div>
          <div className="text-3xl font-extrabold mb-3">{daysRemaining} يوم متبقي</div>
          <div className="flex items-center justify-between text-xs opacity-90 mb-1.5">
            <span>استخدمت {daysUsed} من {PACKAGE_TOTAL_DAYS} يوم</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.3)" }}>
            <div className="h-full rounded-full bg-white" style={{ width: `${usedPct}%` }} />
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-6" style={{ background: T.brandTint }}>
          <p className="text-[11.5px] leading-relaxed" style={{ color: T.brand }}>
            باقتك مدفوعة بالكامل مقدماً — كل يوم تستلم فيه وجبة يُخصم يوم واحد من رصيدك، بدون أي دفعات إضافية طول مدة الباقة.
          </p>
        </div>

        <button
          onClick={claimTodayMeal}
          disabled={claimedToday || daysRemaining <= 0}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-white mb-6 disabled:opacity-50"
          style={{ background: claimedToday ? T.good : T.brandBright }}
        >
          {claimedToday ? <CheckCircle2 size={16} /> : <Utensils size={16} />}
          {claimedToday ? "تم استلام وجبة اليوم" : "استلام وجبة اليوم"}
        </button>

        <div className="flex items-center gap-1.5 text-xs font-bold mb-3" style={{ color: T.inkSoft }}>
          <CalendarDays size={14} />
          سجل الأيام المستخدمة
        </div>
        <div className="space-y-2">
          {transactions.map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div>
                <div className="text-sm font-medium">يوم {t.day} — {t.meal}</div>
                <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{t.time}</div>
              </div>
              <CheckCircle2 size={16} style={{ color: T.good }} />
            </div>
          ))}
        </div>

        {daysRemaining <= 5 && daysRemaining > 0 && (
          <div className="rounded-xl px-4 py-3 mt-4 text-xs font-bold text-center" style={{ background: "#FBEBE0", color: T.warn }}>
            باقتك قربت تخلص — {daysRemaining} أيام متبقية فقط
          </div>
        )}
      </div>
    </div>
  );
}
