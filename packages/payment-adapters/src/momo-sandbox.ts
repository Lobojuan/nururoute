import { randomUUID } from "node:crypto";
import { NuruError, type Pesewas } from "@nurunode/shared";
import type {
  PaymentAdapter,
  PaymentWebhookEvent,
  TopUpIntent,
  TopUpIntentRequest,
  TopUpStatusResult,
} from "./index";

/**
 * MomoSandboxAdapter — MTN Mobile Money *Collections* API, sandbox target only.
 *
 * Feature flag: PAYMENT_ADAPTER=momo_sandbox. The adapter refuses any target
 * environment other than "sandbox", so it can never move real customer money.
 *
 * Flow:
 *   1. POST /collection/token/                       -> bearer token (Basic apiUser:apiKey)
 *   2. POST /collection/v1_0/requesttopay            -> 202, X-Reference-Id we generated
 *   3. GET  /collection/v1_0/requesttopay/{ref}      -> PENDING | SUCCESSFUL | FAILED
 *
 * MTN callbacks are NOT signed, so the API never credits a wallet from a callback
 * body. It always re-reads the status from MTN (step 3) before crediting.
 *
 * Sandbox quirks (from MTN docs):
 *   - Only currency "EUR" is accepted in sandbox.
 *   - Special test MSISDNs: 46733123450 FAILED, 46733123451 REJECTED,
 *     46733123452 TIMEOUT, 46733123453 ONGOING/PENDING, 46733123454 PENDING.
 *     Any other number is approved immediately.
 */

export const MOMO_SANDBOX_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

export interface MomoSandboxConfig {
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  /** Must be "sandbox". Anything else is rejected at construction time. */
  targetEnvironment: string;
  baseUrl?: string;
  /** Sandbox only supports EUR. Kept configurable for future live use (needs approval). */
  currency?: string;
  /** Optional callback URL; host must match the providerCallbackHost used at provisioning. */
  callbackUrl?: string;
  fetch?: typeof fetch;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface RequestToPayStatus {
  amount?: string;
  currency?: string;
  financialTransactionId?: string;
  externalId?: string;
  status?: "PENDING" | "SUCCESSFUL" | "FAILED";
  reason?: string | { code?: string; message?: string };
}

/** Normalise a Ghana local number (024xxxxxxx) to an MSISDN (23324xxxxxxx). */
export function toMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `233${digits.slice(1)}`;
  return digits;
}

/** MTN expects a decimal string in major units. */
export function pesewasToMajor(pesewas: Pesewas): string {
  const major = pesewas / 100;
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}

export function majorToPesewas(amount: string | undefined): Pesewas | undefined {
  if (amount === undefined) return undefined;
  const n = Number(amount);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}

export class MomoSandboxAdapter implements PaymentAdapter {
  readonly provider = "momo_sandbox";
  readonly mode = "sandbox" as const;

