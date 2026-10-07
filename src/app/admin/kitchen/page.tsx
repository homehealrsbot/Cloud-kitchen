// لوحة المطبخ — حالة التشغيل الفعلية من قاعدة البيانات.
//
// قبل: كانت تولّد طلبات ومخزوناً عشوائياً كل 3.6 ثانية من مصفوفات تجريبية
// (SIM_MEALS / NAMES / INVENTORY_INIT). انحذفت كلها. الصفحة الآن تعرض خطة الإنتاج
// وقائمة المشتريات الحقيقية، وتوجّه لمركز العمليات للتفاصيل.

import Link from "next/link";
import Image from "next/image";
import { CalendarClock, ChefHat, ChevronRight, Layers, Package, ShoppingCart, Thermometer } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { loadOpsSnapshot } from "@/lib/ops/server-data";
import { computeMenu, computeProduction } from "@/lib/ops/engine";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة المطبخ — Food Style" };

const SHORTCUTS = [
  { href: "/admin/ops/production", label: "خطة الإنتاج والمشتريات", icon: ChefHat },
  { href: "/admin/ops/kitchen-card", label: "بطاقة المطبخ", icon: Layers },
  { href: "/admin/ops/recipes", label: "الوصفات", icon: Package },
  { href: "/admin/ops/rotation", label: "جدول الدوران", icon: CalendarClock },
  { href: "/admin/temperature-log", label: "سجل درجات الحرارة", icon: Thermometer },
  { href: "/admin/expiry", label: "صلاحية المكونات", icon: CalendarClock },
];

export default async function KitchenDashboard() {
  const snapshot = await loadOpsSnapshot();
  const hasData = Boolean(snapshot.data.settings) && snapshot.data.menu.length > 0;
  const computed = hasData ? computeMenu(snapshot.data) : [];

  // أقرب يوم فيه حصص مخططة
  let activeDay = -1;
  for (let d = 0; d < snapshot.data.rotation.days.length; d++) {
    if (Object.keys(snapshot.production[String(d)] ?? {}).length > 0) {
      activeDay = d;
      break;
    }
  }
  const plan =
    activeDay >= 0
      ? computeProduction(
          snapshot.data,
          computed,
          activeDay,
          (snapshot.production[String(activeDay)] ?? {}) as Record<number, number>,
        )
      : null;

  const holds = computed.filter((c) => (snapshot.gates[c.item.id] ?? []).includes("HOLD"));

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Food Style</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>لوحة المطبخ</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            لوحات التحكم <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {holds.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-6 text-[12px] font-bold" style={{ background: T.warnTint, color: T.warn }}>
            {holds.length} صنف موقوف من الجودة — ما يدخل خطة الإنتاج:{" "}
            {holds.slice(0, 4).map((c) => c.item.name).join("، ")}
            {holds.length > 4 ? "…" : ""}
          </div>
        )}

        {plan ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="text-xs mb-1.5" style={{ color: T.inkSoft }}>
                  حصص {snapshot.data.rotation.days[activeDay]?.label ?? ""}
                </div>
                <div className="text-2xl font-extrabold" style={{ color: T.brand }}>{plan.totals.portions}</div>
              </div>
              <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="text-xs mb-1.5" style={{ color: T.inkSoft }}>أصناف مخططة</div>
                <div className="text-2xl font-extrabold" style={{ color: T.brand }}>
                  {plan.rows.filter((r) => r.portions > 0).length}
                </div>
              </div>
              <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="text-xs mb-1.5" style={{ color: T.inkSoft }}>مكوّنات مطلوبة للشراء</div>
                <div className="text-2xl font-extrabold" style={{ color: T.brand }}>{plan.shopping.length}</div>
              </div>
            </div>

            <div className="rounded-2xl p-5 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={17} style={{ color: T.brand }} />
                  <div className="font-semibold text-sm">أعلى المكوّنات المطلوبة</div>
                </div>
                <Link href="/admin/ops/production" className="text-xs font-bold" style={{ color: T.brand }}>
                  القائمة كاملة ←
                </Link>
              </div>
              <div className="space-y-2">
                {[...plan.shopping].sort((a, b) => b.buyKg - a.buyKg).slice(0, 6).map((s) => (
                  <div key={s.key} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: T.bg }}>
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-sm font-bold" style={{ color: T.brand }}>
                      {s.buyKg.toFixed(2)} كجم
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl p-10 text-center mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <ChefHat size={32} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
            <div className="text-sm font-bold mb-1">
              {hasData ? "ما فيه حصص مخططة بعد" : "بيانات العمليات غير محمّلة"}
            </div>
            <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: T.inkSoft }}>
              {hasData
                ? "اختر يوم الدوران وأدخل عدد الحصص، وتطلع قائمة المشتريات تلقائياً."
                : "نفّذ supabase/seed.sql على قاعدة البيانات لتحميل المنيو والمكوّنات والوصفات."}
            </p>
            {hasData && (
              <Link href="/admin/ops/production" className="inline-block mt-4 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brandBright }}>
                فتح خطة الإنتاج
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
            >
              <s.icon size={14} style={{ color: T.brand }} /> {s.label}
            </Link>
          ))}
        </div>

        <div className="text-center text-[11px] mt-8 pb-4" style={{ color: T.inkSoft }}>
          لوحة المطبخ — تشغيل يومي فقط، بدون الأرقام المالية
        </div>
      </div>
    </div>
  );
}
