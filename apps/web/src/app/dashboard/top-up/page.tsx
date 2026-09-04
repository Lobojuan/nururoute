"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatGhs } from "@nurunode/shared";
import { api, type TopUpRow } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Alert, Card, Empty, Money, Pill, Spinner, fmtDate } from "@/components/ui";

const PRESETS = [5, 20, 50, 100];

type Phase =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "waiting"; ref: string; instructions: string; polls: number }
  | { kind: "done"; amount: number; available: number }
  | { kind: "failed"; reason: string };

export default function TopUpPage() {
  const { org, wallet, health, refreshWallet } = useSession();
  const [ghs, setGhs] = useState("20");
  const [phone, setPhone] = useState("0241234567");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [history, setHistory] = useState<TopUpRow[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sandbox = health?.paymentMode === "sandbox";

  async function loadHistory() {
    if (!org) return;
    setHistory((await api.topups(org.id)).topups);
  }
  useEffect(() => {
    loadHistory().catch(() => {});
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  const amount = Math.round(Number(ghs) * 100);
  const valid = Number.isFinite(amount) && amount >= 100 && /^(0[235]\d{8}|\+?[1-9]\d{7,14})$/.test(phone.trim());

  async function poll(ref: string, polls: number) {
    if (!org) return;
    try {
      const res = await api.confirmTopUp(org.id, ref);
      if (res.status === "succeeded") {
        setPhase({ kind: "done", amount, available: res.balance.availablePesewas });
        await Promise.all([refreshWallet(), loadHistory()]);
        return;
      }
      if (res.status === "failed") {
        setPhase({ kind: "failed", reason: res.reason ?? "The payment was not approved." });
        await loadHistory();
        return;
      }
      if (polls >= 40) {
        setPhase({ kind: "failed", reason: "Still pending after 2 minutes. Check your phone and confirm again from history." });
        return;
      }
      setPhase((p) => (p.kind === "waiting" ? { ...p, polls: polls + 1 } : p));
      timer.current = setTimeout(() => poll(ref, polls + 1), 3000);
    } catch (e) {
      setPhase({ kind: "failed", reason: e instanceof Error ? e.message : "Could not confirm payment" });
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!org || !valid) return;
    setPhase({ kind: "sending" });
    try {
      if (!sandbox) {
        const res = await api.simulateTopUp(org.id, amount, phone.trim());
        setPhase({ kind: "done", amount, available: res.balance.availablePesewas });
        await Promise.all([refreshWallet(), loadHistory()]);
        return;
      }
      const res = await api.createTopUp(org.id, amount, phone.trim());
      setPhase({ kind: "waiting", ref: res.intent.providerRef, instructions: res.intent.instructions, polls: 0 });
      await loadHistory();
      timer.current = setTimeout(() => poll(res.intent.providerRef, 1), 2500);
    } catch (err) {
      setPhase({ kind: "failed", reason: err instanceof Error ? err.message : "Top-up failed" });
    }
  }

  async function confirmRow(ref: string) {
    if (!org) return;
    setPhase({ kind: "waiting", ref, instructions: "Checking with MTN…", polls: 0 });
    await poll(ref, 1);
  }

  if (!org) return null;

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">{org.name}</p>
          <h1>Top up</h1>
        </div>
        {wallet && (
          <div className="head-balance">
            <span className="stat-label">Available</span>
            <Money pesewas={wallet.availablePesewas} size="md" />
          </div>
        )}
      </div>

      <Card
        title="Add funds with MTN Mobile Money"
        subtitle={
          sandbox
            ? "MTN sandbox: a real request-to-pay is sent to the test network. No real money moves."
            : "Test mode: the payment is simulated instantly. No real money moves."
        }
      >
        <form onSubmit={submit} className="form">
          <div className="presets" role="group" aria-label="Quick amounts">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p}
                className={`chip ${Number(ghs) === p ? "chip-active" : ""}`}
                onClick={() => setGhs(String(p))}
              >
                GHS {p}
              </button>
            ))}
          </div>
          <label>
            Amount (GHS)
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              value={ghs}
              onChange={(e) => setGhs(e.target.value)}
            />
          </label>
          <label>
            Mobile money number
            <input
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0241234567"
            />
            <span className="field-hint">
              {sandbox
                ? "Any number is approved by the MTN sandbox except its test numbers (46733123450 fails, 46733123453 stays pending)."
                : "Test rule: numbers ending in 0000 are declined."}
            </span>
          </label>
          <button
            className="btn btn-gold btn-block"
            disabled={!valid || phase.kind === "sending" || phase.kind === "waiting"}
          >
            {phase.kind === "sending"
              ? "Sending request…"
              : `Top up ${Number.isFinite(amount) && amount > 0 ? formatGhs(amount) : ""}`}
          </button>
        </form>

        {phase.kind === "waiting" && (
          <Alert tone="cyan">
            <Spinner /> <strong>Waiting for approval.</strong> {phase.instructions}
            <span className="muted"> (checked {phase.polls}×)</span>
          </Alert>
        )}
        {phase.kind === "done" && (
          <Alert tone="green">
            <strong>{formatGhs(phase.amount)} added.</strong> Available balance is now{" "}
            {formatGhs(phase.available)}.
          </Alert>
        )}
        {phase.kind === "failed" && (
          <Alert tone="red">
            <strong>Top-up not completed.</strong> {phase.reason}
          </Alert>
        )}
      </Card>

      <Card title="Top-up history">
        {history.length === 0 ? (
          <Empty title="No top-ups yet" />
        ) : (
          <ul className="list">
            {history.map((t) => (
              <li key={t.id}>
                <div>
                  <strong>{formatGhs(Number(t.amount_pesewas))}</strong>
                  <span className="muted"> · {fmtDate(t.created_at)}</span>
                </div>
                <div className="list-right">
                  <Pill tone={t.status === "succeeded" ? "green" : t.status === "failed" ? "red" : "gold"}>
                    {t.status === "succeeded" ? "Credited" : t.status === "failed" ? "Declined" : "Pending"}
                  </Pill>
                  {t.status === "pending" && sandbox && (
                    <button className="btn btn-outline btn-sm" onClick={() => confirmRow(t.provider_ref)}>
                      Check again
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
