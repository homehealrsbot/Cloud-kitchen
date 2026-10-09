import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase-server";

// POST فقط — تسجيل الخروج يغيّر حالة، فما ينفّذ بـ GET
// POST only: signing out changes state, so it must not be triggerable by a
// GET (an <img src> on another site could otherwise log the user out).
export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
