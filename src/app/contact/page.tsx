"use client";

import { useState } from "react";
import { Mail, Phone, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function submit() {
    if (!name || !phone || !message) return;
    setSent(true);
  }

  return (
    <div style={{ background: "#FCF6F2", color: "#2B1B14" }} className="min-h-screen w-full">
      <SiteNav />

      <div className="max-w-3xl mx-auto px-6 py-14 text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ color: "#A84F2E" }}>تواصل معنا</h1>
        <p className="text-sm" style={{ color: "#7A6153" }}>عندك سؤال أو استفسار؟ راسلنا وبنرد عليك بأسرع وقت</p>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* معلومات التواصل */}
        <div className="space-y-3">
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "white", border: "1px solid #F0DFD3" }}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: "#FBEEE6", color: "#A84F2E" }}>
              <Phone size={17} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "#7A6153" }}>جوال</div>
              <div className="text-sm font-bold">‎[رقم الجوال]</div>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "white", border: "1px solid #F0DFD3" }}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: "#FBEEE6", color: "#A84F2E" }}>
              <Mail size={17} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "#7A6153" }}>البريد الإلكتروني</div>
              <div className="text-sm font-bold">‎[البريد الإلكتروني]</div>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "white", border: "1px solid #F0DFD3" }}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: "#FBEEE6", color: "#A84F2E" }}>
              <MessageCircle size={17} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "#7A6153" }}>واتساب</div>
              <div className="text-sm font-bold">‎[رقم واتساب]</div>
            </div>
          </div>
        </div>

        {/* نموذج التواصل */}
        <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #F0DFD3" }}>
          {!sent ? (
            <>
              <input
                placeholder="اسمك"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm mb-3"
                style={{ borderColor: "#F0DFD3" }}
              />
              <input
                placeholder="رقم جوالك"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm mb-3"
                style={{ borderColor: "#F0DFD3" }}
              />
              <textarea
                placeholder="رسالتك"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm mb-4"
                style={{ borderColor: "#F0DFD3", minHeight: 100, resize: "none" }}
              />
              <button
                onClick={submit}
                className="w-full rounded-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-white"
                style={{ background: "#D67A4F" }}
              >
                <Send size={15} />
                إرسال الرسالة
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 size={40} style={{ color: "#2E9E6D" }} className="mx-auto mb-3" />
              <div className="text-sm font-bold" style={{ color: "#2E9E6D" }}>تم استلام رسالتك</div>
              <div className="text-xs mt-1" style={{ color: "#7A6153" }}>بنتواصل معك قريباً</div>
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
