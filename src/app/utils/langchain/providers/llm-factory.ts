// src/app/utils/langchain/providers/llm-factory.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export type LLMProvider = 'openai' | 'anthropic' | 'lmstudio';

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  apiKey?: string;
  // LM Studio specific config
  baseURL?: string;
  endpoint?: string;
}

export interface LLMModelConfig {
  workflow_build: {
    model: string;
    temperature: number;
    maxTokens: number;
    streaming: boolean;
  };
  workflow_edit: {
    model: string;
    temperature: number;
    maxTokens: number;
    streaming: boolean;
  };
  mermaid_generate: {
    model: string;
    temperature: number;
    maxTokens: number;
    streaming: boolean;
  };
  conversation: {
    model: string;
    temperature: number;
    maxTokens: number;
    streaming: boolean;
  };
}

/**
 * Default model configurations for different LLM providers
 */
export const DEFAULT_MODEL_CONFIGS: Record<LLMProvider, LLMModelConfig> = {
  openai: {
    workflow_build: {
      model: process.env.OPENAI_MODEL_WORKFLOW || 'gpt-4-turbo-preview',
      temperature: 0.1,
      maxTokens: 4000,
      streaming: true
    },
    workflow_edit: {
      model: process.env.OPENAI_MODEL_WORKFLOW || 'gpt-4-turbo-preview',
      temperature: 0.1,
      maxTokens: 4000,
      streaming: true
    },
    mermaid_generate: {
      model: process.env.OPENAI_MODEL_MERMAID || 'gpt-4',
      temperature: 0.1,
      maxTokens: 2000,
      streaming: false
    },
    conversation: {
      model: process.env.OPENAI_MODEL_CONVERSATION || 'gpt-4-turbo-preview',
      temperature: 0.3,
      maxTokens: 3000,
      streaming: true
    }
  },
  anthropic: {
    workflow_build: {
      model: process.env.ANTHROPIC_MODEL_WORKFLOW || 'claude-3-5-sonnet-20240620',
      temperature: 0.1,
      maxTokens: 4000,
      streaming: true
    },
    workflow_edit: {
      model: process.env.ANTHROPIC_MODEL_WORKFLOW || 'claude-3-5-sonnet-20240620',
      temperature: 0.1,
      maxTokens: 4000,
      streaming: true
    },
    mermaid_generate: {
      model: process.env.ANTHROPIC_MODEL_MERMAID || 'claude-3-haiku-20240307',
      temperature: 0.1,
      maxTokens: 2000,
      streaming: false
    },
    conversation: {
      model: process.env.ANTHROPIC_MODEL_CONVERSATION || 'claude-3-5-sonnet-20240620',
      temperature: 0.3,
      maxTokens: 3000,
      streaming: true
    }
  },
  lmstudio: {
    workflow_build: {
      model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
      temperature: 0.1,
      maxTokens: 4000,
      streaming: true
    },
    workflow_edit: {
      model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
      temperature: 0.1,
      maxTokens: 4000,
      streaming: true
    },
    mermaid_generate: {
      model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
      temperature: 0.1,
      maxTokens: 2000,
      streaming: false
    },
    conversation: {
      model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
      temperature: 0.3,
      maxTokens: 3000,
      streaming: true
    }
  }
};

/**
 * Environment-based LLM configuration loader
 */
export class LLMFactory {
  private static instance: LLMFactory;
  private availableProviders: Set<LLMProvider> = new Set();
  private defaultProvider: LLMProvider | null = null;

  private constructor() {
    this.detectAvailableProviders();
  }

  public static getInstance(): LLMFactory {
    if (!LLMFactory.instance) {
      LLMFactory.instance = new LLMFactory();
    }
    return LLMFactory.instance;
  }

  /**
   * Detect which LLM providers are available based on environment variables
   */
  private detectAvailableProviders(): void {
    // Check for OpenAI API key
    if (process.env.OPENAI_API_KEY) {
      this.availableProviders.add('openai');
      if (!this.defaultProvider) {
        this.defaultProvider = 'openai';
      }
    }

    // Check for Anthropic API key
    if (process.env.ANTHROPIC_API_KEY) {
      this.availableProviders.add('anthropic');
      if (!this.defaultProvider) {
        this.defaultProvider = 'anthropic';
      }
    }

    // Check for LM Studio configuration
    if (process.env.LMSTUDIO_ENABLED === 'true' || process.env.LMSTUDIO_BASE_URL) {
      this.availableProviders.add('lmstudio');
      if (!this.defaultProvider) {
        this.defaultProvider = 'lmstudio';
      }
    }

    // Override default provider if explicitly configured
    const explicitDefaultProvider = process.env.DEFAULT_LLM_PROVIDER as LLMProvider;
    if (explicitDefaultProvider && this.availableProviders.has(explicitDefaultProvider)) {
      this.defaultProvider = explicitDefaultProvider;
      console.log(`🎯 Explicit default provider configured: ${explicitDefaultProvider}`);
    } else if (explicitDefaultProvider) {
      console.warn(`⚠️  Configured default provider '${explicitDefaultProvider}' is not available. Available providers: ${Array.from(this.availableProviders).join(', ')}`);
    }

    if (this.availableProviders.size === 0) {
      throw new Error(
        'No LLM providers available. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or LMSTUDIO_ENABLED=true environment variables.'
      );
    }

    console.log(`🤖 LLM Factory initialized with providers: ${Array.from(this.availableProviders).join(', ')}`);
    console.log(`🎯 Default provider: ${this.defaultProvider}`);
  }

  /**
   * Get available LLM providers
   */
  public getAvailableProviders(): LLMProvider[] {
    return Array.from(this.availableProviders);
  }

