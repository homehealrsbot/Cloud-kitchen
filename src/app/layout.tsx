import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// خط Cairo مُستضاف محلياً (بدل الجلب من Google Fonts) — أسرع ويشتغل بدون اتصال خارجي وقت البناء
const cairo = localFont({
  src: [
    { path: "../fonts/Cairo-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Cairo-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Cairo-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/Cairo-Bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/Cairo-Black.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Food Style — نظام اشتراك وجبات صحية",
  description: "Food Style — Cloud Kitchen Subscription System",
  applicationName: "Food Style",
  appleWebApp: { capable: true, title: "Food Style", statusBarStyle: "default" },
};

// لون شريط المتصفح على الجوال + منع التكبير العشوائي في نماذج الإدخال
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#A84F2E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-sans antialiased bg-[#FCF6F2] text-[#2B1B14]`}>
        {children}
      </body>
    </html>
  );
}
