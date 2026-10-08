"use client";

// قشرة شاشات سلامة الغذاء وعناصرها المشتركة.
//
// منفصلة عن OpsShell لأن التنقل مختلف: هذي وحدة سلامة لها شاشاتها، وخلطها
// بشريط وحدات العمليات يضيّع المستخدم.

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { ROLES } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import type { SafetySnapshot } from "@/lib/safety/types";

const SafetyContext = createContext<SafetySnapshot | null>(null);
export const SafetyProvider = SafetyContext.Provider;

export function useSafety(): SafetySnapshot {
  const v = useContext(SafetyContext);
  if (!v) {
    return { steps: [], limits: [], log: [], prpPrograms: [], prpLog: [], isoClauses: [], ncr: [] };
  }
  return v;
}

const NAV = [
  { href: "/admin/safety", label: "الخطة والبرامج" },
  { href: "/admin/safety/ccp", label: "سجل المراقبة" },
  { href: "/admin/safety/ncr", label: "عدم المطابقة" },
];

export function SafetyShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const session = useSession();
  const pathname = usePathname();

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b print:hidden" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Macro meals" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>{title}</div>
              {subtitle && <div className="text-xs mt-1.5" style={{ color: T.inkSoft }}>{subtitle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {session && (
              <span className="text-[11px] font-bold rounded-full px-3 py-1.5" style={{ background: T.brandTint, color: T.brand }}>
                {ROLES[session.role].label}
                {session.name ? ` · ${session.name}` : ""}
              </span>
            )}
            <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
              لوحات التحكم <ChevronRight size={13} />
            </Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3 flex items-center gap-2 overflow-x-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap"
              style={
                pathname === n.href
                  ? { background: T.brand, color: "#fff" }
                  : { background: T.brandTint, color: T.brand }
              }
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      {children}
    </div>
  );
}

export function CardTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: T.brand }}>{icon}</span>}
        <div className="font-semibold text-sm">{children}</div>
      </div>
      {aside}
    </div>
  );
}

export function Kpi({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: "good" | "warn" | "hold"; hint?: string }) {
  const color = tone === "good" ? T.good : tone === "warn" ? "#B7791F" : tone === "hold" ? T.warn : T.brand;
  return (
    <div className="rounded-2xl px-4 py-3.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="text-[11px] mb-1" style={{ color: T.inkSoft }}>{label}</div>
      <div className="text-xl font-extrabold leading-none" style={{ color }}>{value}</div>
      {hint && <div className="text-[10px] mt-1.5" style={{ color: T.inkSoft }}>{hint}</div>}
    </div>
  );
}

export function Note({ ok, text }: { ok: boolean; text: string }) {
  if (!text) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 mb-4 text-xs leading-relaxed"
      style={ok ? { background: T.brandTint, color: T.brand } : { background: "#fdecea", color: "#a32019" }}
    >
      {text}
    </div>
  );
}

export function AccessNote({ canEdit, editText, viewText }: { canEdit: boolean; editText: string; viewText: string }) {
  return (
    <div
      className="rounded-xl px-3.5 py-3 mb-5 text-[11px] leading-relaxed"
      style={{ background: canEdit ? T.brandTint : T.surface, color: canEdit ? T.brand : T.inkSoft, border: `1px solid ${T.border}` }}
    >
      {canEdit ? editText : viewText}
    </div>
  );
}

export { T };
