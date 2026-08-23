"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ---------- ألوان Food Style ----------
const T = {
  bg: "#FCF6F2",
  surface: "#FFFFFF",
  border: "#F0DFD3",
  ink: "#2B1B14",
  inkSoft: "#7A6153",
  brand: "#A84F2E",
  brandBright: "#D67A4F",
  brandTint: "#FBEEE6",
  warn: "#C0392B",
  warnTint: "#FBEBE0",
  good: "#2E9E6D",
  goodTint: "#E5F4ED",
};

const ZONES = ["الروضة", "الشاطئ", "النزهة", "الصفا"];

const SIM_MEALS = [
  { name: "صدر دجاج مشوي + أرز بني", kcal: 420, protein: 42, price: 32, uses: { "صدر دجاج": 1, "أرز": 1 } },
  { name: "سلمون مشوي + كينوا", kcal: 460, protein: 38, price: 42, uses: { "سلمون": 1, "كينوا": 1 } },
  { name: "شوفان بروتين + فواكه", kcal: 380, protein: 28, price: 22, uses: { "شوفان": 1, "فواكه": 1 } },
  { name: "سلطة دجاج + حمص وطحينة", kcal: 400, protein: 35, price: 28, uses: { "صدر دجاج": 1, "حمص": 1 } },
];

const INVENTORY_INIT = [
  { name: "صدر دجاج", unit: "قطعة", stock: 42, cap: 60, low: 15 },
  { name: "أرز", unit: "حصة", stock: 55, cap: 70, low: 15 },
  { name: "سلمون", unit: "قطعة", stock: 20, cap: 40, low: 10 },
  { name: "كينوا", unit: "حصة", stock: 25, cap: 40, low: 10 },
  { name: "شوفان", unit: "حصة", stock: 18, cap: 50, low: 15 },
  { name: "فواكه", unit: "حصة", stock: 30, cap: 60, low: 15 },
  { name: "حمص", unit: "حصة", stock: 22, cap: 50, low: 15 },
];

const NAMES = ["فهد", "نورة", "سارة", "عبدالله", "منيرة", "خالد", "لمى", "تركي", "هند", "بندر"];

