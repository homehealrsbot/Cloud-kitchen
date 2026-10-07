"use client";

// مخزن بيانات العمليات: بيانات الملف الأصلي (JSON) + تعديلات المستخدمين (localStorage مؤقتاً لحد ربط قاعدة البيانات).
// كل عملية تعديل تتحقق من صلاحية الدور قبل التنفيذ، وتُسجَّل في سجل التعديلات.

import { useMemo, useSyncExternalStore } from "react";
import baseIngredients from "@/data/ops/ingredients.json";
import baseRecipes from "@/data/ops/recipes.json";
import baseMenu from "@/data/ops/menu.json";
import baseRotation from "@/data/ops/rotation.json";
import baseSettings from "@/data/ops/settings.json";
import {
  AllergenKey,
  ComputedSku,
  GATES,
  GATES_RESET_ON_RECIPE_CHANGE,
  GATE_PRICE,
  GateStatus,
  ING_APPROVALS,
  ING_APPROVAL_PRICE,
  Ingredient,
  IngType,
  MAX_RECIPE_LINES,
  MenuItem,
  OpsData,
  RecipeLine,
  Rotation,
  Settings,
  SkuQuality,
  computeMenu,
  deriveSkuQuality,
} from "./engine";
import { Cap, ROLES, Session, can, getSession } from "./roles";

const BASE: OpsData = {
  ingredients: baseIngredients as Ingredient[],
  recipes: baseRecipes as RecipeLine[],
  menu: baseMenu as MenuItem[],
  rotation: baseRotation as Rotation,
  settings: baseSettings as unknown as Settings,
};

export type IngredientSpecs = Pick<Ingredient, "kcal" | "protein" | "carb" | "fat" | "fiber" | "hidden" | "flags">;

export interface AuditEntry {
  id: string;
  ts: string;
  role: string;
  by: string;
  area: string;
  text: string;
}

export interface OpsState {
  v: 1;
  recipes: RecipeLine[] | null;
  ingSpecs: Record<string, Partial<IngredientSpecs>>;
  ingPrices: Record<string, number>;
  shelfLife: Record<string, number>;
  settings: Settings | null;
  rotation: string[][] | null;
  gates: Record<string, GateStatus[]>;
  gateNotes: Record<string, Record<number, string>>;
  ingApprovals: Record<string, GateStatus[]>;
  production: Record<string, Record<string, number>>;
  unitsSold: Record<string, number>;
  audit: AuditEntry[];
}

const EMPTY: OpsState = {
  v: 1,
  recipes: null,
  ingSpecs: {},
  ingPrices: {},
  shelfLife: {},
  settings: null,
  rotation: null,
  gates: {},
  gateNotes: {},
  ingApprovals: {},
  production: {},
  unitsSold: {},
  audit: [],
};

const KEY = "foodstyle_ops_v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedState: OpsState = EMPTY;
let memoryOnly = false; // لو التخزين غير متاح نكمل بالذاكرة لحد ما تتقفل الصفحة

function read(): OpsState {
  if (memoryOnly) return cachedState;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  cachedState = EMPTY;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<OpsState>;
      if (parsed && parsed.v === 1) cachedState = { ...EMPTY, ...parsed };
    } catch {
      cachedState = EMPTY;
    }
  }
  return cachedState;
}

