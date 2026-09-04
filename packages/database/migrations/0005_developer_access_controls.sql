-- A platform operator can immediately stop all developer API traffic for an
-- organisation without touching its ledger or deleting its historical keys.
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS developer_access_status text NOT NULL DEFAULT 'active'
  CHECK (developer_access_status IN ('active', 'paused'));

CREATE INDEX IF NOT EXISTS api_keys_active_org_idx
  ON api_keys (org_id, created_at) WHERE revoked_at IS NULL;
