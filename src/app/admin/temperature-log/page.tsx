// سجل درجات حرارة التخزين — سجل حقيقي في قاعدة البيانات.
//
// قبل: كانت الصفحة تعرض 3 قراءات مكتوبة في الكود (منها قراءتان "ناجحتان").
// سجل سلامة غذائية وهمي أخطر من عدم وجوده، فانحذف بالكامل.

import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ChevronRight, Thermometer, XCircle } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import NotConfigured from "@/components/auth/NotConfigured";
import { SAFE_RANGES } from "@/lib/safety";
import TemperatureForm from "@/components/ops/TemperatureForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "سجل درجات الحرارة — Food Style" };

export default async function TemperatureLogPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("safety_temperature_log")
    .select("*")
    .order("recorded_at", { ascending: false })
    .limit(100);

  const log = rows ?? [];
  const failCount = log.filter((r) => !r.passed).length;

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Food Style</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>سجل درجات حرارة التخزين</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.brand }}>
            لوحات التحكم <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {Object.entries(SAFE_RANGES).map(([unit, r]) => (
            <div key={unit} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="text-xs mb-1" style={{ color: T.inkSoft }}>النطاق الآمن — {unit}</div>
              <div className="text-sm font-extrabold" dir="ltr">{r.min}° … {r.max}° م</div>
            </div>
          ))}
        </div>

        {failCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6 text-sm font-bold" style={{ background: T.warnTint, color: T.warn }}>
            <XCircle size={16} /> فيه {failCount} قراءة خارج النطاق الآمن في السجل
          </div>
        )}

        <TemperatureForm units={Object.keys(SAFE_RANGES)} />

        {log.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <Thermometer size={30} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
            <div className="text-sm font-bold mb-1">السجل فاضي</div>
            <p className="text-xs leading-relaxed max-w-sm mx-auto" style={{ color: T.inkSoft }}>
              ما فيه أي قراءة مسجّلة. يُنصح بتسجيل قراءة صباحية ومسائية على الأقل لكل وحدة تخزين.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {log.map((row) => (
              <div
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl px-4 py-3"
                style={{ background: row.passed ? T.surface : T.warnTint, border: `1px solid ${row.passed ? T.border : T.warn}` }}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {row.passed ? (
                    <CheckCircle2 size={16} style={{ color: T.good }} className="mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={16} style={{ color: T.warn }} className="mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{row.unit} — <span dir="ltr">{row.reading}° م</span></div>
                    <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
                      {row.staff_name} ·{" "}
                      {new Date(row.recorded_at).toLocaleString("ar-SA", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                    {row.note && (
                      <div className="text-[11px] mt-1 font-medium" style={{ color: row.passed ? T.inkSoft : T.warn }}>
                        الإجراء: {row.note}
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className="text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0"
                  style={{ background: row.passed ? T.goodTint : T.warn, color: row.passed ? T.good : "#fff" }}
                >
                  {row.passed ? "ضمن النطاق" : "خارج النطاق"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-[11px] mt-8 pb-4" style={{ color: T.inkSoft }}>
          <Thermometer size={11} className="inline ml-1" />
          كل قراءة تُسجَّل باسم من أدخلها ووقتها، ولا يمكن تعديلها أو حذفها بعد الحفظ
        </div>
      </div>
    </div>
  );
}
