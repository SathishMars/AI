// src/app/utils/langchain/providers/llm-factory.ts
import { ChatOpenAI, type OpenAIInput } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Enable detailed LLM logging by default during development when not explicitly set.
// This helps with debugging agent/tool behavior. If you want to disable it, set
// LLM_DETAILED_LOGGING=false in your environment.
// if (typeof process.env.LLM_DETAILED_LOGGING === 'undefined') {
//   process.env.LLM_DETAILED_LOGGING = 'true';
// }

// Logging control:
// - LLM_LOGGING: when 'true' enables basic informational logs from the LLM factory
// - LLM_DETAILED_LOGGING: when 'true' enables verbose debugging logs (implies LLM_LOGGING)
const LLM_DETAILED_LOGGING = (process.env.LLM_DETAILED_LOGGING ?? 'false') === 'true';
const LLM_LOGGING = (process.env.LLM_LOGGING ?? 'false') === 'true' || LLM_DETAILED_LOGGING;

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
  // provider-specific model kwargs (passed through to OpenAI/LM Studio clients)
  modelKwargs?: Record<string, unknown>;
}

export interface LLMModelConfig {
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
    workflow_edit: {
      model: process.env.OPENAI_MODEL_WORKFLOW || 'gpt-5-mini',
      temperature: 0.6,
      maxTokens: 4000,
      streaming: false
    },
    mermaid_generate: {
      model: process.env.OPENAI_MODEL_MERMAID || 'gpt-4',
      temperature: 0.6,
      maxTokens: 2000,
      streaming: false
    },
    conversation: {
      model: process.env.OPENAI_MODEL_CONVERSATION || 'gpt-4-turbo-preview',
      temperature: 0.6,
      maxTokens: 3000,
      streaming: false
    }
  },
  anthropic: {
    workflow_edit: {
      model: process.env.ANTHROPIC_MODEL_WORKFLOW || 'claude-3-5-sonnet-20240620',
      temperature: 0.6,
      maxTokens: 4000,
      streaming: false
    },
    mermaid_generate: {
      model: process.env.ANTHROPIC_MODEL_MERMAID || 'claude-3-haiku-20240307',
      temperature: 0.6,
      maxTokens: 2000,
      streaming: false
    },
    conversation: {
      model: process.env.ANTHROPIC_MODEL_CONVERSATION || 'claude-3-5-sonnet-20240620',
      temperature: 0.6,
      maxTokens: 3000,
      streaming: false
    }
  },
  lmstudio: {
    workflow_edit: {
      model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
      temperature: 0.6,
      maxTokens: 4000,
      streaming: false
    },
    mermaid_generate: {
      model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
      temperature: 0.6,
      maxTokens: 2000,
      streaming: false
    },
    conversation: {
      model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
      temperature: 0.6,
      maxTokens: 3000,
      streaming: false
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
      if (LLM_LOGGING) console.log(`Explicit default provider configured: ${explicitDefaultProvider}`);
    } else if (explicitDefaultProvider) {
      if (LLM_LOGGING) console.warn(`⚠️ Configured default provider '${explicitDefaultProvider}' is not available. Available providers: ${Array.from(this.availableProviders).join(', ')}`);
    }

    if (this.availableProviders.size === 0) {
      throw new Error(
        'No LLM providers available. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or LMSTUDIO_ENABLED=true environment variables.'
      );
    }

    if (LLM_LOGGING) console.log(`LLM Factory initialized with providers: ${Array.from(this.availableProviders).join(', ')}`);
    if (LLM_LOGGING) console.log(`Default provider: ${this.defaultProvider}`);
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

    // Small utility helpers for model-specific parameter handling
    const clamp = (v: number | undefined, min: number, max: number) => {
      if (typeof v !== 'number' || Number.isNaN(v)) return undefined;
      return Math.max(min, Math.min(max, v));
    };

    // Explicit per-model/provider rules (ordered: more-specific first)
    const modelRules: {
      id: string;
      pattern: RegExp;
      provider?: LLMProvider;
      useMaxCompletionTokens?: boolean;
      tempRange?: [number, number];
      // when set, temperature must be this exact value (override any supplied temperature)
      tempEnforceExact?: number;
    }[] = [
        // OpenAI GPT-5 family (need max_completion_tokens)
        // NOTE: some GPT-5 variants only accept the default temperature (1). Enforce exact 1 to avoid API errors.
        { id: 'openai:gpt-5-family', pattern: /(^|\W)gpt-5(\b|\W)|gpt-5-mini|gpt-5-nano|gpt-5-chat/i, provider: 'openai', useMaxCompletionTokens: true, tempEnforceExact: 1 },
        // OpenAI modern chat variants
        { id: 'openai:gpt-4-family', pattern: /gpt-(4(\.|\d)|4\.|4o|4\.1|4\.5|4o-mini|gpt-4o)/i, provider: 'openai', tempRange: [0, 2] },
        // OpenAI older/turbo family
        { id: 'openai:gpt-3.5-family', pattern: /gpt-3\.5|turbo/i, provider: 'openai', tempRange: [0, 2] },
        // Anthropic Claude 4 / Opus family
        { id: 'anthropic:claude-opus-4', pattern: /opus-4|claude-4|sonnet-4|opus-4-1/i, provider: 'anthropic', tempRange: [0, 1] },
        // Anthropic Claude 3 / Sonnet/Opus family
        { id: 'anthropic:claude-3-family', pattern: /claude-3|sonnet|opus|haiku|claude-3-5/i, provider: 'anthropic', tempRange: [0, 1] },
        // Fallback Anthropic rule
        { id: 'anthropic:default', pattern: /claude|anthropic/i, provider: 'anthropic', tempRange: [0, 1] }
      ];

    const findRulesFor = (prov: LLMProvider, modelName?: string) => {
      if (!modelName) return null;
      for (const r of modelRules) {
        if (r.provider && r.provider !== prov) continue;
        try {
          if (r.pattern.test(modelName)) return r;
        } catch {
          // ignore bad regex matches
        }
      }
      return null;
    };

    // Helper to build OpenAI-compatible options and translate parameters
    const buildOpenAIOptions = (
      cfg: Partial<LLMConfig> & { model?: string; temperature?: number; maxTokens?: number; streaming?: boolean },
      extra: { baseURL?: string; apiKey?: string; timeout?: number; maxRetries?: number } = {},
      optsHints: { useMaxCompletionTokens?: boolean; matchedRuleId?: string } = {}
    ): OpenAIInput => {
      // start with an object so we can merge provider-specific modelKwargs later
      const opts: Record<string, unknown> = {
        apiKey: (extra.apiKey || process.env.OPENAI_API_KEY) as string | undefined,
        model: cfg.model ?? modelConfig.model,
        temperature: cfg.temperature ?? modelConfig.temperature,
        streaming: cfg.streaming ?? modelConfig.streaming,
        timeout: extra.timeout ?? 30000,
        maxRetries: extra.maxRetries ?? 3,
        // CRITICAL: Force content to always be in array format for OpenAI v5 API compatibility
        // This ensures messages use [{type: 'text', text: '...'}] instead of plain strings
        modelKwargs: {}
      };

      // Newer OpenAI "gpt-5" family models expect 'max_completion_tokens' instead of 'max_tokens'.
      // LangChain's ChatOpenAI maps `maxTokens` -> `max_tokens` by default which will be rejected by those models.
      // To handle that, pass the value via `modelKwargs` using the API key expected param name.
      if (optsHints.useMaxCompletionTokens || (cfg.model && cfg.model.toLowerCase().includes('gpt-5'))) {
        (opts.modelKwargs as Record<string, unknown>).max_completion_tokens = cfg.maxTokens;
      } else {
        // Keep backwards-compatible top-level `maxTokens` for models that support it
        opts.maxTokens = cfg.maxTokens;
      }

      // Merge any provided modelKwargs from caller (do not overwrite keys already set above)
      if (cfg.modelKwargs && typeof cfg.modelKwargs === 'object') {
        Object.assign(opts.modelKwargs as Record<string, unknown>, cfg.modelKwargs);
      }

      // Attach custom base URL if provided (used by LM Studio)
      if (extra.baseURL) {
        opts.configuration = {
          baseURL: extra.baseURL
        };
      }

      // When detailed logging is enabled, show the matched rule id (if any) and final options
      if (LLM_DETAILED_LOGGING) {
        console.log(`LLM Factory - OpenAI options (rule=${optsHints.matchedRuleId ?? 'none'}):`, opts);
      }

      return opts as unknown as OpenAIInput;
    };

    // Enhanced logging when detailed logging is enabled
    if (LLM_DETAILED_LOGGING) {
      console.log(`Creating LLM model:
        - Provider: ${selectedProvider}
        - Task Type: ${taskType}
        - Model: ${config.model}
        - Temperature: ${config.temperature}
        - Max Tokens: ${config.maxTokens}
        - Streaming: ${config.streaming}
        - Timestamp: ${new Date().toISOString()}`);
    } else if (LLM_LOGGING) {
      console.log(`Using ${selectedProvider} (${config.model}) for ${taskType}`);
    }

    // Determine model-specific rules and apply transformations
    const effectiveRule = findRulesFor(selectedProvider, config.model);
    // Apply temperature rules. If a rule enforces an exact temperature, override the provided value.
    if (effectiveRule?.tempEnforceExact !== undefined) {
      if (config.temperature !== effectiveRule.tempEnforceExact) {
        if (LLM_DETAILED_LOGGING) {
          console.log(`LLM Factory: Overriding temperature ${config.temperature} -> ${effectiveRule.tempEnforceExact} for model=${config.model} due to rule=${effectiveRule.id}`);
        }
        config.temperature = effectiveRule.tempEnforceExact;
      }
    } else if (effectiveRule?.tempRange) {
      config.temperature = clamp(config.temperature, effectiveRule.tempRange[0], effectiveRule.tempRange[1]) ?? config.temperature;
    }

    switch (selectedProvider) {
      case 'openai': {
        // Translate parameters for specific OpenAI models when necessary
        const useMaxCompletion = !!effectiveRule?.useMaxCompletionTokens;
        if (LLM_DETAILED_LOGGING) console.log(`LLM Factory: matched rule=${effectiveRule?.id ?? 'none'} for model=${config.model}`);
        return new ChatOpenAI(buildOpenAIOptions(config, {}, { useMaxCompletionTokens: useMaxCompletion, matchedRuleId: effectiveRule?.id }));
      }

      case 'anthropic': {
        // Anthropic expects temperature in 0..1 (for many models); we applied clamp earlier if rule present
        if (LLM_DETAILED_LOGGING) console.log(`LLM Factory: matched rule=${effectiveRule?.id ?? 'none'} for model=${config.model}`);
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
      }

      case 'lmstudio':
        // LM Studio uses an OpenAI-compatible API. Translate parameters similarly to OpenAI.
        const baseURL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
        const apiKey = process.env.LMSTUDIO_API_KEY || 'lm-studio'; // LM Studio doesn't require real API key

        if (LLM_DETAILED_LOGGING) {
          console.log(`🏠 LM Studio Configuration:
            - Endpoint: ${baseURL}
            - API Key: ${apiKey}
            - Model: ${config.model}
            - Local Server: ${process.env.LMSTUDIO_ENABLED === 'true' ? 'Enabled' : 'Auto-detected'}`);
        }

        if (LLM_DETAILED_LOGGING) console.log(`LLM Factory: matched rule=${effectiveRule?.id ?? 'none'} for model=${config.model}`);
        return new ChatOpenAI(buildOpenAIOptions(config, { baseURL, apiKey, timeout: 60000, maxRetries: 2 }, { useMaxCompletionTokens: !!effectiveRule?.useMaxCompletionTokens, matchedRuleId: effectiveRule?.id }));

      default:
        throw new Error(`Unsupported LLM provider: ${selectedProvider}`);
    }
  }


  /**
   * Create a chat model for workflow editing
   */
  public createWorkflowEditModel(provider?: LLMProvider): BaseChatModel {
    // Use plain chat model so LangChain handles tool execution at the agent level
    return this.createChatModel(provider, 'workflow_edit');
  }

  /**
   * Create a chat model for Mermaid diagram generation
   */
  public createMermaidModel(provider?: LLMProvider): BaseChatModel {
    // Use plain chat model so LangChain handles tool execution at the agent level
    return this.createChatModel(provider, 'mermaid_generate');
  }

  /**
   * Create a chat model for conversation
   */
  public createConversationModel(provider?: LLMProvider): BaseChatModel {
    return this.createChatModel(provider, 'conversation');
  }

  /**
   * Create a chat model configured for tool/function calling (where supported).
   * This will merge any provided modelKwargs and set function calling defaults (e.g. function_call: 'auto')
   */
  public createToolEnabledChatModel(
    provider?: LLMProvider,
    taskType: keyof LLMModelConfig = 'conversation',
    customConfig?: Partial<LLMConfig>
  ): BaseChatModel {
    const cfg: Partial<LLMConfig> = { ...(customConfig || {}) };
    // Ensure function calling is enabled by default when supported by the model
    const incomingKwargs = (cfg.modelKwargs || {}) as Record<string, unknown>;
    // Only set function_call if functions are provided (OpenAI requires functions when using function_call)
    const hasFunctions = Array.isArray(incomingKwargs.functions) && (incomingKwargs.functions as unknown[]).length > 0;
    if (hasFunctions) {
      const functionCallSetting = typeof incomingKwargs.function_call === 'string' ? incomingKwargs.function_call : 'auto';
      cfg.modelKwargs = { ...incomingKwargs, function_call: functionCallSetting } as Record<string, unknown>;
    } else {
      // Do not include function_call if no functions provided
      cfg.modelKwargs = { ...incomingKwargs } as Record<string, unknown>;
    }
    return this.createChatModel(provider, taskType, cfg);
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
        if (LLM_LOGGING) console.warn(`Provider ${provider} health check failed:`, error);
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
 * Create a workflow editing model
 */
export function createWorkflowEditModel(provider?: LLMProvider): BaseChatModel {
  return getLLMFactory().createWorkflowEditModel(provider);
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