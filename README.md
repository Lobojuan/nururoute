# NuruNode — Safe MVP Foundation

Ghana-first AI access and GHS wallet platform. **This repository runs entirely in mock mode**: no live payments, no customer money, no real AI-provider keys. See `docs/` before changing anything money-related.

```text
apps/web                  Next.js dashboard (http://localhost:3000)
apps/api                  Fastify API      (http://localhost:4000)
packages/shared           Types, zod schemas, money helpers (integer pesewas)
packages/database         SQL migrations + PL/pgSQL ledger functions, pg & PGlite drivers
packages/ledger           Typed ledger service (topUp / reserve / settle / release / refund)
packages/payment-adapters PaymentAdapter interface + MockMomoAdapter
packages/provider-adapters ProviderAdapter interface + MockProviderAdapter
docs/                     product-mvp, architecture, ledger-rules, security-and-money-rules
src/                      Small TanStack Start status page used by the Lovable editor preview only
```

## Prerequisites

- [Bun](https://bun.sh) 1.1+
- Docker (for local PostgreSQL) — tests do **not** need Docker

## Run the tests (no database setup required)

Tests run the real SQL migrations against an embedded Postgres (PGlite).

```bash
bun install
bun run test
```

Covers: top-up, reserve, settle + release, refund, duplicate webhook, zero-balance rejection, ledger immutability, concurrency, full API journey.

## Run locally

```bash
# 1. Install
bun install

# 2. Environment (all values are placeholders)
cp .env.example .env

# 3. PostgreSQL
docker compose up -d

# 4. API (applies migrations automatically on start)
set -a && source .env && set +a
bun run dev:api          # http://localhost:4000/health

# 5. Web dashboard — in a second terminal
set -a && source .env && set +a
bun run dev:web          # http://localhost:3000

# Or run API + web together in one terminal
bun run dev:all
```

Then in the browser: sign in with any email -> create an organisation -> "Simulate MoMo payment" -> "Reserve & run" -> watch the ledger. Set the model to **Nuru Test Large** with 4096 max tokens to see the insufficient-balance block.

Run migrations by hand (optional): `bun run db:migrate`.

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/dev-login` | Dev sign-in (disabled in production) |
| GET  | `/auth/google` | Scaffold; returns 501 until real credentials are approved |
| GET  | `/me` | Current user + organisations |
| POST | `/orgs` | Create organisation + GHS wallet |
| GET  | `/orgs/:id/wallet` | Available / reserved / lifetime totals |
| GET  | `/orgs/:id/ledger` | Immutable ledger entries |
| POST | `/orgs/:id/topups/simulate` | Mock MoMo intent + signed webhook |
| POST | `/webhooks/payments/mock` | Signature-verified, idempotent webhook receiver |
| POST | `/orgs/:id/topups` | Create a top-up request with the configured adapter (mock or MTN sandbox) |
| POST | `/orgs/:id/topups/:ref/confirm` | Server re-checks the provider and credits once (poll until `succeeded`/`failed`) |
| GET | `/orgs/:id/topups` | Top-up history |
| PUT | `/webhooks/payments/momo` | Unsigned MTN callback; only triggers a re-verify |
| GET  | `/models` | Mock model catalogue |
| POST | `/orgs/:id/ai/requests` | Reserve -> mock provider -> settle -> release; `402 INSUFFICIENT_FUNDS` when blocked |

## Money rules in one paragraph

Amounts are integer pesewas. There is no balance column; `wallet_balance()` derives it from `ledger_entries`, which is append-only (UPDATE/DELETE rejected by trigger). Every change goes through `ledger_top_up`, `ledger_reserve`, `ledger_settle`, `ledger_release`, `ledger_refund`, each of which locks the wallet row. A request must reserve its maximum cost before the provider is called; on success the actual cost is settled and the remainder released in the same transaction; on failure the whole reservation is released. Full detail: `docs/ledger-rules.md`.

## Adding real providers (needs approval)

Implement `PaymentAdapter` / `ProviderAdapter`, select via `PAYMENT_ADAPTER` / `PROVIDER_ADAPTER`, and follow `docs/security-and-money-rules.md`. `PROVIDER_ADAPTER` must be `mock`.

### Real MTN MoMo top-ups (sandbox, feature-flagged)

The MTN sandbox is a test environment: requests-to-pay are real API calls, but no money moves and the currency is EUR.

```bash
# 1. Create a free account at https://momodeveloper.mtn.com and subscribe to "Collections".
# 2. Provision a sandbox API user/key with the Collections primary key:
MTN_MOMO_SUBSCRIPTION_KEY=<primary key> bun run momo:provision
# 3. Paste the printed lines into .env (PAYMENT_ADAPTER=momo_sandbox, MTN_MOMO_API_USER, MTN_MOMO_API_KEY)
# 4. Restart the API. /health now reports paymentMode: "sandbox".
```

In the dashboard, "Top up" sends a request-to-pay and polls until MTN reports `SUCCESSFUL`. Any number except MTN's special test MSISDNs is approved automatically; `46733123450` fails, `46733123453` stays pending. The API refuses `MTN_MOMO_TARGET_ENV` values other than `sandbox`.
