export type AuthMode = 'embedded' | 'standalone';

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  // Authentication
  authMode: AuthMode;
  
  // Rails/Backend URLs
  railsBaseUrl: string;
  jwksUrl: string; // Auto-derived from railsBaseUrl
  
  // Cookie configuration
  cookieName: string;
  
  // App configuration
  basePath: string;
  nodeEnv: string;
  appUrl: string;
  
  // AI/LLM Configuration
  anthropicApiKey: string | undefined;
  anthropicModel: string;
  
  // Database Configuration
  databaseEnvironment: string;
  documentDbUri: string | undefined;
  mongoDbUri: string | undefined;
  
  // Feature flags
  isDevelopment: boolean;
  isProduction: boolean;
  isStandalone: boolean;
}


function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get optional environment variable (returns undefined if not set)
 * Use for sensitive values like API keys that should not have defaults
 */
function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE?.toLowerCase();
  
  if (mode === 'standalone') {
    return 'standalone';
  }
  
  return 'embedded';
}

function buildConfig(): EnvironmentConfig {
  const nodeEnv = getEnv('NODE_ENV', 'development');
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const authMode = getAuthMode();
  const isStandalone = authMode === 'standalone';
  
  // Allow client-side access via NEXT_PUBLIC_ prefix, fallback to server-side env
  const railsBaseUrl = getEnv(
    'NEXT_PUBLIC_RAILS_BASE_URL',
    getEnv('RAILS_BASE_URL', isDevelopment ? 'http://groupize.local' : '')
  );
  
  const jwksUrl = `${railsBaseUrl}/.well-known/jwks.json`;
  const cookieName = getEnv('COOKIE_NAME', 'gpw_session');
  const basePath = getEnv('NEXT_PUBLIC_BASE_PATH', '/aime');
  const appUrl = getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'); // :3001 for embedded mode
  
  const anthropicApiKey = getOptionalEnv('ANTHROPIC_API_KEY');
  const anthropicModel = getEnv('ANTHROPIC_MODEL_WORKFLOW', 'claude-3-5-sonnet-20241022');
  
  const databaseEnvironment = getEnv('DATABASE_ENVIRONMENT', 'local');
  const documentDbUri = getOptionalEnv('DOCUMENTDB_URI');
  const mongoDbUri = getOptionalEnv('MONGODB_URI');
  
  return {
    authMode,
    railsBaseUrl,
    jwksUrl,
    cookieName,
    basePath,
    nodeEnv,
    appUrl,
    anthropicApiKey,
    anthropicModel,
    databaseEnvironment,
    documentDbUri,
    mongoDbUri,
    isDevelopment,
    isProduction,
    isStandalone,
  };
}

export const env = buildConfig();


