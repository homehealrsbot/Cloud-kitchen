"use client";

// مكوّنات واجهة مشتركة لصفحات عمليات المطبخ — بنفس هوية Macro Meals الحالية.

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { ChevronRight, Eye, Lock, Pencil, Printer } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { GateStatus, SkuStatus, STATUS_LABEL } from "@/lib/ops/engine";
import { ROLES, can } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import { OPS_MODULES } from "@/lib/ops/modules";

export { T };

// ---------------- تنسيق الأرقام ----------------

export function num(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function sar(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${num(v, digits)} ر.س`;
}
export function pct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${num(v * 100, digits)}%`;
}

export function OpsShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const session = useSession();
  const pathname = usePathname();
  const role = session?.role ?? null;
  const modules = OPS_MODULES.filter((m) => can(role, m.view));
  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b print:hidden" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-symbol.png" alt="Macro Meals" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>{title}</div>
              {subtitle && <div className="text-xs mt-1.5" style={{ color: T.inkSoft }}>{subtitle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {actions}
            {session && (
              <span className="text-[11px] font-bold rounded-full px-3 py-1.5" style={{ background: T.brandTint, color: T.brand }}>
                {ROLES[session.role].label}
                {session.name ? ` · ${session.name}` : ""}
              </span>
            )}
            <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
              تبديل الدور
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3 flex items-center gap-2 overflow-x-auto">
          <NavChip href="/admin/ops" label="مركز العمليات" active={pathname === "/admin/ops"} />
          {modules.map((m) => (
            <NavChip key={m.href} href={m.href} label={m.label} active={pathname === m.href} />
          ))}
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
    </div>
  );
}

function NavChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap"
      style={active ? { background: T.brand, color: "#fff" } : { background: T.brandTint, color: T.brand }}
    >
      {label}
    </Link>
  );
}

// ---------------- عناصر عامة ----------------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${className}`} style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      {children}
    </div>
  );
}

export function CardTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: T.brand }} className="flex">{icon}</span>}
        <div className="font-semibold text-sm">{children}</div>
      </div>
      {aside}
    </div>
  );
}

export function Kpi({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "warn" | "hold" }) {
  const color = tone === "good" ? T.good : tone === "warn" ? PENDING_COLOR : tone === "hold" ? T.warn : T.brand;
  return (
    <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="text-[11px] mb-1.5" style={{ color: T.inkSoft }}>{label}</div>
      <div className="text-2xl font-extrabold leading-none" style={{ color }}>{value}</div>
    </div>
  );
}

export const PENDING_COLOR = "#A05D0E";
export const PENDING_TINT = "#FBF1DC";

export function statusColors(status: SkuStatus | GateStatus) {
  if (status === "READY") return { fg: T.good, bg: T.goodTint };
  if (status === "HOLD") return { fg: T.warn, bg: T.warnTint };
  return { fg: PENDING_COLOR, bg: PENDING_TINT };
}

export function StatusBadge({ status, small }: { status: SkuStatus; small?: boolean }) {
  const c = statusColors(status);
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full whitespace-nowrap ${small ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1"}`}
      style={{ background: c.bg, color: c.fg }}
    >
      <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: c.fg }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const GATE_LABEL: Record<GateStatus, string> = { READY: "معتمد", PENDING: "بانتظار", HOLD: "موقوف" };

// شريط يوضح للمستخدم هل يقدر يعدّل أو يشوف فقط
export function AccessNote({ canEdit, editText, viewText }: { canEdit: boolean; editText: string; viewText: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-xl px-4 py-3 mb-5 print:hidden"
      style={{ background: canEdit ? T.brandTint : "#F3EFEC" }}
    >
      {canEdit ? (
        <Pencil size={15} style={{ color: T.brand }} className="mt-0.5 shrink-0" />
      ) : (
        <Eye size={15} style={{ color: T.inkSoft }} className="mt-0.5 shrink-0" />
      )}
      <p className="text-[12px] leading-relaxed" style={{ color: canEdit ? T.brand : T.inkSoft }}>
        {canEdit ? editText : viewText}
      </p>
    </div>
  );
}

export function PrintButton({ label = "طباعة" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold print:hidden"
      style={{ background: T.surface, color: T.brand, border: `1px solid ${T.border}` }}
    >
      <Printer size={13} /> {label}
    </button>
  );
}

export function ErrorNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="text-xs font-bold rounded-lg px-3 py-2 mt-2" style={{ background: T.warnTint, color: T.warn }}>
      {text}
    </div>
  );
}

