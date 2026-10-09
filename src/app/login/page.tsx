import LoginForm from "./login-form";
import { safeNextPath } from "@/lib/safe-redirect";

// نقرأ ?next من الخادم ونتحقق منه هنا، قبل ما يوصل للمتصفح.
// Reading `next` on the server keeps the client component free of
// useSearchParams (which would need its own Suspense boundary to prerender)
// and means the open-redirect check runs before the value reaches the browser.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;

  return <LoginForm nextPath={safeNextPath(raw)} />;
}
