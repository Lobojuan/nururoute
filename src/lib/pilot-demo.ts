/**
 * Closed-pilot foundation — static, demo-safe data for the private /admin/pilot screen.
 * Nothing here calls a provider, stores a secret, or changes public behaviour.
 */

export const PILOT_LABEL = "Demo / pilot — no live payments or AI processing.";

export const PILOT_STATUS = {
  phase: "Closed pilot (simulated)",
  publicSignup: "OFF",
  publicAiAccess: "OFF",
  liveProviders: "OFF",
  livePayments: "OFF",
  killSwitch: "OFF", // kill-switch itself is armed-but-off: nothing live exists to cut
} as const;

export const INVITES = [
  { code: "PILOT-ACC-01", label: "Accra creative agency (fictional)", seats: 5, used: 3, status: "Active concept" },
  { code: "PILOT-KNU-02", label: "University research group (fictional)", seats: 10, used: 7, status: "Active concept" },
  { code: "PILOT-DEV-03", label: "Independent developers (fictional)", seats: 8, used: 2, status: "Active concept" },
  { code: "PILOT-SME-04", label: "Kumasi SME cohort (fictional)", seats: 6, used: 0, status: "Not yet issued" },
] as const;

export type CapRow = { scope: string; capGhs: number; usedGhs: number; note: string };
export const SPEND_CAPS: CapRow[] = [
  { scope: "Per user · per request", capGhs: 25, usedGhs: 0, note: "Maximum single reservation" },
  { scope: "Per user · daily", capGhs: 60, usedGhs: 18.4, note: "Resets 00:00 Accra" },
  { scope: "Per user · monthly", capGhs: 400, usedGhs: 121.9, note: "Rolling calendar month" },
  { scope: "Organisation · daily", capGhs: 500, usedGhs: 96.2, note: "All members combined" },
  { scope: "Pilot programme · monthly budget", capGhs: 5_000, usedGhs: 1_284.5, note: "Hard stop for the whole pilot" },
];

export const PROMO_CREDITS = [
  { name: "Pilot welcome credit", amountGhs: 20, expiresDays: 30, rule: "Granted once per invited user; spend before top-up credit", status: "Preview" },
  { name: "Student research grant", amountGhs: 50, expiresDays: 60, rule: "Restricted to text models; not withdrawable", status: "Preview" },
  { name: "Agency creative trial", amountGhs: 100, expiresDays: 14, rule: "Image and voice studios only; 1 per organisation", status: "Preview" },
] as const;

export type UsageRow = { at: string; org: string; target: string; kind: string; units: string; reservedGhs: number; settledGhs: number; outcome: "settled" | "released" | "rejected" };
export const USAGE_LOG: UsageRow[] = [
  { at: "09:12", org: "Accra agency", target: "Chat & coding (label)", kind: "chat", units: "2.1k in / 1.4k out", reservedGhs: 0.9, settledGhs: 0.58, outcome: "settled" },
  { at: "09:40", org: "Research group", target: "Long-context (label)", kind: "chat", units: "9k in / 3k out", reservedGhs: 0.6, settledGhs: 0.41, outcome: "settled" },
  { at: "10:05", org: "Accra agency", target: "Image studio (label)", kind: "image", units: "4 × 1024²", reservedGhs: 3.2, settledGhs: 3.2, outcome: "settled" },
  { at: "10:31", org: "Developers", target: "Chat & coding (label)", kind: "chat", units: "—", reservedGhs: 0, settledGhs: 0, outcome: "rejected" },
  { at: "11:02", org: "Research group", target: "Voice studio (label)", kind: "voice", units: "3 min", reservedGhs: 1.5, settledGhs: 0, outcome: "released" },
  { at: "11:47", org: "Accra agency", target: "Video studio (label)", kind: "video", units: "8 s · 720p", reservedGhs: 33.6, settledGhs: 29.4, outcome: "settled" },
];

