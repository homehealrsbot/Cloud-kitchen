import { NextResponse, type NextRequest } from "next/server";

// Next.js 16: هذا الملف كان اسمه middleware.ts — صار proxy.ts.
// In Next.js 16 the `middleware` convention was renamed to `proxy`.
//
// هذا فحص مبدئي فقط (optimistic) — مجرد وجود كوكي الجلسة.
// This is an OPTIMISTIC check and nothing more: it only looks for the presence
// of a Supabase session cookie, not whether that session is valid or belongs
// to an admin. It exists to keep strangers out of the admin UI cheaply, since
// proxy runs on every request including prefetches and must not hit the
// database. The real gates are verifyAdmin() in each /admin page and Row Level
// Security in the database. Do not add authorization logic here.

const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => SUPABASE_AUTH_COOKIE.test(cookie.name));

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // "/admin" نفسها + كل ما تحتها
  matcher: ["/admin", "/admin/:path*"],
};
