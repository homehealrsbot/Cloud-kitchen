"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, ChevronRight, Loader2 } from "lucide-react";
import { CUISINES, GOAL_TAGS, T, type GoalTag } from "@/lib/kitchen-shared";
import { saveCuisines, saveHealthProfile, type CustomerProfile } from "@/app/order-app/profile-actions";

const GOAL_DESC: Record<GoalTag, string> = {
  "تنزيل وزن": "سعرات أقل مع بروتين كافٍ للحفاظ على العضل",
  "ثبات الوزن": "وجبات متوازنة ومستدامة بدون قيود متطرفة",
  "زيادة عضل": "بروتين عالي وسعرات أعلى لدعم التمرين",
};

export default function OnboardingFlow({ profile }: { profile: CustomerProfile }) {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [goal, setGoal] = useState<GoalTag | null>(profile.healthGoal);
  const [cuisines, setCuisines] = useState<string[]>(profile.cuisines);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const stages = ["هدفك الصحي", "تفضيلات المطبخ", "التأكيد"];

  function finish() {
    setError("");
    if (!goal) { setError("اختر هدفك الصحي"); return; }
    start(async () => {
      const a = await saveCuisines(cuisines);
      if (!a.ok) { setError(a.error); return; }
      // الوزن والطول يُكملان من صفحة الملف الصحي
      if (profile.weightKg && profile.heightCm) {
        const b = await saveHealthProfile({
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          conditions: profile.conditions,
          allergies: profile.allergies,
          healthGoal: goal,
        });
        if (!b.ok) { setError(b.error); return; }
        router.push("/order-app");
      } else {
        router.push("/order-app/health-profile");
      }
    });
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-sm" style={{ color: T.brand }}>إعداد اشتراكك</span>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع <ChevronRight size={13} />
          </Link>
        </div>
        <div className="max-w-md mx-auto px-5 pb-3 flex items-center gap-2">
          {stages.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: i <= stage ? T.brandBright : T.brandTint, color: i <= stage ? "#fff" : T.brand }}
              >
                {i < stage ? <Check size={12} /> : i + 1}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: i <= stage ? T.brand : T.inkSoft }}>{s}</span>
              {i < stages.length - 1 && <div className="flex-1 h-px" style={{ background: T.border }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        {stage === 0 && (
          <>
            <h1 className="text-lg font-extrabold mb-1">شنو هدفك؟</h1>
            <p className="text-xs mb-5" style={{ color: T.inkSoft }}>تقدر تعدّله أي وقت من ملفك الصحي</p>
            <div className="space-y-2.5 mb-6">
              {GOAL_TAGS.map((g) => {
                const on = goal === g;
                return (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    aria-pressed={on}
                    className="w-full rounded-2xl p-3.5 text-right transition-colors"
                    style={{ background: on ? T.brandTint : T.surface, border: `1.5px solid ${on ? T.brandBright : T.border}` }}
                  >
                    <div className="text-sm font-bold">{g}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{GOAL_DESC[g]}</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStage(1)}
              disabled={!goal}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-[#0B1410] disabled:opacity-40"
              style={{ background: T.brandBright }}
            >
              التالي
            </button>
          </>
        )}

        {stage === 1 && (
          <>
            <h1 className="text-lg font-extrabold mb-1">إيش مطابخك المفضلة؟</h1>
            <p className="text-xs mb-5" style={{ color: T.inkSoft }}>اختر واحد أو أكثر — نوزع وجباتك عليها</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {CUISINES.map((c) => {
                const on = cuisines.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => setCuisines((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}
                    aria-pressed={on}
                    className="rounded-full px-4 py-2 text-sm font-bold border transition-colors"
                    style={{ background: on ? T.brandBright : T.surface, color: on ? "#fff" : T.ink, borderColor: on ? T.brandBright : T.border }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStage(0)} className="rounded-2xl py-3.5 px-5 text-sm font-bold flex items-center gap-1.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <ArrowLeft size={15} /> السابق
              </button>
              <button onClick={() => setStage(2)} className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-[#0B1410]" style={{ background: T.brandBright }}>
                التالي
              </button>
            </div>
          </>
        )}

        {stage === 2 && (
          <>
            <h1 className="text-lg font-extrabold mb-5">تأكيد الإعداد</h1>
            <div className="rounded-2xl p-4 mb-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="text-xs" style={{ color: T.inkSoft }}>الهدف الصحي</div>
              <div className="text-sm font-bold mt-0.5">{goal}</div>
            </div>
            <div className="rounded-2xl p-4 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="text-xs" style={{ color: T.inkSoft }}>المطابخ المفضلة</div>
              <div className="text-sm font-bold mt-0.5">{cuisines.length > 0 ? cuisines.join("، ") : "بدون تفضيل محدد"}</div>
            </div>
            {!profile.weightKg && (
              <div className="rounded-xl px-4 py-3 mb-4 text-[11.5px] leading-relaxed" style={{ background: T.brandTint, color: T.brand }}>
                بعد الحفظ بننقلك لملفك الصحي تكمّل وزنك وطولك وحساسياتك — ضرورية لمطابقة الوجبات.
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStage(1)} className="rounded-2xl py-3.5 px-5 text-sm font-bold flex items-center gap-1.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <ArrowLeft size={15} /> السابق
              </button>
              <button
                onClick={finish}
                disabled={pending}
                className="flex-1 rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: T.good }}
              >
                {pending ? <Loader2 size={16} className="animate-spin" /> : null}
                {pending ? "جاري الحفظ…" : "حفظ وتفعيل"}
              </button>
            </div>
            {error && <div className="text-xs font-bold text-center mt-3" style={{ color: T.warn }}>{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
