"use client";

// طبقة التجميع: نفس أسماء وتواقيع الـ Server Actions، لكنها تضيف للمسوّدة
// بدل ما تكتب في القاعدة.
//
// صُمّمت بهذا الشكل عمداً: الشاشة تبدّل `actions.setGate(...)` بـ
// `stage.setGate(...)` وخلاص — ما تتغيّر معالجة الأخطاء ولا شكل النتيجة.
// الفحوص الرخيصة (رقم موجب، سبب إيقاف مكتوب) تبقى هنا عشان المستخدم يشوف
// الخطأ وهو يكتب، لا بعد ما يرسل. وفحوص السلطة تتكرر على الخادم وفي RLS.
//
// ملاحظة على ما هو *خارج* هذي الطبقة: تسجيل قراءة نقطة حرجة، وتعليم برنامج
// تمهيدي، ورفع بلاغ عدم مطابقة، وإدخال دفعة صلاحية — هذي وقائع لا تعديلات.
// تأجيلها لحين اعتماد يكسر غرضها: القراءة خارج الحد لازم ترفع بلاغاً في
// حينه، والبلاغ لازم يُرفع ساعة اكتشافه. فتبقى فورية.

import { useCallback, useMemo } from "react";
import { useDraft } from "@/lib/ops/draft";
import { useOps } from "@/lib/ops/store";
import { changedFields } from "@/lib/ops/changes";
import type { GateStatus, IngType, PilotResult, Settings } from "@/lib/ops/engine";
import type { ActionResult } from "@/lib/ops/types";

const OK: ActionResult = { ok: true };
const no = (error: string): ActionResult => ({ ok: false, error });

type Patch = Record<string, unknown>;

export interface StageApi {
  setGate: (skuId: string, gateIndex: number, status: GateStatus, note: string) => Promise<ActionResult>;
  setIngApproval: (key: string, index: number, status: GateStatus, note?: string) => Promise<ActionResult>;
  setIngredientSpecs: (
    key: string,
    specs: {
      kcal: number; protein: number; carb: number; fat: number; fiber: number;
      hidden: string; flags: Record<string, boolean>; supplier: string; supplierNote: string;
    },
  ) => Promise<ActionResult>;
  setIngredientPrice: (key: string, price: number, quoteDate?: string | null) => Promise<ActionResult>;
  setShelfLife: (skuId: string, hours: number) => Promise<ActionResult>;
  setPortions: (dayIndex: number, slot: number, portions: number, skuId: string) => Promise<ActionResult>;
  clearDay: (dayIndex: number) => Promise<ActionResult>;
  setUnitsSold: (skuId: string, units: number | null) => Promise<ActionResult>;
  setPilotTrial: (
    skuId: string,
    trialIndex: number,
    input: { result: PilotResult | null; cookedPortionG: number | null; date: string | null; notes: string },
  ) => Promise<ActionResult>;
  clearPilotTrial: (skuId: string, trialIndex: number) => Promise<ActionResult>;
  setChefDecision: (skuId: string, decision: GateStatus, note: string) => Promise<ActionResult>;
  saveSettings: (settings: Settings) => Promise<ActionResult>;
  saveRecipe: (skuId: string, lines: { type: IngType; ing: string; grams: number }[]) => Promise<ActionResult>;
  setRotationSlot: (dayIndex: number, slot: number, skuId: string) => Promise<ActionResult>;
  setIsoClause: (clause: string, status: string, evidence: string) => Promise<ActionResult>;
  updateNcr: (input: {
    id: number; status: string; rootCause: string; correctiveAction: string;
    preventiveAction: string; dueDate: string | null;
  }) => Promise<ActionResult>;
  setGateDef: (input: {
    index: number; label: string; kind: string; ownerRole: string | null;
    resetsOnRecipeChange: boolean; active: boolean; note: string;
  }) => Promise<ActionResult>;
  setIngApprovalDef: (input: {
    index: number; label: string; kind: string; ownerRole: string | null;
    active: boolean; note: string;
  }) => Promise<ActionResult>;
}

