// طلبات التغيير — الأنواع المشتركة بين الخادم والعميل.
//
// المسار: تعديل في الصفحة ← مسوّدة محلية ← إرسال ← طلب بحالة ← اعتماد ← تطبيق.
// هذا الملف نقي بلا React ولا Supabase عشان يُستورد من الجهتين.

export type ChangeStatus = "pending" | "applied" | "rejected" | "failed";
export type ChangeStrategy = "upsert" | "insert" | "replace_lines";

export const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  pending: "بانتظار الاعتماد",
  applied: "طُبِّق",
  rejected: "مرفوض",
  failed: "فشل التطبيق",
};

/** تعريف نوع التغيير كما هو في ops_change_kinds — قائمة بيضاء من القاعدة. */
export interface ChangeKind {
  kind: string;
  label: string;
  area: string;
  targetTable: string;
  strategy: ChangeStrategy;
  keyColumns: string[];
  patchColumns: string[];
  requesterRoles: string[];
  approverRole: string;
  active: boolean;
  note: string;
}

/** تعديل مجمّع في الصفحة، ما انكتب في القاعدة بعد. */
export interface StagedChange {
  /** مفتاح محلي: تعديل ثانٍ على نفس الصف يستبدل الأول بدل ما يتكدّس */
  localId: string;
  kind: string;
  targetKey: Record<string, unknown>;
  patch: Record<string, unknown>;
  before: Record<string, unknown> | null;
  /** جملة عربية يقرأها المعتمِد — تُبنى وقت التجميع لأن الصفحة تعرف السياق */
  summary: string;
}

/** صف طلب كما يرجع من القاعدة. */
export interface ChangeRequest {
  id: number;
  batchId: string;
  kind: string;
  kindLabel: string;
  area: string;
  targetKey: Record<string, unknown>;
  patch: Record<string, unknown>;
  before: Record<string, unknown> | null;
  summary: string;
  status: ChangeStatus;
  requestedByName: string;
  requestedByRole: string;
  /**
   * التاريخ مُنسَّقاً نصاً من الخادم.
   *
   * ما ننسّقه في المتصفح: toLocaleString("ar-SA") يستخدم التقويم الهجري
   * والمنطقة الزمنية، وهما يختلفان بين ICU الخادم والمتصفح — فيطلع نص على
   * الخادم وغيره على العميل، وReact يرمي خطأ ترطيب ويعيد بناء الشجرة.
   */
  requestedAtText: string;
  decidedByName: string | null;
  decidedAtText: string | null;
  decisionNote: string;
  error: string;
  /** هل المستخدم الحالي هو صاحب سلطة الاعتماد على هذا النوع؟ */
  canDecide: boolean;
  /** هل المستخدم الحالي هو صاحب الطلب؟ (مقارنة بالمعرّف لا بالاسم) */
  mine: boolean;
}

/**
 * مفتاح محلي ثابت للصف المستهدف.
 *
 * الترتيب مُرتَّب بالاسم عمداً: لو بنت شاشتان نفس المفتاح بترتيب مختلف،
 * بدونه تطلع مسوّدتان لنفس الصف وتتعارضان عند الإرسال.
 */
export function localKeyOf(kind: string, targetKey: Record<string, unknown>): string {
  const parts = Object.keys(targetKey)
    .sort()
    .map((k) => `${k}=${String(targetKey[k])}`);
  return `${kind}|${parts.join("&")}`;
}

/** الحقول اللي تغيّرت فعلاً — ما نرسل تعديلاً يساوي القيمة الحالية. */
export function changedFields<T extends Record<string, unknown>>(next: T, before: Partial<T> | null): Partial<T> {
  if (!before) return next;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) {
    const b = before[k as keyof T];
    // JSON للمقارنة: القيم هنا بدائية أو كائنات صغيرة (jsonb الإعدادات)
    if (JSON.stringify(v ?? null) !== JSON.stringify(b ?? null)) out[k] = v;
  }
  return out as Partial<T>;
}
