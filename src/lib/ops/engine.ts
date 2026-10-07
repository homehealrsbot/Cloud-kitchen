// محرك عمليات المطبخ — يطابق صيغ ملف العمليات (Master_Menu / Recipes / Allergens / الإنتاج / بطاقة_المطبخ / Eng_Matrix).
// دوال صافية بدون React ولا متصفح، عشان نقدر نختبرها مقابل أرقام الملف الأصلي.

// ---------------- الأنواع ----------------

export type Level = "lean" | "balanced" | "performance";
export type IngType = "P" | "C" | "V" | "S";
export type GateStatus = "READY" | "PENDING" | "HOLD";
export type SkuStatus = "READY" | "PENDING" | "HOLD";

export const LEVELS: { key: Level; label: string }[] = [
  { key: "lean", label: "Lean" },
  { key: "balanced", label: "Balanced" },
  { key: "performance", label: "Performance" },
];

export const ING_TYPE_LABEL: Record<IngType, string> = {
  P: "بروتين",
  C: "كارب / قاعدة",
  V: "خضار",
  S: "صلصة / دهون / نكهات",
};

export const ALLERGENS = [
  { key: "gluten", label: "غلوتين" },
  { key: "dairy", label: "ألبان" },
  { key: "egg", label: "بيض" },
  { key: "fish", label: "سمك" },
  { key: "shellfish", label: "قشريات" },
  { key: "nuts", label: "مكسرات" },
  { key: "peanut", label: "فول سوداني" },
  { key: "soy", label: "صويا" },
  { key: "sesame", label: "سمسم" },
  { key: "celery", label: "كرفس" },
] as const;

export type AllergenKey = (typeof ALLERGENS)[number]["key"];

export interface Ingredient {
  key: string;
  name: string;
  nameEn: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
  price: number; // ر.س / كجم
  allergenText: string;
  source: string;
  flags: Record<AllergenKey, boolean>;
  hidden: string; // مواد خفية محتملة
}

export interface RecipeLine {
  sku: string;
  type: IngType;
  ing: string;
  grams: number;
}

export interface MenuItem {
  id: string;
  section: string;
  category: string;
  name: string;
  nameEn: string;
  cuisine: string;
  identity: string;
  shelfLifeH: number;
  reheat: string;
  opsNote: string;
  method: string;
  engGroup: string;
}

export interface SectionSettings {
  packaging: number;
  targetCostPct: number;
  labor: number;
}

export interface Settings {
  multipliers: Record<IngType, Record<Level, number>>;
  sections: Record<string, SectionSettings>;
  wastePct: number;
  spiceAllowance: number;
  priceRoundStep: number;
  lowCarbMax: number;
  highProteinMin: number;
  kcalDiffMax: number;
  vatRate: number;
  priceIncludesVat: number;
  paymentFeePct: number;
  appCommissionPct: number;
  appSalesShare: number;
  marginWarnPct: number;
  shelfLifeApprovalH: number; // أي صلاحية معلنة أعلى من هذا الحد تحتاج اعتماد بوابة الصلاحية
}

export interface Rotation {
  slotLabels: string[];
  slotRule: string[];
  days: { label: string; slots: string[] }[];
  rules: string;
}

export interface OpsData {
  ingredients: Ingredient[];
  recipes: RecipeLine[];
  menu: MenuItem[];
  rotation: Rotation;
  settings: Settings;
}

// ---------------- بوابات الجودة ----------------

export const GATES = [
  "وصفة + Pilot",
  "مكوّنات وموردون",
  "حساسية",
  "تغذية",
  "سلامة الغذاء",
  "صلاحية",
  "ملصق",
  "سعر وهامش",
] as const;

export const GATE_SHELF = 5;
export const GATE_PRICE = 7;

// البوابات اللي ترجع "بانتظار الاعتماد" إذا تغيّرت الوصفة:
// الوصفة + Pilot، الحساسية، التغذية، الملصق، السعر والهامش.
// مصدر واحد — يستخدمه المخزن عند الحفظ وتستخدمه صفحة الوصفات في رسالة التنبيه،
// عشان ما تختلف الرسالة عن السلوك الفعلي.
export const GATES_RESET_ON_RECIPE_CHANGE: readonly number[] = [0, 2, 3, 6, GATE_PRICE];