export function useStage(): StageApi {
  const { stage } = useDraft();
  const ops = useOps();

  const skuName = useCallback(
    (id: string) => ops.skuMap.get(id)?.sku.item.name ?? id,
    [ops.skuMap],
  );
  const ingName = useCallback(
    (key: string) => ops.data.ingredients.find((i) => i.key === key)?.name ?? key,
    [ops.data.ingredients],
  );

  return useMemo<StageApi>(() => {
    const put = (kind: string, targetKey: Patch, patch: Patch, before: Patch | null, summary: string) => {
      stage({ kind, targetKey, patch, before, summary });
      return Promise.resolve(OK);
    };

    const statusWord = (s: GateStatus) => (s === "READY" ? "معتمد" : s === "HOLD" ? "موقوف" : "معلّق");

    return {
      setGate(skuId, gateIndex, status, note) {
        const def = ops.data.gateDefs.find((d) => d.index === gateIndex);
        if (!def) return Promise.resolve(no("البوابة غير معرّفة"));
        if (status === "HOLD" && !note.trim()) return Promise.resolve(no("سبب الإيقاف إجباري"));
        const current = ops.skuMap.get(skuId)?.gates[gateIndex] ?? "PENDING";
        return put(
          "gate.set",
          { sku: skuId, gate_index: gateIndex },
          { status, note: note.trim(), approved_by_name: null, approved_at: null },
          { status: current },
          `${skuName(skuId)} · بوابة «${def.label}» → ${statusWord(status)}${note.trim() ? ` (${note.trim()})` : ""}`,
        );
      },

      setIngApproval(key, index, status, note = "") {
        const def = ops.data.ingApprovalDefs.find((d) => d.index === index);
        if (!def) return Promise.resolve(no("الاعتماد غير معرّف"));
        const current = ops.ingApprovals(key)[index] ?? "PENDING";
        return put(
          "ing_approval.set",
          { ing_key: key, approval_index: index },
          { status, note: note.trim(), approved_by_name: null, approved_at: null },
          { status: current },
          `${ingName(key)} · اعتماد «${def.label}» → ${statusWord(status)}`,
        );
      },

      setIngredientSpecs(key, specs) {
        for (const k of ["kcal", "protein", "carb", "fat", "fiber"] as const) {
          if (!(Number(specs[k]) >= 0)) return Promise.resolve(no("القيم الغذائية لازم تكون أرقام غير سالبة"));
        }
        const cur = ops.data.ingredients.find((i) => i.key === key);
        const next: Patch = {
          kcal: specs.kcal, protein: specs.protein, carb: specs.carb, fat: specs.fat, fiber: specs.fiber,
          hidden: specs.hidden, flags: specs.flags,
          supplier: specs.supplier.trim(), supplier_note: specs.supplierNote.trim(),
        };
        const before: Patch = cur
          ? {
              kcal: cur.kcal, protein: cur.protein, carb: cur.carb, fat: cur.fat, fiber: cur.fiber,
              hidden: cur.hidden, flags: cur.flags, supplier: cur.supplier, supplier_note: cur.supplierNote,
            }
          : {};
        const diff = changedFields(next, before);
        return put("ingredient.specs", { key }, diff, before, `${ingName(key)} · تحديث المواصفة`);
      },

      setIngredientPrice(key, price, quoteDate = null) {
        if (!(Number(price) > 0)) return Promise.resolve(no("السعر لازم يكون أكبر من صفر"));
        const cur = ops.data.ingredients.find((i) => i.key === key);
        const patch: Patch = { price: Number(price) };
        if (quoteDate !== null) patch.price_quote_date = quoteDate || null;
        return put(
          "ingredient.price",
          { key },
          patch,
          { price: cur?.price ?? null, price_quote_date: cur?.priceQuoteDate ?? null },
          `${ingName(key)} · السعر → ${Number(price)} ر.س/كجم${quoteDate ? ` (عرض ${quoteDate})` : ""}`,
        );
      },

      setShelfLife(skuId, hours) {
        if (!(Number(hours) > 0)) return Promise.resolve(no("الصلاحية لازم تكون أكبر من صفر"));
        const cur = ops.skuMap.get(skuId)?.sku.item.shelfLifeH ?? null;
        return put(
          "shelf_life.set",
          { sku: skuId },
          { hours: Math.round(Number(hours)) },
          { hours: cur },
          `${skuName(skuId)} · الصلاحية → ${Math.round(Number(hours))} ساعة`,
        );
      },

      setPortions(dayIndex, slot, portions, skuId) {
        const n = Math.max(0, Math.floor(Number(portions) || 0));
        const cur = ops.state.production[String(dayIndex)]?.[String(slot)] ?? 0;
        return put(
          "production.set",
          { day_index: dayIndex, slot },
          { portions: n },
          { portions: cur },
          `يوم ${dayIndex + 1} · ${skuName(skuId)} → ${n} حصة`,
        );
      },

      clearDay(dayIndex) {
        // تصفير بدل حذف: الصف يبقى بقيمة صفر، فالمراجع يشوف «كان ١٢٠ وصار ٠»
        const day = ops.state.production[String(dayIndex)] ?? {};
        const slots = Object.keys(day).filter((s) => Number(day[s]) > 0);
        if (slots.length === 0) return Promise.resolve(no("اليوم فاضي أصلاً"));
        for (const s of slots) {
          stage({
            kind: "production.set",
            targetKey: { day_index: dayIndex, slot: Number(s) },
            patch: { portions: 0 },
            before: { portions: Number(day[s]) },
            summary: `يوم ${dayIndex + 1} · خانة ${Number(s) + 1} → 0 حصة`,
          });
        }
        return Promise.resolve(OK);
      },

      setUnitsSold(skuId, units) {
        const n = units === null || Number.isNaN(units) ? 0 : Math.max(0, Math.floor(Number(units)));
        const cur = ops.state.unitsSold[skuId] ?? null;
        return put(
          "units_sold.set",
          { sku: skuId },
          { units: n },
          { units: cur },
          `${skuName(skuId)} · الوحدات المباعة → ${n}`,
        );
      },

      setPilotTrial(skuId, trialIndex, input) {
        if (!Number.isInteger(trialIndex) || trialIndex < 1) return Promise.resolve(no("رقم التجربة غير صحيح"));
        if (input.result === "FAIL" && !input.notes.trim()) {
          return Promise.resolve(no("التجربة الفاشلة لازم يكون لها سبب مكتوب"));
        }
        if (input.cookedPortionG !== null && !(Number(input.cookedPortionG) > 0)) {
          return Promise.resolve(no("وزن الحصة بعد الطبخ لازم يكون أكبر من صفر"));
        }
        return put(
          "pilot.set",
          { sku: skuId, trial_index: trialIndex },
          {
            result: input.result,
            cooked_portion_g: input.cookedPortionG,
            trial_date: input.date || null,
            notes: input.notes.trim(),
          },
          null,
          `${skuName(skuId)} · تجربة ${trialIndex} → ${input.result === "PASS" ? "ناجحة" : input.result === "FAIL" ? "فاشلة" : "بلا نتيجة"}`,
        );
      },

      clearPilotTrial(skuId, trialIndex) {
        return put(
          "pilot.set",
          { sku: skuId, trial_index: trialIndex },
          { result: null, cooked_portion_g: null, trial_date: null, notes: "" },
          null,
          `${skuName(skuId)} · مسح تجربة ${trialIndex}`,
        );
      },

      setChefDecision(skuId, decision, note) {
        if (decision === "HOLD" && !note.trim()) return Promise.resolve(no("سبب الإيقاف إجباري"));
        return put(
          "kitchen_gate.set",
          { sku: skuId },
          { chef_decision: decision, chef_name: "", approved_at: null, note: note.trim() },
          null,
          `${skuName(skuId)} · قرار الشيف → ${statusWord(decision)}`,
        );
      },

      saveSettings(settings) {
        return put(
          "settings.save",
          { id: 1 },
          { data: settings as unknown as Patch },
          { data: ops.data.settings as unknown as Patch },
          "تحديث إعدادات التكلفة والحدود",
        );
      },

      saveRecipe(skuId, lines) {
        if (lines.length === 0) return Promise.resolve(no("الوصفة لازم يكون فيها مكوّن واحد على الأقل"));
        const bad = lines.find((l) => !(Number(l.grams) > 0));
        if (bad) return Promise.resolve(no("كل سطر لازم يكون جرامه أكبر من صفر"));
        const rows = lines.map((l, i) => ({
          type: l.type,
          ing: l.ing,
          grams: Number(l.grams),
          sort_order: i,
        }));
        return put(
          "recipe.replace",
          { sku: skuId },
          { rows },
          null,
          `${skuName(skuId)} · الوصفة → ${rows.length} سطر`,
        );
      },

      setRotationSlot(dayIndex, slot, skuId) {
        if (!skuId) return Promise.resolve(no("اختر صنفاً"));
        const cur = ops.state.rotation?.[dayIndex]?.[slot] ?? null;
        return put(
          "rotation.set",
          { day_index: dayIndex, slot },
          { sku: skuId },
          { sku: cur },
          `دوران يوم ${dayIndex + 1} · خانة ${slot + 1} → ${skuName(skuId)}`,
        );
      },

      setIsoClause(clause, status, evidence) {
        return put(
          "iso.set",
          { clause },
          { status, evidence: evidence.trim() },
          null,
          `بند ISO ${clause} → ${status}`,
        );
      },

      updateNcr(input) {
        const closing = input.status === "closed";
        if (closing && !input.rootCause.trim()) {
          return Promise.resolve(no("ما ينغلق بلاغ بلا سبب جذري مكتوب"));
        }
        return put(
          "ncr.update",
          { id: input.id },
          {
            status: input.status,
            root_cause: input.rootCause.trim(),
            corrective_action: input.correctiveAction.trim(),
            preventive_action: input.preventiveAction.trim(),
            due_date: input.dueDate || null,
            closed_at: closing ? new Date().toISOString() : null,
          },
          null,
          `بلاغ رقم ${input.id} → ${input.status}`,
        );
      },

      setGateDef(input) {
        const label = input.label.trim();
        if (!label) return Promise.resolve(no("اسم البوابة مطلوب"));
        if (!Number.isInteger(input.index) || input.index < 0) {
          return Promise.resolve(no("رقم البوابة لازم يكون عدداً غير سالب"));
        }
        // البوابة المحسوبة ما لها مالك — لو أعطيناها دوراً صار بالإمكان ختمها
        // يدوياً وتجاوز التجارب
        const ownerRole = input.kind === "kitchen_pilot" ? null : input.ownerRole;
        if (input.kind !== "kitchen_pilot" && !ownerRole) {
          return Promise.resolve(no("لازم تحدد الدور اللي يختم البوابة"));
        }
        const cur = ops.data.gateDefs.find((d) => d.index === input.index);
        return put(
          "gate_def.set",
          { gate_index: input.index },
          {
            label, kind: input.kind, owner_role: ownerRole,
            resets_on_recipe_change: input.resetsOnRecipeChange,
            active: input.active, note: input.note.trim(),
          },
          cur ? { label: cur.label, active: cur.active, owner_role: cur.ownerRole } : null,
          `بوابة «${label}»${cur ? " · تعديل التعريف" : " · بوابة جديدة"}`,
        );
      },

      setIngApprovalDef(input) {
        const label = input.label.trim();
        if (!label) return Promise.resolve(no("اسم الاعتماد مطلوب"));
        if (!input.ownerRole) return Promise.resolve(no("لازم تحدد الدور اللي يختم الاعتماد"));
        const cur = ops.data.ingApprovalDefs.find((d) => d.index === input.index);
        return put(
          "ing_approval_def.set",
          { approval_index: input.index },
          {
            label, kind: input.kind, owner_role: input.ownerRole,
            active: input.active, note: input.note.trim(),
          },
          cur ? { label: cur.label, active: cur.active, owner_role: cur.ownerRole } : null,
          `اعتماد «${label}»${cur ? " · تعديل التعريف" : " · اعتماد جديد"}`,
        );
      },
    };
  }, [stage, ops, skuName, ingName]);
}
