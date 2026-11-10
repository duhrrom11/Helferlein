/** NOT DEPLOYED. PostgreSQL driver bridge for heir-staging-backend.ts.
 * Supply a privileged but *restricted* server-only pool AFTER role/RLS audit.
 * Never use browser credentials or run with unreviewed RLS-bypass grants.
 */
import type { SqlBackend, SqlTx, QueryRow } from './heir-staging-backend.ts';

export interface PgResult<T extends QueryRow = QueryRow> {
  rows: T[];
  rowCount: number | null;
}
export interface PgClient {
  query<T extends QueryRow = QueryRow>(sql: string, params?: readonly unknown[]): Promise<PgResult<T>>;
  release(): void;
}
export interface PgPool {
  connect(): Promise<PgClient>;
}

export function createHeirPgTransactionAdapter(pool: PgPool): SqlBackend {
  return {
    async transaction<T>(work: (tx: SqlTx) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      let active = false;
      try {
        await client.query('BEGIN');
        active = true;
        await client.query("SET LOCAL search_path = pg_catalog");
        await client.query("SET LOCAL lock_timeout = '1500ms'");
        await client.query("SET LOCAL statement_timeout = '5000ms'");
        const tx: SqlTx = {
          async one<R extends QueryRow = QueryRow>(sql: string, values: readonly unknown[]): Promise<R | null> {
            const result = await client.query<R>(sql, values);
            if (result.rows.length > 1) throw new Error('unexpected_multiple_rows');
            return result.rows[0] ?? null;
          },
          async exec(sql: string, values: readonly unknown[]): Promise<number> {
            const result = await client.query(sql, values);
            if (result.rowCount === null || !Number.isInteger(result.rowCount)) {
              throw new Error('unknown_affected_rows');
            }
            return result.rowCount;
          },
        };
        const result = await work(tx);
        await client.query('COMMIT');
        active = false;
        return result;
      } catch (error) {
        if (active) {
          try { await client.query('ROLLBACK'); } catch { /* connection should be retired by pool */ }
        }
        throw error; // domain service transforms to generic denial
      } finally {
        client.release();
      }
    },
  };
}
