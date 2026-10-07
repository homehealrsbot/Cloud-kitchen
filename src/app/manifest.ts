import type { MetadataRoute } from "next";

// يخلي تطبيق العميل قابل للتثبيت على الجوال فعلياً (Add to Home Screen) ويفتح بشكل
// تطبيق مستقل بدون شريط المتصفح. هذا اللي كان ناقص رغم إن README يوعد به.
// ملاحظة: التثبيت يشتغل بهذا الملف. العمل بدون إنترنت (offline) يحتاج service worker
// وهو خارج نطاق هذا التحديث — راجع README.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Food Style — اشتراك وجبات صحية",
    short_name: "Food Style",
    description: "اشتراك وجبات يومي مبني على هدفك الصحي — تحضير طازج ومطابقة غذائية موثّقة",
    lang: "ar",
    dir: "rtl",
    start_url: "/order-app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FCF6F2",
    theme_color: "#A84F2E",
    icons: [
      { src: "/logo-mark.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo-mark.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
