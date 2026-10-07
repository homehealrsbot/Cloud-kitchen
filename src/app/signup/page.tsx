import AuthForm from "@/components/auth/AuthForm";
import { signUp } from "../login/actions";
import NotConfigured from "@/components/auth/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "إنشاء حساب — Macro meals" };

export default function SignupPage() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  return <AuthForm mode="signup" action={signUp} />;
}