export const ING_APPROVALS = ["اعتماد المورد", "إقرار الحساسية", "سعر موثّق"] as const;
export const ING_APPROVAL_PRICE = 2;

export const SECTIONS = ["رئيسي", "فطور", "سناك", "شوربة", "سلطة", "حلا"];
export const MAIN_SECTION = "رئيسي";

// ---------------- حسابات الصنف ----------------

export interface ComputedLine {
  index: number; // موقع السطر في مصفوفة الوصفات
  type: IngType;
  ing: string;
  name: string;
  missing: boolean; // رمز المكوّن غير موجود في قاعدة المكوّنات
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
  cost: number;
}

export interface ComputedSku {
  item: MenuItem;
  isMain: boolean;
  lines: ComputedLine[];
  rawWeight: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
  kcalLean: number | null;
  proteinLean: number | null;
  kcalPerf: number | null;
  proteinPerf: number | null;
  lowCarb: boolean;
  highProtein: boolean;
  kcalDiff: number;
  kcalDiffOk: boolean;
  allergenFlags: Record<AllergenKey, boolean>;
  allergens: string; // "لا يوجد" أو قائمة مفصولة بفواصل
  hiddenAllergens: string[];
  // ---- مالي (لا يظهر إلا لمن عنده صلاحية المالية) ----
  ingCost: number;
  totalCost: number;
  price: number;
  costPct: number;
  marginPerDish: number;
  priceExVat: number;
  labor: number;
  fees: number;
  fullCost: number;
  contribution: number;
  contributionPct: number;
  ingCostPerf: number;
  totalCostPerf: number;
  pricePerf: number;
  perfMarginAtBalanced: number;
  marginAlert: boolean;
}

// CEILING كما في الإكسل، مع تقريب بسيط يحمينا من كسور الفاصلة العائمة (مثال 31.000000000001)
export function ceilToStep(value: number, step: number): number {
  if (!step || step <= 0) return value;
  const q = Math.round((value / step) * 1e9) / 1e9;
  return Math.ceil(q) * step;
}

export function levelMultiplier(settings: Settings, type: IngType, level: Level, isMain: boolean): number {
  if (!isMain || level === "balanced") return 1;
  return settings.multipliers[type]?.[level] ?? 1;
}

