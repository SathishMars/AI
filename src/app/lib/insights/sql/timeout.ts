// INSIGHTS-SPECIFIC: SQL query timeout utilities
import { insightsPool } from "@/app/lib/insights/db";

/**
 * Runs a query with a strict statement_timeout.
 * Keeps you under 3 seconds even for large tables.
 */
export async function queryWithTimeout<T = any>(sql: string, params: any[] = [], ms = 1500) {
  const client = await (insightsPool as any).connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL statement_timeout = ${ms}`); // ms
    const res = await client.query(sql, params);
    await client.query("COMMIT");
    return res;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch { }
    throw e;
  } finally {
    client.release();
  }
}

