"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChefHat,
  Truck,
  Radio,
  Package,
  ShoppingBag,
  ChevronRight,
  CalendarClock,
  Thermometer,
} from "lucide-react";
import {
  T,
  ZONES,
  SIM_MEALS,
  INVENTORY_INIT,
  NAMES,
  timeNow,
  ProductionRow,
  DeliveryRow,
  InventoryRow,
  StockEvent,
  OrderRow,
  Meal,
  DEMO_MEALS,
  PendingMeal,
  loadPendingMeals,
  savePendingMeals,
  loadPublishedLocalMeals,
} from "@/lib/kitchen-shared";
import { createClient } from "@/lib/supabase";
import { ClipboardList, Clock } from "lucide-react";

export default function KitchenDashboard() {
  const [production, setProduction] = useState<ProductionRow[]>(SIM_MEALS.map((m) => ({ ...m, count: 0 })));
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>(ZONES.map((z) => ({ zone: z, count: 0 })));
  const [inventory, setInventory] = useState<InventoryRow[]>(INVENTORY_INIT);
  const [stockEvents, setStockEvents] = useState<StockEvent[]>([]);
  const [todaysOrders, setTodaysOrders] = useState<OrderRow[]>([]);
  const idRef = useRef(1);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 3600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tick === 0) return;
    const id = idRef.current++;
    const roll = Math.random();
    if (roll >= 0.75) return; // إيقاف مؤقت — ما يولّد طلب تحضير فعلي
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
    const meal = SIM_MEALS[Math.floor(Math.random() * SIM_MEALS.length)];

    setTimeout(() => {
      setProduction((prev) => prev.map((m) => (m.name === meal.name ? { ...m, count: m.count + 1 } : m)));
      setDeliveries((prev) => prev.map((d) => (d.zone === zone ? { ...d, count: d.count + 1 } : d)));

      const newStockEvents: StockEvent[] = [];
      setInventory((prev) =>
        prev.map((row) => {
          const used = (meal.uses as unknown as Record<string, number>)[row.name];
          if (!used) return row;
          const before = row.stock;
          const after = Math.max(row.stock - used, 0);
          newStockEvents.push({
            id: id * 100 + row.name.length,
            meal: meal.name,
            ingredient: row.name,
            before,
            after,
            qty: used,
            cost: Math.round(used * row.cost * 100) / 100,
            time: timeNow(),
          });
          return { ...row, stock: after };
        })
      );
      setStockEvents((prev) => [...newStockEvents, ...prev].slice(0, 8));

      setTodaysOrders((prev) => [{ id, customer: name, meal: meal.name, amount: meal.price, zone, time: timeNow() }, ...prev].slice(0, 8));
    }, 400);
  }, [tick]);

  // نموذج إضافة وجبة — يدخل قائمة انتظار الموافقة، ما ينشر مباشرة
  const [meals, setMeals] = useState<Meal[]>(DEMO_MEALS);
  const [usingDemo, setUsingDemo] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [kcal, setKcal] = useState("");
  const [formError, setFormError] = useState("");
  const [pendingMeals, setPendingMeals] = useState<PendingMeal[]>([]);

  useEffect(() => {
    setPendingMeals(loadPendingMeals());
    const localPublished = loadPublishedLocalMeals();
    if (localPublished.length > 0) {
      setMeals((prev) => [...localPublished, ...prev]);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return;
    const supabase = createClient();
    supabase
      .from("meals")
      .select("id,name,price,kcal,available")
      .then(({ data, error }) => {
        if (!error && data) {
          setMeals(data as Meal[]);
          setUsingDemo(false);
        }
      });
  }, []);

  function submitForReview() {
    if (!name || !price || !kcal) {
      setFormError("عبّي الحقول الثلاثة كلها (الاسم، السعر، السعرات) قبل الإرسال");
      return;
    }
    setFormError("");
    const pending: PendingMeal = {
      id: crypto.randomUUID(),
      name,
      price: Number(price),
      kcal: Number(kcal),
      submittedAt: timeNow(),
      submittedBy: "لوحة المطبخ",
    };
    const updated = [pending, ...loadPendingMeals()];
    savePendingMeals(updated);
    setPendingMeals(updated);
    setName("");
    setPrice("");
    setKcal("");
  }

  const totalMeals = production.reduce((a, m) => a + m.count, 0);

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Food Style</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>لوحة المطبخ</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
              رجوع لاختيار اللوحة
              <ChevronRight size={13} />
            </Link>
            <div className="text-xs flex items-center gap-1.5" style={{ color: T.good }}>
              <Radio size={13} /> بيانات تجريبية حية
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-3 flex items-center gap-2 flex-wrap">
          <Link href="/admin/orders" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: T.brandTint, color: T.brand }}>
            <ShoppingBag size={13} /> لوحة حالة الطلبات
          </Link>
          <Link href="/admin/process" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: T.brandTint, color: T.brand }}>
            <ChefHat size={13} /> خريطة تحضير الوجبات
          </Link>
          <Link href="/admin/expiry" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: T.brandTint, color: T.brand }}>
            <CalendarClock size={13} /> صلاحية المكونات
          </Link>
          <Link href="/admin/temperature-log" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: T.brandTint, color: T.brand }}>
            <Thermometer size={13} /> سجل درجات الحرارة
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* خطة الإنتاج + طلبات اليوم */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <ChefHat size={17} style={{ color: T.brand }} />
              <div className="font-semibold text-sm">خطة إنتاج الغد</div>
            </div>
            <div className="space-y-3">
              {production.map((m) => {
                const pct = totalMeals > 0 ? (m.count / Math.max(totalMeals, 1)) * 100 : 0;
                return (
                  <div key={m.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold" style={{ color: T.brand }}>{m.count} وجبة</span>
                      <span className="font-medium">{m.name}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.bg }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: T.brandBright }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={17} style={{ color: T.brand }} />
              <div className="font-semibold text-sm">طلبات اليوم</div>
            </div>
            <div className="space-y-2 min-h-[180px]">
              {todaysOrders.length === 0 && <div className="text-xs py-10 text-center" style={{ color: T.inkSoft }}>بانتظار أول طلب…</div>}
              {todaysOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                  <div>
                    <div className="text-sm font-medium">{o.customer} — {o.meal}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{o.zone} · {o.time}</div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: T.brand }}>{o.amount} ﷼</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* المخزون + التوصيل */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <Package size={17} style={{ color: T.brand }} />
              <div className="font-semibold text-sm">المخزون اللحظي</div>
            </div>
            <div className="space-y-3">
              {inventory.map((row) => {
                const pct = Math.max(0, Math.min(100, (row.stock / row.cap) * 100));
                const isLow = row.stock <= row.low;
                return (
                  <div key={row.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: isLow ? T.warn : T.inkSoft }}>{row.stock} {row.unit}</span>
                      <span className="font-medium">{row.name}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.bg }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: isLow ? T.warn : T.brandBright }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <Truck size={17} style={{ color: T.brand }} />
              <div className="font-semibold text-sm">جدولة التوصيل حسب الحي</div>
            </div>
            <div className="space-y-3">
              {deliveries.map((d) => (
                <div key={d.zone} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                  <span className="text-sm font-medium">{d.zone}</span>
                  <span className="text-sm font-bold" style={{ color: T.brand }}>{d.count} توصيلة</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* سجل المخزون قبل/بعد */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Package size={17} style={{ color: T.brand }} />
            <div className="font-semibold text-sm">سجل المخزون — قبل وبعد كل عملية طبخ</div>
          </div>
          <div className="space-y-2 min-h-[100px]">
            {stockEvents.length === 0 && <div className="text-xs py-8 text-center" style={{ color: T.inkSoft }}>بانتظار أول عملية طبخ…</div>}
            {stockEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                <div>
                  <div className="text-sm font-medium">{e.ingredient} — {e.meal}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{e.before} ← {e.after} ({e.qty}−) · {e.time}</div>
                </div>
                <span className="text-sm font-bold" style={{ color: T.warn }}>{e.cost} ﷼</span>
              </div>
            ))}
          </div>
        </div>

        {/* إدارة القائمة */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-sm font-bold mb-1">إضافة وجبة جديدة</div>
          <p className="text-xs mb-4" style={{ color: T.inkSoft }}>
            الوجبة ما تُنشر مباشرة — تدخل قائمة انتظار موافقة قسم الجودة/المتابعة أولاً
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input placeholder="اسم الوجبة" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: T.border }} />
            <input placeholder="السعر" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: T.border }} />
            <input placeholder="السعرات" value={kcal} onChange={(e) => setKcal(e.target.value)} className="col-span-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: T.border }} />
          </div>
          <button onClick={submitForReview} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: T.brandBright }}>
            <ClipboardList size={15} /> إرسال لمراجعة الجودة
          </button>
          {formError && <div className="text-xs font-bold mt-2" style={{ color: T.warn }}>{formError}</div>}

          <div className="text-xs font-bold mt-6 mb-2" style={{ color: T.inkSoft }}>الوجبات المنشورة حالياً</div>
          <div className="space-y-2">
            {meals.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl px-4 py-3 border" style={{ borderColor: T.border, background: T.surface }}>
                <div>
                  <div className="text-sm font-bold">{m.name}</div>
                  <div className="text-xs" style={{ color: T.inkSoft }}>{m.kcal} سعرة · {m.price} ﷼</div>
                </div>
                <span className="text-[11px] rounded-full px-2.5 py-1" style={{ background: m.available ? T.goodTint : T.warnTint, color: m.available ? T.good : T.warn }}>
                  {m.available ? "متاح" : "غير متاح"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* قائمة انتظار الموافقة */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={17} style={{ color: T.warn }} />
              <div className="font-semibold text-sm">بانتظار موافقة الجودة/المتابعة ({pendingMeals.length})</div>
            </div>
            <Link href="/admin/approvals" className="text-xs font-bold" style={{ color: T.brand }}>
              فتح لوحة الموافقة ←
            </Link>
          </div>
          {pendingMeals.length === 0 && <div className="text-xs py-4 text-center" style={{ color: T.inkSoft }}>ما فيه وجبات بانتظار المراجعة حالياً</div>}
          <div className="space-y-2">
            {pendingMeals.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: T.warnTint }}>
                <div>
                  <div className="text-sm font-bold">{p.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{p.kcal} سعرة · {p.price} ﷼ · أرسلت {p.submittedAt}</div>
                </div>
                <span className="text-[11px] font-bold rounded-full px-2.5 py-1" style={{ background: T.warn, color: "#fff" }}>قيد المراجعة</span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/admin/executive" className="block rounded-2xl py-3.5 text-center text-sm font-bold" style={{ background: T.brandTint, color: T.brand }}>
          الانتقال للوحة الإدارة التنفيذية
        </Link>

        <div className="text-center text-[11px] mt-8 pb-4" style={{ color: T.inkSoft }}>
          لوحة المطبخ — تركز على التشغيل اليومي فقط، بدون الأرقام المالية الحساسة
        </div>
      </div>
    </div>
  );
}
