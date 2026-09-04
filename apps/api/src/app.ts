import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Db } from "@nurunode/database";
import { LedgerService } from "@nurunode/ledger";
import {
  type PaymentAdapter,
  MockMomoAdapter,
  WEBHOOK_SIGNATURE_HEADER,
} from "@nurunode/payment-adapters";
import type { ProviderAdapter } from "@nurunode/provider-adapters";
import {
  NuruError,
  aiRequestSchema,
  createApiKeySchema,
  createOrgSchema,
  devLoginSchema,
  updateModelPriceSchema,
  isNuruError,
  simulateTopUpSchema,
  type AiRequestResult,
  type ApiKeySummary,
  type ErrorCode,
  type ModelPrice,
  type OrgModelInfo,
} from "@nurunode/shared";
import { ZodError } from "zod";
import type { ApiEnv } from "./env";
import { signSession, verifySession, type SessionClaims } from "./auth";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
    session?: SessionClaims;
    /** Set when the caller authenticated with an org-scoped developer API key. */
    apiKey?: { id: string; orgId: string };
  }
}

const API_KEY_PREFIX = "nn_test_";
const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export interface AppDeps {
  db: Db;
  env: ApiEnv;
  paymentAdapter: PaymentAdapter;
  providerAdapter: ProviderAdapter;
}

const STATUS_BY_CODE: Partial<Record<ErrorCode, number>> = {
  INSUFFICIENT_FUNDS: 402,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  WALLET_NOT_FOUND: 404,
  RESERVATION_NOT_FOUND: 404,
  INVALID_SIGNATURE: 401,
  VALIDATION_ERROR: 400,
  INVALID_AMOUNT: 400,
  RESERVATION_NOT_OPEN: 409,
  SETTLEMENT_EXCEEDS_RESERVATION: 409,
  PROVIDER_ERROR: 502,
  NOT_CONFIGURED: 501,
  LEDGER_IMMUTABLE: 500,
};

