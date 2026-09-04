import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestDb } from "@nurunode/database/pglite";
import type { Db } from "@nurunode/database";
import { MockMomoAdapter } from "@nurunode/payment-adapters";
import { MockProviderAdapter } from "@nurunode/provider-adapters";
import { buildApp } from "./app";
import { loadEnv } from "./env";

let db: Db;
let app: FastifyInstance;
let token: string;
let orgId: string;
let walletId: string;
const payment = new MockMomoAdapter("test-webhook-secret");

const auth = () => ({ authorization: `Bearer ${token}` });

beforeAll(async () => {
  db = await createTestDb();
  app = buildApp({
    db,
    env: loadEnv({
      NODE_ENV: "test",
      SESSION_SECRET: "test-session-secret-that-is-long-enough-123",
      ALLOW_DEV_LOGIN: "true",
    }),
    paymentAdapter: payment,
    providerAdapter: new MockProviderAdapter({ failOnPromptIncluding: "FAIL_PLEASE" }),
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await db.close();
});

describe("NuruNode API journey", () => {
  it("signs in with dev login", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/dev-login",
      payload: { email: "ama@example.com", name: "Ama" },
    });
    expect(res.statusCode).toBe(200);
    token = res.json().token;
    expect(token).toBeTruthy();
  });

  it("rejects unauthenticated access", async () => {
    const res = await app.inject({ method: "POST", url: "/orgs", payload: { name: "Nope" } });
    expect(res.statusCode).toBe(401);
  });

  it("creates an organisation with an empty GHS wallet", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/orgs",
      headers: auth(),
      payload: { name: "Kumasi Devs" },
    });
    expect(res.statusCode).toBe(201);
    orgId = res.json().id;
    walletId = res.json().walletId;

    const wallet = await app.inject({
      method: "GET",
      url: `/orgs/${orgId}/wallet`,
      headers: auth(),
    });
    expect(wallet.json()).toMatchObject({
      currency: "GHS",
      availablePesewas: 0,
      reservedPesewas: 0,
    });
  });

  it("blocks AI usage when the balance is zero and does not touch the ledger", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/ai/requests`,
      headers: auth(),
      payload: { modelId: "nuru-test-small", prompt: "Hello Accra", maxOutputTokens: 50 },
    });
    expect(res.statusCode).toBe(402);
    expect(res.json().error).toBe("INSUFFICIENT_FUNDS");
    const ledger = await app.inject({
      method: "GET",
      url: `/orgs/${orgId}/ledger`,
      headers: auth(),
    });
    expect(ledger.json().entries).toHaveLength(0);
  });

  it("simulates a top-up via a signed mock webhook", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/topups/simulate`,
      headers: auth(),
      payload: { amountPesewas: 2000, phone: "0241234567" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().webhook.result).toMatchObject({ duplicate: false, credited: true });
    expect(res.json().balance.availablePesewas).toBe(2000);
  });

  it("ignores a duplicate webhook (same event id) without double-crediting", async () => {
    const intent = await payment.createTopUpIntent({ walletId, amountPesewas: 500 });
    await db.query(
      "INSERT INTO payment_intents (wallet_id, provider, provider_ref, amount_pesewas) VALUES ($1, $2, $3, $4)",
      [walletId, intent.provider, intent.providerRef, 500],
    );
    const hook = payment.buildWebhook({ ...intent, walletId }, { eventId: "evt_dup_1" });
    const first = await app.inject({
      method: "POST",
      url: "/webhooks/payments/mock",
      headers: hook.headers,
      payload: hook.rawBody,
    });
    const second = await app.inject({
      method: "POST",
      url: "/webhooks/payments/mock",
      headers: hook.headers,
      payload: hook.rawBody,
    });
    expect(first.json()).toMatchObject({ duplicate: false, credited: true });
    expect(second.json()).toMatchObject({ duplicate: true });

    const wallet = await app.inject({
      method: "GET",
      url: `/orgs/${orgId}/wallet`,
      headers: auth(),
    });
    expect(wallet.json().availablePesewas).toBe(2500);
  });

  it("rejects webhooks with a bad signature", async () => {
    const intent = await payment.createTopUpIntent({ walletId, amountPesewas: 500 });
    const hook = payment.buildWebhook({ ...intent, walletId });
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payments/mock",
      headers: { ...hook.headers, "x-nurunode-signature": "00".repeat(32) },
      payload: hook.rawBody,
    });
    expect(res.statusCode).toBe(401);
  });

  it("lists test models", async () => {
    const res = await app.inject({ method: "GET", url: "/models" });
    expect(res.json().models.length).toBeGreaterThan(0);
  });

  it("reserves, runs a mocked request, settles actual cost and releases the rest", async () => {
    const before = (
      await app.inject({ method: "GET", url: `/orgs/${orgId}/wallet`, headers: auth() })
    ).json();
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/ai/requests`,
      headers: auth(),
      payload: {
        modelId: "nuru-test-small",
        prompt: "Write one line about jollof rice.",
        maxOutputTokens: 200,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.text).toContain("MOCK");
    expect(body.actualPesewas).toBeLessThanOrEqual(body.reservedPesewas);
    expect(body.releasedPesewas).toBe(body.reservedPesewas - body.actualPesewas);
    expect(body.balance.availablePesewas).toBe(before.availablePesewas - body.actualPesewas);
    expect(body.balance.reservedPesewas).toBe(0);

    const entries = (
      await app.inject({ method: "GET", url: `/orgs/${orgId}/ledger`, headers: auth() })
    ).json().entries;
    const types = entries.map((e: { entryType: string }) => e.entryType);
    expect(types).toContain("reservation");
    expect(types).toContain("settlement");
  });

  it("releases the full reservation when the provider fails", async () => {
    const before = (
      await app.inject({ method: "GET", url: `/orgs/${orgId}/wallet`, headers: auth() })
    ).json();
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/ai/requests`,
      headers: auth(),
      payload: { modelId: "nuru-test-small", prompt: "FAIL_PLEASE", maxOutputTokens: 50 },
    });
    expect(res.statusCode).toBe(502);
    const after = (
      await app.inject({ method: "GET", url: `/orgs/${orgId}/wallet`, headers: auth() })
    ).json();
    expect(after.availablePesewas).toBe(before.availablePesewas);
    expect(after.reservedPesewas).toBe(0);
  });

  it("blocks a request whose maximum cost exceeds the remaining balance", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/ai/requests`,
      headers: auth(),
      payload: { modelId: "nuru-test-large", prompt: "x".repeat(4000), maxOutputTokens: 4096 },
    });
    expect(res.statusCode).toBe(402);
    expect(res.json().requiredPesewas).toBeGreaterThan(res.json().availablePesewas);
  });

  it("prevents access to another user's organisation", async () => {
    const other = await app.inject({
      method: "POST",
      url: "/auth/dev-login",
      payload: { email: "kofi@example.com" },
    });
    const res = await app.inject({
      method: "GET",
      url: `/orgs/${orgId}/wallet`,
      headers: { authorization: `Bearer ${other.json().token}` },
    });
    expect(res.statusCode).toBe(403);
  });
});
