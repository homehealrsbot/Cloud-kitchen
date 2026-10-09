"use client";

// القواعد: مين يرسل إيش، ومين يعتمد إيش، وأي محور يدخل قرار الإطلاق.
//
// هذي الشاشة تعدّل الجداول اللي يقرأها المحرّك وتقرأها سياسات RLS، فسلطة
// الاعتماد تنتقل من هنا بلا تعديل كود ولا نشر.
//
// وفيها حدّان مقصودان:
//  • بنية النوع (الجدول والاستراتيجية والأعمدة) ما تُعدَّل من الواجهة. هي
//    القائمة البيضاء اللي تحصر إيش يقدر الاعتماد يكتب؛ توسيعها من الواجهة
//    يعني إن نوعاً واحداً يكفي للكتابة في أي جدول.
//  • «قاعدة إرسال واعتماد» نفسها ما تُنقل سلطتها. لو نُقلت، صار من يملكها
//    يعطي نفسه سلطة الاعتماد على كل شي. القاعدة ترفضها بمحفّز، والواجهة
//    تمنعها هنا برسالة مفهومة.

import { useState, useTransition } from "react";
import { ChefHat, Lock, Rocket, ScrollText, ShieldCheck, TrendingUp } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { ROLES, Role } from "@/lib/ops/roles";
import { useStage } from "@/lib/ops/stage";
import type { ChangeKind } from "@/lib/ops/changes";
import { AXIS_KIND_DESC, type LaunchAxisDef } from "@/lib/ops/launch";

const ROLE_ORDER: Role[] = ["executive", "kitchen", "quality"];

const ROLE_ICON: Record<Role, React.ReactNode> = {
  executive: <TrendingUp size={11} />,
  kitchen: <ChefHat size={11} />,
  quality: <ShieldCheck size={11} />,
};

/** النوع اللي يعدّل القواعد — سلطته ثابتة، فنعرضها مقفولة لا قابلة للنقر. */
const META_KIND = "change_kind.set";

