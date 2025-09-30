// src/app/utils/llm/llm-config.ts
import { createMultiLLMManager } from './multi-llm-manager';

/**
 * Environment-based LLM configuration management
 * Provides secure API key handling and provider configuration
 */

export interface LLMEnvironmentConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  enabledProviders: ('openai' | 'anthropic')[];
  defaultProvider?: 'openai' | 'anthropic';
  rateLimits?: {
    openai?: { requestsPerMinute: number; tokensPerMinute: number; };
    anthropic?: { requestsPerMinute: number; tokensPerMinute: number; };
  };
}

/**
 * Load LLM configuration from environment variables
 */
export function loadLLMConfigFromEnv(): LLMEnvironmentConfig {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  
  const enabledProviders: ('openai' | 'anthropic')[] = [];
  if (openaiApiKey) enabledProviders.push('openai');
  if (anthropicApiKey) enabledProviders.push('anthropic');
  
  if (enabledProviders.length === 0) {
    throw new Error('No LLM provider API keys found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.');
  }
  
  // Default to OpenAI if available, otherwise Anthropic
  const defaultProvider = enabledProviders.includes('openai') ? 'openai' : 'anthropic';
  
  return {
    openaiApiKey,
    anthropicApiKey,
    enabledProviders,
    defaultProvider,
    rateLimits: {
      openai: {
        requestsPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_RPM || '60'),
        tokensPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_TPM || '150000')
      },
      anthropic: {
        requestsPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_RPM || '50'),
        tokensPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_TPM || '100000')
      }
    }
  };
}

/**
 * Create a configured MultiLLMManager from environment
 */
export function createLLMManagerFromEnv() {
  const config = loadLLMConfigFromEnv();
  return createMultiLLMManager(config.openaiApiKey, config.anthropicApiKey);
}

/**
 * Development-only configuration with mock API keys
 * Use this for testing and development when API keys are not available
 */
export function createMockLLMManager() {
  console.warn('Creating mock LLM manager for development. Real API calls will fail.');
  
  // Use placeholder API keys for development
  const mockOpenAIKey = 'sk-mock-openai-key-for-development';
  const mockAnthropicKey = 'sk-ant-mock-anthropic-key-for-development';
  
  try {
    return createMultiLLMManager(mockOpenAIKey, mockAnthropicKey);
  } catch (error) {
    console.error('Failed to create mock LLM manager:', error);
    throw new Error('LLM manager creation failed. Check configuration.');
  }
}

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(key: string, provider: 'openai' | 'anthropic'): boolean {
  if (!key || typeof key !== 'string') return false;
  
  switch (provider) {
    case 'openai':
      return key.startsWith('sk-') && key.length > 40;
    case 'anthropic':
      return key.startsWith('sk-ant-') && key.length > 40;
    default:
      return false;
  }
}

/**
 * Check if any LLM providers are configured
 */
export function hasLLMProviders(): boolean {
  try {
    const config = loadLLMConfigFromEnv();
    return config.enabledProviders.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get available provider information
 */
export function getAvailableProviders(): {
  openai: boolean;
  anthropic: boolean;
  count: number;
} {
  const openaiAvailable = !!process.env.OPENAI_API_KEY && 
    validateApiKey(process.env.OPENAI_API_KEY, 'openai');
  const anthropicAvailable = !!process.env.ANTHROPIC_API_KEY && 
    validateApiKey(process.env.ANTHROPIC_API_KEY, 'anthropic');
  
  return {
    openai: openaiAvailable,
    anthropic: anthropicAvailable,
    count: (openaiAvailable ? 1 : 0) + (anthropicAvailable ? 1 : 0)
  };
}