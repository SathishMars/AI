/**
 * Environment Configuration
 * 
 * Centralized environment variable management with type safety and validation.
 * Supports both embedded (Rails proxy) and standalone (dev mock) modes.
 */

/**
 * Authentication mode
 */
export type AuthMode = 'embedded' | 'mock';

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  // Authentication
  authMode: AuthMode;
  
  // Rails/Backend URLs
  railsBaseUrl: string;
  jwksUrl: string;
  
  // JWT Configuration
  jwtIssuer: string;
  jwtAudience: string;
  jwtSecret?: string;  // Only used in dev mock mode with HS256
  
  // Cookie configuration
  cookieName: string;
  
  // App configuration
  basePath: string;
  nodeEnv: string;
  
  // Feature flags
  isDevelopment: boolean;
  isProduction: boolean;
  isMockMode: boolean;
}

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get required environment variable (throws if missing)
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Determine authentication mode from environment
 */
function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE?.toLowerCase();
  
  if (mode === 'mock') {
    return 'mock';
  }
  
  // Default to embedded mode
  return 'embedded';
}

/**
 * Build environment configuration
 */
function buildConfig(): EnvironmentConfig {
  const nodeEnv = getEnv('NODE_ENV', 'development');
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const authMode = getAuthMode();
  const isMockMode = authMode === 'mock';
  
  const railsBaseUrl = getEnv(
    'RAILS_BASE_URL',
    isDevelopment ? 'http://127.0.0.1' : ''
  );
  
  // JWKS endpoint
  const jwksUrl = getEnv(
    'JWKS_URL',
    `${railsBaseUrl}/api/v1/.well-known/jwks.json`
  );
  
  // JWT configuration
  const jwtIssuer = getEnv('JWT_ISSUER', 'groupize');
  const jwtAudience = getEnv('JWT_AUDIENCE', 'workflows');
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';
  
  // Cookie name (must match Rails)
  const cookieName = getEnv('COOKIE_NAME', 'gpw_session');
  
  // App configuration
  const basePath = getEnv('BASE_PATH', '/aime/aimeworkflows');
  
  return {
    authMode,
    railsBaseUrl,
    jwksUrl,
    jwtIssuer,
    jwtAudience,
    jwtSecret: isMockMode ? jwtSecret : undefined,
    cookieName,
    basePath,
    nodeEnv,
    isDevelopment,
    isProduction,
    isMockMode,
  };
}

/**
 * Environment configuration singleton
 */
export const env = buildConfig();

/**
 * Log environment configuration (for debugging)
 */
export function logEnvConfig(): void {
  if (env.isDevelopment) {
    console.log('[ENV] Configuration:', {
      authMode: env.authMode,
      railsBaseUrl: env.railsBaseUrl,
      jwksUrl: env.jwksUrl,
      jwtIssuer: env.jwtIssuer,
      jwtAudience: env.jwtAudience,
      cookieName: env.cookieName,
      basePath: env.basePath,
      nodeEnv: env.nodeEnv,
      isMockMode: env.isMockMode,
    });
  }
}

