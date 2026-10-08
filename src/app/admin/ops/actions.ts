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
import { Cap, ROLES, can, isRole, sealsGate } from "@/lib/ops/roles";
import {
  GateStatus,
  IngType,
  MAX_RECIPE_LINES,
  PilotResult,
  Settings,
  deriveKitchenPilot,
} from "@/lib/ops/engine";
import { loadOpsSnapshot } from "@/lib/ops/server-data";
import { computeMenu } from "@/lib/ops/engine";
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

function roleLabel(r: string | null): string {
  return isRole(r) ? ROLES[r].label : "دور غير معروف";
}

interface DefRow {
  label: string;
  owner_role: string | null;
  active: boolean;
}

/**
 * يقرأ تعريف بوابة/اعتماد ويفحص سلطة الختم منه.
 *
 * ليش من القاعدة ومو من ثابت في الكود: التعريفات بيانات تملكها الإدارة
 * التنفيذية — تضيف بوابة، توقفها، تنقل ملكيتها لدور ثاني. فالسلطة لازم تُقرأ
 * مع الصف، ونفس الشرط مفروض مرة ثانية في سياسة RLS فما ينفع تجاوزه بالـAPI.
 */
async function defAuthority(
  ctx: Ctx,
  table: "ops_gate_defs" | "ops_ing_approval_defs",
  column: "gate_index" | "approval_index",
  index: number,
): Promise<DefRow | ActionResult> {
  if (!Number.isInteger(index)) return { ok: false, error: "رقم البوابة غير صحيح" };

  const { data, error } = await ctx.supabase
    .from(table)
    .select("label,owner_role,active")
    .eq(column, index)
    .maybeSingle();
  if (error) return dbError(error.message);
  if (!data) return { ok: false, error: "هذي البوابة غير معرّفة في النظام" };

  const def = data as DefRow;
  if (!def.active) return { ok: false, error: `«${def.label}» موقوفة — ما تُعتمد` };
  if (def.owner_role === null) {
    return {
      ok: false,
      error: `«${def.label}» بوابة محسوبة: تتحدد من تجارب Pilot وقرار الشيف، وما تُختم يدوياً`,
    };
  }
  if (!sealsGate(ctx.session.role, def.owner_role)) {
    return { ok: false, error: `«${def.label}» من صلاحية ${roleLabel(def.owner_role)} وحدها` };
  }
  return def;
}

function isDefDenial(v: DefRow | ActionResult): v is ActionResult {
  return "ok" in v;
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

  // إرجاع البوابات المتأثرة لـ«بانتظار الاعتماد» ما يحصل هنا: محفّز
  // reset_gates_on_recipe_change في القاعدة يسوّيه ويكتب سجله.
  //
  // ليش مو هنا: اللي يعدّل الوصفة هو المطبخ، والبوابات المتأثرة ملك الجودة
  // والتنفيذي — فسياسة ops_gates ترفض كتابة المطبخ عليها، وهي محقّة. ولو
  // سوّيناها هنا بأي حيلة لصار الإرجاع يعتمد على مرور التعديل من هذا الكود،
  // وأي تعديل من الـAPI مباشرة يخلّي الصنف معتمداً على وصفة ما عاد موجودة.
  await writeAudit(ctx, "الوصفات",
    `تعديل وصفة ${skuId} ${await skuName(ctx, skuId)} (${lines.length} سطر)`);
  return done(["/admin/ops/recipes", "/admin/ops/quality", "/admin/ops/kitchen-gate"]);
}

// ---------------- المكوّنات ----------------

export async function setIngredientSpecs(
  key: string,
  specs: {
    kcal: number; protein: number; carb: number; fat: number; fiber: number;
    hidden: string; flags: Record<string, boolean>;
    supplier: string; supplierNote: string;
  },
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
      supplier: specs.supplier.trim(), supplier_note: specs.supplierNote.trim(),
    })
    .eq("key", key);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "المكوّنات", `تحديث بيانات المكوّن: ${await ingName(ctx, key)}`);
  return done(["/admin/ops/ingredients"]);
}

