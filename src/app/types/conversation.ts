// src/app/types/conversation.ts
import { z } from 'zod';
import { generateObjectId } from '@/app/utils/mongodb-objectid';

// Message types and status
export type MessageSender = 'user' | 'aime';
export type MessageStatus = 'sending' | 'streaming' | 'complete' | 'error';
export type MessageType = 'text' | 'workflow_generated' | 'error_recovery' | 'function_suggestion' | 'validation_result';

// Stream chunk for real-time content delivery
export interface StreamChunk {
  id: string;
  content: string;
  timestamp: Date;
  chunkIndex: number;
  isComplete: boolean;
}

// Proactive suggestions from AI
export interface ProactiveSuggestion {
  id: string;
  type: 'function' | 'improvement' | 'validation' | 'next_step';
  title: string;
  description: string;
  actionText: string;
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
}

// Message metadata for enhanced interactions
export interface MessageMetadata {
  workflowStepGenerated?: string;
  functionsCalled?: string[];
  validationErrors?: string[];
  suggestions?: ProactiveSuggestion[];
  editedWorkflowJSON?: boolean;
}

// Core conversation message structure
export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  type: MessageType;
  metadata?: MessageMetadata;
  streamChunks?: StreamChunk[];
  suggestions?: ProactiveSuggestion[];
}

// Conversation context for AI understanding
export interface ConversationContext {
  workflowId: string;
  workflowName?: string;
  userRole: string;
  userDepartment: string;
  availableFunctions: string[];
  mrfContext?: Record<string, unknown>;
  userContext?: Record<string, unknown>;
  currentWorkflowSteps?: string[];
  conversationGoal: 'create' | 'edit' | 'debug' | 'optimize';
}

// Implicit behavior tracking for AI learning
export interface ImplicitBehaviorMetrics {
  messageCount: number;
  averageResponseTime: number;
  functionsUsedCount: Record<string, number>;
  errorRecoveryAttempts: number;
  conversationDuration: number;
  workflowComplexity: number;
  userSatisfactionIndicators: {
    quickAcceptance: number;
    iterationsRequired: number;
    explicitPositiveFeedback: number;
  };
}

// Individual conversation state
export interface ConversationState {
  workflowId: string;
  conversationId: string;
  messages: ConversationMessage[];
  isStreaming: boolean;
  currentStreamId?: string;
  context: ConversationContext;
  behaviorMetrics: ImplicitBehaviorMetrics;
  lastActivity: Date;
  isAutoSaving: boolean;
}

// Multi-conversation management
export interface MultiConversationManager {
  activeConversations: Record<string, ConversationState>;
  currentConversationId: string;
  conversationHistory: string[];
  maxActiveConversations: number;
}

// Autocomplete system interfaces
export interface AutocompleteSuggestion {
  id: string;
  display: string;
  value: string;
  description?: string;
  category?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface AutocompleteProvider {
  trigger: string; // '@', '#', 'user.', 'mrf.', etc.
  getSuggestions(input: string, context: ConversationContext): Promise<AutocompleteSuggestion[]>;
  formatSuggestion(suggestion: AutocompleteSuggestion): string;
}

// Streaming response configuration
export interface StreamingConfig {
  chunkSize: number;
  delayBetweenChunks: number;
  enableSmoothScrolling: boolean;
  showTypingIndicator: boolean;
  allowStreamCancellation: boolean;
}

// Error recovery system
export interface ErrorRecoveryContext {
  errorType: 'validation' | 'generation' | 'api' | 'user_input';
  errorMessage: string;
  recoveryActions: RecoveryAction[];
  conversationContext: ConversationContext;
}

export interface RecoveryAction {
  id: string;
  title: string;
  description: string;
  actionType: 'retry' | 'clarify' | 'suggest' | 'skip';
  autoExecute: boolean;
}

// API integration interfaces
export interface LLMProviderConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  streamEnabled: boolean;
}

export interface ConversationAPI {
  sendMessage(message: string, context: ConversationContext): Promise<AsyncGenerator<StreamChunk>>;
  generateWorkflow(conversation: ConversationMessage[], context: ConversationContext): Promise<string>;
  validateWorkflow(workflowJSON: string): Promise<ValidationResult>;
  suggestImprovements(workflowJSON: string, context: ConversationContext): Promise<ProactiveSuggestion[]>;
}

