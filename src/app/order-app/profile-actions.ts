"use server";

// تفضيلات العميل تُحفظ في صفه في جدول customers.
//
// قبل: كانت في localStorage — تضيع عند تغيير الجهاز أو تنظيف المتصفح، والمطبخ
// ما يقدر يشوفها أبداً. الآن الحساسيات والهدف الصحي بيانات حقيقية يقدر الفريق
// يعتمد عليها في التحضير.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { GOAL_TAGS, type GoalTag } from "@/lib/kitchen-shared";
import type { ActionResult } from "@/lib/ops/types";

export interface CustomerProfile {
  fullName: string;
  phone: string | null;
  healthGoal: GoalTag | null;
  weightKg: number | null;
  heightCm: number | null;
  conditions: string[];
  allergies: string[];
  cuisines: string[];
  deliveryDays: string[];
}

export async function getProfile(): Promise<CustomerProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("full_name, phone, health_goal, weight_kg, height_cm, conditions, allergies, cuisines, delivery_days")
    .eq("user_id", user.userId)
    .maybeSingle();
  if (!data) return null;

  return {
    fullName: data.full_name ?? "",
    phone: data.phone ?? null,
    healthGoal: (data.health_goal as GoalTag) ?? null,
    weightKg: data.weight_kg === null ? null : Number(data.weight_kg),
    heightCm: data.height_cm === null ? null : Number(data.height_cm),
    conditions: data.conditions ?? [],
    allergies: data.allergies ?? [],
    cuisines: data.cuisines ?? [],
    deliveryDays: data.delivery_days ?? [],
  };
}

async function update(patch: Record<string, unknown>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "لازم تسجّل دخول أولاً" };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(patch).eq("user_id", user.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/order-app");
  return { ok: true };
}

export async function saveHealthProfile(input: {
  weightKg: number;
  heightCm: number;
  conditions: string[];
  allergies: string[];
  healthGoal: GoalTag;
}): Promise<ActionResult> {
  if (!(input.weightKg > 0) || !(input.heightCm > 0)) {
    return { ok: false, error: "الوزن والطول لازم يكونا أرقاماً أكبر من صفر" };
  }
  if (input.weightKg > 400 || input.heightCm > 260) {
    return { ok: false, error: "تأكد من الوزن والطول — القيم المدخلة غير منطقية" };
  }
  if (!GOAL_TAGS.includes(input.healthGoal)) return { ok: false, error: "الهدف الصحي غير معروف" };

  return update({
    weight_kg: input.weightKg,
    height_cm: input.heightCm,
    conditions: input.conditions,
    allergies: input.allergies,
    health_goal: input.healthGoal,
  });
}

export async function saveCuisines(cuisines: string[]): Promise<ActionResult> {
  return update({ cuisines });
}

export async function saveDeliveryDays(days: string[]): Promise<ActionResult> {
  if (days.length === 0) return { ok: false, error: "اختر يوم توصيل واحد على الأقل" };
  return update({ delivery_days: days });
}