export type Prereq = { title: string; detail: string; done: boolean };
export const LIVE_PREREQS: Prereq[] = [
  { title: "Approved provider terms", detail: "Signed, reviewed terms for each upstream model provider.", done: false },
  { title: "Secure server-side secret storage", detail: "Keys held only in the private server environment; never in the browser or repository.", done: false },
  { title: "Budget cap", detail: "Hard monthly spend ceiling per provider with automatic cut-off.", done: false },
  { title: "Privacy review", detail: "Data-flow review covering prompts, outputs and retention.", done: false },
  { title: "Incident handling", detail: "On-call owner, kill-switch drill and customer communication template.", done: false },
  { title: "Licensed payment partner", detail: "Mobile-money collection through a licensed partner — required before any real top-up.", done: false },
];

export const PROVIDER_PLACEHOLDERS = [
  { label: "Chat & coding provider A", fields: ["Endpoint", "Secret reference", "Monthly budget cap"] },
  { label: "Chat & coding provider B", fields: ["Endpoint", "Secret reference", "Monthly budget cap"] },
  { label: "Image / video provider", fields: ["Endpoint", "Secret reference", "Monthly budget cap"] },
  { label: "Voice / dubbing provider", fields: ["Endpoint", "Secret reference", "Monthly budget cap"] },
] as const;

/* ------------------------------------------------------------------ */
/* Stateful pilot store (browser-local, demo-safe)                    */
/* ------------------------------------------------------------------ */
import { useCallback, useEffect, useState } from "react";

export const PILOT_KEY = "nururoute-pilot-demo";

export type PrereqId = "terms" | "secrets" | "budget" | "privacy" | "incident" | "payment";
export const PREREQ_IDS: { id: PrereqId; index: number; gate: boolean }[] = [
  { id: "terms", index: 0, gate: true },
  { id: "secrets", index: 1, gate: false },
  { id: "budget", index: 2, gate: true },
  { id: "privacy", index: 3, gate: false },
  { id: "incident", index: 4, gate: false },
  { id: "payment", index: 5, gate: true },
];

export type ProviderConfig = {
  id: string;
  label: string;
  /** Free-text reference only (e.g. "vault://providers/a"). Never a real endpoint or key. */
  endpointRef: string;
  secretRef: string;
  monthlyCapGhs: number;
  /** "Enabled" in the demo means the placeholder is marked ready. It never causes a network call. */
  enabled: boolean;
};

export type PilotRun = {
  id: string;
  at: number;
  label: string;
  reservedPesewas: number;
  settledPesewas: number;
  outcome: "settled" | "released" | "rejected" | "blocked";
};

export type PilotApplication = {
  id: string;
  at: number;
  org: string;
  track: "agency" | "developer" | "research" | "sme";
  country: string;
  useCase: string;
  monthlyBudgetGhs: number;
  status: "received" | "reviewing" | "approved" | "waitlisted";
};

export type PilotState = {
  applications: PilotApplication[];
  checklist: Record<PrereqId, boolean>;
  providers: ProviderConfig[];
  killSwitch: boolean;
  runs: PilotRun[];
  /** Pilot programme monthly budget in GHS (spend-cap preview). */
  programmeCapGhs: number;
  events: { at: number; text: string }[];
};

function initialPilot(): PilotState {
  return {
    applications: [],
    checklist: { terms: false, secrets: false, budget: false, privacy: false, incident: false, payment: false },
    providers: PROVIDER_PLACEHOLDERS.map((p, i) => ({ id: `prov-${i + 1}`, label: p.label, endpointRef: "", secretRef: "", monthlyCapGhs: 0, enabled: false })),
    killSwitch: false,
    runs: [],
    programmeCapGhs: 5_000,
    events: [],
  };
}

let pilotMemory: PilotState | null = null;
const pilotListeners = new Set<() => void>();

function loadPilot(): PilotState {
  if (pilotMemory) return pilotMemory;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PILOT_KEY) : null;
    pilotMemory = raw ? { ...initialPilot(), ...(JSON.parse(raw) as Partial<PilotState>) } : initialPilot();
  } catch {
    pilotMemory = initialPilot();
  }
  return pilotMemory;
}

