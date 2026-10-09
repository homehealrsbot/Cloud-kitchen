// قرار الإطلاق التجاري (GO / NO-GO) ومحاور الجاهزية.
//
// المصدر: ورقة «لوحة_التحكم» في ملف العمليات — قرار واحد فوق، وتحته جدول
// المحاور بأعمدته: المحور · الجاهزية · الحالة · المؤشر الحرج · القيمة ·
// أهم عائق. الورقة كانت تحسبها بصيغ، وهنا تُحسب من نفس الجداول اللي تشتغل
// عليها الأقسام، فما فيه رقم يُكتب باليد ولا يتقادم.
//
// قاعدتان حكمتا التصميم:
//
// ١. المحاور مُدخلات لا ثوابت. تعريفها صفوف في ops_launch_axes، فالتنفيذي
//    يقدر يوقف محوراً أو يعيد ترتيبه أو يسمّيه بلغة مجلسه. المكتوب في الكود
//    هو «كيف يُحسب كل نوع»، لا «كم عددها ولا ما أسماؤها».
//
// ٢. ما فيه حكم بلا حد معلن. شرط GO في الورقة: «أصناف READY ≥ الحد الأدنى».
//    الحد الأدنى رقم تجاري يدخله التنفيذي. وإذا ما انكتب، القرار NO-GO
//    وسببه أن الحد نفسه ما انحدد — أصدق من اختراع رقم أو من إعلان GO بلا
//    سقف. نفس المنطق في بوابة المطبخ: required = null يعني ما تُعدّى.

import {
  activeGates,
  activeIngApprovals,
  deriveKitchenPilot,
  deriveSkuQuality,
  type ComputedSku,
  type GateStatus,
  type KitchenGateRecord,
  type OpsData,
  type PilotTrial,
} from "./engine";
import type { SafetySnapshot } from "@/lib/safety/types";

export type AxisKind = "kitchen_gate" | "sku_gates" | "ingredients" | "food_safety" | "production";

export const AXIS_KINDS: AxisKind[] = [
  "kitchen_gate",
  "sku_gates",
  "ingredients",
  "food_safety",
  "production",
];

/** وصف نوع المحور — للشاشة اللي يضبط فيها التنفيذي المحاور. */
export const AXIS_KIND_DESC: Record<AxisKind, string> = {
  kitchen_gate: "الأصناف اللي عدّت تجارب الطبخ وقرار الشيف",
  sku_gates: "الأصناف المعتمدة من كل بوابات الجودة النشطة",
  ingredients: "المكوّنات المعتمدة من كل اعتمادات الجودة النشطة",
  food_safety: "ضوابط HACCP والمراقبة وعدم المطابقة",
  production: "خطة الإنتاج والهوامش",
};

export interface LaunchAxisDef {
  index: number;
  label: string;
  kind: AxisKind;
  active: boolean;
  note: string;
}

export interface AxisReading {
  def: LaunchAxisDef;
  /** المؤشر الحرج — إيش اللي يُقاس بالضبط */
  critical: string;
  done: number;
  total: number;
  /** وحدة القيمة: «صنف» أو «مكوّن» أو «فحص» */
  unit: string;
  ready: boolean;
  /** أهم عائق — جملة واحدة تقول وش يوقف المحور */
  blocker: string;
  /** الشاشة اللي يُعالج فيها العائق */
  href: string;
}

export interface LaunchDecision {
  go: boolean;
  axes: AxisReading[];
  readyItems: number;
  totalItems: number;
  /** الحد الأدنى المعلن للإطلاق — null يعني ما انكتب */
  required: number | null;
  /** أسباب NO-GO مرتبة */
  blockers: string[];
}

export interface LaunchInput {
  data: OpsData;
  computed: ComputedSku[];
  gates: Record<string, GateStatus[]>;
  ingApprovals: Record<string, GateStatus[]>;
  pilotTrials: Record<string, PilotTrial[]>;
  kitchenGate: Record<string, KitchenGateRecord>;
  production: Record<string, Record<string, number>>;
  safety: SafetySnapshot;
  axes: LaunchAxisDef[];
}

