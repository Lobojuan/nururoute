import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NuruError, type Pesewas } from "@nurunode/shared";

/**
 * PaymentAdapter: how NuruNode talks to a mobile-money / card provider.
 * Only the mock implementation exists in this MVP. Real adapters must implement
 * the same interface and be reviewed per docs/security-and-money-rules.md.
 */

export interface TopUpIntentRequest {
  walletId: string;
  amountPesewas: Pesewas;
  phone?: string;
}

export interface TopUpIntent {
  provider: string;
  providerRef: string;
  amountPesewas: Pesewas;
  /** Human-readable hint shown in the dashboard (e.g. "Approve the prompt on your phone"). */
  instructions: string;
}

export interface PaymentWebhookEvent {
  provider: string;
  eventId: string;
  type: "payment.succeeded" | "payment.failed";
  providerRef: string;
  amountPesewas: Pesewas;
  walletId: string;
  occurredAt: string;
}

export interface SignedWebhook {
  rawBody: string;
  signature: string;
  headers: Record<string, string>;
}

export type TopUpStatus = "pending" | "succeeded" | "failed";

export interface TopUpStatusResult {
  status: TopUpStatus;
  providerRef: string;
  /** Amount the provider reports, if any — the API cross-checks it against the intent. */
  amountPesewas?: Pesewas;
  financialTransactionId?: string;
  reason?: string;
}

export interface PaymentAdapter {
  readonly provider: string;
  /** "mock" moves nothing; "sandbox" talks to a provider test environment (still no real money). */
  readonly mode: "mock" | "sandbox";
  createTopUpIntent(req: TopUpIntentRequest): Promise<TopUpIntent>;
  /** Server-side source of truth for whether a payment completed. */
  getTopUpStatus(providerRef: string): Promise<TopUpStatusResult>;
  /** Verifies signature over raw body; throws NuruError("INVALID_SIGNATURE"). */
  verifyWebhook(rawBody: string, signature: string | undefined): void;
  parseWebhook(rawBody: string): PaymentWebhookEvent;
}

export const WEBHOOK_SIGNATURE_HEADER = "x-nurunode-signature";

