-- Per-organisation pricing and developer API keys.
-- No ledger changes: prices only feed the reserve/settle *amounts*; the ledger rules are untouched.

-- Per-token prices an organisation pays for each model. Absent row => platform default price
-- from the provider catalog. Prices are integer pesewas per 1,000 tokens.
CREATE TABLE IF NOT EXISTS org_model_prices (
  org_id                      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  model_id                    text NOT NULL,
  input_price_per_1k_pesewas  integer NOT NULL CHECK (input_price_per_1k_pesewas >= 0),
  output_price_per_1k_pesewas integer NOT NULL CHECK (output_price_per_1k_pesewas >= 0),
  updated_by                  uuid REFERENCES users(id),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, model_id)
);

-- Developer API keys. Only a SHA-256 hash is stored; the plaintext is shown once at creation.
CREATE TABLE IF NOT EXISTS api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES users(id),
  name          text NOT NULL,
  key_prefix    text NOT NULL,
  key_hash      text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
CREATE INDEX IF NOT EXISTS api_keys_org_idx ON api_keys (org_id, created_at);
