// INSIGHTS-SPECIFIC: PostgreSQL database connection for attendee data
// This is separate from workflow database connections

const connectionString = process.env.DATABASE_URL;
console.log("[Insights DB] DATABASE_URL presence:", !!connectionString);
if (connectionString) {
    console.log("[Insights DB] DATABASE_URL starts with:", connectionString.substring(0, 20) + "...");
}


// Lazy-load pg to bypass Turbopack symlink errors on Windows at build-time
let poolInstance: any = null;

export function getInsightsPool() {
    if (poolInstance) return poolInstance;

    try {
        const { Pool } = eval('require("pg")');
        console.log("[Insights DB] Initializing new pool...");
        if (!connectionString) {
            console.warn("DATABASE_URL is missing. Insights DB operations will fail.");
            return null;
        }

        poolInstance = new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 2_000, // Reduced to 2 seconds for faster fallback
        });

        poolInstance.on('error', (err: any) => {
            console.error('[Insights DB] Unexpected error on idle client', err);
        });

        return poolInstance;
    } catch (err) {
        console.error("[Insights DB] Failed to initialize database pool (Check your pg installation):", err);
        return null;
    }
}

// For compatibility with existing imports, we export a proxy that lazily initializes the pool
export const insightsPool = new Proxy({} as any, {
    get(target, prop) {
        const instance = getInsightsPool();
        if (!instance) {
            throw new Error("Insights database pool not initialized. Check DATABASE_URL.");
        }
        const value = instance[prop];
        // Critical: Bind functions to the instance so 'this' works correctly (e.g. pool.query)
        if (typeof value === 'function') {
            return value.bind(instance);
        }
        return value;
    }
});

// Legacy export for backward compatibility (will be removed)
export function getPool() {
    return getInsightsPool();
}

export const pool = insightsPool;

