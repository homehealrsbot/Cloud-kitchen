// وجهة ما بعد الدخول تجي من الـquery string، فهي بيد المهاجم.
//
// فحص `startsWith("/")` وحده ما يكفي: المتصفح يقرأ `//evil.com` عنواناً
// بروتوكولاً-نسبياً فيروح لمضيف خارجي، ويحوّل `\` إلى `/` فيمرّ `/\evil.com`
// بنفس الطريقة. وdocs الإطار تقول صراحة إن redirect يقبل روابط خارجية.
//
// الثغرة هنا تصطاد مستخدماً في أضعف لحظة: سجّل دخوله للتو أو ضغط رابط
// تأكيد وصله بالبريد، فصفحة مستنسخة تطلب كلمة سره تبدو طبيعية تماماً.
//
// القاعدة: مسار مطلق داخل الموقع فقط، وأي شي غيره يسقط للوجهة الافتراضية.
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;

  // المتصفحات تحذف محارف التحكّم والمسافات من العنوان قبل ما تتبعه، فـ
  // "/<tab>/evil.com" يصير "//evil.com" عندها. نرفضها بدل ما ننظّفها.
  if (/[\u0000-\u001F\u007F\s]/.test(raw)) return fallback;

  if (!raw.startsWith("/")) return fallback; // مطلق داخل الموقع فقط
  if (raw.startsWith("//")) return fallback; // بروتوكول-نسبي → مضيف خارجي
  if (raw.startsWith("/\\")) return fallback; // المتصفح يحوّل \ إلى /

  return raw;
}
