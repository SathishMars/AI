// INSIGHTS-SPECIFIC: PostgreSQL database connection for attendee data
// This is separate from workflow database connections

import { env } from '@/app/lib/env';
import { logger } from '@/app/lib/logger';

/**
 * Logging utilities for Insights DB
 * Respects environment configuration to control verbosity
 */
function logInfo(message: string): void {
  if (env.databaseInitLogging === 'verbose' || env.isDevelopment) {
    logger.info(`[Insights DB] ${message}`);
  }
}

function logDebug(message: string): void {
  if (env.databaseInitLogging === 'verbose') {
    logger.debug(`[Insights DB] ${message}`);
  }
}

function logWarn(message: string): void {
  logger.warn(`[Insights DB] ${message}`);
}

function logError(message: string, error?: unknown): void {
  logger.error(`[Insights DB] ${message}`, error || '');
}

const connectionString = process.env.DATABASE_URL;
logDebug(`DATABASE_URL presence: ${!!connectionString}`);
if (connectionString) {
  // Only log partial connection string for debugging, never full string
  logDebug(`DATABASE_URL starts with: ${connectionString.substring(0, 20)}...`);
}


// Lazy-load pg to bypass Turbopack symlink errors on Windows at build-time
let poolInstance: any = null;

export function getInsightsPool() {
    if (poolInstance) return poolInstance;

    try {
        const { Pool } = eval('require("pg")');
        logInfo('Initializing new pool...');
        if (!connectionString) {
            logWarn('DATABASE_URL is missing. Insights DB operations will fail.');
            return null;
        }

        poolInstance = new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 2_000, // Reduced to 2 seconds for faster fallback
        });

        poolInstance.on('error', (err: any) => {
            logError('Unexpected error on idle client', err);
        });

        logInfo('Database pool initialized successfully');
        return poolInstance;
    } catch (err) {
        logError('Failed to initialize database pool (Check your pg installation)', err);
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