export function LockedHint({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: T.inkSoft }}>
      <Lock size={11} /> {text}
    </span>
  );
}

// حقل رقمي يحفظ عند الخروج منه أو Enter (ما يحفظ مع كل ضغطة)
export function NumInput({
  value,
  onCommit,
  disabled,
  min = 0,
  step = 1,
  width = 76,
  placeholder,
  ariaLabel,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  disabled?: boolean;
  min?: number;
  step?: number;
  width?: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const shown = value === null || value === undefined ? "" : String(value);
  const [draft, setDraft] = useState(shown);
  const [lastShown, setLastShown] = useState(shown);
  if (lastShown !== shown) {
    // القيمة تغيّرت من برّا (حفظ أو تبويب ثاني) — نحدّث المسودة
    setLastShown(shown);
    setDraft(shown);
  }
  function commit() {
    if (draft === shown) return;
    if (draft.trim() === "") {
      onCommit(null);
      return;
    }
    const v = Number(draft);
    if (Number.isNaN(v) || v < min) {
      setDraft(shown);
      return;
    }
    onCommit(v);
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft}
      min={min}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="rounded-lg border px-2 py-1.5 text-sm text-center font-bold disabled:opacity-60"
      style={{ borderColor: T.border, width, background: disabled ? T.bg : "#FFFDF5", color: T.ink }}
    />
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`text-right text-[11px] font-bold px-2.5 py-2 whitespace-nowrap ${className}`} style={{ color: T.inkSoft }}>
      {children}
    </th>
  );
}
export function Td({ children, className = "", strong }: { children?: ReactNode; className?: string; strong?: boolean }) {
  return (
    <td className={`px-2.5 py-2 text-xs align-middle ${strong ? "font-bold" : ""} ${className}`}>{children}</td>
  );
}

export function TableWrap({ children, minWidth = 520 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full border-collapse" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap"
      style={
        active
          ? { background: T.brand, color: "#fff", border: `1px solid ${T.brand}` }
          : { background: T.surface, color: T.inkSoft, border: `1px solid ${T.border}` }
      }
    >
      {children}
    </button>
  );
}

export function Loading() {
  return (
    <div className="py-16 text-center text-xs" style={{ color: T.inkSoft }}>
      جاري تحميل البيانات…
    </div>
  );
}

// اختيار ثلاثي لحالة بوابة: معتمد / بانتظار / موقوف
export function TriState({
  value,
  onChange,
  disabled,
  allowHold = true,
}: {
  value: GateStatus;
  onChange: (v: GateStatus) => void;
  disabled?: boolean;
  allowHold?: boolean;
}) {
  const options: GateStatus[] = allowHold ? ["READY", "PENDING", "HOLD"] : ["READY", "PENDING"];
  if (disabled) {
    const c = statusColors(value);
    return (
      <span className="text-[10px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap" style={{ background: c.bg, color: c.fg }}>
        {GATE_LABEL[value]}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
      {options.map((o) => {
        const c = statusColors(o);
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => !active && onChange(o)}
            aria-pressed={active}
            className="px-2.5 py-1 text-[10px] font-bold whitespace-nowrap"
            style={active ? { background: c.fg, color: "#fff" } : { background: T.surface, color: T.inkSoft }}
          >
            {GATE_LABEL[o]}
          </button>
        );
      })}
    </span>
  );
}
