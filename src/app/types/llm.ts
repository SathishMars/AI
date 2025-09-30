// src/app/types/llm.ts
import { z } from 'zod';
import { WorkflowJSON, ValidationResult } from './workflow';
import { ConversationMessage, StreamChunk } from './conversation';

// Core LLM types and interfaces
export type AITaskType = 'workflow_build' | 'workflow_edit' | 'mrf_chat' | 'validation_explain' | 'mermaid_generate';
export type LLMProviderType = 'openai' | 'anthropic';
export type ResponseType = 'workflow' | 'text' | 'mermaid' | 'validation';

// Task complexity levels for model selection
export type TaskComplexity = 'high' | 'medium' | 'low';

// Functions library interface
export interface FunctionsLibrary {
  [functionName: string]: {
    id: string;
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    category: string;
    version: string;
    execute: (...args: unknown[]) => Promise<unknown>;
  };
}

// Enhanced context for LLM operations
export interface WorkflowContext {
  workflowId?: string;
  conversationHistory: ConversationMessage[];
  functionsLibrary: FunctionsLibrary;
  userContext: UserContext;
  mrfData?: MRFData;
  schemaVersion: string;
  previousWorkflowVersions?: WorkflowVersion[];
  organizationPolicy?: OrganizationPolicy;
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  manager?: string;
  region?: string;
  permissions: string[];
  timezone: string;
}

export interface MRFData {
  id: string;
  title: string;
  description?: string;
  attendees: number;
  budget?: number;
  date?: string;
  duration?: number;
  location?: string;
  type: string;
  requester: string;
  priority: 'low' | 'medium' | 'high';
  additionalRequirements?: Record<string, unknown>;
}

export interface WorkflowVersion {
  version: string;
  timestamp: Date;
  changes: string[];
  workflow: WorkflowJSON;
}

export interface OrganizationPolicy {
  maxBudgetWithoutApproval: number;
  maxAttendeesWithoutApproval: number;
  approvalRequiredFor: string[];
  restrictedFunctions: string[];
  complianceRules: Record<string, unknown>;
}

// LLM Configuration
export interface LLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  models: TaskModelConfig;
  maxTokens: number;
  temperature: number;
  enableStreaming: boolean;
  timeout: number;
  retryAttempts: number;
  rateLimits: RateLimitConfig;
}

export interface TaskModelConfig {
  workflow_build: {
    model: string;
    complexity: TaskComplexity;
    streaming: boolean;
    maxTokens: number;
    temperature: number;
  };
  workflow_edit: {
    model: string;
    complexity: TaskComplexity;
    streaming: boolean;
    maxTokens: number;
    temperature: number;
  };
  mrf_chat: {
    model: string;
    complexity: TaskComplexity;
    streaming: boolean;
    maxTokens: number;
    temperature: number;
  };
  validation_explain: {
    model: string;
    complexity: TaskComplexity;
    streaming: boolean;
    maxTokens: number;
    temperature: number;
  };
  mermaid_generate: {
    model: string;
    complexity: TaskComplexity;
    streaming: boolean;
    maxTokens: number;
    temperature: number;
  };
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  burstLimit: number;
  priorityTasks: AITaskType[];
}

// Streaming response interfaces
export interface LLMStreamChunk extends StreamChunk {
  taskId: string;
  taskType: AITaskType;
  provider: LLMProviderType;
  model: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  tokensUsed: number;
  responseTime: number;
  cacheHit: boolean;
  modelVersion: string;
  confidence?: number;
  warnings?: string[];
}

export interface StreamingResponse {
  taskId: string;
  taskType: AITaskType;
  provider: LLMProviderType;
  model: string;
  chunks: AsyncGenerator<LLMStreamChunk>;
  metadata: ResponseMetadata;
}

// Health and monitoring
export interface HealthStatus {
  provider: LLMProviderType;
  status: 'healthy' | 'degraded' | 'unavailable';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  details?: Record<string, unknown>;
}

export interface LLMMetrics {
  provider: LLMProviderType;
  taskType: AITaskType;
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  averageTokensUsed: number;
  errorsByType: Record<string, number>;
  cacheHitRate: number;
  lastUpdated: Date;
}

// Error handling
export interface LLMError {
  code: string;
  message: string;
  provider: LLMProviderType;
  taskType?: AITaskType;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestions?: string[];
}

