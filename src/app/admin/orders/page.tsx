"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChefHat, Package, ShieldCheck, Truck, CheckCircle2, Plus } from "lucide-react";

const T = {
  bg: "#FCF6F2",
  surface: "#FFFFFF",
  border: "#F0DFD3",
  ink: "#2B1B14",
  inkSoft: "#7A6153",
  brand: "#A84F2E",
  brandBright: "#D67A4F",
  brandTint: "#FBEEE6",
  good: "#2E9E6D",
  goodTint: "#E5F4ED",
};

// المراحل: قيد التحضير → تم التحضير/التغليف → فحص الجودة → تم الاستلام (من المندوب) → تم التسليم (للعميل)
const STAGES = [
  { id: "preparing", label: "قيد التحضير", icon: ChefHat },
  { id: "packaged", label: "تم التغليف", icon: Package },
  { id: "quality", label: "فحص الجودة", icon: ShieldCheck },
  { id: "picked_up", label: "تم الاستلام (المندوب)", icon: Truck },
  { id: "delivered", label: "تم التسليم", icon: CheckCircle2 },
] as const;

type StageId = (typeof STAGES)[number]["id"];

type Order = { id: string; customerName: string; orderNumber: string; stage: StageId };

export default function OrdersBoardPage() {
  // لوحة يدوية بالكامل — الموظف يضيف الطلب وينقله بنفسه بين المراحل، بدون أي توليد تلقائي لبيانات وهمية
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  function addOrder() {
    if (!customerName || !orderNumber) return;
    setOrders((prev) => [{ id: crypto.randomUUID(), customerName, orderNumber, stage: "preparing" }, ...prev]);
    setCustomerName("");
    setOrderNumber("");
  }

  function advanceStage(id: string) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const idx = STAGES.findIndex((s) => s.id === o.stage);
        const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
        return { ...o, stage: next.id };
      })
    );
  }

  function removeOrder(id: string) {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

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
          لوحة يدوية بالكامل — أضف الطلب واضغط لتنقله بين المراحل بنفسك. هذا الأساس اللي بعدين نربطه بالأتمتة تلقائياً.
        </p>

        {/* إضافة طلب */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-xs font-bold mb-3">إضافة طلب جديد</div>
          <div className="grid grid-cols-3 gap-2">
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
          </div>
          <button onClick={addOrder} className="mt-3 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brandBright }}>
            <Plus size={14} /> إضافة الطلب
          </button>
        </div>

        {orders.length === 0 && (
          <div className="text-xs py-16 text-center" style={{ color: T.inkSoft }}>ما فيه طلبات حالياً — أضف طلب جديد فوق للبدء</div>
        )}

        <div className="space-y-3">
          {orders.map((o) => {
            const stageIdx = STAGES.findIndex((s) => s.id === o.stage);
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

                {/* مؤشر المراحل */}
                <div className="flex items-center gap-1 mb-3">
                  {STAGES.map((s, i) => (
                    <div key={s.id} className="flex-1 h-1.5 rounded-full" style={{ background: i <= stageIdx ? T.brandBright : T.border }} />
                  ))}
                </div>

                <div className="flex gap-2">
                  {!isLast && (
                    <button
                      onClick={() => advanceStage(o.id)}
                      className="flex-1 rounded-lg py-2 text-xs font-bold text-white"
                      style={{ background: T.brandBright }}
                    >
                      نقل للمرحلة التالية: {STAGES[stageIdx + 1].label}
                    </button>
                  )}
                  {isLast && (
                    <button
                      onClick={() => removeOrder(o.id)}
                      className="flex-1 rounded-lg py-2 text-xs font-bold"
                      style={{ background: T.goodTint, color: T.good }}
                    >
                      إنهاء وإخفاء من اللوحة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
