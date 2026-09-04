# NuruNode — Security and Money Rules

## Absolute rules for this repository

1. **No live credentials.** No live payment keys, no live customer money, no real AI-provider keys. Everything in `.env.example` is a placeholder. CI/tests must pass with placeholders only.
2. **Mock by default.** `PAYMENT_ADAPTER=mock` and `PROVIDER_ADAPTER=mock` are the defaults. The only other permitted value is `PAYMENT_ADAPTER=momo_sandbox` (approved 2026-09-02): the MTN MoMo **sandbox** Collections API, which is a test environment with no real money. The adapter and the env loader both refuse `MTN_MOMO_TARGET_ENV` values other than `sandbox`. Any other adapter value makes the API refuse to start.
3. **Upstream keys never reach the client.** The web app has no provider SDKs and no access to provider env vars. The only network target of the browser is the NuruNode API.
4. **The API is the only writer.** Only `apps/api` holds `DATABASE_URL`. The web app never talks to the database.

## Money-handling rules

- Integer pesewas only; never floating point.
- Balances are derived, never stored (see `docs/ledger-rules.md`).
- Every write to money state goes through a database function that locks the wallet row.
- Reservations are mandatory before any spend; over-settlement is impossible by database check.
- Refunds require `available >= amount` and an idempotency key.

## Webhooks and provider callbacks

- **MTN MoMo callbacks are unsigned.** `PUT /webhooks/payments/momo` therefore never credits a wallet from the callback body. It only triggers `confirmIntent`, which re-reads the payment status from MTN over an authenticated call and credits inside a transaction with `FOR UPDATE` on the intent plus the ledger idempotency key `topup:momo_sandbox:<referenceId>`. Polling `POST /orgs/:orgId/topups/:ref/confirm` follows the same path; the client can only ask, never assert.

- Every incoming payment webhook must carry an HMAC-SHA256 signature over the raw body, computed with `MOCK_WEBHOOK_SECRET` (mock) or the provider's secret (future). Invalid signature -> `401`, body ignored.
- Timing-safe comparison (`crypto.timingSafeEqual`).
- `webhook_events(provider, event_id)` is unique. Replays return `200 { duplicate: true }` and perform no ledger write.
- The ledger top-up uses `idempotency_key = "topup:<provider>:<event_id>"` as a second, independent guard.

## Authentication and authorisation

- Sessions are short-lived HS256 JWTs signed with `SESSION_SECRET` (min 32 chars; the API refuses to start in production without one).
- Every org-scoped route checks `org_members` for the caller. No cross-org reads or writes.
- Dev email login exists only when `ALLOW_DEV_LOGIN=true` and `NODE_ENV !== production`.
- Google sign-in is scaffolded behind `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` placeholders and returns `501` until real credentials are configured — it must never be enabled with fake values.

## Auditability

- `ledger_entries` is append-only (trigger + revoked privileges). Corrections are new entries, never edits.
- Every entry stores `metadata` (request id, model, tokens, provider event id) so any balance can be reconstructed and explained.

## Things that require explicit human approval before being added

- Any **live** payment provider adapter (the MTN sandbox adapter is approved; a live target is not)
- Any real AI provider adapter
- Any code path that moves money without a reservation
- Any change that adds a mutable balance column
