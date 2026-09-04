-- Ledger functions. These are the ONLY way money state changes.
-- Every function locks the wallet row first so concurrent calls serialise.

CREATE OR REPLACE FUNCTION wallet_balance(p_wallet_id uuid)
RETURNS TABLE (
  available_pesewas bigint,
  reserved_pesewas bigint,
  lifetime_top_ups_pesewas bigint,
  lifetime_spent_pesewas bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(SUM(CASE entry_type
      WHEN 'top_up'      THEN amount_pesewas
      WHEN 'release'     THEN amount_pesewas
      WHEN 'reservation' THEN -amount_pesewas
      WHEN 'refund'      THEN -amount_pesewas
      ELSE 0 END), 0)::bigint AS available_pesewas,
    COALESCE((SELECT SUM(r.amount_pesewas) FROM reservations r
              WHERE r.wallet_id = p_wallet_id AND r.status = 'open'), 0)::bigint AS reserved_pesewas,
    COALESCE(SUM(CASE WHEN entry_type = 'top_up' THEN amount_pesewas ELSE 0 END), 0)::bigint AS lifetime_top_ups_pesewas,
    COALESCE(SUM(CASE WHEN entry_type = 'settlement' THEN amount_pesewas ELSE 0 END), 0)::bigint AS lifetime_spent_pesewas
  FROM ledger_entries
  WHERE wallet_id = p_wallet_id;
$$;

CREATE OR REPLACE FUNCTION lock_wallet(p_wallet_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM wallets WHERE id = p_wallet_id FOR UPDATE;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- Top-up: credit. Idempotent on (wallet_id, idempotency_key).
CREATE OR REPLACE FUNCTION ledger_top_up(
  p_wallet_id uuid, p_amount bigint, p_idempotency_key text, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS ledger_entries
LANGUAGE plpgsql AS $$
DECLARE v_entry ledger_entries;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0001';
  END IF;
  IF p_idempotency_key IS NULL OR p_idempotency_key = '' THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: idempotency key required' USING ERRCODE = 'P0001';
  END IF;
  PERFORM lock_wallet(p_wallet_id);

  SELECT * INTO v_entry FROM ledger_entries
   WHERE wallet_id = p_wallet_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_entry; -- duplicate: no-op
  END IF;

  INSERT INTO ledger_entries (wallet_id, entry_type, amount_pesewas, idempotency_key, metadata)
  VALUES (p_wallet_id, 'top_up', p_amount, p_idempotency_key, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO v_entry;
  RETURN v_entry;
END;
$$;

-- Reserve: hold the maximum estimated cost. Rejects when available < amount.
CREATE OR REPLACE FUNCTION ledger_reserve(
  p_wallet_id uuid, p_amount bigint, p_idempotency_key text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS reservations
LANGUAGE plpgsql AS $$
DECLARE
  v_res reservations;
  v_available bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0001';
  END IF;
  PERFORM lock_wallet(p_wallet_id);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_res FROM reservations
     WHERE wallet_id = p_wallet_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_res;
    END IF;
  END IF;

  SELECT available_pesewas INTO v_available FROM wallet_balance(p_wallet_id);
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: available % < required %', v_available, p_amount
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO reservations (wallet_id, amount_pesewas, status, idempotency_key)
  VALUES (p_wallet_id, p_amount, 'open', p_idempotency_key)
  RETURNING * INTO v_res;

  INSERT INTO ledger_entries (wallet_id, entry_type, amount_pesewas, reservation_id, idempotency_key, metadata)
  VALUES (p_wallet_id, 'reservation', p_amount, v_res.id,
          CASE WHEN p_idempotency_key IS NULL THEN NULL ELSE 'reserve:' || p_idempotency_key END,
          COALESCE(p_metadata, '{}'::jsonb));
  RETURN v_res;
END;
$$;

-- Settle: record actual cost and release the unused remainder, atomically.
CREATE OR REPLACE FUNCTION ledger_settle(
  p_reservation_id uuid, p_actual bigint, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (settlement_entry_id uuid, release_entry_id uuid, released_pesewas bigint)
LANGUAGE plpgsql AS $$
DECLARE
  v_res reservations;
  v_release bigint;
  v_settlement_id uuid;
  v_release_id uuid;
BEGIN
  IF p_actual IS NULL OR p_actual < 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_res FROM reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  PERFORM lock_wallet(v_res.wallet_id);
  -- re-read under lock
  SELECT * INTO v_res FROM reservations WHERE id = p_reservation_id FOR UPDATE;

  IF v_res.status <> 'open' THEN
    RAISE EXCEPTION 'RESERVATION_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;
  IF p_actual > v_res.amount_pesewas THEN
    RAISE EXCEPTION 'SETTLEMENT_EXCEEDS_RESERVATION: actual % > reserved %', p_actual, v_res.amount_pesewas
      USING ERRCODE = 'P0001';
  END IF;

  v_release := v_res.amount_pesewas - p_actual;

  INSERT INTO ledger_entries (wallet_id, entry_type, amount_pesewas, reservation_id, metadata)
  VALUES (v_res.wallet_id, 'settlement', p_actual, v_res.id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_settlement_id;

  IF v_release > 0 THEN
    INSERT INTO ledger_entries (wallet_id, entry_type, amount_pesewas, reservation_id, metadata)
    VALUES (v_res.wallet_id, 'release', v_release, v_res.id,
            COALESCE(p_metadata, '{}'::jsonb) || '{"reason":"unused_after_settlement"}'::jsonb)
    RETURNING id INTO v_release_id;
  END IF;

  UPDATE reservations SET status = 'settled', updated_at = now() WHERE id = v_res.id;

  RETURN QUERY SELECT v_settlement_id, v_release_id, v_release;
END;
$$;

-- Release: give back the entire reservation (provider failure, cancellation).
CREATE OR REPLACE FUNCTION ledger_release(
  p_reservation_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS ledger_entries
LANGUAGE plpgsql AS $$
DECLARE
  v_res reservations;
  v_entry ledger_entries;
BEGIN
  SELECT * INTO v_res FROM reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  PERFORM lock_wallet(v_res.wallet_id);
  SELECT * INTO v_res FROM reservations WHERE id = p_reservation_id FOR UPDATE;
  IF v_res.status <> 'open' THEN
    RAISE EXCEPTION 'RESERVATION_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO ledger_entries (wallet_id, entry_type, amount_pesewas, reservation_id, metadata)
  VALUES (v_res.wallet_id, 'release', v_res.amount_pesewas, v_res.id,
          COALESCE(p_metadata, '{}'::jsonb) || '{"reason":"full_release"}'::jsonb)
  RETURNING * INTO v_entry;

  UPDATE reservations SET status = 'released', updated_at = now() WHERE id = v_res.id;
  RETURN v_entry;
END;
$$;

-- Refund: debit money back to the customer. Idempotent, needs sufficient available balance.
CREATE OR REPLACE FUNCTION ledger_refund(
  p_wallet_id uuid, p_amount bigint, p_idempotency_key text, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS ledger_entries
LANGUAGE plpgsql AS $$
DECLARE
  v_entry ledger_entries;
  v_available bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0001';
  END IF;
  IF p_idempotency_key IS NULL OR p_idempotency_key = '' THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: idempotency key required' USING ERRCODE = 'P0001';
  END IF;
  PERFORM lock_wallet(p_wallet_id);

  SELECT * INTO v_entry FROM ledger_entries
   WHERE wallet_id = p_wallet_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_entry;
  END IF;

  SELECT available_pesewas INTO v_available FROM wallet_balance(p_wallet_id);
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: available % < refund %', v_available, p_amount
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO ledger_entries (wallet_id, entry_type, amount_pesewas, idempotency_key, metadata)
  VALUES (p_wallet_id, 'refund', p_amount, p_idempotency_key, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO v_entry;
  RETURN v_entry;
END;
$$;
