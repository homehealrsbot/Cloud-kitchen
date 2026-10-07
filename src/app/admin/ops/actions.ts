"use server";

// كل تعديل على بيانات العمليات يمر من هنا.
//
// ليش Server Actions ومو كتابة من المتصفح:
//   • الدور يُقرأ من الجلسة على الخادم — ما ينفع ينتحل من المتصفح
//   • سياسات RLS تفحص نفس الصلاحية مرة ثانية في قاعدة البيانات (دفاع بالعمق)
//   • سجل التعديلات يُكتب مع كل عملية ولا يعتمد على أمانة العميل
//   • revalidatePath يخلي الشاشات تتحدث بعد كل تعديل

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, type StaffSession } from "@/lib/supabase/auth";
import { Cap, ROLES, can } from "@/lib/ops/roles";
import {
  GATES,
  GATES_RESET_ON_RECIPE_CHANGE,
  GATE_PRICE,
  GateStatus,
  ING_APPROVALS,
  ING_APPROVAL_PRICE,
  IngType,
  MAX_RECIPE_LINES,
  Settings,
} from "@/lib/ops/engine";
import type { ActionResult } from "@/lib/ops/types";

const DENIED: ActionResult = { ok: false, error: "دورك الحالي ما يملك صلاحية هذا التعديل" };

type Ctx = { session: StaffSession; supabase: Awaited<ReturnType<typeof createClient>> };

/** يتحقق من الدور ويجهّز العميل، أو يرجّع رفضاً. */
async function guard(cap: Cap): Promise<Ctx | ActionResult> {
  const session = await getStaffSession();
  if (!session || !can(session.role, cap)) return DENIED;
  return { session, supabase: await createClient() };
}

function isDenial(v: Ctx | ActionResult): v is ActionResult {
  return "ok" in v;
}

async function writeAudit(ctx: Ctx, area: string, text: string) {
  await ctx.supabase.from("ops_audit").insert({
    user_id: ctx.session.userId,
    role: ROLES[ctx.session.role].label,
    by: ctx.session.name || ctx.session.email,
    area,
    text,
  });
}

function done(paths: string[] = ["/admin/ops"]): ActionResult {
  paths.forEach((p) => revalidatePath(p));
  revalidatePath("/order-app");
  return { ok: true };
}

// رسالة خطأ مفهومة بدل نص Postgres الخام
function dbError(message: string): ActionResult {
  if (/row-level security|permission denied/i.test(message)) return DENIED;
  return { ok: false, error: message };
}

async function skuName(ctx: Ctx, id: string): Promise<string> {
  const { data } = await ctx.supabase.from("ops_menu_items").select("name").eq("id", id).maybeSingle();
  return data?.name ?? id;
}

async function ingName(ctx: Ctx, key: string): Promise<string> {
  const { data } = await ctx.supabase.from("ops_ingredients").select("name").eq("key", key).maybeSingle();
  return data?.name ?? key;
}

// ---------------- خطة الإنتاج ----------------

export async function setPortions(
  dayIndex: number,
  slot: number,
  portions: number,
  skuId: string,
): Promise<ActionResult> {
  const ctx = await guard("production.edit");
  if (isDenial(ctx)) return ctx;

  const n = Math.max(0, Math.floor(Number(portions) || 0));

  if (n > 0) {
    // الصنف المتوقف ما يدخل الخطة — نفحص البوابات من القاعدة
    const { data: gates } = await ctx.supabase
      .from("ops_gates")
      .select("status")
      .eq("sku", skuId)
      .eq("status", "HOLD");
    if (gates && gates.length > 0) {
      return { ok: false, error: `${await skuName(ctx, skuId)} متوقف — ما يدخل خطة الإنتاج لحد ما ترفع الجودة الإيقاف` };
    }
  }

  if (n === 0) {
    const { error } = await ctx.supabase.from("ops_production").delete().match({ day_index: dayIndex, slot });
    if (error) return dbError(error.message);
  } else {
    const { error } = await ctx.supabase
      .from("ops_production")
      .upsert({ day_index: dayIndex, slot, portions: n, updated_by: ctx.session.userId });
    if (error) return dbError(error.message);
  }

  await writeAudit(ctx, "خطة الإنتاج", `يوم ${dayIndex + 1} · ${skuId} ${await skuName(ctx, skuId)}: ${n} حصة`);
  return done(["/admin/ops/production"]);
}

export async function clearDay(dayIndex: number): Promise<ActionResult> {
  const ctx = await guard("production.edit");
  if (isDenial(ctx)) return ctx;
  const { error } = await ctx.supabase.from("ops_production").delete().eq("day_index", dayIndex);
  if (error) return dbError(error.message);
  await writeAudit(ctx, "خطة الإنتاج", `تصفير حصص يوم ${dayIndex + 1}`);
  return done(["/admin/ops/production"]);
}

// ---------------- جدول الدوران ----------------

