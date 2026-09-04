"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { WalletBalance } from "@nurunode/shared";
import { ApiError, api, getSavedOrg, getToken, saveOrg, setToken, type Health, type Org } from "./api";

interface Session {
  ready: boolean;
  user: { id: string; email: string } | null;
  orgs: Org[];
  org: Org | null;
  wallet: WalletBalance | null;
  health: Health | null;
  error: string | null;
  selectOrg: (id: string) => void;
  refreshWallet: () => Promise<void>;
  reloadOrgs: () => Promise<Org[]>;
  signOut: () => void;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Session["user"]>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const org = useMemo(() => orgs.find((o) => o.id === orgId) ?? null, [orgs, orgId]);

  const signOut = useCallback(() => {
    setToken(null);
    saveOrg(null);
    router.replace("/");
  }, [router]);

  const reloadOrgs = useCallback(async () => {
    const me = await api.me();
    setUser(me.user);
    setOrgs(me.organisations);
    const saved = getSavedOrg();
    const pick = me.organisations.find((o) => o.id === saved) ?? me.organisations[0] ?? null;
    setOrgId(pick?.id ?? null);
    return me.organisations;
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!orgId) return;
    setWallet(await api.wallet(orgId));
  }, [orgId]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const [list, h] = await Promise.all([reloadOrgs(), api.health().catch(() => null)]);
        setHealth(h);
        if (list.length === 0) router.replace("/onboarding");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return signOut();
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setReady(true);
      }
    })();
  }, [router, reloadOrgs, signOut]);

  useEffect(() => {
    if (!orgId) return;
    saveOrg(orgId);
    api.wallet(orgId).then(setWallet).catch(() => setWallet(null));
  }, [orgId]);

  const value: Session = {
    ready,
    user,
    orgs,
    org,
    wallet,
    health,
    error,
    selectOrg: setOrgId,
    refreshWallet,
    reloadOrgs,
    signOut,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}
