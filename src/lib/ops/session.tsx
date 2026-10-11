"use client";

// سياق جلسة الموظف — الطبقة الوحيدة اللي تحتاج React.
//
// ليش منفصل عن roles.ts: ملف فيه "use client" كل صادراته تتحول إلى مراجع
// عميل، فأي Server Component أو Server Action يستورد منه يستلم وكيلاً لا
// قيمة حقيقية — دالّة ترفض الاستدعاء ومصفوفة ما فيها .filter. مصفوفة
// الصلاحيات ودالّة can لازم تشتغل على الجهتين، فهي في roles.ts نقية،
// والسياق هنا.

import { createContext, useContext } from "react";
import type { Role, Session } from "./roles";

// القيمة تُحقن من src/app/admin/layout.tsx وهو Server Component يقرأ الجلسة
// الحقيقية. ما فيه localStorage ولا تخزين في المتصفح.
const SessionContext = createContext<Session | null>(null);

export const RoleProvider = SessionContext.Provider;

export function useSession(): Session | null {
  return useContext(SessionContext);
}

export function useRole(): Role | null {
  return useContext(SessionContext)?.role ?? null;
}