function write(next: OpsState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // التخزين ممتلئ أو غير متاح — نكمل بالذاكرة فقط
    memoryOnly = true;
    cachedState = next;
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

// ---------------- البيانات الفعلية = الأصل + التعديلات ----------------

export function buildData(state: OpsState): OpsData {
  const ingredients = BASE.ingredients.map((ing) => {
    const specs = state.ingSpecs[ing.key];
    const price = state.ingPrices[ing.key];
    if (!specs && price === undefined) return ing;
    return {
      ...ing,
      ...(specs ?? {}),
      flags: { ...ing.flags, ...(specs?.flags ?? {}) },
      price: price === undefined ? ing.price : price,
    };
  });
  const menu = BASE.menu.map((m) =>
    state.shelfLife[m.id] === undefined ? m : { ...m, shelfLifeH: state.shelfLife[m.id] },
  );
  const rotation: Rotation = state.rotation
    ? { ...BASE.rotation, days: BASE.rotation.days.map((d, i) => ({ ...d, slots: state.rotation![i] ?? d.slots })) }
    : BASE.rotation;
  return {
    ingredients,
    recipes: state.recipes ?? BASE.recipes,
    menu,
    rotation,
    settings: state.settings ?? BASE.settings,
  };
}

export const BASE_DATA = BASE;

export interface SkuView {
  sku: ComputedSku;
  gates: GateStatus[];
  notes: Record<number, string>;
  quality: SkuQuality;
}

export interface OpsView {
  ready: boolean; // false أثناء أول عرض قبل قراءة المتصفح
  state: OpsState;
  data: OpsData;
  computed: ComputedSku[];
  skus: SkuView[];
  skuMap: Map<string, SkuView>;
  ingApprovals: (key: string) => GateStatus[];
  recipesEdited: boolean;
}

const noopSubscribe = () => () => {};

export function useOps(): OpsView {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return useMemo(() => {
    const data = buildData(state);
    const computed = computeMenu(data);
    const skus: SkuView[] = computed.map((sku) => {
      const gates = GATES.map((_, i) => state.gates[sku.item.id]?.[i] ?? "PENDING") as GateStatus[];
      return {
        sku,
        gates,
        notes: state.gateNotes[sku.item.id] ?? {},
        quality: deriveSkuQuality(gates, sku.item.shelfLifeH, data.settings),
      };
    });
    return {
      ready,
      state,
      data,
      computed,
      skus,
      skuMap: new Map(skus.map((s) => [s.sku.item.id, s])),
      ingApprovals: (key: string) =>
        ING_APPROVALS.map((_, i) => state.ingApprovals[key]?.[i] ?? "PENDING") as GateStatus[],
      recipesEdited: state.recipes !== null,
    };
  }, [state, ready]);
}

// ---------------- العمليات (كل واحدة محمية بالصلاحية) ----------------

export type ActionResult = { ok: true } | { ok: false; error: string };

const DENIED: ActionResult = { ok: false, error: "دورك الحالي ما يملك صلاحية هذا التعديل" };

function audit(state: OpsState, session: Session, area: string, text: string): AuditEntry[] {
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    role: ROLES[session.role].label,
    by: session.name || "—",
    area,
    text,
  };
  return [entry, ...state.audit].slice(0, 300);
}

function mutate(
  cap: Cap,
  area: string,
  fn: (s: OpsState, session: Session) => { next: OpsState; log: string } | { error: string },
): ActionResult {
  const session = getSession();
  if (!session || !can(session.role, cap)) return DENIED;
  const current = read();
  const out = fn(current, session);
  if ("error" in out) return { ok: false, error: out.error };
  write({ ...out.next, audit: audit(out.next, session, area, out.log) });
  return { ok: true };
}

function skuName(id: string) {
  return BASE.menu.find((m) => m.id === id)?.name ?? id;
}
function ingName(key: string) {
  return BASE.ingredients.find((i) => i.key === key)?.name ?? key;
}

