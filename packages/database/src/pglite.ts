import { PGlite, type Transaction } from "@electric-sql/pglite";
import { migrate, type Db, type QueryResult } from "./index";

type Runner = Pick<PGlite, "query" | "exec"> | Transaction;

function wrap(runner: Runner, root: PGlite): Db {
  return {
    async query<Row>(sql: string, params: unknown[] = []): Promise<QueryResult<Row>> {
      const res = await runner.query<Row>(sql, params);
      return { rows: res.rows, rowCount: res.affectedRows ?? res.rows.length };
    },
    async exec(sql: string) {
      await runner.exec(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      if ("rollback" in runner) {
        // already inside a transaction: PGlite has no savepoints API; reuse.
        return fn(wrap(runner, root));
      }
      return root.transaction((tx) => fn(wrap(tx, root)));
    },
    async close() {
      await root.close();
    },
  };
}

/** In-memory Postgres for tests. Migrations are applied automatically. */
export async function createTestDb(): Promise<Db> {
  const pg = new PGlite();
  const db = wrap(pg, pg);
  await migrate(db);
  return db;
}
