"use client";

import type {
  AiRequestResult,
  ApiKeySummary,
  LedgerEntry,
  OrgModelInfo,
  WalletBalance,
} from "@nurunode/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "nurunode.session";
const ORG_KEY = "nurunode.org";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}
export function getSavedOrg(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ORG_KEY);
}
export function saveOrg(id: string | null) {
  if (id) window.localStorage.setItem(ORG_KEY, id);
  else window.localStorage.removeItem(ORG_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body: Record<string, unknown>,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers["authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK", `Cannot reach the NuruNode API at ${API_URL}.`, {});
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      String(body["error"] ?? "ERROR"),
      String(body["message"] ?? res.statusText),
      body,
    );
  }
  return body as T;
}

export interface Org {
  id: string;
  name: string;
  role: string;
  walletId: string;
}

export interface Health {
  ok: boolean;
  paymentAdapter: string;
  paymentMode: "mock" | "sandbox";
  providerAdapter: string;
  mockMode: boolean;
  liveMoney: boolean;
}

export interface UsageRequestRow {
  id: string;
  model_id: string;
  status: "reserved" | "completed" | "failed" | "rejected";
  input_tokens: number | null;
  output_tokens: number | null;
  reserved_pesewas: string | number;
  actual_pesewas: string | number | null;
  released_pesewas: string | number | null;
  error_code: string | null;
  created_at: string;
}

export interface TopUpRow {
  id: string;
  provider: string;
  provider_ref: string;
  amount_pesewas: string | number;
  status: "pending" | "succeeded" | "failed";
  created_at: string;
}

export interface TopUpIntentDto {
  provider: string;
  providerRef: string;
  amountPesewas: number;
  instructions: string;
}

export const api = {
  health: () => call<Health>("/health"),
  devLogin: (email: string, name?: string) =>
    call<{ token: string; user: { id: string; email: string } }>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email, name }),
    }),
  me: () => call<{ user: { id: string; email: string }; organisations: Org[] }>("/me"),
  createOrg: (name: string) =>
    call<Org>("/orgs", { method: "POST", body: JSON.stringify({ name }) }),
  wallet: (orgId: string) => call<WalletBalance>(`/orgs/${orgId}/wallet`),
  ledger: (orgId: string) => call<{ entries: LedgerEntry[] }>(`/orgs/${orgId}/ledger`),
  requests: (orgId: string) => call<{ requests: UsageRequestRow[] }>(`/orgs/${orgId}/requests`),
  topups: (orgId: string) => call<{ topups: TopUpRow[] }>(`/orgs/${orgId}/topups`),
  orgModels: (orgId: string) => call<{ models: OrgModelInfo[] }>(`/orgs/${orgId}/models`),
  setPrice: (orgId: string, modelId: string, price: { inputPricePer1kPesewas: number; outputPricePer1kPesewas: number }) =>
    call<{ models: OrgModelInfo[] }>(`/orgs/${orgId}/pricing/${modelId}`, {
      method: "PUT",
      body: JSON.stringify(price),
    }),
  resetPrice: (orgId: string, modelId: string) =>
    call<{ models: OrgModelInfo[] }>(`/orgs/${orgId}/pricing/${modelId}`, { method: "DELETE" }),
  simulateTopUp: (orgId: string, amountPesewas: number, phone?: string) =>
    call<{ balance: WalletBalance; intent: TopUpIntentDto }>(`/orgs/${orgId}/topups/simulate`, {
      method: "POST",
      body: JSON.stringify({ amountPesewas, phone: phone || undefined }),
    }),
  createTopUp: (orgId: string, amountPesewas: number, phone?: string) =>
    call<{ intent: TopUpIntentDto; mode: "mock" | "sandbox"; status: "pending" }>(
      `/orgs/${orgId}/topups`,
      { method: "POST", body: JSON.stringify({ amountPesewas, phone: phone || undefined }) },
    ),
  confirmTopUp: (orgId: string, providerRef: string) =>
    call<{ status: "pending" | "succeeded" | "failed"; credited: boolean; reason?: string; balance: WalletBalance }>(
      `/orgs/${orgId}/topups/${providerRef}/confirm`,
      { method: "POST" },
    ),
  runRequest: (orgId: string, input: { modelId: string; prompt: string; maxOutputTokens: number }) =>
    call<AiRequestResult>(`/orgs/${orgId}/ai/requests`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  apiKeys: (orgId: string) => call<{ keys: ApiKeySummary[] }>(`/orgs/${orgId}/api-keys`),
  createApiKey: (orgId: string, name: string) =>
    call<{ key: ApiKeySummary; secret: string }>(`/orgs/${orgId}/api-keys`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  revokeApiKey: (orgId: string, keyId: string) =>
    call<{ revoked: true }>(`/orgs/${orgId}/api-keys/${keyId}`, { method: "DELETE" }),
};
