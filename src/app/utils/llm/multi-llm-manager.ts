// src/app/utils/llm/multi-llm-manager.ts
import {
  LLMProvider,
  LLMConfig,
  WorkflowContext,
  AITaskType,
  LLMStreamChunk,
  ResponseType,
  HealthStatus,
  LLMProviderType,
  ValidationError as LLMValidationError,
  AccuracyTestResult
} from '@/app/types/llm';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';

interface ProviderSelection {
  primary: LLMProvider;
  fallback?: LLMProvider;
  reason: string;
}

export class MultiLLMManager {
  private providers: Map<LLMProviderType, LLMProvider> = new Map();
  private healthStatus: Map<LLMProviderType, HealthStatus> = new Map();
  private accuracyScores: Map<LLMProviderType, Map<AITaskType, number>> = new Map();
  private lastHealthCheck: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(private configs: Map<LLMProviderType, LLMConfig>) {
    this.initializeProviders();
  }

  private initializeProviders() {
    for (const [providerType, config] of this.configs) {
      let provider: LLMProvider;
      
      switch (providerType) {
        case 'openai':
          provider = new OpenAIProvider(config);
          break;
        case 'anthropic':
          provider = new AnthropicProvider(config);
          break;
        default:
          throw new Error(`Unsupported provider type: ${providerType}`);
      }
      
      this.providers.set(providerType, provider);
      this.accuracyScores.set(providerType, new Map());
    }
  }

  async* generateWorkflow(
    prompt: string,
    context: WorkflowContext,
    preferredProvider?: LLMProviderType
  ): AsyncGenerator<LLMStreamChunk, WorkflowJSON> {
    const selection = await this.selectProvider('workflow_build', preferredProvider);
    
    try {
      // Try primary provider
      const result = yield* selection.primary.generateWorkflow(prompt, context);
      return result;
    } catch (error) {
      console.error(`Primary provider ${selection.primary.name} failed:`, error);
      
      // Try fallback if available
      if (selection.fallback) {
        console.log(`Falling back to ${selection.fallback.name}`);
        const result = yield* selection.fallback.generateWorkflow(prompt, context);
        return result;
      } else {
        throw error;
      }
    }
  }

  async* editWorkflow(
    workflow: WorkflowJSON,
    editPrompt: string,
    context: WorkflowContext,
    preferredProvider?: LLMProviderType
  ): AsyncGenerator<LLMStreamChunk, WorkflowJSON> {
    const selection = await this.selectProvider('workflow_edit', preferredProvider);
    
    try {
      const result = yield* selection.primary.editWorkflow(workflow, editPrompt, context);
      return result;
    } catch (error) {
      console.error(`Primary provider ${selection.primary.name} failed:`, error);
      
      if (selection.fallback) {
        console.log(`Falling back to ${selection.fallback.name}`);
        const result = yield* selection.fallback.editWorkflow(workflow, editPrompt, context);
        return result;
      } else {
        throw error;
      }
    }
  }

  async* generateMermaid(
    workflow: WorkflowJSON,
    context: WorkflowContext,
    preferredProvider?: LLMProviderType
  ): AsyncGenerator<LLMStreamChunk, string> {
    const selection = await this.selectProvider('mermaid_generate', preferredProvider);
    
    try {
      const result = yield* selection.primary.generateMermaid(workflow, context);
      return result;
    } catch (error) {
      console.error(`Primary provider ${selection.primary.name} failed:`, error);
      
      if (selection.fallback) {
        console.log(`Falling back to ${selection.fallback.name}`);
        const result = yield* selection.fallback.generateMermaid(workflow, context);
        return result;
      } else {
        throw error;
      }
    }
  }

