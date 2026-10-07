// أنواع مشتركة بين الخادم والعميل لبيانات العمليات.

import type { GateStatus, OpsData } from "./engine";

export interface AuditEntry {
  id: string;
  ts: string;
  role: string;
  by: string;
  area: string;
  text: string;
}

/** صورة كاملة لحالة العمليات كما قرأها الخادم من قاعدة البيانات. */
export interface OpsSnapshot {
  data: OpsData;
  gates: Record<string, GateStatus[]>;
  gateNotes: Record<string, Record<number, string>>;
  ingApprovals: Record<string, GateStatus[]>;
  production: Record<string, Record<string, number>>;
  unitsSold: Record<string, number>;
  audit: AuditEntry[];
  recipesEdited: boolean;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