/** أكثر عائق تكراراً — نعرض الواحد اللي يفتح أكبر عدد أصناف لو انحل. */
function topBlocker(reasons: string[]): { text: string; count: number } | null {
  if (reasons.length === 0) return null;
  const tally = new Map<string, number>();
  for (const r of reasons) tally.set(r, (tally.get(r) ?? 0) + 1);
  let best = "";
  let count = 0;
  for (const [k, v] of tally) if (v > count) { best = k; count = v; }
  return { text: best, count };
}

// ---------------- محور ١: بوابة المطبخ ----------------

function axisKitchenGate(inp: LaunchInput): Omit<AxisReading, "def"> {
  const gate = inp.data.gateDefs.find((d) => d.kind === "kitchen_pilot" && d.active);
  if (!gate) {
    return {
      critical: "أصناف عدّت بوابة المطبخ",
      done: 0, total: 0, unit: "صنف", ready: true,
      blocker: "بوابة المطبخ موقوفة — ما تدخل في القرار",
      href: "/admin/ops",
    };
  }
  const withRecipe = inp.computed.filter((c) => c.lines.length > 0);
  const reasons: string[] = [];
  let done = 0;
  for (const c of withRecipe) {
    if ((inp.gates[c.item.id] ?? [])[gate.index] === "READY") { done++; continue; }
    const view = deriveKitchenPilot(
      c,
      inp.pilotTrials[c.item.id] ?? [],
      inp.kitchenGate[c.item.id] ?? null,
      inp.data.settings,
    );
    reasons.push(view.blocker || "بانتظار قرار الشيف");
  }
  const top = topBlocker(reasons);
  return {
    critical: "أصناف عدّت بوابة المطبخ",
    done,
    total: withRecipe.length,
    unit: "صنف",
    ready: withRecipe.length > 0 && done === withRecipe.length,
    blocker: top ? `${top.text} — ${top.count} صنف` : withRecipe.length === 0 ? "ما فيه وصفات مكتملة" : "",
    href: "/admin/ops/pilot",
  };
}

// ---------------- محور ٢: بوابات الاعتماد ----------------

function axisSkuGates(inp: LaunchInput): Omit<AxisReading, "def"> {
  const active = activeGates(inp.data.gateDefs);
  let done = 0;
  const reasons: string[] = [];
  for (const c of inp.computed) {
    const q = deriveSkuQuality(
      inp.gates[c.item.id] ?? [],
      c.item.shelfLifeH,
      inp.data.settings,
      inp.data.gateDefs,
    );
    if (q.status === "READY") { done++; continue; }
    // العائق هو أول بوابة نشطة غير معتمدة — هي اللي تمنع النشر
    const stuck = active.find((d) => (inp.gates[c.item.id] ?? [])[d.index] !== "READY");
    reasons.push(stuck ? stuck.label : q.blocker || "بانتظار الاعتماد");
  }
  const top = topBlocker(reasons);
  return {
    critical: "أصناف جاهزة للبيع",
    done,
    total: inp.computed.length,
    unit: "صنف",
    ready: inp.computed.length > 0 && done === inp.computed.length,
    blocker: top ? `بوابة «${top.text}» — ${top.count} صنف` : inp.computed.length === 0 ? "ما فيه أصناف" : "",
    href: "/admin/ops/quality",
  };
}

// ---------------- محور ٣: المكوّنات والموردون ----------------

function axisIngredients(inp: LaunchInput): Omit<AxisReading, "def"> {
  const defs = activeIngApprovals(inp.data.ingApprovalDefs);
  // ما نحاسب إلا المكوّنات المستخدمة فعلاً في وصفة — غيرها ما يمنع إطلاقاً
  const used = new Set(inp.data.recipes.map((r) => r.ing));
  const list = inp.data.ingredients.filter((i) => used.has(i.key));
  let done = 0;
  const reasons: string[] = [];
  for (const ing of list) {
    const st = inp.ingApprovals[ing.key] ?? [];
    const stuck = defs.find((d) => st[d.index] !== "READY");
    if (!stuck) { done++; continue; }
    reasons.push(stuck.label);
  }
  const top = topBlocker(reasons);
  return {
    critical: "مكوّنات معتمدة بالكامل",
    done,
    total: list.length,
    unit: "مكوّن",
    ready: list.length > 0 && done === list.length,
    blocker: top ? `اعتماد «${top.text}» — ${top.count} مكوّن` : list.length === 0 ? "ما فيه مكوّنات في الوصفات" : "",
    href: "/admin/ops/ingredients",
  };
}

