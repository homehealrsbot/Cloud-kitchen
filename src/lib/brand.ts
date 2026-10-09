// هوية Macro Meals البصرية — المصدر الوحيد للألوان والنسب.
//
// مأخوذة حرفياً من دليل الهوية (الإصدار 1.0 · 2026)، شريحة الألوان:
//   Forest  #0F2419  أساسي   60%
//   Lime    #8DC63F  مميّز    15%
//   Cream   #F6F0E4  أرضية   20%
//   Orange  #EE9B38  إبراز     5%
//   Ink     #0B1410  النص
//
// النسب مهمة: الليموني لون فعل لا لون خلفية. لو صبغنا به كل شي ضاع أثره،
// ولهذا الأزرار الأساسية ليمونية والخلفيات كريمية أو غابية.

export const BRAND = {
  forest: "#0F2419",
  forestLight: "#16301F", // للبطاقات فوق الغابي
  lime: "#8DC63F",
  limeDeep: "#5E9B25", // رابط أو شارة خضراء
  limeText: "#4A791D", // أخضر يُقرأ نصاً: 4.5:1 على الأبيض والكريمي وتدرّجه
  orangeText: "#A05D0E", // برتقالي يُقرأ نصاً بنفس الشرط
  cream: "#F6F0E4",
  orange: "#EE9B38",
  ink: "#0B1410",
  mist: "#C9D6CD", // رمادي أخضر فاتح
  sage: "#8FA79A", // رمادي أخضر للنص الثانوي على الغامق
} as const;

/**
 * كود ألوان الماكروز — يُستخدم لبيانات التغذية فقط، بنفس الشكل في الموقع
 * والتطبيق والملصقات والبوستات. ثبات هذا الكود هو اللي يخلي العميل يعرف
 * الرقم بلمحة بدل ما يقرأ كل مرة.
 */
export const MACRO = {
  protein: { key: "protein", label: "بروتين", labelEn: "Protein", bg: BRAND.lime, fg: BRAND.ink },
  carbs: { key: "carbs", label: "كارب", labelEn: "Carbs", bg: BRAND.orange, fg: BRAND.ink },
  fat: { key: "fat", label: "دهون", labelEn: "Fat", bg: BRAND.cream, fg: BRAND.ink },
} as const;

export type MacroKey = keyof typeof MACRO;

/** جوهر العلامة كما في الدليل — يُستخدم في البنرات والعناوين. */
export const ESSENCE = {
  ar: { line1: "أكل حقيقي..", line2: "ماكروز محسوبة." },
  en: { line1: "Real food.", line2: "Counted macros." },
} as const;

/** ركائز العلامة الثلاث. */
export const PILLARS = [
  {
    title: "أكل حقيقي",
    titleEn: "Real food",
    body: "مكونات حقيقية تُطبخ طازجة كل يوم، بدون شي مخفي.",
  },
  {
    title: "ماكروز محسوبة",
    titleEn: "Counted macros",
    body: "البروتين والكارب والدهون محسوبة لكل حصة ومطبوعة على كل ملصق.",
  },
  {
    title: "مصمم لهدفك",
    titleEn: "Made for your goal",
    body: "باقات لخسارة الدهون والبروتين العالي والأكل المتوازن.",
  },
] as const;

/** الخطوات الثلاث كما في مواد العلامة. */
export const STEPS = [
  { n: "01", title: "حدّد هدفك", body: "ونحدد لك ماكروزك اليومية" },
  { n: "02", title: "نطبخ ونحسب", body: "طازج كل يوم وكل حصة موزونة" },
  { n: "03", title: "توصلك طازجة", body: "مبرّدة وعليها ملصقها، جاهزة" },
] as const;

/** ملفات الشعار المعتمدة. لا تُعاد تلوينها ولا تُمطّ — قاعدة من الدليل. */
export const LOGO = {
  onLight: "/brand/logo-horizontal-light.png",
  onDark: "/brand/logo-horizontal-dark.png",
  stacked: "/brand/logo-stacked.png",
  symbol: "/brand/logo-symbol.png", // داكن — للخلفيات الفاتحة
  symbolOnDark: "/brand/logo-symbol-on-dark.png",
  appIcon: "/brand/app-icon.png",
} as const;
