/**
 * NuruRoute public demo state.
 *
 * Everything here is simulated in the browser. It never talks to the NuruNode
 * API, ledger, payment adapters or provider adapters. It exists so the public
 * pages can show a realistic wallet, reservations and project history under a
 * visible "Demo mode" label.
 */
import { pilotKillSwitchOn, recordPilotRun } from "./pilot-demo";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const DEMO_NOTICE = "Demo mode — no real money or live AI access.";

export function formatGhs(pesewas: number, opts: { compact?: boolean } = {}) {
  const ghs = pesewas / 100;
  if (opts.compact && ghs >= 1000) return `GHS ${(ghs / 1000).toFixed(1)}k`;
  return `GHS ${ghs.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Operator display name, e.g. "MTN MoMo", "M-Pesa", "Wave". Free-form so every African rail fits. */
export type Network = string;

export type DemoTx =
  | { id: string; kind: "topup"; at: number; pesewas: number; network: Network; phone: string }
  | { id: string; kind: "reserve"; at: number; pesewas: number; label: string }
  | { id: string; kind: "settle"; at: number; pesewas: number; label: string }
  | { id: string; kind: "release"; at: number; pesewas: number; label: string };

export type DemoProject = {
  id: string;
  at: number;
  studio: "Image" | "Video" | "Voice" | "Dubbing" | "Audiobooks";
  title: string;
  model: string;
  reserved: number;
  actual: number;
  status: "settled";
};

type DemoState = {
  /** When set, balances mirror a real organisation wallet loaded via the console. */
  linked: { orgName: string; walletId: string; at: number } | null;
  phone: string | null;
  network: Network | null;
  available: number;
  reserved: number;
  spent: number;
  topups: number;
  tx: DemoTx[];
  projects: DemoProject[];
};

const EMPTY: DemoState = {
  linked: null,
  phone: null,
  network: null,
  available: 0,
  reserved: 0,
  spent: 0,
  topups: 0,
  tx: [],
  projects: [],
};

const KEY = "nururoute.demo.v1";

type Ctx = DemoState & {
  hydrated: boolean;
  link: (phone: string, network: Network) => void;
  topUp: (pesewas: number) => void;
  /** Reserve → settle → release, simulated. Returns false if insufficient. */
  run: (label: string, maxPesewas: number, actualPesewas: number, project?: Omit<DemoProject, "id" | "at" | "reserved" | "actual" | "status">) => boolean;
  reset: () => void;
  /** Mirror a real wallet balance (from the organisation console) into the public state. */
  syncFromWallet: (orgName: string, w: { walletId: string; availablePesewas: number; reservedPesewas: number; lifetimeSpentPesewas: number; lifetimeTopUpsPesewas: number }) => void;
  unlink: () => void;
};

const DemoContext = createContext<Ctx | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...(JSON.parse(raw) as DemoState) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const link = useCallback((phone: string, network: Network) => {
    setState((s) => ({ ...s, phone, network }));
  }, []);

  const topUp = useCallback((pesewas: number) => {
    setState((s) => ({
      ...s,
      available: s.available + pesewas,
      topups: s.topups + pesewas,
      tx: [
        { id: uid(), kind: "topup" as const, at: Date.now(), pesewas, network: s.network ?? "MTN", phone: s.phone ?? "—" },
        ...s.tx,
      ].slice(0, 40),
    }));
  }, []);

  const run = useCallback<Ctx["run"]>((label, max, actual, project) => {
    let ok = false;
    if (pilotKillSwitchOn()) {
      recordPilotRun({ label, reservedPesewas: 0, settledPesewas: 0, outcome: "blocked" });
      return false;
    }
    setState((s) => {
      if (s.available < max || max <= 0) {
        recordPilotRun({ label, reservedPesewas: max, settledPesewas: 0, outcome: "rejected" });
        return s;
      }
      ok = true;
      recordPilotRun({ label, reservedPesewas: max, settledPesewas: actual, outcome: actual < max ? "released" : "settled" });
      const now = Date.now();
      const released = Math.max(0, max - actual);
      const tx: DemoTx[] = [
        { id: uid(), kind: "release", at: now + 2, pesewas: released, label },
        { id: uid(), kind: "settle", at: now + 1, pesewas: actual, label },
        { id: uid(), kind: "reserve", at: now, pesewas: max, label },
        ...s.tx,
      ];
      const projects = project
        ? [{ id: uid(), at: now, reserved: max, actual, status: "settled" as const, ...project }, ...s.projects].slice(0, 30)
        : s.projects;
      return {
        ...s,
        available: s.available - actual,
        spent: s.spent + actual,
        tx: tx.slice(0, 40),
        projects,
      };
    });
    return ok;
  }, []);

  const reset = useCallback(() => setState(EMPTY), []);

  const syncFromWallet = useCallback<Ctx["syncFromWallet"]>((orgName, w) => {
    setState((s) => ({
      ...s,
      linked: { orgName, walletId: w.walletId, at: Date.now() },
      available: w.availablePesewas,
      reserved: w.reservedPesewas,
      spent: w.lifetimeSpentPesewas,
      topups: w.lifetimeTopUpsPesewas,
    }));
  }, []);
  const unlink = useCallback(() => setState((s) => ({ ...s, linked: null })), []);

  const value = useMemo<Ctx>(
    () => ({ ...state, hydrated, link, topUp, run, reset, syncFromWallet, unlink }),
    [state, hydrated, link, topUp, run, reset, syncFromWallet, unlink],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
