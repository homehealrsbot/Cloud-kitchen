// الأدوار والصلاحيات — مصدر واحد يحدد مين يشوف إيش ومين يعدّل إيش.
//
// هذا الملف نقي بقصد: بلا "use client" وبلا React. الدور يُفحص في ثلاث طبقات
// — Server Actions، ومكوّنات العميل، وسياسات RLS — فلازم can و MATRIX
// يشتغلون على الجهتين. سياق React للجلسة في src/lib/ops/session.tsx.
//
// الدور يجي من الخادم: جلسة Supabase مُوقَّعة + صف المستخدم في جدول staff.
// الفحوصات هنا (can / capForPath) للواجهة فقط — تخفي اللي ما يخص الدور وتمنع
// الأزرار. الحماية الفعلية في قاعدة البيانات: سياسات RLS في supabase/schema.sql
// تمنع أي كتابة خارج صلاحية الدور، فتعديل الواجهة أو الكوكيز ما يفيد شي.

export type Role = "executive" | "kitchen" | "quality";

export const ROLES: Record<Role, { label: string; short: string; desc: string; home: string }> = {
  executive: {
    label: "الإدارة التنفيذية",
    short: "تنفيذي",
    desc: "الأسعار، التكاليف، الهوامش، الإعدادات، واعتماد بوابة السعر",
    home: "/admin/executive",
  },
  kitchen: {
    label: "المطبخ",
    short: "مطبخ",
    desc: "خطة الإنتاج، المشتريات، بطاقة المطبخ، الوصفات، وجدول الدوران",
    home: "/admin/kitchen",
  },
  quality: {
    label: "الجودة والمتابعة",
    short: "جودة",
    desc: "بوابات الاعتماد، الحساسية، الصلاحية، واعتماد الموردين",
    home: "/admin/ops/quality",
  },
};

export type Cap =
  | "ops.view"
  | "production.view"
  | "production.edit"
  | "shopping.view"
  | "card.view"
  | "rotation.view"
  | "rotation.edit"
  | "recipes.view"
  | "recipes.edit"
  | "ingredients.view"
  | "ingredients.editSpecs"
  | "ingredients.editPrice"
  | "quality.view"
  | "quality.editGates"
  | "quality.editPriceGate"
  | "quality.editShelfLife"
  | "ingApproval.edit"
  | "ingApproval.editPrice"
  | "finance.view"
  | "settings.edit"
  | "engineering.view"
  | "audit.view"
  | "team.manage"
  | "data.reset"
  | "legacy.executive"
  | "legacy.kitchen"
  | "legacy.safetyLogs";

const ALL: Role[] = ["executive", "kitchen", "quality"];

export const MATRIX: Record<Cap, Role[]> = {
  "ops.view": ALL,
  "production.view": ALL,
  "production.edit": ["kitchen"],
  "shopping.view": ["kitchen", "executive"],
  "card.view": ALL,
  "rotation.view": ALL,
  "rotation.edit": ["kitchen"],
  "recipes.view": ALL,
  "recipes.edit": ["kitchen"],
  "ingredients.view": ALL,
  "ingredients.editSpecs": ["quality"],
  "ingredients.editPrice": ["executive"],
  "quality.view": ALL,
  "quality.editGates": ["quality"],
  "quality.editPriceGate": ["executive"],
  "quality.editShelfLife": ["quality"],
  "ingApproval.edit": ["quality"],
  "ingApproval.editPrice": ["executive"],
  "finance.view": ["executive"],
  "settings.edit": ["executive"],
  "engineering.view": ["executive"],
  "audit.view": ["executive"],
  "team.manage": ["executive"],
  "data.reset": ["executive"],
  "legacy.executive": ["executive"],
  "legacy.kitchen": ["kitchen", "executive"],
  "legacy.safetyLogs": ["kitchen", "executive", "quality"],
};

export function can(role: Role | null | undefined, cap: Cap): boolean {
  return !!role && MATRIX[cap].includes(role);
}

// جدول الصلاحيات المعروض للمستخدم (مين يسوي إيش)
export const PERMISSION_ROWS: { label: string; view: Cap; edit?: Cap }[] = [
  { label: "خطة الإنتاج (عدد الحصص)", view: "production.view", edit: "production.edit" },
  { label: "قائمة المشتريات (كميات)", view: "shopping.view" },
  { label: "بطاقة المطبخ", view: "card.view" },
  { label: "جدول الدوران 14 يوم", view: "rotation.view", edit: "rotation.edit" },
  { label: "الوصفات (الجرامات)", view: "recipes.view", edit: "recipes.edit" },
  { label: "المكوّنات: القيم الغذائية والحساسية", view: "ingredients.view", edit: "ingredients.editSpecs" },
  { label: "المكوّنات: الأسعار", view: "finance.view", edit: "ingredients.editPrice" },
  { label: "بوابات الجودة (7 بوابات)", view: "quality.view", edit: "quality.editGates" },
  { label: "بوابة السعر والهامش", view: "quality.view", edit: "quality.editPriceGate" },
  { label: "اعتماد المورد وإقرار الحساسية", view: "ingredients.view", edit: "ingApproval.edit" },
  { label: "الأسعار والتكاليف والهوامش", view: "finance.view" },
  { label: "إعدادات الحصص والتكلفة", view: "settings.edit", edit: "settings.edit" },
  { label: "هندسة المنيو (المبيعات)", view: "engineering.view", edit: "engineering.view" },
  { label: "سجل التعديلات", view: "audit.view" },
  { label: "الفريق والصلاحيات", view: "team.manage", edit: "team.manage" },
];

// أي مسار يحتاج أي صلاحية — الأطول أولاً
export const ROUTE_CAPS: { prefix: string; cap: Cap }[] = [
  { prefix: "/admin/ops/settings", cap: "settings.edit" },
  { prefix: "/admin/ops/engineering", cap: "engineering.view" },
  { prefix: "/admin/ops/production", cap: "production.view" },
  { prefix: "/admin/ops/kitchen-card", cap: "card.view" },
  { prefix: "/admin/ops/rotation", cap: "rotation.view" },
  { prefix: "/admin/ops/recipes", cap: "recipes.view" },
  { prefix: "/admin/ops/ingredients", cap: "ingredients.view" },
  { prefix: "/admin/ops/quality", cap: "quality.view" },
  { prefix: "/admin/ops", cap: "ops.view" },
  { prefix: "/admin/team", cap: "team.manage" },
  { prefix: "/admin/executive", cap: "legacy.executive" },
  { prefix: "/admin/kitchen", cap: "legacy.kitchen" },
  { prefix: "/admin/process", cap: "legacy.safetyLogs" },
  { prefix: "/admin/expiry", cap: "legacy.safetyLogs" },
  { prefix: "/admin/temperature-log", cap: "legacy.safetyLogs" },
];

export function capForPath(pathname: string): Cap | null {
  const hit = ROUTE_CAPS.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return hit ? hit.cap : null;
}

export interface Session {
  userId: string;
  email: string;
  role: Role;
  name: string;
}
