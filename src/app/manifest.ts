import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

// يخلي تطبيق العميل قابل للتثبيت على الجوال فعلياً (Add to Home Screen) ويفتح بشكل
// تطبيق مستقل بدون شريط المتصفح. هذا اللي كان ناقص رغم إن README يوعد به.
// ملاحظة: التثبيت يشتغل بهذا الملف. العمل بدون إنترنت (offline) يحتاج service worker
// وهو خارج نطاق هذا التحديث — راجع README.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Macro Meals — أكل حقيقي.. ماكروز محسوبة",
    short_name: "Macro Meals",
    description: "وجبات يطبخها شيفاتنا طازجة كل يوم، والماكروز محسوبة على هدفك.",
    lang: "ar",
    dir: "rtl",
    start_url: "/order-app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND.cream,
    theme_color: BRAND.forest,
    icons: [
      { src: "/brand/app-icon.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/brand/app-icon.png", sizes: "1024x1024", type: "image/png", purpose: "maskable" },
    ],
  };
}
