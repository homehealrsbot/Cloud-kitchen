import AuthForm from "@/components/auth/AuthForm";
import { signIn } from "./actions";
import NotConfigured from "@/components/auth/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "تسجيل الدخول — Macro meals" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const { next } = await searchParams;
  return <AuthForm mode="signin" action={signIn} next={next} />;
}
