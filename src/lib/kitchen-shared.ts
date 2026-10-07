// أدوات مشتركة بين الشاشات.
//
// كان هذا الملف يحتوي بيانات محاكاة (أصناف ومكوّنات وأسماء عملاء وهمية) وطبقة
// تخزين في المتصفح تُستخدم كقاعدة بيانات. انحذف كل ذلك: بيانات العمليات صارت في
// Supabase، وتفضيلات العميل صارت أعمدة في جدول customers.

export const T = {
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

export const GOAL_TAGS = ["تنزيل وزن", "ثبات الوزن", "زيادة عضل"] as const;
export type GoalTag = (typeof GOAL_TAGS)[number];

export const WEEK_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

export const HEALTH_CONDITIONS = ["سكري", "ضغط مرتفع", "كوليسترول مرتفع"] as const;

export const CUISINES = ["سعودي", "خليجي", "عربي", "آسيوي", "متوسطي", "هندي"] as const;
