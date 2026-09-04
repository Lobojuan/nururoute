/**
 * Payment-collection boundary for the public demo wallet.
 *
 * Simulation only. The shapes mirror a typical mobile-money "request to pay"
 * lifecycle (reference → PENDING → SUCCESSFUL | FAILED | TIMEOUT | REJECTED)
 * so that a real collection adapter can be placed behind the same interface
 * on the server later. Nothing here performs a network call or stores a
 * credential; all records live in this browser only.
 */
import { useCallback, useEffect, useState } from "react";

export type CollectionStatus = "PENDING" | "SUCCESSFUL" | "FAILED" | "TIMEOUT" | "REJECTED";

export type CollectionIntent = {
  /** Client-generated idempotency reference (what a real API would receive as X-Reference-Id). */
  referenceId: string;
  /** Human-friendly external reference shown to the payer. */
  externalId: string;
  provider: string; // e.g. "MTN MoMo (simulated)"
  countryCode: string;
  currency: "GHS";
  amountPesewas: number;
  payerMsisdn: string;
  payerMessage: string;
  status: CollectionStatus;
  reason?: string | undefined;
  /** Simulated provider-side transaction id, set on success. */
  financialTransactionId?: string | undefined;
  createdAt: number;
  updatedAt: number;
  /** Whether the simulated callback (webhook) was "delivered" for this intent. */
  callbackDelivered: boolean;
  /** Whether the wallet ledger credit for this intent has been posted (idempotent). */
  credited: boolean;
};

export type SimulatedOutcome = "approve" | "decline" | "timeout";

export type CollectionEvent = { at: number; referenceId: string; text: string };

type PaymentsState = { intents: CollectionIntent[]; events: CollectionEvent[] };

const KEY = "nururoute-payments-v1";

let memory: PaymentsState | null = null;
const listeners = new Set<() => void>();

function load(): PaymentsState {
  if (memory) return memory;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    memory = raw ? (JSON.parse(raw) as PaymentsState) : { intents: [], events: [] };
  } catch {
    memory = { intents: [], events: [] };
  }
  return memory;
}

