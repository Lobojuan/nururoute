/**
 * Demo admin state for the investor simulation.
 *
 * Browser-only. Everything lives in localStorage under one key. There is no
 * server, no account system, no secrets and no provider calls. Figures here
 * (cost basis, buffers, margins, audit log) are internal to /admin and must
 * never be imported by public routes or the public support widget.
 */
import { useCallback, useEffect, useState } from "react";
import { COST_BASIS_USD, MODELS, PRICING_DEFAULTS, PUBLISHED_SCHEMA, setPublishedPrices, type CatalogModel, type Unit } from "./catalog";
import { SEED_ARTICLES, type KbArticle } from "./admin-kb";

export const ADMIN_KEY = "nururoute-admin-demo";
export const ADMIN_PASSPHRASE = "demo";
export const ADMIN_ACTOR = "Demo admin";
export const SIM_STAMP = "Simulation — no customer data sent to an AI provider.";
export const ROUTING_NOTE = "Illustrative routing label only — no integration, no keys, no external call.";

/* ------------------------------------------------------------------ */
/* Pricing                                                            */
/* ------------------------------------------------------------------ */

export type PricingInput = {
  modelId: string;
  /** Provider cost basis in USD per billing unit (illustrative). */
  providerCostUsd: number;
  unit: Unit;
  /** Assumed GHS per USD. Display estimate only, never a live rate. */
  fxRate: number;
  fxBufferPct: number;
  paymentBufferPct: number;
  opsBufferPct: number;
  targetMarginPct: number;
};

export type PriceBreakdown = {
  providerCostGhs: number;
  fxBufferGhs: number;
  paymentBufferGhs: number;
  opsBufferGhs: number;
  costToServeGhs: number;
  customerPriceGhs: number;
  grossProfitGhs: number;
  grossMarginPct: number;
  markupPct: number;
  valid: boolean;
};

/** customer price = (provider cost + FX + payment + operational buffers) ÷ (1 − target gross margin) */
export function computePrice(p: PricingInput): PriceBreakdown {
  const providerCostGhs = p.providerCostUsd * p.fxRate;
  const fxBufferGhs = providerCostGhs * (p.fxBufferPct / 100);
  const paymentBufferGhs = providerCostGhs * (p.paymentBufferPct / 100);
  const opsBufferGhs = providerCostGhs * (p.opsBufferPct / 100);
  const costToServeGhs = providerCostGhs + fxBufferGhs + paymentBufferGhs + opsBufferGhs;
  const valid = p.targetMarginPct >= 0 && p.targetMarginPct < 100 && Number.isFinite(costToServeGhs);
  const customerPriceGhs = valid ? costToServeGhs / (1 - p.targetMarginPct / 100) : 0;
  const grossProfitGhs = customerPriceGhs - costToServeGhs;
  return {
    providerCostGhs,
    fxBufferGhs,
    paymentBufferGhs,
    opsBufferGhs,
    costToServeGhs,
    customerPriceGhs,
    grossProfitGhs,
    grossMarginPct: customerPriceGhs > 0 ? (grossProfitGhs / customerPriceGhs) * 100 : 0,
    markupPct: costToServeGhs > 0 ? (grossProfitGhs / costToServeGhs) * 100 : 0,
    valid,
  };
}

const { fxRate: DEFAULT_FX, ...DEFAULTS } = PRICING_DEFAULTS;

/** Seed inputs from the explicit illustrative cost basis; the catalogue price is derived from these same numbers. */
export function seedPricing(): PricingInput[] {
  return MODELS.map((m) => ({
    modelId: m.id,
    providerCostUsd: round(COST_BASIS_USD[m.id] ?? 0, 5),
    unit: m.unit,
    fxRate: DEFAULT_FX,
    ...DEFAULTS,
  }));
}

/** Push only the customer prices (GHS) of a version to the shared catalogue. Cost basis and margins never leave /admin. */
export function publishToCatalogue(v: PriceVersion) {
  const prices: Record<string, number> = {};
  for (const p of v.prices) {
    const b = computePrice(p);
    if (b.valid) prices[p.modelId] = Math.max(1, Math.round(b.customerPriceGhs * 100));
  }
  setPublishedPrices({ version: v.id, publishedAt: v.createdAt, effectiveDate: v.effectiveDate, prices, schema: PUBLISHED_SCHEMA });
}

