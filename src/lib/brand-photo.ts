// صور الأصناف.
//
// ما عندنا تصوير لكل صنف بعد — عندنا صور الهوية فقط. فبدل ما نكرر صورة وحدة
// على كل البطاقات، نوزّعها توزيعاً ثابتاً بحسب رمز الصنف: نفس الصنف يطلع له
// نفس الصورة دايماً، في الموقع وفي التطبيق وفي صفحة الصنف. أول ما يجي تصوير
// فعلي، يُضاف حقل صورة للصنف وتُستبدل هذي الدالة بقراءته.

const PHOTOS = [
  "/brand/meal-chicken.jpg",
  "/brand/menu-bowl.jpg",
  "/brand/plans-bowl.jpg",
  "/brand/steps-bowl.jpg",
  "/brand/hero-bowl.jpg",
] as const;

export function mealPhoto(sku: string): string {
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  return PHOTOS[h % PHOTOS.length];
}