export function buildApp(deps: AppDeps): FastifyInstance {
  const { db, env, paymentAdapter, providerAdapter } = deps;
  const ledger = new LedgerService(db);
  const app = Fastify({ logger: env.NODE_ENV !== "test" });

  app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });

  // Keep the raw body so webhook signatures can be verified over exact bytes.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    req.rawBody = body as string;
    if (!body || (body as string).length === 0) return done(null, {});
    try {
      done(null, JSON.parse(body as string));
    } catch (e) {
      done(e as Error, undefined);
    }
  });

  app.setErrorHandler((err: unknown, _req, reply) => {
    if (isNuruError(err)) {
      return reply
        .status(STATUS_BY_CODE[err.code] ?? 500)
        .send({ error: err.code, message: err.message });
    }
    if (err instanceof ZodError) {
      return reply.status(400).send({ error: "VALIDATION_ERROR", issues: err.issues });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : String(err);
    if (status >= 500) app.log.error(err);
    return reply.status(status).send({ error: status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST", message });
  });

  // ---------- helpers ----------
  async function requireAuth(req: FastifyRequest): Promise<SessionClaims> {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (token?.startsWith(API_KEY_PREFIX)) {
      const { rows } = await db.query<{ id: string; org_id: string; created_by: string; email: string }>(
        `SELECT k.id, k.org_id, k.created_by, u.email FROM api_keys k JOIN users u ON u.id = k.created_by
          WHERE k.key_hash = $1 AND k.revoked_at IS NULL`,
        [hashKey(token)],
      );
      const k = rows[0];
      if (!k) throw new NuruError("UNAUTHORIZED", "Invalid or revoked API key");
      void db.query("UPDATE api_keys SET last_used_at = now() WHERE id = $1", [k.id]);
      req.apiKey = { id: k.id, orgId: k.org_id };
      req.session = { sub: k.created_by, email: k.email, exp: 0 };
      return req.session;
    }
    const claims = verifySession(token, env.SESSION_SECRET);
    if (!claims) throw new NuruError("UNAUTHORIZED");
    req.session = claims;
    return claims;
  }

  async function requireOrgMember(
    userId: string,
    orgId: string,
    req?: FastifyRequest,
  ): Promise<{ walletId: string; role: string }> {
    if (req?.apiKey && req.apiKey.orgId !== orgId) {
      throw new NuruError("FORBIDDEN", "This API key belongs to a different organisation");
    }
    const { rows } = await db.query<{ wallet_id: string; role: string }>(
      `SELECT w.id AS wallet_id, m.role FROM org_members m
         JOIN wallets w ON w.org_id = m.org_id
        WHERE m.org_id = $1 AND m.user_id = $2`,
      [orgId, userId],
    );
    const row = rows[0];
    if (!row) throw new NuruError("FORBIDDEN", "You are not a member of this organisation");
    return { walletId: row.wallet_id, role: req?.apiKey ? "api_key" : row.role };
  }

  /** Effective per-1k prices for one org: custom row if present, otherwise the catalog default. */
  async function orgPrices(orgId: string): Promise<Map<string, ModelPrice>> {
    const { rows } = await db.query<{
      model_id: string;
      input_price_per_1k_pesewas: number;
      output_price_per_1k_pesewas: number;
    }>("SELECT model_id, input_price_per_1k_pesewas, output_price_per_1k_pesewas FROM org_model_prices WHERE org_id = $1", [orgId]);
    return new Map(
      rows.map((r) => [
        r.model_id,
        {
          inputPricePer1kPesewas: Number(r.input_price_per_1k_pesewas),
          outputPricePer1kPesewas: Number(r.output_price_per_1k_pesewas),
        },
      ]),
    );
  }

  async function orgModels(orgId: string): Promise<OrgModelInfo[]> {
    const custom = await orgPrices(orgId);
    return providerAdapter.listModels().map((m) => {
      const price = custom.get(m.id) ?? m;
      return {
        ...m,
        inputPricePer1kPesewas: price.inputPricePer1kPesewas,
        outputPricePer1kPesewas: price.outputPricePer1kPesewas,
        defaultPrice: {
          inputPricePer1kPesewas: m.inputPricePer1kPesewas,
          outputPricePer1kPesewas: m.outputPricePer1kPesewas,
        },
        customPrice: custom.has(m.id),
        examplePer1kPesewas: providerAdapter.costOf(m.id, { inputTokens: 500, outputTokens: 500 }, price),
      };
    });
  }

  // ---------- health ----------
  app.get("/health", async () => ({
    ok: true,
    service: "nurunode-api",
    paymentAdapter: paymentAdapter.provider,
    paymentMode: paymentAdapter.mode,
    providerAdapter: providerAdapter.provider,
    mockMode: paymentAdapter.mode === "mock",
    liveMoney: false,
  }));

  // ---------- auth ----------
  app.post("/auth/dev-login", async (req, reply) => {
    if (!env.ALLOW_DEV_LOGIN) throw new NuruError("NOT_CONFIGURED", "Dev login is disabled");
    const body = devLoginSchema.parse(req.body);
    const { rows } = await db.query<{ id: string; email: string; name: string | null }>(
      `INSERT INTO users (email, name) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)
       RETURNING id, email, name`,
      [body.email.toLowerCase(), body.name ?? null],
    );
    const user = rows[0]!;
    const token = signSession({ sub: user.id, email: user.email }, env.SESSION_SECRET);
    return reply.send({ token, user });
  });

  app.get("/auth/google", async (_req, reply) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new NuruError(
        "NOT_CONFIGURED",
        "Google sign-in is scaffolded but not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (real values need approval).",
      );
    }
    // Real OAuth redirect would be built here. Intentionally not implemented in the safe MVP.
    return reply
      .status(501)
      .send({ error: "NOT_CONFIGURED", message: "Google OAuth flow not enabled in MVP" });
  });

  app.get("/me", async (req) => {
    const claims = await requireAuth(req);
    const orgs = await db.query<{ id: string; name: string; role: string; wallet_id: string }>(
      `SELECT o.id, o.name, m.role, w.id AS wallet_id FROM org_members m
         JOIN organisations o ON o.id = m.org_id
         JOIN wallets w ON w.org_id = o.id
        WHERE m.user_id = $1 ORDER BY o.created_at`,
      [claims.sub],
    );
    return {
      user: { id: claims.sub, email: claims.email },
      organisations: orgs.rows.map((o) => ({
        id: o.id,
        name: o.name,
        role: o.role,
        walletId: o.wallet_id,
      })),
    };
  });

  // ---------- organisations & wallet ----------
  app.post("/orgs", async (req, reply) => {
    const claims = await requireAuth(req);
    const body = createOrgSchema.parse(req.body);
    const org = await db.transaction(async (tx) => {
      const o = await tx.query<{ id: string; name: string }>(
        "INSERT INTO organisations (name, owner_id) VALUES ($1, $2) RETURNING id, name",
        [body.name, claims.sub],
      );
      const orgId = o.rows[0]!.id;
      await tx.query("INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')", [
        orgId,
        claims.sub,
      ]);
      const w = await tx.query<{ id: string }>(
        "INSERT INTO wallets (org_id) VALUES ($1) RETURNING id",
        [orgId],
      );
      return { id: orgId, name: o.rows[0]!.name, walletId: w.rows[0]!.id, role: "owner" };
    });
    return reply.status(201).send(org);
  });

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/wallet", async (req) => {
    const claims = await requireAuth(req);
    const { walletId } = await requireOrgMember(claims.sub, req.params.orgId, req);
    return ledger.balance(walletId);
  });

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/ledger", async (req) => {
    const claims = await requireAuth(req);
    const { walletId } = await requireOrgMember(claims.sub, req.params.orgId, req);
    return { entries: await ledger.entries(walletId) };
  });

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/requests", async (req) => {
    const claims = await requireAuth(req);
    await requireOrgMember(claims.sub, req.params.orgId, req);
    const { rows } = await db.query(
      `SELECT id, model_id, status, input_tokens, output_tokens, reserved_pesewas, actual_pesewas,
              released_pesewas, error_code, created_at
         FROM usage_requests WHERE org_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.orgId],
    );
    return { requests: rows };
  });

  // ---------- top-ups ----------
  /**
   * Credit a payment intent exactly once. Caller must hold a transaction.
   * The ledger idempotency key `topup:<provider>:<ref>` is the final guard.
   */
  async function creditIntent(
    tx: Db,
    pi: { id: string; wallet_id: string; amount_pesewas: unknown },
    provider: string,
    providerRef: string,
    metadata: Record<string, unknown>,
  ) {
    const entry = await new LedgerService(tx).topUp({
      walletId: pi.wallet_id,
      amountPesewas: Number(pi.amount_pesewas),
      idempotencyKey: `topup:${provider}:${providerRef}`,
      metadata: { providerRef, paymentIntentId: pi.id, ...metadata },
    });
    await tx.query("UPDATE payment_intents SET status = 'succeeded' WHERE id = $1", [pi.id]);
    return entry;
  }

  /**
   * Re-verify a pending intent with the payment provider and credit it if the
   * provider says SUCCESSFUL. Safe to call repeatedly (poll, callback, retry).
   */
  async function confirmIntent(providerRef: string, walletId?: string) {
    const found = await db.query<{
      id: string;
      wallet_id: string;
      amount_pesewas: unknown;
      status: string;
      provider: string;
    }>(
      `SELECT id, wallet_id, amount_pesewas, status, provider FROM payment_intents
        WHERE provider = $1 AND provider_ref = $2`,
      [paymentAdapter.provider, providerRef],
    );
    const pi = found.rows[0];
    if (!pi || (walletId && pi.wallet_id !== walletId))
      throw new NuruError("NOT_FOUND", "Unknown top-up");
    if (pi.status === "succeeded") return { status: "succeeded" as const, credited: false };
    if (pi.status === "failed") return { status: "failed" as const, credited: false };

    const remote = await paymentAdapter.getTopUpStatus(providerRef);
    if (remote.status === "pending") return { status: "pending" as const, credited: false };

    return db.transaction(async (tx) => {
      const locked = await tx.query<{ id: string; wallet_id: string; amount_pesewas: unknown; status: string }>(
        "SELECT id, wallet_id, amount_pesewas, status FROM payment_intents WHERE id = $1 FOR UPDATE",
        [pi.id],
      );
      const row = locked.rows[0]!;
      if (row.status !== "pending") {
        return { status: row.status as "succeeded" | "failed", credited: false };
      }
      if (remote.status === "failed") {
        await tx.query(
          "UPDATE payment_intents SET status = 'failed', metadata = metadata || $2::jsonb WHERE id = $1",
          [row.id, JSON.stringify({ reason: remote.reason ?? null })],
        );
        return { status: "failed" as const, credited: false, reason: remote.reason };
      }
      if (
        remote.amountPesewas !== undefined &&
        remote.amountPesewas !== Number(row.amount_pesewas)
      ) {
        throw new NuruError("VALIDATION_ERROR", "Provider amount does not match the intent");
      }
      const entry = await creditIntent(tx, row, paymentAdapter.provider, providerRef, {
        financialTransactionId: remote.financialTransactionId ?? null,
        source: "provider_status_check",
      });
      return { status: "succeeded" as const, credited: true, entryId: entry.id };
    });
  }

  // Generic: create a top-up request with the configured adapter (mock or MTN sandbox).
  app.post<{ Params: { orgId: string } }>("/orgs/:orgId/topups", async (req, reply) => {
    const claims = await requireAuth(req);
    const { walletId } = await requireOrgMember(claims.sub, req.params.orgId, req);
    const body = simulateTopUpSchema.parse(req.body);
    const intent = await paymentAdapter.createTopUpIntent({
      walletId,
      amountPesewas: body.amountPesewas,
      ...(body.phone ? { phone: body.phone } : {}),
    });
    await db.query(
      `INSERT INTO payment_intents (wallet_id, provider, provider_ref, amount_pesewas, status, metadata)
       VALUES ($1, $2, $3, $4, 'pending', $5::jsonb)`,
      [walletId, intent.provider, intent.providerRef, intent.amountPesewas, JSON.stringify({ phone: body.phone ?? null, mode: paymentAdapter.mode })],
    );
    return reply.status(201).send({ intent, mode: paymentAdapter.mode, status: "pending" });
  });

  // Generic: poll / confirm. The server asks the provider; the client can't fake success.
  app.post<{ Params: { orgId: string; providerRef: string } }>(
    "/orgs/:orgId/topups/:providerRef/confirm",
    async (req) => {
      const claims = await requireAuth(req);
      const { walletId } = await requireOrgMember(claims.sub, req.params.orgId, req);
      const outcome = await confirmIntent(req.params.providerRef, walletId);
      return { ...outcome, balance: await ledger.balance(walletId) };
    },
  );

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/topups", async (req) => {
    const claims = await requireAuth(req);
    const { walletId } = await requireOrgMember(claims.sub, req.params.orgId, req);
    const { rows } = await db.query(
      `SELECT id, provider, provider_ref, amount_pesewas, status, created_at
         FROM payment_intents WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [walletId],
    );
    return { topups: rows };
  });

  // MTN callback (PUT, unsigned). We never trust the body: it only nudges a re-verify.
  app.put("/webhooks/payments/momo", async (req, reply) => {
    if (paymentAdapter.provider !== "momo_sandbox") {
      throw new NuruError("NOT_CONFIGURED", "MoMo callbacks are only handled with PAYMENT_ADAPTER=momo_sandbox");
    }
    const ref = (req.body as { referenceId?: string } | undefined)?.referenceId
      ?? (req.headers["x-reference-id"] as string | undefined);
    if (!ref) return reply.status(400).send({ error: "VALIDATION_ERROR", message: "referenceId missing" });
    try {
      const outcome = await confirmIntent(ref);
      return reply.send(outcome);
    } catch (e) {
      if (isNuruError(e, "NOT_FOUND")) return reply.status(200).send({ ignored: true });
      throw e;
    }
  });

  // Mock-only: create + fire a signed webhook in one call.
  app.post<{ Params: { orgId: string } }>("/orgs/:orgId/topups/simulate", async (req, reply) => {
    const claims = await requireAuth(req);
    const { walletId } = await requireOrgMember(claims.sub, req.params.orgId, req);
    const body = simulateTopUpSchema.parse(req.body);

    const intent = await paymentAdapter.createTopUpIntent({
      walletId,
      amountPesewas: body.amountPesewas,
      ...(body.phone ? { phone: body.phone } : {}),
    });
    await db.query(
      `INSERT INTO payment_intents (wallet_id, provider, provider_ref, amount_pesewas, status, metadata)
       VALUES ($1, $2, $3, $4, 'pending', $5::jsonb)`,
      [
        walletId,
        intent.provider,
        intent.providerRef,
        intent.amountPesewas,
        JSON.stringify({ phone: body.phone ?? null }),
      ],
    );

    // Simulate the provider calling us back: build a signed webhook and process it
    // through the same public endpoint a real provider would hit.
    if (!(paymentAdapter instanceof MockMomoAdapter)) {
      throw new NuruError(
        "NOT_CONFIGURED",
        "Simulation is only available with the mock payment adapter",
      );
    }
    const hook = paymentAdapter.buildWebhook({ ...intent, walletId });
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payments/mock",
      headers: hook.headers,
      payload: hook.rawBody,
    });
    if (res.statusCode >= 400) {
      throw new NuruError("PROVIDER_ERROR", `simulated webhook failed: ${res.body}`);
    }
    return reply.status(201).send({
      intent,
      webhook: { eventId: paymentAdapter.parseWebhook(hook.rawBody).eventId, result: res.json() },
      balance: await ledger.balance(walletId),
    });
  });

  // Public webhook endpoint: signature-verified and idempotent.
  app.post("/webhooks/payments/mock", async (req, reply) => {
    const raw = req.rawBody ?? "";
    const signature = req.headers[WEBHOOK_SIGNATURE_HEADER];
    paymentAdapter.verifyWebhook(raw, typeof signature === "string" ? signature : undefined);
    const event = paymentAdapter.parseWebhook(raw);

    const outcome = await db.transaction(async (tx) => {
      const inserted = await tx.query(
        `INSERT INTO webhook_events (provider, event_id, payload) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (provider, event_id) DO NOTHING RETURNING id`,
        [event.provider, event.eventId, raw],
      );
      if (inserted.rowCount === 0) return { duplicate: true as const };

      const intent = await tx.query<{
        id: string;
        wallet_id: string;
        amount_pesewas: unknown;
        status: string;
      }>(
        "SELECT id, wallet_id, amount_pesewas, status FROM payment_intents WHERE provider = $1 AND provider_ref = $2",
        [event.provider, event.providerRef],
      );
      const pi = intent.rows[0];
      if (!pi) throw new NuruError("NOT_FOUND", "Unknown payment intent");
      if (pi.wallet_id !== event.walletId)
        throw new NuruError("VALIDATION_ERROR", "wallet mismatch");
      if (Number(pi.amount_pesewas) !== event.amountPesewas)
        throw new NuruError("VALIDATION_ERROR", "amount mismatch");

      if (event.type === "payment.failed") {
        await tx.query("UPDATE payment_intents SET status = 'failed' WHERE id = $1", [pi.id]);
        return { duplicate: false as const, credited: false as const };
      }

      const txLedger = new LedgerService(tx);
      const entry = await txLedger.topUp({
        walletId: pi.wallet_id,
        amountPesewas: event.amountPesewas,
        idempotencyKey: `topup:${event.provider}:${event.eventId}`,
        metadata: {
          providerRef: event.providerRef,
          eventId: event.eventId,
          paymentIntentId: pi.id,
        },
      });
      await tx.query("UPDATE payment_intents SET status = 'succeeded' WHERE id = $1", [pi.id]);
      return { duplicate: false as const, credited: true as const, entryId: entry.id };
    });

    return reply.status(200).send(outcome);
  });

  // ---------- per-organisation pricing ----------
  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/models", async (req) => {
    const claims = await requireAuth(req);
    await requireOrgMember(claims.sub, req.params.orgId, req);
    return { models: await orgModels(req.params.orgId) };
  });

  app.put<{ Params: { orgId: string; modelId: string } }>(
    "/orgs/:orgId/pricing/:modelId",
    async (req) => {
      const claims = await requireAuth(req);
      const { role } = await requireOrgMember(claims.sub, req.params.orgId, req);
      if (role !== "owner") throw new NuruError("FORBIDDEN", "Only organisation owners can change pricing");
      providerAdapter.getModel(req.params.modelId); // 404 on unknown model
      const body = updateModelPriceSchema.parse(req.body);
      await db.query(
        `INSERT INTO org_model_prices (org_id, model_id, input_price_per_1k_pesewas, output_price_per_1k_pesewas, updated_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (org_id, model_id) DO UPDATE
           SET input_price_per_1k_pesewas = EXCLUDED.input_price_per_1k_pesewas,
               output_price_per_1k_pesewas = EXCLUDED.output_price_per_1k_pesewas,
               updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [req.params.orgId, req.params.modelId, body.inputPricePer1kPesewas, body.outputPricePer1kPesewas, claims.sub],
      );
      return { models: await orgModels(req.params.orgId) };
    },
  );

  app.delete<{ Params: { orgId: string; modelId: string } }>(
    "/orgs/:orgId/pricing/:modelId",
    async (req) => {
      const claims = await requireAuth(req);
      const { role } = await requireOrgMember(claims.sub, req.params.orgId, req);
      if (role !== "owner") throw new NuruError("FORBIDDEN", "Only organisation owners can change pricing");
      await db.query("DELETE FROM org_model_prices WHERE org_id = $1 AND model_id = $2", [req.params.orgId, req.params.modelId]);
      return { models: await orgModels(req.params.orgId) };
    },
  );

  // ---------- developer API keys ----------
  const keyRow = (r: Record<string, unknown>): ApiKeySummary => ({
    id: String(r["id"]),
    name: String(r["name"]),
    keyPrefix: String(r["key_prefix"]),
    createdAt: String(r["created_at"]),
    lastUsedAt: r["last_used_at"] ? String(r["last_used_at"]) : null,
    revokedAt: r["revoked_at"] ? String(r["revoked_at"]) : null,
  });

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/api-keys", async (req) => {
    const claims = await requireAuth(req);
    await requireOrgMember(claims.sub, req.params.orgId, req);
    const { rows } = await db.query<Record<string, unknown>>(
      "SELECT id, name, key_prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE org_id = $1 ORDER BY created_at DESC",
      [req.params.orgId],
    );
    return { keys: rows.map(keyRow) };
  });

  app.post<{ Params: { orgId: string } }>("/orgs/:orgId/api-keys", async (req, reply) => {
    const claims = await requireAuth(req);
    if (req.apiKey) throw new NuruError("FORBIDDEN", "API keys cannot create other API keys");
    await requireOrgMember(claims.sub, req.params.orgId, req);
    const body = createApiKeySchema.parse(req.body);
    const secret = `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
    const prefix = secret.slice(0, API_KEY_PREFIX.length + 6);
    const { rows } = await db.query<Record<string, unknown>>(
      `INSERT INTO api_keys (org_id, created_by, name, key_prefix, key_hash) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, key_prefix, created_at, last_used_at, revoked_at`,
      [req.params.orgId, claims.sub, body.name, prefix, hashKey(secret)],
    );
    // The plaintext key is returned exactly once and never stored.
    return reply.status(201).send({ key: keyRow(rows[0]!), secret });
  });

  app.delete<{ Params: { orgId: string; keyId: string } }>("/orgs/:orgId/api-keys/:keyId", async (req) => {
    const claims = await requireAuth(req);
    if (req.apiKey) throw new NuruError("FORBIDDEN", "API keys cannot revoke API keys");
    await requireOrgMember(claims.sub, req.params.orgId, req);
    const { rowCount } = await db.query(
      "UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND org_id = $2 AND revoked_at IS NULL",
      [req.params.keyId, req.params.orgId],
    );
    if (!rowCount) throw new NuruError("NOT_FOUND", "API key not found");
    return { revoked: true };
  });

  // ---------- models & AI requests ----------
  app.get("/models", async () => ({ models: providerAdapter.listModels() }));

  app.post<{ Params: { orgId: string } }>(
    "/orgs/:orgId/ai/requests",
    async (req, reply: FastifyReply) => {
      const claims = await requireAuth(req);
      const { walletId } = await requireOrgMember(claims.sub, req.params.orgId, req);
      const body = aiRequestSchema.parse(req.body);
      const requestId = randomUUID();

      // 1. Estimate the maximum possible cost at this organisation's price for the model.
      const price = (await orgPrices(req.params.orgId)).get(body.modelId);
      const estimate = providerAdapter.estimateMaxCost(body, price);

      // 2. Reserve BEFORE any provider call. INSUFFICIENT_FUNDS -> 402 and nothing else happens.
      let reservation;
      try {
        reservation = await ledger.reserve({
          walletId,
          amountPesewas: estimate.maxCostPesewas,
          idempotencyKey: `req:${requestId}`,
          metadata: { requestId, modelId: body.modelId, estimate, price: price ?? "default" },
        });
      } catch (e) {
        if (isNuruError(e, "INSUFFICIENT_FUNDS")) {
          await db.query(
            `INSERT INTO usage_requests (id, org_id, wallet_id, model_id, prompt, status, reserved_pesewas, error_code)
           VALUES ($1, $2, $3, $4, $5, 'rejected', $6, 'INSUFFICIENT_FUNDS')`,
            [
              requestId,
              req.params.orgId,
              walletId,
              body.modelId,
              body.prompt,
              estimate.maxCostPesewas,
            ],
          );
          const balance = await ledger.balance(walletId);
          return reply.status(402).send({
            error: "INSUFFICIENT_FUNDS",
            message: "Top up your wallet to run this request.",
            requiredPesewas: estimate.maxCostPesewas,
            availablePesewas: balance.availablePesewas,
          });
        }
        throw e;
      }

      await db.query(
        `INSERT INTO usage_requests (id, org_id, wallet_id, reservation_id, model_id, prompt, status, reserved_pesewas)
       VALUES ($1, $2, $3, $4, $5, $6, 'reserved', $7)`,
        [
          requestId,
          req.params.orgId,
          walletId,
          reservation.id,
          body.modelId,
          body.prompt,
          reservation.amountPesewas,
        ],
      );

      // 3. Call the (mock) provider.
      let completion;
      try {
        completion = await providerAdapter.complete(body);
      } catch (e) {
        // 3b. Provider failed: release the whole reservation.
        await ledger.release({
          reservationId: reservation.id,
          metadata: { requestId, reason: "provider_error" },
        });
        await db.query(
          `UPDATE usage_requests SET status = 'failed', error_code = 'PROVIDER_ERROR', released_pesewas = $2, completed_at = now() WHERE id = $1`,
          [requestId, reservation.amountPesewas],
        );
        throw new NuruError(
          "PROVIDER_ERROR",
          "The AI provider failed; your reservation was released.",
        );
      }

      // 4. Settle actual cost, release the remainder (single DB transaction inside ledger_settle).
      const actual = Math.min(
        providerAdapter.costOf(body.modelId, completion, price),
        reservation.amountPesewas,
      );
      const settled = await ledger.settle({
        reservationId: reservation.id,
        actualPesewas: actual,
        metadata: {
          requestId,
          modelId: body.modelId,
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
        },
      });

      await db.query(
        `UPDATE usage_requests SET status = 'completed', response_text = $2, input_tokens = $3, output_tokens = $4,
              actual_pesewas = $5, released_pesewas = $6, completed_at = now() WHERE id = $1`,
        [
          requestId,
          completion.text,
          completion.inputTokens,
          completion.outputTokens,
          actual,
          settled.releasedPesewas,
        ],
      );

      const result: AiRequestResult = {
        requestId,
        modelId: body.modelId,
        text: completion.text,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        reservedPesewas: reservation.amountPesewas,
        actualPesewas: actual,
        releasedPesewas: settled.releasedPesewas,
        balance: await ledger.balance(walletId),
      };
      return reply.status(201).send(result);
    },
  );

  return app;
}
