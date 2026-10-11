"use client";

// شريط المسوّدة — يظهر أسفل أي شاشة إدارة فيها تعديلات ما أُرسلت.
//
// وجوده شرط لصحّة النمط كله: لو التعديل ما يُكتب فوراً ولا شي يقول للمستخدم
// إنه معلّق، يظن إنه حُفظ ويطلع. فالشريط ما يختفي إلا بإرسال أو تراجع.

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronUp, Loader2, Send, Trash2, TriangleAlert, X } from "lucide-react";
import { useDraft } from "@/lib/ops/draft";
import { T } from "@/lib/kitchen-shared";

export default function DraftBar() {
  const d = useDraft();
  const [open, setOpen] = useState(false);

  if (d.items.length === 0 && !d.outcome) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 print:hidden" dir="rtl">
      {/* نتيجة آخر إرسال */}
      {d.outcome && (
        <div
          className="max-w-6xl mx-auto px-4 sm:px-6 pb-2"
        >
          <div
            className="rounded-2xl px-4 py-3 flex items-start gap-2.5 shadow-lg"
            style={
              d.outcome.ok
                ? { background: T.goodTint, border: `1px solid ${T.good}`, color: T.good }
                : { background: T.warnTint, border: `1px solid ${T.warn}`, color: T.warn }
            }
          >
            {d.outcome.ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <TriangleAlert size={17} className="mt-0.5 shrink-0" />}
            <div className="flex-1 min-w-0 text-xs leading-relaxed">
              <div className="font-bold">
                {d.outcome.applied > 0 && `طُبِّق ${d.outcome.applied} تعديل فوراً`}
                {d.outcome.applied > 0 && d.outcome.pending > 0 && " · "}
                {d.outcome.pending > 0 && `${d.outcome.pending} بانتظار اعتماد الإدارة`}
                {d.outcome.applied === 0 && d.outcome.pending === 0 && "ما انرسل شي"}
              </div>
              {d.outcome.errors.map((e, i) => (
                <div key={i} className="mt-1">{e}</div>
              ))}
              {d.outcome.pending > 0 && (
                <Link href="/admin/requests" className="inline-block mt-1.5 underline font-bold">
                  تابع حالة الطلبات
                </Link>
              )}
            </div>
            <button onClick={d.dismiss} aria-label="إخفاء" className="shrink-0">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {d.items.length > 0 && (
        <div style={{ background: T.surface, borderTop: `1px solid ${T.border}` }} className="shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          {/* تفصيل المسوّدة */}
          {open && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 max-h-56 overflow-y-auto">
              <div className="space-y-1.5">
                {d.items.map((it) => (
                  <div
                    key={it.localId}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                    style={{ background: T.bg }}
                  >
                    <span className="text-xs leading-relaxed min-w-0">{it.summary}</span>
                    <button
                      onClick={() => d.unstage(it.localId)}
                      aria-label="تراجع عن هذا التعديل"
                      className="shrink-0"
                      style={{ color: T.inkSoft }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-bold"
              style={{ color: T.brand }}
            >
              <ChevronUp size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
              <span className="num">{d.items.length}</span>
              {d.items.length === 1 ? " تعديل ما أُرسل" : d.items.length === 2 ? " تعديلان ما أُرسلا" : d.items.length <= 10 ? " تعديلات ما أُرسلت" : " تعديلاً ما أُرسل"}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={d.clear}
                disabled={d.pending}
                className="rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40"
                style={{ background: T.bg, color: T.inkSoft, border: `1px solid ${T.border}` }}
              >
                تراجع عن الكل
              </button>
              <button
                onClick={d.submit}
                disabled={d.pending}
                className="rounded-xl px-5 py-2 text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: T.brandBright, color: T.onBright }}
              >
                {d.pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {d.pending ? "جاري الإرسال…" : "إرسال"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
