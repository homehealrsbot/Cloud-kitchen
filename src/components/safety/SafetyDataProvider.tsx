"use client";

// جسر بين الخادم والعميل: الصورة تُقرأ في layout على الخادم وتُمرَّر هنا.
// مكوّن صغير مستقل عشان يبقى layout خادماً خالصاً.

import type { ReactNode } from "react";
import type { SafetySnapshot } from "@/lib/safety/types";
import { SafetyProvider } from "./ui";

export default function SafetyDataProvider({
  snapshot,
  children,
}: {
  snapshot: SafetySnapshot;
  children: ReactNode;
}) {
  return <SafetyProvider value={snapshot}>{children}</SafetyProvider>;
}
