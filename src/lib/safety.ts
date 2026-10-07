// ثوابت سلامة الغذاء — ملف عادي (مو "use server") عشان تقدر الواجهة تستوردها.
// ملف "use server" ما يسمح بتصدير غير الدوال async.

export const SAFE_RANGES: Record<string, { min: number; max: number }> = {
  "الثلاجة": { min: 1, max: 5 },
  "الفريزر": { min: -22, max: -18 },
};