export function computeMenu(data: OpsData): ComputedSku[] {
  const { settings } = data;
  const ingMap = new Map(data.ingredients.map((i) => [i.key, i]));
  const bySku = new Map<string, { line: RecipeLine; index: number }[]>();
  data.recipes.forEach((line, index) => {
    const arr = bySku.get(line.sku);
    if (arr) arr.push({ line, index });
    else bySku.set(line.sku, [{ line, index }]);
  });
  const vatDivisor = 1 + settings.vatRate * settings.priceIncludesVat;
  const feeRate = settings.paymentFeePct + settings.appCommissionPct * settings.appSalesShare;

  return data.menu.map((item) => {
    const isMain = item.section === MAIN_SECTION;
    const sec = settings.sections[item.section] ?? { packaging: 0, targetCostPct: 1, labor: 0 };
    const rows = bySku.get(item.id) ?? [];
    const flags = Object.fromEntries(ALLERGENS.map((a) => [a.key, false])) as Record<AllergenKey, boolean>;
    const hidden: string[] = [];
    let rawWeight = 0, kcal = 0, protein = 0, carb = 0, fat = 0, fiber = 0, ingCost = 0;
    let kcalLean = 0, proteinLean = 0, kcalPerf = 0, proteinPerf = 0, ingCostPerfMain = 0;

    const lines: ComputedLine[] = rows.map(({ line, index }) => {
      const ing = ingMap.get(line.ing);
      const g = Number(line.grams) || 0;
      const l: ComputedLine = {
        index,
        type: line.type,
        ing: line.ing,
        name: ing?.name ?? line.ing,
        missing: !ing,
        grams: g,
        kcal: ing ? (g / 100) * ing.kcal : 0,
        protein: ing ? (g / 100) * ing.protein : 0,
        carb: ing ? (g / 100) * ing.carb : 0,
        fat: ing ? (g / 100) * ing.fat : 0,
        fiber: ing ? (g / 100) * ing.fiber : 0,
        cost: ing ? (g / 1000) * ing.price : 0,
      };
      const mLean = settings.multipliers[line.type]?.lean ?? 1;
      const mPerf = settings.multipliers[line.type]?.performance ?? 1;
      rawWeight += g;
      kcal += l.kcal;
      protein += l.protein;
      carb += l.carb;
      fat += l.fat;
      fiber += l.fiber;
      ingCost += l.cost;
      kcalLean += l.kcal * mLean;
      proteinLean += l.protein * mLean;
      kcalPerf += l.kcal * mPerf;
      proteinPerf += l.protein * mPerf;
      ingCostPerfMain += l.cost * mPerf;
      if (ing) {
        for (const a of ALLERGENS) if (ing.flags[a.key]) flags[a.key] = true;
        if (ing.hidden && !hidden.includes(ing.hidden)) hidden.push(ing.hidden);
      }
      return l;
    });

    const allergenList = ALLERGENS.filter((a) => flags[a.key]).map((a) => a.label);
    const totalCost = ingCost * (1 + settings.wastePct) + settings.spiceAllowance + sec.packaging;
    const price = ceilToStep(totalCost / sec.targetCostPct, settings.priceRoundStep);
    const priceExVat = price / vatDivisor;
    const labor = sec.labor;
    const fees = priceExVat * feeRate;
    const fullCost = totalCost + labor + fees;
    const contribution = priceExVat - fullCost;
    const contributionPct = priceExVat ? contribution / priceExVat : 0;
    const ingCostPerf = isMain ? ingCostPerfMain : ingCost;
    const totalCostPerf = ingCostPerf * (1 + settings.wastePct) + settings.spiceAllowance + sec.packaging;
    const pricePerf = ceilToStep(totalCostPerf / sec.targetCostPct, settings.priceRoundStep);
    const kcalDiff = kcal ? Math.abs(kcal - (4 * protein + 4 * carb + 9 * fat)) / kcal : 0;

    return {
      item,
      isMain,
      lines,
      rawWeight,
      kcal,
      protein,
      carb,
      fat,
      fiber,
      kcalLean: isMain ? kcalLean : null,
      proteinLean: isMain ? proteinLean : null,
      kcalPerf: isMain ? kcalPerf : null,
      proteinPerf: isMain ? proteinPerf : null,
      lowCarb: carb <= settings.lowCarbMax,
      highProtein: (item.section === MAIN_SECTION || item.section === "سلطة") && protein >= settings.highProteinMin,
      kcalDiff,
      kcalDiffOk: kcalDiff <= settings.kcalDiffMax,
      allergenFlags: flags,
      allergens: allergenList.length ? allergenList.join("، ") : "لا يوجد",
      hiddenAllergens: hidden,
      ingCost,
      totalCost,
      price,
      costPct: price ? totalCost / price : 0,
      marginPerDish: price - totalCost,
      priceExVat,
      labor,
      fees,
      fullCost,
      contribution,
      contributionPct,
      ingCostPerf,
      totalCostPerf,
      pricePerf,
      perfMarginAtBalanced: priceExVat ? (priceExVat - (totalCostPerf + labor + fees)) / priceExVat : 0,
      marginAlert: contributionPct < settings.marginWarnPct || contribution < 0,
    };
  });
}

// ---------------- حالة الصنف من البوابات ----------------

export interface SkuQuality {
  status: SkuStatus;
  blocker: string; // العائق الأول ("" إذا جاهز)
  alert: string; // تنبيه آلي ("" إذا ما فيه)
  readyCount: number;
}

export function defaultGates(): GateStatus[] {
  return GATES.map(() => "PENDING" as GateStatus);
}