// Validation result type (imported from workflow types if needed)
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Zod schemas for runtime validation
export const ConversationMessageSchema = z.object({
  id: z.string(),
  sender: z.enum(['user', 'aime']),
  content: z.string(),
  timestamp: z.date(),
  status: z.enum(['sending', 'streaming', 'complete', 'error']),
  type: z.enum(['text', 'workflow_generated', 'error_recovery', 'function_suggestion', 'validation_result']),
  metadata: z.object({
    workflowStepGenerated: z.string().optional(),
    functionsCalled: z.array(z.string()).optional(),
    validationErrors: z.array(z.string()).optional(),
    editedWorkflowJSON: z.boolean().optional()
  }).optional(),
  streamChunks: z.array(z.object({
    id: z.string(),
    content: z.string(),
    timestamp: z.date(),
    chunkIndex: z.number(),
    isComplete: z.boolean()
  })).optional(),
  suggestions: z.array(z.object({
    id: z.string(),
    type: z.enum(['function', 'improvement', 'validation', 'next_step']),
    title: z.string(),
    description: z.string(),
    actionText: z.string(),
    priority: z.enum(['high', 'medium', 'low'])
  })).optional()
});

export const ConversationContextSchema = z.object({
  workflowId: z.string(),
  workflowName: z.string().optional(),
  userRole: z.string(),
  userDepartment: z.string(),
  availableFunctions: z.array(z.string()),
  mrfContext: z.record(z.string(), z.any()).optional(),
  userContext: z.record(z.string(), z.any()).optional(),
  currentWorkflowSteps: z.array(z.string()).optional(),
  conversationGoal: z.enum(['create', 'edit', 'debug', 'optimize'])
});

export const ConversationStateSchema = z.object({
  workflowId: z.string(),
  conversationId: z.string(),
  messages: z.array(ConversationMessageSchema),
  isStreaming: z.boolean(),
  currentStreamId: z.string().optional(),
  context: ConversationContextSchema,
  lastActivity: z.date(),
  isAutoSaving: z.boolean()
});

// Default values and constants
export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  chunkSize: 50,
  delayBetweenChunks: 100,
  enableSmoothScrolling: true,
  showTypingIndicator: true,
  allowStreamCancellation: true
};

export const AUTOCOMPLETE_TRIGGERS = ['@', '#', 'user.', 'mrf.'] as const;

export const USER_CONTEXT_PROPERTIES = [
  'name', 'email', 'manager', 'region', 'department', 'role', 'permissions'
] as const;

export const MRF_CONTEXT_PROPERTIES = [
  'attendees', 'budget', 'date', 'duration', 'location', 'type', 'requester'
] as const;

// Helper functions
export function createEmptyConversationState(
  workflowId: string, 
  context: ConversationContext,
  workflowContext?: { account: string; organization?: string | null; workflowTemplateId?: string; workflowTemplateName: string }
): ConversationState {
  // Generate conversation ID based on context if available, otherwise use MongoDB ObjectID
  const conversationId = workflowContext 
    ? (() => {
        const baseId = workflowContext.workflowTemplateId || workflowContext.workflowTemplateName;
        return workflowContext.organization 
          ? `${workflowContext.account}-${workflowContext.organization}-${baseId}`
          : `${workflowContext.account}-${baseId}`;
      })()
    : generateObjectId(); // Use proper MongoDB ObjectID format

  return {
    workflowId,
    conversationId,
    messages: [],
    isStreaming: false,
    context,
    behaviorMetrics: {
      messageCount: 0,
      averageResponseTime: 0,
      functionsUsedCount: {},
      errorRecoveryAttempts: 0,
      conversationDuration: 0,
      workflowComplexity: 0,
      userSatisfactionIndicators: {
        quickAcceptance: 0,
        iterationsRequired: 0,
        explicitPositiveFeedback: 0
      }
    },
    lastActivity: new Date(),
    isAutoSaving: false
  };
}

export function generateMessageId(): string {
  return generateObjectId(); // Use proper MongoDB ObjectID format
}

export function createUserMessage(content: string): Omit<ConversationMessage, 'id' | 'timestamp'> {
  return {
    sender: 'user',
    content,
    status: 'complete',
    type: 'text'
  };
}

export function createAimeMessage(content: string, type: MessageType = 'text'): Omit<ConversationMessage, 'id' | 'timestamp'> {
  return {
    sender: 'aime',
    content,
    status: 'streaming',
    type
  };
}