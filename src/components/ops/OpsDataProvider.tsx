"use client";

import { ReactNode } from "react";
import { OpsProvider } from "@/lib/ops/store";
import type { OpsSnapshot } from "@/lib/ops/types";

export default function OpsDataProvider({
  snapshot,
  children,
}: {
  snapshot: OpsSnapshot;
  children: ReactNode;
}) {
  return <OpsProvider value={snapshot}>{children}</OpsProvider>;
}
