// وحدات العمليات ومسار كل واحدة مع الصلاحية اللي تفتحها.
//
// بيانات نقية بلا React ولا "use client": صفحة /admin هي Server Component
// وتحتاج تفلتر الوحدات حسب دور الموظف قبل الإرسال، فلو كانت هذي المصفوفة
// داخل ملف عميل توصلها كمرجع عميل وينكسر .filter وقت التشغيل.

import type { Cap } from "./roles";

export const OPS_MODULES: { href: string; label: string; view: Cap; edit?: Cap; desc: string }[] = [
  { href: "/admin/ops/production", label: "الإنتاج والمشتريات", view: "production.view", edit: "production.edit", desc: "حصص اليوم وقائمة الشراء" },
  { href: "/admin/ops/kitchen-card", label: "بطاقة المطبخ", view: "card.view", desc: "أوزان الدفعة وطريقة التحضير" },
  { href: "/admin/ops/rotation", label: "جدول الدوران", view: "rotation.view", edit: "rotation.edit", desc: "أصناف كل يوم خلال 14 يوم" },
  { href: "/admin/ops/recipes", label: "الوصفات", view: "recipes.view", edit: "recipes.edit", desc: "مكوّنات كل صنف بالجرام" },
  { href: "/admin/ops/ingredients", label: "المكوّنات", view: "ingredients.view", edit: "ingredients.editSpecs", desc: "القيم الغذائية والحساسية والموردون" },
  { href: "/admin/ops/pilot", label: "تجارب Pilot", view: "quality.view", edit: "pilot.edit", desc: "تجارب الطبخ ونتائجها قبل الاعتماد" },
  { href: "/admin/ops/kitchen-gate", label: "بوابة المطبخ", view: "quality.view", edit: "kitchenGate.edit", desc: "فحوص محسوبة وقرار الشيف" },
  { href: "/admin/ops/quality", label: "بوابات الاعتماد", view: "quality.view", edit: "quality.editGates", desc: "اعتماد كل صنف قبل البيع" },
  { href: "/admin/ops/menu", label: "المنيو", view: "ops.view", desc: "53 صنف بحالتها وقيمها" },
  { href: "/admin/ops/engineering", label: "هندسة المنيو", view: "engineering.view", edit: "engineering.view", desc: "تصنيف الأصناف حسب المبيعات والهامش" },
  { href: "/admin/ops/settings", label: "الإعدادات", view: "settings.edit", edit: "settings.edit", desc: "مضاعفات الحصص ونسب التكلفة" },
  { href: "/admin/safety", label: "سلامة الغذاء", view: "safety.view", edit: "safety.plan", desc: "خطة HACCP والحدود الحرجة وبرامج PRP" },
  { href: "/admin/safety/ccp", label: "سجل المراقبة", view: "safety.view", edit: "safety.log", desc: "قراءات النقاط الحرجة اليومية" },
  { href: "/admin/safety/ncr", label: "عدم المطابقة", view: "safety.view", edit: "ncr.manage", desc: "البلاغات وأسبابها الجذرية" },
];
