import type { Metadata } from "next";
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
  title: "سَلِس حلول — نظام اشتراك وجبات صحية",
  description: "Salis Solutions — Cloud Kitchen Subscription System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-sans antialiased bg-[#F4F9F8] text-[#12211F]`}>
        {children}
      </body>
    </html>
  );
}
