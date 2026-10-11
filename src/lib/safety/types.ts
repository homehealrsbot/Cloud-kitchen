// أنواع وحدة سلامة الغذاء — مشتركة بين الخادم والعميل.
//
// منفصلة عن محرك العمليات بقصد: هذي خطة ومراقبة، وذاك حساب تغذية وتكلفة.
// الرابط الوحيد بينهما هو الدور، وهو في src/lib/ops/roles.ts.

export type HazardType = "biological" | "chemical" | "physical" | "allergen";
export type LimitKind = "numeric" | "boolean";
export type IsoStatus = "not_started" | "in_progress" | "implemented" | "verified" | "not_applicable";
export type NcrSeverity = "minor" | "major" | "critical";
export type NcrStatus = "open" | "investigating" | "action_taken" | "closed";

export const HAZARD_LABEL: Record<HazardType, string> = {
  biological: "بيولوجي",
  chemical: "كيميائي",
  physical: "فيزيائي",
  allergen: "مسبب حساسية",
};

export const ISO_STATUS_LABEL: Record<IsoStatus, string> = {
  not_started: "ما بدأ",
  in_progress: "قيد التنفيذ",
  implemented: "مطبَّق",
  verified: "مطبَّق ومتحقَّق منه",
  not_applicable: "لا ينطبق",
};

export const NCR_SEVERITY_LABEL: Record<NcrSeverity, string> = {
  minor: "بسيطة",
  major: "كبيرة",
  critical: "حرجة",
};

export const NCR_STATUS_LABEL: Record<NcrStatus, string> = {
  open: "مفتوحة",
  investigating: "قيد التحقيق",
  action_taken: "اتُّخذ إجراء",
  closed: "مغلقة",
};

export interface HaccpStep {
  index: number;
  label: string;
  stage: string;
  hazard: string;
  hazardType: HazardType;
  controlMeasure: string;
  isCcp: boolean;
  ccpCode: string;
  active: boolean;
  note: string;
}

export interface CriticalLimit {
  id: number;
  stepIndex: number;
  parameter: string;
  kind: LimitKind;
  min: number | null;
  max: number | null;
  unit: string;
  method: string;
  frequency: string;
  correctiveAction: string;
  active: boolean;
  sortOrder: number;
}

export interface CcpEntry {
  id: number;
  limitId: number;
  date: string;
  shift: string;
  readingValue: number | null;
  readingBool: boolean | null;
  passed: boolean;
  outOfLimitNote: string;
  correctiveAction: string;
  recordedBy: string | null;
  recordedByName: string;
  recordedAt: string;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
}

export interface PrpProgram {
  code: string;
  label: string;
  category: string;
  ownerRole: string | null;
  frequency: string;
  description: string;
  active: boolean;
  sortOrder: number;
}

export interface PrpEntry {
  id: number;
  code: string;
  date: string;
  done: boolean;
  note: string;
  recordedByName: string;
}

export interface IsoClause {
  clause: string;
  title: string;
  requirement: string;
  status: IsoStatus;
  evidence: string;
  ownerRole: string | null;
  sortOrder: number;
}

export interface Nonconformance {
  id: number;
  raisedAt: string;
  raisedByName: string;
  source: string;
  ccpLogId: number | null;
  severity: NcrSeverity;
  description: string;
  immediateAction: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  status: NcrStatus;
  dueDate: string | null;
  closedByName: string | null;
  closedAt: string | null;
}

/** صورة وحدة السلامة كما قرأها الخادم. */
export interface SafetySnapshot {
  steps: HaccpStep[];
  limits: CriticalLimit[];
  log: CcpEntry[];
  prpPrograms: PrpProgram[];
  prpLog: PrpEntry[];
  isoClauses: IsoClause[];
  ncr: Nonconformance[];
}

/** نص الحد المسموح كما يُعرض للمستخدم — مصدر واحد، فما تختلف شاشة عن شاشة. */
export function limitText(l: CriticalLimit): string {
  if (l.kind === "boolean") return "نعم / لا";
  const u = l.unit ? ` ${l.unit}` : "";
  if (l.min !== null && l.max !== null) return `${l.min} إلى ${l.max}${u}`;
  if (l.min !== null) return `${l.min}${u} فأكثر`;
  if (l.max !== null) return `${l.max}${u} فأقل`;
  return "غير محدد";
}

/**
 * الحكم على قراءة — نفس منطق محفّز judge_ccp_reading في القاعدة.
 * تُستخدم للعرض الفوري قبل الحفظ فقط؛ الحقيقة ما تُكتب إلا بحكم القاعدة.
 */
export function judgeReading(l: CriticalLimit, value: number | null, bool: boolean | null): boolean | null {
  if (l.kind === "boolean") return bool;
  if (value === null || Number.isNaN(value)) return null;
  return (l.min === null || value >= l.min) && (l.max === null || value <= l.max);
}