function timeNow() {
  return new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type FeedEvent = { id: number; text: string; type: "new" | "renew" | "pause"; meal: string; time: string };
type ProductionRow = { name: string; kcal: number; protein: number; count: number };
type DeliveryRow = { zone: string; count: number };
type InventoryRow = { name: string; unit: string; stock: number; cap: number; low: number };
type OrderRow = { id: number; customer: string; meal: string; amount: number; zone: string; time: string };
type Meal = { id: string; name: string; price: number; kcal: number; available: boolean };

const DEMO_MEALS: Meal[] = [
  { id: "1", name: "صدر دجاج مشوي + أرز بني", price: 32, kcal: 420, available: true },
  { id: "2", name: "سلمون مشوي + كينوا", price: 42, kcal: 460, available: true },
  { id: "3", name: "شوفان بروتين + فواكه", price: 22, kcal: 380, available: false },
];

export default function AdminPage() {
  const [pulseStage, setPulseStage] = useState(-1);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [production, setProduction] = useState<ProductionRow[]>(
    SIM_MEALS.map((m) => ({ ...m, count: 0 }))
  );
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>(ZONES.map((z) => ({ zone: z, count: 0 })));
  const [inventory, setInventory] = useState<InventoryRow[]>(INVENTORY_INIT);
  const [todaysOrders, setTodaysOrders] = useState<OrderRow[]>([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [activeSubs, setActiveSubs] = useState(184);
  const [renewedToday, setRenewedToday] = useState(21);
  const [paused, setPaused] = useState(6);
  const [weekly, setWeekly] = useState([
    { d: "السبت", n: 26 },
    { d: "الأحد", n: 31 },
    { d: "الاثنين", n: 29 },
    { d: "الثلاثاء", n: 34 },
    { d: "الأربعاء", n: 30 },
    { d: "الخميس", n: 22 },
  ]);
  const idRef = useRef(1);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 3400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tick === 0) return;
    const id = idRef.current++;
    const roll = Math.random();
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
    const meal = SIM_MEALS[Math.floor(Math.random() * SIM_MEALS.length)];

    [0, 1, 2, 3, 4].forEach((stage, i) => setTimeout(() => setPulseStage(stage), i * 220));
    setTimeout(() => setPulseStage(-1), 5 * 220 + 500);

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

    setFeed((prev) => [{ id, text: eventText, type: eventType, meal: meal.name, time: timeNow() }, ...prev].slice(0, 7));

    if (eventType !== "pause") {
      setTimeout(() => {
        setProduction((prev) => prev.map((m) => (m.name === meal.name ? { ...m, count: m.count + 1 } : m)));
        setDeliveries((prev) => prev.map((d) => (d.zone === zone ? { ...d, count: d.count + 1 } : d)));
        setInventory((prev) =>
          prev.map((row) => {
            const used = (meal.uses as unknown as Record<string, number>)[row.name];
            if (!used) return row;
            return { ...row, stock: Math.max(row.stock - used, 0) };
          })
        );
        setTodaysOrders((prev) =>
          [{ id, customer: name, meal: meal.name, amount: meal.price, zone, time: timeNow() }, ...prev].slice(0, 8)
        );
        setRevenueToday((r) => r + meal.price);
      }, 500);
    }

    setTimeout(() => {
      setWeekly((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], n: next[next.length - 1].n + (eventType === "new" ? 1 : 0) };
        return next;
      });
    }, 800);
  }, [tick]);

  const totalMeals = production.reduce((a, m) => a + m.count, 0);

  const [meals, setMeals] = useState<Meal[]>(DEMO_MEALS);
  const [usingDemo, setUsingDemo] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");
  const [goalTag, setGoalTag] = useState("تنزيل وزن");
  const [ingredientsInput, setIngredientsInput] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
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

  async function addMeal() {
    if (!name || !price || !kcal) {
      setFormError("عبّي الحقول الثلاثة الأساسية (الاسم، السعر، السعرات) قبل الحفظ");
      return;
    }
    setFormError("");
    const newMeal: Meal = { id: crypto.randomUUID(), name, price: Number(price), kcal: Number(kcal), available: true };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) {
      const supabase = createClient();
      await supabase.from("meals").insert({
        name,
        price: Number(price),
        kcal: Number(kcal),
        protein_g: Number(protein) || 0,
        carb_g: Number(carb) || 0,
        fat_g: Number(fat) || 0,
        goal_tag: goalTag,
        ingredients: ingredientsInput.split("،").map((s) => s.trim()).filter(Boolean),
      });
    }

    setMeals((prev) => [newMeal, ...prev]);
    setName("");
    setPrice("");
    setKcal("");
    setProtein("");
    setCarb("");
    setFat("");
    setIngredientsInput("");
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Food Style</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>لوحة تحكم المطعم</div>
            </div>
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm">نظام اشتراك وجبات صحية</div>
            <div className="text-xs flex items-center gap-1.5 justify-end mt-1" style={{ color: T.good }}>
              <Radio size={13} /> يعمل الآن — بيانات تجريبية حية
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="rounded-2xl p-6 mb-8" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-sm font-semibold mb-1">كيف يعمل النظام</div>
          <div className="text-xs mb-6" style={{ color: T.inkSoft }}>
            كل حدث اشتراك يمر تلقائياً بهذا المسار — بدون تدخل يدوي في أي خطوة
          </div>
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
                    style={{
                      width: 46,
                      height: 46,
                      background: pulseStage === i ? T.brandBright : T.brandTint,
                      color: pulseStage === i ? "#fff" : T.brand,
                    }}
                  >
                    <s.icon size={20} />
                  </div>
                  <div className="text-[11px] text-center" style={{ color: T.inkSoft, maxWidth: 84 }}>{s.label}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-px mx-1 relative" style={{ background: T.border }}>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full transition-all duration-300"
                      style={{
                        background: T.brandBright,
                        right: pulseStage > i ? "0%" : pulseStage === i ? "50%" : "100%",
                        opacity: pulseStage >= i ? 1 : 0,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
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
            <div className="text-xs mb-1" style={{ color: T.inkSoft }}>وجبات الغد المخططة</div>
            <div className="text-2xl font-extrabold">{totalMeals}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={17} style={{ color: T.brand }} />
              <div className="font-semibold text-sm">سجل أحداث الاشتراك</div>
            </div>
            <div className="space-y-2 min-h-[280px]">
              {feed.length === 0 && <div className="text-xs py-10 text-center" style={{ color: T.inkSoft }}>بانتظار أول حدث…</div>}
              {feed.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl px-3 py-2.5"
                  style={{ background: e.type === "pause" ? T.warnTint : e.type === "new" ? T.goodTint : T.bg }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="text-sm font-medium"
                      style={{ color: e.type === "pause" ? "#9A4B1C" : e.type === "new" ? "#1E7A50" : T.ink }}
                    >
                      {e.text}
                    </div>
                    <div className="text-[11px]" style={{ color: T.inkSoft }}>{e.time}</div>
                  </div>
                  {e.type !== "pause" && <div className="text-[11px] mt-1" style={{ color: T.inkSoft }}>وجبة اليوم: {e.meal}</div>}
                </div>
              ))}
            </div>
          </div>

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
                    <div className="text-[10px] mt-1" style={{ color: T.inkSoft }}>{m.kcal} سعرة · {m.protein} غ بروتين</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
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

          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={17} style={{ color: T.brand }} />
              <div className="font-semibold text-sm">اشتراكات جديدة هذا الأسبوع</div>
            </div>
            <div style={{ width: "100%", height: 220 }}>
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

        {/* الملخص المالي اليومي */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.inkSoft }}>
              <Wallet size={13} /> الإيراد اليومي
            </div>
            <div className="text-2xl font-extrabold" style={{ color: T.good }}>{revenueToday.toLocaleString("ar-SA")} ﷼</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.inkSoft }}>
              <ShoppingBag size={13} /> عدد طلبات اليوم
            </div>
            <div className="text-2xl font-extrabold">{todaysOrders.length}</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: T.inkSoft }}>
              <TrendingUp size={13} /> متوسط قيمة الطلب
            </div>
            <div className="text-2xl font-extrabold">
              {todaysOrders.length > 0 ? Math.round(revenueToday / todaysOrders.length) : 0} ﷼
            </div>
          </div>
        </div>

        {/* المخزون + طلبات اليوم */}
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
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: isLow ? T.warn : T.brandBright }}
                      />
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
            <div className="space-y-2 min-h-[200px]">
              {todaysOrders.length === 0 && (
                <div className="text-xs py-10 text-center" style={{ color: T.inkSoft }}>بانتظار أول طلب…</div>
              )}
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

        <div className="rounded-2xl p-5 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold">إضافة وجبة جديدة</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: T.inkSoft }}>
            {usingDemo
              ? "تعرض حالياً بيانات تجريبية — اربط Supabase (شوف .env.example) عشان تتصل بقاعدة بيانات حقيقية"
              : "متصل بقاعدة البيانات الفعلية"}
          </p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              placeholder="اسم الوجبة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              placeholder="السعر"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              placeholder="السعرات"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className="col-span-2 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
          </div>

          <div className="text-xs font-bold mb-1.5 mt-3" style={{ color: T.inkSoft }}>القيم الغذائية</div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              placeholder="بروتين (غ)"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              placeholder="كارب (غ)"
              value={carb}
              onChange={(e) => setCarb(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              placeholder="دهون (غ)"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <select
              value={goalTag}
              onChange={(e) => setGoalTag(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            >
              <option value="تنزيل وزن">تنزيل وزن</option>
              <option value="ثبات الوزن">ثبات الوزن</option>
              <option value="زيادة عضل">زيادة عضل</option>
            </select>
            <input
              placeholder="المكونات (افصل بفاصلة ،)"
              value={ingredientsInput}
              onChange={(e) => setIngredientsInput(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
          </div>

          <button onClick={addMeal} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: T.brandBright }}>
            حفظ ونشر
          </button>
          {formError && (
            <div className="text-xs font-bold mt-2" style={{ color: T.warn }}>{formError}</div>
          )}

          <div className="space-y-2 mt-4">
            {meals.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl px-4 py-3 border" style={{ borderColor: T.border, background: T.surface }}>
                <div>
                  <div className="text-sm font-bold">{m.name}</div>
                  <div className="text-xs" style={{ color: T.inkSoft }}>{m.kcal} سعرة · {m.price} ﷼</div>
                </div>
                <span
                  className="text-[11px] rounded-full px-2.5 py-1"
                  style={{ background: m.available ? T.goodTint : T.warnTint, color: m.available ? T.good : T.warn }}
                >
                  {m.available ? "متاح" : "غير متاح"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] pb-4" style={{ color: T.inkSoft }}>
          هذا نموذج توضيحي — الجزء العلوي بيانات تجريبية حية، والنموذج السفلي متصل فعلياً بقاعدة البيانات
        </div>
      </div>
    </div>
  );
}
