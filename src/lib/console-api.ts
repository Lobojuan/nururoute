/**
 * Browser client for the organisation console. Talks only to the same-origin
 * proxy at /api/nuru/*. Types mirror the API contracts in packages/shared
 * without importing them (the public app must stay decoupled from the workspace
 * packages).
 */

import { useEffect, useState } from "react";


export type WalletBalance = {
  walletId: string;
  currency: "GHS";
  availablePesewas: number;
  reservedPesewas: number;
  lifetimeTopUpsPesewas: number;
  lifetimeSpentPesewas: number;
};
export type LedgerEntry = {
  id: string;
  entryType: "top_up" | "reserve" | "settle" | "release" | "refund" | string;
  amountPesewas: number;
  reservationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};
export type UsageRequest = {
  id: string;
  model_id: string;
  status: string;
  input_tokens: number | null;
  output_tokens: number | null;
  reserved_pesewas: number;
  actual_pesewas: number | null;
  released_pesewas: number | null;
  error_code: string | null;
  created_at: string;
};
export type ApiKeySummary = { id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
export type OrgModel = {
  id: string;
  displayName: string;
  inputPricePer1kPesewas: number;
  outputPricePer1kPesewas: number;
  customPrice: boolean;
  examplePer1kPesewas: number;
};
export type Org = { id: string; name: string; role: string; walletId: string };
export type Me = { user: { id: string; email: string }; organisations: Org[] };
export type AiResult = {
  requestId: string;
  modelId: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  reservedPesewas: number;
  actualPesewas: number;
  releasedPesewas: number;
  balance: WalletBalance;
};

const TOKEN_KEY = "nururoute.console.session";
const ORG_KEY = "nururoute.console.org";

export const session = {
  get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string | null) => (t ? window.localStorage.setItem(TOKEN_KEY, t) : window.localStorage.removeItem(TOKEN_KEY)),
  org: () => (typeof window === "undefined" ? null : window.localStorage.getItem(ORG_KEY)),
  setOrg: (id: string | null) => (id ? window.localStorage.setItem(ORG_KEY, id) : window.localStorage.removeItem(ORG_KEY)),
};

export class ConsoleError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = session.get();
  if (token) headers["authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/nuru${path}`, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  // The proxy reports an unreachable backend as a 200 envelope; surface it as API_OFFLINE.
  if (body["offline"] === true || body["error"] === "API_OFFLINE") {
    throw new ConsoleError(503, "API_OFFLINE", String(body["message"] ?? "Organisation data is currently unavailable."));
  }
  if (!res.ok) {
    throw new ConsoleError(res.status, String(body["error"] ?? "ERROR"), String(body["message"] ?? `Request failed (${res.status})`));
  }
  return body as T;
}

export const consoleApi = {
  /** Resolves only when the backend is reachable; an offline backend rejects with API_OFFLINE. */
  health: () => call<{ ok: boolean; paymentAdapter: string; paymentMode: string; providerAdapter: string; liveMoney: boolean }>("/health"),
  devLogin: (email: string, name?: string) =>
    call<{ token: string; user: { id: string; email: string; name: string | null } }>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email, ...(name ? { name } : {}) }),
    }),
  me: () => call<Me>("/me"),
  createOrg: (name: string) => call<Org>("/orgs", { method: "POST", body: JSON.stringify({ name }) }),
  wallet: (orgId: string) => call<WalletBalance>(`/orgs/${orgId}/wallet`),
  ledger: (orgId: string) => call<{ entries: LedgerEntry[] }>(`/orgs/${orgId}/ledger`),
  requests: (orgId: string) => call<{ requests: UsageRequest[] }>(`/orgs/${orgId}/requests`),
  models: (orgId: string) => call<{ models: OrgModel[] }>(`/orgs/${orgId}/models`),
  simulateTopUp: (orgId: string, amountPesewas: number, phone?: string) =>
    call<{ balance: WalletBalance }>(`/orgs/${orgId}/topups/simulate`, {
      method: "POST",
      body: JSON.stringify({ amountPesewas, ...(phone ? { phone } : {}) }),
    }),
  aiRequest: (orgId: string, modelId: string, prompt: string, maxOutputTokens = 256) =>
    call<AiResult>(`/orgs/${orgId}/ai/requests`, { method: "POST", body: JSON.stringify({ modelId, prompt, maxOutputTokens }) }),
  apiKeys: (orgId: string) => call<{ keys: ApiKeySummary[] }>(`/orgs/${orgId}/api-keys`),
  createApiKey: (orgId: string, name: string) =>
    call<{ key: ApiKeySummary; secret: string }>(`/orgs/${orgId}/api-keys`, { method: "POST", body: JSON.stringify({ name }) }),
  revokeApiKey: (orgId: string, keyId: string) => call<unknown>(`/orgs/${orgId}/api-keys/${keyId}`, { method: "DELETE" }),
};

export type ApiStatus = "checking" | "live" | "simulated";

/** Polls the same-origin proxy health endpoint to report whether the console
 * is reading live organisation data or showing labelled demo data. */
export function useApiStatus(intervalMs = 30_000): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>("checking");
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const h = await consoleApi.health();
        if (!cancelled) setStatus(h.ok ? "live" : "simulated");
      } catch {
        if (!cancelled) setStatus("simulated");
      }
    };
    void check();
    const id = window.setInterval(() => void check(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intervalMs]);
  return status;
}
