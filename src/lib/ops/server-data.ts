// تحميل بيانات العمليات من Supabase (على الخادم).
//
// كانت البيانات تُقرأ من JSON + localStorage. الآن كلها من قاعدة البيانات، وسياسات
// RLS تحدد إيش يشوف كل دور — فلو حاول المطبخ يقرأ المبيعات يرجع فاضي من القاعدة
// نفسها، مو لأن الواجهة خفته.

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  GATES,
  GateStatus,
  ING_APPROVALS,
  Ingredient,
  MenuItem,
  OpsData,
  RecipeLine,
  Rotation,
  Settings,
} from "./engine";
import type { AuditEntry, OpsSnapshot } from "./types";

type Row = Record<string, unknown>;

function toIngredient(r: Row): Ingredient {
  return {
    key: String(r.key),
    name: String(r.name ?? ""),
    nameEn: String(r.name_en ?? ""),
    kcal: Number(r.kcal ?? 0),
    protein: Number(r.protein ?? 0),
    carb: Number(r.carb ?? 0),
    fat: Number(r.fat ?? 0),
    fiber: Number(r.fiber ?? 0),
    price: Number(r.price ?? 0),
    allergenText: String(r.allergen_text ?? ""),
    source: String(r.source ?? ""),
    flags: (r.flags ?? {}) as Ingredient["flags"],
    hidden: String(r.hidden ?? ""),
  };
}

function toMenuItem(r: Row): MenuItem {
  return {
    id: String(r.id),
    section: String(r.section ?? ""),
    category: String(r.category ?? ""),
    name: String(r.name ?? ""),
    nameEn: String(r.name_en ?? ""),
    cuisine: String(r.cuisine ?? ""),
    identity: String(r.identity ?? ""),
    shelfLifeH: Number(r.shelf_life_h ?? 0),
    reheat: String(r.reheat ?? ""),
    opsNote: String(r.ops_note ?? ""),
    method: String(r.method ?? ""),
    engGroup: String(r.eng_group ?? ""),
  };
}

/** صورة فاضية — تُستخدم قبل ربط قاعدة البيانات. الشاشات تتعامل معها كـ ready:false. */
export function emptyOpsSnapshot(): OpsSnapshot {
  return {
    data: {
      ingredients: [],
      recipes: [],
      menu: [],
      rotation: { slotLabels: [], slotRule: [], days: [], rules: "" },
      settings: null as unknown as Settings,
    },
    gates: {},
    gateNotes: {},
    ingApprovals: {},
    production: {},
    unitsSold: {},
    audit: [],
    recipesEdited: false,
  };
}

/**
 * يقرأ كل ما تحتاجه شاشات العمليات في طلب واحد متوازي.
 *
 * ما يرمي استثناء لو Supabase غير مُعد — يرجّع صورة فاضية. السبب: Next يقيّم
 * مكوّنات الصفحة حتى لو الـ layout الأب عرض رسالة الإعداد بدل الأبناء، فالرمي
 * هنا يلوّث السجل بأخطاء ما لها علاقة بخطأ حقيقي.
 */
