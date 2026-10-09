import { verifyAdmin } from "@/lib/auth";
import ApprovalsView from "./view";

// الفحص يصير في الخادم قبل إرسال أي شي للمتصفح — ومعه RLS في قاعدة البيانات.
// Server-side admin check, before any markup reaches the browser. This runs
// per page (not in a layout) because a layout wouldn't re-run on client-side
// navigation. RLS is the second, authoritative gate on the data itself.
export default async function Page() {
  await verifyAdmin("/admin/approvals");
  return <ApprovalsView />;
}
