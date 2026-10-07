"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChefHat, Package, ShieldCheck, Truck, CheckCircle2, Plus, X } from "lucide-react";
import { useScheduledOrders, saveScheduledOrders, ScheduledOrder, T } from "@/lib/kitchen-shared";


// المراحل: قيد التحضير → تم التغليف → فحص الجودة → تم الاستلام (المندوب) → تم التسليم
const STAGES = [
  { id: "preparing", label: "قيد التحضير", icon: ChefHat },
  { id: "packaged", label: "تم التغليف", icon: Package },
  { id: "quality", label: "فحص الجودة", icon: ShieldCheck },
  { id: "picked_up", label: "تم الاستلام (المندوب)", icon: Truck },
  { id: "delivered", label: "تم التسليم", icon: CheckCircle2 },
] as const;

// stage المحفوظ في المتصفح قد يكون من نسخة أقدم أو غير معروف. لو رجّعنا -1 من findIndex
// فإن STAGES[-1] هو undefined و .icon يرمي TypeError يطيّح الصفحة كاملة.
function stageIndexOf(stage: string): number {
  const i = STAGES.findIndex((s) => s.id === stage);
  return i < 0 ? 0 : i;
}

const DATE_TABS: { id: ScheduledOrder["scheduledFor"]; label: string }[] = [
  { id: "today", label: "اليوم" },
  { id: "tomorrow", label: "غداً" },
  { id: "dayAfter", label: "بعد غد" },
];

export default function OrdersBoardPage() {
  const orders = useScheduledOrders();
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [scheduledFor, setScheduledFor] = useState<ScheduledOrder["scheduledFor"]>("today");
  const [activeTab, setActiveTab] = useState<ScheduledOrder["scheduledFor"]>("today");
  const [confirming, setConfirming] = useState<{ orderId: string; nextLabel: string } | null>(null);

  function persist(list: ScheduledOrder[]) {
    saveScheduledOrders(list);
  }

  function addOrder() {
    if (!customerName || !orderNumber) return;
    const newOrder: ScheduledOrder = {
      id: crypto.randomUUID(),
      customerName,
      orderNumber,
      stage: "preparing",
      scheduledFor,
    };
    persist([newOrder, ...orders]);
    setCustomerName("");
    setOrderNumber("");
  }

  function requestAdvance(order: ScheduledOrder) {
    const idx = stageIndexOf(order.stage);
    const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
    setConfirming({ orderId: order.id, nextLabel: next.label });
  }

  function confirmAdvance() {
    if (!confirming) return;
    persist(
      orders.map((o) => {
        if (o.id !== confirming.orderId) return o;
        const idx = stageIndexOf(o.stage);
        const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
        return { ...o, stage: next.id };
      })
    );
    setConfirming(null);
  }

  function removeOrder(id: string) {
    persist(orders.filter((o) => o.id !== id));
  }

  const filtered = orders.filter((o) => o.scheduledFor === activeTab);

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-sm" style={{ color: T.brand }}>لوحة حالة الطلبات</span>
          <Link href="/admin/kitchen" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع للوحة المطبخ
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-xs mb-6" style={{ color: T.inkSoft }}>
          لوحة يدوية بالكامل — أضف الطلب، حدد تاريخه، وانقله بين المراحل بتأكيد صريح لكل خطوة. هذا الأساس اللي بعدين نربطه بالأتمتة.
        </p>

        {/* إضافة طلب */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-xs font-bold mb-3">إضافة طلب جديد</div>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <input
              placeholder="اسم العميل"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="col-span-2 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              placeholder="رقم الطلب"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <select
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value as ScheduledOrder["scheduledFor"])}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            >
              {DATE_TABS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <button onClick={addOrder} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brandBright }}>
            <Plus size={14} /> إضافة الطلب
          </button>
        </div>

        {/* تبويبات التاريخ */}
        <div className="flex gap-2 mb-6">
          {DATE_TABS.map((d) => {
            const count = orders.filter((o) => o.scheduledFor === d.id).length;
            return (
              <button
                key={d.id}
                onClick={() => setActiveTab(d.id)}
                className="rounded-full px-4 py-2 text-xs font-bold transition-colors"
                style={{
                  background: activeTab === d.id ? T.brandBright : T.surface,
                  color: activeTab === d.id ? "#fff" : T.ink,
                  border: `1px solid ${activeTab === d.id ? T.brandBright : T.border}`,
                }}
              >
                {d.label} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-xs py-16 text-center" style={{ color: T.inkSoft }}>ما فيه طلبات بهذا التاريخ — أضف طلب جديد فوق</div>
        )}

        <div className="space-y-3">
          {filtered.map((o) => {
            const stageIdx = stageIndexOf(o.stage);
            const StageIcon = STAGES[stageIdx].icon;
            const isLast = stageIdx === STAGES.length - 1;
            return (
              <div key={o.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold">{o.customerName}</div>
                    <div className="text-[11px]" style={{ color: T.inkSoft }}>رقم الطلب #{o.orderNumber}</div>
                  </div>
                  <span
                    className="flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5"
                    style={{ background: isLast ? T.goodTint : T.brandTint, color: isLast ? T.good : T.brand }}
                  >
                    <StageIcon size={13} />
                    {STAGES[stageIdx].label}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-3">
                  {STAGES.map((s, i) => (
                    <div key={s.id} className="flex-1 h-1.5 rounded-full" style={{ background: i <= stageIdx ? T.brandBright : T.border }} />
                  ))}
                </div>

                <div className="flex gap-2">
                  {!isLast && (
                    <button
                      onClick={() => requestAdvance(o)}
                      className="flex-1 rounded-lg py-2 text-xs font-bold text-white"
                      style={{ background: T.brandBright }}
                    >
                      نقل للمرحلة التالية: {STAGES[stageIdx + 1].label}
                    </button>
                  )}
                  {isLast && (
                    <button onClick={() => removeOrder(o.id)} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: T.goodTint, color: T.good }}>
                      إنهاء وإخفاء من اللوحة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* نافذة تأكيد الخطوة */}
      {confirming && (
        <div className="fixed inset-0 flex items-center justify-center px-6" style={{ background: "rgba(43,27,20,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.surface }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold">تأكيد الانتقال للمرحلة التالية</div>
              <button onClick={() => setConfirming(null)}><X size={18} style={{ color: T.inkSoft }} /></button>
            </div>
            <p className="text-xs mb-5" style={{ color: T.inkSoft }}>
              متأكد إنك تبي تنقل هذا الطلب إلى: <span className="font-bold" style={{ color: T.brand }}>{confirming.nextLabel}</span>؟
            </p>
            <div className="flex gap-2">
              <button onClick={confirmAdvance} className="flex-1 rounded-lg py-2.5 text-xs font-bold text-white" style={{ background: T.brandBright }}>
                تأكيد
              </button>
              <button onClick={() => setConfirming(null)} className="flex-1 rounded-lg py-2.5 text-xs font-bold" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