// ---------------- محور ٤: سلامة الغذاء ----------------

interface Check { label: string; ok: boolean; detail: string }

/** فحوص المحور — مُصرَّح بها عشان تظهر مفصّلة في الشاشة، لا كرقم مبهم. */
export function foodSafetyChecks(s: SafetySnapshot): Check[] {
  const steps = s.steps.filter((x) => x.active);
  const ccpSteps = steps.filter((x) => x.isCcp);
  const limits = s.limits.filter((l) => l.active);
  const prps = s.prpPrograms.filter((p) => p.active);

  const ccpWithoutLimit = ccpSteps.filter((st) => !limits.some((l) => l.stepIndex === st.index));
  const limitsNeverLogged = limits.filter((l) => !s.log.some((e) => e.limitId === l.id));
  const failsUnverified = s.log.filter((e) => !e.passed && !e.verifiedAt);
  const prpNeverLogged = prps.filter((p) => !s.prpLog.some((e) => e.code === p.code));
  const openNcr = s.ncr.filter((n) => n.status !== "closed");

  return [
    {
      label: "خطة HACCP موضوعة",
      ok: steps.length > 0 && ccpSteps.length > 0,
      detail: steps.length === 0 ? "ما فيه خطوات في الخطة" : `${ccpSteps.length} نقطة تحكّم حرجة من ${steps.length} خطوة`,
    },
    {
      label: "لكل نقطة تحكّم حدّ حرج",
      ok: ccpWithoutLimit.length === 0,
      detail: ccpWithoutLimit.length === 0 ? `${limits.length} حد معرّف` : `${ccpWithoutLimit.length} نقطة بلا حد`,
    },
    {
      label: "المراقبة بدأت على كل حد",
      ok: limits.length > 0 && limitsNeverLogged.length === 0,
      detail: limits.length === 0 ? "ما فيه حدود" : limitsNeverLogged.length === 0 ? `${s.log.length} قراءة مسجّلة` : `${limitsNeverLogged.length} حد ما انقرأ ولا مرة`,
    },
    {
      label: "ما فيه خروج عن الحد بلا تحقّق",
      ok: failsUnverified.length === 0,
      detail: failsUnverified.length === 0 ? "كل الخروجات متحقَّق منها" : `${failsUnverified.length} قراءة خارج الحد بانتظار توقيع الجودة`,
    },
    {
      label: "البرامج التمهيدية مُفعّلة",
      ok: prps.length > 0 && prpNeverLogged.length === 0,
      detail: prps.length === 0 ? "ما فيه برامج" : prpNeverLogged.length === 0 ? `${prps.length} برنامج يُسجَّل` : `${prpNeverLogged.length} برنامج ما انسجّل ولا مرة`,
    },
    {
      label: "ما فيه عدم مطابقة مفتوحة",
      ok: openNcr.length === 0,
      detail: openNcr.length === 0 ? "كل البلاغات مغلقة" : `${openNcr.length} بلاغ مفتوح`,
    },
  ];
}

function axisFoodSafety(inp: LaunchInput): Omit<AxisReading, "def"> {
  const checks = foodSafetyChecks(inp.safety);
  const failed = checks.filter((c) => !c.ok);
  return {
    critical: "ضوابط السلامة المكتملة",
    done: checks.length - failed.length,
    total: checks.length,
    unit: "فحص",
    ready: failed.length === 0,
    blocker: failed.length ? `${failed[0].label}: ${failed[0].detail}` : "",
    href: "/admin/safety",
  };
}

// ---------------- محور ٥: الإنتاج والهوامش ----------------

