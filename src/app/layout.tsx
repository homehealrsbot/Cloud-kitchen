import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BRAND } from "@/lib/brand";

// خطوط الهوية: Tajawal للعربي و Poppins للإنجليزي (كلاهما من Google Fonts).
// مُستضافة محلياً بدل الجلب وقت التشغيل — أسرع، ويشتغل البناء بلا اتصال خارجي،
// وما يسرّب زيارات المستخدمين لنطاق ثالث.
const tajawal = localFont({
  src: [
    { path: "../fonts/Tajawal-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Tajawal-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Tajawal-Bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/Tajawal-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-tajawal",
  display: "swap",
});

const poppins = localFont({
  src: [
    { path: "../fonts/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/Poppins-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
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
        className={`${tajawal.variable} ${poppins.variable} font-sans antialiased`}
        style={{ background: BRAND.cream, color: BRAND.ink }}
      >
        {children}
      </body>
    </html>
  );
}
