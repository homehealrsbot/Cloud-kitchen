"use client";

import { useSyncExternalStore } from "react";

// بيانات ومحاكاة مشتركة بين لوحة الإدارة التنفيذية ولوحة المطبخ

export const T = {
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

export const ZONES = ["الروضة", "الشاطئ", "النزهة", "الصفا"];

export const SIM_MEALS = [
  { name: "صدر دجاج مشوي + أرز بني", kcal: 420, protein: 42, price: 32, uses: { "صدر دجاج": 1, "أرز": 1 } },
  { name: "سلمون مشوي + كينوا", kcal: 460, protein: 38, price: 42, uses: { "سلمون": 1, "كينوا": 1 } },
  { name: "شوفان بروتين + فواكه", kcal: 380, protein: 28, price: 22, uses: { "شوفان": 1, "فواكه": 1 } },
  { name: "سلطة دجاج + حمص وطحينة", kcal: 400, protein: 35, price: 28, uses: { "صدر دجاج": 1, "حمص": 1 } },
];

export const INVENTORY_INIT = [
  { name: "صدر دجاج", unit: "قطعة", stock: 42, cap: 60, low: 15, cost: 6 },
  { name: "أرز", unit: "حصة", stock: 55, cap: 70, low: 15, cost: 1.2 },
  { name: "سلمون", unit: "قطعة", stock: 20, cap: 40, low: 10, cost: 12 },
  { name: "كينوا", unit: "حصة", stock: 25, cap: 40, low: 10, cost: 3 },
  { name: "شوفان", unit: "حصة", stock: 18, cap: 50, low: 15, cost: 1 },
  { name: "فواكه", unit: "حصة", stock: 30, cap: 60, low: 15, cost: 2.5 },
  { name: "حمص", unit: "حصة", stock: 22, cap: 50, low: 15, cost: 2 },
];

export const NAMES = ["فهد", "نورة", "سارة", "عبدالله", "منيرة", "خالد", "لمى", "تركي", "هند", "بندر"];

export function timeNow() {
  return new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export type FeedEvent = { id: number; text: string; type: "new" | "renew" | "pause"; meal: string; time: string };
export type ProductionRow = { name: string; kcal: number; protein: number; count: number };
export type DeliveryRow = { zone: string; count: number };
export type InventoryRow = { name: string; unit: string; stock: number; cap: number; low: number; cost: number };
export type StockEvent = { id: number; meal: string; ingredient: string; before: number; after: number; qty: number; cost: number; time: string };
export type OrderRow = { id: number; customer: string; meal: string; amount: number; zone: string; time: string };
export type Meal = { id: string; name: string; price: number; kcal: number; available: boolean };

export const DEMO_MEALS: Meal[] = [
  { id: "1", name: "صدر دجاج مشوي + أرز بني", price: 32, kcal: 420, available: true },
  { id: "2", name: "سلمون مشوي + كينوا", price: 42, kcal: 460, available: true },
  { id: "3", name: "شوفان بروتين + فواكه", price: 22, kcal: 380, available: false },
];

// ---------------- قسم الموافقة (الجودة/المتابعة) ----------------
// أي وجبة يدخلها المطبخ تدخل قائمة انتظار — ما تنشر للعميل إلا بعد موافقة قسم منفصل.
// نستخدم localStorage مؤقتاً (بدل قاعدة بيانات حقيقية) عشان القائمة تكون مرئية بين لوحة
// المطبخ ولوحة الموافقة بنفس المتصفح، لحد ما نربط Supabase فعلياً.

export const GOAL_TAGS = ["تنزيل وزن", "ثبات الوزن", "زيادة عضل"] as const;
export type GoalTag = (typeof GOAL_TAGS)[number];

export type PendingMeal = {
  id: string;
  name: string;
  price: number;
  kcal: number;
  // القيم الغذائية والهدف إجبارية للإدخالات الجديدة. اختيارية في النوع فقط عشان
  // الإدخالات القديمة المحفوظة في المتصفح قبل هذا التحديث ما تتعطل.
  proteinG?: number;
  carbG?: number;
  fatG?: number;
  goalTag?: GoalTag;
  submittedAt: string;
  submittedBy: string;
};

export type RejectedMeal = PendingMeal & { reason: string; rejectedAt: string };

const PENDING_KEY = "foodstyle_pending_meals";
const REJECTED_KEY = "foodstyle_rejected_meals";
const PUBLISHED_KEY = "foodstyle_published_meals_local";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------------- طبقة قراءة localStorage بدون setState داخل useEffect ----------------
// نقرأ التخزين كمصدر خارجي عبر useSyncExternalStore (نفس أسلوب مخزن العمليات في lib/ops/store).
// الفايدة: ما نحتاج useEffect يسوي setState عند أول عرض (اللي كان يسبب renders متتالية)،
// وأي تبويب ثاني يعدّل نفس المفتاح ينعكس هنا تلقائياً.

const storeListeners = new Set<() => void>();
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function notifyStores() {
  storeListeners.forEach((l) => l());
}

function subscribeStore(cb: () => void) {
  storeListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith("foodstyle_")) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    storeListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

// التخزين المؤقت ضروري: useSyncExternalStore يطلب إن القيمة تبقى بنفس المرجع ما لم تتغير فعلياً
function readCached<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const hit = snapshotCache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = safeParse<T>(raw, fallback);
  snapshotCache.set(key, { raw, value });
  return value;
}

function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // التخزين ممتلئ أو غير متاح — نكمل بدون حفظ
  }
  snapshotCache.delete(key);
  notifyStores();
}