export function round(n: number, dp = 2) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function modelMeta(id: string): CatalogModel | undefined {
  return MODELS.find((m) => m.id === id);
}

/* ------------------------------------------------------------------ */
/* Versions + audit                                                   */
/* ------------------------------------------------------------------ */

export type FieldDiff = { modelId: string; field: keyof PricingInput; from: number | string; to: number | string };

export type PriceVersion = {
  id: string;
  createdAt: string;
  effectiveDate: string;
  reason: string;
  actor: string;
  prices: PricingInput[];
  diff: FieldDiff[];
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  ref?: string | undefined;
};

export function diffPricing(prev: PricingInput[], next: PricingInput[]): FieldDiff[] {
  const out: FieldDiff[] = [];
  const fields: (keyof PricingInput)[] = ["providerCostUsd", "fxRate", "fxBufferPct", "paymentBufferPct", "opsBufferPct", "targetMarginPct"];
  for (const n of next) {
    const p = prev.find((x) => x.modelId === n.modelId);
    if (!p) continue;
    for (const f of fields) if (p[f] !== n[f]) out.push({ modelId: n.modelId, field: f, from: p[f], to: n[f] });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Support                                                            */
/* ------------------------------------------------------------------ */

export type Ticket = {
  id: string;
  subject: string;
  customer: string; // masked, fictional
  org: string;
  channel: "WhatsApp" | "Email" | "In-app";
  status: "open" | "waiting" | "resolved";
  priority: "low" | "normal" | "high";
  openedAt: string;
  summary: string;
  ledger: { at: string; type: string; amount: string; note: string }[];
  notes: { at: string; by: string; text: string }[];
};

export const ROUTING_OPTIONS = ["OpenAI", "Claude", "Kimi"] as const;
export type RoutingTarget = (typeof ROUTING_OPTIONS)[number];

export const SEED_TICKETS: Ticket[] = [
  {
    id: "T-1042", subject: "Top-up shows pending after approval", customer: "Ama O. · 024•••1187", org: "Osu Creative Lab", channel: "WhatsApp", status: "open", priority: "high", openedAt: "2026-09-03T08:12:00Z",
    summary: "Customer approved a GHS 50 simulated top-up on her phone but the wallet still shows the old balance after two minutes.",
    ledger: [
      { at: "08:09", type: "intent", amount: "GHS 50.00", note: "Top-up intent created" },
      { at: "08:10", type: "pending", amount: "GHS 50.00", note: "Awaiting operator confirmation (simulated)" },
    ],
    notes: [{ at: "08:15", by: "Demo admin", text: "Checked intent — confirmation callback not yet received in the simulation." }],
  },
  {
    id: "T-1041", subject: "Reserved amount not released after failed job", customer: "Kwabena A. · 055•••4420", org: "Tamale Tutors", channel: "In-app", status: "waiting", priority: "normal", openedAt: "2026-09-02T17:40:00Z",
    summary: "A video job failed at 30% but GHS 4.80 still shows as reserved.",
    ledger: [
      { at: "17:31", type: "reserve", amount: "GHS 4.80", note: "Max cost held for video job #V-882" },
      { at: "17:33", type: "error", amount: "—", note: "Provider job failed (simulated)" },
      { at: "17:35", type: "release", amount: "GHS 4.80", note: "Hold released — pending UI refresh" },
    ],
    notes: [],
  },
  {
    id: "T-1040", subject: "Balance different on phone and laptop", customer: "Efua M. · 020•••9031", org: "Efua Designs", channel: "Email", status: "open", priority: "normal", openedAt: "2026-09-02T11:05:00Z",
    summary: "Laptop shows GHS 12.40 available, phone shows GHS 11.20.",
    ledger: [
      { at: "10:58", type: "settle", amount: "GHS 1.20", note: "Image job settled" },
      { at: "10:58", type: "release", amount: "GHS 0.30", note: "Unused reservation returned" },
    ],
    notes: [{ at: "11:20", by: "Demo admin", text: "Phone session cached pre-settlement balance." }],
  },
  {
    id: "T-1039", subject: "Request to rotate API key", customer: "Yaw D. · 027•••5510", org: "Accra Dev Collective", channel: "Email", status: "waiting", priority: "low", openedAt: "2026-09-01T14:22:00Z",
    summary: "Developer believes a demo key was pasted into a shared doc and wants it revoked and re-issued.",
    ledger: [],
    notes: [{ at: "14:40", by: "Demo admin", text: "Revocation is self-service in the console; sent steps." }],
  },
  {
    id: "T-1038", subject: "Refund of unused wallet credit", customer: "Nana B. · 054•••7726", org: "Nana B. (individual)", channel: "WhatsApp", status: "resolved", priority: "normal", openedAt: "2026-08-30T09:00:00Z",
    summary: "Customer asked whether unused simulated credit can be returned to mobile money.",
    ledger: [
      { at: "09:02", type: "balance", amount: "GHS 7.15", note: "Available at time of request" },
      { at: "09:30", type: "refund", amount: "GHS 7.15", note: "Refund entry recorded (simulated)" },
    ],
    notes: [{ at: "09:31", by: "Demo admin", text: "Resolved with a simulated refund entry; explained real refunds require a licensed payment partner." }],
  },
];

/** Locally generated, deterministic reply templates. Nothing leaves the browser. */
export function draftReply(t: Ticket, target: RoutingTarget, tone: "warm" | "concise") {
  const greet = tone === "warm" ? `Hello ${t.customer.split(" ")[0]}, thank you for reaching out.` : `Hi ${t.customer.split(" ")[0]},`;
  const body: Record<string, string> = {
    "T-1042": "Your GHS 50 top-up is recorded as pending while we wait for the operator confirmation. Nothing has been deducted from your mobile money. If it does not confirm within 15 minutes it is automatically cancelled and you can try again.",
    "T-1041": "The GHS 4.80 was only a temporary hold for the maximum possible cost of the job. Because the job failed, the hold has already been released — pull down to refresh and your available balance will update. You were not charged.",
    "T-1040": "Both figures are correct at different moments: your last image job settled for GHS 1.20 and returned GHS 0.30 of the hold. Your phone was showing a cached view. Refreshing the wallet screen will align them.",
    "T-1039": "Good call. You can revoke the key yourself under Developers → API keys, then create a new one; the old key stops working immediately. Keys are shown only once, so store the new one in a password manager.",
    "T-1038": "Unused credit is yours. Refunds to mobile money follow the same record-keeping as top-ups, and the amount you see as available is exactly what is returned.",
  };
  const close = tone === "warm" ? "Reply here if anything is still unclear — we're happy to help." : "Let us know if you need anything else.";
  return { text: `${greet}\n\n${body[t.id] ?? "Thanks for the details — we are looking into this and will update you shortly."}\n\n${close}`, target, stamp: SIM_STAMP };
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

/** Bump when the cost basis / margin defaults change so stale browser tables are re-seeded. */
export const PRICING_SCHEMA = 2;

export type AdminState = {
  pricingSchema?: number;
  entered: boolean;
  draft: PricingInput[];
  versions: PriceVersion[];
  audit: AuditEntry[];
  tickets: Ticket[];
  kb: KbArticle[];
};

function initialState(): AdminState {
  const prices = seedPricing();
  const now = new Date().toISOString();
  return {
    pricingSchema: PRICING_SCHEMA,
    entered: false,
    draft: prices,
    versions: [{ id: "v1", createdAt: now, effectiveDate: now.slice(0, 10), reason: "Seeded from the illustrative cost basis at 60% target gross margin.", actor: "System (seed)", prices, diff: [] }],
    audit: [{ id: "a1", at: now, actor: "System (seed)", action: "Seeded price table", detail: `${prices.length} models · v1`, ref: "v1" }],
    tickets: SEED_TICKETS,
    kb: SEED_ARTICLES,
  };
}

let memory: AdminState | null = null;
const listeners = new Set<() => void>();

function load(): AdminState {
  if (memory) return memory;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(ADMIN_KEY) : null;
    const saved = raw ? (JSON.parse(raw) as Partial<AdminState>) : null;
    if (saved && saved.pricingSchema !== PRICING_SCHEMA) {
      // Old pricing tables pre-date the cost-basis model: keep tickets/KB/session, re-seed prices, drop stale published prices.
      const fresh = initialState();
      memory = { ...fresh, entered: saved.entered ?? false, tickets: saved.tickets ?? fresh.tickets, kb: saved.kb ?? fresh.kb };
      setPublishedPrices(null);
    } else {
      memory = saved ? { ...initialState(), ...saved } : initialState();
    }
  } catch {
    memory = initialState();
  }
  return memory;
}

function save(next: AdminState) {
  memory = next;
  try {
    window.localStorage.setItem(ADMIN_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l());
}

export function useAdminStore() {
  const [state, setState] = useState<AdminState | null>(null);
  useEffect(() => {
    const sync = () => setState({ ...load() });
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const update = useCallback((fn: (s: AdminState) => AdminState) => save(fn(load())), []);

  const enter = useCallback(() => update((s) => ({ ...s, entered: true, audit: [...s.audit, entry("Entered demo admin", "Demo gate accepted (not authentication)")] })), [update]);
  const leave = useCallback(() => update((s) => ({ ...s, entered: false })), [update]);
  const setDraft = useCallback((draft: PricingInput[]) => update((s) => ({ ...s, draft })), [update]);
  const publishVersion = useCallback(
    (effectiveDate: string, reason: string) =>
      update((s) => {
        const current = s.versions[s.versions.length - 1]!;
        const diff = diffPricing(current.prices, s.draft);
        const id = `v${s.versions.length + 1}`;
        const v: PriceVersion = { id, createdAt: new Date().toISOString(), effectiveDate, reason, actor: ADMIN_ACTOR, prices: s.draft, diff };
        publishToCatalogue(v);
        return { ...s, versions: [...s.versions, v], audit: [...s.audit, entry("Published price version", `${id} · ${diff.length} field change${diff.length === 1 ? "" : "s"} · effective ${effectiveDate} · ${reason}`, id)] };
      }),
    [update],
  );
  const discardDraft = useCallback(() => update((s) => ({ ...s, draft: s.versions[s.versions.length - 1]!.prices })), [update]);
  const addNote = useCallback(
    (ticketId: string, text: string, status?: Ticket["status"]) =>
      update((s) => ({
        ...s,
        tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, status: status ?? t.status, notes: [...t.notes, { at: new Date().toISOString().slice(11, 16), by: ADMIN_ACTOR, text }] } : t)),
        audit: [...s.audit, entry(status ? `Ticket ${status}` : "Ticket note added", `${ticketId}`, ticketId)],
      })),
    [update],
  );
  const saveArticle = useCallback(
    (article: KbArticle) =>
      update((s) => {
        const exists = s.kb.some((a) => a.id === article.id);
        return { ...s, kb: exists ? s.kb.map((a) => (a.id === article.id ? article : a)) : [...s.kb, article], audit: [...s.audit, entry(exists ? "Knowledge article updated" : "Knowledge article created", `${article.id} · ${article.title} · ${article.status}${article.live ? " · Live" : ""}`, article.id)] };
      }),
    [update],
  );
  const queueTicket = useCallback(
    (subject: string, summary: string, customer: string, org: string) =>
      update((s) => {
        const id = `T-${1043 + s.tickets.filter((t) => t.id.startsWith("T-10") && Number(t.id.slice(2)) >= 1043).length}`;
        const t: Ticket = { id, subject, customer, org, channel: "In-app", status: "open", priority: "normal", openedAt: new Date().toISOString(), summary, ledger: [], notes: [{ at: new Date().toISOString().slice(11, 16), by: "Assistant (simulated)", text: "No Approved knowledge article matched. Queued for a human agent instead of guessing." }] };
        return { ...s, tickets: [t, ...s.tickets], audit: [...s.audit, entry("Human-support ticket queued", `${id} · ${subject}`, id)] };
      }),
    [update],
  );
  const resetAll = useCallback(() => { setPublishedPrices(null); save({ ...initialState(), entered: true }); }, []);

  return { state, enter, leave, setDraft, publishVersion, discardDraft, addNote, saveArticle, queueTicket, resetAll };
}

function entry(action: string, detail: string, ref?: string): AuditEntry {
  return { id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), actor: ADMIN_ACTOR, action, detail, ref };
}

export function ghs(n: number, dp = 2) {
  return `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}
