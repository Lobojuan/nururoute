-- Private NuruRoute platform control plane.
-- This migration deliberately does not change balances or introduce a live provider.

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('support', 'finance', 'provider_ops', 'super_admin')),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- A platform operator can pause a model immediately. A missing row means active.
-- Controls apply before reservation, so a paused model can never trigger a provider call.
CREATE TABLE IF NOT EXISTS platform_model_controls (
  model_id          text PRIMARY KEY,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  max_output_tokens integer CHECK (max_output_tokens IS NULL OR max_output_tokens > 0),
  updated_by        uuid NOT NULL REFERENCES users(id),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- The audit trail is append-only. It records administrative decisions, never secrets.
CREATE TABLE IF NOT EXISTS platform_audit_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES users(id),
  action        text NOT NULL,
  target_type   text NOT NULL,
  target_id     text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_audit_events_created_idx
  ON platform_audit_events (created_at DESC);

CREATE OR REPLACE FUNCTION platform_audit_events_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_IMMUTABLE: platform_audit_events rows cannot be % ', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS platform_audit_events_no_update ON platform_audit_events;
CREATE TRIGGER platform_audit_events_no_update
  BEFORE UPDATE OR DELETE ON platform_audit_events
  FOR EACH ROW EXECUTE FUNCTION platform_audit_events_immutable();