export const actions = {
  // --- خطة الإنتاج ---
  setPortions(dayIndex: number, slot: number, portions: number, skuId: string): ActionResult {
    return mutate("production.edit", "خطة الإنتاج", (s) => {
      const n = Math.max(0, Math.floor(Number(portions) || 0));
      // الصنف المتوقف ما يدخل خطة الإنتاج (يُسمح فقط بتصفير حصصه)
      if (n > 0) {
        const data = buildData(s);
        const item = data.menu.find((m) => m.id === skuId);
        const gates = GATES.map((_, i) => s.gates[skuId]?.[i] ?? "PENDING") as GateStatus[];
        if (item && deriveSkuQuality(gates, item.shelfLifeH, data.settings).status === "HOLD") {
          return { error: `${skuName(skuId)} متوقف — ما يدخل خطة الإنتاج لحد ما ترفع الجودة الإيقاف` };
        }
      }
      const day = { ...(s.production[dayIndex] ?? {}) };
      if (n === 0) delete day[slot];
      else day[slot] = n;
      return {
        next: { ...s, production: { ...s.production, [dayIndex]: day } },
        log: `يوم ${dayIndex + 1} · ${skuId} ${skuName(skuId)}: ${n} حصة`,
      };
    });
  },
  clearDay(dayIndex: number): ActionResult {
    return mutate("production.edit", "خطة الإنتاج", (s) => {
      const production = { ...s.production };
      delete production[dayIndex];
      return { next: { ...s, production }, log: `تصفير حصص يوم ${dayIndex + 1}` };
    });
  },

  // --- الدوران ---
  setRotationSlot(dayIndex: number, slot: number, skuId: string): ActionResult {
    return mutate("rotation.edit", "جدول الدوران", (s) => {
      if (!BASE.menu.some((m) => m.id === skuId)) return { error: "صنف غير موجود" };
      const days = (s.rotation ?? BASE.rotation.days.map((d) => d.slots)).map((d) => [...d]);
      const before = days[dayIndex][slot];
      days[dayIndex][slot] = skuId;
      return {
        next: { ...s, rotation: days },
        log: `يوم ${dayIndex + 1} · ${BASE.rotation.slotLabels[slot]}: ${before} ← ${skuId} ${skuName(skuId)}`,
      };
    });
  },
  resetRotation(): ActionResult {
    return mutate("rotation.edit", "جدول الدوران", (s) => ({
      next: { ...s, rotation: null },
      log: "إرجاع جدول الدوران للأصل",
    }));
  },

  // --- الوصفات: الحفظ يرجّع بوابات الصنف المعتمدة لـ«بانتظار الاعتماد» ---
  saveRecipe(skuId: string, lines: { type: IngType; ing: string; grams: number }[]): ActionResult {
    return mutate("recipes.edit", "الوصفات", (s) => {
      if (lines.length === 0) return { error: "الوصفة لازم يكون فيها مكوّن واحد على الأقل" };
      if (lines.length > MAX_RECIPE_LINES) return { error: `أقصى عدد سطور في الوصفة ${MAX_RECIPE_LINES}` };
      const keys = new Set(BASE.ingredients.map((i) => i.key));
      for (const l of lines) {
        if (!keys.has(l.ing)) return { error: "مكوّن غير موجود في قاعدة المكوّنات" };
        if (!(Number(l.grams) > 0)) return { error: "كل سطر لازم يكون له وزن أكبر من صفر" };
      }
      const current = s.recipes ?? BASE.recipes;
      const firstIdx = current.findIndex((l) => l.sku === skuId);
      const others = current.filter((l) => l.sku !== skuId);
      const insertAt = firstIdx < 0 ? others.length : current.slice(0, firstIdx).filter((l) => l.sku !== skuId).length;
      const mine: RecipeLine[] = lines.map((l) => ({ sku: skuId, type: l.type, ing: l.ing, grams: Number(l.grams) }));
      const recipes = [...others.slice(0, insertAt), ...mine, ...others.slice(insertAt)];

      const gates = GATES.map((_, i) => s.gates[skuId]?.[i] ?? "PENDING") as GateStatus[];
      const reset: string[] = [];
      for (const gi of GATES_RESET_ON_RECIPE_CHANGE) {
        if (gates[gi] === "READY") {
          gates[gi] = "PENDING";
          reset.push(GATES[gi]);
        }
      }
      return {
        next: { ...s, recipes, gates: { ...s.gates, [skuId]: gates } },
        log:
          `تعديل وصفة ${skuId} ${skuName(skuId)} (${lines.length} سطر)` +
          (reset.length ? ` — رجعت للاعتماد: ${reset.join("، ")}` : ""),
      };
    });
  },

  // --- المكوّنات ---
  setIngredientSpecs(key: string, specs: IngredientSpecs): ActionResult {
    return mutate("ingredients.editSpecs", "المكوّنات", (s) => {
      for (const k of ["kcal", "protein", "carb", "fat", "fiber"] as const) {
        if (!(Number(specs[k]) >= 0)) return { error: "القيم الغذائية لازم تكون أرقام غير سالبة" };
      }
      return {
        next: { ...s, ingSpecs: { ...s.ingSpecs, [key]: specs } },
        log: `تحديث القيم الغذائية/الحساسية: ${ingName(key)}`,
      };
    });
  },
  setIngredientPrice(key: string, price: number): ActionResult {
    return mutate("ingredients.editPrice", "أسعار المكوّنات", (s) => {
      if (!(Number(price) > 0)) return { error: "السعر لازم يكون أكبر من صفر" };
      return {
        next: { ...s, ingPrices: { ...s.ingPrices, [key]: Number(price) } },
        log: `سعر ${ingName(key)}: ${Number(price)} ر.س/كجم`,
      };
    });
  },
  setIngApproval(key: string, index: number, status: GateStatus): ActionResult {
    const cap: Cap = index === ING_APPROVAL_PRICE ? "ingApproval.editPrice" : "ingApproval.edit";
    return mutate(cap, "اعتماد المكوّنات", (s) => {
      const arr = ING_APPROVALS.map((_, i) => s.ingApprovals[key]?.[i] ?? "PENDING") as GateStatus[];
      arr[index] = status;
      return {
        next: { ...s, ingApprovals: { ...s.ingApprovals, [key]: arr } },
        log: `${ingName(key)} · ${ING_APPROVALS[index]}: ${status}`,
      };
    });
  },

  // --- بوابات الجودة ---
  setGate(skuId: string, gateIndex: number, status: GateStatus, note: string): ActionResult {
    const cap: Cap = gateIndex === GATE_PRICE ? "quality.editPriceGate" : "quality.editGates";
    return mutate(cap, "بوابات الجودة", (s) => {
      if (status === "HOLD" && !note.trim()) return { error: "سبب الإيقاف إجباري" };
      const gates = GATES.map((_, i) => s.gates[skuId]?.[i] ?? "PENDING") as GateStatus[];
      gates[gateIndex] = status;
      const notes = { ...(s.gateNotes[skuId] ?? {}) };
      if (status === "HOLD") notes[gateIndex] = note.trim();
      else delete notes[gateIndex];
      return {
        next: { ...s, gates: { ...s.gates, [skuId]: gates }, gateNotes: { ...s.gateNotes, [skuId]: notes } },
        log: `${skuId} ${skuName(skuId)} · ${GATES[gateIndex]}: ${status}` + (status === "HOLD" ? ` — ${note.trim()}` : ""),
      };
    });
  },
  setShelfLife(skuId: string, hours: number): ActionResult {
    return mutate("quality.editShelfLife", "الصلاحية", (s) => {
      if (!(Number(hours) > 0)) return { error: "الصلاحية لازم تكون أكبر من صفر" };
      return {
        next: { ...s, shelfLife: { ...s.shelfLife, [skuId]: Number(hours) } },
        log: `صلاحية ${skuId} ${skuName(skuId)}: ${Number(hours)} ساعة`,
      };
    });
  },

  // --- الإعدادات وهندسة المنيو ---
  saveSettings(settings: Settings): ActionResult {
    return mutate("settings.edit", "الإعدادات", (s) => ({
      next: { ...s, settings },
      log: "تحديث إعدادات الحصص والتكلفة",
    }));
  },
  setUnitsSold(skuId: string, units: number | null): ActionResult {
    return mutate("engineering.view", "هندسة المنيو", (s) => {
      const unitsSold = { ...s.unitsSold };
      if (units === null || Number.isNaN(units)) delete unitsSold[skuId];
      else unitsSold[skuId] = Math.max(0, Number(units));
      return { next: { ...s, unitsSold }, log: `مبيعات ${skuId}: ${units ?? "—"}` };
    });
  },

  // --- إرجاع كل شي لقيم الملف الأصلي ---
  resetAll(): ActionResult {
    return mutate("data.reset", "النظام", (s) => ({
      next: { ...EMPTY, audit: s.audit },
      log: "إرجاع كل بيانات العمليات لقيم الملف الأصلي",
    }));
  },
};

export type { AllergenKey };
