// تتبع صلاحية المكوّنات — دفعات حقيقية من قاعدة البيانات.
//
// قبل: 7 دفعات مكتوبة في الكود بتواريخ محسوبة من اليوم (todayPlus) — تبدو حقيقية
// وهي ليست كذلك. انحذفت، والحساب الآن على دفعات مسجّلة فعلياً.
//
// حساب الأيام محلي بالكامل (مو UTC) عشان ما يختلف يوم بين المناطق الزمنية.

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import NotConfigured from "@/components/auth/NotConfigured";
import ExpiryForm from "@/components/ops/ExpiryForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "صلاحية المكوّنات — Macro Meals" };

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(s: string): number {
  const target = parseLocalDate(s);
  if (!target) return 0;
  return Math.round((target.getTime() - startOfLocalDay(new Date()).getTime()) / 86400000);
}

export default async function ExpiryPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const { data } = await supabase
    .from("safety_expiry_batches")
    .select("*")
    .eq("consumed", false)
    .order("expiry_date", { ascending: true });

  const rows = data ?? [];
  const urgent = rows.filter((r) => daysUntil(r.expiry_date) <= 2).length;

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-symbol.png" alt="Macro Meals" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Macro Meals</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>تتبع صلاحية المكوّنات</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.brand }}>
            لوحات التحكم <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 42, height: 42, background: urgent > 0 ? T.warnTint : T.goodTint, color: urgent > 0 ? T.warn : T.good }}
          >
            <CalendarClock size={20} />
          </div>
          <div>
            <div className="text-xs" style={{ color: T.inkSoft }}>دفعات تحتاج انتباه خلال يومين</div>
            <div className="text-lg font-extrabold" style={{ color: urgent > 0 ? T.warn : T.good }}>{urgent}</div>
          </div>
        </div>

        <ExpiryForm />

        {rows.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <CalendarClock size={30} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
            <div className="text-sm font-bold mb-1">ما فيه دفعات مسجّلة</div>
            <p className="text-xs leading-relaxed max-w-sm mx-auto" style={{ color: T.inkSoft }}>
              أضف دفعات المكوّنات مع تواريخ صلاحيتها، ويرتّبها النظام تلقائياً حسب الأقرب انتهاءً.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const days = daysUntil(row.expiry_date);
              const isUrgent = days <= 2;
              const isSoon = days > 2 && days <= 5;
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                  style={{ background: isUrgent ? T.warnTint : T.surface, border: `1px solid ${isUrgent ? T.warn : T.border}` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isUrgent ? (
                      <AlertTriangle size={16} style={{ color: T.warn }} className="shrink-0" />
                    ) : (
                      <CheckCircle2 size={16} style={{ color: isSoon ? T.brandBright : T.good }} className="shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{row.name}</div>
                      <div className="text-[11px]" style={{ color: T.inkSoft }}>
                        دفعة {row.batch} · ينتهي <span dir="ltr">{row.expiry_date}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold rounded-full px-2.5 py-1 shrink-0"
                    style={{
                      background: isUrgent ? T.warn : isSoon ? "#FCE9D8" : T.goodTint,
                      color: isUrgent ? "#fff" : isSoon ? T.brand : T.good,
                    }}
                  >
                    {days < 0 ? `منتهي منذ ${-days} يوم` : days === 0 ? "ينتهي اليوم" : `${days} يوم`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
