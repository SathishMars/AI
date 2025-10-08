import { randomUUID } from 'node:crypto';

import {
  LLMProvider,
  LLMConfig,
  WorkflowContext,
  AITaskType,
  LLMStreamChunk,
  ResponseType,
  HealthStatus,
  LLMProviderType,
  ValidationError as LLMValidationError
} from '@/app/types/llm';
import { CURRENT_SCHEMA_VERSION, WorkflowJSON, WorkflowStep, ValidationResult } from '@/app/types/workflow';

type RateLimitWindow = {
  timestamps: number[];
};

type CacheEntry = {
  value: string;
  expiresAt: number;
};

/**
 * Base implementation for LLM providers that satisfies the shared interface
 * while keeping the networking details abstract. Concrete providers can extend
 * this class and focus on API specific behaviour while benefiting from
 * consistent validation, rate limiting and caching helpers that our tests rely on.
 */
export abstract class BaseLLMProvider implements LLMProvider {
  public abstract readonly name: LLMProviderType;
  public readonly config: LLMConfig;

  private readonly rateLimitWindows: Map<AITaskType, RateLimitWindow> = new Map();
  private readonly cache: Map<string, CacheEntry> = new Map();

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateWorkflow(
    prompt: string,
    context: WorkflowContext
  ): AsyncGenerator<LLMStreamChunk, WorkflowJSON>;

  abstract editWorkflow(
    workflow: WorkflowJSON,
    editPrompt: string,
    context: WorkflowContext
  ): AsyncGenerator<LLMStreamChunk, WorkflowJSON>;

  abstract generateMermaid(
    workflow: WorkflowJSON,
    context: WorkflowContext
  ): AsyncGenerator<LLMStreamChunk, string>;

  abstract handleMRFChat(
    message: string,
    context: WorkflowContext
  ): AsyncGenerator<LLMStreamChunk, string>;

  abstract explainValidationErrors(
    errors: LLMValidationError[],
    context: WorkflowContext
  ): AsyncGenerator<LLMStreamChunk, string>;

  validateResponse(response: string, expectedType: ResponseType): ValidationResult {
    switch (expectedType) {
      case 'workflow':
        return this.validateWorkflowResponse(response);
      case 'mermaid':
        return this.validateMermaidResponse(response);
      case 'text':
      case 'validation':
      default:
        return this.validateTextResponse(response);
    }
  }

