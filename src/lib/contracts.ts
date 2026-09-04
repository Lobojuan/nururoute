/**
 * Simulated contracts hub + revenue-split engine.
 *
 * Browser-local, illustrative only. Nothing here is a real agreement, rate card,
 * payout or partner relationship. Third-party names are trademarks of their owners
 * and appear only as illustrative counterparties in an investor simulation.
 */

import { useCallback, useEffect, useState } from "react";

export const CONTRACTS_KEY = "nururoute-contracts-demo";
export const CONTRACTS_DISCLAIMER =
  "Simulated contracts. No agreement, rate card, discount, payout or partnership shown here is real. Counterparty names are illustrative; real terms are negotiated privately and never published.";

export type ContractKind = "collection" | "provider" | "revshare";
export type ContractStatus = "draft" | "negotiating" | "signed";
export const STATUS_ORDER: ContractStatus[] = ["draft", "negotiating", "signed"];
export const STATUS_LABEL: Record<ContractStatus, string> = { draft: "Draft", negotiating: "Negotiating", signed: "Signed (simulated)" };

export type VolumeTier = { fromUsd: number; discountPct: number };

export type Contract = {
  id: string;
  kind: ContractKind;
  counterparty: string;
  title: string;
  summary: string;
  status: ContractStatus;
  /** Provider: base cost per unit in USD. Collection: fee % of collected. Revshare: % of gross margin. */
  rate: number;
  unit: string;
  tiers?: VolumeTier[];
  sla?: { uptimePct: number; p95Ms?: number; supportHours: string };
  termMonths: number;
  /** What each party gets — the "deal that works for everyone" narrative. */
  wins: { partner: string; nururoute: string; customer: string };
  clauses: string[];
  updatedAt: string;
};

export type Payout = { id: string; at: string; recipient: string; role: "creator" | "reseller"; contractId: string; pesewas: number; status: "accrued" | "paid (simulated)" };

export type ContractsState = { contracts: Contract[]; payouts: Payout[]; events: { at: string; text: string }[]; version: 1 };

const NOW = "2026-09-03T12:00:00.000Z";

