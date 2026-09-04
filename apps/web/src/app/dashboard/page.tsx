"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatGhs } from "@nurunode/shared";
import { api, type TopUpRow, type UsageRequestRow } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Card, Empty, Money, Pill, Stat, fmtDate } from "@/components/ui";
import { StatusPill, ZeroBalance } from "@/components/wallet-bits";

export default function WalletPage() {
  const { org, wallet } = useSession();
  const [recent, setRecent] = useState<UsageRequestRow[]>([]);
  const [topups, setTopups] = useState<TopUpRow[]>([]);

  useEffect(() => {
    if (!org) return;
    api.requests(org.id).then((r) => setRecent(r.requests.slice(0, 5))).catch(() => {});
    api.topups(org.id).then((r) => setTopups(r.topups.slice(0, 3))).catch(() => {});
  }, [org, wallet]);

  if (!org || !wallet) return null;
  const isZero = wallet.availablePesewas === 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{org.name}</p>
          <h1>Wallet</h1>
        </div>
        <Link href="/dashboard/top-up" className="btn btn-primary">
          Top up
        </Link>
      </div>

      <section className={`hero-balance ${isZero ? "is-zero" : ""}`}>
        <span className="stat-label">Available to spend</span>
        <Money pesewas={wallet.availablePesewas} size="xl" />
        <p className="hero-sub">
          {isZero
            ? "Requests are blocked until you add funds."
            : "This is what you can spend right now. Reserved amounts are excluded until each request settles."}
        </p>
      </section>

      {isZero && <ZeroBalance />}

      <div className="stats">
        <Stat
          label="Reserved"
          tone="cyan"
          value={<Money pesewas={wallet.reservedPesewas} size="md" />}
          hint="Held for requests still running. Unused parts come back."
        />
        <Stat
          label="Total spent"
          tone="navy"
          value={<Money pesewas={wallet.lifetimeSpentPesewas} size="md" />}
          hint="Actual cost of completed requests."
        />
        <Stat
          label="Total topped up"
          tone="gold"
          value={<Money pesewas={wallet.lifetimeTopUpsPesewas} size="md" />}
          hint="Everything you have added so far."
        />
      </div>

      <div className="grid-2">
        <Card
          title="Recent requests"
          action={
            <Link href="/dashboard/usage" className="link">
              View all
            </Link>
          }
        >
          {recent.length === 0 ? (
            <Empty
              title="No requests yet"
              body="Run a test request to see how reserve, settle and release work."
              action={
                <Link href="/dashboard/usage" className="btn btn-outline btn-sm">
                  Run a test request
                </Link>
              }
            />
          ) : (
            <ul className="list">
              {recent.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{r.model_id}</strong>
                    <span className="muted"> · {fmtDate(r.created_at)}</span>
                  </div>
                  <div className="list-right">
                    <StatusPill status={r.status} />
                    <span>
                      {r.status === "completed"
                        ? formatGhs(Number(r.actual_pesewas ?? 0))
                        : formatGhs(Number(r.reserved_pesewas))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent top-ups"
          action={
            <Link href="/dashboard/top-up" className="link">
              Top up
            </Link>
          }
        >
          {topups.length === 0 ? (
            <Empty title="No top-ups yet" body="Add funds with mobile money to get started." />
          ) : (
            <ul className="list">
              {topups.map((t) => (
                <li key={t.id}>
                  <div>
                    <strong>{t.provider === "momo_sandbox" ? "MTN MoMo (sandbox)" : "MTN MoMo (test)"}</strong>
                    <span className="muted"> · {fmtDate(t.created_at)}</span>
                  </div>
                  <div className="list-right">
                    <Pill tone={t.status === "succeeded" ? "green" : t.status === "failed" ? "red" : "gold"}>
                      {t.status}
                    </Pill>
                    <span>{formatGhs(Number(t.amount_pesewas))}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="How billing works" className="card-soft">
        <ol className="how">
          <li>
            <strong>Reserve.</strong> Before a request runs we hold the maximum it could cost.
          </li>
          <li>
            <strong>Settle.</strong> When it finishes we charge only what it actually used.
          </li>
          <li>
            <strong>Release.</strong> The difference goes straight back to your available balance.
          </li>
        </ol>
      </Card>
    </div>
  );
}
