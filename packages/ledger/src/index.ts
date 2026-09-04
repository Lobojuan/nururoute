import { toInt, toIso, type Db } from "@nurunode/database";
import {
  NuruError,
  assertPesewas,
  type ErrorCode,
  type LedgerEntry,
  type LedgerEntryType,
  type Pesewas,
  type Reservation,
  type ReservationStatus,
  type WalletBalance,
} from "@nurunode/shared";

/**
 * LedgerService is a thin, typed wrapper over the database functions.
 * It never writes ledger rows itself; all invariants live in SQL.
 */

const DB_ERROR_CODES: ErrorCode[] = [
  "INSUFFICIENT_FUNDS",
  "RESERVATION_NOT_OPEN",
  "SETTLEMENT_EXCEEDS_RESERVATION",
  "INVALID_AMOUNT",
  "WALLET_NOT_FOUND",
  "RESERVATION_NOT_FOUND",
  "LEDGER_IMMUTABLE",
];

export function translateDbError(e: unknown): never {
  const message = e instanceof Error ? e.message : String(e);
  for (const code of DB_ERROR_CODES) {
    if (message.includes(code)) throw new NuruError(code, message);
  }
  throw e;
}

type EntryRow = {
  id: string;
  wallet_id: string;
  entry_type: LedgerEntryType;
  amount_pesewas: unknown;
  reservation_id: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown> | string;
  created_at: unknown;
};

type ReservationRow = {
  id: string;
  wallet_id: string;
  amount_pesewas: unknown;
  status: ReservationStatus;
  created_at: unknown;
};

function mapEntry(r: EntryRow): LedgerEntry {
  return {
    id: r.id,
    walletId: r.wallet_id,
    entryType: r.entry_type,
    amountPesewas: toInt(r.amount_pesewas),
    reservationId: r.reservation_id,
    idempotencyKey: r.idempotency_key,
    metadata:
      typeof r.metadata === "string"
        ? (JSON.parse(r.metadata) as Record<string, unknown>)
        : r.metadata,
    createdAt: toIso(r.created_at),
  };
}

function mapReservation(r: ReservationRow): Reservation {
  return {
    id: r.id,
    walletId: r.wallet_id,
    amountPesewas: toInt(r.amount_pesewas),
    status: r.status,
    createdAt: toIso(r.created_at),
  };
}

export interface SettleResult {
  settlementEntryId: string;
  releaseEntryId: string | null;
  releasedPesewas: Pesewas;
}

export class LedgerService {
  constructor(private readonly db: Db) {}

  async balance(walletId: string): Promise<WalletBalance> {
    const { rows } = await this.db.query<{
      available_pesewas: unknown;
      reserved_pesewas: unknown;
      lifetime_top_ups_pesewas: unknown;
      lifetime_spent_pesewas: unknown;
    }>("SELECT * FROM wallet_balance($1)", [walletId]);
    const r = rows[0];
    if (!r) throw new NuruError("WALLET_NOT_FOUND");
    return {
      walletId,
      currency: "GHS",
      availablePesewas: toInt(r.available_pesewas),
      reservedPesewas: toInt(r.reserved_pesewas),
      lifetimeTopUpsPesewas: toInt(r.lifetime_top_ups_pesewas),
      lifetimeSpentPesewas: toInt(r.lifetime_spent_pesewas),
    };
  }

  async entries(walletId: string, limit = 100): Promise<LedgerEntry[]> {
    const { rows } = await this.db.query<EntryRow>(
      "SELECT * FROM ledger_entries WHERE wallet_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2",
      [walletId, limit],
    );
    return rows.map(mapEntry);
  }

  async topUp(input: {
    walletId: string;
    amountPesewas: Pesewas;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<LedgerEntry> {
    assertPesewas(input.amountPesewas);
    try {
      const { rows } = await this.db.query<EntryRow>(
        "SELECT * FROM ledger_top_up($1, $2, $3, $4::jsonb)",
        [
          input.walletId,
          input.amountPesewas,
          input.idempotencyKey,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      return mapEntry(rows[0]!);
    } catch (e) {
      translateDbError(e);
    }
  }

  async reserve(input: {
    walletId: string;
    amountPesewas: Pesewas;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Reservation> {
    assertPesewas(input.amountPesewas);
    try {
      const { rows } = await this.db.query<ReservationRow>(
        "SELECT * FROM ledger_reserve($1, $2, $3, $4::jsonb)",
        [
          input.walletId,
          input.amountPesewas,
          input.idempotencyKey ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      return mapReservation(rows[0]!);
    } catch (e) {
      translateDbError(e);
    }
  }

  async settle(input: {
    reservationId: string;
    actualPesewas: Pesewas;
    metadata?: Record<string, unknown>;
  }): Promise<SettleResult> {
    assertPesewas(input.actualPesewas);
    try {
      const { rows } = await this.db.query<{
        settlement_entry_id: string;
        release_entry_id: string | null;
        released_pesewas: unknown;
      }>("SELECT * FROM ledger_settle($1, $2, $3::jsonb)", [
        input.reservationId,
        input.actualPesewas,
        JSON.stringify(input.metadata ?? {}),
      ]);
      const r = rows[0]!;
      return {
        settlementEntryId: r.settlement_entry_id,
        releaseEntryId: r.release_entry_id,
        releasedPesewas: toInt(r.released_pesewas),
      };
    } catch (e) {
      translateDbError(e);
    }
  }

  async release(input: {
    reservationId: string;
    metadata?: Record<string, unknown>;
  }): Promise<LedgerEntry> {
    try {
      const { rows } = await this.db.query<EntryRow>(
        "SELECT * FROM ledger_release($1, $2::jsonb)",
        [input.reservationId, JSON.stringify(input.metadata ?? {})],
      );
      return mapEntry(rows[0]!);
    } catch (e) {
      translateDbError(e);
    }
  }

  async refund(input: {
    walletId: string;
    amountPesewas: Pesewas;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<LedgerEntry> {
    assertPesewas(input.amountPesewas);
    try {
      const { rows } = await this.db.query<EntryRow>(
        "SELECT * FROM ledger_refund($1, $2, $3, $4::jsonb)",
        [
          input.walletId,
          input.amountPesewas,
          input.idempotencyKey,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      return mapEntry(rows[0]!);
    } catch (e) {
      translateDbError(e);
    }
  }

  async reservation(id: string): Promise<Reservation | null> {
    const { rows } = await this.db.query<ReservationRow>(
      "SELECT * FROM reservations WHERE id = $1",
      [id],
    );
    return rows[0] ? mapReservation(rows[0]) : null;
  }
}

/** Test/dev helper: create a user, org and wallet in one go. */
export async function createOrgWithWallet(
  db: Db,
  input: { ownerEmail: string; orgName: string },
): Promise<{ userId: string; orgId: string; walletId: string }> {
  return db.transaction(async (tx) => {
    const user = await tx.query<{ id: string }>(
      `INSERT INTO users (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
      [input.ownerEmail],
    );
    const userId = user.rows[0]!.id;
    const org = await tx.query<{ id: string }>(
      "INSERT INTO organisations (name, owner_id) VALUES ($1, $2) RETURNING id",
      [input.orgName, userId],
    );
    const orgId = org.rows[0]!.id;
    await tx.query("INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')", [
      orgId,
      userId,
    ]);
    const wallet = await tx.query<{ id: string }>(
      "INSERT INTO wallets (org_id) VALUES ($1) RETURNING id",
      [orgId],
    );
    return { userId, orgId, walletId: wallet.rows[0]!.id };
  });
}