export async function setRotationSlot(dayIndex: number, slot: number, skuId: string): Promise<ActionResult> {
  const ctx = await guard("rotation.edit");
  if (isDenial(ctx)) return ctx;

  const { data: exists } = await ctx.supabase.from("ops_menu_items").select("id").eq("id", skuId).maybeSingle();
  if (!exists) return { ok: false, error: "صنف غير موجود" };

  const { data: before } = await ctx.supabase
    .from("ops_rotation").select("sku").match({ day_index: dayIndex, slot }).maybeSingle();

  const { error } = await ctx.supabase.from("ops_rotation").upsert({ day_index: dayIndex, slot, sku: skuId });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "جدول الدوران",
    `يوم ${dayIndex + 1} · خانة ${slot + 1}: ${before?.sku ?? "—"} ← ${skuId} ${await skuName(ctx, skuId)}`);
  return done(["/admin/ops/rotation"]);
}

export async function resetRotation(): Promise<ActionResult> {
  const ctx = await guard("rotation.edit");
  if (isDenial(ctx)) return ctx;
  await writeAudit(ctx, "جدول الدوران", "طلب إرجاع جدول الدوران للأصل");
  return {
    ok: false,
    error: "الإرجاع للأصل يتم بإعادة تنفيذ supabase/seed.sql — عدّل الخانات يدوياً أو راجع الإدارة",
  };
}

// ---------------- الوصفات ----------------

export async function saveRecipe(
  skuId: string,
  lines: { type: IngType; ing: string; grams: number }[],
): Promise<ActionResult> {
  const ctx = await guard("recipes.edit");
  if (isDenial(ctx)) return ctx;

  if (lines.length === 0) return { ok: false, error: "الوصفة لازم يكون فيها مكوّن واحد على الأقل" };
  if (lines.length > MAX_RECIPE_LINES) return { ok: false, error: `أقصى عدد سطور في الوصفة ${MAX_RECIPE_LINES}` };

  const { data: ingRows } = await ctx.supabase.from("ops_ingredients").select("key");
  const keys = new Set((ingRows ?? []).map((r) => r.key));
  for (const l of lines) {
    if (!keys.has(l.ing)) return { ok: false, error: "مكوّن غير موجود في قاعدة المكوّنات" };
    if (!(Number(l.grams) > 0)) return { ok: false, error: "كل سطر لازم يكون له وزن أكبر من صفر" };
  }

  const { error: delErr } = await ctx.supabase.from("ops_recipe_lines").delete().eq("sku", skuId);
  if (delErr) return dbError(delErr.message);

  const { error: insErr } = await ctx.supabase.from("ops_recipe_lines").insert(
    lines.map((l, i) => ({ sku: skuId, type: l.type, ing: l.ing, grams: Number(l.grams), sort_order: i })),
  );
  if (insErr) return dbError(insErr.message);

  // تغيّر الوصفة يرجّع البوابات المتأثرة لـ«بانتظار الاعتماد»
  const { data: current } = await ctx.supabase
    .from("ops_gates").select("gate_index,status").eq("sku", skuId).eq("status", "READY");
  const toReset = (current ?? [])
    .map((g) => Number(g.gate_index))
    .filter((i) => GATES_RESET_ON_RECIPE_CHANGE.includes(i));

  if (toReset.length > 0) {
    await ctx.supabase
      .from("ops_gates")
      .upsert(toReset.map((i) => ({ sku: skuId, gate_index: i, status: "PENDING" as GateStatus, note: "" })));
  }

  await writeAudit(ctx, "الوصفات",
    `تعديل وصفة ${skuId} ${await skuName(ctx, skuId)} (${lines.length} سطر)` +
    (toReset.length ? ` — رجعت للاعتماد: ${toReset.map((i) => GATES[i]).join("، ")}` : ""));
  return done(["/admin/ops/recipes", "/admin/ops/quality"]);
}

// ---------------- المكوّنات ----------------

export async function setIngredientSpecs(
  key: string,
  specs: { kcal: number; protein: number; carb: number; fat: number; fiber: number; hidden: string; flags: Record<string, boolean> },
): Promise<ActionResult> {
  const ctx = await guard("ingredients.editSpecs");
  if (isDenial(ctx)) return ctx;

  for (const k of ["kcal", "protein", "carb", "fat", "fiber"] as const) {
    if (!(Number(specs[k]) >= 0)) return { ok: false, error: "القيم الغذائية لازم تكون أرقام غير سالبة" };
  }

  const { error } = await ctx.supabase
    .from("ops_ingredients")
    .update({
      kcal: specs.kcal, protein: specs.protein, carb: specs.carb,
      fat: specs.fat, fiber: specs.fiber, hidden: specs.hidden, flags: specs.flags,
    })
    .eq("key", key);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "المكوّنات", `تحديث القيم الغذائية/الحساسية: ${await ingName(ctx, key)}`);
  return done(["/admin/ops/ingredients"]);
}

