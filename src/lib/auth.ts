import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "./supabase-server";
import { safeNextPath } from "./safe-redirect";

// طبقة الوصول للبيانات الخاصة بالصلاحيات (Data Access Layer).
// Authorization lives here so the check can't be forgotten at a call site.
// Next.js 16 note: do NOT move these checks into a layout. Layouts don't
// re-render on client-side navigation, and a layout can't stop its route
// segments from rendering, so the check has to run in the page itself.
// See node_modules/next/dist/docs/01-app/02-guides/authentication.md.

export type AdminUser = {
  id: string;
  email: string | undefined;
  role: string;
};

// `cache` dedupes these within a single request, so a page can ask more than
// once without extra round trips.
export const getSessionUser = cache(async () => {
  // يمنع بناء الصفحة مسبقاً — الفحص لازم يصير مع كل طلب.
  // Without this the page can be prerendered at build time (when no Supabase
  // env vars exist, the checks below short-circuit and never touch cookies),
  // baking a fixed answer into a static page. connection() holds rendering
  // until there's a real request, so the session is checked every time.
  await connection();

  if (!isSupabaseConfigured()) return null;

  const supabase = await createServerSupabase();

  // getUser() re-validates the token with the auth server. getSession() only
  // decodes the cookie, which a client controls — never authorize on that.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return data.user;
});

export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createServerSupabase();

  // Scoped to this user, never fetched by id alone. RLS enforces the same
  // restriction at the database, so this is the second of two gates.
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return { id: user.id, email: user.email, role: data.role as string };
});

// استدعِ هذه في كل صفحة تحت /admin.
// Call at the top of every page under /admin. Denies by default: anything
// other than a confirmed admin row is redirected to the login page.
export async function verifyAdmin(nextPath = "/admin"): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  return admin;
}