export function deriveSkuQuality(gates: GateStatus[], shelfLifeH: number, settings: Settings): SkuQuality {
  const g = GATES.map((_, i) => gates[i] ?? "PENDING");
  const readyCount = g.filter((s) => s === "READY").length;
  // تنبيه آلي: صلاحية معلنة طويلة بدون اعتماد بوابة الصلاحية = إيقاف
  if (shelfLifeH > settings.shelfLifeApprovalH && g[GATE_SHELF] !== "READY") {
    const alert = `صلاحية معلنة ${shelfLifeH} س بلا اعتماد`;
    return { status: "HOLD", blocker: alert, alert, readyCount };
  }
  const holdIdx = g.indexOf("HOLD");
  if (holdIdx >= 0) return { status: "HOLD", blocker: GATES[holdIdx], alert: "", readyCount };
  if (readyCount === GATES.length) return { status: "READY", blocker: "", alert: "", readyCount };
  const firstOpen = g.findIndex((s) => s !== "READY");
  return { status: "PENDING", blocker: GATES[firstOpen], alert: "", readyCount };
}

export const STATUS_LABEL: Record<SkuStatus, string> = {
  READY: "جاهز للبيع",
  PENDING: "بانتظار الاعتماد",
  HOLD: "متوقف",
};

// ---------------- خطة الإنتاج والمشتريات ----------------

export interface ProductionRow {
  slot: number;
  slotLabel: string;
  sku: ComputedSku | undefined;
  skuId: string;
  portions: number;
  revenue: number; // صافٍ بدون ضريبة
  totalFullCost: number;
  margin: number;
}

export interface ShoppingRow {
  key: string;
  name: string;
  grams: number; // مطلوب قبل الهدر
  buyKg: number; // شامل الهدر
  price: number;
  cost: number;
}

export interface ProductionPlan {
  rows: ProductionRow[];
  totals: { portions: number; revenue: number; cost: number; marginPct: number | null };
  shopping: ShoppingRow[];
  shoppingCost: number;
}

export function computeProduction(
  data: OpsData,
  computed: ComputedSku[],
  dayIndex: number,
  portions: Record<number, number>,
): ProductionPlan {
  const day = data.rotation.days[dayIndex];
  const skuMap = new Map(computed.map((c) => [c.item.id, c]));
  const portionsBySku = new Map<string, number>();
  const rows: ProductionRow[] = (day?.slots ?? []).map((skuId, slot) => {
    const sku = skuMap.get(skuId);
    const n = Math.max(0, Number(portions[slot]) || 0);
    portionsBySku.set(skuId, (portionsBySku.get(skuId) ?? 0) + n);
    const revenue = sku ? n * sku.priceExVat : 0;
    const totalFullCost = sku ? n * sku.fullCost : 0;
    return {
      slot,
      slotLabel: data.rotation.slotLabels[slot] ?? `خانة ${slot + 1}`,
      sku,
      skuId,
      portions: n,
      revenue,
      totalFullCost,
      margin: revenue - totalFullCost,
    };
  });

  // الكميات على أساس الوصفة الأساسية (Balanced) × الحصص المخططة — كما في الملف
  const gramsByIng = new Map<string, number>();
  for (const line of data.recipes) {
    const n = portionsBySku.get(line.sku);
    if (!n) continue;
    gramsByIng.set(line.ing, (gramsByIng.get(line.ing) ?? 0) + (Number(line.grams) || 0) * n);
  }
  const shopping: ShoppingRow[] = [];
  for (const ing of data.ingredients) {
    const grams = gramsByIng.get(ing.key) ?? 0;
    if (grams <= 0) continue;
    const buyKg = (grams / 1000) * (1 + data.settings.wastePct);
    shopping.push({ key: ing.key, name: ing.name, grams, buyKg, price: ing.price, cost: buyKg * ing.price });
  }

  const totalPortions = rows.reduce((a, r) => a + r.portions, 0);
  const revenue = rows.reduce((a, r) => a + r.revenue, 0);
  const cost = rows.reduce((a, r) => a + r.totalFullCost, 0);
  return {
    rows,
    totals: { portions: totalPortions, revenue, cost, marginPct: revenue ? (revenue - cost) / revenue : null },
    shopping,
    shoppingCost: shopping.reduce((a, s) => a + s.cost, 0),
  };
}

// ---------------- بطاقة المطبخ ----------------

export interface KitchenCard {
  sku: ComputedSku;
  level: Level;
  batch: number;
  lines: { name: string; type: IngType; gramsPerPortion: number; batchKg: number }[];
  rawPerPortion: number;
  batchKg: number;
  nutrition: { level: Level; kcal: number | null; protein: number | null }[];
}

