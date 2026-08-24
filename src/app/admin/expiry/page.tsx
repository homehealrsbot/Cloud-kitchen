"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, CalendarClock, AlertTriangle, CheckCircle2, Plus } from "lucide-react";

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

type ExpiryRow = { id: number; name: string; expiry: string; batch: string };

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const INIT: ExpiryRow[] = [
  { id: 1, name: "صدر دجاج", expiry: todayPlus(1), batch: "B-114" },
  { id: 2, name: "سلمون", expiry: todayPlus(2), batch: "B-108" },
  { id: 3, name: "حليب قليل الدسم", expiry: todayPlus(4), batch: "B-119" },
  { id: 4, name: "أرز", expiry: todayPlus(30), batch: "B-090" },
  { id: 5, name: "كينوا", expiry: todayPlus(21), batch: "B-097" },
  { id: 6, name: "فواكه طازجة", expiry: todayPlus(3), batch: "B-121" },
  { id: 7, name: "حمص وطحينة", expiry: todayPlus(14), batch: "B-102" },
];

export default function ExpiryPage() {
  const [rows, setRows] = useState<ExpiryRow[]>(INIT);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [batch, setBatch] = useState("");

  function addRow() {
    if (!name || !expiry) return;
    setRows((prev) =>
      [...prev, { id: Date.now(), name, expiry, batch: batch || "—" }].sort(
        (a, b) => daysUntil(a.expiry) - daysUntil(b.expiry)
      )
    );
    setName("");
    setExpiry("");
    setBatch("");
  }

  const sorted = [...rows].sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry));
  const urgent = sorted.filter((r) => daysUntil(r.expiry) <= 2).length;

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-lg leading-none" style={{ color: T.brand }}>Food Style</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>تتبع صلاحية المكونات</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.brand }}>
            رجوع للوحة التحكم
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 42, height: 42, background: urgent > 0 ? T.warnTint : T.goodTint, color: urgent > 0 ? T.warn : T.good }}
          >
            <CalendarClock size={20} />
          </div>
          <div>
            <div className="text-xs" style={{ color: T.inkSoft }}>مكونات تحتاج انتباه خلال يومين</div>
            <div className="text-lg font-extrabold" style={{ color: urgent > 0 ? T.warn : T.good }}>{urgent}</div>
          </div>
        </div>

        {/* إضافة صنف */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-xs font-bold mb-3">إضافة مكوّن جديد</div>
          <div className="grid grid-cols-4 gap-2">
            <input
              placeholder="اسم المكوّن"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
            <input
              placeholder="رقم الدفعة"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: T.border }}
            />
          </div>
          <button
            onClick={addRow}
            className="mt-3 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white"
            style={{ background: T.brandBright }}
          >
            <Plus size={14} /> إضافة
          </button>
        </div>

        {/* الجدول */}
        <div className="space-y-2">
          {sorted.map((row) => {
            const days = daysUntil(row.expiry);
            const isUrgent = days <= 2;
            const isSoon = days > 2 && days <= 5;
            return (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: isUrgent ? T.warnTint : T.surface, border: `1px solid ${isUrgent ? T.warn : T.border}` }}
              >
                <div className="flex items-center gap-2.5">
                  {isUrgent ? (
                    <AlertTriangle size={16} style={{ color: T.warn }} />
                  ) : (
                    <CheckCircle2 size={16} style={{ color: isSoon ? T.brandBright : T.good }} />
                  )}
                  <div>
                    <div className="text-sm font-bold">{row.name}</div>
                    <div className="text-[11px]" style={{ color: T.inkSoft }}>دفعة {row.batch} · ينتهي {row.expiry}</div>
                  </div>
                </div>
                <span
                  className="text-xs font-bold rounded-full px-2.5 py-1"
                  style={{
                    background: isUrgent ? T.warn : isSoon ? "#FCE9D8" : T.goodTint,
                    color: isUrgent ? "#fff" : isSoon ? T.brand : T.good,
                  }}
                >
                  {days <= 0 ? "منتهي" : `${days} يوم`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-center text-[11px] mt-8 pb-4" style={{ color: T.inkSoft }}>
          بيانات تجريبية للتوضيح — لما يربط النظام بقاعدة البيانات، هذا الجدول يتحدث تلقائياً من مخزونكم الفعلي
        </div>
      </div>
    </div>
  );
}
