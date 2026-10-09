// لوحة قرار الإطلاق التجاري — GO / NO-GO ومحاور الجاهزية.
//
// نسخة شاشية من ورقة «لوحة_التحكم»: القرار فوق بسببه، وتحته جدول المحاور
// بأعمدة الورقة نفسها. كل رقم محسوب على الخادم من جداول الأقسام — ما فيه
// إدخال يدوي في هذي الصفحة أصلاً، فما فيها شي يُجمَّل.
//
// الحساب في src/lib/ops/launch.ts والعرض في components/ops/LaunchPanel.tsx،
// فالاثنان يُختبران بلا قاعدة بيانات.

// T من الوحدة النقية لا من components/ops/ui: هذي صفحة خادم، والاستيراد
// من وحدة "use client" يرجّع مرجعاً لا الكائن.
import { T } from "@/lib/kitchen-shared";
import { Card, OpsShell } from "@/components/ops/ui";
import LaunchPanel, { type AxisCheck } from "@/components/ops/LaunchPanel";
import NotConfigured from "@/components/auth/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadLaunchAxes, loadOpsSnapshot } from "@/lib/ops/server-data";
import { loadSafetySnapshot } from "@/lib/safety/server-data";
import { computeMenu } from "@/lib/ops/engine";
import { deriveLaunch, foodSafetyChecks, productionChecks, type AxisKind, type LaunchInput } from "@/lib/ops/launch";

export const dynamic = "force-dynamic";
export const metadata = { title: "قرار الإطلاق — Macro Meals" };

export default async function LaunchPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;

  const [snapshot, safety, axes] = await Promise.all([
    loadOpsSnapshot(),
    loadSafetySnapshot(),
    loadLaunchAxes(),
  ]);

  // بلا إعدادات ما فيه حساب أسعار ولا هوامش ولا حدود — نقول ذلك بدل أصفار
  if (!snapshot.data.settings) {
    return (
      <OpsShell title="قرار الإطلاق" subtitle="GO / NO-GO ومحاور الجاهزية">
        <Card>
          <div className="text-sm font-bold mb-1">ما فيه إعدادات محمّلة</div>
          <p className="text-xs leading-relaxed" style={{ color: T.inkSoft }}>
            القرار يُحسب من الإعدادات وجداول الأقسام. شغّل <code>supabase/seed.sql</code> أولاً.
          </p>
        </Card>
      </OpsShell>
    );
  }

  const input: LaunchInput = {
    data: snapshot.data,
    computed: computeMenu(snapshot.data),
    gates: snapshot.gates,
    ingApprovals: snapshot.ingApprovals,
    pilotTrials: snapshot.pilotTrials,
    kitchenGate: snapshot.kitchenGate,
    production: snapshot.production,
    safety,
    axes,
  };

  const detail: Partial<Record<AxisKind, AxisCheck[]>> = {
    food_safety: foodSafetyChecks(safety),
    production: productionChecks(input),
  };

  return <LaunchPanel d={deriveLaunch(input)} detail={detail} />;
}