  async* handleMRFChat(
    message: string,
    context: WorkflowContext,
    preferredProvider?: LLMProviderType
  ): AsyncGenerator<LLMStreamChunk, string> {
    const selection = await this.selectProvider('mrf_chat', preferredProvider);
    
    try {
      const result = yield* selection.primary.handleMRFChat(message, context);
      return result;
    } catch (error) {
      console.error(`Primary provider ${selection.primary.name} failed:`, error);
      
      if (selection.fallback) {
        console.log(`Falling back to ${selection.fallback.name}`);
        const result = yield* selection.fallback.handleMRFChat(message, context);
        return result;
      } else {
        throw error;
      }
    }
  }

  async* explainValidationErrors(
    errors: LLMValidationError[],
    context: WorkflowContext,
    preferredProvider?: LLMProviderType
  ): AsyncGenerator<LLMStreamChunk, string> {
    const selection = await this.selectProvider('validation_explain', preferredProvider);
    
    try {
      const result = yield* selection.primary.explainValidationErrors(errors, context);
      return result;
    } catch (error) {
      console.error(`Primary provider ${selection.primary.name} failed:`, error);
      
      if (selection.fallback) {
        console.log(`Falling back to ${selection.fallback.name}`);
        const result = yield* selection.fallback.explainValidationErrors(errors, context);
        return result;
      } else {
        throw error;
      }
    }
  }

  async validateResponse(
    response: string,
    expectedType: ResponseType,
    providerType?: LLMProviderType
  ): Promise<ValidationResult> {
    let provider: LLMProvider | undefined;
    
    if (providerType) {
      provider = this.providers.get(providerType);
    } else {
      // Use the synchronous getBestProvider method 
      provider = this.getBestProvider('workflow_build');
    }
    
    if (!provider) {
      throw new Error('No available provider for validation');
    }
    
    return provider.validateResponse(response, expectedType);
  }

  async getOverallHealth(): Promise<Map<LLMProviderType, HealthStatus>> {
    await this.checkAllProvidersHealth();
    return new Map(this.healthStatus);
  }

  async getBestProviderForTask(taskType: AITaskType): Promise<LLMProviderType> {
    await this.ensureHealthCheck();
    
    // Get healthy providers
    const healthyProviders = Array.from(this.providers.keys()).filter(
      providerType => this.healthStatus.get(providerType)?.status === 'healthy'
    );
    
    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }
    
    // If only one provider is healthy, use it
    if (healthyProviders.length === 1) {
      return healthyProviders[0];
    }
    
    // Select based on accuracy scores
    let bestProvider = healthyProviders[0];
    let bestScore = this.getAccuracyScore(healthyProviders[0], taskType);
    
    for (const providerType of healthyProviders.slice(1)) {
      const score = this.getAccuracyScore(providerType, taskType);
      if (score > bestScore) {
        bestScore = score;
        bestProvider = providerType;
      }
    }
    