export async function setIngredientPrice(
  key: string,
  price: number,
  quoteDate: string | null = null,
): Promise<ActionResult> {
  const ctx = await guard("ingredients.editPrice");
  if (isDenial(ctx)) return ctx;
  if (!(Number(price) > 0)) return { ok: false, error: "السعر لازم يكون أكبر من صفر" };

  // تاريخ عرض السعر يتحدّث مع السعر: سعر بلا تاريخ ما ينفع يُعتمد كـ«سعر موثّق»
  const patch: Record<string, unknown> = { price: Number(price) };
  if (quoteDate !== null) patch.price_quote_date = quoteDate || null;

  const { error } = await ctx.supabase.from("ops_ingredients").update(patch).eq("key", key);
  if (error) return dbError(error.message);

  await writeAudit(ctx, "أسعار المكوّنات",
    `سعر ${await ingName(ctx, key)}: ${Number(price)} ر.س/كجم` + (quoteDate ? ` (عرض ${quoteDate})` : ""));
  return done(["/admin/ops/ingredients"]);
}

export async function setIngApproval(
  key: string,
  index: number,
  status: GateStatus,
  note = "",
): Promise<ActionResult> {
  // الجلسة أولاً (أي موظف)، وسلطة الاعتماد بعدها من صف التعريف نفسه
  const ctx = await guard("ingredients.view");
  if (isDenial(ctx)) return ctx;

  const def = await defAuthority(ctx, "ops_ing_approval_defs", "approval_index", index);
  if (isDefDenial(def)) return def;

  if (status === "HOLD" && !note.trim()) return { ok: false, error: "سبب الرفض إجباري" };

  // اعتماد بلا دليل مو اعتماد: اعتماد المورد يحتاج اسم مورد مكتوب، والسعر
  // الموثّق يحتاج سعراً وتاريخ عرض. النوع (kind) هو اللي يحدد الشرط، فإضافة
  // اعتماد جديد من نوع عام ما تتطلب شي.
  if (status === "READY") {
    const { data: ing } = await ctx.supabase
      .from("ops_ingredients")
      .select("supplier,price,price_quote_date")
      .eq("key", key)
      .maybeSingle();
    const { data: defRow } = await ctx.supabase
      .from("ops_ing_approval_defs").select("kind").eq("approval_index", index).maybeSingle();
    const kind = String(defRow?.kind ?? "standard");
    if (kind === "supplier" && !String(ing?.supplier ?? "").trim()) {
      return { ok: false, error: "اكتب اسم المورد أولاً — ما ينفع نعتمد مورداً بلا اسم" };
    }
    if (kind === "price") {
      if (!(Number(ing?.price) > 0)) return { ok: false, error: "ما فيه سعر مسجّل لهذا المكوّن" };
      if (!ing?.price_quote_date) return { ok: false, error: "سجّل تاريخ عرض السعر أولاً" };
    }
  }

  const stamped = status === "READY";
  const { error } = await ctx.supabase.from("ops_ing_approvals").upsert({
    ing_key: key,
    approval_index: index,
    status,
    note: status === "READY" ? "" : note.trim(),
    updated_by: ctx.session.userId,
    approved_by_name: stamped ? ctx.session.name || ctx.session.email : null,
    approved_at: stamped ? new Date().toISOString() : null,
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "اعتماد المكوّنات",
    `${await ingName(ctx, key)} · ${def.label}: ${status}` + (note.trim() ? ` — ${note.trim()}` : ""));
  return done(["/admin/ops/ingredients"]);
}

// ---------------- بوابات الجودة ----------------

export async function setGate(
  skuId: string,
  gateIndex: number,
  status: GateStatus,
  note: string,
): Promise<ActionResult> {
  const ctx = await guard("quality.view");
  if (isDenial(ctx)) return ctx;

  const def = await defAuthority(ctx, "ops_gate_defs", "gate_index", gateIndex);
  if (isDefDenial(def)) return def;

  if (status === "HOLD" && !note.trim()) return { ok: false, error: "سبب الإيقاف إجباري" };

  // الختم يسجّل مين ومتى — الاعتماد بلا اسم وتاريخ مو اعتماد
  const stamped = status === "READY";
  const { error } = await ctx.supabase.from("ops_gates").upsert({
    sku: skuId,
    gate_index: gateIndex,
    status,
    note: status === "HOLD" ? note.trim() : "",
    updated_by: ctx.session.userId,
    approved_by_name: stamped ? ctx.session.name || ctx.session.email : null,
    approved_at: stamped ? new Date().toISOString() : null,
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "بوابات الاعتماد",
    `${skuId} ${await skuName(ctx, skuId)} · ${def.label}: ${status}` +
    (status === "HOLD" ? ` — ${note.trim()}` : ""));
  return done(["/admin/ops/quality", "/admin/ops/menu"]);
}

// ---------------- تجارب Pilot (الجودة تسجّل) ----------------

export async function setPilotTrial(
  skuId: string,
  trialIndex: number,
  input: { result: PilotResult | null; cookedPortionG: number | null; date: string | null; notes: string },
): Promise<ActionResult> {
  const ctx = await guard("pilot.edit");
  if (isDenial(ctx)) return ctx;

  if (!Number.isInteger(trialIndex) || trialIndex < 1) return { ok: false, error: "رقم التجربة غير صحيح" };
  if (input.result !== null && input.result !== "PASS" && input.result !== "FAIL") {
    return { ok: false, error: "نتيجة التجربة لازم تكون ناجحة أو فاشلة" };
  }
  if (input.result === "FAIL" && !input.notes.trim()) {
    return { ok: false, error: "التجربة الفاشلة لازم يكون لها سبب مكتوب" };
  }
  if (input.cookedPortionG !== null && !(Number(input.cookedPortionG) > 0)) {
    return { ok: false, error: "وزن الحصة بعد الطبخ لازم يكون أكبر من صفر" };
  }

  const { error } = await ctx.supabase.from("ops_pilot_trials").upsert({
    sku: skuId,
    trial_index: trialIndex,
    result: input.result,
    cooked_portion_g: input.cookedPortionG,
    trial_date: input.date || null,
    notes: input.notes.trim(),
    recorded_by: ctx.session.userId,
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "تجارب Pilot",
    `${skuId} ${await skuName(ctx, skuId)} · تجربة ${trialIndex}: ${input.result ?? "—"}` +
    (input.notes.trim() ? ` — ${input.notes.trim()}` : ""));
  return done(["/admin/ops/pilot", "/admin/ops/kitchen-gate", "/admin/ops/quality"]);
}

export async function clearPilotTrial(skuId: string, trialIndex: number): Promise<ActionResult> {
  const ctx = await guard("pilot.edit");
  if (isDenial(ctx)) return ctx;

  const { error } = await ctx.supabase
    .from("ops_pilot_trials")
    .delete()
    .match({ sku: skuId, trial_index: trialIndex });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "تجارب Pilot", `${skuId} · حذف تجربة ${trialIndex}`);
  return done(["/admin/ops/pilot", "/admin/ops/kitchen-gate", "/admin/ops/quality"]);
}

// ---------------- قرار الشيف على بوابة المطبخ ----------------

export async function setChefDecision(
  skuId: string,
  decision: GateStatus,
  note: string,
): Promise<ActionResult> {
  const ctx = await guard("kitchenGate.edit");
  if (isDenial(ctx)) return ctx;

  if (decision !== "READY" && decision !== "HOLD" && decision !== "PENDING") {
    return { ok: false, error: "قرار غير معروف" };
  }
  if (decision === "HOLD" && !note.trim()) return { ok: false, error: "سبب الإيقاف إجباري" };

  // الموافقة لازم تكون على فحوص قائمة فعلاً. القاعدة تفحص البنيويات منها
  // بمحفّز، والاتساق الحسابي (السعرات مقابل الماكروز) يُفحص هنا لأنه معادلة
  // في المحرك — ما نكرّر المحرك في SQL.
  if (decision === "READY") {
    const snap = await loadOpsSnapshot();
    const sku = computeMenu(snap.data).find((c) => c.item.id === skuId);
    if (!sku) return { ok: false, error: "صنف غير موجود" };
    const pilot = deriveKitchenPilot(sku, snap.pilotTrials[skuId] ?? [], null, snap.data.settings);
    const failed = pilot.checks.filter((c) => !c.ok);
    if (failed.length > 0) {
      return {
        ok: false,
        error: `ما تنفع الموافقة قبل: ${failed.map((c) => `${c.label} (${c.detail})`).join(" · ")}`,
      };
    }
  }

  const { error } = await ctx.supabase.from("ops_kitchen_gate").upsert({
    sku: skuId,
    chef_decision: decision,
    chef_name: ctx.session.name || ctx.session.email,
    approved_at: decision === "READY" ? new Date().toISOString() : null,
    note: decision === "READY" ? "" : note.trim(),
    updated_by: ctx.session.userId,
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "بوابة المطبخ",
    `${skuId} ${await skuName(ctx, skuId)} · قرار الشيف: ${decision}` +
    (note.trim() ? ` — ${note.trim()}` : ""));
  return done(["/admin/ops/kitchen-gate", "/admin/ops/quality", "/admin/ops/menu"]);
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

// ---------------- تعريف البوابات نفسها (الإدارة التنفيذية) ----------------
//
// هنا تُمنح السلطة: الإدارة التنفيذية تحدد إيش البوابات، ومين يختم كل واحدة،
// وأي بوابة ترجع للاعتماد لو تعدّلت الوصفة. الأقسام تعتمد؛ ما تعرّف.

const GATE_KINDS = ["standard", "kitchen_pilot", "shelf", "price"] as const;
type GateKindInput = (typeof GATE_KINDS)[number];

/** الأنواع اللي ما ينفع تتكرر: المحرك يأخذ أول واحدة ويتجاهل الباقي. */
const UNIQUE_GATE_KINDS: GateKindInput[] = ["kitchen_pilot", "shelf", "price"];

export async function setGateDef(input: {
  index: number;
  label: string;
  kind: string;
  ownerRole: string | null;
  resetsOnRecipeChange: boolean;
  active: boolean;
  note: string;
}): Promise<ActionResult> {
  const ctx = await guard("gateDefs.manage");
  if (isDenial(ctx)) return ctx;

  if (!Number.isInteger(input.index) || input.index < 0) return { ok: false, error: "رقم البوابة لازم يكون عدداً غير سالب" };
  const label = input.label.trim();
  if (!label) return { ok: false, error: "اسم البوابة مطلوب" };
  if (!(GATE_KINDS as readonly string[]).includes(input.kind)) return { ok: false, error: "نوع البوابة غير معروف" };
  const kind = input.kind as GateKindInput;

  // البوابة المحسوبة ما لها مالك: المحفّز يكتبها، فلو أعطيناها دوراً صار
  // بالإمكان ختمها يدوياً وتجاوز التجارب.
  const ownerRole = kind === "kitchen_pilot" ? null : input.ownerRole;
  if (kind !== "kitchen_pilot") {
    if (!isRole(ownerRole)) return { ok: false, error: "لازم تحدد الدور اللي يختم البوابة" };
  }

  if (input.active && UNIQUE_GATE_KINDS.includes(kind)) {
    const { data: clash } = await ctx.supabase
      .from("ops_gate_defs")
      .select("gate_index,label")
      .eq("kind", kind)
      .eq("active", true)
      .neq("gate_index", input.index);
    if (clash && clash.length > 0) {
      return {
        ok: false,
        error: `فيه بوابة نشطة من نفس النوع: «${clash[0].label}» — أوقفها أولاً أو خلّ هذي من نوع عام`,
      };
    }
  }

  const { error } = await ctx.supabase.from("ops_gate_defs").upsert({
    gate_index: input.index,
    label,
    kind,
    owner_role: ownerRole,
    resets_on_recipe_change: Boolean(input.resetsOnRecipeChange),
    active: Boolean(input.active),
    note: input.note.trim(),
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "تعريف البوابات",
    `بوابة ${input.index} «${label}» · النوع ${kind} · يختمها ${ownerRole ? roleLabel(ownerRole) : "محسوبة"}` +
    (input.active ? "" : " (موقوفة)"));
  // عدد البوابات تغيّر، فشرط النشر تغيّر — كل الشاشات والمنيو العام
  return done(["/admin/ops/quality", "/admin/ops", "/admin/ops/menu", "/admin/team", "/menu"]);
}

export async function setIngApprovalDef(input: {
  index: number;
  label: string;
  kind: string;
  ownerRole: string | null;
  active: boolean;
  note: string;
}): Promise<ActionResult> {
  const ctx = await guard("gateDefs.manage");
  if (isDenial(ctx)) return ctx;

  if (!Number.isInteger(input.index) || input.index < 0) return { ok: false, error: "رقم الاعتماد لازم يكون عدداً غير سالب" };
  const label = input.label.trim();
  if (!label) return { ok: false, error: "اسم الاعتماد مطلوب" };
  const kinds = ["standard", "supplier", "allergen", "price"];
  if (!kinds.includes(input.kind)) return { ok: false, error: "نوع الاعتماد غير معروف" };
  if (!isRole(input.ownerRole)) return { ok: false, error: "لازم تحدد الدور اللي يعتمد" };

  const { error } = await ctx.supabase.from("ops_ing_approval_defs").upsert({
    approval_index: input.index,
    label,
    kind: input.kind,
    owner_role: input.ownerRole,
    active: Boolean(input.active),
    note: input.note.trim(),
  });
  if (error) return dbError(error.message);

  await writeAudit(ctx, "تعريف الاعتمادات",
    `اعتماد ${input.index} «${label}» · يعتمده ${roleLabel(input.ownerRole)}` + (input.active ? "" : " (موقوف)"));
  return done(["/admin/ops/ingredients", "/admin/ops", "/admin/team"]);
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