export async function setIngredientPrice(key: string, price: number): Promise<ActionResult> {
  const ctx = await guard("ingredients.editPrice");
  if (isDenial(ctx)) return ctx;
  if (!(Number(price) > 0)) return { ok: false, error: "السعر لازم يكون أكبر من صفر" };

  const { error } = await ctx.supabase.from("ops_ingredients").update({ price: Number(price) }).eq("key", key);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "أسعار المكوّنات", `سعر ${await ingName(ctx, key)}: ${Number(price)} ر.س/كجم`);
  return done(["/admin/ops/ingredients"]);
}

export async function setIngApproval(key: string, index: number, status: GateStatus): Promise<ActionResult> {
  const cap: Cap = index === ING_APPROVAL_PRICE ? "ingApproval.editPrice" : "ingApproval.edit";
  const ctx = await guard(cap);
  if (isDenial(ctx)) return ctx;

  const { error } = await ctx.supabase
    .from("ops_ing_approvals")
    .upsert({ ing_key: key, approval_index: index, status, updated_by: ctx.session.userId });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "اعتماد المكوّنات", `${await ingName(ctx, key)} · ${ING_APPROVALS[index]}: ${status}`);
  return done(["/admin/ops/ingredients"]);
}

// ---------------- بوابات الجودة ----------------

export async function setGate(
  skuId: string,
  gateIndex: number,
  status: GateStatus,
  note: string,
): Promise<ActionResult> {
  const cap: Cap = gateIndex === GATE_PRICE ? "quality.editPriceGate" : "quality.editGates";
  const ctx = await guard(cap);
  if (isDenial(ctx)) return ctx;

  if (status === "HOLD" && !note.trim()) return { ok: false, error: "سبب الإيقاف إجباري" };

  const { error } = await ctx.supabase.from("ops_gates").upsert({
    sku: skuId,
    gate_index: gateIndex,
    status,
    note: status === "HOLD" ? note.trim() : "",
    updated_by: ctx.session.userId,
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "بوابات الجودة",
    `${skuId} ${await skuName(ctx, skuId)} · ${GATES[gateIndex]}: ${status}` +
    (status === "HOLD" ? ` — ${note.trim()}` : ""));
  return done(["/admin/ops/quality", "/admin/ops/menu"]);
}

export async function setShelfLife(skuId: string, hours: number): Promise<ActionResult> {
  const ctx = await guard("quality.editShelfLife");
  if (isDenial(ctx)) return ctx;
  if (!(Number(hours) > 0)) return { ok: false, error: "الصلاحية لازم تكون أكبر من صفر" };

  const { error } = await ctx.supabase
    .from("ops_shelf_life")
    .upsert({ sku: skuId, hours: Math.floor(Number(hours)), updated_by: ctx.session.userId });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "الصلاحية", `صلاحية ${skuId} ${await skuName(ctx, skuId)}: ${Math.floor(Number(hours))} ساعة`);
  return done(["/admin/ops/quality"]);
}

// ---------------- الإعدادات وهندسة المنيو ----------------

export async function saveSettings(settings: Settings): Promise<ActionResult> {
  const ctx = await guard("settings.edit");
  if (isDenial(ctx)) return ctx;

  const { error } = await ctx.supabase
    .from("ops_settings")
    .update({ data: settings, updated_by: ctx.session.userId })
    .eq("id", 1);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "الإعدادات", "تحديث إعدادات الحصص والتكلفة");
  return done(["/admin/ops/settings"]);
}

export async function setUnitsSold(skuId: string, units: number | null): Promise<ActionResult> {
  const ctx = await guard("engineering.view");
  if (isDenial(ctx)) return ctx;

  if (units === null || Number.isNaN(units)) {
    const { error } = await ctx.supabase.from("ops_units_sold").delete().eq("sku", skuId);
    if (error) return dbError(error.message);
  } else {
    const { error } = await ctx.supabase
      .from("ops_units_sold")
      .upsert({ sku: skuId, units: Math.max(0, Math.floor(Number(units))), updated_by: ctx.session.userId });
    if (error) return dbError(error.message);
  }

  await writeAudit(ctx, "هندسة المنيو", `مبيعات ${skuId}: ${units ?? "—"}`);
  return done(["/admin/ops/engineering"]);
}

// ---------------- إرجاع البيانات للأصل ----------------

export async function resetAll(): Promise<ActionResult> {
  const ctx = await guard("data.reset");
  if (isDenial(ctx)) return ctx;
  await writeAudit(ctx, "النظام", "طلب إرجاع بيانات العمليات للأصل");
  return {
    ok: false,
    error:
      "الإرجاع للأصل صار يتم بإعادة تنفيذ supabase/seed.sql على قاعدة البيانات — " +
      "ما نحذف بيانات حقيقية من الواجهة.",
  };
}
