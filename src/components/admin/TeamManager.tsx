"use client";

// شاشة الفريق والصلاحيات — مكوّن عميل للنموذج فقط. القائمة تجي محسوبة من
// الخادم، والكتابة ترجع للخادم عبر Server Action ثم تُفحص مرة ثانية في
// القاعدة. ما فيه أي قرار صلاحية يُتخذ هنا.

import { useState, useTransition } from "react";
import { ShieldCheck, ChefHat, TrendingUp, UserPlus, Check, X } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import { ROLES, Role } from "@/lib/ops/roles";
import { setStaff, type TeamMember } from "@/app/admin/team/actions";

const ROLE_ICON: Record<Role, React.ReactNode> = {
  executive: <TrendingUp size={14} />,
  kitchen: <ChefHat size={14} />,
  quality: <ShieldCheck size={14} />,
};

const ROLE_ORDER: Role[] = ["executive", "kitchen", "quality"];

export default function TeamManager({ team, myEmail }: { team: TeamMember[]; myEmail: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("kitchen");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(payload: { email: string; role: string; name: string; active: boolean }, clear = false) {
    setMsg(null);
    start(async () => {
      const r = await setStaff(payload);
      if (r.ok) {
        setMsg({ ok: true, text: "تم الحفظ" });
        if (clear) {
          setEmail("");
          setName("");
        }
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* ---------- إضافة أو تعديل بالإيميل ---------- */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={16} style={{ color: T.brand }} />
          <div className="font-semibold text-sm">إضافة موظف أو تعديل دوره</div>
        </div>
        <p className="text-[11px] leading-relaxed mb-4" style={{ color: T.inkSoft }}>
          لازم يكون للموظف حساب أولاً — يسجّل بنفسه من صفحة التسجيل أو تضيفه من
          لوحة Supabase. بعدها تعطيه الدور من هنا. نفس النموذج يعدّل دور موظف
          موجود: اكتب إيميله واختر الدور الجديد.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_auto_auto] gap-2.5">
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.ink }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم (اختياري)"
            className="rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.ink }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.ink }}
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>{ROLES[r].label}</option>
            ))}
          </select>
          <button
            onClick={() => submit({ email, role, name, active: true }, true)}
            disabled={pending || !email.trim()}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-45"
            style={{ background: T.brandBright }}
          >
            {pending ? "..." : "حفظ"}
          </button>
        </div>

        <p className="text-[11px] mt-3" style={{ color: T.inkSoft }}>
          {ROLES[role].desc}
        </p>

        {msg && (
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-3 text-xs"
            style={{
              background: msg.ok ? T.brandTint : "#fdecea",
              color: msg.ok ? T.brand : "#a32019",
            }}
          >
            {msg.ok ? <Check size={14} className="mt-0.5 shrink-0" /> : <X size={14} className="mt-0.5 shrink-0" />}
            <span className="leading-relaxed">{msg.text}</span>
          </div>
        )}
      </div>

      {/* ---------- الفريق الحالي ---------- */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-3.5 border-b font-semibold text-sm" style={{ borderColor: T.border }}>
          الفريق الحالي — {team.length}
        </div>

        {team.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs" style={{ color: T.inkSoft }}>
            ما فيه موظفون بعد
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: T.border }}>
            {team.map((m) => {
              const isMe = m.email.toLowerCase() === myEmail.toLowerCase();
              return (
                <div key={m.user_id} className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{m.name || "—"}</span>
                      {isMe && (
                        <span className="text-[10px] rounded-full px-2 py-0.5 font-bold"
                              style={{ background: T.brandTint, color: T.brand }}>أنت</span>
                      )}
                      {!m.active && (
                        <span className="text-[10px] rounded-full px-2 py-0.5 font-bold"
                              style={{ background: "#fdecea", color: "#a32019" }}>موقوف</span>
                      )}
                    </div>
                    <div className="text-[11px] mt-0.5" dir="ltr" style={{ color: T.inkSoft }}>{m.email}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1 font-bold"
                          style={{ background: T.brandTint, color: T.brand }}>
                      {ROLE_ICON[m.role]} {ROLES[m.role].label}
                    </span>

                    <select
                      value={m.role}
                      onChange={(e) =>
                        submit({ email: m.email, role: e.target.value, name: m.name, active: m.active })
                      }
                      disabled={pending}
                      className="rounded-lg px-2 py-1.5 text-[11px] outline-none"
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.ink }}
                    >
                      {ROLE_ORDER.map((r) => (
                        <option key={r} value={r}>{ROLES[r].label}</option>
                      ))}
                    </select>

                    <button
                      onClick={() =>
                        submit({ email: m.email, role: m.role, name: m.name, active: !m.active })
                      }
                      disabled={pending}
                      className="rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-45"
                      style={
                        m.active
                          ? { background: "#fdecea", color: "#a32019" }
                          : { background: T.brandTint, color: T.brand }
                      }
                    >
                      {m.active ? "إيقاف" : "تنشيط"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: T.inkSoft }}>
        الإيقاف أفضل من الحذف: سجل التعديلات وسجلات السلامة تشير إلى الموظف،
        والإيقاف يحفظ التاريخ ويقطع الصلاحية فوراً. وما يمكن إيقاف آخر حساب
        إدارة تنفيذية نشط — القاعدة ترفضه حتى لا يُقفل النظام على نفسه.
      </p>
    </div>
  );
}
