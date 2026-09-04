import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestDb } from "@nurunode/database/pglite";
import type { Db } from "@nurunode/database";
import { NuruError } from "@nurunode/shared";
import type {
  PaymentAdapter,
  PaymentWebhookEvent,
  TopUpIntent,
  TopUpIntentRequest,
  TopUpStatus,
  TopUpStatusResult,
} from "@nurunode/payment-adapters";
import { MockProviderAdapter } from "@nurunode/provider-adapters";
import { buildApp } from "./app";
import { loadEnv } from "./env";

/**
 * A stand-in for the MTN sandbox: behaves like a real async provider whose
 * status we can flip from the test, so the confirm/poll flow is exercised
 * without network access.
 */
class FakeSandboxAdapter implements PaymentAdapter {
  readonly provider = "momo_sandbox";
  readonly mode = "sandbox" as const;
  remote = new Map<string, TopUpStatus>();
  statusCalls = 0;
  private n = 0;
  async createTopUpIntent(req: TopUpIntentRequest): Promise<TopUpIntent> {
    const ref = `ref-${++this.n}`;
    this.remote.set(ref, "pending");
    return {
      provider: this.provider,
      providerRef: ref,
      amountPesewas: req.amountPesewas,
      instructions: "approve on phone",
    };
  }
  async getTopUpStatus(providerRef: string): Promise<TopUpStatusResult> {
    this.statusCalls++;
    const s = this.remote.get(providerRef);
    if (!s) throw new NuruError("NOT_FOUND");
    return { status: s, providerRef, amountPesewas: 2000 };
  }
  verifyWebhook(): void {
    throw new NuruError("NOT_CONFIGURED");
  }
  parseWebhook(): PaymentWebhookEvent {
    throw new NuruError("NOT_CONFIGURED");
  }
}

let db: Db;
let app: FastifyInstance;
let token: string;
let orgId: string;
const payment = new FakeSandboxAdapter();
const auth = () => ({ authorization: `Bearer ${token}` });

beforeAll(async () => {
  db = await createTestDb();
  app = buildApp({
    db,
    env: loadEnv({
      NODE_ENV: "test",
      SESSION_SECRET: "test-session-secret-that-is-long-enough-123",
      ALLOW_DEV_LOGIN: "true",
      PAYMENT_ADAPTER: "momo_sandbox",
    }),
    paymentAdapter: payment,
    providerAdapter: new MockProviderAdapter(),
  });
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/auth/dev-login",
    payload: { email: "sandbox@nurunode.test" },
  });
  token = login.json().token;
  const org = await app.inject({
    method: "POST",
    url: "/orgs",
    headers: auth(),
    payload: { name: "Sandbox Org" },
  });
  orgId = org.json().id;
});

afterAll(async () => {
  await app.close();
  await db.close();
});

describe("sandbox top-up flow (create -> confirm)", () => {
  let ref: string;

  it("reports sandbox mode on /health and refuses the mock simulate route", async () => {
    const h = await app.inject({ method: "GET", url: "/health" });
    expect(h.json()).toMatchObject({ paymentMode: "sandbox", mockMode: false, liveMoney: false });
    const sim = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups/simulate`,
      headers: auth(),
      payload: { amountPesewas: 2000, phone: "0241234567" },
    });
    expect(sim.statusCode).toBe(501);
  });

  it("creates a pending intent without crediting anything", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups`,
      headers: auth(),
      payload: { amountPesewas: 2000, phone: "0241234567" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ mode: "sandbox", status: "pending" });
    ref = res.json().intent.providerRef;
    const w = await app.inject({ method: "GET", url: `/orgs/${orgId}/wallet`, headers: auth() });
    expect(w.json().availablePesewas).toBe(0);
  });

  it("confirm returns pending while the payer has not approved", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups/${ref}/confirm`,
      headers: auth(),
    });
    expect(res.json()).toMatchObject({ status: "pending", credited: false });
    expect(res.json().balance.availablePesewas).toBe(0);
  });

  it("credits exactly once when the provider reports success, even when polled repeatedly", async () => {
    payment.remote.set(ref, "succeeded");
    const first = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups/${ref}/confirm`,
      headers: auth(),
    });
    expect(first.json()).toMatchObject({ status: "succeeded", credited: true });
    expect(first.json().balance.availablePesewas).toBe(2000);

    const callsBefore = payment.statusCalls;
    const again = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups/${ref}/confirm`,
      headers: auth(),
    });
    expect(again.json()).toMatchObject({ status: "succeeded", credited: false });
    expect(again.json().balance.availablePesewas).toBe(2000);
    // Already settled locally: no extra provider round-trip.
    expect(payment.statusCalls).toBe(callsBefore);

    const ledger = await app.inject({ method: "GET", url: `/orgs/${orgId}/ledger`, headers: auth() });
    const topUps = ledger.json().entries.filter((e: { entryType: string }) => e.entryType === "top_up");
    expect(topUps).toHaveLength(1);
  });

  it("marks failed payments as failed with no credit", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups`,
      headers: auth(),
      payload: { amountPesewas: 2000, phone: "46733123450" },
    });
    const failedRef = created.json().intent.providerRef;
    payment.remote.set(failedRef, "failed");
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups/${failedRef}/confirm`,
      headers: auth(),
    });
    expect(res.json()).toMatchObject({ status: "failed", credited: false });
    expect(res.json().balance.availablePesewas).toBe(2000);
  });

  it("unsigned MTN callbacks only trigger a re-verify and never credit by themselves", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups`,
      headers: auth(),
      payload: { amountPesewas: 2000, phone: "0241234567" },
    });
    const cbRef = created.json().intent.providerRef;
    // Attacker-style callback claiming success while the provider still says pending.
    const spoof = await app.inject({
      method: "PUT",
      url: "/webhooks/payments/momo",
      payload: { referenceId: cbRef, status: "SUCCESSFUL" },
    });
    expect(spoof.json()).toMatchObject({ status: "pending", credited: false });
    // Unknown reference is ignored quietly.
    const unknown = await app.inject({
      method: "PUT",
      url: "/webhooks/payments/momo",
      payload: { referenceId: "does-not-exist" },
    });
    expect(unknown.json()).toEqual({ ignored: true });
  });

  it("does not let another organisation confirm my top-up", async () => {
    const other = await app.inject({
      method: "POST",
      url: "/auth/dev-login",
      payload: { email: "intruder@nurunode.test" },
    });
    const otherToken = other.json().token;
    const otherOrg = await app.inject({
      method: "POST",
      url: "/orgs",
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { name: "Other" },
    });
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${otherOrg.json().id}/topups/${ref}/confirm`,
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
