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
  | "gateDefs.manage"
  | "launch.view"
  | "launchAxes.manage"
  | "pilot.edit"
  | "kitchenGate.edit"
  | "safety.view"
  | "safety.plan"
  | "safety.log"
  | "safety.verify"
  | "ncr.raise"
  | "ncr.manage"
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
  "gateDefs.manage": ["executive"],
  // لوحة الجاهزية يشوفها كل دور: هي اللي تقول لقسمه وش يوقف الإطلاق. أما
  // تعريف المحاور نفسها فللتنفيذي — القسم ما يشيل المحور اللي يقيسه.
  "launch.view": ALL,
  "launchAxes.manage": ["executive"],
  "pilot.edit": ["quality"],
  "kitchenGate.edit": ["kitchen"],
  // سلامة الغذاء: الجودة تضع الخطة والحدود، والمطبخ يسجّل المراقبة، والجودة
  // تعتمد بتوقيع ثانٍ. وأي موظف يرفع عدم مطابقة — منع التبليغ أسوأ من بلاغ زائد.
  "safety.view": ALL,
  "safety.plan": ["quality"],
  "safety.log": ["kitchen", "quality"],
  "safety.verify": ["quality"],
  "ncr.raise": ALL,
  "ncr.manage": ["quality", "executive"],
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

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ALL as string[]).includes(v);
}

/**
 * مين يختم بوابة اعتماد؟ الدور المكتوب في owner_role في تعريفها بقاعدة
 * البيانات — لا رقم بوابة مكتوب في الكود.
 *
 * كان الشرط «البوابة ٧ للتنفيذي وما عداها للجودة»، مكرراً في ثلاث أماكن:
 * السياسة، والـAction، والشاشة. أي بوابة جديدة كانت تحتاج تعديل الثلاثة.
 * الآن الشرط واحد ومصدره صف التعريف، ونفس التعبير حرفياً في سياسة RLS على
 * ops_gates و ops_ing_approvals، فما تعرض الواجهة زراً ترفضه القاعدة.
 *
 * ownerRole = null يعني بوابة محسوبة (تجارب Pilot + قرار الشيف): ما يختمها
 * أحد يدوياً، يكتبها محفّز في القاعدة.
 *
 * ومين يملك تغيير التعريفات نفسها (يضيف بوابة، يوقفها، ينقل ملكيتها)؟
 * الإدارة التنفيذية وحدها — صلاحية "gateDefs.manage".
 */
export function sealsGate(role: Role | null | undefined, ownerRole: string | null | undefined): boolean {
  return !!role && !!ownerRole && role === ownerRole;
}

// جدول الصلاحيات المعروض للمستخدم (مين يسوي إيش) — الميزات الثابتة فقط.
//
// صفوف البوابات والاعتمادات ما هي مكتوبة هنا: تُبنى من التعريفات في القاعدة
// عبر approvalPermissionRows أدناه. قبل كان السطر «بوابات الجودة (7 بوابات)»
// — رقم في نص، يكذب أول ما تضيف الأقسام بوابة.
export const PERMISSION_ROWS: { label: string; view: Cap; edit?: Cap }[] = [
  { label: "خطة الإنتاج (عدد الحصص)", view: "production.view", edit: "production.edit" },
  { label: "قائمة المشتريات (كميات)", view: "shopping.view" },
  { label: "بطاقة المطبخ", view: "card.view" },
  { label: "جدول الدوران 14 يوم", view: "rotation.view", edit: "rotation.edit" },
  { label: "الوصفات (الجرامات)", view: "recipes.view", edit: "recipes.edit" },
  { label: "المكوّنات: القيم الغذائية والحساسية", view: "ingredients.view", edit: "ingredients.editSpecs" },
  { label: "المكوّنات: الأسعار", view: "finance.view", edit: "ingredients.editPrice" },
  { label: "تسجيل تجارب Pilot", view: "quality.view", edit: "pilot.edit" },
  { label: "قرار الشيف على بوابة المطبخ", view: "quality.view", edit: "kitchenGate.edit" },
  { label: "الأسعار والتكاليف والهوامش", view: "finance.view" },
  { label: "إعدادات الحصص والتكلفة", view: "settings.edit", edit: "settings.edit" },
  { label: "هندسة المنيو (المبيعات)", view: "engineering.view", edit: "engineering.view" },
  { label: "سجل التعديلات", view: "audit.view" },
  { label: "الفريق والصلاحيات", view: "team.manage", edit: "team.manage" },
  { label: "تعريف بوابات الاعتماد (إضافة/إيقاف/نقل ملكية)", view: "quality.view", edit: "gateDefs.manage" },
  { label: "خطة HACCP والحدود الحرجة", view: "safety.view", edit: "safety.plan" },
  { label: "سجل مراقبة النقاط الحرجة اليومي", view: "safety.view", edit: "safety.log" },
  { label: "اعتماد سجل المراقبة (توقيع ثانٍ)", view: "safety.view", edit: "safety.verify" },
  { label: "رفع عدم مطابقة", view: "safety.view", edit: "ncr.raise" },
  { label: "معالجة عدم المطابقة وإغلاقها", view: "safety.view", edit: "ncr.manage" },
  { label: "لوحة قرار الإطلاق (GO / NO-GO)", view: "launch.view" },
  { label: "تعريف محاور الجاهزية", view: "launch.view", edit: "launchAxes.manage" },
];

/** صف صلاحية لبوابة اعتماد واحدة، مبني من تعريفها لا من الكود. */
export interface ApprovalPermissionRow {
  label: string;
  owner: Role | null;
  computed: boolean; // بوابة محسوبة: ما يختمها أحد يدوياً
  active: boolean;
}

/**
 * يحوّل تعريفات البوابات والاعتمادات إلى صفوف صلاحيات للعرض. النوع هنا بنيوي
 * بقصد (label / ownerRole / active) عشان ملف الأدوار يبقى بلا استيراد من
 * المحرك — طبقة الصلاحيات ما تعرف شي عن المعادلات.
 */
export function approvalPermissionRows(
  defs: readonly { label: string; ownerRole: string | null; active: boolean }[],
): ApprovalPermissionRow[] {
  return defs.map((d) => ({
    label: d.label,
    owner: isRole(d.ownerRole) ? d.ownerRole : null,
    computed: d.ownerRole === null,
    active: d.active,
  }));
}

// أي مسار يحتاج أي صلاحية — الأطول أولاً
export const ROUTE_CAPS: { prefix: string; cap: Cap }[] = [
  { prefix: "/admin/ops/settings", cap: "settings.edit" },
  { prefix: "/admin/ops/engineering", cap: "engineering.view" },
  { prefix: "/admin/ops/production", cap: "production.view" },
  { prefix: "/admin/ops/kitchen-card", cap: "card.view" },
  { prefix: "/admin/ops/rotation", cap: "rotation.view" },
  { prefix: "/admin/ops/recipes", cap: "recipes.view" },
  { prefix: "/admin/ops/ingredients", cap: "ingredients.view" },
  { prefix: "/admin/ops/kitchen-gate", cap: "quality.view" },
  { prefix: "/admin/ops/quality", cap: "quality.view" },
  { prefix: "/admin/ops/pilot", cap: "quality.view" },
  { prefix: "/admin/ops", cap: "ops.view" },
  { prefix: "/admin/team", cap: "team.manage" },
  { prefix: "/admin/safety", cap: "safety.view" },
  { prefix: "/admin/executive", cap: "legacy.executive" },
  { prefix: "/admin/kitchen", cap: "legacy.kitchen" },
  { prefix: "/admin/expiry", cap: "legacy.safetyLogs" },
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
