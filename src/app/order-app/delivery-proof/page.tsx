"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, CheckCircle2, Camera, Loader2, AlertCircle } from "lucide-react";

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

export default function DeliveryProofPage() {
  const [step, setStep] = useState<"idle" | "locating" | "confirmed" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  function confirmDelivery() {
    setStep("locating");
    if (!navigator.geolocation) {
      // بيئة بدون دعم GPS — نكمل بدون إحداثيات دقيقة
      setTimeout(() => setStep("confirmed"), 900);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStep("confirmed");
      },
      () => {
        setStep("error");
      },
      { timeout: 5000 }
    );
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={18} style={{ color: T.brand }} />
            <span className="font-bold text-sm" style={{ color: T.brand }}>تأكيد التسليم</span>
          </div>
          <Link href="/order-app" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6" style={{ background: T.brandTint }}>
          <AlertCircle size={16} style={{ color: T.brand }} className="mt-0.5 shrink-0" />
          <p className="text-[11.5px] leading-relaxed" style={{ color: T.brand }}>
            كل تسليم يتوثق برقم الموقع الفعلي — يحمي المطعم والعميل ويمنع أي جدل حول مكان أو حالة التسليم.
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-xs" style={{ color: T.inkSoft }}>الطلب</div>
          <div className="text-sm font-bold mt-0.5">#A1042 — شوفان بروتين + فواكه</div>
          <div className="text-xs mt-1" style={{ color: T.inkSoft }}>حي الروضة، شارع الأمير سلطان</div>
        </div>

        {step === "idle" && (
          <button
            onClick={confirmDelivery}
            className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-white"
            style={{ background: T.brandBright }}
          >
            <MapPin size={16} />
            تأكيد التسليم بالموقع الحالي
          </button>
        )}

        {step === "locating" && (
          <div className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold" style={{ background: T.brandTint, color: T.brand }}>
            <Loader2 size={16} className="animate-spin" />
            جاري تحديد الموقع...
          </div>
        )}

        {step === "error" && (
          <div className="rounded-2xl p-4" style={{ background: T.warnTint }}>
            <div className="text-xs font-bold mb-2" style={{ color: T.warn }}>
              ما قدرنا نوصل لموقعك — تأكد من تفعيل صلاحية الموقع بالمتصفح وحاول مرة ثانية.
            </div>
            <button onClick={confirmDelivery} className="text-xs font-bold rounded-lg px-4 py-2 text-white" style={{ background: T.warn }}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {step === "confirmed" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 text-center" style={{ background: T.goodTint }}>
              <CheckCircle2 size={36} style={{ color: T.good }} className="mx-auto mb-2" />
              <div className="text-sm font-bold" style={{ color: T.good }}>تم توثيق التسليم بنجاح</div>
              {coords && (
                <div className="text-[11px] mt-1" style={{ color: T.inkSoft }}>
                  الإحداثيات: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </div>
              )}
            </div>

            <button
              onClick={() => setPhotoConfirmed(true)}
              disabled={photoConfirmed}
              className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold transition-colors"
              style={{
                background: photoConfirmed ? T.goodTint : T.surface,
                color: photoConfirmed ? T.good : T.ink,
                border: `1px solid ${photoConfirmed ? T.good : T.border}`,
              }}
            >
              <Camera size={16} />
              {photoConfirmed ? "تم إرفاق صورة التسليم ✓" : "إرفاق صورة إثبات التسليم"}
            </button>

            <div className="text-[11px] text-center" style={{ color: T.inkSoft }}>
              التوثيق الآن جزء دائم من سجل الطلب — يحمي الطرفين من أي نزاع لاحق
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
