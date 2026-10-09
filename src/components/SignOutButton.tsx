"use client";

import { LogOut } from "lucide-react";

// نموذج POST — تسجيل الخروج ما ينفّذ بـ GET.
// A real form POST so signing out can't be triggered by a cross-site GET.
export default function SignOutButton({ color = "#7A6153" }: { color?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="flex items-center gap-2 text-xs font-bold hover:opacity-70 transition-opacity"
        style={{ color }}
      >
        <LogOut size={14} />
        خروج
      </button>
    </form>
  );
}
