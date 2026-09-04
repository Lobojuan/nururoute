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
let customerToken: string;
let orgId: string;

const auth = (token = customerToken) => ({ authorization: `Bearer ${token}` });

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
  const login = await app.inject({
    method: "POST",
    url: "/auth/dev-login",
    payload: { email: "efua@nuru.test" },
  });
  customerToken = login.json().token;
  const org = await app.inject({
    method: "POST",
    url: "/orgs",
    headers: auth(),
    payload: { name: "Efua's studio" },
  });
  orgId = org.json().id;
});

afterAll(async () => {
  await app.close();
  await db.close();
});

describe("subscription plan selection", () => {
  it("publishes only the configured NuruRoute customer plans", async () => {
    const res = await app.inject({ method: "GET", url: "/plans" });
    expect(res.statusCode).toBe(200);
    expect(res.json().plans.map((plan: { slug: string }) => plan.slug)).toEqual([
      "free",
      "starter",
      "builder",
      "pro",
    ]);
    expect(res.json().plans.find((plan: { slug: string }) => plan.slug === "starter"))
      .toMatchObject({ monthlyPricePesewas: 2000, status: "active" });
  });

  it("records a customer plan choice as pending without creating an allowance before a verified payment", async () => {
    const selected = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/subscription/select`,
      headers: auth(),
      payload: { planSlug: "builder" },
    });
    expect(selected.statusCode).toBe(201);
    expect(selected.json()).toMatchObject({ plan: { slug: "builder" }, status: "pending_payment" });

    const current = await app.inject({
      method: "GET",
      url: `/orgs/${orgId}/subscription`,
      headers: auth(),
    });
    expect(current.statusCode).toBe(200);
    expect(current.json()).toMatchObject({ plan: { slug: "builder" }, status: "pending_payment" });

    const grants = await db.query("SELECT * FROM subscription_allowance_grants WHERE org_id = $1", [orgId]);
    expect(grants.rowCount).toBe(0);
  });
});