export function computeKitchenCard(data: OpsData, sku: ComputedSku, level: Level, batch: number): KitchenCard {
  const b = Math.max(0, Number(batch) || 0);
  const lines = sku.lines.map((l) => {
    const gramsPerPortion = l.grams * levelMultiplier(data.settings, l.type, level, sku.isMain);
    return { name: l.name, type: l.type, gramsPerPortion, batchKg: (gramsPerPortion * b) / 1000 };
  });
  return {
    sku,
    level,
    batch: b,
    lines,
    rawPerPortion: lines.reduce((a, l) => a + l.gramsPerPortion, 0),
    batchKg: lines.reduce((a, l) => a + l.batchKg, 0),
    nutrition: [
      { level: "lean", kcal: sku.kcalLean, protein: sku.proteinLean },
      { level: "balanced", kcal: sku.kcal, protein: sku.protein },
      { level: "performance", kcal: sku.kcalPerf, protein: sku.proteinPerf },
    ],
  };
}

// ---------------- فحص جدول الدوران ----------------

export interface RotationDayCheck {
  chicken: number;
  meat: number;
  seafood: number;
  ruleOk: boolean; // 4 دجاج / 2 لحم / 2 بحري في الغداء والعشاء
  duplicateLunchDinner: string[]; // صنف مكرر بين غداء وعشاء اليوم نفسه
  repeatedFromYesterday: string[]; // صنف رئيسي تكرر من اليوم السابق
  gulfArabCount: number; // من أصل 8 أطباق رئيسية
  gulfArabOk: boolean;
}

export const MAIN_SLOTS = [4, 5, 6, 7, 8, 9, 10, 11];
export const LUNCH_SLOTS = [4, 5, 6, 7];
export const DINNER_SLOTS = [8, 9, 10, 11];

export function checkRotation(data: OpsData): { days: RotationDayCheck[]; counts: Record<string, number> } {
  const menuMap = new Map(data.menu.map((m) => [m.id, m]));
  const counts: Record<string, number> = {};
  for (const m of data.menu) counts[m.id] = 0;
  const days = data.rotation.days.map((day, di) => {
    day.slots.forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
    const mains = MAIN_SLOTS.map((s) => day.slots[s]);
    const chicken = mains.filter((id) => id?.startsWith("C")).length;
    const meat = mains.filter((id) => id?.startsWith("M")).length;
    const seafood = mains.filter((id) => id?.startsWith("F")).length;
    const lunch = LUNCH_SLOTS.map((s) => day.slots[s]);
    const dinner = DINNER_SLOTS.map((s) => day.slots[s]);
    const duplicateLunchDinner = lunch.filter((id) => dinner.includes(id));
    const prev = di > 0 ? MAIN_SLOTS.map((s) => data.rotation.days[di - 1].slots[s]) : [];
    const repeatedFromYesterday = [...new Set(mains.filter((id) => prev.includes(id)))];
    const gulfArabCount = mains.filter((id) => {
      const idn = menuMap.get(id)?.identity;
      return idn === "خليجي" || idn === "عربي";
    }).length;
    return {
      chicken,
      meat,
      seafood,
      ruleOk: chicken === 4 && meat === 2 && seafood === 2,
      duplicateLunchDinner,
      repeatedFromYesterday,
      gulfArabCount,
      gulfArabOk: gulfArabCount >= 3,
    };
  });
  return { days, counts };
}

// ما الأصناف المسموحة في خانة معيّنة من الدوران؟
export function slotOptions(data: OpsData, slot: number): MenuItem[] {
  const rule = data.rotation.slotRule[slot];
  return data.menu.filter((m) => {
    if (rule === "دجاج") return m.category === "دجاج";
    if (rule === "لحم") return m.category === "لحم";
    if (rule === "سمك/ربيان") return m.category === "سمك" || m.category === "ربيان";
    return m.section === rule;
  });
}

// ---------------- هندسة المنيو (Kasavana–Smith) ----------------

export type EngClass = "star" | "plowhorse" | "puzzle" | "dog";