/**
 * يقرأ قيمة محفوظة في المتصفح. يرجّع `serverValue` أثناء العرض على الخادم وأول عرض في
 * المتصفح (يمنع اختلاف الهيدريشن)، وبعدها القيمة الحقيقية.
 */
function useStored<T>(key: string, fallback: T, serverValue: T): T {
  return useSyncExternalStore(
    subscribeStore,
    () => readCached<T>(key, fallback),
    () => serverValue,
  );
}

// true بعد ما يجهز المتصفح — يخلينا نفرّق بين "ما قرأنا بعد" و"فاضي فعلاً"
const noopSubscribe = () => () => {};
export function useStoreReady(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const NO_PENDING: PendingMeal[] = [];
const NO_REJECTED: RejectedMeal[] = [];
const NO_MEALS: Meal[] = [];

export function loadPendingMeals(): PendingMeal[] {
  if (typeof window === "undefined") return NO_PENDING;
  return readCached<PendingMeal[]>(PENDING_KEY, NO_PENDING);
}

export function savePendingMeals(list: PendingMeal[]) {
  if (typeof window === "undefined") return;
  writeStore(PENDING_KEY, list);
}

export function loadRejectedMeals(): RejectedMeal[] {
  if (typeof window === "undefined") return NO_REJECTED;
  return readCached<RejectedMeal[]>(REJECTED_KEY, NO_REJECTED);
}

export function saveRejectedMeals(list: RejectedMeal[]) {
  if (typeof window === "undefined") return;
  writeStore(REJECTED_KEY, list);
}

export function loadPublishedLocalMeals(): Meal[] {
  if (typeof window === "undefined") return NO_MEALS;
  return readCached<Meal[]>(PUBLISHED_KEY, NO_MEALS);
}

export function savePublishedLocalMeals(list: Meal[]) {
  if (typeof window === "undefined") return;
  writeStore(PUBLISHED_KEY, list);
}

// Hooks: تقرأ وتتابع التغييرات بدون useEffect/setState
export function usePendingMeals(): PendingMeal[] {
  return useStored<PendingMeal[]>(PENDING_KEY, NO_PENDING, NO_PENDING);
}
export function useRejectedMeals(): RejectedMeal[] {
  return useStored<RejectedMeal[]>(REJECTED_KEY, NO_REJECTED, NO_REJECTED);
}
export function usePublishedLocalMeals(): Meal[] {
  return useStored<Meal[]>(PUBLISHED_KEY, NO_MEALS, NO_MEALS);
}

// ---------------- برامج الاشتراك المخصصة (يديرها المطعم يدوياً) ----------------

export type SubscriptionPlan = { id: string; name: string; desc: string; icon: string };

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  { id: "keto", name: "خطة كيتو", desc: "كارب منخفض، دهون مرتفعة — لحرق دهون أسرع وطاقة أعلى", icon: "flame" },
  { id: "champion", name: "خطة الأبطال", desc: "بروتين عالي مصمم لدعم التمرين وبناء العضل", icon: "dumbbell" },
  { id: "lifestyle", name: "خطة نمط الحياة", desc: "وجبات متوازنة ومستدامة — بدون قيود متطرفة", icon: "leaf" },
  { id: "diabetes", name: "خطة السكري", desc: "مصممة بعناية لدعم مستوى سكر الدم الصحي", icon: "heart" },
  { id: "kids", name: "خطة الأطفال", desc: "وجبات مغذية وشهية تدعم نمو الأطفال وتركيزهم", icon: "baby" },
];

