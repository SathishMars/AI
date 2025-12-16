/**
 * Server-side initialization module for database setup
 * This runs once during application startup (Next.js dev server or build server)
 */

import { initializeDatabaseSchema } from './database-initialization';
import { env } from '@/app/lib/env';

let initializationDone = false;

/**
 * Initialize database on server startup
 * Call this from layout.tsx or a server component
 */
export async function initializeServerOnStartup(): Promise<void> {
  // Only run once per process
  if (initializationDone) {
    return;
  }

  initializationDone = true;

  // Check if initialization is disabled for build server
  if (env.nodeEnv === 'production' && env.enableDbInitOnBuild !== 'true') {
    // In production, we can skip build-time initialization
    // but it will still run on first server startup
    return;
  }

  try {
    const result = await initializeDatabaseSchema();

    if (!result.success) {
      console.warn('[Server Init] Database initialization completed with errors');
    }
  } catch (error) {
    console.error('[Server Init] Failed to initialize database:', error);
    // Don't throw - allow server to start even if DB init fails
  }
}

export { type InitializationResult } from './database-initialization';
