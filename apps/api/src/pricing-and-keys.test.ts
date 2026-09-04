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
const auth = (t = token) => ({ authorization: `Bearer ${t}` });

beforeAll(async () => {
  db = await createTestDb();
  app = buildApp({
    db,
    env: loadEnv({
      NODE_ENV: "test",
      SESSION_SECRET: "test-session-secret-that-is-long-enough-123",
      ALLOW_DEV_LOGIN: "true",
    }),
    paymentAdapter: new MockMomoAdapter("test-webhook-secret"),
    providerAdapter: new MockProviderAdapter(),
  });
  await app.ready();
  token = (
    await app.inject({ method: "POST", url: "/auth/dev-login", payload: { email: "p@n.test" } })
  ).json().token;
  orgId = (
    await app.inject({ method: "POST", url: "/orgs", headers: auth(), payload: { name: "Priced" } })
  ).json().id;
  await app.inject({
    method: "POST",
    url: `/orgs/${orgId}/topups/simulate`,
    headers: auth(),
    payload: { amountPesewas: 10_000, phone: "0241234567" },
  });
});

afterAll(async () => {
  await app.close();
  await db.close();
});

const prompt = "Tell me about kelewele."; // 24 chars -> 6 input tokens

describe("per-organisation pricing", () => {
  it("starts on platform default prices", async () => {
    const res = await app.inject({ method: "GET", url: `/orgs/${orgId}/models`, headers: auth() });
    const small = res.json().models.find((m: { id: string }) => m.id === "nuru-test-small");
    expect(small.customPrice).toBe(false);
    expect(small.inputPricePer1kPesewas).toBe(small.defaultPrice.inputPricePer1kPesewas);
    expect(small.examplePer1kPesewas).toBeGreaterThan(0);
  });

  it("owner can set a custom price and the reservation uses it", async () => {
    const before = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/ai/requests`,
      headers: auth(),
      payload: { modelId: "nuru-test-small", prompt, maxOutputTokens: 100 },
    });
    // default: ceil(6*5/1000)=1 + ceil(100*15/1000)=2 -> 3 reserved
    expect(before.json().reservedPesewas).toBe(3);

    const set = await app.inject({
      method: "PUT",
      url: `/orgs/${orgId}/pricing/nuru-test-small`,
      headers: auth(),
      payload: { inputPricePer1kPesewas: 1000, outputPricePer1kPesewas: 2000 },
    });
    expect(set.statusCode).toBe(200);
    const small = set.json().models.find((m: { id: string }) => m.id === "nuru-test-small");
    expect(small.customPrice).toBe(true);
    expect(small.inputPricePer1kPesewas).toBe(1000);

    const after = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/ai/requests`,
      headers: auth(),
      payload: { modelId: "nuru-test-small", prompt, maxOutputTokens: 100 },
    });
    // custom: ceil(6*1000/1000)=6 + ceil(100*2000/1000)=200 -> 206 reserved
    expect(after.json().reservedPesewas).toBe(206);
    expect(after.json().actualPesewas).toBeLessThanOrEqual(206);
    expect(after.json().actualPesewas).toBeGreaterThan(before.json().actualPesewas);
  });

  it("resetting removes the custom price", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/orgs/${orgId}/pricing/nuru-test-small`,
      headers: auth(),
    });
    const small = res.json().models.find((m: { id: string }) => m.id === "nuru-test-small");
    expect(small.customPrice).toBe(false);
  });

  it("rejects unknown models and invalid prices", async () => {
    const unknown = await app.inject({
      method: "PUT",
      url: `/orgs/${orgId}/pricing/no-such-model`,
      headers: auth(),
      payload: { inputPricePer1kPesewas: 1, outputPricePer1kPesewas: 1 },
    });
    expect(unknown.statusCode).toBe(404);
    const bad = await app.inject({
      method: "PUT",
      url: `/orgs/${orgId}/pricing/nuru-test-small`,
      headers: auth(),
      payload: { inputPricePer1kPesewas: -1, outputPricePer1kPesewas: 1.5 },
    });
    expect(bad.statusCode).toBe(400);
  });

  it("pricing is isolated per organisation", async () => {
    await app.inject({
      method: "PUT",
      url: `/orgs/${orgId}/pricing/nuru-test-vision`,
      headers: auth(),
      payload: { inputPricePer1kPesewas: 1, outputPricePer1kPesewas: 1 },
    });
    const other = (
      await app.inject({ method: "POST", url: "/orgs", headers: auth(), payload: { name: "Other" } })
    ).json().id;
    const res = await app.inject({ method: "GET", url: `/orgs/${other}/models`, headers: auth() });
    const vision = res.json().models.find((m: { id: string }) => m.id === "nuru-test-vision");
    expect(vision.customPrice).toBe(false);
  });
});

describe("developer API keys", () => {
  let secret: string;
  let keyId: string;

  it("creates a key, returning the secret exactly once", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/api-keys`,
      headers: auth(),
      payload: { name: "CI bot" },
    });
    expect(res.statusCode).toBe(201);
    secret = res.json().secret;
    keyId = res.json().key.id;
    expect(secret).toMatch(/^nn_test_/);
    expect(res.json().key.keyPrefix).toBe(secret.slice(0, 14));

    const list = await app.inject({ method: "GET", url: `/orgs/${orgId}/api-keys`, headers: auth() });
    expect(list.json().keys).toHaveLength(1);
    expect(JSON.stringify(list.json())).not.toContain(secret);
    const stored = await db.query<{ key_hash: string }>("SELECT key_hash FROM api_keys");
    expect(stored.rows[0]!.key_hash).not.toBe(secret);
  });

  it("authenticates AI requests with the key, scoped to its organisation", async () => {
    const ok = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/ai/requests`,
      headers: auth(secret),
      payload: { modelId: "nuru-test-small", prompt, maxOutputTokens: 50 },
    });
    expect(ok.statusCode).toBe(201);
    const other = (
      await app.inject({ method: "POST", url: "/orgs", headers: auth(), payload: { name: "B" } })
    ).json().id;
    const wrongOrg = await app.inject({
      method: "GET",
      url: `/orgs/${other}/wallet`,
      headers: auth(secret),
    });
    expect(wrongOrg.statusCode).toBe(403);
    const mint = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/api-keys`,
      headers: auth(secret),
      payload: { name: "escalation" },
    });
    expect(mint.statusCode).toBe(403);
  });

  it("does not let an ordinary organisation member issue a developer key", async () => {
    const member = await app.inject({
      method: "POST",
      url: "/auth/dev-login",
      payload: { email: "member@n.test" },
    });
    const memberId = member.json().user.id;
    await db.query("INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'member')", [
      orgId,
      memberId,
    ]);
    const res = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/api-keys`,
      headers: auth(member.json().token),
      payload: { name: "Unauthorised key" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("revoked keys stop working", async () => {
    const del = await app.inject({
      method: "DELETE",
      url: `/orgs/${orgId}/api-keys/${keyId}`,
      headers: auth(),
    });
    expect(del.json()).toEqual({ revoked: true });
    const res = await app.inject({ method: "GET", url: `/orgs/${orgId}/wallet`, headers: auth(secret) });
    expect(res.statusCode).toBe(401);
    const bogus = await app.inject({
      method: "GET",
      url: `/orgs/${orgId}/wallet`,
      headers: auth("nn_test_definitely-not-a-key"),
    });
    expect(bogus.statusCode).toBe(401);
  });
});
