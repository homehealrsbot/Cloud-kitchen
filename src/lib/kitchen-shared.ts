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
