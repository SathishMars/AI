/**
 * Environment-aware logging utility
 * 
 * Usage:
 *   import { logger } from '@/app/lib/logger';
 *   
 *   logger.debug('Debug message');        // Only in development or when DEBUG=true
 *   logger.info('Info message');          // Only in development
 *   logger.warn('Warning message');       // Always logged
 *   logger.error('Error message');       // Always logged
 * 
 * NOTE: This file intentionally uses console.log/console.warn/console.error internally.
 * This is the logging abstraction layer - console statements here are intentional and necessary.
 * Other files should use this logger instead of direct console calls.
 */

// Next.js automatically sets NODE_ENV in dev mode, but handle undefined as development
const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv === 'development';
const isDebug = process.env.DEBUG === 'true';
const isProduction = nodeEnv === 'production';

// Feature-specific debug flags
const DEBUG_FLAGS = {
  GRAPHQL: process.env.DEBUG_GRAPHQL === 'true',
  UI_ACTIONS: process.env.DEBUG_UI_ACTIONS === 'true',
  QUERIES: process.env.DEBUG_QUERIES === 'true',
  SCOPE_DETECTION: process.env.DEBUG_SCOPE_DETECTION === 'true',
  RESPONSE_BUILDING: process.env.DEBUG_RESPONSE_BUILDING === 'true',
  MIDDLEWARE: process.env.DEBUG_MIDDLEWARE === 'true',
  SQL: process.env.DEBUG_SQL === 'true',
};

/**
 * Logger utility with environment-aware logging
 */
export const logger = {
  /**
   * Debug logs - only shown in development or when DEBUG=true
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDevelopment || isDebug) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Feature-specific debug logs
   * Use for feature-specific debugging
   */
  debugGraphQL: (...args: any[]) => {
    if (isDevelopment || isDebug || DEBUG_FLAGS.GRAPHQL) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG GraphQL]', ...args);
    }
  },

  debugUIActions: (...args: any[]) => {
    if (isDevelopment || isDebug || DEBUG_FLAGS.UI_ACTIONS) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG UI Actions]', ...args);
    }
  },

  debugQueries: (...args: any[]) => {
    if (isDevelopment || isDebug || DEBUG_FLAGS.QUERIES) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG Queries]', ...args);
    }
  },

  debugScope: (...args: any[]) => {
    if (isDevelopment || isDebug || DEBUG_FLAGS.SCOPE_DETECTION) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG Scope]', ...args);
    }
  },

  debugResponse: (...args: any[]) => {
    if (isDevelopment || isDebug || DEBUG_FLAGS.RESPONSE_BUILDING) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG Response]', ...args);
    }
  },

  debugMiddleware: (...args: any[]) => {
    if (isDevelopment || isDebug || DEBUG_FLAGS.MIDDLEWARE) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG Middleware]', ...args);
    }
  },

  debugSQL: (...args: any[]) => {
    if (isDevelopment || isDebug || DEBUG_FLAGS.SQL) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG SQL]', ...args);
    }
  },

  /**
   * Info logs - only shown in development
   * Use for informational messages
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Warning logs - always shown
   * Use for warnings that should be visible in production
   */
  warn: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs - always shown
   * Use for errors that must be logged in production
   */
  error: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...args);
  },

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled: () => isDevelopment || isDebug,

  /**
   * Check if production mode
   */
  isProduction: () => isProduction,

  /**
   * Diagnostic function - logs current logger state
   * Use this to troubleshoot why logs aren't showing
   */
  diagnostic: () => {
    // eslint-disable-next-line no-console
    console.log('=== LOGGER DIAGNOSTIC ===');
    // eslint-disable-next-line no-console
    console.log('NODE_ENV:', process.env.NODE_ENV || '(undefined - defaults to development)');
    // eslint-disable-next-line no-console
    console.log('isDevelopment:', isDevelopment);
    // eslint-disable-next-line no-console
    console.log('isDebug:', isDebug);
    // eslint-disable-next-line no-console
    console.log('isProduction:', isProduction);
    // eslint-disable-next-line no-console
    console.log('DEBUG flags:', DEBUG_FLAGS);
    // eslint-disable-next-line no-console
    console.log('Debug enabled:', isDevelopment || isDebug);
    // eslint-disable-next-line no-console
    console.log('========================');
  },
};

/**
 * Legacy console.log wrapper for gradual migration
 * Use this when you want to keep console.log but gate it
 */
export const logIfDev = (...args: any[]) => {
  if (isDevelopment || isDebug) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

/**
 * Log with prefix (useful for feature-specific logging)
 */
export const logWithPrefix = (prefix: string, ...args: any[]) => {
  if (isDevelopment || isDebug) {
    // eslint-disable-next-line no-console
    console.log(`[${prefix}]`, ...args);
  }
};