export const SEED_CONTRACTS: Contract[] = [
  {
    id: "c-mtn-collections",
    kind: "collection",
    counterparty: "Mobile-money operator (Ghana) — illustrative",
    title: "Collections agreement · request-to-pay",
    summary: "Wallet top-ups collected through a licensed mobile-money partner. Fee charged as a percentage of successfully collected value.",
    status: "negotiating",
    rate: 1.5,
    unit: "% of collected value",
    tiers: [
      { fromUsd: 0, discountPct: 0 },
      { fromUsd: 50_000, discountPct: 10 },
      { fromUsd: 250_000, discountPct: 20 },
    ],
    sla: { uptimePct: 99.5, supportHours: "Business hours GMT + incident line" },
    termMonths: 24,
    wins: { partner: "New AI-driven transaction volume from agencies, developers and students.", nururoute: "Cedi-priced top-ups without card rails; predictable collection fee.", customer: "Pay for AI with the wallet they already use — no credit card." },
    clauses: ["Settlement T+1 to NuruRoute float account", "Callback + status-query reconciliation", "Refund path for TIMEOUT / REJECTED", "KYC/AML performed by licensed partner"],
    updatedAt: NOW,
  },
  {
    id: "c-provider-chat",
    kind: "provider",
    counterparty: "Frontier chat & coding provider — illustrative",
    title: "API services · usage-based rate card",
    summary: "Pay-as-you-go tokens with committed-spend tiers. Zero data retention and no training on customer prompts required.",
    status: "negotiating",
    rate: 0.006,
    unit: "USD per 1K output tokens",
    tiers: [
      { fromUsd: 0, discountPct: 0 },
      { fromUsd: 10_000, discountPct: 8 },
      { fromUsd: 100_000, discountPct: 15 },
    ],
    sla: { uptimePct: 99.9, p95Ms: 1800, supportHours: "24×7 enterprise" },
    termMonths: 12,
    wins: { partner: "Distribution into a mobile-money-first market it cannot bill directly.", nururoute: "Committed-spend discount lifts gross margin per request.", customer: "Frontier quality priced per 1K tokens in cedis." },
    clauses: ["Zero data retention (ZDR) endpoint", "No training on API inputs/outputs", "DPA + sub-processor list", "Monthly hard budget cap honoured by provider", "Rate-limit and deprecation notice ≥ 90 days"],
    updatedAt: NOW,
  },
  {
    id: "c-provider-media",
    kind: "provider",
    counterparty: "Image & video generation provider — illustrative",
    title: "Media generation · per-output rate card",
    summary: "Per-image and per-second video pricing with 2K/4K surcharges disclosed up front.",
    status: "draft",
    rate: 0.04,
    unit: "USD per 1024² image",
    tiers: [
      { fromUsd: 0, discountPct: 0 },
      { fromUsd: 25_000, discountPct: 12 },
    ],
    sla: { uptimePct: 99.5, supportHours: "Business hours + email" },
    termMonths: 12,
    wins: { partner: "Volume from Ghanaian advertising agencies and creators.", nururoute: "Creative Studio margin on high-value 2K/4K renders.", customer: "Broadcast-ready visuals billed per output, not per seat." },
    clauses: ["Content-safety filtering at provider", "Commercial-use licence on outputs", "Resolution surcharges published in rate card"],
    updatedAt: NOW,
  },
  {
    id: "c-revshare-creators",
    kind: "revshare",
    counterparty: "Creator & reseller programme — illustrative",
    title: "Revenue-share · creators, agencies, campus resellers",
    summary: "Referrers who bring paying organisations earn a share of NuruRoute gross margin on that organisation's spend for the term.",
    status: "signed",
    rate: 15,
    unit: "% of NuruRoute gross margin",
    termMonths: 12,
    wins: { partner: "Recurring income from every cedi their referrals spend.", nururoute: "Zero-CAC distribution across campuses and agencies.", customer: "Onboarded by someone they trust, in their language." },
    clauses: ["Paid monthly once ≥ GHS 50 accrued", "Self-referral excluded", "Clawback on refunded top-ups"],
    updatedAt: NOW,
  },
];

const SEED_PAYOUTS: Payout[] = [
  { id: "p-1", at: "2026-08-31T09:00:00.000Z", recipient: "Osu Creative Collective (fictional)", role: "reseller", contractId: "c-revshare-creators", pesewas: 18_420, status: "paid (simulated)" },
  { id: "p-2", at: "2026-08-31T09:00:00.000Z", recipient: "KNUST Dev Society (fictional)", role: "creator", contractId: "c-revshare-creators", pesewas: 9_760, status: "paid (simulated)" },
  { id: "p-3", at: NOW, recipient: "Osu Creative Collective (fictional)", role: "reseller", contractId: "c-revshare-creators", pesewas: 6_115, status: "accrued" },
];

export function seedContracts(): ContractsState {
  return { contracts: SEED_CONTRACTS.map((c) => ({ ...c })), payouts: SEED_PAYOUTS.map((p) => ({ ...p })), events: [{ at: NOW, text: "Seeded simulated contracts hub" }], version: 1 };
}

/* ------------------------------------------------------------------ */
/* Revenue-split engine                                                */
/* ------------------------------------------------------------------ */

export type SplitInput = {
  /** Customer price in pesewas for the request. */
  customerPesewas: number;
  /** Provider cost in USD for the request. */
  providerCostUsd: number;
  fxRate: number;
  /** Collection fee % applied to the top-up that funded this spend. */
  collectionFeePct: number;
  /** Rev-share % of gross margin owed to referrer, 0 when none. */
  revSharePct: number;
  /** Committed-spend discount applied to provider cost. */
  providerDiscountPct: number;
};

export type Split = {
  providerPesewas: number;
  collectionPesewas: number;
  revSharePesewas: number;
  nururoutePesewas: number;
  grossMarginPesewas: number;
  marginPct: number;
  parts: { key: "provider" | "collection" | "revshare" | "nururoute"; label: string; pesewas: number; pct: number }[];
};

