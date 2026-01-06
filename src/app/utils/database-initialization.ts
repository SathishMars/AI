/**
 * Database Initialization Utility
 * 
 * Automatically initializes required database objects (collections and indexes)
 * on application startup based on version-numbered migration scripts.
 * 
 * Features:
 * - Discovers and executes version scripts from migration registry
 * - Tracks applied versions in databaseVersionHistory collection
 * - Idempotent: safe to run multiple times
 * - Non-blocking: initialization errors don't prevent app startup
 */

import { Db } from 'mongodb';
import { getMongoDatabase } from './mongodb-connection';
import { sortVersions, isValidVersion } from './version-comparison';
import { env } from '@/app/lib/env';

interface MigrationModule {
  migrate(db: Db): Promise<{ success: boolean; details: any }>;
}

interface VersionHistoryRecord {
  version: string;
  appliedAt: string;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  duration: number;
}

interface InitializationResult {
  success: boolean;
  appliedVersions: string[];
  skippedVersions: string[];
  failedVersions: string[];
  errors: string[];
  duration: number;
}

/**
 * Migration Registry
 * Import migration modules here and register them
 */
async function getMigrationRegistry(): Promise<Map<string, MigrationModule>> {
  const migrations = new Map<string, MigrationModule>();

  // Dynamically import all migration modules
  try {
    const v1_0_0 = await import('@/db-init-scripts/v1.0.0');
    migrations.set('1.0.0', v1_0_0);
  } catch (error) {
    logWarn(`Failed to load migration 1.0.0: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return migrations;
}

// Singleton to ensure initialization runs only once per process
let initializationPromise: Promise<InitializationResult> | null = null;
let hasInitialized = false;

/**
 * Initialize the database schema
 * Discovers and applies version scripts in order
 * @returns Initialization result
 */
export async function initializeDatabaseSchema(): Promise<InitializationResult> {
  // Return cached promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return early if already initialized
  if (hasInitialized) {
    return {
      success: true,
      appliedVersions: [],
      skippedVersions: [],
      failedVersions: [],
      errors: [],
      duration: 0,
    };
  }

  // Create the promise and cache it
  initializationPromise = performInitialization();

  try {
    const result = await initializationPromise;
    if (result.success) {
      hasInitialized = true;
    }
    return result;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Perform the actual initialization
 */
async function performInitialization(): Promise<InitializationResult> {
  const startTime = Date.now();
  const result: InitializationResult = {
    success: true,
    appliedVersions: [],
    skippedVersions: [],
    failedVersions: [],
    errors: [],
    duration: 0,
  };

  try {
    // Check if initialization is disabled
    if (env.skipDbInit === 'true') {
      logInfo('Database initialization disabled via SKIP_DB_INIT');
      return result;
    }

    // Verify database connection
    const db = await getMongoDatabase();
    logInfo('Database connection established');

    // Create version history collection if needed
    await ensureVersionHistoryCollection(db);

    // Get migration registry
    const migrations = await getMigrationRegistry();
    const versions = Array.from(migrations.keys());
    logInfo(`Found ${versions.length} migration scripts`);

    if (versions.length === 0) {
      logWarn('No migration scripts found in registry');
      return result;
    }

    // Get already applied versions
    const appliedVersions = await getAppliedVersions(db);
    logDebug(`Already applied versions: ${appliedVersions.join(', ') || 'none'}`);

    // Sort versions and apply in order
    const sortedVersions = sortVersions(versions);

    for (const version of sortedVersions) {
      if (appliedVersions.includes(version)) {
        logDebug(`Skipping already applied version: ${version}`);
        result.skippedVersions.push(version);
        continue;
      }

      try {
        logInfo(`Applying version: ${version}`);
        const versionStartTime = Date.now();

        // Get migration module from registry
        const migrationModule = migrations.get(version);
        if (!migrationModule) {
          throw new Error(`Migration module for version ${version} not found in registry`);
        }

        const migrationResult = await migrationModule.migrate(db);

        const duration = Date.now() - versionStartTime;
        logInfo(
          `Version ${version} completed in ${duration}ms. ` +
          `Collections: ${migrationResult.details.collectionsCreated.length} created, ${migrationResult.details.collectionsSkipped.length} skipped. ` +
          `Indexes: ${migrationResult.details.indexesCreated.length} created, ${migrationResult.details.indexesSkipped.length} skipped.`
        );

        // Record successful application
        await recordVersionHistory(db, {
          version,
          appliedAt: new Date().toISOString(),
          status: 'success',
          duration,
        });

        result.appliedVersions.push(version);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError(`Failed to apply version ${version}: ${errorMessage}`);

        // Record failed application
        await recordVersionHistory(db, {
          version,
          appliedAt: new Date().toISOString(),
          status: 'failed',
          errorMessage,
          duration: Date.now() - startTime,
        });

        result.failedVersions.push(version);
        result.errors.push(`Version ${version}: ${errorMessage}`);

        // Continue to next version (non-blocking)
        continue;
      }
    }

    result.success = result.failedVersions.length === 0;
    result.duration = Date.now() - startTime;

    const summary =
      `Database initialization completed in ${result.duration}ms. ` +
      `Applied: ${result.appliedVersions.length}, ` +
      `Skipped: ${result.skippedVersions.length}, ` +
      `Failed: ${result.failedVersions.length}`;

    if (result.success) {
      logInfo(summary);
    } else {
      logError(summary);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.success = false;
    result.errors.push(`Critical initialization error: ${errorMessage}`);
    result.duration = Date.now() - startTime;
    logError(`Critical initialization error: ${errorMessage}`);
    return result;
  }
}

/**
 * Ensure databaseVersionHistory collection exists
 */
async function ensureVersionHistoryCollection(db: Db): Promise<void> {
  const collections = await db.listCollections().toArray();
  const historyCollectionExists = collections.some((c) => c.name === 'databaseVersionHistory');

  if (!historyCollectionExists) {
    await db.createCollection('databaseVersionHistory');
    logDebug('Created databaseVersionHistory collection');

    // Create index on version for fast lookups
    const collection = db.collection('databaseVersionHistory');
    await collection.createIndex({ version: 1 }, { unique: true });
    logDebug('Created index on databaseVersionHistory.version');
  }
}

/**
 * Get list of already applied versions
 */
async function getAppliedVersions(db: Db): Promise<string[]> {
  const collection = db.collection<VersionHistoryRecord>('databaseVersionHistory');
  const records = await collection
    .find({ status: 'success' })
    .project({ version: 1 })
    .toArray();

  return records.map((r) => r.version);
}

/**
 * Record version application in history
 */
async function recordVersionHistory(
  db: Db,
  record: VersionHistoryRecord
): Promise<void> {
  const collection = db.collection<VersionHistoryRecord>('databaseVersionHistory');

  try {
    await collection.updateOne({ version: record.version }, { $set: record }, { upsert: true });
  } catch (error) {
    logWarn(`Failed to record version history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Logging utilities
 */
function logInfo(message: string): void {
  if (env.databaseInitLogging === 'verbose' || env.nodeEnv !== 'production') {
    console.log(`[DB Init] ${message}`);
  }
}

function logDebug(message: string): void {
  if (env.databaseInitLogging === 'verbose') {
    console.debug(`[DB Init] ${message}`);
  }
}

function logWarn(message: string): void {
  console.warn(`[DB Init] ${message}`);
}

function logError(message: string): void {
  console.error(`[DB Init] ${message}`);
}

export type { InitializationResult, VersionHistoryRecord };