export const ENG_CLASS: Record<EngClass, { label: string; action: string }> = {
  star: { label: "⭐ نجم", action: "احمِه: جودة ثابتة وموقع بارز" },
  plowhorse: { label: "🐴 حصان عمل", action: "ارفع السعر قليلاً أو خفّض التكلفة (حصة/مكوّن)" },
  puzzle: { label: "🧩 لغز", action: "روّج له وأعد تسميته/تصويره أو غيّر موقعه" },
  dog: { label: "🐕 ضعيف", action: "احذفه أو أعد تصميمه" },
};

export interface EngRow {
  sku: ComputedSku;
  group: string;
  margin: number; // السعر − التكلفة الكلية الأساسية
  units: number | null;
  totalMargin: number;
  groupUnits: number;
  share: number | null;
  popThreshold: number;
  avgMargin: number | null;
  cls: EngClass | null;
}

export function computeEngineering(computed: ComputedSku[], unitsSold: Record<string, number | undefined>): EngRow[] {
  const groupCount = new Map<string, number>();
  const groupUnits = new Map<string, number>();
  const groupMargin = new Map<string, number>();
  const base = computed.map((sku) => {
    const group = sku.item.engGroup;
    const raw = unitsSold[sku.item.id];
    const units = raw === undefined || raw === null || Number.isNaN(Number(raw)) ? null : Number(raw);
    const margin = sku.price - sku.totalCost;
    const totalMargin = units === null ? 0 : margin * units;
    groupCount.set(group, (groupCount.get(group) ?? 0) + 1);
    groupUnits.set(group, (groupUnits.get(group) ?? 0) + (units ?? 0));
    groupMargin.set(group, (groupMargin.get(group) ?? 0) + totalMargin);
    return { sku, group, margin, units, totalMargin };
  });
  return base.map((b) => {
    const gUnits = groupUnits.get(b.group) ?? 0;
    const popThreshold = 0.7 / (groupCount.get(b.group) ?? 1);
    const share = b.units === null || gUnits === 0 ? null : b.units / gUnits;
    const avgMargin = gUnits === 0 ? null : (groupMargin.get(b.group) ?? 0) / gUnits;
    let cls: EngClass | null = null;
    if (share !== null && avgMargin !== null) {
      const popular = share >= popThreshold;
      const profitable = b.margin >= avgMargin;
      cls = popular && profitable ? "star" : popular ? "plowhorse" : profitable ? "puzzle" : "dog";
    }
    return { ...b, groupUnits: gUnits, share, popThreshold, avgMargin, cls };
  });
}

// ---------------- فحص سلامة البيانات ----------------

export interface IntegrityCheck {
  label: string;
  value: number;
  ok: boolean;
}

export const MAX_RECIPE_LINES = 13;

export function integrityChecks(data: OpsData): IntegrityCheck[] {
  const ingKeys = new Set(data.ingredients.map((i) => i.key));
  const linesPerSku = new Map<string, number>();
  for (const l of data.recipes) linesPerSku.set(l.sku, (linesPerSku.get(l.sku) ?? 0) + 1);
  const noRecipe = data.menu.filter((m) => !linesPerSku.get(m.id)).length;
  const badIng = data.recipes.filter((l) => !ingKeys.has(l.ing)).length;
  const noPrice = data.ingredients.filter((i) => !(i.price > 0)).length;
  const maxLines = Math.max(0, ...linesPerSku.values());
  const menuIds = new Set(data.menu.map((m) => m.id));
  const badRotation = data.rotation.days.reduce((a, d) => a + d.slots.filter((id) => !menuIds.has(id)).length, 0);
  return [
    { label: "أصناف في المنيو بلا وصفة", value: noRecipe, ok: noRecipe === 0 },
    { label: "سطور وصفات برمز مكوّن غير موجود", value: badIng, ok: badIng === 0 },
    { label: "مكوّنات بلا سعر", value: noPrice, ok: noPrice === 0 },
    { label: `أقصى عدد سطور في وصفة (الحد ${MAX_RECIPE_LINES})`, value: maxLines, ok: maxLines <= MAX_RECIPE_LINES },
    { label: "خانات دوران برمز صنف غير موجود", value: badRotation, ok: badRotation === 0 },
  ];
}
