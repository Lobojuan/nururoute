import pg from "pg";
import type { Db, QueryResult } from "./index";

// Return bigint (OID 20) as string; callers use toInt().
type Queryable = pg.Pool | pg.PoolClient;

function wrap(q: Queryable, pool: pg.Pool): Db {
  return {
    async query<Row>(sql: string, params: unknown[] = []): Promise<QueryResult<Row>> {
      const res = await q.query(sql, params);
      return { rows: res.rows as Row[], rowCount: res.rowCount ?? res.rows.length };
    },
    async exec(sql: string) {
      await q.query(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      if (q !== pool) return fn(wrap(q, pool)); // nested: reuse client
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn(wrap(client, pool));
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString });
  return wrap(pool, pool);
}