    return bestProvider;
  }

  async runAccuracyTest(
    testCases: Array<{
      prompt: string;
      expectedType: ResponseType;
      context: WorkflowContext;
      taskType: AITaskType;
    }>,
    providerType?: LLMProviderType
  ): Promise<AccuracyTestResult[]> {
    const providers = providerType 
      ? [this.providers.get(providerType)!]
      : Array.from(this.providers.values());
    
    const results: AccuracyTestResult[] = [];
    
    for (const provider of providers) {
      let correctResponses = 0;
      const testResults = [];
      
      for (const testCase of testCases) {
        const startTime = Date.now();
        
        try {
          let response = '';
          
          // Collect full response from stream
          switch (testCase.taskType) {
            case 'workflow_build':
              for await (const chunk of provider.generateWorkflow(testCase.prompt, testCase.context)) {
                response += chunk.content;
              }
              break;
            case 'mrf_chat':
              for await (const chunk of provider.handleMRFChat(testCase.prompt, testCase.context)) {
                response += chunk.content;
              }
              break;
            // Add other task types as needed
          }
          
          const validation = provider.validateResponse(response, testCase.expectedType);
          const isCorrect = validation.isValid;
          
          if (isCorrect) correctResponses++;
          
          testResults.push({
            prompt: testCase.prompt,
            response,
            isCorrect,
            responseTime: Date.now() - startTime,
            validationResult: validation
          });
          
        } catch (error) {
          testResults.push({
            prompt: testCase.prompt,
            response: '',
            isCorrect: false,
            responseTime: Date.now() - startTime,
            error: String(error)
          });
        }
      }
      
      const accuracy = testCases.length > 0 ? correctResponses / testCases.length : 0;
      
      // Update accuracy scores
      const providerScores = this.accuracyScores.get(provider.name) || new Map();
      for (const testCase of testCases) {
        providerScores.set(testCase.taskType, accuracy);
      }
      this.accuracyScores.set(provider.name, providerScores);
      
      results.push({
        provider: provider.name,
        accuracy,
        totalTests: testCases.length,
        correctResponses,
        averageResponseTime: testResults.reduce((sum, r) => sum + r.responseTime, 0) / testResults.length,
        testResults,
        timestamp: new Date()
      });
    }
    
    return results;
  }

  getProviderMetrics(providerType: LLMProviderType) {
    const health = this.healthStatus.get(providerType);
    const accuracyScores = this.accuracyScores.get(providerType);
    
    return {
      health,
      accuracyScores: accuracyScores ? Object.fromEntries(accuracyScores) : {},
      isAvailable: health?.status === 'healthy'
    };
  }

  // Private helper methods
  private async selectProvider(
    taskType: AITaskType, 
    preferredProvider?: LLMProviderType
  ): Promise<ProviderSelection> {
    await this.ensureHealthCheck();
    
    // If a specific provider is requested and healthy, use it
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      const health = this.healthStatus.get(preferredProvider);
      
      if (provider && health?.status === 'healthy') {
        const fallback = this.findBestFallback(preferredProvider, taskType);
        return {
          primary: provider,
          fallback,
          reason: `User-preferred provider: ${preferredProvider}`
        };
      }
    }
    
    // Select the best available provider
    const primaryProviderType = await this.getBestProviderForTask(taskType);
    const primaryProvider = this.providers.get(primaryProviderType)!;
    const fallbackProvider = this.findBestFallback(primaryProviderType, taskType);
    
    return {
      primary: primaryProvider,
      fallback: fallbackProvider,
      reason: `Best provider for ${taskType}: ${primaryProviderType}`
    };
  }

  private findBestFallback(
    excludeProvider: LLMProviderType, 
    taskType: AITaskType
  ): LLMProvider | undefined {
    const healthyProviders = Array.from(this.providers.keys()).filter(
      providerType => 
        providerType !== excludeProvider && 
        this.healthStatus.get(providerType)?.status === 'healthy'
    );
    
    if (healthyProviders.length === 0) {
      return undefined;
    }
    
    // Find the best fallback based on accuracy
    let bestProvider = healthyProviders[0];
    let bestScore = this.getAccuracyScore(healthyProviders[0], taskType);
    
    for (const providerType of healthyProviders.slice(1)) {
      const score = this.getAccuracyScore(providerType, taskType);
      if (score > bestScore) {
        bestScore = score;
        bestProvider = providerType;
      }
    }
    
    return this.providers.get(bestProvider);
  }

  private getBestProvider(taskType: AITaskType): LLMProvider {
    const healthyProviders = Array.from(this.providers.keys()).filter(
      providerType => this.healthStatus.get(providerType)?.status === 'healthy'
    );
    
    if (healthyProviders.length === 0) {
      // Return first available provider as last resort
      return Array.from(this.providers.values())[0];
    }
    
    // Find provider with best accuracy for this task
    let bestProvider = healthyProviders[0];
    let bestScore = this.getAccuracyScore(healthyProviders[0], taskType);
    
    for (const providerType of healthyProviders.slice(1)) {
      const score = this.getAccuracyScore(providerType, taskType);
      if (score > bestScore) {
        bestScore = score;
        bestProvider = providerType;
      }
    }
    
    return this.providers.get(bestProvider)!;
  }

  private getAccuracyScore(providerType: LLMProviderType, taskType: AITaskType): number {
    const providerScores = this.accuracyScores.get(providerType);
    return providerScores?.get(taskType) || 0.5; // Default to neutral score
  }

  private async ensureHealthCheck() {
    const now = Date.now();
    if (now - this.lastHealthCheck > this.HEALTH_CHECK_INTERVAL) {
      await this.checkAllProvidersHealth();
      this.lastHealthCheck = now;
    }
  }

  private async checkAllProvidersHealth() {
    const healthChecks = Array.from(this.providers.entries()).map(
      async ([providerType, provider]) => {
        try {
          const health = await provider.getHealth();
          this.healthStatus.set(providerType, health);
        } catch (error) {
          this.healthStatus.set(providerType, {
            provider: providerType,
            status: 'unavailable',
            responseTime: 0,
            errorRate: 1,
            lastCheck: new Date(),
            details: { error: String(error) }
          });
        }
      }
    );
    
    await Promise.all(healthChecks);
  }
}

