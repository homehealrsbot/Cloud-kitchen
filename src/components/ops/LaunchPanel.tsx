"use client";

// عرض لوحة قرار الإطلاق.
//
// مكوّن عميل بقصد: يستورد T وبقية عناصر الواجهة من components/ops/ui، وهي
// وحدة "use client". لو كان هذا الملف مكوّن خادم، الاستيراد من وحدة عميل
// يرجّع مرجعاً لا الكائن نفسه، فكل T.x تطلع undefined وReact يسقط الخاصية
// بصمت — ألوان تختفي بلا أي خطأ. (صار فعلاً: اختفت أشرطة التقدّم.)
//
// منفصل عن الصفحة عشان الصفحة تبقى قراءة وحساب فقط، ويبقى العرض قابلاً
// للمعاينة بمعزل عن قاعدة البيانات — نفس ما سوّينا في شاشة الصنف.

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Settings2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Card, CardTitle, Kpi, OpsShell, PENDING_COLOR, T } from "@/components/ops/ui";
import type { AxisKind, LaunchDecision } from "@/lib/ops/launch";

export interface AxisCheck { label: string; ok: boolean; detail: string }

export default function LaunchPanel({
  d,
  detail,
}: {
  d: LaunchDecision;
  detail: Partial<Record<AxisKind, AxisCheck[]>>;
}) {
  return (
    <OpsShell title="قرار الإطلاق" subtitle="GO / NO-GO ومحاور الجاهزية — محسوبة من جداول الأقسام">
      {/* القرار */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{
          background: d.go ? T.goodTint : T.warnTint,
          border: `1.5px solid ${d.go ? T.good : T.warn}`,
        }}
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            {d.go ? (
              <CheckCircle2 size={30} style={{ color: T.good }} />
            ) : (
              <XCircle size={30} style={{ color: T.warn }} />
            )}
            <div>
              <div className="text-2xl font-extrabold leading-none" style={{ color: d.go ? T.good : T.warn }}>
                {d.go ? "GO" : "NO-GO"}
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: T.inkSoft }}>قرار الإطلاق التجاري</div>
            </div>
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs font-bold mb-1.5">
              شروط GO: كل محور نشط مكتمل · وحدّ إطلاق معلن · وأصناف جاهزة للبيع ≥ الحد
            </div>
            {d.blockers.length === 0 ? (
              <div className="text-xs" style={{ color: T.good }}>كل الشروط مستوفاة.</div>
            ) : (
              <ol className="space-y-1 mt-2">
                {d.blockers.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed">
                    <CircleAlert size={13} className="mt-0.5 shrink-0" style={{ color: T.warn }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="أصناف جاهزة للبيع" value={`${d.readyItems} / ${d.totalItems}`} tone={d.readyItems > 0 ? "good" : undefined} />
        <Kpi
          label="حد الإطلاق الأدنى"
          value={d.required === null ? "ما انحدد" : String(d.required)}
          tone={d.required === null ? "warn" : undefined}
        />
        <Kpi label="محاور مكتملة" value={`${d.axes.filter((a) => a.ready).length} / ${d.axes.length}`} />
        <Kpi label="عوائق مفتوحة" value={String(d.blockers.length)} tone={d.blockers.length ? "hold" : "good"} />
      </div>

      {d.required === null && (
        <div className="rounded-xl px-4 py-3 mb-6 text-[12px] leading-relaxed flex items-start gap-2" style={{ background: T.accentTint, color: T.accentText }}>
          <Settings2 size={15} className="mt-0.5 shrink-0" />
          <span>
            حد الإطلاق الأدنى (كم صنف جاهز يكفي لفتح البيع) قرار تجاري ما انكتب بعد.
            ما نفترض له رقماً — اكتبه في{" "}
            <Link href="/admin/ops/settings" className="underline font-bold">الإعدادات</Link>{" "}
            ويدخل في القرار فوراً.
          </span>
        </div>
      )}

      {/* جدول المحاور — نفس أعمدة الورقة */}
      <Card className="mb-6">
        <CardTitle icon={<ShieldCheck size={17} />}>
          المحاور ({d.axes.length})
        </CardTitle>

        {d.axes.length === 0 ? (
          <div className="text-xs py-6 text-center" style={{ color: T.inkSoft }}>
            ما فيه محاور مُفعّلة — القرار بلا أساس. فعّل المحاور من قاعدة البيانات.
          </div>
        ) : (
          <div className="space-y-3">
            {d.axes.map((a) => {
              const pctDone = a.total > 0 ? (a.done / a.total) * 100 : 0;
              const checks = detail[a.def.kind];
              return (
                <div key={a.def.index} className="rounded-xl p-4" style={{ background: T.bg }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">
                          <span className="num">{a.def.index}</span> · {a.def.label}
                        </span>
                        <span
                          className="text-[10px] font-bold rounded-full px-2.5 py-0.5"
                          style={a.ready ? { background: T.goodTint, color: T.good } : { background: "#F3EFEC", color: PENDING_COLOR }}
                        >
                          {a.ready ? "مكتمل" : "قيد البناء"}
                        </span>
                      </div>
                      <div className="text-[11px] mt-1" style={{ color: T.inkSoft }}>{a.critical}</div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="num text-base font-extrabold leading-none" style={{ color: a.ready ? T.good : T.ink }}>
                        {a.done} / {a.total}
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: T.inkSoft }}>{a.unit}</div>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full overflow-hidden mb-2.5" style={{ background: T.border }}>
                    <div style={{ width: `${pctDone}%`, background: a.ready ? T.good : T.brandBright, height: "100%" }} />
                  </div>

                  {!a.ready && a.blocker && (
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-1.5 text-[11.5px] leading-relaxed min-w-0">
                        <CircleAlert size={13} className="mt-0.5 shrink-0" style={{ color: T.warn }} />
                        <span><span className="font-bold">أهم عائق:</span> {a.blocker}</span>
                      </div>
                      <Link
                        href={a.href}
                        className="shrink-0 flex items-center gap-1 text-[11px] font-bold rounded-lg px-3 py-1.5"
                        style={{ background: T.brandTint, color: T.brand }}
                      >
                        افتح الشاشة <ArrowLeft size={12} />
                      </Link>
                    </div>
                  )}

                  {/* المحاور المبنية على فحوص تعرض فحوصها — رقم بلا تفصيل ما ينفّذ عليه أحد */}
                  {checks && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3">
                      {checks.map((c) => (
                        <div key={c.label} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                          {c.ok ? (
                            <CheckCircle2 size={12} className="mt-0.5 shrink-0" style={{ color: T.good }} />
                          ) : (
                            <XCircle size={12} className="mt-0.5 shrink-0" style={{ color: T.warn }} />
                          )}
                          <span style={{ color: c.ok ? T.inkSoft : T.ink }}>
                            {c.label} — <span style={{ color: T.inkSoft }}>{c.detail}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {a.def.note && (
                    <div className="text-[10.5px] mt-2.5 leading-relaxed" style={{ color: T.inkSoft }}>{a.def.note}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="text-[11px] leading-relaxed" style={{ color: T.inkSoft }}>
        المحاور وتعريفاتها صفوف في قاعدة البيانات (<code>ops_launch_axes</code>)، والحد الأدنى
        مفتاح في الإعدادات. يعني القرار يتغيّر بتغيّر المُدخلات، لا بتعديل الكود.
      </div>
    </OpsShell>
  );
}
