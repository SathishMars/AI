export type AuthMode = 'embedded' | 'standalone';

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
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
  documentDBCaFilePath: string | undefined;
  mongoDbUri: string | undefined;
  
  // Database Initialization
  skipDbInit: string;
  databaseInitLogging: string;
  enableDbInitOnBuild: string;
  
  // Feature flags
  isDevelopment: boolean;
  isProduction: boolean;
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

function buildConfig(): EnvironmentConfig {
  const nodeEnv = getEnv('NODE_ENV', 'development');
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const railsBaseUrl = getEnv('NEXT_PUBLIC_RAILS_BASE_URL', 'http://groupize.local');
  
  const jwksUrl = `${railsBaseUrl}/.well-known/jwks.json`;
  const cookieName = getEnv('COOKIE_NAME', 'gpw_session');
  const basePath = getEnv('NEXT_PUBLIC_BASE_PATH', '/aime');
  const appUrl = getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  
  const anthropicApiKey = getOptionalEnv('ANTHROPIC_API_KEY');
  const anthropicModel = getEnv('ANTHROPIC_MODEL_WORKFLOW', 'claude-3-5-sonnet-20241022');
  
  const databaseEnvironment = getEnv('DATABASE_ENVIRONMENT', 'local');
  const documentDbUri = getOptionalEnv('DOCUMENTDB_URI');
  const documentDBCaFilePath = getOptionalEnv('DOCUMENTDB_CA_FILE_PATH');
  const mongoDbUri = getOptionalEnv('MONGODB_URI');
  
  const skipDbInit = getEnv('SKIP_DB_INIT', 'false');
  const databaseInitLogging = getEnv('DATABASE_INIT_LOGGING', isDevelopment ? 'verbose' : 'normal');
  const enableDbInitOnBuild = getEnv('ENABLE_DB_INIT_ON_BUILD', isDevelopment ? 'true' : 'false');
  
  return {
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
    documentDBCaFilePath,
    mongoDbUri,
    skipDbInit,
    databaseInitLogging,
    enableDbInitOnBuild,
    isDevelopment,
    isProduction,
  };
}

export const env = buildConfig();


