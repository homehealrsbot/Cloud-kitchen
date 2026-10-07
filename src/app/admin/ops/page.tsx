"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, AlertTriangle, ClipboardCheck, Layers, ShieldCheck, History, RotateCcw, Users, Eye, Pencil } from "lucide-react";
import { GATES, ING_APPROVALS, SECTIONS, integrityChecks } from "@/lib/ops/engine";
import { PERMISSION_ROWS, ROLES, Role, can, useSession, MATRIX } from "@/lib/ops/roles";
import { actions, useOps } from "@/lib/ops/store";
import { Card, CardTitle, Kpi, Loading, OPS_MODULES, OpsShell, PENDING_COLOR, T, pct, sar, StatusBadge } from "@/components/ops/ui";

const ROLE_ORDER: Role[] = ["kitchen", "quality", "executive"];

export default function OpsHub() {
  const ops = useOps();
  const session = useSession();
  const role = session?.role ?? null;
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState("");

  if (!ops.ready) {
    return (
      <OpsShell title="مركز العمليات" subtitle="المنيو، الإنتاج، الجودة — من مكان واحد">
        <Loading />
      </OpsShell>
    );
  }

  const total = ops.skus.length;
  const ready = ops.skus.filter((s) => s.quality.status === "READY").length;
  const pending = ops.skus.filter((s) => s.quality.status === "PENDING").length;
  const hold = ops.skus.filter((s) => s.quality.status === "HOLD").length;
  const showFinance = can(role, "finance.view");
  const avgMargin = ops.computed.reduce((a, c) => a + c.contributionPct, 0) / Math.max(1, total);
  const underMargin = ops.computed.filter((c) => c.marginAlert).length;
  const checks = integrityChecks(ops.data);
  const ingTotal = ops.data.ingredients.length;
  const modules = OPS_MODULES.filter((m) => can(role, m.view));
  const holds = ops.skus.filter((s) => s.quality.status === "HOLD");

  return (
    <OpsShell title="مركز العمليات" subtitle="المنيو، الإنتاج، الجودة — من مكان واحد">
      {/* مؤشرات الحالة */}
      <div className={`grid grid-cols-2 ${showFinance ? "md:grid-cols-5" : "md:grid-cols-4"} gap-3 mb-6`}>
        <Kpi label="إجمالي الأصناف" value={total} />
        <Kpi label="جاهز للبيع" value={ready} tone="good" />
        <Kpi label="بانتظار الاعتماد" value={pending} tone="warn" />
        <Kpi label="متوقف" value={hold} tone="hold" />
        {showFinance && <Kpi label="متوسط هامش المساهمة" value={pct(avgMargin)} />}
      </div>

      <div
        className="rounded-xl px-4 py-3 mb-6 text-[12px] leading-relaxed"
        style={{ background: T.brandTint, color: T.brand }}
      >
        قاعدة الإطلاق: ما يُباع للعميل إلا الصنف «جاهز للبيع». «بانتظار الاعتماد» للتجربة الداخلية فقط، و«متوقف» ما يدخل خطة الإنتاج.
      </div>

      {/* الوحدات المتاحة لدورك */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {modules.map((m) => {
          const editable = m.edit ? can(role, m.edit) : false;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-2xl p-4 flex items-center gap-3 transition-transform hover:scale-[1.01]"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold">{m.label}</div>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={editable ? { background: T.goodTint, color: T.good } : { background: "#F3EFEC", color: T.inkSoft }}
                  >
                    {editable ? <Pencil size={10} /> : <Eye size={10} />}
                    {editable ? "تعديل" : "عرض"}
                  </span>
                </div>
                <div className="text-[11px] mt-1" style={{ color: T.inkSoft }}>{m.desc}</div>
              </div>
              <ArrowLeft size={16} style={{ color: T.inkSoft }} />
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ما الذي يعطل الإطلاق */}
        <Card>
          <CardTitle icon={<ShieldCheck size={17} />}>ما الذي يعطّل الإطلاق؟ (أصناف لكل بوابة)</CardTitle>
          <div className="space-y-3">
            {GATES.map((g, gi) => {
              const r = ops.skus.filter((s) => s.gates[gi] === "READY").length;
              const h = ops.skus.filter((s) => s.gates[gi] === "HOLD").length;
              const p = total - r - h;
              return (
                <div key={g}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{g}</span>
                    <span style={{ color: T.inkSoft }}>
                      <span style={{ color: T.good }} className="font-bold">{r}</span> معتمد ·{" "}
                      <span style={{ color: PENDING_COLOR }} className="font-bold">{p}</span> بانتظار
                      {h > 0 && (
                        <>
                          {" "}· <span style={{ color: T.warn }} className="font-bold">{h}</span> موقوف
                        </>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ background: T.bg }}>
                    <div style={{ width: `${(r / total) * 100}%`, background: T.good }} />
                    <div style={{ width: `${(h / total) * 100}%`, background: T.warn }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          {/* المكونات */}
          <Card>
            <CardTitle icon={<Layers size={17} />}>اعتماد المكوّنات ({ingTotal} مكوّن)</CardTitle>
            <div className="space-y-2">
              {ING_APPROVALS.map((label, i) => {
                const r = ops.data.ingredients.filter((ing) => ops.ingApprovals(ing.key)[i] === "READY").length;
                return (
                  <div key={label} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                    <span className="text-xs font-medium">{label}</span>
                    <span className="text-xs font-bold" style={{ color: r === ingTotal ? T.good : PENDING_COLOR }}>
                      {r} من {ingTotal}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* فحص سلامة البيانات */}
          <Card>
            <CardTitle icon={<ClipboardCheck size={17} />}>فحص سلامة البيانات</CardTitle>
            <div className="space-y-2">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-xs">
                  <span>{c.label}</span>
                  <span className="flex items-center gap-1.5 font-bold" style={{ color: c.ok ? T.good : T.warn }}>
                    {c.value}
                    {c.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* الأصناف المتوقفة */}
      {holds.length > 0 && (
        <Card className="mb-6">
          <CardTitle icon={<AlertTriangle size={17} />}>أصناف متوقفة ({holds.length})</CardTitle>
          <div className="space-y-2">
            {holds.map((s) => (
              <div key={s.sku.item.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 flex-wrap" style={{ background: T.warnTint }}>
                <div>
                  <div className="text-sm font-bold">{s.sku.item.id} · {s.sku.item.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: T.warn }}>
                    السبب: {s.quality.alert || s.notes[s.gates.indexOf("HOLD")] || s.quality.blocker}
                  </div>
                </div>
                <StatusBadge status="HOLD" small />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ملخص مالي — للتنفيذي فقط */}
      {showFinance && (
        <Card className="mb-6">
          <CardTitle>ملخص مالي حسب القسم</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 520 }}>
              <thead>
                <tr style={{ color: T.inkSoft }} className="text-[11px]">
                  <th className="text-right font-bold px-2 py-2">القسم</th>
                  <th className="text-right font-bold px-2 py-2">أصناف</th>
                  <th className="text-right font-bold px-2 py-2">متوسط السعر</th>
                  <th className="text-right font-bold px-2 py-2">متوسط التكلفة الكاملة</th>
                  <th className="text-right font-bold px-2 py-2">متوسط الهامش</th>
                  <th className="text-right font-bold px-2 py-2">تحت حد الهامش</th>
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map((sec) => {
                  const list = ops.computed.filter((c) => c.item.section === sec);
                  if (list.length === 0) return null;
                  const avg = (f: (c: (typeof list)[number]) => number) => list.reduce((a, c) => a + f(c), 0) / list.length;
                  const under = list.filter((c) => c.marginAlert).length;
                  return (
                    <tr key={sec} className="text-xs border-t" style={{ borderColor: T.border }}>
                      <td className="px-2 py-2 font-bold">{sec}</td>
                      <td className="px-2 py-2">{list.length}</td>
                      <td className="px-2 py-2">{sar(avg((c) => c.price))}</td>
                      <td className="px-2 py-2">{sar(avg((c) => c.fullCost))}</td>
                      <td className="px-2 py-2 font-bold" style={{ color: T.brand }}>{pct(avg((c) => c.contributionPct))}</td>
                      <td className="px-2 py-2" style={{ color: under ? T.warn : T.inkSoft }}>{under}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {underMargin > 0 && (
            <div className="text-[11px] mt-3 font-bold" style={{ color: T.warn }}>
              {underMargin} صنف تحت حد الهامش — راجعها في صفحة المنيو.
            </div>
          )}
        </Card>
      )}

      {/* جدول الصلاحيات */}
      <Card className="mb-6">
        <CardTitle icon={<Users size={17} />}>الأدوار والصلاحيات — مين يسوي إيش</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 480 }}>
            <thead>
              <tr className="text-[11px]" style={{ color: T.inkSoft }}>
                <th className="text-right font-bold px-2 py-2">البند</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="text-center font-bold px-2 py-2" style={r === role ? { color: T.brand } : undefined}>
                    {ROLES[r].short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.label} className="text-xs border-t" style={{ borderColor: T.border }}>
                  <td className="px-2 py-2">{row.label}</td>
                  {ROLE_ORDER.map((r) => {
                    const edit = row.edit ? MATRIX[row.edit].includes(r) : false;
                    const view = MATRIX[row.view].includes(r);
                    return (
                      <td key={r} className="px-2 py-2 text-center font-bold" style={{ color: edit ? T.good : view ? T.inkSoft : "#CDBFB5", background: r === role ? T.brandTint : undefined }}>
                        {edit ? "تعديل" : view ? "عرض" : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] mt-3 leading-relaxed" style={{ color: T.inkSoft }}>
          المطبخ ما يعتمد شغله بنفسه: أي تعديل على وصفة يرجّع بوابات الصنف المعتمدة لـ«بانتظار الاعتماد» تلقائياً.
        </div>
      </Card>

      {/* سجل التعديلات + إعادة الضبط — للتنفيذي */}
      {can(role, "audit.view") && (
        <Card>
          <CardTitle
            icon={<History size={17} />}
            aside={
              can(role, "data.reset") &&
              (confirmReset ? (
                <span className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: T.warn }}>متأكد؟ يرجع كل شي لقيم الملف الأصلي</span>
                  <button
                    onClick={() => {
                      const r = actions.resetAll();
                      setMsg(r.ok ? "تم الإرجاع لقيم الملف الأصلي" : r.error);
                      setConfirmReset(false);
                    }}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
                    style={{ background: T.warn }}
                  >
                    نعم، أرجِع
                  </button>
                  <button onClick={() => setConfirmReset(false)} className="text-[11px] font-bold" style={{ color: T.inkSoft }}>إلغاء</button>
                </span>
              ) : (
                <button onClick={() => setConfirmReset(true)} className="flex items-center gap-1 text-[11px] font-bold" style={{ color: T.inkSoft }}>
                  <RotateCcw size={12} /> إرجاع البيانات للأصل
                </button>
              ))
            }
          >
            سجل التعديلات
          </CardTitle>
          {msg && <div className="text-[11px] font-bold mb-3" style={{ color: T.good }}>{msg}</div>}
          {ops.state.audit.length === 0 && (
            <div className="text-xs py-6 text-center" style={{ color: T.inkSoft }}>ما فيه تعديلات مسجّلة بعد</div>
          )}
          <div className="space-y-2">
            {ops.state.audit.slice(0, 25).map((a) => (
              <div key={a.id} className="rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                <div className="text-xs font-medium">{a.text}</div>
                <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
                  {a.area} · {a.role}
                  {a.by !== "—" ? ` (${a.by})` : ""} · {new Date(a.ts).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </OpsShell>
  );
}