export function hmacHex(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * MockMomoAdapter simulates MTN Mobile Money. No network calls, no money.
 * It can also *produce* signed webhooks so the API can simulate provider callbacks.
 */
export class MockMomoAdapter implements PaymentAdapter {
  readonly provider = "mock_momo";
  readonly mode = "mock" as const;
  /** providerRef -> status, so the generic create/confirm flow also works in mock mode. */
  private readonly statuses = new Map<string, TopUpStatus>();

  constructor(private readonly webhookSecret: string) {
    if (!webhookSecret)
      throw new Error("MockMomoAdapter requires a webhook secret (placeholder is fine)");
  }

  async createTopUpIntent(req: TopUpIntentRequest): Promise<TopUpIntent> {
    const providerRef = `momo_${randomUUID()}`;
    // Mock rule: numbers ending in "0000" are declined, everything else is approved instantly.
    this.statuses.set(providerRef, req.phone?.endsWith("0000") ? "failed" : "succeeded");
    return {
      provider: this.provider,
      providerRef,
      amountPesewas: req.amountPesewas,
      instructions: `MOCK: pretend you approved a GHS ${(req.amountPesewas / 100).toFixed(2)} prompt on ${req.phone ?? "your phone"}.`,
    };
  }

  async getTopUpStatus(providerRef: string): Promise<TopUpStatusResult> {
    const status = this.statuses.get(providerRef);
    if (!status) throw new NuruError("NOT_FOUND", `Unknown mock payment ${providerRef}`);
    return { status, providerRef };
  }

  /** Build the webhook the mock provider would send after a successful payment. */
  buildWebhook(
    intent: TopUpIntent & { walletId: string },
    opts: { eventId?: string; fail?: boolean } = {},
  ): SignedWebhook {
    const event: PaymentWebhookEvent = {
      provider: this.provider,
      eventId: opts.eventId ?? `evt_${randomUUID()}`,
      type: opts.fail ? "payment.failed" : "payment.succeeded",
      providerRef: intent.providerRef,
      amountPesewas: intent.amountPesewas,
      walletId: intent.walletId,
      occurredAt: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(event);
    const signature = hmacHex(this.webhookSecret, rawBody);
    return {
      rawBody,
      signature,
      headers: { "content-type": "application/json", [WEBHOOK_SIGNATURE_HEADER]: signature },
    };
  }

  verifyWebhook(rawBody: string, signature: string | undefined): void {
    if (!signature)
      throw new NuruError("INVALID_SIGNATURE", "INVALID_SIGNATURE: missing signature");
    const expected = Buffer.from(hmacHex(this.webhookSecret, rawBody), "hex");
    let given: Buffer;
    try {
      given = Buffer.from(signature, "hex");
    } catch {
      throw new NuruError("INVALID_SIGNATURE");
    }
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new NuruError("INVALID_SIGNATURE");
    }
  }

  parseWebhook(rawBody: string): PaymentWebhookEvent {
    const parsed = JSON.parse(rawBody) as Partial<PaymentWebhookEvent>;
    if (
      parsed.provider !== this.provider ||
      typeof parsed.eventId !== "string" ||
      typeof parsed.providerRef !== "string" ||
      typeof parsed.walletId !== "string" ||
      typeof parsed.amountPesewas !== "number" ||
      !Number.isInteger(parsed.amountPesewas) ||
      parsed.amountPesewas <= 0 ||
      (parsed.type !== "payment.succeeded" && parsed.type !== "payment.failed")
    ) {
      throw new NuruError("VALIDATION_ERROR", "malformed webhook payload");
    }
    return parsed as PaymentWebhookEvent;
  }
}

import { MomoSandboxAdapter } from "./momo-sandbox";
export { MomoSandboxAdapter, toMsisdn, pesewasToMajor, majorToPesewas } from "./momo-sandbox";
export type { MomoSandboxConfig } from "./momo-sandbox";

export interface PaymentAdapterEnv {
  MOCK_WEBHOOK_SECRET?: string | undefined;
  MTN_MOMO_SUBSCRIPTION_KEY?: string | undefined;
  MTN_MOMO_API_USER?: string | undefined;
  MTN_MOMO_API_KEY?: string | undefined;
  MTN_MOMO_TARGET_ENV?: string | undefined;
  MTN_MOMO_BASE_URL?: string | undefined;
  MTN_MOMO_CURRENCY?: string | undefined;
  MTN_MOMO_CALLBACK_URL?: string | undefined;
}

export const PAYMENT_ADAPTER_KINDS = ["mock", "momo_sandbox"] as const;

export function createPaymentAdapter(kind: string | undefined, env: PaymentAdapterEnv): PaymentAdapter {
  if (!kind || kind === "mock")
    return new MockMomoAdapter(env.MOCK_WEBHOOK_SECRET ?? "mock-webhook-secret-not-real");
  if (kind === "momo_sandbox") {
    return new MomoSandboxAdapter({
      subscriptionKey: env.MTN_MOMO_SUBSCRIPTION_KEY ?? "",
      apiUser: env.MTN_MOMO_API_USER ?? "",
      apiKey: env.MTN_MOMO_API_KEY ?? "",
      targetEnvironment: env.MTN_MOMO_TARGET_ENV ?? "sandbox",
      ...(env.MTN_MOMO_BASE_URL ? { baseUrl: env.MTN_MOMO_BASE_URL } : {}),
      ...(env.MTN_MOMO_CURRENCY ? { currency: env.MTN_MOMO_CURRENCY } : {}),
      ...(env.MTN_MOMO_CALLBACK_URL ? { callbackUrl: env.MTN_MOMO_CALLBACK_URL } : {}),
    });
  }
  throw new NuruError(
    "NOT_CONFIGURED",
    `Payment adapter "${kind}" is not available. Use PAYMENT_ADAPTER=mock or momo_sandbox.`,
  );
}