  private readonly baseUrl: string;
  private readonly currency: string;
  private readonly fetchImpl: typeof fetch;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly cfg: MomoSandboxConfig) {
    if (cfg.targetEnvironment !== "sandbox") {
      throw new Error(
        `MomoSandboxAdapter only supports MTN_MOMO_TARGET_ENV=sandbox (got "${cfg.targetEnvironment}"). Live environments need explicit approval and a separate adapter.`,
      );
    }
    for (const [k, v] of Object.entries({
      MTN_MOMO_SUBSCRIPTION_KEY: cfg.subscriptionKey,
      MTN_MOMO_API_USER: cfg.apiUser,
      MTN_MOMO_API_KEY: cfg.apiKey,
    })) {
      if (!v || v.startsWith("mock")) {
        throw new Error(
          `${k} must be set to a real MTN *sandbox* credential when PAYMENT_ADAPTER=momo_sandbox (run: bun run momo:provision).`,
        );
      }
    }
    this.baseUrl = (cfg.baseUrl ?? MOMO_SANDBOX_BASE_URL).replace(/\/$/, "");
    this.currency = cfg.currency ?? "EUR";
    this.fetchImpl = cfg.fetch ?? globalThis.fetch;
  }

  private async bearer(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const basic = Buffer.from(`${this.cfg.apiUser}:${this.cfg.apiKey}`).toString("base64");
    const res = await this.fetchImpl(`${this.baseUrl}/collection/token/`, {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "ocp-apim-subscription-key": this.cfg.subscriptionKey,
      },
    });
    if (!res.ok) {
      throw new NuruError(
        "PROVIDER_ERROR",
        `MTN sandbox token request failed (${res.status}). Check MTN_MOMO_* credentials.`,
      );
    }
    const body = (await res.json()) as TokenResponse;
    this.token = {
      value: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };
    return this.token.value;
  }

  private async headers(): Promise<Record<string, string>> {
    return {
      authorization: `Bearer ${await this.bearer()}`,
      "ocp-apim-subscription-key": this.cfg.subscriptionKey,
      "x-target-environment": this.cfg.targetEnvironment,
      "content-type": "application/json",
    };
  }

  async createTopUpIntent(req: TopUpIntentRequest): Promise<TopUpIntent> {
    if (!req.phone) {
      throw new NuruError("VALIDATION_ERROR", "A mobile money number is required for MoMo top-ups");
    }
    const referenceId = randomUUID();
    const msisdn = toMsisdn(req.phone);
    const headers: Record<string, string> = {
      ...(await this.headers()),
      "x-reference-id": referenceId,
    };
    if (this.cfg.callbackUrl) headers["x-callback-url"] = this.cfg.callbackUrl;

    const res = await this.fetchImpl(`${this.baseUrl}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        amount: pesewasToMajor(req.amountPesewas),
        currency: this.currency,
        externalId: req.walletId,
        payer: { partyIdType: "MSISDN", partyId: msisdn },
        payerMessage: "NuruNode wallet top-up (sandbox)",
        payeeNote: `wallet:${req.walletId}`,
      }),
    });
    if (res.status !== 202) {
      const text = await res.text().catch(() => "");
      throw new NuruError(
        "PROVIDER_ERROR",
        `MTN sandbox requesttopay failed (${res.status}) ${text}`.trim(),
      );
    }
    return {
      provider: this.provider,
      providerRef: referenceId,
      amountPesewas: req.amountPesewas,
      instructions: `MTN SANDBOX: a ${this.currency} ${pesewasToMajor(req.amountPesewas)} request-to-pay was sent to ${msisdn}. No real money moves in sandbox.`,
    };
  }

  async getTopUpStatus(providerRef: string): Promise<TopUpStatusResult> {
    const res = await this.fetchImpl(`${this.baseUrl}/collection/v1_0/requesttopay/${providerRef}`, {
      method: "GET",
      headers: await this.headers(),
    });
    if (res.status === 404) {
      throw new NuruError("NOT_FOUND", `MTN sandbox has no request ${providerRef}`);
    }
    if (!res.ok) {
      throw new NuruError("PROVIDER_ERROR", `MTN sandbox status check failed (${res.status})`);
    }
    const body = (await res.json()) as RequestToPayStatus;
    const reason =
      typeof body.reason === "string" ? body.reason : (body.reason?.message ?? body.reason?.code);
    const base = {
      providerRef,
      ...(majorToPesewas(body.amount) !== undefined
        ? { amountPesewas: majorToPesewas(body.amount)! }
        : {}),
      ...(body.financialTransactionId
        ? { financialTransactionId: body.financialTransactionId }
        : {}),
      ...(reason ? { reason } : {}),
    };
    switch (body.status) {
      case "SUCCESSFUL":
        return { status: "succeeded", ...base };
      case "FAILED":
        return { status: "failed", ...base };
      default:
        return { status: "pending", ...base };
    }
  }

  /** MTN callbacks carry no signature; the API never trusts them for ledger writes. */
  verifyWebhook(): void {
    throw new NuruError(
      "NOT_CONFIGURED",
      "MTN MoMo callbacks are unsigned. Use POST /orgs/:orgId/topups/:providerRef/confirm, which re-verifies with MTN.",
    );
  }

  parseWebhook(): PaymentWebhookEvent {
    throw new NuruError("NOT_CONFIGURED", "Not supported for momo_sandbox");
  }
}
