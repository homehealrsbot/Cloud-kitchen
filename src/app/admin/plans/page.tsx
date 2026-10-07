"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Plus, Trash2, Layers } from "lucide-react";
import { SubscriptionPlan, usePlans, savePlans, T } from "@/lib/kitchen-shared";


export default function PlansPage() {
  const plans = usePlans();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");

  function addPlan() {
    if (!name.trim() || !desc.trim()) {
      setError("عبّي اسم الخطة ووصفها قبل الإضافة");
      return;
    }
    setError("");
    const newPlan: SubscriptionPlan = { id: crypto.randomUUID(), name: name.trim(), desc: desc.trim(), icon: "leaf" };
    savePlans([newPlan, ...plans]);
    setName("");
    setDesc("");
  }

  function removePlan(id: string) {
    savePlans(plans.filter((p) => p.id !== id));
  }

  return (
    <div style={{ background: T.bg, color: T.ink }} className="min-h-screen w-full">
      <div className="w-full border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="Food Style" width={36} height={36} className="rounded-xl" />
            <div>
              <div className="font-bold text-base leading-none" style={{ color: T.brand }}>برامج الاشتراك</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>إدارة خطط الاشتراك اللي تظهر للعميل</div>
            </div>
          </div>
          <Link href="/admin/kitchen" className="flex items-center gap-1 text-xs font-bold" style={{ color: T.inkSoft }}>
            رجوع للوحة المطبخ
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="rounded-2xl p-4 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-sm font-bold mb-3">إضافة برنامج اشتراك جديد</div>
          <input
            placeholder="اسم البرنامج (مثال: خطة الصيام المتقطع)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm mb-2"
            style={{ borderColor: T.border }}
          />
          <textarea
            placeholder="وصف مختصر يظهر للعميل"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm mb-3"
            style={{ borderColor: T.border, minHeight: 70, resize: "none" }}
          />
          <button onClick={addPlan} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: T.brandBright }}>
            <Plus size={14} /> إضافة البرنامج
          </button>
          {error && <div className="text-xs font-bold mt-2" style={{ color: T.warn }}>{error}</div>}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} style={{ color: T.brand }} />
          <div className="text-sm font-bold">البرامج المنشورة حالياً ({plans.length})</div>
        </div>

        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div>
                <div className="text-sm font-bold">{p.name}</div>
                <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>{p.desc}</div>
              </div>
              <button onClick={() => removePlan(p.id)} className="rounded-lg p-2" style={{ color: T.warn }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="text-center text-[11px] mt-8 pb-4" style={{ color: T.inkSoft }}>
          أي تعديل هنا ينعكس فوراً على صفحة «اختر خطتك» اللي يشوفها العميل عند التسجيل
        </div>
      </div>
    </div>
  );
}
