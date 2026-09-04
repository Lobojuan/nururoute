-- NuruNode initial schema. Amounts are integer pesewas (GHS x 100).

-- gen_random_uuid() is built into PostgreSQL 13+; no extension required.

CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  name        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organisations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  owner_id    uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS wallets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,
  currency    text NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       uuid NOT NULL REFERENCES wallets(id),
  amount_pesewas  bigint NOT NULL CHECK (amount_pesewas > 0),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'released')),
  idempotency_key text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, idempotency_key)
);

-- Append-only ledger. No balance column exists anywhere.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       uuid NOT NULL REFERENCES wallets(id),
  entry_type      text NOT NULL CHECK (entry_type IN ('top_up', 'reservation', 'settlement', 'release', 'refund')),
  amount_pesewas  bigint NOT NULL CHECK (amount_pesewas >= 0),
  reservation_id  uuid REFERENCES reservations(id),
  idempotency_key text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS ledger_entries_wallet_idx ON ledger_entries (wallet_id, created_at);

CREATE OR REPLACE FUNCTION ledger_entries_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'LEDGER_IMMUTABLE: ledger_entries rows cannot be % ', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS ledger_entries_no_update ON ledger_entries;
CREATE TRIGGER ledger_entries_no_update
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_entries_immutable();

CREATE TABLE IF NOT EXISTS payment_intents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       uuid NOT NULL REFERENCES wallets(id),
  provider        text NOT NULL,
  provider_ref    text NOT NULL,
  amount_pesewas  bigint NOT NULL CHECK (amount_pesewas > 0),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_ref)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL,
  event_id      text NOT NULL,
  payload       jsonb NOT NULL,
  processed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS usage_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organisations(id),
  wallet_id         uuid NOT NULL REFERENCES wallets(id),
  reservation_id    uuid REFERENCES reservations(id),
  model_id          text NOT NULL,
  prompt            text NOT NULL,
  response_text     text,
  status            text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'failed', 'rejected')),
  input_tokens      integer,
  output_tokens     integer,
  reserved_pesewas  bigint,
  actual_pesewas    bigint,
  released_pesewas  bigint,
  error_code        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);
