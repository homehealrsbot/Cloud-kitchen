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
  GATES,
  GateStatus,
  ING_APPROVALS,
  Ingredient,
  MenuItem,
  OpsData,
  RecipeLine,
  Settings,
  SkuQuality,
  computeMenu,
  deriveSkuQuality,
} from "./engine";
import type { AuditEntry, OpsSnapshot } from "./types";

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
  gates: GateStatus[];
  notes: Record<number, string>;
  quality: SkuQuality;
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
  ingApprovals: (key: string) => GateStatus[];
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
      };
      return {
        ready: false,
        state: { production: {}, unitsSold: {}, audit: [], rotation: null },
        data: empty,
        computed: [],
        skus: [],
        skuMap: new Map(),
        ingApprovals: () => ING_APPROVALS.map(() => "PENDING" as GateStatus),
        recipesEdited: false,
      };
    }

    const { data } = snap;
    const computed = computeMenu(data);
    const skus: SkuView[] = computed.map((sku) => {
      const gates = GATES.map((_, i) => snap.gates[sku.item.id]?.[i] ?? "PENDING") as GateStatus[];
      return {
        sku,
        gates,
        notes: snap.gateNotes[sku.item.id] ?? {},
        quality: deriveSkuQuality(gates, sku.item.shelfLifeH, data.settings),
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
      ingApprovals: (key: string) =>
        ING_APPROVALS.map((_, i) => snap.ingApprovals[key]?.[i] ?? "PENDING") as GateStatus[],
      recipesEdited: snap.recipesEdited,
    };
  }, [snap]);
}

export type { AllergenKey };
