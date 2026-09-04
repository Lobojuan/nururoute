-- Subscription catalogue and customer plan state.
-- Plan prices live in this versioned database catalogue, never in browser code.
-- This migration creates no allowance and moves no money.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   text NOT NULL UNIQUE CHECK (slug IN ('free', 'starter', 'builder', 'pro')),
  display_name           text NOT NULL,
  monthly_price_pesewas  integer NOT NULL CHECK (monthly_price_pesewas >= 0),
  tier_rank              integer NOT NULL CHECK (tier_rank BETWEEN 0 AND 3),
  status                 text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  effective_at           timestamptz NOT NULL DEFAULT now(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_rank)
);

INSERT INTO subscription_plans (slug, display_name, monthly_price_pesewas, tier_rank)
VALUES
  ('free',    'Free',    0,     0),
  ('starter', 'Starter', 2000,  1),
  ('builder', 'Builder', 10000, 2),
  ('pro',     'Pro',     40000, 3)
ON CONFLICT (slug) DO NOTHING;

-- The current plan state is operational metadata; every change is also
-- recorded in the immutable subscription_events table below.
CREATE TABLE IF NOT EXISTS subscriptions (
  org_id          uuid PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
  plan_id         uuid NOT NULL REFERENCES subscription_plans(id),
  status          text NOT NULL CHECK (status IN ('pending_payment', 'active', 'past_due', 'expired', 'cancelled')),
  selected_at     timestamptz NOT NULL DEFAULT now(),
  period_start    timestamptz,
  period_end      timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  subscription_id  uuid REFERENCES subscription_plans(id),
  event_type       text NOT NULL,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_events_org_created_idx
  ON subscription_events (org_id, created_at DESC);

CREATE OR REPLACE FUNCTION subscription_events_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_IMMUTABLE: subscription_events rows cannot be % ', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS subscription_events_no_update ON subscription_events;
CREATE TRIGGER subscription_events_no_update
  BEFORE UPDATE OR DELETE ON subscription_events
  FOR EACH ROW EXECUTE FUNCTION subscription_events_immutable();

-- Reserved for the later allowance ledger. It stays empty until a verified
-- subscription payment grants an allowance through the approved ledger path.
CREATE TABLE IF NOT EXISTS subscription_allowance_grants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  plan_id           uuid NOT NULL REFERENCES subscription_plans(id),
  amount_pesewas    bigint NOT NULL CHECK (amount_pesewas > 0),
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_allowance_grants_org_expiry_idx
  ON subscription_allowance_grants (org_id, expires_at);
