// أدوات مشتركة بين الشاشات.

import { BRAND } from "./brand";
//
// كان هذا الملف يحتوي بيانات محاكاة (أصناف ومكوّنات وأسماء عملاء وهمية) وطبقة
// تخزين في المتصفح تُستخدم كقاعدة بيانات. انحذف كل ذلك: بيانات العمليات صارت في
// Supabase، وتفضيلات العميل صارت أعمدة في جدول customers.

/**
 * ألوان الواجهة، مشتقّة من هوية العلامة في src/lib/brand.ts.
 *
 * الأسماء هي نفسها اللي تستخدمها كل الشاشات (حوالي ألف موضع)، فتبديل القيم
 * هنا يغيّر النظام كله دفعة واحدة — وهذا سبب وجود هذي الطبقة أصلاً.
 *
 * ملاحظة على brandBright: صار الليموني، وهو لون الفعل في الهوية. والنص فوقه
 * حبري لا أبيض — الأبيض على الليموني تباينه 2:1 وما يُقرأ. ولهذا onBright.
 */
export const T = {
  bg: BRAND.cream,
  surface: "#FFFFFF",
  border: "#E4DCCB", // كريمي أغمق — حد يُرى على الكريمي والأبيض
  ink: BRAND.ink,
  inkSoft: "#5C6B62", // رمادي أخضر: تباينه على الكريمي 6.4:1
  brand: BRAND.forest,
  brandBright: BRAND.lime, // لون الفعل
  onBright: BRAND.ink, // النص فوق لون الفعل
  brandTint: "#EBF4DB", // ليموني مخفّف للخلفيات والشارات
  warn: "#B3261E", // إيقاف وخطر
  warnTint: "#FBE9E7",
  good: BRAND.limeText, // معتمد وسليم
  goodTint: "#E9F3DB",
  accent: BRAND.orange, // إبراز بصري: الكارب والشارات الملوّنة
  accentText: BRAND.orangeText, // نفس الإبراز حين يكون نصاً
  accentTint: "#FDF0DC",
};

export const GOAL_TAGS = ["تنزيل وزن", "ثبات الوزن", "زيادة عضل"] as const;
export type GoalTag = (typeof GOAL_TAGS)[number];

export const WEEK_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

export const HEALTH_CONDITIONS = ["سكري", "ضغط مرتفع", "كوليسترول مرتفع"] as const;

export const CUISINES = ["سعودي", "خليجي", "عربي", "آسيوي", "متوسطي", "هندي"] as const;
