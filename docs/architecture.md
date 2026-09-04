# NuruNode — Architecture

## Monorepo layout

```text
apps/
  web/                 Next.js 15 dashboard (App Router). Talks only to apps/api.
  api/                 Fastify 5 API. The only process that touches the database,
                       payment adapters and AI provider adapters.
packages/
  shared/              Types, zod schemas, money helpers (pesewas), error codes.
  database/            SQL migrations (tables + PL/pgSQL ledger functions),
                       Db interface, pg (Postgres) and PGlite (tests) drivers.
  ledger/              Typed ledger service wrapping the database functions.
  payment-adapters/    PaymentAdapter interface + MockMomoAdapter.
  provider-adapters/   ProviderAdapter interface + MockProviderAdapter.
docs/                  Product, architecture, ledger and security rules.
```

The repository root also contains a small TanStack Start status page used by the Lovable editor preview. It is not part of the product runtime.

## Request flow: one AI request

```text
Browser (apps/web)
   │  POST /orgs/:id/ai/requests  { modelId, prompt, maxOutputTokens }
   ▼
Fastify API (apps/api)
   1. authenticate session JWT, check org membership
   2. providerAdapter.estimateMaxCost()          -> maxCostPesewas
   3. ledger.reserve(wallet, maxCost, idemKey)   -> DB: lock wallet, check available,
                                                    insert `reservation` entry
      └─ INSUFFICIENT_FUNDS -> 402, stop. No provider call.
   4. providerAdapter.complete()                 -> text + token usage (MOCK)
      └─ failure -> ledger.release(reservation)  -> full release, 502
   5. ledger.settle(reservation, actualCost)     -> DB: insert `settlement` +
                                                    `release` (max - actual), one tx
   6. return response + cost breakdown
```

## Why everything goes through the API

- Upstream provider keys (`OPENAI_API_KEY`, etc.) exist only as env vars on the API process. The browser never sees them; the web app has no provider SDKs.
- The reserve -> call -> settle sequence must be atomic with respect to the wallet; only the API can guarantee ordering.
- Payment webhooks must be verified and de-duplicated server-side.

## Database

PostgreSQL 16. The ledger is enforced *in the database* (see `docs/ledger-rules.md`): append-only table, row-locking functions, unique idempotency keys. Application code never writes to `ledger_entries` directly — it calls `ledger_top_up`, `ledger_reserve`, `ledger_settle`, `ledger_release`, `ledger_refund`.

Tests run the identical migrations against **PGlite** (embedded WASM Postgres) so the suite needs no Docker.

## Adapters

```text
PaymentAdapter          ProviderAdapter
  createTopUpIntent()     listModels()
  buildWebhookEvent()     estimateMaxCost()
  verifyWebhook()         complete()
  parseWebhook()          costOf()
```

Selected by env var. `PROVIDER_ADAPTER` is mock-only. `PAYMENT_ADAPTER` is `mock` (default) or `momo_sandbox`.

### Top-up flow (adapter-agnostic)

```text
POST /orgs/:id/topups                 adapter.createTopUpIntent()  -> payment_intents(pending)
POST /orgs/:id/topups/:ref/confirm    adapter.getTopUpStatus(ref)  -> SUCCESSFUL: ledger_top_up (idempotent)
                                                                    FAILED: intent failed
                                                                    PENDING: try again
PUT  /webhooks/payments/momo          unsigned MTN callback -> just runs the confirm step above
POST /orgs/:id/topups/simulate        mock only: create + signed webhook in one call
```

`MomoSandboxAdapter` talks to `sandbox.momodeveloper.mtn.com` (token -> requesttopay -> status). It refuses any target environment other than `sandbox`. The dashboard polls `confirm` until the payer approves on their handset (sandbox approves automatically except for MTN's special test numbers).

## Environment variables (placeholders only)

See `.env.example`. Rules: no real values are committed; missing secrets make the API refuse to start in `NODE_ENV=production`; in development safe defaults are used and clearly logged as mock.