// Factory function to create MultiLLMManager with default configurations
export function createMultiLLMManager(
  openaiApiKey?: string,
  anthropicApiKey?: string
): MultiLLMManager {
  const configs = new Map<LLMProviderType, LLMConfig>();
  
  if (openaiApiKey) {
    configs.set('openai', {
      provider: 'openai',
      apiKey: openaiApiKey,
      models: {
        workflow_build: { model: 'gpt-4-turbo-preview', complexity: 'high', streaming: true, temperature: 0.1, maxTokens: 4000 },
        workflow_edit: { model: 'gpt-4-turbo-preview', complexity: 'medium', streaming: true, temperature: 0.1, maxTokens: 3000 },
        mermaid_generate: { model: 'gpt-4', complexity: 'medium', streaming: true, temperature: 0.2, maxTokens: 2000 },
        mrf_chat: { model: 'gpt-3.5-turbo', complexity: 'low', streaming: true, temperature: 0.7, maxTokens: 1000 },
        validation_explain: { model: 'gpt-3.5-turbo', complexity: 'low', streaming: true, temperature: 0.3, maxTokens: 1500 }
      },
      maxTokens: 4000,
      temperature: 0.1,
      enableStreaming: true,
      timeout: 30000,
      retryAttempts: 3,
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 150000,
        burstLimit: 100,
        priorityTasks: ['workflow_build', 'workflow_edit']
      }
    });
  }
  
  if (anthropicApiKey) {
    configs.set('anthropic', {
      provider: 'anthropic',
      apiKey: anthropicApiKey,
      models: {
        workflow_build: { model: 'claude-3-opus-20240229', complexity: 'high', streaming: true, temperature: 0.1, maxTokens: 4000 },
        workflow_edit: { model: 'claude-3-sonnet-20240229', complexity: 'medium', streaming: true, temperature: 0.1, maxTokens: 3000 },
        mermaid_generate: { model: 'claude-3-sonnet-20240229', complexity: 'medium', streaming: true, temperature: 0.2, maxTokens: 2000 },
        mrf_chat: { model: 'claude-3-haiku-20240307', complexity: 'low', streaming: true, temperature: 0.7, maxTokens: 1000 },
        validation_explain: { model: 'claude-3-haiku-20240307', complexity: 'low', streaming: true, temperature: 0.3, maxTokens: 1500 }
      },
      maxTokens: 4000,
      temperature: 0.1,
      enableStreaming: true,
      timeout: 30000,
      retryAttempts: 3,
      rateLimits: {
        requestsPerMinute: 50,
        tokensPerMinute: 100000,
        burstLimit: 75,
        priorityTasks: ['workflow_build', 'workflow_edit']
      }
    });
  }
  
  if (configs.size === 0) {
    throw new Error('At least one LLM provider API key must be provided');
  }
  
  return new MultiLLMManager(configs);
}