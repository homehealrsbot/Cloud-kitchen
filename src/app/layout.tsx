import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BRAND } from "@/lib/brand";

// خطوط الهوية: IBM Plex Sans Arabic للعربي، و IBM Plex Sans للاتيني والأرقام.
// عائلة واحدة بوجهين، فـ«Macro Meals» و«42g» و«أكل حقيقي» تُقرأ كخط واحد لا
// كثلاثة خطوط اجتمعت. ومهم لنا تحديداً: أرقامها tabular حقيقية، والملصق
// الغذائي والماكروز تُقرأ بلمحة ولا يرتجف عرض الشارة وهي تتغيّر.
//
// مُستضافة محلياً بدل الجلب وقت التشغيل — أسرع، ويشتغل البناء بلا اتصال
// خارجي، وما يسرّب زيارات المستخدمين لنطاق ثالث. الملفات منسوخة من حزمتَي
// @fontsource/ibm-plex-sans-arabic و @fontsource/ibm-plex-sans (نسخة woff2،
// أخفّ من ttf بنحو الثلثين) والحزمتان غير مثبّتتين: ما يستوردهما شيء.
//
// الوزن 800 مربوط بملف 700 بقصد: العائلة ما فيها 800، وبلا هذا الربط يصطنع
// المتصفح عرضاً زائداً للعناوين (font-extrabold مستعمل في كل الصفحات) فتطلع
// ثقيلة مشوّهة بدل ثقيلة نظيفة.
const plexArabic = localFont({
  src: [
    { path: "../fonts/IBMPlexSansArabic-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexSansArabic-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexSansArabic-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/IBMPlexSansArabic-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/IBMPlexSansArabic-700.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
});

const plexLatin = localFont({
  src: [
    { path: "../fonts/IBMPlexSans-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexSans-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexSans-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/IBMPlexSans-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/IBMPlexSans-700.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-latin",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Macro Meals — أكل حقيقي.. ماكروز محسوبة",
  description:
    "وجبات يطبخها شيفاتنا طازجة كل يوم، البروتين والكارب والدهون محسوبة على هدفك وتوصلك لباب بيتك.",
  applicationName: "Macro Meals",
  appleWebApp: { capable: true, title: "Macro Meals", statusBarStyle: "black-translucent" },
  icons: { icon: "/brand/app-icon.png", apple: "/brand/app-icon.png" },
};

// لون شريط المتصفح = الأخضر الغامق، لون العلامة الأساسي
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND.forest,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${plexArabic.variable} ${plexLatin.variable} font-sans antialiased`}
        style={{ background: BRAND.cream, color: BRAND.ink }}
      >
        {children}
      </body>
    </html>
  );
}
