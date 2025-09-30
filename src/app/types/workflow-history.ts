// src/app/types/workflow-history.ts
import { WorkflowJSON, ValidationResult } from './workflow';
import { ConversationMessage } from './conversation';

export interface WorkflowVersion {
  versionId: string;
  workflowJSON: WorkflowJSON;
  timestamp: Date;
  status: 'draft' | 'published';
  changeDescription: string;
  conversationContext: string;
  validationState: ValidationResult;
  createdBy?: string;
  publishedBy?: string;
}

export interface WorkflowVersionSystem {
  workflowId: string;
  publishedVersion?: WorkflowVersion;
  currentDraft?: WorkflowVersion;
  draftHistory: WorkflowVersion[];
  conversationHistory: ConversationSession[];
  metadata: WorkflowHistoryMetadata;
}

export interface WorkflowHistoryMetadata {
  workflowId: string;
  firstCreated: Date;
  lastModified: Date;
  totalVersions: number;
  publishedVersions: number;
  draftVersions: number;
  conversationCount: number;
  retentionPolicy: {
    retentionYears: number;
    autoArchive: boolean;
    lastArchiveDate?: Date;
  };
}

export interface ConversationSession {
  sessionId: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  messages: ConversationMessage[];
  workflowVersionsCreated: string[];
  userContext: {
    userId: string;
    userRole: string;
    userDepartment: string;
  };
  sessionMetadata: {
    editMode: boolean;
    initialIntent: 'create' | 'edit' | 'view';
    aiInteractions: number;
    modificationsCount: number;
  };
}

export interface EditModeContext {
  mode: 'create' | 'edit' | 'continue';
  targetWorkflow?: WorkflowJSON;
  conversationContext: ConversationMessage[];
  editIntent?: EditIntent;
  isDraftMode: boolean;
  previousVersionId?: string;
  changesSinceLastPublish: WorkflowChange[];
}

export interface EditIntent {
  category: 'step_modification' | 'condition_change' | 'parameter_update' | 
           'workflow_structure' | 'function_replacement' | 'validation_fix';
  confidence: number;
  suggestedActions: string[];
  targetSteps?: string[];
  expectedChanges: string[];
}

export interface WorkflowChange {
  changeId: string;
  timestamp: Date;
  type: 'added' | 'modified' | 'removed';
  path: string;
  description: string;
  source: 'ai' | 'user' | 'system';
  beforeValue?: unknown;
  afterValue?: unknown;
  conversationMessageId?: string;
}

export interface ConversationHistoryResponse {
  messages: ConversationMessage[];
  totalCount: number;
  hasMore: boolean;
  virtualScrollMetadata: VirtualScrollMetadata;
  searchResults?: ConversationSearchResult[];
}

export interface VirtualScrollMetadata {
  totalHeight: number;
  itemHeight: number;
  visibleRange: { start: number; end: number };
  loadingRange: { start: number; end: number };
}

export interface ConversationSearchResult {
  messageId: string;
  relevanceScore: number;
  contextSnippet: string;
  highlightedContent: string;
  timestamp: Date;
  workflowVersionId?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: 'timestamp' | 'relevance';
  direction?: 'asc' | 'desc';
}

export interface PublishValidationError extends Error {
  name: 'PublishValidationError';
  validationResult: ValidationResult;
  blockingErrors: string[];
}

export interface DraftSaveEvent {
  type: 'draft_saved' | 'draft_error' | 'workflow_published';
  sessionId: string;
  versionId: string;
  timestamp: Date;
  metadata?: {
    changeCount: number;
    validationState: 'valid' | 'invalid' | 'warning';
    autoSaved: boolean;
  };
}

// UI State interfaces for components
export interface EditModeUIState {
  isEditMode: boolean;
  isDraftMode: boolean;
  hasUnsavedChanges: boolean;
  publishEnabled: boolean;
  currentVersionId?: string;
  publishedVersionId?: string;
  lastSaveTime?: Date;
  validationStatus: 'valid' | 'invalid' | 'validating' | 'unknown';
}

export interface HistoryPanelState {
  isExpanded: boolean;
  selectedVersionId?: string;
  searchQuery?: string;
  loading: boolean;
  conversationHistory: ConversationMessage[];
  versionHistory: WorkflowVersion[];
  hasMore: boolean;
  currentPage: number;
}