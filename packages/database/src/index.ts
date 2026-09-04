import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Minimal database interface shared by the pg (PostgreSQL) driver and the
 * PGlite driver used in tests. Every ledger function is invoked through this.
 */
export interface QueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number;
}

export interface Db {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
  /** Execute a multi-statement SQL script (migrations). */
  exec(sql: string): Promise<void>;
  /** Run fn inside a transaction; the Db passed to fn is bound to that transaction. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../migrations",
);

export async function loadMigrations(): Promise<{ name: string; sql: string }[]> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  return Promise.all(
    files.map(async (name) => ({
      name,
      sql: await readFile(path.join(MIGRATIONS_DIR, name), "utf8"),
    })),
  );
}

export async function migrate(db: Db): Promise<string[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = new Set(
    (await db.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map(
      (r) => r.name,
    ),
  );
  const ran: string[] = [];
  for (const m of await loadMigrations()) {
    if (applied.has(m.name)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query("INSERT INTO schema_migrations (name) VALUES ($1)", [m.name]);
    });
    ran.push(m.name);
  }
  return ran;
}

/** Postgres returns bigint as string; normalise to number (safe for pesewas at MVP scale). */
export function toInt(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number.parseInt(value, 10);
  return 0;
}

export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
