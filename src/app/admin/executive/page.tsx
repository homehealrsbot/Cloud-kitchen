// لوحة الإدارة التنفيذية — أرقام حقيقية من قاعدة البيانات.
//
// قبل: كانت تولّد اشتراكات وإيرادات عشوائية كل 3.6 ثانية وتبدأ من أرقام مخترعة
// (184 مشترك، 21 تجديد، 6 إيقاف). انحذفت بالكامل. الأرقام الآن من الجداول،
// وإذا الجدول فاضي تظهر حالة فاضية صريحة بدل رقم يوحي بنشاط ما صار.

import Link from "next/link";
import Image from "next/image";
import { ChefHat, ChevronRight, Package, ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import NotConfigured from "@/components/auth/NotConfigured";
import { loadOpsSnapshot } from "@/lib/ops/server-data";
import { computeMenu, computeProduction } from "@/lib/ops/engine";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإدارة التنفيذية — Macro meals" };

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "warn" }) {
  const color = tone === "good" ? T.good : tone === "warn" ? T.warn : T.brand;
  return (
    <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="text-xs mb-1.5" style={{ color: T.inkSoft }}>{label}</div>
      <div className="text-2xl font-extrabold leading-none" style={{ color }}>{value}</div>
      {hint && <div className="text-[11px] mt-1.5" style={{ color: T.inkSoft }}>{hint}</div>}
    </div>
  );
}

export default async function ExecutiveDashboard() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const snapshot = await loadOpsSnapshot();

  const [{ count: customerCount }, { count: staffCount }] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("staff").select("*", { count: "exact", head: true }),
  ]);

  const computed = snapshot.data.settings ? computeMenu(snapshot.data) : [];
  const ready = computed.filter((c) => {
    const gates = snapshot.gates[c.item.id] ?? [];
    return gates.length === 8 && gates.every((g) => g === "READY");
  });
  const avgContribution = computed.length
    ? computed.reduce((a, c) => a + c.contributionPct, 0) / computed.length
    : 0;
  const underMargin = computed.filter((c) => c.marginAlert).length;

  // قيمة خطة الإنتاج المسجّلة فعلياً عبر الأيام الـ14
  let plannedPortions = 0;
  let plannedRevenue = 0;
  let plannedCost = 0;
  if (snapshot.data.settings && snapshot.data.rotation.days.length > 0) {
    for (let d = 0; d < snapshot.data.rotation.days.length; d++) {
      const portions = snapshot.production[String(d)] ?? {};
      if (Object.keys(portions).length === 0) continue;
      const plan = computeProduction(snapshot.data, computed, d, portions as Record<number, number>);
      plannedPortions += plan.totals.portions;
      plannedRevenue += plan.totals.revenue;
      plannedCost += plan.totals.cost;
    }
  }
  const plannedMargin = plannedRevenue - plannedCost;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Macro meals" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Macro meals</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>لوحة الإدارة التنفيذية</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            لوحات التحكم <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Kpi label="عملاء مسجّلون" value={fmt(customerCount ?? 0)} hint="حسابات أنشأها العملاء بأنفسهم" />
          <Kpi label="فريق العمل" value={fmt(staffCount ?? 0)} hint="حسابات بأدوار" />
          <Kpi label="أصناف جاهزة للبيع" value={`${ready.length} / ${computed.length}`} tone="good" hint="معتمدة من كل البوابات" />
          <Kpi label="أصناف تحت حد الهامش" value={fmt(underMargin)} tone={underMargin > 0 ? "warn" : undefined} hint={`الحد ${Math.round((snapshot.data.settings?.marginWarnPct ?? 0) * 100)}%`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Kpi label="متوسط هامش المساهمة" value={`${(avgContribution * 100).toFixed(1)}%`} hint="على كل أصناف المنيو" />
          <Kpi label="حصص مخططة (14 يوم)" value={fmt(plannedPortions)} hint="المسجّل في خطة الإنتاج" />
          <Kpi label="هامش الخطة المسجّلة" value={`${fmt(plannedMargin)} ر.س`} tone={plannedMargin >= 0 ? "good" : "warn"} hint={`إيراد ${fmt(plannedRevenue)} − تكلفة ${fmt(plannedCost)}`} />
        </div>

        {plannedPortions === 0 && (
          <div className="rounded-2xl p-8 text-center mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <ChefHat size={30} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
            <div className="text-sm font-bold mb-1">ما فيه حصص مخططة بعد</div>
            <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: T.inkSoft }}>
              أرقام الإيراد والتكلفة تُحسب من خطة الإنتاج الفعلية. أدخل عدد الحصص في
              صفحة الإنتاج وتظهر هنا تلقائياً.
            </p>
            <Link href="/admin/ops/production" className="inline-block mt-4 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brandBright }}>
              فتح خطة الإنتاج
            </Link>
          </div>
        )}

        <div className="rounded-2xl p-5 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={17} style={{ color: T.brand }} />
            <div className="font-semibold text-sm">سجل آخر التعديلات</div>
          </div>
          {snapshot.audit.length === 0 ? (
            <div className="text-xs py-6 text-center" style={{ color: T.inkSoft }}>ما فيه تعديلات مسجّلة بعد</div>
          ) : (
            <div className="space-y-2">
              {snapshot.audit.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{a.text}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{a.area} · {a.role} · {a.by}</div>
                  </div>
                  <div className="text-[11px] shrink-0" dir="ltr" style={{ color: T.inkSoft }}>
                    {new Date(a.ts).toLocaleString("ar-SA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/admin/ops" className="rounded-2xl py-3.5 text-center text-sm font-bold text-white" style={{ background: T.brandBright }}>
            <ShoppingBag size={15} className="inline ml-1.5" /> مركز العمليات
          </Link>
          <Link href="/admin/ops/engineering" className="rounded-2xl py-3.5 text-center text-sm font-bold" style={{ background: T.brandTint, color: T.brand }}>
            <Wallet size={15} className="inline ml-1.5" /> هندسة المنيو
          </Link>
          <Link href="/admin/ops/ingredients" className="rounded-2xl py-3.5 text-center text-sm font-bold" style={{ background: T.brandTint, color: T.brand }}>
            <Package size={15} className="inline ml-1.5" /> المكوّنات والأسعار
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] mt-8 pb-4" style={{ color: T.inkSoft }}>
          <Users size={11} /> كل الأرقام من قاعدة البيانات — ما فيه أي بيانات تجريبية
        </div>
      </div>
    </div>
  );
}