/** فحوص المحور — مُصرَّح بها لنفس سبب فحوص السلامة. */
export function productionChecks(inp: LaunchInput): Check[] {
  const days = inp.data.rotation.days;
  const planned = days.filter((_, i) => Object.keys(inp.production[String(i)] ?? {}).length > 0);
  const under = inp.computed.filter((c) => c.marginAlert);
  const rotationSkus = new Set(days.flatMap((d) => d.slots).filter(Boolean));
  const notReady = [...rotationSkus].filter((sku) => {
    const c = inp.computed.find((x) => x.item.id === sku);
    if (!c) return true;
    return deriveSkuQuality(inp.gates[sku] ?? [], c.item.shelfLifeH, inp.data.settings, inp.data.gateDefs).status !== "READY";
  });
  const warnPct = Math.round((inp.data.settings?.marginWarnPct ?? 0) * 100);

  return [
    {
      label: "جدول الدوران مبني",
      ok: rotationSkus.size > 0,
      detail: rotationSkus.size ? `${rotationSkus.size} صنف على ${days.length} يوم` : "ما فيه أصناف في الدوران",
    },
    {
      label: "خطة إنتاج مسجّلة",
      ok: planned.length > 0,
      detail: planned.length ? `${planned.length} يوم من ${days.length}` : "ما سُجّلت حصص لأي يوم",
    },
    {
      label: "كل أصناف الدوران جاهزة للبيع",
      ok: rotationSkus.size > 0 && notReady.length === 0,
      detail: notReady.length === 0 ? "كلها معتمدة" : `${notReady.length} صنف في الدوران غير معتمد`,
    },
    {
      label: `ما فيه صنف تحت حد الهامش (${warnPct}%)`,
      ok: under.length === 0,
      detail: under.length === 0 ? "كل الأصناف فوق الحد" : `${under.length} صنف تحت الحد`,
    },
  ];
}

function axisProduction(inp: LaunchInput): Omit<AxisReading, "def"> {
  const checks = productionChecks(inp);
  const failed = checks.filter((c) => !c.ok);
  return {
    critical: "جاهزية الإنتاج والهامش",
    done: checks.length - failed.length,
    total: checks.length,
    unit: "فحص",
    ready: failed.length === 0,
    blocker: failed.length ? `${failed[0].label}: ${failed[0].detail}` : "",
    href: "/admin/ops/production",
  };
}

const BY_KIND: Record<AxisKind, (inp: LaunchInput) => Omit<AxisReading, "def">> = {
  kitchen_gate: axisKitchenGate,
  sku_gates: axisSkuGates,
  ingredients: axisIngredients,
  food_safety: axisFoodSafety,
  production: axisProduction,
};

/**
 * القرار الكامل. GO يحتاج ثلاثة شروط مجتمعة:
 *   ١. كل محور نشط مكتمل،
 *   ٢. حد الإطلاق الأدنى مكتوب في الإعدادات،
 *   ٣. عدد الأصناف الجاهزة للبيع ≥ ذلك الحد.
 */
export function deriveLaunch(inp: LaunchInput): LaunchDecision {
  const axes: AxisReading[] = inp.axes
    .filter((a) => a.active)
    .sort((a, b) => a.index - b.index)
    .map((def) => ({ def, ...BY_KIND[def.kind](inp) }));

  const readyItems = inp.computed.filter(
    (c) =>
      deriveSkuQuality(inp.gates[c.item.id] ?? [], c.item.shelfLifeH, inp.data.settings, inp.data.gateDefs)
        .status === "READY",
  ).length;

  const req = inp.data.settings?.readyItemsRequired;
  const required = typeof req === "number" && Number.isFinite(req) && req > 0 ? req : null;

  const blockers: string[] = [];
  if (axes.length === 0) blockers.push("ما فيه محاور جاهزية مُفعّلة — القرار بلا أساس");
  if (required === null) blockers.push("حد الإطلاق الأدنى ما انكتب في الإعدادات");
  else if (readyItems < required) blockers.push(`أصناف جاهزة للبيع ${readyItems} من ${required} مطلوبة`);
  for (const a of axes) if (!a.ready && a.blocker) blockers.push(`${a.def.label}: ${a.blocker}`);

  return {
    go: blockers.length === 0,
    axes,
    readyItems,
    totalItems: inp.computed.length,
    required,
    blockers,
  };
}
