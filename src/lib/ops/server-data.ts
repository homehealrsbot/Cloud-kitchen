// تحميل بيانات العمليات من Supabase (على الخادم).
//
// كانت البيانات تُقرأ من JSON + localStorage. الآن كلها من قاعدة البيانات، وسياسات
// RLS تحدد إيش يشوف كل دور — فلو حاول المطبخ يقرأ المبيعات يرجع فاضي من القاعدة
// نفسها، مو لأن الواجهة خفته.

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  GateDef,
  GateStatus,
  IngApprovalDef,
  Ingredient,
  KitchenGateRecord,
  MenuItem,
  OpsData,
  PilotTrial,
  RecipeLine,
  Rotation,
  Settings,
  gateStatuses,
  ingApprovalStatuses,
} from "./engine";
import type { AuditEntry, GateStamp, OpsSnapshot } from "./types";

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
    supplier: String(r.supplier ?? ""),
    supplierNote: String(r.supplier_note ?? ""),
    priceQuoteDate: r.price_quote_date ? String(r.price_quote_date) : null,
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

function toGateDef(r: Row): GateDef {
  return {
    index: Number(r.gate_index),
    label: String(r.label ?? ""),
    kind: String(r.kind ?? "standard") as GateDef["kind"],
    ownerRole: r.owner_role === null || r.owner_role === undefined ? null : String(r.owner_role),
    resetsOnRecipeChange: Boolean(r.resets_on_recipe_change),
    active: Boolean(r.active),
    note: String(r.note ?? ""),
  };
}

function toIngApprovalDef(r: Row): IngApprovalDef {
  return {
    index: Number(r.approval_index),
    label: String(r.label ?? ""),
    kind: String(r.kind ?? "standard") as IngApprovalDef["kind"],
    ownerRole: r.owner_role === null || r.owner_role === undefined ? null : String(r.owner_role),
    active: Boolean(r.active),
    note: String(r.note ?? ""),
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
      gateDefs: [],
      ingApprovalDefs: [],
    },
    gates: {},
    gateNotes: {},
    gateStamps: {},
    ingApprovals: {},
    ingApprovalStamps: {},
    pilotTrials: {},
    kitchenGate: {},
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

  const [
    ing, menu, recipes, settings, rotMeta, rotation, gates, approvals, shelf, production, units, audit,
    gateDefRows, approvalDefRows, pilotRows, chefRows,
  ] = await Promise.all([
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
      supabase.from("ops_gate_defs").select("*").order("gate_index"),
      supabase.from("ops_ing_approval_defs").select("*").order("approval_index"),
      supabase.from("ops_pilot_trials").select("*").order("trial_index"),
      supabase.from("ops_kitchen_gate").select("*"),
    ]);

  const gateDefs = ((gateDefRows.data ?? []) as Row[]).map(toGateDef);
  const ingApprovalDefs = ((approvalDefRows.data ?? []) as Row[]).map(toIngApprovalDef);

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
    gateDefs,
    ingApprovalDefs,
  };

  // البوابات: صف غير موجود = PENDING. الفهرسة برقم البوابة لا بموقعها، عشان
  // إيقاف بوابة وسط القائمة ما يزحزح حالات اللي بعدها.
  const gateMap: Record<string, GateStatus[]> = {};
  const gateNotes: Record<string, Record<number, string>> = {};
  const gateStamps: Record<string, Record<number, GateStamp>> = {};
  for (const r of (gates.data ?? []) as Row[]) {
    const sku = String(r.sku);
    const idx = Number(r.gate_index);
    gateMap[sku] ??= [];
    gateMap[sku][idx] = String(r.status) as GateStatus;
    const note = String(r.note ?? "");
    if (note) {
      gateNotes[sku] ??= {};
      gateNotes[sku][idx] = note;
    }
    if (r.approved_by_name || r.approved_at) {
      gateStamps[sku] ??= {};
      gateStamps[sku][idx] = { by: String(r.approved_by_name ?? ""), at: String(r.approved_at ?? "") };
    }
  }
  // تطبيع على التعريفات النشطة: كل بوابة نشطة لها حالة صريحة
  for (const sku of Object.keys(gateMap)) gateMap[sku] = gateStatuses(gateDefs, gateMap[sku]);

  const ingApprovals: Record<string, GateStatus[]> = {};
  const ingApprovalStamps: Record<string, Record<number, GateStamp>> = {};
  for (const r of (approvals.data ?? []) as Row[]) {
    const key = String(r.ing_key);
    const idx = Number(r.approval_index);
    ingApprovals[key] ??= [];
    ingApprovals[key][idx] = String(r.status) as GateStatus;
    if (r.approved_by_name || r.approved_at) {
      ingApprovalStamps[key] ??= {};
      ingApprovalStamps[key][idx] = { by: String(r.approved_by_name ?? ""), at: String(r.approved_at ?? "") };
    }
  }
  for (const k of Object.keys(ingApprovals)) {
    ingApprovals[k] = ingApprovalStatuses(ingApprovalDefs, ingApprovals[k]);
  }

  const pilotTrials: Record<string, PilotTrial[]> = {};
  for (const r of (pilotRows.data ?? []) as Row[]) {
    const sku = String(r.sku);
    (pilotTrials[sku] ??= []).push({
      index: Number(r.trial_index),
      result: r.result === null || r.result === undefined ? null : (String(r.result) as PilotTrial["result"]),
      cookedPortionG: r.cooked_portion_g === null || r.cooked_portion_g === undefined ? null : Number(r.cooked_portion_g),
      date: r.trial_date ? String(r.trial_date) : null,
      notes: String(r.notes ?? ""),
      recordedAt: String(r.recorded_at ?? ""),
    });
  }

  const kitchenGate: Record<string, KitchenGateRecord> = {};
  for (const r of (chefRows.data ?? []) as Row[]) {
    kitchenGate[String(r.sku)] = {
      decision: String(r.chef_decision ?? "PENDING") as GateStatus,
      chefName: String(r.chef_name ?? ""),
      approvedAt: r.approved_at ? String(r.approved_at) : null,
      note: String(r.note ?? ""),
    };
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
    gateStamps,
    ingApprovals,
    ingApprovalStamps,
    pilotTrials,
    kitchenGate,
    production: prod,
    unitsSold,
    audit: auditRows,
    // هل الوصفات معدّلة عن الملف الأصلي؟ ما نعرفها من القاعدة، فنتركها false.
    recipesEdited: false,
  };
}