export async function loadOpsSnapshot(): Promise<OpsSnapshot> {
  if (!isSupabaseConfigured) return emptyOpsSnapshot();
  const supabase = await createClient();

  const [ing, menu, recipes, settings, rotMeta, rotation, gates, approvals, shelf, production, units, audit] =
    await Promise.all([
      supabase.from("ops_ingredients").select("*").order("sort_order"),
      supabase.from("ops_menu_items").select("*").order("sort_order"),
      supabase.from("ops_recipe_lines").select("*").order("sort_order"),
      supabase.from("ops_settings").select("data").eq("id", 1).maybeSingle(),
      supabase.from("ops_rotation_meta").select("*").eq("id", 1).maybeSingle(),
      supabase.from("ops_rotation").select("*"),
      supabase.from("ops_gates").select("*"),
      supabase.from("ops_ing_approvals").select("*"),
      supabase.from("ops_shelf_life").select("*"),
      supabase.from("ops_production").select("*"),
      supabase.from("ops_units_sold").select("*"),
      supabase.from("ops_audit").select("*").order("ts", { ascending: false }).limit(300),
    ]);

  const ingredients = (ing.data ?? []).map(toIngredient);
  const menuItems = (menu.data ?? []).map(toMenuItem);

  // الصلاحية المعدّلة تتجاوز قيمة المنيو
  const shelfOverride = new Map<string, number>(
    (shelf.data ?? []).map((r: Row) => [String(r.sku), Number(r.hours)]),
  );
  const menuWithShelf = menuItems.map((m) =>
    shelfOverride.has(m.id) ? { ...m, shelfLifeH: shelfOverride.get(m.id)! } : m,
  );

  const slotLabels: string[] = (rotMeta.data?.slot_labels as string[]) ?? [];
  const dayLabels: string[] = (rotMeta.data?.day_labels as string[]) ?? [];
  const slotsByDay = new Map<number, string[]>();
  for (const r of (rotation.data ?? []) as Row[]) {
    const d = Number(r.day_index);
    const arr = slotsByDay.get(d) ?? [];
    arr[Number(r.slot)] = String(r.sku);
    slotsByDay.set(d, arr);
  }
  const rot: Rotation = {
    slotLabels,
    slotRule: (rotMeta.data?.slot_rule as string[]) ?? [],
    rules: String(rotMeta.data?.rules ?? ""),
    days: dayLabels.map((label, i) => ({ label, slots: slotsByDay.get(i) ?? [] })),
  };

  const data: OpsData = {
    ingredients,
    recipes: (recipes.data ?? []).map((r: Row) => ({
      sku: String(r.sku),
      type: String(r.type) as RecipeLine["type"],
      ing: String(r.ing),
      grams: Number(r.grams),
    })),
    menu: menuWithShelf,
    rotation: rot,
    settings: (settings.data?.data ?? null) as unknown as Settings,
  };

  // البوابات: صف غير موجود = PENDING
  const gateMap: Record<string, GateStatus[]> = {};
  const gateNotes: Record<string, Record<number, string>> = {};
  for (const r of (gates.data ?? []) as Row[]) {
    const sku = String(r.sku);
    const idx = Number(r.gate_index);
    gateMap[sku] ??= GATES.map(() => "PENDING" as GateStatus);
    gateMap[sku][idx] = String(r.status) as GateStatus;
    const note = String(r.note ?? "");
    if (note) {
      gateNotes[sku] ??= {};
      gateNotes[sku][idx] = note;
    }
  }

  const ingApprovals: Record<string, GateStatus[]> = {};
  for (const r of (approvals.data ?? []) as Row[]) {
    const key = String(r.ing_key);
    ingApprovals[key] ??= ING_APPROVALS.map(() => "PENDING" as GateStatus);
    ingApprovals[key][Number(r.approval_index)] = String(r.status) as GateStatus;
  }

  const prod: Record<string, Record<string, number>> = {};
  for (const r of (production.data ?? []) as Row[]) {
    const d = String(r.day_index);
    prod[d] ??= {};
    prod[d][String(r.slot)] = Number(r.portions);
  }

  const unitsSold: Record<string, number> = {};
  for (const r of (units.data ?? []) as Row[]) unitsSold[String(r.sku)] = Number(r.units);

  const auditRows: AuditEntry[] = ((audit.data ?? []) as Row[]).map((r) => ({
    id: String(r.id),
    ts: String(r.ts),
    role: String(r.role ?? ""),
    by: String(r.by ?? ""),
    area: String(r.area ?? ""),
    text: String(r.text ?? ""),
  }));

  return {
    data,
    gates: gateMap,
    gateNotes,
    ingApprovals,
    production: prod,
    unitsSold,
    audit: auditRows,
    // هل الوصفات معدّلة عن الملف الأصلي؟ ما نعرفها من القاعدة، فنتركها false.
    recipesEdited: false,
  };
}
