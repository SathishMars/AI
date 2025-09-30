// src/app/types/workflow-creation.ts
import { WorkflowJSON, ValidationResult } from './workflow';
import { ConversationContext } from './conversation';

// Creation phases that guide users through structured workflow building
export type CreationPhase = 
  | 'trigger_definition'
  | 'condition_setup' 
  | 'action_configuration'
  | 'end_state_definition'
  | 'refinement'
  | 'validation'
  | 'completion';

// Structured guidance for each creation phase
export interface StructuredGuidance {
  currentPhase: CreationPhase;
  nextPhase?: CreationPhase;
  phaseInstructions: string;
  suggestedFunctions: string[];
  requiredElements: string[];
  completionCriteria: string[];
  progressPercentage: number;
}

// Creation context with MRF data and user preferences
export interface CreationContext extends ConversationContext {
  mrfData?: MRFData;
  creationPreferences?: CreationPreferences;
  structuredGuidance?: StructuredGuidance;
  currentWorkflow?: Partial<WorkflowJSON>;
}

// MRF data for workflow initialization
export interface MRFData {
  id: string;
  title: string;
  description?: string;
  requestedDate?: Date;
  attendees?: number;
  location?: string;
  budget?: number;
  category?: string;
  requester?: {
    name: string;
    email: string;
    department: string;
  };
  approvalRequired?: boolean;
  customFields?: Record<string, unknown>;
}

// User preferences for creation flow
export interface CreationPreferences {
  guidanceLevel: 'minimal' | 'standard' | 'detailed';
  autoSave: boolean;
  realTimeValidation: boolean;
  visualUpdates: boolean;
  functionSuggestions: boolean;
}

// Creation session state
export interface CreationSession {
  sessionId: string;
  workflowId: string;
  conversationId: string;
  currentPhase: CreationPhase;
  context: CreationContext;
  draft: WorkflowDraft;
  history: CreationHistory[];
  autoSaveOnAIUpdate: boolean; // Always true
  structuredGuidance: StructuredGuidance;
  createdAt: Date;
  lastActivity: Date;
}

// Workflow draft with version tracking
export interface WorkflowDraft {
  draftId: string;
  workflowData: Partial<WorkflowJSON>;
  version: number;
  lastModified: Date;
  autoSavedByAI: boolean;
  validationResult?: ValidationResult;
  changesSinceLastSave: WorkflowChange[];
}

// History tracking for creation steps
export interface CreationHistory {
  historyId: string;
  timestamp: Date;
  phase: CreationPhase;
  action: CreationAction;
  workflowState: Partial<WorkflowJSON>;
  userInput?: string;
  aiResponse?: string;
  changes: WorkflowChange[];
}

// Types of creation actions
export type CreationAction = 
  | 'phase_start'
  | 'phase_complete'
  | 'user_input'
  | 'ai_update'
  | 'validation'
  | 'auto_save'
  | 'manual_save'
  | 'refinement'
  | 'rollback';

// Workflow changes tracking
export interface WorkflowChange {
  changeId: string;
  timestamp: Date;
  type: 'add' | 'modify' | 'delete';
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
  source: 'user' | 'ai' | 'system';
  description: string;
}

// Streaming workflow generation chunk
export interface WorkflowGenerationChunk {
  type: 'workflow_update' | 'conversation' | 'guidance';
  content: string;
  workflowDelta?: Partial<WorkflowJSON>;
  currentWorkflow?: Partial<WorkflowJSON>;
  validation?: ValidationResult;
  suggestions?: ProactiveSuggestion[];
  guidance?: StructuredGuidance;
}

// Proactive suggestions during creation
export interface ProactiveSuggestion {
  id: string;
  type: 'function' | 'improvement' | 'validation' | 'next_step' | 'naming';
  title: string;
  description: string;
  actionText: string;
  priority: 'high' | 'medium' | 'low';
  phase: CreationPhase;
  metadata?: Record<string, unknown>;
}