// Core LLM Provider interface
export interface LLMProvider {
  readonly name: LLMProviderType;
  readonly config: LLMConfig;
  
  // Core generation methods
  generateWorkflow(prompt: string, context: WorkflowContext): AsyncGenerator<LLMStreamChunk, WorkflowJSON>;
  editWorkflow(workflow: WorkflowJSON, editPrompt: string, context: WorkflowContext): AsyncGenerator<LLMStreamChunk, WorkflowJSON>;
  generateMermaid(workflow: WorkflowJSON, context: WorkflowContext): AsyncGenerator<LLMStreamChunk, string>;
  handleMRFChat(message: string, context: WorkflowContext): AsyncGenerator<LLMStreamChunk, string>;
  explainValidationErrors(errors: ValidationError[], context: WorkflowContext): AsyncGenerator<LLMStreamChunk, string>;
  
  // Utility methods
  validateResponse(response: string, expectedType: ResponseType): ValidationResult;
  getHealth(): Promise<HealthStatus>;
  getTaskModel(taskType: AITaskType): string;
  estimateTokens(text: string): number;
  
  // Context management
  enrichPromptWithContext(prompt: string, context: WorkflowContext): Promise<string>;
  truncateContextIfNeeded(context: WorkflowContext, maxTokens: number): WorkflowContext;
  
  // Rate limiting and caching
  checkRateLimit(taskType: AITaskType): Promise<boolean>;
  getCachedResponse(cacheKey: string): Promise<string | null>;
  setCachedResponse(cacheKey: string, response: string, ttl: number): Promise<void>;
}

// Multi-LLM manager interface
export interface MultiLLMManager {
  primaryProvider: LLMProvider;
  fallbackProvider?: LLMProvider;
  
  // Core operations with automatic fallback
  generateWorkflow(prompt: string, context: WorkflowContext): AsyncGenerator<LLMStreamChunk, WorkflowJSON>;
  editWorkflow(workflow: WorkflowJSON, editPrompt: string, context: WorkflowContext): AsyncGenerator<LLMStreamChunk, WorkflowJSON>;
  handleMRFChat(message: string, context: WorkflowContext): AsyncGenerator<LLMStreamChunk, string>;
  
  // Provider management
  switchProvider(provider: LLMProviderType): Promise<boolean>;
  getProviderHealth(): Promise<Record<LLMProviderType, HealthStatus>>;
  getOptimalProvider(taskType: AITaskType): LLMProvider;
  
  // Monitoring and metrics
  getMetrics(): Promise<Record<LLMProviderType, LLMMetrics>>;
  getTaskPerformance(taskType: AITaskType): Promise<TaskPerformanceMetrics>;
}

export interface TaskPerformanceMetrics {
  taskType: AITaskType;
  averageResponseTime: number;
  successRate: number;
  preferredProvider: LLMProviderType;
  qualityScore: number;
  costEfficiency: number;
}

// AI Accuracy Testing
export interface AIAccuracyTest {
  testId: string;
  taskType: AITaskType;
  inputPrompt: string;
  expectedOutput: unknown;
  context: WorkflowContext;
  validationCriteria: ValidationCriteria[];
  timeout: number;
}

export interface ValidationCriteria {
  type: 'schema_compliance' | 'function_usage' | 'content_quality' | 'response_time';
  threshold: number;
  weight: number;
  description: string;
}

export interface AccuracyMetrics {
  workflowGenerationAccuracy: number;
  schemaComplianceRate: number;
  functionUsageAccuracy: number;
  editingAccuracy: number;
  averageResponseTime: number;
  streamingQuality: number;
  overallScore: number;
  lastTested: Date;
}

export interface ProviderComparison {
  taskType: AITaskType;
  providers: {
    [K in LLMProviderType]: {
      accuracy: number;
      speed: number;
      cost: number;
      reliability: number;
      overallRating: number;
    };
  };
  recommendation: LLMProviderType;
  timestamp: Date;
}

// Cache management
export interface CacheEntry {
  key: string;
  value: string;
  taskType: AITaskType;
  contextHash: string;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  metadata: Record<string, unknown>;
}

export interface CacheManager {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, value: string, ttl: number, metadata?: Record<string, unknown>): Promise<void>;
  invalidate(pattern: string): Promise<number>;
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  topKeys: Array<{ key: string; hits: number }>;
}

