// مصفوفة الصلاحيات — مين يشوف ومين يعدّل، مقروءة من نفس المصادر اللي تحكم فعلاً.
//
// الصفوف الثابتة (الميزات) تجي من MATRIX في roles.ts، وصفوف البوابات تجي من
// تعريفاتها في قاعدة البيانات. فما فيه جدول مرسوم باليد يتقادم: لو نقلت ملكية
// بوابة أو أضفت واحدة ظهر التغيير هنا نفسه.
//
// مكوّن خادم بلا حالة — ما يحتاج "use client".

import { Check, Minus, Cpu } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import type { GateDef, IngApprovalDef } from "@/lib/ops/engine";
import { PERMISSION_ROWS, ROLES, Role, approvalPermissionRows, can } from "@/lib/ops/roles";

const COLS: Role[] = ["executive", "kitchen", "quality"];

export default function PermissionMatrix({
  gateDefs,
  approvalDefs,
}: {
  gateDefs: GateDef[];
  approvalDefs: IngApprovalDef[];
}) {
  const gateRows = approvalPermissionRows(gateDefs.filter((d) => d.active));
  const approvalRows = approvalPermissionRows(approvalDefs.filter((d) => d.active));

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: T.border }}>
        <div className="font-semibold text-sm">مصفوفة الصلاحيات الحالية</div>
        <div className="text-[11px] mt-1 leading-relaxed" style={{ color: T.inkSoft }}>
          ✓ يعدّل · ○ يشوف فقط · — ما يشوف. الجدول مقروء من نفس القواعد اللي
          تفرضها قاعدة البيانات، مو مكتوباً بيد.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth: 520 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              <th className="text-right px-4 py-2.5 font-bold">البند</th>
              {COLS.map((r) => (
                <th key={r} className="px-3 py-2.5 font-bold whitespace-nowrap">{ROLES[r].short}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: T.border }}>
            <Section label="الميزات" />
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.label}>
                <td className="px-4 py-2.5">{row.label}</td>
                {COLS.map((r) => (
                  <td key={r} className="px-3 py-2.5 text-center">
                    <Mark edit={!!row.edit && can(r, row.edit)} view={can(r, row.view)} />
                  </td>
                ))}
              </tr>
            ))}

            <Section label={`بوابات اعتماد الصنف (${gateRows.length})`} />
            {gateRows.map((row) => (
              <tr key={`g-${row.label}`}>
                <td className="px-4 py-2.5">
                  {row.label}
                  {row.computed && (
                    <span className="inline-flex items-center gap-1 text-[10px] mr-1.5" style={{ color: T.inkSoft }}>
                      <Cpu size={10} /> محسوبة
                    </span>
                  )}
                </td>
                {COLS.map((r) => (
                  <td key={r} className="px-3 py-2.5 text-center">
                    <Mark edit={row.owner === r} view />
                  </td>
                ))}
              </tr>
            ))}

            <Section label={`اعتمادات المكوّن (${approvalRows.length})`} />
            {approvalRows.map((row) => (
              <tr key={`a-${row.label}`}>
                <td className="px-4 py-2.5">{row.label}</td>
                {COLS.map((r) => (
                  <td key={r} className="px-3 py-2.5 text-center">
                    <Mark edit={row.owner === r} view={can(r, "ingredients.view")} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3.5 border-t text-[11px] leading-relaxed" style={{ borderColor: T.border, color: T.inkSoft }}>
        البوابة المحسوبة ما يختمها أي دور: القاعدة تحسبها من تجارب Pilot وقرار الشيف،
        وسياسة RLS ترفض الختم اليدوي لها.
      </div>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return (
    <tr style={{ background: T.brandTint }}>
      <td className="px-4 py-2 font-bold text-[11px]" colSpan={COLS.length + 1} style={{ color: T.brand }}>
        {label}
      </td>
    </tr>
  );
}

function Mark({ edit, view }: { edit: boolean; view: boolean }) {
  if (edit) return <Check size={14} className="inline" style={{ color: T.good }} />;
  if (view) return <span className="text-[13px]" style={{ color: T.inkSoft }}>○</span>;
  return <Minus size={12} className="inline" style={{ color: T.border }} />;
}
