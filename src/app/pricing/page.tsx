// صفحة الأسعار.
//
// قبل: باقتان بسعرين مكتوبين في الكود (210 و900 ر.س) وقوائم مزايا مخترعة.
// ما لهما مصدر في النظام — سعر الباقة قرار تجاري يدخله التنفيذي، وما انكتب
// بعد (حتى دليل الهوية نفسه يكتبها «[السعر] ر.س / أسبوع»). فالصفحة الآن
// تعرض الأسعار الحقيقية الوحيدة الموجودة: سعر كل صنف معتمد، محسوباً من
// تكلفة وصفته الفعلية ونسبة التكلفة المستهدفة لقسمه. وتقول صراحة إن سعر
// الاشتراك لسه ما اعتُمد، بدل ما ترمي رقماً.

import Link from "next/link";
import { Calculator, ChevronLeft } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { T } from "@/lib/kitchen-shared";
import { BRAND } from "@/lib/brand";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { computeMenu, MAIN_SECTION, type Ingredient, type MenuItem, type RecipeLine, type Settings } from "@/lib/ops/engine";
import baseSettings from "@/data/ops/settings.json";

export const dynamic = "force-dynamic";
export const metadata = { title: "الأسعار — Macro Meals" };

async function loadPrices() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("ops_menu_items").select("*");
  if (!data || data.length === 0) return null;

  const [{ default: ingredients }, { default: recipes }] = await Promise.all([
    import("@/data/ops/ingredients.json"),
    import("@/data/ops/recipes.json"),
  ]);

  const items: MenuItem[] = data.map((m) => ({
    id: String(m.id), section: String(m.section ?? ""), category: String(m.category ?? ""),
    name: String(m.name ?? ""), nameEn: String(m.name_en ?? ""), cuisine: String(m.cuisine ?? ""),
    identity: String(m.identity ?? ""), shelfLifeH: Number(m.shelf_life_h ?? 0),
    reheat: "", opsNote: "", method: "", engGroup: String(m.eng_group ?? ""),
  }));
  const ids = new Set(items.map((m) => m.id));

  const computed = computeMenu({
    ingredients: ingredients as Ingredient[],
    recipes: (recipes as RecipeLine[]).filter((r) => ids.has(r.sku)),
    menu: items,
    rotation: { slotLabels: [], slotRule: [], days: [], rules: "" },
    settings: baseSettings as unknown as Settings,
    gateDefs: [],
    ingApprovalDefs: [],
  });
  if (computed.length === 0) return null;

  const prices = computed.map((c) => c.price).sort((a, b) => a - b);
  const mains = computed.filter((c) => c.item.section === MAIN_SECTION);
  return {
    count: computed.length,
    min: prices[0],
    max: prices[prices.length - 1],
    mainAvg: mains.length ? mains.reduce((a, c) => a + c.price, 0) / mains.length : null,
    sections: [...new Set(computed.map((c) => c.item.section))],
  };
}

export default async function PricingPage() {
  const p = await loadPrices();
  const num = (n: number) => Math.round(n).toLocaleString("en-US");

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <SiteNav />

      <section style={{ background: BRAND.forest }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-14 text-center">
          <span
            className="inline-block rounded-full px-3 py-1 text-[10px] font-bold mb-5"
            style={{ border: `1px solid ${BRAND.lime}55`, color: BRAND.lime }}
          >
            الأسعار
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
            <span style={{ color: "#FFFFFF" }}>سعر محسوب..</span>
            <br />
            <span style={{ color: BRAND.lime }}>مو مُقدّر.</span>
          </h1>
          <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: BRAND.mist }}>
            سعر كل صنف يطلع من تكلفة وصفته الفعلية — المكوّنات بأسعارها، والهدر،
            والتغليف، والعمالة — مضروبة في نسبة التكلفة المستهدفة لقسمه. ما فيه رقم
            مكتوب باليد في أي مكان.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-14">
        {p ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <Stat label="أصناف معتمدة" value={num(p.count)} hint={p.sections.join(" · ")} />
              <Stat label="نطاق السعر" value={`${num(p.min)} – ${num(p.max)} ﷼`} hint="لكل حصة، شامل التغليف" />
              <Stat
                label="متوسط الطبق الرئيسي"
                value={p.mainAvg !== null ? `${num(p.mainAvg)} ﷼` : "—"}
                hint={p.mainAvg !== null ? "محسوب من الأصناف المعتمدة" : "ما فيه رئيسي معتمد بعد"}
              />
            </div>

            <div className="rounded-3xl p-6 sm:p-8 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={18} style={{ color: BRAND.limeText }} />
                <h2 className="text-base font-extrabold">كيف يُحسب السعر</h2>
              </div>
              <ol className="space-y-2.5 text-sm leading-relaxed" style={{ color: T.inkSoft }}>
                <Step n="١">تكلفة مكوّنات الوصفة بأسعار الشراء المعتمدة، بالجرام.</Step>
                <Step n="٢">
                  يُضاف الهدر <span className="num font-bold">{Math.round((baseSettings as unknown as Settings).wastePct * 100)}%</span>،
                  وبدل البهارات، وتغليف القسم وعمالته.
                </Step>
                <Step n="٣">يُقسم الناتج على نسبة التكلفة المستهدفة للقسم، ويُقرّب لأقرب ريال.</Step>
              </ol>
            </div>

            <div className="rounded-3xl p-6 sm:p-8" style={{ background: BRAND.cream, border: `1px solid ${T.border}` }}>
              <h2 className="text-base font-extrabold mb-2">باقات الاشتراك</h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: T.inkSoft }}>
                سعر الباقة الأسبوعية والشهرية قرار تجاري ما اعتُمد بعد. ما نعرض رقماً
                قبل اعتماده — الأسعار فوق هي أسعار الحصة الفعلية المعتمدة اليوم.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/menu"
                  className="rounded-full px-5 py-2.5 text-sm font-extrabold flex items-center gap-1"
                  style={{ background: T.brandBright, color: T.onBright }}
                >
                  شوف المنيو وأسعاره <ChevronLeft size={15} />
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full px-5 py-2.5 text-sm font-bold"
                  style={{ background: T.surface, color: T.brand, border: `1px solid ${T.border}` }}
                >
                  اسأل عن الاشتراك
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl p-10 text-center max-w-md mx-auto" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <Calculator size={30} style={{ color: T.inkSoft }} className="mx-auto mb-3" />
            <div className="text-sm font-bold mb-1">ما فيه أسعار منشورة بعد</div>
            <p className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
              السعر يُحسب من وصفة الصنف، وما يُنشر إلا بعد اعتماد الصنف من كل بوابات
              الجودة النشطة.
            </p>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="text-xs mb-1.5" style={{ color: T.inkSoft }}>{label}</div>
      <div className="num text-xl font-extrabold leading-none" style={{ color: BRAND.forest }}>{value}</div>
      <div className="text-[11px] mt-2" style={{ color: T.inkSoft }}>{hint}</div>
    </div>
  );
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="shrink-0 rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-extrabold mt-0.5"
        style={{ background: BRAND.lime, color: BRAND.ink }}
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