function save(next: PaymentsState) {
  memory = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function extId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `NR-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function withEvent(s: PaymentsState, referenceId: string, text: string): PaymentsState {
  return { ...s, events: [{ at: Date.now(), referenceId, text }, ...s.events].slice(0, 80) };
}

function patch(s: PaymentsState, referenceId: string, fn: (i: CollectionIntent) => CollectionIntent): PaymentsState {
  return { ...s, intents: s.intents.map((i) => (i.referenceId === referenceId ? fn({ ...i, updatedAt: Date.now() }) : i)) };
}

export const STATUS_LABEL: Record<CollectionStatus, string> = {
  PENDING: "Awaiting approval",
  SUCCESSFUL: "Successful",
  FAILED: "Failed",
  TIMEOUT: "Timed out",
  REJECTED: "Declined by payer",
};

/** Timings (ms) for the simulated lifecycle — long enough to read, short enough for a demo. */
export const SIM_TIMING = { prompt: 1400, decision: 2600, timeout: 4200 } as const;

/**
 * Simulated adapter. A real implementation would live server-side and
 * expose the same three operations: request, poll status, receive callback.
 */
export const simulatedCollections = {
  /** Create a PENDING intent. Returns the reference to poll. */
  requestToPay(input: { provider: string; countryCode: string; amountPesewas: number; payerMsisdn: string; payerMessage?: string }): CollectionIntent {
    const now = Date.now();
    const intent: CollectionIntent = {
      referenceId: uuid(),
      externalId: extId(),
      provider: input.provider,
      countryCode: input.countryCode,
      currency: "GHS",
      amountPesewas: input.amountPesewas,
      payerMsisdn: input.payerMsisdn,
      payerMessage: input.payerMessage ?? "NuruRoute wallet top-up (demo)",
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
      callbackDelivered: false,
      credited: false,
    };
    const s = load();
    save(withEvent({ ...s, intents: [intent, ...s.intents].slice(0, 100) }, intent.referenceId, `Request to pay created · ${input.provider} · ${input.payerMsisdn}`));
    return intent;
  },

  /** Resolve a PENDING intent the way a provider callback would. Idempotent. */
  resolve(referenceId: string, outcome: SimulatedOutcome) {
    const s = load();
    const cur = s.intents.find((i) => i.referenceId === referenceId);
    if (!cur || cur.status !== "PENDING") return cur ?? null;
    const status: CollectionStatus = outcome === "approve" ? "SUCCESSFUL" : outcome === "decline" ? "REJECTED" : "TIMEOUT";
    const reason = outcome === "approve" ? undefined : outcome === "decline" ? "Payer declined the prompt (simulated)" : "No response from payer before expiry (simulated)";
    const next = patch(s, referenceId, (i) => ({
      ...i,
      status,
      reason,
      financialTransactionId: status === "SUCCESSFUL" ? String(100000000 + Math.floor(Math.random() * 899999999)) : undefined,
      callbackDelivered: true,
    }));
    save(withEvent(next, referenceId, `Callback received · ${STATUS_LABEL[status]}${reason ? ` · ${reason}` : ""}`));
    return next.intents.find((i) => i.referenceId === referenceId) ?? null;
  },

  /** Mark the wallet credit as posted so a replayed callback never credits twice. */
  markCredited(referenceId: string) {
    const s = load();
    const cur = s.intents.find((i) => i.referenceId === referenceId);
    if (!cur || cur.status !== "SUCCESSFUL" || cur.credited) return false;
    save(withEvent(patch(s, referenceId, (i) => ({ ...i, credited: true })), referenceId, `Ledger credit posted · ${cur.externalId}`));
    return true;
  },

  /** Replay the callback for a resolved intent — demonstrates idempotency (no second credit). */
  replayCallback(referenceId: string) {
    const s = load();
    const cur = s.intents.find((i) => i.referenceId === referenceId);
    if (!cur || cur.status === "PENDING") return;
    save(withEvent(s, referenceId, cur.credited ? `Duplicate callback ignored · already credited (${cur.externalId})` : `Duplicate callback ignored · status ${cur.status}`));
  },

  getStatus(referenceId: string) {
    return load().intents.find((i) => i.referenceId === referenceId) ?? null;
  },

  clear() {
    save({ intents: [], events: [] });
  },
};

export function summarise(intents: CollectionIntent[]) {
  const by = (st: CollectionStatus) => intents.filter((i) => i.status === st);
  const sum = (xs: CollectionIntent[]) => xs.reduce((a, i) => a + i.amountPesewas, 0);
  const ok = by("SUCCESSFUL");
  const failed = [...by("FAILED"), ...by("REJECTED"), ...by("TIMEOUT")];
  const total = intents.length;
  return {
    total,
    successful: ok.length,
    pending: by("PENDING").length,
    failed: failed.length,
    collectedPesewas: sum(ok),
    unreconciled: ok.filter((i) => !i.credited).length,
    successRate: total ? Math.round((ok.length / Math.max(1, total - by("PENDING").length)) * 100) : 0,
  };
}

export function usePayments() {
  const [state, setState] = useState<PaymentsState | null>(null);
  useEffect(() => {
    const sync = () => setState({ ...load() });
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  const clear = useCallback(() => simulatedCollections.clear(), []);
  const replay = useCallback((id: string) => simulatedCollections.replayCallback(id), []);
  return { state, clear, replay };
}

/** Integration-readiness checklist shown in the private admin area. Inert: nothing is stored or called. */
export const COLLECTION_READINESS = [
  { title: "Licensed collection partner agreement", detail: "Signed terms with the mobile-money operator or a licensed aggregator for Ghana (GHS) collections." },
  { title: "Sandbox → production promotion", detail: "Sandbox credentials replaced by production credentials held only in the private server environment." },
  { title: "Server-side request signing", detail: "Every request to pay is created on the server with an idempotency reference; the browser never holds a key." },
  { title: "Callback endpoint + verification", detail: "Public callback URL that verifies origin, de-duplicates by reference and posts exactly one ledger credit." },
  { title: "Status polling fallback", detail: "Poll the reference when the callback is late; treat expiry as TIMEOUT, never as success." },
  { title: "Reconciliation & refunds", detail: "Daily statement match between operator settlements and ledger top-ups; refund path for credits that fail to post." },
  { title: "KYC / limits", detail: "Per-number and per-day collection limits aligned with operator and regulator rules." },
] as const;