export default function RuleManager({
  kinds,
  axes,
}: {
  kinds: ChangeKind[];
  axes: LaunchAxisDef[];
}) {
  const stage = useStage();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: "أُضيف للمسوّدة — اضغط «إرسال» تحت" } : { ok: false, text: r.error ?? "تعذّر" });
    });
  }

  function editKind(k: ChangeKind, next: Partial<Pick<ChangeKind, "requesterRoles" | "approverRole" | "active">>) {
    const before = {
      label: k.label,
      requesterRoles: k.requesterRoles,
      approverRole: k.approverRole,
      active: k.active,
      note: k.note,
    };
    run(() => stage.setChangeKind({ kind: k.kind, ...before, ...next }, before));
  }

  // الأنواع الموقوفة هنا مو «معطّلة»: هي وقائع تُكتب في حينها بمسارها الخاص،
  // فتفعيلها ما يحوّلها لطلب — ولهذا نعرضها مقروءة بشرحها بدل زر ما يسوي شي.
  const live = kinds.filter((k) => k.active || k.kind === META_KIND);
  const facts = kinds.filter((k) => !k.active && k.kind !== META_KIND);

  const areas = [...new Set(live.map((k) => k.area))];

  return (
    <div className="space-y-5">
      {msg && (
        <div
          className="rounded-xl px-4 py-2.5 text-xs font-bold"
          style={
            msg.ok
              ? { background: T.brandTint, color: T.brand }
              : { background: "#fdecea", color: "#a32019" }
          }
        >
          {msg.text}
        </div>
      )}

      {/* ---------- قواعد الإرسال والاعتماد ---------- */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 mb-1">
          <ScrollText size={16} style={{ color: T.brand }} />
          <div className="font-semibold text-sm">قواعد الإرسال والاعتماد — {live.length}</div>
        </div>
        <p className="text-[11px] leading-relaxed mb-5 max-w-2xl" style={{ color: T.inkSoft }}>
          لكل نوع تغيير سطر: مين يقدر يرسله، ومين يعتمده. الدور اللي ما هو
          مُحدَّد في «يرسله» ما يشوف زر التعديل أصلاً، ولو نادى الـAPI مباشرة
          تَرُدّه القاعدة. وإيقاف نوع يجمّد إدخاله كاملاً — لا إرسال ولا اعتماد.
        </p>

        <div className="space-y-5">
          {areas.map((area) => (
            <div key={area}>
              <div className="text-[11px] font-bold mb-2" style={{ color: T.brand }}>{area}</div>
              <div className="space-y-2">
                {live
                  .filter((k) => k.area === area)
                  .map((k) => {
                    const locked = k.kind === META_KIND;
                    return (
                      <div
                        key={k.kind}
                        className="rounded-xl px-3.5 py-3"
                        style={{ background: T.bg, opacity: k.active ? 1 : 0.55 }}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold">{k.label}</span>
                              {locked && (
                                <span
                                  className="flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 font-bold"
                                  style={{ background: T.brandTint, color: T.brand }}
                                >
                                  <Lock size={9} /> سلطتها ثابتة
                                </span>
                              )}
                              {!k.active && (
                                <span
                                  className="text-[10px] rounded-full px-2 py-0.5 font-bold"
                                  style={{ background: "#fdecea", color: "#a32019" }}
                                >
                                  مجمّد
                                </span>
                              )}
                            </div>
                            {k.note && (
                              <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: T.inkSoft }}>
                                {k.note}
                              </div>
                            )}
                            <div className="text-[10px] mt-1" dir="ltr" style={{ color: T.inkSoft }}>
                              {k.targetTable} · {k.patchColumns.join(", ")}
                            </div>
                          </div>

                          <button
                            onClick={() => editKind(k, { active: !k.active })}
                            disabled={pending || locked}
                            className="rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-40 shrink-0"
                            style={
                              k.active
                                ? { background: "#fdecea", color: "#a32019" }
                                : { background: T.brandTint, color: T.brand }
                            }
                          >
                            {k.active ? "جمّد" : "فعّل"}
                          </button>
                        </div>

                        <div className="flex items-end gap-5 flex-wrap mt-3">
                          <div>
                            <div className="text-[10px] mb-1.5" style={{ color: T.inkSoft }}>يرسله</div>
                            <div className="flex items-center gap-1.5">
                              {ROLE_ORDER.map((r) => {
                                const on = k.requesterRoles.includes(r);
                                const last = on && k.requesterRoles.length === 1;
                                return (
                                  <button
                                    key={r}
                                    onClick={() =>
                                      editKind(k, {
                                        requesterRoles: on
                                          ? k.requesterRoles.filter((x) => x !== r)
                                          : [...k.requesterRoles, r],
                                      })
                                    }
                                    disabled={pending || locked || last}
                                    title={
                                      last
                                        ? "لازم دور واحد على الأقل يقدر يرسل"
                                        : locked
                                          ? "سلطة هذي القاعدة ثابتة"
                                          : undefined
                                    }
                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-45"
                                    style={
                                      on
                                        ? { background: T.brandBright, color: "#0B1410" }
                                        : { background: T.surface, color: T.inkSoft, border: `1px solid ${T.border}` }
                                    }
                                  >
                                    {ROLE_ICON[r]} {ROLES[r].label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] mb-1.5" style={{ color: T.inkSoft }}>يعتمده</div>
                            <select
                              value={k.approverRole}
                              onChange={(e) => editKind(k, { approverRole: e.target.value })}
                              disabled={pending || locked}
                              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none disabled:opacity-45"
                              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
                            >
                              {ROLE_ORDER.map((r) => (
                                <option key={r} value={r}>{ROLES[r].label}</option>
                              ))}
                            </select>
                          </div>

                          {k.requesterRoles.length === 1 && k.requesterRoles[0] === k.approverRole && (
                            <div className="text-[10px] leading-relaxed max-w-[15rem]" style={{ color: T.inkSoft }}>
                              المرسِل هو المعتمِد — يُطبَّق فوراً ويُسجَّل «اعتماد ذاتي» باسمه
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- وقائع فورية ---------- */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="font-semibold text-sm mb-1">وقائع تُسجَّل فوراً — {facts.length}</div>
        <p className="text-[11px] leading-relaxed mb-4 max-w-2xl" style={{ color: T.inkSoft }}>
          هذي ما تمر بمسار الاعتماد بقصد: قياس حرارة الساعة ٢ مو طلب تغيير، هو
          حدث صار. تأجيله لحين الاعتماد يخلّي السجل يكذب على نفسه — وسجل
          المراقبة هذا هو اللي يحميك أمام أي جهة رقابية. فتُكتب في حينها
          بصلاحية صاحبها، ويبقى من رفعها ووقته في الصف.
        </p>
        <div className="flex flex-wrap gap-2">
          {facts.map((k) => (
            <div
              key={k.kind}
              className="rounded-xl px-3 py-2 text-[11px]"
              style={{ background: T.bg, border: `1px solid ${T.border}` }}
            >
              <span className="font-bold">{k.label}</span>
              <span style={{ color: T.inkSoft }}> · {k.area}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- محاور قرار الإطلاق ---------- */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 mb-1">
          <Rocket size={16} style={{ color: T.brand }} />
          <div className="font-semibold text-sm">
            محاور قرار الإطلاق — {axes.filter((a) => a.active).length} من {axes.length} نشط
          </div>
        </div>
        <p className="text-[11px] leading-relaxed mb-4 max-w-2xl" style={{ color: T.inkSoft }}>
          قرار «جاهز / غير جاهز» يُحسب من المحاور النشطة وحدها. إيقاف محور يرفع
          شرطه عن القرار — فالقرار يصير أسهل، لا أدق. طريقة حساب كل محور في
          الكود (ما يُغيَّر من هنا)، والنشاط والاسم من هنا.
        </p>

        <div className="space-y-2">
          {[...axes]
            .sort((a, b) => a.index - b.index)
            .map((a) => (
              <div
                key={a.index}
                className="rounded-xl px-3.5 py-3 flex items-start justify-between gap-3 flex-wrap"
                style={{ background: T.bg, opacity: a.active ? 1 : 0.55 }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{a.label}</span>
                    {!a.active && (
                      <span
                        className="text-[10px] rounded-full px-2 py-0.5 font-bold"
                        style={{ background: "#fdecea", color: "#a32019" }}
                      >
                        خارج القرار
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: T.inkSoft }}>
                    {AXIS_KIND_DESC[a.kind]}
                  </div>
                </div>
                <button
                  onClick={() =>
                    run(() =>
                      stage.setLaunchAxis(
                        { index: a.index, label: a.label, active: !a.active, note: a.note },
                        { label: a.label, active: a.active, note: a.note },
                      ),
                    )
                  }
                  disabled={pending}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-40 shrink-0"
                  style={
                    a.active
                      ? { background: "#fdecea", color: "#a32019" }
                      : { background: T.brandTint, color: T.brand }
                  }
                >
                  {a.active ? "ارفعه عن القرار" : "أدخله في القرار"}
                </button>
              </div>
            ))}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: T.inkSoft }}>
        بنية كل نوع — الجدول اللي يكتب فيه والأعمدة اللي يسمح بها — ما تُعدَّل من
        هنا ولا من أي شاشة. هي القائمة البيضاء اللي تحصر إيش يقدر الاعتماد يكتب،
        فلو توسّعت من الواجهة صار نوعٌ واحد يكفي للكتابة في أي جدول. تتغيّر مع
        تحديث للنظام، ومحفّز في القاعدة يرفض غير ذلك.
      </p>
    </div>
  );
}
