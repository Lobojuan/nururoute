# NuruNode — Safe MVP Foundation

Ghana-first AI access and GHS wallet platform. This plan builds the monorepo scaffold, documents, database-level ledger, mocked adapters, API, web dashboard, and automated tests. No live payments, no live customer money, no real provider keys.

## Important environment note (needs your awareness)

This workspace natively runs one TanStack Start app at the repo root (the live preview). A Next.js app and a Fastify server cannot be served by the preview here. Per your choice, they will be scaffolded as real, runnable code (`bun run dev` locally / Docker), but the preview in this editor will only show a small NuruNode status page at the root. The full dashboard is verified via tests and local run instructions, not the preview.

## Repository structure

```text
nurunode/
  apps/
    web/                    Next.js 15 dashboard (App Router, Tailwind)
    api/                    Fastify 5 API (TypeScript, zod validation)
  packages/
    shared/                 Types, zod schemas, money utils (GHS in pesewas), errors
    database/               SQL migrations (tables + ledger PL/pgSQL functions), typed client, PGlite test harness
    ledger/                 Ledger service: topUp / reserve / settle / release / refund / availableBalance
    payment-adapters/       PaymentAdapter interface + MockMomoAdapter (simulated MTN MoMo top-up + webhook)
    provider-adapters/      ProviderAdapter interface + MockProviderAdapter (test models, token counting, deterministic cost)
  docs/
    product-mvp.md
    architecture.md
    ledger-rules.md
    security-and-money-rules.md
  docker-compose.yml        PostgreSQL 16 for local dev
  .env.example              Placeholders only (DATABASE_URL, MOMO_*, OPENAI_API_KEY=mock, GOOGLE_CLIENT_ID, ...)
  README.md                 Exact setup commands
```

Bun workspaces (`apps/*`, `packages/*`) in the root `package.json`; the existing root TanStack app stays intact so the editor build keeps passing.

## Documents (written first)

1. `docs/product-mvp.md` — user journey: sign in -> create org -> GHS wallet -> simulate top-up -> pick test model -> reserve -> mocked AI request -> settle -> release -> zero-balance block. Out of scope list.
2. `docs/architecture.md` — package map, request flow diagram, why all AI calls go through the API, env-var placeholder policy.
3. `docs/ledger-rules.md` — the six critical rules, entry types, balance formulas, idempotency, state machine for a usage request.
4. `docs/security-and-money-rules.md` — no live credentials, no upstream keys in client, webhook signature + replay protection, org-scoped access, audit immutability.

## Ledger model (database-level enforcement)

Tables: `users`, `organisations`, `org_members`, `wallets` (one per org, currency GHS), `ledger_entries` (append-only), `reservations`, `usage_requests`, `payment_intents`, `webhook_events` (unique provider event id).

Rules enforced in PostgreSQL:
- `ledger_entries` has no UPDATE/DELETE privileges and a trigger that rejects both.
- Balances are never stored as a mutable column; `available = posted_credits - posted_debits - open_reservations`, computed by a SQL function.
- `ledger_reserve(wallet, amount, idempotency_key)` locks the wallet row (`SELECT ... FOR UPDATE`), checks available balance, inserts a `reservation` entry or raises `INSUFFICIENT_FUNDS`.
- `ledger_settle(reservation, actual_amount)` inserts `settlement` (actual) and `release` (max - actual) entries in one transaction; actual may never exceed reserved.
- `ledger_top_up` and `ledger_refund` keyed by `idempotency_key` unique index -> duplicate webhook is a no-op returning the original entry.
- Amounts are integer pesewas (no floats).

## API (apps/api, Fastify)

- `POST /auth/dev-login` (email) + Google OAuth routes stubbed behind `GOOGLE_CLIENT_ID` placeholder; session JWT signed with `SESSION_SECRET` from env.
- `POST /orgs`, `GET /orgs/:id/wallet`, `GET /orgs/:id/ledger`
- `POST /orgs/:id/topups/simulate` -> MockMomoAdapter creates intent and immediately emits a signed mock webhook
- `POST /webhooks/payments/mock` -> verifies HMAC, idempotent by event id
- `GET /models` (from MockProviderAdapter)
- `POST /orgs/:id/ai/requests` -> estimate max cost -> reserve -> call mock provider -> settle + release -> return response, cost breakdown; returns 402 with `INSUFFICIENT_FUNDS` when blocked.

## Web (apps/web, Next.js)

Pages: sign-in (email + Google button; Google wired to placeholder), create organisation, wallet dashboard (balance, reserved, ledger table), "Simulate top-up" form, "Run test request" panel (model select, prompt, shows reserved / actual / released), zero-balance blocked state. Talks only to the API; never holds provider keys.

## Tests (vitest, run against PGlite in-memory Postgres so no external DB is needed)

- top-up credits balance and creates one immutable entry
- reserve reduces available balance; settle posts actual and releases remainder
- refund creates a debit entry and is idempotent
- duplicate webhook (same event id) does not double-credit
- zero / insufficient balance rejects reservation with `INSUFFICIENT_FUNDS`
- ledger entries cannot be updated or deleted
- API integration: end-to-end journey via Fastify `inject`

## Decisions needing your approval

1. Preview limitation accepted: editor preview shows a status page only; dashboard runs locally (`bun run dev`) or via Docker.
2. Money stored as integer pesewas (GHS x 100).
3. Tests use PGlite (embedded Postgres) so they run anywhere without Docker; the same SQL migrations run on real PostgreSQL 16 locally.
4. Google sign-in is scaffolded with placeholder client id/secret and a clearly-labelled dev email login for the MVP; no real OAuth credentials are added.
5. Mock MoMo webhook uses HMAC with a generated `MOCK_WEBHOOK_SECRET`; real provider adapters are interfaces only, no implementation.

## Delivery order

1. Docs (4 files) + README + .env.example
2. packages/shared, packages/database (migrations, functions, PGlite harness)
3. packages/ledger + tests
4. packages/payment-adapters, packages/provider-adapters + tests
5. apps/api + integration tests
6. apps/web dashboard
7. docker-compose, root status page, run full test suite, report structure and commands
