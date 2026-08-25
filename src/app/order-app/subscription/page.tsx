"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ShieldCheck, Pause, Play, XCircle, Info } from "lucide-react";

const T = {
  bg: "#FCF6F2",
  surface: "#FFFFFF",
  border: "#F0DFD3",
  ink: "#2B1B14",
  inkSoft: "#7A6153",
  brand: "#A84F2E",
  brandBright: "#D67A4F",
  brandTint: "#FBEEE6",
  warn: "#C0392B",
  warnTint: "#FBEBE0",
  good: "#2E9E6D",
  goodTint: "#E5F4ED",
};

type Status = "active" | "paused" | "cancelled";

export default function SubscriptionPage() {
  const [status, setStatus] = useState<Status>("active");
  const [log, setLog] = useState<{ action: string; time: string }[]>([]);
  const [confirmCancel, setConfirmCancel] = useState(false);

  function logAction(action: string) {
    setLog((prev) => [{ action, time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 5));
  }

  function togglePause() {
    if (status === "active") {
      setStatus("paused");
      logAction("تم إيقاف الاشتراك مؤقتاً");
    } else if (status === "paused") {
      setStatus("active");
      logAction("تم استئناف الاشتراك");
    }
  }

  function cancelSubscription() {
    setStatus("cancelled");
    logAction("تم إلغاء الاشتراك نهائياً");
    setConfirmCancel(false);
  }

  const statusMeta: Record<Status, { label: string; bg: string; fg: string }> = {
    active: { label: "نشط", bg: T.goodTint, fg: T.good },
    paused: { label: "متوقف مؤقتاً", bg: T.warnTint, fg: T.warn },
    cancelled: { label: "ملغى", bg: "#F3E8E4", fg: T.inkSoft },
  };

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} style={{ color: T.brand }} />
            <span className="font-bold text-sm" style={{ color: T.brand }}>اشتراكي</span>
          </div>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6" style={{ background: T.brandTint }}>
          <Info size={16} style={{ color: T.brand }} className="mt-0.5 shrink-0" />
          <p className="text-[11.5px] leading-relaxed" style={{ color: T.brand }}>
            التحكم بالاشتراك بالكامل بيدك — إيقاف أو إلغاء فوري وذاتي، بدون اتصال أو موافقة من أحد.
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs" style={{ color: T.inkSoft }}>الخطة الحالية</div>
              <div className="text-sm font-bold mt-0.5">تنزيل وزن — أسبوعية</div>
            </div>
            <span
              className="text-[11px] font-semibold rounded-full px-2.5 py-1"
              style={{ background: statusMeta[status].bg, color: statusMeta[status].fg }}
            >
              {statusMeta[status].label}
            </span>
          </div>
        </div>

        {status !== "cancelled" && (
          <>
            <button
              onClick={togglePause}
              className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold mb-3 transition-colors"
              style={{
                background: status === "paused" ? T.brandBright : T.surface,
                color: status === "paused" ? "#fff" : T.ink,
                border: `1px solid ${status === "paused" ? T.brandBright : T.border}`,
              }}
            >
              {status === "paused" ? <Play size={16} /> : <Pause size={16} />}
              {status === "paused" ? "استئناف الاشتراك الآن" : "إيقاف الاشتراك مؤقتاً"}
            </button>

            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold"
                style={{ background: "transparent", color: T.warn, border: `1px solid ${T.warn}` }}
              >
                <XCircle size={16} />
                إلغاء الاشتراك نهائياً
              </button>
            ) : (
              <div className="rounded-2xl p-4" style={{ background: T.warnTint, border: `1px solid ${T.warn}` }}>
                <div className="text-xs font-bold mb-3" style={{ color: T.warn }}>
                  متأكد إنك تبي تلغي الاشتراك نهائياً؟ هذا القرار فوري ولا يحتاج موافقة أحد.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={cancelSubscription}
                    className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white"
                    style={{ background: T.warn }}
                  >
                    نعم، ألغِ الاشتراك
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 rounded-xl py-2.5 text-xs font-bold"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {status === "cancelled" && (
          <div className="rounded-2xl p-4 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-sm font-bold" style={{ color: T.inkSoft }}>تم إلغاء اشتراكك</div>
            <div className="text-xs mt-1" style={{ color: T.inkSoft }}>تقدر تشترك من جديد في أي وقت</div>
          </div>
        )}

        {log.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-bold mb-2" style={{ color: T.inkSoft }}>سجل إجراءاتك</div>
            <div className="space-y-1.5">
              {log.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] rounded-lg px-3 py-2" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <span>{l.action}</span>
                  <span style={{ color: T.inkSoft }}>{l.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