  /**
   * Get default LLM provider
   */
  public getDefaultProvider(): LLMProvider {
    if (!this.defaultProvider) {
      throw new Error('No default LLM provider available');
    }
    return this.defaultProvider;
  }

  /**
   * Create a chat model instance for a specific provider and task
   */
  public createChatModel(
    provider?: LLMProvider,
    taskType: keyof LLMModelConfig = 'conversation',
    customConfig?: Partial<LLMConfig>
  ): BaseChatModel {
    const selectedProvider = provider || this.getDefaultProvider();
    
    if (!this.availableProviders.has(selectedProvider)) {
      throw new Error(`Provider ${selectedProvider} is not available. Available providers: ${Array.from(this.availableProviders).join(', ')}`);
    }

    const modelConfig = DEFAULT_MODEL_CONFIGS[selectedProvider][taskType];
    const config = { ...modelConfig, ...customConfig };

    // Enhanced logging when detailed logging is enabled
    const isDetailedLogging = process.env.LLM_DETAILED_LOGGING === 'true';
    if (isDetailedLogging) {
      console.log(`🚀 Creating LLM model:
        📡 Provider: ${selectedProvider}
        🎯 Task Type: ${taskType}
        🤖 Model: ${config.model}
        🌡️  Temperature: ${config.temperature}
        📊 Max Tokens: ${config.maxTokens}
        🌊 Streaming: ${config.streaming}
        ⏱️  Timestamp: ${new Date().toISOString()}`);
    } else {
      console.log(`🤖 Using ${selectedProvider} (${config.model}) for ${taskType}`);
    }

    switch (selectedProvider) {
      case 'openai':
        return new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          streaming: config.streaming,
          timeout: 30000,
          maxRetries: 3
        });

      case 'anthropic':
        return new ChatAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          streaming: config.streaming,
          maxRetries: 3,
          // Anthropic client handles timeout internally
          clientOptions: {
            timeout: 30000
          }
        });

      case 'lmstudio':
        // LM Studio uses OpenAI-compatible API
        const baseURL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
        const apiKey = process.env.LMSTUDIO_API_KEY || 'lm-studio'; // LM Studio doesn't require real API key
        
        if (isDetailedLogging) {
          console.log(`🏠 LM Studio Configuration:
            🌐 Endpoint: ${baseURL}
            🔑 API Key: ${apiKey}
            📡 Model: ${config.model}
            ⚙️  Local Server: ${process.env.LMSTUDIO_ENABLED === 'true' ? 'Enabled' : 'Auto-detected'}`);
        }
        
        return new ChatOpenAI({
          apiKey: apiKey,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          streaming: config.streaming,
          timeout: 60000, // LM Studio might be slower
          maxRetries: 2,
          configuration: {
            baseURL: baseURL
          }
        });

      default:
        throw new Error(`Unsupported LLM provider: ${selectedProvider}`);
    }
  }

  /**
   * Create a chat model for workflow building
   */
  public createWorkflowBuildModel(provider?: LLMProvider): BaseChatModel {
    return this.createChatModel(provider, 'workflow_build');
  }

  /**
   * Create a chat model for workflow editing
   */
  public createWorkflowEditModel(provider?: LLMProvider): BaseChatModel {
    return this.createChatModel(provider, 'workflow_edit');
  }

  /**
   * Create a chat model for Mermaid diagram generation
   */
  public createMermaidModel(provider?: LLMProvider): BaseChatModel {
    return this.createChatModel(provider, 'mermaid_generate');
  }

  /**
   * Create a chat model for conversation
   */
  public createConversationModel(provider?: LLMProvider): BaseChatModel {
    return this.createChatModel(provider, 'conversation');
  }

  /**
   * Validate provider configuration
   */
  public validateProvider(provider: LLMProvider): boolean {
    switch (provider) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'anthropic':
        return !!process.env.ANTHROPIC_API_KEY;
      case 'lmstudio':
        return process.env.LMSTUDIO_ENABLED === 'true' || !!process.env.LMSTUDIO_BASE_URL;
      default:
        return false;
    }
  }

  /**
   * Get provider health status
   */
  public async getProviderHealth(): Promise<Record<LLMProvider, boolean>> {
    const health: Record<LLMProvider, boolean> = {} as Record<LLMProvider, boolean>;

    for (const provider of this.availableProviders) {
      try {
        const model = this.createChatModel(provider, 'conversation');
        // Simple health check with minimal token usage
        await model.invoke("Hi");
        health[provider] = true;
      } catch (error) {
        console.warn(`Provider ${provider} health check failed:`, error);
        health[provider] = false;
      }
    }

    return health;
  }
}

/**
 * Convenience functions for quick access
 */

/**
 * Get the default LLM factory instance
 */
export function getLLMFactory(): LLMFactory {
  return LLMFactory.getInstance();
}

/**
 * Create a chat model with default provider
 */
export function createDefaultChatModel(taskType: keyof LLMModelConfig = 'conversation'): BaseChatModel {
  return getLLMFactory().createChatModel(undefined, taskType);
}

/**
 * Create a workflow building model
 */
export function createWorkflowBuildModel(provider?: LLMProvider): BaseChatModel {
  return getLLMFactory().createWorkflowBuildModel(provider);
}

/**
 * Create a conversation model
 */
export function createConversationModel(provider?: LLMProvider): BaseChatModel {
  return getLLMFactory().createConversationModel(provider);
}

/**
 * Create a Mermaid generation model
 */
export function createMermaidModel(provider?: LLMProvider): BaseChatModel {
  return getLLMFactory().createMermaidModel(provider);
}