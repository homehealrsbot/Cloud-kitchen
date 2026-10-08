"use server";

// إدارة الفريق — كل كتابة تمر من هنا.
//
// جدول staff ما عليه أي سياسة كتابة في RLS بقصد: فلا عميل يرقّي نفسه ولا
// حتى حساب تنفيذي يكتب فيه مباشرة عبر الـAPI. الكتابة الوحيدة الممكنة هي
// دالّة public.staff_set وهي SECURITY DEFINER تفحص دور المنادي بنفسها قبل
// أي تعديل، ومعها محفّز يمنع إيقاف آخر تنفيذي نشط.
//
// فالفحص هنا طبقة أولى للواجهة، والقاعدة هي الحاكم الفعلي.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/auth";
import { ROLES, Role, can } from "@/lib/ops/roles";
import type { GateDef, IngApprovalDef } from "@/lib/ops/engine";
import type { ActionResult } from "@/lib/ops/types";

export interface TeamMember {
  user_id: string;
  email: string;
  role: Role;
  name: string;
  active: boolean;
  created_at: string;
}

const ROLE_VALUES: Role[] = ["executive", "kitchen", "quality"];

/** يقرأ الفريق مع الإيميلات. يرجّع [] لغير التنفيذي بدل ما يطيح. */
export async function listTeam(): Promise<TeamMember[]> {
  const session = await getStaffSession();
  if (!session || !can(session.role, "team.manage")) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_list");
  if (error || !data) return [];
  return data as TeamMember[];
}

/**
 * تعريفات بوابات الاعتماد — تُعرض في نفس شاشة الصلاحيات لأنها نفس الموضوع:
 * مين يملك إيش. الكتابة عليها في src/app/admin/ops/actions.ts.
 */
export async function listApprovalDefs(): Promise<{ gates: GateDef[]; approvals: IngApprovalDef[] }> {
  const session = await getStaffSession();
  if (!session) return { gates: [], approvals: [] };
  const supabase = await createClient();
  const [g, a] = await Promise.all([
    supabase.from("ops_gate_defs").select("*").order("gate_index"),
    supabase.from("ops_ing_approval_defs").select("*").order("approval_index"),
  ]);
  type Row = Record<string, unknown>;
  return {
    gates: ((g.data ?? []) as Row[]).map((r) => ({
      index: Number(r.gate_index),
      label: String(r.label ?? ""),
      kind: String(r.kind ?? "standard") as GateDef["kind"],
      ownerRole: r.owner_role == null ? null : String(r.owner_role),
      resetsOnRecipeChange: Boolean(r.resets_on_recipe_change),
      active: Boolean(r.active),
      note: String(r.note ?? ""),
    })),
    approvals: ((a.data ?? []) as Row[]).map((r) => ({
      index: Number(r.approval_index),
      label: String(r.label ?? ""),
      kind: String(r.kind ?? "standard") as IngApprovalDef["kind"],
      ownerRole: r.owner_role == null ? null : String(r.owner_role),
      active: Boolean(r.active),
      note: String(r.note ?? ""),
    })),
  };
}

/** يضيف موظفاً أو يعدّل دوره أو يوقفه، بالإيميل. */
export async function setStaff(input: {
  email: string;
  role: string;
  name: string;
  active: boolean;
}): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session || !can(session.role, "team.manage")) {
    return { ok: false, error: "إدارة الفريق من صلاحية الإدارة التنفيذية فقط" };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "الإيميل مطلوب" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "صيغة الإيميل غير صحيحة" };
  }
  if (!ROLE_VALUES.includes(input.role as Role)) {
    return { ok: false, error: "الدور غير معروف" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_set", {
    p_email: email,
    p_role: input.role,
    p_name: input.name.trim(),
    p_active: input.active,
  });

  // رسائل القاعدة هنا مكتوبة بالعربي للمستخدم أصلاً (ما فيه حساب بهذا
  // الإيميل، آخر تنفيذي نشط) فنعرضها كما هي بدل ما نخفيها.
  if (error) return { ok: false, error: error.message };

  await supabase.from("ops_audit").insert({
    user_id: session.userId,
    role: ROLES[session.role].label,
    by: session.name || session.email,
    area: "الفريق والصلاحيات",
    text: `${email} → ${ROLES[input.role as Role].label}${input.active ? "" : " (موقوف)"}`,
  });

  revalidatePath("/admin/team");
  revalidatePath("/admin");
  return { ok: true };
}
