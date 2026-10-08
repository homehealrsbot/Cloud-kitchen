"use client";

// حالة العمليات في المتصفح.
//
// قبل: الأصل من JSON + التعديلات في localStorage، والصلاحية تُفحص في المتصفح.
// الآن: الخادم يقرأ كل شي من Supabase ويمرّره هنا كصورة واحدة (snapshot)، والتعديلات
// تمر عبر Server Actions. المحرك في engine.ts ما تغيّر — نفس الدوال الصافية تحسب
// التغذية والتكلفة والسعر والهامش فوق البيانات الجديدة.

import { createContext, useContext, useMemo } from "react";
import baseIngredients from "@/data/ops/ingredients.json";
import baseRecipes from "@/data/ops/recipes.json";
import baseMenu from "@/data/ops/menu.json";
import baseSettings from "@/data/ops/settings.json";
import {
  AllergenKey,
  ComputedSku,
  GateDef,
  GateStatus,
  IngApprovalDef,
  Ingredient,
  KitchenGateRecord,
  KitchenPilotView,
  MenuItem,
  OpsData,
  PilotTrial,
  RecipeLine,
  Settings,
  SkuQuality,
  activeGates,
  activeIngApprovals,
  computeMenu,
  deriveKitchenPilot,
  deriveSkuQuality,
  gateStatuses,
  ingApprovalStatuses,
} from "./engine";
import type { AuditEntry, GateStamp, OpsSnapshot } from "./types";

export type { AuditEntry, OpsSnapshot, ActionResult } from "./types";

export type IngredientSpecs = Pick<Ingredient, "kcal" | "protein" | "carb" | "fat" | "fiber" | "hidden" | "flags">;

/**
 * قيم الملف الأصلي (الإكسل) — تُستخدم فقط للمقارنة في شاشة الإعدادات
 * («هل الإعدادات الحالية تساوي الأصل؟»). مصدر الحقيقة هو قاعدة البيانات.
 */
export const BASE_DATA = {
  ingredients: baseIngredients as Ingredient[],
  recipes: baseRecipes as RecipeLine[],
  menu: baseMenu as MenuItem[],
  settings: baseSettings as unknown as Settings,
};

export interface SkuView {
  sku: ComputedSku;
  gates: GateStatus[]; // مفهرسة برقم البوابة
  notes: Record<number, string>;
  stamps: Record<number, GateStamp>; // من ختم كل بوابة ومتى
  quality: SkuQuality;
  trials: PilotTrial[];
  chef: KitchenGateRecord | null;
  pilot: KitchenPilotView;
}

/** نفس الشكل اللي كانت الشاشات تستخدمه — ما تغيّر شي من ناحيتها. */
export interface OpsView {
  ready: boolean;
  state: {
    production: Record<string, Record<string, number>>;
    unitsSold: Record<string, number>;
    audit: AuditEntry[];
    rotation: string[][] | null;
  };
  data: OpsData;
  computed: ComputedSku[];
  skus: SkuView[];
  skuMap: Map<string, SkuView>;
  /** تعريفات البوابات النشطة مرتّبة — الشاشات تدور عليها بدل مصفوفة ثابتة. */
  gateDefs: GateDef[];
  approvalDefs: IngApprovalDef[];
  ingApprovals: (key: string) => GateStatus[];
  ingApprovalStamps: (key: string) => Record<number, GateStamp>;
  recipesEdited: boolean;
}

const OpsContext = createContext<OpsSnapshot | null>(null);

export const OpsProvider = OpsContext.Provider;

export function useOps(): OpsView {
  const snap = useContext(OpsContext);

  return useMemo(() => {
    if (!snap || !snap.data?.settings) {
      // ما وصلت البيانات بعد (أو القراءة رجعت فاضية بسبب الصلاحيات)
      const empty: OpsData = {
        ingredients: [],
        recipes: [],
        menu: [],
        rotation: { slotLabels: [], slotRule: [], days: [], rules: "" },
        settings: BASE_DATA.settings,
        gateDefs: [],
        ingApprovalDefs: [],
      };
      return {
        ready: false,
        state: { production: {}, unitsSold: {}, audit: [], rotation: null },
        data: empty,
        computed: [],
        skus: [],
        skuMap: new Map(),
        gateDefs: [],
        approvalDefs: [],
        ingApprovals: () => [],
        ingApprovalStamps: () => ({}),
        recipesEdited: false,
      };
    }

    const { data } = snap;
    const computed = computeMenu(data);
    const gateDefs = activeGates(data.gateDefs);
    const approvalDefs = activeIngApprovals(data.ingApprovalDefs);
    const skus: SkuView[] = computed.map((sku) => {
      const id = sku.item.id;
      const gates = gateStatuses(data.gateDefs, snap.gates[id]);
      const trials = snap.pilotTrials[id] ?? [];
      const chef = snap.kitchenGate[id] ?? null;
      return {
        sku,
        gates,
        notes: snap.gateNotes[id] ?? {},
        stamps: snap.gateStamps[id] ?? {},
        quality: deriveSkuQuality(gates, sku.item.shelfLifeH, data.settings, data.gateDefs),
        trials,
        chef,
        pilot: deriveKitchenPilot(sku, trials, chef, data.settings),
      };
    });

    return {
      ready: true,
      state: {
        production: snap.production,
        unitsSold: snap.unitsSold,
        audit: snap.audit,
        rotation: data.rotation.days.map((d) => d.slots),
      },
      data,
      computed,
      skus,
      skuMap: new Map(skus.map((s) => [s.sku.item.id, s])),
      gateDefs,
      approvalDefs,
      ingApprovals: (key: string) => ingApprovalStatuses(data.ingApprovalDefs, snap.ingApprovals[key]),
      ingApprovalStamps: (key: string) => snap.ingApprovalStamps[key] ?? {},
      recipesEdited: snap.recipesEdited,
    };
  }, [snap]);
}

export type { AllergenKey };
