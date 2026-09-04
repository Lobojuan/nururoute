"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/session";
import { Shell } from "@/components/shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
