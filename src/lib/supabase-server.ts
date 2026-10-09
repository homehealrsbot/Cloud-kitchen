import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// عميل Supabase للخادم — يقرأ الجلسة من الكوكيز.
// Server-side Supabase client. Reads the session from cookies so Server
// Components and Route Handlers act as the signed-in user, which means every
// query is still filtered by Row Level Security (see supabase/02-security.sql).
// This deliberately uses the public anon key, never the service role key:
// the service role bypasses RLS and must not be reachable from request code.

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't write cookies. Refreshed tokens are
            // persisted by the browser client and by Route Handlers instead,
            // so ignoring this here is expected rather than an error.
          }
        },
      },
    },
  );
}