const PLANS_KEY = "foodstyle_subscription_plans";

export function loadPlans(): SubscriptionPlan[] {
  if (typeof window === "undefined") return DEFAULT_PLANS;
  const saved = readCached<SubscriptionPlan[] | null>(PLANS_KEY, null);
  return saved && saved.length > 0 ? saved : DEFAULT_PLANS;
}

export function savePlans(list: SubscriptionPlan[]) {
  if (typeof window === "undefined") return;
  writeStore(PLANS_KEY, list);
}

export function usePlans(): SubscriptionPlan[] {
  const saved = useStored<SubscriptionPlan[] | null>(PLANS_KEY, null, null);
  return saved && saved.length > 0 ? saved : DEFAULT_PLANS;
}

// ---------------- طلبات مجدولة بالتاريخ (اليوم / غداً / بعد غد) ----------------

export type ScheduledOrder = {
  id: string;
  customerName: string;
  orderNumber: string;
  stage: string;
  scheduledFor: "today" | "tomorrow" | "dayAfter";
};

const ORDERS_KEY = "foodstyle_scheduled_orders";

const NO_ORDERS: ScheduledOrder[] = [];

export function loadScheduledOrders(): ScheduledOrder[] {
  if (typeof window === "undefined") return NO_ORDERS;
  return readCached<ScheduledOrder[]>(ORDERS_KEY, NO_ORDERS);
}

export function saveScheduledOrders(list: ScheduledOrder[]) {
  if (typeof window === "undefined") return;
  writeStore(ORDERS_KEY, list);
}

export function useScheduledOrders(): ScheduledOrder[] {
  return useStored<ScheduledOrder[]>(ORDERS_KEY, NO_ORDERS, NO_ORDERS);
}

// ---------------- الملف الصحي للعميل (الحساسيات والهدف) ----------------

const ALLERGIES_KEY = "foodstyle_customer_allergies";
const GOAL_KEY = "foodstyle_customer_goal";
const NO_ALLERGIES: string[] = [];

export function saveCustomerAllergies(list: string[]) {
  if (typeof window === "undefined") return;
  writeStore(ALLERGIES_KEY, list);
}

export function saveCustomerGoal(goal: string) {
  if (typeof window === "undefined") return;
  writeStore(GOAL_KEY, goal);
}

export function useCustomerAllergies(): string[] {
  const saved = useStored<unknown>(ALLERGIES_KEY, NO_ALLERGIES, NO_ALLERGIES);
  return Array.isArray(saved) ? (saved as string[]) : NO_ALLERGIES;
}

// ---------------- أيام التوصيل ----------------

const DELIVERY_DAYS_KEY = "foodstyle_delivery_days";

export function saveDeliveryDays(list: string[]) {
  if (typeof window === "undefined") return;
  writeStore(DELIVERY_DAYS_KEY, list);
}