  async getHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: 'healthy',
      responseTime: 100,
      errorRate: 0,
      lastCheck: new Date(),
      details: {
        message: `${this.name} provider healthy (mocked)`
      }
    };
  }

  getTaskModel(taskType: AITaskType): string {
    return this.config.models[taskType]?.model ?? 'unknown-model';
  }

  estimateTokens(text: string): number {
    if (!text) {
      return 0;
    }

    const sanitized = text.trim();
    if (sanitized.length === 0) {
      return 0;
    }

    // Use character count as a coarse proxy to ensure truncation logic kicks in during tests
    return sanitized.length;
  }

  async enrichPromptWithContext(prompt: string, context: WorkflowContext): Promise<string> {
    const { userContext, mrfData } = context;
    const parts = [prompt.trim()];

    if (userContext) {
      parts.push(
        `User: ${userContext.name} (${userContext.role}, ${userContext.department})`
      );
      if (userContext.permissions?.length) {
        parts.push(`Permissions: ${userContext.permissions.join(', ')}`);
      }
    }

    if (mrfData) {
      parts.push(
        `MRF: ${mrfData.title} with ${mrfData.attendees} attendees` +
        (mrfData.priority ? ` (priority: ${mrfData.priority})` : '')
      );
    }

    return parts.join('\n');
  }

  truncateContextIfNeeded(context: WorkflowContext, maxTokens: number): WorkflowContext {
    const currentTokens = this.estimateTokens(
      context.conversationHistory.map(message => message.content).join('\n')
    );

    if (currentTokens <= maxTokens) {
      return context;
    }

    const truncatedHistory = [...context.conversationHistory];
    while (truncatedHistory.length > 0) {
      truncatedHistory.shift();
      const tokens = this.estimateTokens(truncatedHistory.map(m => m.content).join('\n'));
      if (tokens <= maxTokens) {
        break;
      }
    }

    return {
      ...context,
      conversationHistory: truncatedHistory
    };
  }

  async checkRateLimit(taskType: AITaskType): Promise<boolean> {
    const window = this.rateLimitWindows.get(taskType) ?? { timestamps: [] };
    const now = Date.now();
    const oneMinute = 60_000;
    const allowedRequests = this.config.rateLimits.requestsPerMinute;

    const recent = window.timestamps.filter(timestamp => now - timestamp < oneMinute);
    window.timestamps = recent;

    if (window.timestamps.length >= allowedRequests) {
      this.rateLimitWindows.set(taskType, window);
      return false;
    }

    window.timestamps.push(now);
    this.rateLimitWindows.set(taskType, window);
    return true;
  }

  async getCachedResponse(cacheKey: string): Promise<string | null> {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.value;
  }

  async setCachedResponse(cacheKey: string, response: string, ttl: number): Promise<void> {
    this.cache.set(cacheKey, {
      value: response,
      expiresAt: Date.now() + ttl
    });
  }

  protected createWorkflowSkeleton(
    name: string,
    description: string,
    steps: WorkflowStep[],
    workflowId?: string
  ): WorkflowJSON {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      metadata: {
        id: workflowId ?? `workflow-${Date.now()}`,
        name,
        description,
        status: 'draft',
        version: '1.0.0',
        createdAt: new Date(),
        tags: ['ai-generated']
      },
      steps
    };
  }

  protected createChunk(
    taskType: AITaskType,
    content: string,
    modelOverride?: string,
    chunkIndex = 0,
    isComplete = true
  ): LLMStreamChunk {
    return {
      id: randomUUID(),
      content,
      timestamp: new Date(),
      chunkIndex,
      isComplete,
      taskId: `${taskType}-${Date.now()}`,
      taskType,
      provider: this.name,
      model: modelOverride ?? this.getTaskModel(taskType),
      metadata: {
        tokensUsed: this.estimateTokens(content),
        responseTime: 50,
        cacheHit: false,
        modelVersion: 'mock'
      }
    };
  }

  private validateWorkflowResponse(response: string): ValidationResult {
    try {
      const parsed = JSON.parse(response);

      if (!parsed || typeof parsed !== 'object') {
        return this.invalidResult('workflow_invalid_format', 'Response is not a JSON object');
      }

      const steps = (parsed as { steps?: unknown }).steps;
      if (!Array.isArray(steps) || steps.length === 0) {
        return this.invalidResult('missing_steps', 'Workflow JSON must contain a non-empty steps array');
      }

      return {
        isValid: true,
        errors: [],
        warnings: [],
        info: [
          {
            id: 'workflow_valid',
            severity: 'info',
            technicalMessage: 'Workflow JSON structure detected',
            conversationalExplanation: 'The LLM returned a workflow structure we can use.'
          }
        ]
      };
    } catch (error) {
      return this.invalidResult('workflow_json_parse_error', `Failed to parse workflow JSON: ${String(error)}`);
    }
  }

  private validateMermaidResponse(response: string): ValidationResult {
    if (typeof response !== 'string' || response.trim().length === 0) {
      return this.invalidResult('invalid_mermaid', 'Mermaid response is empty');
    }

    const trimmed = response.trim();
    if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/i.test(trimmed)) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        info: [
          {
            id: 'mermaid_detected',
            severity: 'info',
            technicalMessage: 'Mermaid diagram syntax detected',
            conversationalExplanation: 'The AI produced a Mermaid diagram that looks valid.'
          }
        ]
      };
    }

    return this.invalidResult('invalid_mermaid', 'Response does not appear to be valid Mermaid syntax');
  }

  private validateTextResponse(response: string): ValidationResult {
    if (typeof response !== 'string' || response.trim().length === 0) {
      return this.invalidResult('empty_response', 'Response content is empty');
    }

    const length = response.trim().length;
    return {
      isValid: true,
      errors: [],
      warnings: [],
      info: [
        {
          id: 'text_detected',
          severity: 'info',
          technicalMessage: `Text response detected with ${length} characters`,
          conversationalExplanation: 'Received a text response from the AI.'
        }
      ]
    };
  }

  private invalidResult(id: string, message: string): ValidationResult {
    return {
      isValid: false,
      errors: [
        {
          id,
          severity: 'error',
          technicalMessage: message,
          conversationalExplanation: message
        }
      ],
      warnings: [],
      info: []
    };
  }
}
