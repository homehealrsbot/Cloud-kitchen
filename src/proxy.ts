// تحديث جلسة Supabase على كل طلب + حماية مسارات الإدارة قبل ما تُرسل للمتصفح.
//
// الاسم proxy مو middleware: ملف middleware أصبح مهجوراً في Next 16 وأعيدت تسميته proxy.
//
// ليش هذي الطبقة ضرورية: توكن الوصول عمره قصير. لو ما جدّدناه وكتبناه في الكوكيز
// هنا، تصير حالات خروج عشوائي من الحساب. وهذا النمط الموصى به من Supabase.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function proxy(request: NextRequest) {
  // بدون إعداد Supabase نمرّر الطلب — الصفحات تعرض رسالة الإعداد بنفسها
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // مهم: getUser() هنا هي اللي تجدّد التوكن وتكتبه في الكوكيز
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;

  // /admin/* للموظفين فقط — نفحص قبل الإرسال بدل ما نعتمد على الواجهة
  if (path.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    const { data: staffRow } = await supabase
      .from("staff")
      .select("role")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (!staffRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/no-access";
      return NextResponse.redirect(url);
    }
  }

  // صفحات الدخول والتسجيل: المسجّل أصلاً ما يحتاجها
  if ((path === "/login" || path === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/order-app";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // نستثني الملفات الساكنة والصور عشان ما نشغّل المصادقة على كل أيقونة
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2?)$).*)"],
};
