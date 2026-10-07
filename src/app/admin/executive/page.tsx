"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  UserPlus,
  ChefHat,
  Truck,
  RefreshCw,
  Radio,
  Users,
  TrendingUp,
  Wallet,
  ShoppingBag,
  Package,
  ChevronRight,
} from "lucide-react";
import { T, ZONES, SIM_MEALS, NAMES, timeNow, FeedEvent, DeliveryRow } from "@/lib/kitchen-shared";

export default function ExecutiveDashboard() {
  const [pulseStage, setPulseStage] = useState(-1);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>(ZONES.map((z) => ({ zone: z, count: 0 })));
  const [activeSubs, setActiveSubs] = useState(184);
  const [renewedToday, setRenewedToday] = useState(21);
  const [paused, setPaused] = useState(6);
  const [revenueToday, setRevenueToday] = useState(0);
  const [costToday, setCostToday] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [weekly, setWeekly] = useState([
    { d: "السبت", n: 26 },
    { d: "الأحد", n: 31 },
    { d: "الاثنين", n: 29 },
    { d: "الثلاثاء", n: 34 },
    { d: "الأربعاء", n: 30 },
    { d: "الخميس", n: 22 },
  ]);
  const idRef = useRef(1);

  // محاكاة البيانات التجريبية: الدورة كلها داخل المؤقت، وكل المؤقتات الفرعية تُلغى عند مغادرة الصفحة
  // (قبل كذا كانت setTimeout بلا تنظيف فتستمر تحديثات الحالة بعد إغلاق الصفحة)
  useEffect(() => {
    const COST_PER_UNIT: Record<string, number> = {
      "صدر دجاج": 6, "أرز": 1.2, "سلمون": 12, "كينوا": 3, "شوفان": 1, "فواكه": 2.5, "حمص": 2,
    };
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        pendingTimers.delete(t);
        fn();
      }, ms);
      pendingTimers.add(t);
    };

    const interval = setInterval(() => {
      const id = idRef.current++;
      const roll = Math.random();
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
      const meal = SIM_MEALS[Math.floor(Math.random() * SIM_MEALS.length)];

      [0, 1, 2, 3, 4].forEach((stage, i) => later(() => setPulseStage(stage), i * 220));
      later(() => setPulseStage(-1), 5 * 220 + 500);

      let eventText = "";
      let eventType: FeedEvent["type"] = "new";
      if (roll < 0.45) {
        eventText = `اشتراك جديد: ${name} — ${zone}`;
        eventType = "new";
        setActiveSubs((s) => s + 1);
      } else if (roll < 0.75) {
        eventText = `تجديد اشتراك: ${name}`;
        eventType = "renew";
        setRenewedToday((r) => r + 1);
      } else {
        eventText = `إيقاف مؤقت: ${name}`;
        eventType = "pause";
        setPaused((p) => p + 1);
        setActiveSubs((s) => Math.max(s - 1, 0));
      }

      setFeed((prev) => [{ id, text: eventText, type: eventType, meal: meal.name, time: timeNow() }, ...prev].slice(0, 6));

      if (eventType !== "pause") {
        later(() => {
          setDeliveries((prev) => prev.map((d) => (d.zone === zone ? { ...d, count: d.count + 1 } : d)));
          const mealCost = Object.entries(meal.uses).reduce(
            (sum, [ing, qty]) => sum + (COST_PER_UNIT[ing] ?? 0) * (qty as number),
            0,
          );
          setRevenueToday((r) => r + meal.price);
          setCostToday((c) => Math.round((c + mealCost) * 100) / 100);
          setOrderCount((o) => o + 1);
          setWeekly((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], n: next[next.length - 1].n + 1 };
            return next;
          });
        }, 500);
      }
    }, 3600);

    return () => {
      clearInterval(interval);
      pendingTimers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const netProfit = Math.round((revenueToday - costToday) * 100) / 100;

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Food Style</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>لوحة الإدارة التنفيذية</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/ops" className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: T.brand }}>
              مركز العمليات (المنيو، التسعير، الجودة)
            </Link>
            <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
              رجوع لاختيار اللوحة
              <ChevronRight size={13} />
            </Link>
            <div className="text-xs flex items-center gap-1.5" style={{ color: T.good }}>
              <Radio size={13} /> بيانات تجريبية حية
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* مسار الأتمتة */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-sm font-semibold mb-1">دورة النظام الكاملة</div>
          <div className="text-xs mb-6" style={{ color: T.inkSoft }}>نظرة تنفيذية على مسار كل اشتراك من التسجيل للتحديث</div>
          <div className="flex items-center justify-between">
            {[
              { icon: UserPlus, label: "تسجيل / تجديد" },
              { icon: Users, label: "مطابقة الوجبة" },
              { icon: ChefHat, label: "تخطيط الإنتاج" },
              { icon: Truck, label: "جدولة التوصيل" },
              { icon: RefreshCw, label: "تحديث الاشتراك" },
            ].map((s, i, arr) => (
              <div key={i} className="flex items-center" style={{ flex: i < arr.length - 1 ? 1 : "none" }}>
                <div className="flex flex-col items-center gap-2" style={{ minWidth: 84 }}>
                  <div
                    className="rounded-full flex items-center justify-center transition-all duration-300"
                    style={{ width: 46, height: 46, background: pulseStage === i ? T.brandBright : T.brandTint, color: pulseStage === i ? "#fff" : T.brand }}
                  >
                    <s.icon size={20} />
                  </div>
                  <div className="text-[11px] text-center" style={{ color: T.inkSoft, maxWidth: 84 }}>{s.label}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-px mx-1 relative" style={{ background: T.border }}>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full transition-all duration-300"
                      style={{ background: T.brandBright, right: pulseStage > i ? "0%" : pulseStage === i ? "50%" : "100%", opacity: pulseStage >= i ? 1 : 0 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* مؤشرات الاشتراكات */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-xs mb-1" style={{ color: T.inkSoft }}>مشتركين نشطين</div>
            <div className="text-2xl font-extrabold">{activeSubs}</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-xs mb-1" style={{ color: T.inkSoft }}>تجديدات اليوم</div>
            <div className="text-2xl font-extrabold" style={{ color: T.good }}>{renewedToday}</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-xs mb-1" style={{ color: T.inkSoft }}>إيقاف مؤقت</div>
            <div className="text-2xl font-extrabold" style={{ color: T.warn }}>{paused}</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-xs mb-1" style={{ color: T.inkSoft }}>طلبات اليوم</div>
            <div className="text-2xl font-extrabold">{orderCount}</div>
          </div>
        </div>

        {/* الملخص المالي */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.inkSoft }}>
              <Wallet size={13} /> قيمة مسحوبة من المحافظ
            </div>
            <div className="text-2xl font-extrabold" style={{ color: T.good }}>{revenueToday.toLocaleString("ar-SA")} ﷼</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.inkSoft }}>
              <Package size={13} /> تكلفة المكونات الفعلية
            </div>
            <div className="text-2xl font-extrabold" style={{ color: T.warn }}>{costToday.toLocaleString("ar-SA")} ﷼</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.inkSoft }}>
              <TrendingUp size={13} /> صافي الربح التقديري
            </div>
            <div className="text-2xl font-extrabold" style={{ color: T.good }}>{netProfit.toLocaleString("ar-SA")} ﷼</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* سجل الاشتراكات */}
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={17} style={{ color: T.brand }} />
              <div className="font-semibold text-sm">سجل أحداث الاشتراك</div>
            </div>
            <div className="space-y-2 min-h-[240px]">
              {feed.length === 0 && <div className="text-xs py-10 text-center" style={{ color: T.inkSoft }}>بانتظار أول حدث…</div>}
              {feed.map((e) => (
                <div key={e.id} className="rounded-xl px-3 py-2.5" style={{ background: e.type === "pause" ? T.warnTint : e.type === "new" ? T.goodTint : T.bg }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium" style={{ color: e.type === "pause" ? "#9A4B1C" : e.type === "new" ? "#1E7A50" : T.ink }}>{e.text}</div>
                    <div className="text-[11px]" style={{ color: T.inkSoft }}>{e.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* رسم بياني أسبوعي */}
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={17} style={{ color: T.brand }} />
              <div className="font-semibold text-sm">اشتراكات جديدة هذا الأسبوع</div>
            </div>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={weekly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={{ stroke: T.border }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${T.border}` }} labelStyle={{ color: T.ink }} />
                  <Bar dataKey="n" fill={T.brandBright} radius={[6, 6, 0, 0]} name="اشتراكات جديدة" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* التوصيل حسب الحي */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Truck size={17} style={{ color: T.brand }} />
            <div className="font-semibold text-sm">توزيع التوصيل حسب الحي</div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {deliveries.map((d) => (
              <div key={d.zone} className="rounded-xl px-3 py-3 text-center" style={{ background: T.bg }}>
                <div className="text-sm font-bold">{d.zone}</div>
                <div className="text-lg font-extrabold mt-1" style={{ color: T.brand }}>{d.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/kitchen" className="flex-1 rounded-2xl py-3.5 text-center text-sm font-bold text-white" style={{ background: T.brandBright }}>
            <ShoppingBag size={16} className="inline ml-1.5" />
            الانتقال للوحة المطبخ
          </Link>
        </div>

        <div className="text-center text-[11px] mt-8 pb-4" style={{ color: T.inkSoft }}>
          لوحة الإدارة التنفيذية — رؤية شاملة للأعمال والمالية، بدون تفاصيل تشغيل المطبخ اليومية
        </div>
      </div>
    </div>
  );
}
