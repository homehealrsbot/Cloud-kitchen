"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, HeartPulse, Loader2 } from "lucide-react";
import { GOAL_TAGS, HEALTH_CONDITIONS, T, type GoalTag } from "@/lib/kitchen-shared";
import { saveHealthProfile, type CustomerProfile } from "@/app/order-app/profile-actions";

// تقدير تقريبي للسعرات — لأغراض التوصية فقط، مو تشخيص طبي
function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "نقص وزن", goal: "زيادة عضل" as GoalTag };
  if (bmi < 25) return { label: "وزن طبيعي", goal: "ثبات الوزن" as GoalTag };
  if (bmi < 30) return { label: "زيادة وزن", goal: "تنزيل وزن" as GoalTag };
  return { label: "سمنة", goal: "تنزيل وزن" as GoalTag };
}

export default function HealthProfileForm({
  profile,
  allergens,
}: {
  profile: CustomerProfile;
  allergens: string[];
}) {
  const [weight, setWeight] = useState(profile.weightKg?.toString() ?? "");
  const [height, setHeight] = useState(profile.heightCm?.toString() ?? "");
  const [conditions, setConditions] = useState<string[]>(profile.conditions);
  const [allergies, setAllergies] = useState<string[]>(profile.allergies);
  const [goal, setGoal] = useState<GoalTag | "">(profile.healthGoal ?? "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const w = Number(weight);
  const hM = Number(height) / 100;
  const bmi = w > 0 && hM > 0 ? Math.round((w / (hM * hM)) * 10) / 10 : null;
  const cat = bmi !== null ? bmiCategory(bmi) : null;
  const suggested = cat?.goal ?? null;

  function toggle(list: string[], set: (v: string[]) => void, item: string) {
    setMsg(""); setError("");
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  function save() {
    setMsg(""); setError("");
    const chosen = (goal || suggested) as GoalTag | null;
    if (!chosen) { setError("عبّي الوزن والطول أو اختر هدفك الصحي"); return; }
    start(async () => {
      const r = await saveHealthProfile({
        weightKg: w, heightCm: Number(height), conditions, allergies, healthGoal: chosen,
      });
      if (r.ok) setMsg("تم حفظ ملفك الصحي — المطبخ بيعتمد عليه في تحضير وجباتك");
      else setError(r.error);
    });
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse size={18} style={{ color: T.brand }} />
            <span className="font-bold text-sm" style={{ color: T.brand }}>ملفك الصحي</span>
          </div>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <p className="text-xs mb-5 leading-relaxed" style={{ color: T.inkSoft }}>
          بياناتك تُحفظ في حسابك ويعتمد عليها المطبخ فعلياً في التحضير — خصوصاً الحساسيات.
          هذي أداة مطابقة تفضيلات غذائية، مو تشخيص طبي. لأي حالة مزمنة استشر أخصائي تغذية أو طبيبك.
        </p>

        <div className="rounded-2xl p-4 mb-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input
              type="number" min={1} inputMode="decimal" placeholder="الوزن (كجم)"
              value={weight} onChange={(e) => { setWeight(e.target.value); setMsg(""); }}
              className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: T.border }}
            />
            <input
              type="number" min={1} inputMode="decimal" placeholder="الطول (سم)"
              value={height} onChange={(e) => { setHeight(e.target.value); setMsg(""); }}
              className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: T.border }}
            />
          </div>

          {bmi !== null && cat && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ background: T.brandTint }}>
                <div className="text-xs" style={{ color: T.inkSoft }}>مؤشر الكتلة</div>
                <div className="text-sm font-extrabold" style={{ color: T.brand }}>{bmi}</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: T.brandTint }}>
                <div className="text-xs" style={{ color: T.inkSoft }}>التصنيف</div>
                <div className="text-sm font-extrabold" style={{ color: T.brand }}>{cat.label}</div>
              </div>
            </div>
          )}

          <div className="text-xs font-bold mb-2" style={{ color: T.inkSoft }}>
            هدفك الصحي {suggested && !goal ? `(المقترح: ${suggested})` : ""}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {GOAL_TAGS.map((g) => {
              const on = (goal || suggested) === g;
              return (
                <button
                  key={g} onClick={() => { setGoal(g); setMsg(""); }} aria-pressed={on}
                  className="text-xs rounded-full px-3 py-1.5 font-semibold border transition-colors"
                  style={{
                    background: on ? T.brandBright : T.surface,
                    color: on ? "#fff" : T.inkSoft,
                    borderColor: on ? T.brandBright : T.border,
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>

          <div className="text-xs font-bold mb-2" style={{ color: T.inkSoft }}>حالات صحية (اختياري)</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {HEALTH_CONDITIONS.map((c) => {
              const on = conditions.includes(c);
              return (
                <button
                  key={c} onClick={() => toggle(conditions, setConditions, c)} aria-pressed={on}
                  className="text-xs rounded-full px-3 py-1.5 font-semibold border transition-colors"
                  style={{ background: on ? T.brandBright : T.surface, color: on ? "#fff" : T.inkSoft, borderColor: on ? T.brandBright : T.border }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="text-xs font-bold mb-2" style={{ color: T.inkSoft }}>
            حساسية غذائية — المكوّنات المتعارضة تُستبعد من وجباتك
          </div>
          <div className="flex flex-wrap gap-2">
            {allergens.map((a) => {
              const on = allergies.includes(a);
              return (
                <button
                  key={a} onClick={() => toggle(allergies, setAllergies, a)} aria-pressed={on}
                  className="text-xs rounded-full px-3 py-1.5 font-semibold border transition-colors"
                  style={{ background: on ? T.warn : T.surface, color: on ? "#fff" : T.inkSoft, borderColor: on ? T.warn : T.border }}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={save}
          disabled={pending}
          className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-extrabold text-[#0B1410] disabled:opacity-60"
          style={{ background: T.brandBright }}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {pending ? "جاري الحفظ…" : "حفظ ملفي الصحي"}
        </button>

        {msg && <div className="text-xs font-bold text-center mt-3" style={{ color: T.good }}>{msg}</div>}
        {error && <div className="text-xs font-bold text-center mt-3" style={{ color: T.warn }}>{error}</div>}
      </div>
    </div>
  );
}
