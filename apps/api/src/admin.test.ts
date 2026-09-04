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
let operatorToken: string;
let operatorId: string;

const auth = (token = operatorToken) => ({ authorization: `Bearer ${token}` });

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
    payload: { email: "operator@nuru.test", name: "Nuru operator" },
  });
  operatorToken = login.json().token;
  operatorId = login.json().user.id;
});

afterAll(async () => {
  await app.close();
  await db.close();
});

describe("private platform back office", () => {
  it("never exposes the platform control plane to an ordinary signed-in user", async () => {
    const res = await app.inject({ method: "GET", url: "/admin/overview", headers: auth() });
    expect(res.statusCode).toBe(403);
  });

  it("lets a designated platform operator pause a model and records an immutable audit event", async () => {
    await db.query(
      "INSERT INTO platform_admins (user_id, role) VALUES ($1, 'provider_ops')",
      [operatorId],
    );

    const pause = await app.inject({
      method: "POST",
      url: "/admin/model-controls/nuru-test-small/pause",
      headers: auth(),
    });
    expect(pause.statusCode).toBe(200);
    expect(pause.json()).toMatchObject({ modelId: "nuru-test-small", status: "paused" });

    const list = await app.inject({ method: "GET", url: "/admin/model-controls", headers: auth() });
    expect(list.statusCode).toBe(200);
    expect(list.json().models.find((model: { id: string }) => model.id === "nuru-test-small"))
      .toMatchObject({ status: "paused" });

    const audit = await app.inject({ method: "GET", url: "/admin/audit-events", headers: auth() });
    expect(audit.statusCode).toBe(200);
    expect(audit.json().events[0]).toMatchObject({ action: "provider.model.pause", targetId: "nuru-test-small" });
  });

  it("can pause and resume an organisation's developer API access without exposing any upstream key", async () => {
    const customer = await app.inject({
      method: "POST",
      url: "/auth/dev-login",
      payload: { email: "developer@nuru.test" },
    });
    const customerToken = customer.json().token;
    const org = await app.inject({
      method: "POST",
      url: "/orgs",
      headers: auth(customerToken),
      payload: { name: "Developer workspace" },
    });
    const orgId = org.json().id;
    const key = await app.inject({
      method: "POST",
      url: `/orgs/${orgId}/api-keys`,
      headers: auth(customerToken),
      payload: { name: "Production-like client" },
    });
    const developerKey = key.json().secret;

    const pause = await app.inject({
      method: "POST",
      url: `/admin/organisations/${orgId}/developer-access/pause`,
      headers: auth(),
    });
    expect(pause.statusCode).toBe(200);
    expect(pause.json()).toMatchObject({ orgId, developerAccess: "paused" });

    const blocked = await app.inject({
      method: "GET",
      url: `/orgs/${orgId}/wallet`,
      headers: auth(developerKey),
    });
    expect(blocked.statusCode).toBe(403);

    const resume = await app.inject({
      method: "POST",
      url: `/admin/organisations/${orgId}/developer-access/resume`,
      headers: auth(),
    });
    expect(resume.statusCode).toBe(200);
    const restored = await app.inject({
      method: "GET",
      url: `/orgs/${orgId}/wallet`,
      headers: auth(developerKey),
    });
    expect(restored.statusCode).toBe(200);
  });
});
