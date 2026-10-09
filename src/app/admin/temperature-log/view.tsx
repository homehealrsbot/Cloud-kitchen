"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Thermometer, CheckCircle2, XCircle, Plus } from "lucide-react";

const T = {
  bg: "#FCF6F2",
  surface: "#FFFFFF",
  border: "#F0DFD3",
  ink: "#2B1B14",
  inkSoft: "#7A6153",
  brand: "#A84F2E",
  brandBright: "#D67A4F",
  warn: "#C0392B",
  warnTint: "#FBEBE0",
  good: "#2E9E6D",
  goodTint: "#E5F4ED",
};

// النطاقات الآمنة المعتمدة لسلامة الغذاء
const SAFE_RANGES: Record<string, { min: number; max: number }> = {
  "الثلاجة": { min: 1, max: 5 },
  "الفريزر": { min: -22, max: -18 },
};

type LogRow = { id: number; unit: string; reading: number; staff: string; time: string; pass: boolean };

function timeNow() {
  return new Date().toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

const INIT: LogRow[] = [
  { id: 1, unit: "الثلاجة", reading: 3.5, staff: "فهد", time: "24/08 · 08:05 ص", pass: true },
  { id: 2, unit: "الفريزر", reading: -19, staff: "فهد", time: "24/08 · 08:06 ص", pass: true },
  { id: 3, unit: "الثلاجة", reading: 6.2, staff: "سارة", time: "23/08 · 04:15 م", pass: false },
];

export default function TemperatureLogPage() {
  const [rows, setRows] = useState<LogRow[]>(INIT);
  const [unit, setUnit] = useState("الثلاجة");
  const [reading, setReading] = useState("");
  const [staff, setStaff] = useState("");

  function addRow() {
    if (!reading || !staff) return;
    const val = Number(reading);
    const range = SAFE_RANGES[unit];
    const pass = val >= range.min && val <= range.max;
    setRows((prev) => [{ id: Date.now(), unit, reading: val, staff, time: timeNow(), pass }, ...prev]);
    setReading("");
    setStaff("");
  }

  const failCount = rows.filter((r) => !r.pass).length;

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Food Style</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>سجل درجات حرارة التخزين</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.brand }}>
            رجوع للوحة التحكم
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-xs mb-1" style={{ color: T.inkSoft }}>النطاق الآمن — الثلاجة</div>
            <div className="text-sm font-extrabold">1° إلى 5° مئوية</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-xs mb-1" style={{ color: T.inkSoft }}>النطاق الآمن — الفريزر</div>
            <div className="text-sm font-extrabold">-22° إلى -18° مئوية</div>
          </div>
        </div>

        {failCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6 text-sm font-bold" style={{ background: T.warnTint, color: T.warn }}>
            <XCircle size={16} /> فيه {failCount} قراءة خارج النطاق الآمن — راجعها فوراً
          </div>
        )}

        {/* إضافة قراءة */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-xs font-bold mb-3">تسجيل قراءة جديدة</div>
          <div className="grid grid-cols-4 gap-2">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            >
              <option value="الثلاجة">الثلاجة</option>
              <option value="الفريزر">الفريزر</option>
            </select>
            <input
              placeholder="الحرارة (°م)"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              placeholder="اسم الموظف"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              className="col-span-2 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
          </div>
          <button
            onClick={addRow}
            className="mt-3 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white"
            style={{ background: T.brandBright }}
          >
            <Plus size={14} /> تسجيل
          </button>
        </div>

        {/* السجل */}
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: row.pass ? T.surface : T.warnTint, border: `1px solid ${row.pass ? T.border : T.warn}` }}
            >
              <div className="flex items-center gap-2.5">
                {row.pass ? (
                  <CheckCircle2 size={16} style={{ color: T.good }} />
                ) : (
                  <XCircle size={16} style={{ color: T.warn }} />
                )}
                <div>
                  <div className="text-sm font-bold">{row.unit} — {row.reading}° م</div>
                  <div className="text-[11px]" style={{ color: T.inkSoft }}>{row.staff} · {row.time}</div>
                </div>
              </div>
              <span
                className="text-[11px] font-bold rounded-full px-2.5 py-1"
                style={{ background: row.pass ? T.goodTint : T.warn, color: row.pass ? T.good : "#fff" }}
              >
                {row.pass ? "ضمن النطاق" : "خارج النطاق"}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center text-[11px] mt-8 pb-4" style={{ color: T.inkSoft }}>
          <Thermometer size={11} className="inline ml-1" />
          سجل يومي مطلوب فعلياً ضمن اشتراطات السلامة الغذائية — يُنصح بتسجيل قراءة صباحية ومسائية على الأقل
        </div>
      </div>
    </div>
  );
}
