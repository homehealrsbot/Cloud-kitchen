"use client";

import { useState } from "react";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { T } from "@/lib/kitchen-shared";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

// بيانات التواصل من متغيرات البيئة — بدل نصوص placeholder ظاهرة للعميل
const PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
const WHATSAPP = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  // ما فيه backend للرسائل بعد. بدل ما نعرض "تم الإرسال" وما نرسل شي،
  // نجهّز رسالة واتساب يرسلها العميل بنفسه — تواصل حقيقي بدل تأكيد كاذب.
  const whatsappLink =
    WHATSAPP && name && phone && message
      ? `https://wa.me/${WHATSAPP.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
          `الاسم: ${name}\nالجوال: ${phone}\n\n${message}`,
        )}`
      : "";

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <SiteNav />

      <div className="max-w-3xl mx-auto px-6 py-14 text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ color: T.brand }}>تواصل معنا</h1>
        <p className="text-sm" style={{ color: T.inkSoft }}>عندك سؤال أو استفسار؟ راسلنا وبنرد عليك بأسرع وقت</p>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* معلومات التواصل */}
        <div className="space-y-3">
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: T.brandTint, color: T.brand }}>
              <Phone size={17} />
            </div>
            <div>
              <div className="text-xs" style={{ color: T.inkSoft }}>جوال</div>
              <div className="text-sm font-bold" dir="ltr">{PHONE || "—"}</div>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: T.brandTint, color: T.brand }}>
              <Mail size={17} />
            </div>
            <div>
              <div className="text-xs" style={{ color: T.inkSoft }}>البريد الإلكتروني</div>
              <div className="text-sm font-bold" dir="ltr">{EMAIL || "—"}</div>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: T.brandTint, color: T.brand }}>
              <MessageCircle size={17} />
            </div>
            <div>
              <div className="text-xs" style={{ color: T.inkSoft }}>واتساب</div>
              <div className="text-sm font-bold" dir="ltr">{WHATSAPP || "—"}</div>
            </div>
          </div>
        </div>

        {/* نموذج التواصل */}
        <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <input
            placeholder="اسمك"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm mb-3"
            style={{ borderColor: T.border }}
          />
          <input
            placeholder="رقم جوالك"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm mb-3"
            style={{ borderColor: T.border }}
          />
          <textarea
            placeholder="رسالتك"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm mb-4"
            style={{ borderColor: T.border, minHeight: 100, resize: "none" }}
          />
          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-white"
              style={{ background: T.brandBright }}
            >
              <Send size={15} />
              إرسال عبر واتساب
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full rounded-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-white opacity-50"
              style={{ background: T.brandBright }}
            >
              <Send size={15} />
              {WHATSAPP ? "عبّي الحقول الثلاثة" : "رقم واتساب غير مُعد"}
            </button>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
