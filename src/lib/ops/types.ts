// أنواع مشتركة بين الخادم والعميل لبيانات العمليات.

import type { GateStatus, KitchenGateRecord, MenuItem, OpsData, PilotTrial, YieldSpec, YieldCheck } from "./engine";

export interface AuditEntry {
  id: string;
  ts: string;
  role: string;
  by: string;
  area: string;
  text: string;
}

/** من ختم بوابة ومتى — يُعرض في شاشة الجودة وفي سجل الاعتمادات. */
export interface GateStamp {
  by: string;
  at: string;
}

/** صورة كاملة لحالة العمليات كما قرأها الخادم من قاعدة البيانات. */
export interface OpsSnapshot {
  data: OpsData;
  gates: Record<string, GateStatus[]>;
  gateNotes: Record<string, Record<number, string>>;
  gateStamps: Record<string, Record<number, GateStamp>>;
  ingApprovals: Record<string, GateStatus[]>;
  ingApprovalStamps: Record<string, Record<number, GateStamp>>;
  pilotTrials: Record<string, PilotTrial[]>;
  /** مرجع الـyield لكل صنف — غياب المفتاح يعني ما حدّده المالك بعد. */
  yieldSpecs: Record<string, YieldSpec>;
  /** قياسات المطبخ، الأحدث أولاً لكل صنف. */
  yieldChecks: Record<string, YieldCheck[]>;
  /** الأصناف المؤرشفة — خارج كل حساب، وتُعرض لتُرجَع. */
  archivedItems: MenuItem[];
  kitchenGate: Record<string, KitchenGateRecord>;
  production: Record<string, Record<string, number>>;
  unitsSold: Record<string, number>;
  audit: AuditEntry[];
  recipesEdited: boolean;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
