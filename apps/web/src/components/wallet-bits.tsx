"use client";

import Link from "next/link";
import type { UsageRequestRow } from "@/lib/api";
import { Pill } from "./ui";

export function ZeroBalance({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`zero ${compact ? "zero-compact" : ""}`}>
      <div>
        <h3>Your wallet is empty</h3>
        <p>
          AI requests are paused until you top up. Add as little as GHS 1 to start — you only pay
          for what each request actually uses.
        </p>
      </div>
      <Link href="/dashboard/top-up" className="btn btn-gold">
        Top up now
      </Link>
    </div>
  );
}

export function StatusPill({ status }: { status: UsageRequestRow["status"] }) {
  switch (status) {
    case "completed":
      return <Pill tone="green">Settled</Pill>;
    case "reserved":
      return <Pill tone="cyan">Reserved</Pill>;
    case "failed":
      return <Pill tone="gold">Released</Pill>;
    case "rejected":
      return <Pill tone="red">Blocked</Pill>;
  }
}