function savePilot(next: PilotState) {
  pilotMemory = next;
  try {
    window.localStorage.setItem(PILOT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  pilotListeners.forEach((l) => l());
}

function withEvent(s: PilotState, text: string): PilotState {
  return { ...s, events: [{ at: Date.now(), text }, ...s.events].slice(0, 40) };
}

/** True when every gating prerequisite (terms, budget cap, payment partner) is ticked. */
export function gateOpen(s: PilotState) {
  return PREREQ_IDS.filter((p) => p.gate).every((p) => s.checklist[p.id]);
}

/** Public demo surfaces call this before a simulated run. Browser-only; false during SSR. */
export function pilotKillSwitchOn() {
  if (typeof window === "undefined") return false;
  return loadPilot().killSwitch;
}

/** Called by the public demo wallet for every simulated run so the admin usage log reflects real demo activity. */
export function recordPilotRun(run: Omit<PilotRun, "id" | "at">) {
  if (typeof window === "undefined") return;
  const s = loadPilot();
  savePilot({ ...s, runs: [{ id: Math.random().toString(36).slice(2, 9), at: Date.now(), ...run }, ...s.runs].slice(0, 60) });
}

export function usePilotStore() {
  const [state, setState] = useState<PilotState | null>(null);
  useEffect(() => {
    const sync = () => setState({ ...loadPilot() });
    sync();
    pilotListeners.add(sync);
    return () => {
      pilotListeners.delete(sync);
    };
  }, []);
  const update = useCallback((fn: (s: PilotState) => PilotState) => savePilot(fn(loadPilot())), []);

  const toggleCheck = useCallback((id: PrereqId) => update((s) => {
    const next = { ...s, checklist: { ...s.checklist, [id]: !s.checklist[id] } };
    // Closing the gate disables every provider placeholder again.
    const open = gateOpen(next);
    return withEvent({ ...next, providers: open ? next.providers : next.providers.map((p) => ({ ...p, enabled: false })) }, `${LIVE_PREREQS[PREREQ_IDS.find((p) => p.id === id)!.index]!.title} marked ${next.checklist[id] ? "done" : "not done"}${open ? "" : " · providers locked"}`);
  }), [update]);

  const setProvider = useCallback((id: string, patch: Partial<ProviderConfig>) => update((s) => ({ ...s, providers: s.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)) })), [update]);

  const setEnabled = useCallback((id: string, enabled: boolean) => update((s) => {
    if (enabled && (!gateOpen(s) || s.killSwitch)) return s;
    const p = s.providers.find((x) => x.id === id);
    if (enabled && (!p || p.monthlyCapGhs <= 0)) return s;
    return withEvent({ ...s, providers: s.providers.map((x) => (x.id === id ? { ...x, enabled } : x)) }, `${p?.label ?? id} placeholder ${enabled ? "enabled (simulation — no call is made)" : "disabled"}`);
  }), [update]);

  const setKillSwitch = useCallback((on: boolean) => update((s) => withEvent({ ...s, killSwitch: on, providers: on ? s.providers.map((p) => ({ ...p, enabled: false })) : s.providers }, on ? "KILL-SWITCH ON — spend cap zeroed, all simulated runs blocked, provider placeholders disabled" : "Kill-switch OFF — simulated runs allowed again")), [update]);

  const setProgrammeCap = useCallback((ghsCap: number) => update((s) => ({ ...s, programmeCapGhs: Math.max(0, ghsCap) })), [update]);
  const clearRuns = useCallback(() => update((s) => withEvent({ ...s, runs: [] }, "Usage log cleared")), [update]);
  const resetPilot = useCallback(() => savePilot(initialPilot()), []);

  /** Simulated application: stored in this browser only, nobody is contacted and no account is created. */
  const applyToPilot = useCallback((a: Omit<PilotApplication, "id" | "at" | "status">) => update((s) => withEvent({ ...s, applications: [{ id: `APP-${(s.applications.length + 1).toString().padStart(3, "0")}`, at: Date.now(), status: "received" as const, ...a }, ...s.applications].slice(0, 30) }, `Simulated pilot application received from ${a.org} (${a.track})`)), [update]);
  const setApplicationStatus = useCallback((id: string, status: PilotApplication["status"]) => update((s) => withEvent({ ...s, applications: s.applications.map((x) => (x.id === id ? { ...x, status } : x)) }, `Application ${id} marked ${status} (simulation)`)), [update]);

  return { state, toggleCheck, setProvider, setEnabled, setKillSwitch, setProgrammeCap, clearRuns, resetPilot, applyToPilot, setApplicationStatus };
}
