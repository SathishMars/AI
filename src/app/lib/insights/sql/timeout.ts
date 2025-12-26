// INSIGHTS-SPECIFIC: SQL query timeout utilities
import { insightsPool } from "@/app/lib/insights/db";

/**
 * Runs a query with a strict statement_timeout.
 * Keeps you under 3 seconds even for large tables.
 * 
 * CRITICAL FIX #4: Ensures database connection is always released, even on errors.
 */
export async function queryWithTimeout<T = any>(sql: string, params: any[] = [], ms = 1500) {
  let client: any = null;
  try {
    // CRITICAL FIX: Wrap connect() in try-catch to ensure client is set before use
    client = await (insightsPool as any).connect();
    
    if (!client) {
      throw new Error("Failed to acquire database connection from pool");
    }

    await client.query("BEGIN");
    // CRITICAL FIX: Validate timeout value and use safe integer (ms is controlled, but validate anyway)
    const safeTimeout = Math.max(100, Math.min(Number(ms), 30000)); // Between 100ms and 30s
    if (!Number.isInteger(safeTimeout)) {
      throw new Error(`Invalid timeout value: ${ms}`);
    }
    await client.query(`SET LOCAL statement_timeout = ${safeTimeout}`);
    const res = await client.query(sql, params);
    await client.query("COMMIT");
    return res;
  } catch (e) {
    // CRITICAL FIX: Ensure rollback happens if client was acquired
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        // Log but don't throw - we're already in error state
        console.error("[queryWithTimeout] Rollback failed:", rollbackError);
      }
    }
    throw e;
  } finally {
    // CRITICAL FIX: Always release connection, even if connect() failed
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        // Log but don't throw - connection may already be released
        console.error("[queryWithTimeout] Release failed:", releaseError);
      }
    }
  }
}