/** Splits one customer payment between provider, collection partner, referrer and NuruRoute. Always sums to customerPesewas. */
export function splitRevenue(i: SplitInput): Split {
  const total = Math.max(0, Math.round(i.customerPesewas));
  const provider = Math.min(total, Math.round(i.providerCostUsd * (1 - i.providerDiscountPct / 100) * i.fxRate * 100));
  const collection = Math.min(total - provider, Math.round(total * (i.collectionFeePct / 100)));
  const grossMargin = Math.max(0, total - provider - collection);
  const revShare = Math.round(grossMargin * (i.revSharePct / 100));
  const nururoute = total - provider - collection - revShare;
  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  return {
    providerPesewas: provider,
    collectionPesewas: collection,
    revSharePesewas: revShare,
    nururoutePesewas: nururoute,
    grossMarginPesewas: grossMargin,
    marginPct: pct(grossMargin),
    parts: [
      { key: "provider", label: "Provider cost", pesewas: provider, pct: pct(provider) },
      { key: "collection", label: "Collection fee", pesewas: collection, pct: pct(collection) },
      { key: "revshare", label: "Creator / reseller", pesewas: revShare, pct: pct(revShare) },
      { key: "nururoute", label: "NuruRoute", pesewas: nururoute, pct: pct(nururoute) },
    ],
  };
}

export function tierDiscount(c: Contract | undefined, monthlyUsd: number) {
  if (!c?.tiers?.length) return 0;
  return c.tiers.filter((t) => monthlyUsd >= t.fromUsd).reduce((m, t) => Math.max(m, t.discountPct), 0);
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

let cache: ContractsState | null = null;
const listeners = new Set<() => void>();

function load(): ContractsState {
  if (cache) return cache;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(CONTRACTS_KEY) : null;
    cache = raw ? (JSON.parse(raw) as ContractsState) : seedContracts();
  } catch {
    cache = seedContracts();
  }
  return cache;
}

function save(next: ContractsState) {
  cache = next;
  try { window.localStorage.setItem(CONTRACTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useContracts() {
  const [state, setState] = useState<ContractsState | null>(null);
  useEffect(() => {
    const sync = () => setState({ ...load() });
    sync();
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, []);

  const update = useCallback((fn: (s: ContractsState) => ContractsState) => save(fn(load())), []);
  const stamp = () => new Date().toISOString();

  return {
    state,
    advance: (id: string) => update((s) => ({
      ...s,
      contracts: s.contracts.map((c) => {
        if (c.id !== id) return c;
        const next = STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(c.status) + 1, STATUS_ORDER.length - 1)]!;
        return { ...c, status: next, updatedAt: stamp() };
      }),
      events: [{ at: stamp(), text: `${s.contracts.find((c) => c.id === id)?.title ?? id} → ${STATUS_LABEL[STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(s.contracts.find((c) => c.id === id)!.status) + 1, 2)]!]}` }, ...s.events].slice(0, 40),
    })),
    setRate: (id: string, rate: number) => update((s) => ({
      ...s,
      contracts: s.contracts.map((c) => (c.id === id ? { ...c, rate, updatedAt: stamp() } : c)),
      events: [{ at: stamp(), text: `Rate updated on ${s.contracts.find((c) => c.id === id)?.title ?? id}` }, ...s.events].slice(0, 40),
    })),
    accruePayout: (p: Omit<Payout, "id" | "at" | "status">) => update((s) => ({
      ...s,
      payouts: [{ ...p, id: `p-${Date.now()}`, at: stamp(), status: "accrued" }, ...s.payouts],
      events: [{ at: stamp(), text: `Accrued GHS ${(p.pesewas / 100).toFixed(2)} for ${p.recipient}` }, ...s.events].slice(0, 40),
    })),
    payAccrued: () => update((s) => ({
      ...s,
      payouts: s.payouts.map((p) => (p.status === "accrued" ? { ...p, status: "paid (simulated)" } : p)),
      events: [{ at: stamp(), text: "Simulated payout run completed" }, ...s.events].slice(0, 40),
    })),
    reset: () => save(seedContracts()),
  };
}