// Zod schemas for validation
export const UserContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  department: z.string(),
  manager: z.string().optional(),
  region: z.string().optional(),
  permissions: z.array(z.string()),
  timezone: z.string()
});

export const MRFDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  attendees: z.number().min(1),
  budget: z.number().min(0).optional(),
  date: z.string().optional(),
  duration: z.number().min(15).optional(),
  location: z.string().optional(),
  type: z.string(),
  requester: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  additionalRequirements: z.record(z.string(), z.unknown()).optional()
});

export const WorkflowContextSchema = z.object({
  workflowId: z.string().optional(),
  conversationHistory: z.array(z.unknown()), // ConversationMessage schema will be defined in conversation types
  functionsLibrary: z.unknown(), // FunctionsLibrary schema will be defined in functions types
  userContext: UserContextSchema,
  mrfData: MRFDataSchema.optional(),
  schemaVersion: z.string(),
  previousWorkflowVersions: z.array(z.unknown()).optional()
});

export const LLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  apiKey: z.string(),
  maxTokens: z.number().min(1).max(32000),
  temperature: z.number().min(0).max(2),
  enableStreaming: z.boolean(),
  timeout: z.number().min(1000),
  retryAttempts: z.number().min(0).max(5)
});

// Default configurations
export const DEFAULT_OPENAI_CONFIG: TaskModelConfig = {
  workflow_build: {
    model: 'gpt-4',
    complexity: 'high',
    streaming: true,
    maxTokens: 4000,
    temperature: 0.7
  },
  workflow_edit: {
    model: 'gpt-4',
    complexity: 'medium',
    streaming: true,
    maxTokens: 2000,
    temperature: 0.5
  },
  mrf_chat: {
    model: 'gpt-3.5-turbo',
    complexity: 'low',
    streaming: true,
    maxTokens: 1000,
    temperature: 0.8
  },
  validation_explain: {
    model: 'gpt-4',
    complexity: 'medium',
    streaming: true,
    maxTokens: 1500,
    temperature: 0.3
  },
  mermaid_generate: {
    model: 'gpt-4',
    complexity: 'medium',
    streaming: true,
    maxTokens: 2000,
    temperature: 0.4
  }
};

export const DEFAULT_ANTHROPIC_CONFIG: TaskModelConfig = {
  workflow_build: {
    model: 'claude-3-opus-20240229',
    complexity: 'high',
    streaming: true,
    maxTokens: 4000,
    temperature: 0.7
  },
  workflow_edit: {
    model: 'claude-3-sonnet-20240229',
    complexity: 'medium',
    streaming: true,
    maxTokens: 2000,
    temperature: 0.5
  },
  mrf_chat: {
    model: 'claude-3-sonnet-20240229',
    complexity: 'low',
    streaming: true,
    maxTokens: 1000,
    temperature: 0.8
  },
  validation_explain: {
    model: 'claude-3-sonnet-20240229',
    complexity: 'medium',
    streaming: true,
    maxTokens: 1500,
    temperature: 0.3
  },
  mermaid_generate: {
    model: 'claude-3-sonnet-20240229',
    complexity: 'medium',
    streaming: true,
    maxTokens: 2000,
    temperature: 0.4
  }
};

// Helper functions
export function createTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateContextHash(context: WorkflowContext): string {
  const contextString = JSON.stringify({
    workflowId: context.workflowId,
    schemaVersion: context.schemaVersion,
    userRole: context.userContext.role,
    functionsCount: Object.keys(context.functionsLibrary || {}).length,
    historyLength: context.conversationHistory.length
  });
  
  // Simple hash function for demo - in production use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < contextString.length; i++) {
    const char = contextString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function createWorkflowContext(
  conversationHistory: ConversationMessage[],
  userContext: UserContext,
  mrfData?: MRFData,
  workflowId?: string
): WorkflowContext {
  return {
    workflowId,
    conversationHistory,
    functionsLibrary: {}, // Will be populated by functions library
    userContext,
    mrfData,
    schemaVersion: '1.0.0',
    previousWorkflowVersions: []
  };
}

// Accuracy testing types
export interface AccuracyTestResult {
  provider: LLMProviderType;
  accuracy: number;
  totalTests: number;
  correctResponses: number;
  averageResponseTime: number;
  testResults: Array<{
    prompt: string;
    response: string;
    isCorrect: boolean;
    responseTime: number;
    validationResult?: ValidationResult;
    error?: string;
  }>;
  timestamp: Date;
}