// Workflow update result
export interface WorkflowUpdate {
  updateId: string;
  workflow: Partial<WorkflowJSON>;
  changes: WorkflowChange[];
  validation: ValidationResult;
  suggestions: ProactiveSuggestion[];
  autoSaved: boolean;
  timestamp: Date;
}

// AI naming suggestions
export interface NamingSuggestions {
  workflowNames: string[];
  stepNames: Map<string, string[]>;
  descriptions: string[];
}

// Post-update validation result
export interface PostUpdateValidationResult extends ValidationResult {
  updateSpecificIssues: ValidationIssue[];
  validationTriggeredBy: 'ai_update' | 'user_input' | 'phase_change' | 'manual';
  conversationalRecovery?: ConversationalRecovery;
}

// Validation issues
export interface ValidationIssue {
  issueId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  suggestion?: string;
  autoFixable: boolean;
}

// Conversational error recovery
export interface ConversationalRecovery {
  recoveryId: string;
  errorExplanation: string;
  recoveryPrompt: string;
  suggestedActions: string[];
  autoFixOptions: AutoFixOption[];
}

// Auto-fix options for validation errors
export interface AutoFixOption {
  fixId: string;
  description: string;
  action: string;
  confidence: number;
  previewChanges: WorkflowChange[];
}

// Update context for validation
export interface UpdateContext {
  triggerType: 'ai_update' | 'user_input' | 'phase_change' | 'manual';
  changes: WorkflowChange[];
  previousWorkflow?: Partial<WorkflowJSON>;
  sessionId: string;
  phase: CreationPhase;
}

// Creation analytics for learning
export interface CreationAnalytics {
  sessionId: string;
  totalCreationTime: number;
  phaseTimings: Map<CreationPhase, number>;
  userInteractions: number;
  aiAssistanceRequests: number;
  validationErrors: number;
  autoSaves: number;
  manualSaves: number;
  finalWorkflowComplexity: number;
  userSatisfactionScore?: number;
  completionStatus: 'completed' | 'abandoned' | 'draft';
}

// Export utility functions
export function createEmptyCreationSession(
  workflowId: string, 
  conversationId: string,
  context: CreationContext
): CreationSession {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    sessionId,
    workflowId,
    conversationId,
    currentPhase: 'trigger_definition',
    context,
    draft: {
      draftId: `draft_${sessionId}`,
      workflowData: {},
      version: 1,
      lastModified: new Date(),
      autoSavedByAI: false,
      changesSinceLastSave: []
    },
    history: [],
    autoSaveOnAIUpdate: true,
    structuredGuidance: {
      currentPhase: 'trigger_definition',
      nextPhase: 'condition_setup',
      phaseInstructions: 'Let\'s start by defining what triggers this workflow. What event should start the process?',
      suggestedFunctions: ['onMRFSubmit', 'onScheduledEvent', 'onAPICall'],
      requiredElements: ['trigger type', 'trigger parameters'],
      completionCriteria: ['Valid trigger defined', 'Trigger parameters specified'],
      progressPercentage: 10
    },
    createdAt: new Date(),
    lastActivity: new Date()
  };
}

export function generateCreationHistoryEntry(
  phase: CreationPhase,
  action: CreationAction,
  workflowState: Partial<WorkflowJSON>,
  changes: WorkflowChange[],
  userInput?: string,
  aiResponse?: string
): CreationHistory {
  return {
    historyId: `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
    phase,
    action,
    workflowState: JSON.parse(JSON.stringify(workflowState)), // Deep clone
    changes,
    userInput,
    aiResponse
  };
}

export function generateWorkflowChange(
  type: 'add' | 'modify' | 'delete',
  path: string,
  newValue?: unknown,
  oldValue?: unknown,
  source: 'user' | 'ai' | 'system' = 'ai',
  description: string = ''
): WorkflowChange {
  return {
    changeId: `change_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
    type,
    path,
    oldValue,
    newValue,
    source,
    description
  };
}