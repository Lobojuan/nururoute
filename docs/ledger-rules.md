# NuruNode — Ledger Rules

These rules are enforced in PostgreSQL (`packages/database/migrations`) and mirrored by tests in `packages/ledger`.

## The six critical rules

1. **Never directly subtract a wallet balance.** There is no `balance` column. Balance is always derived from ledger entries.
2. **Every money movement is an immutable ledger entry.** Top-up, reservation, settlement, release and refund each insert a row into `ledger_entries`. UPDATE and DELETE on that table are rejected by trigger and by privilege.
3. **Reserve before calling a provider.** A usage request must hold a reservation for the estimated *maximum* cost before any provider call is made.
4. **Settle then release.** On completion, a `settlement` entry records actual cost and a `release` entry returns `reserved - actual`, in one transaction.
5. **Reject when insufficient.** `ledger_reserve` raises `INSUFFICIENT_FUNDS` when `available < amount`. Zero balance always rejects any positive amount.
6. **All requests go through NuruNode's backend.** No upstream provider key is ever sent to a client.

## Units

All amounts are **integer pesewas** (`GHS 1.00 = 100`). No floats anywhere in money paths.

## Entry types and their effect on available balance

| entry_type   | effect on available | notes |
|--------------|---------------------|-------|
| `top_up`     | `+amount`           | from a verified payment webhook |
| `reservation`| `-amount`           | holds the maximum estimated cost |
| `settlement` | `0`                 | records actual cost; money already held by the reservation |
| `release`    | `+amount`           | returns unused part of a reservation (or all of it on failure) |
| `refund`     | `-amount`           | money returned to the customer |

```text
available = Σ top_up + Σ release − Σ reservation − Σ refund
reserved  = Σ amount of reservations with status = 'open'
spent     = Σ settlement
```

Because a reservation already debits the full held amount, settlement is balance-neutral and release credits back the unused part. The invariant `available >= 0` holds at all times.

## Reservation state machine

```text
open ──settle(actual ≤ reserved)──▶ settled   (settlement + release(reserved − actual))
open ──release()──────────────────▶ released  (release(reserved))
```

A reservation can be settled or released exactly once. Attempting either on a non-open reservation raises `RESERVATION_NOT_OPEN`. `actual > reserved` raises `SETTLEMENT_EXCEEDS_RESERVATION`.

## Idempotency

- `ledger_entries.idempotency_key` is unique per wallet. `ledger_top_up` and `ledger_refund` return the existing entry when called again with the same key. Duplicate webhooks therefore cannot double-credit.
- `webhook_events.event_id` is unique per provider; a replayed webhook is acknowledged (200) but not reprocessed.
- `ledger_reserve` also accepts an idempotency key so a retried request cannot double-hold.

## Concurrency

Every ledger function starts with `SELECT ... FROM wallets WHERE id = $1 FOR UPDATE`. Concurrent reservations on the same wallet serialise, so two requests cannot both pass the balance check against the same funds.
