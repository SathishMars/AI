// src/app/types/workflow-template.ts
import { z } from 'zod';
import { WorkflowJSON } from './workflow';

/**
 * Workflow Template Versioning and Storage Types
 * 
 * This module defines TypeScript types for:
 * - Workflow templates with versioning support
 * - Configurator conversation history
 * - Template lifecycle management
 * - Database operations and validation
 */

// Template lifecycle status
export type TemplateStatus = 'draft' | 'published' | 'deprecated' | 'archived';

// Template metadata interface
export interface TemplateMetadata {
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  author: string;
  description?: string;
  category?: string;
  tags?: string[];
}

// Template usage statistics
export interface TemplateUsageStats {
  instanceCount: number;
  lastUsed?: Date;
}

// Core workflow template interface
export interface WorkflowTemplate {
  _id?: string; // MongoDB ObjectId
  account: string; // Account identifier for multi-tenancy
  organization?: string; // Organization identifier within account (optional - if null, template is shared across all organizations in account)
  name: string; // Template name (unique within account+organization combination)
  status: TemplateStatus;
  version: string; // Semantic version (major.minor.patch)
  workflowDefinition: WorkflowJSON; // Complete workflow JSON
  mermaidDiagram?: string; // Generated Mermaid diagram
  metadata: TemplateMetadata;
  parentVersion?: string; // Reference to parent version
  usageStats?: TemplateUsageStats;
}

// Template creation/update input (without auto-generated fields)
export interface CreateWorkflowTemplateInput {
  account: string;
  organization?: string; // Optional - if null, template is shared across all organizations in account
  name: string;
  workflowDefinition: WorkflowJSON;
  description?: string;
  category?: string;
  tags?: string[];
  author: string;
}

// Template update input (partial fields allowed)
export interface UpdateWorkflowTemplateInput {
  workflowDefinition?: WorkflowJSON;
  mermaidDiagram?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

// Template query filters
export interface TemplateQueryFilters {
  account?: string;
  organization?: string | null; // null for account-wide templates, string for org-specific
  status?: TemplateStatus | TemplateStatus[];
  category?: string;
  tags?: string[];
  author?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Template list response with pagination
export interface TemplateListResponse {
  templates: WorkflowTemplate[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Template resolution result (for loading logic)
export interface TemplateResolutionResult {
  template: WorkflowTemplate | null;
  conversations: ConfiguratorConversation[];
  templateState: 'draft_available' | 'published_only' | 'not_found';
  suggestCreateDraft?: boolean; // True if only published version exists
}

// ===========================================
// Configurator Conversation Types
// ===========================================

// Message role in configurator conversations
export type ConfiguratorMessageRole = 'user' | 'assistant' | 'system';

// Enhanced message metadata for configurator
export interface ConfiguratorMessageMetadata {
  templateVersion?: string; // Version when message was created
  model?: string; // AI model used (e.g., 'gpt-4', 'claude-3')
  tokenCount?: number; // Token usage for this message
  workflowStepGenerated?: string; // Step ID if workflow was modified
  functionsCalled?: string[]; // Functions referenced in message
  validationErrors?: string[]; // Validation issues detected
  editIntent?: boolean; // True if message indicates edit intent
}

// Configurator conversation message
export interface ConfiguratorMessage {
  messageId: string;
  role: ConfiguratorMessageRole;
  content: string;
  timestamp: Date;
  metadata?: ConfiguratorMessageMetadata;
}

// Session information for conversations
export interface ConversationSessionInfo {
  startedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  userAgent?: string;
}

// Conversation retention policy
export interface ConversationRetentionPolicy {
  expiresAt: Date; // 5-year retention
  archived: boolean;
}

// Complete configurator conversation record
export interface ConfiguratorConversation {
  _id?: string; // MongoDB ObjectId
  account: string; // Account identifier matching template
  organization?: string | null; // Organization identifier within account (null for account-wide templates)
  workflowTemplateName: string; // Name of the workflow template this conversation belongs to
  conversationId?: string; // Generated deterministic ID for frontend (computed from account+org+template)
  messages: ConfiguratorMessage[];
  sessionInfo: ConversationSessionInfo;
  retentionPolicy?: ConversationRetentionPolicy;
}

// Conversation creation input
export interface CreateConversationInput {
  account: string;
  organization?: string | null; // Organization identifier (null for account-wide templates)
  workflowTemplateName: string; // Name of the workflow template
  initialMessage?: ConfiguratorMessage;
  userAgent?: string;
}

// Message addition input
export interface AddMessageInput {
  account: string;
  organization?: string | null; // Organization identifier (null for account-wide templates)
  workflowTemplateName: string; // Name of the workflow template
  role: ConfiguratorMessageRole;
  content: string;
  metadata?: ConfiguratorMessageMetadata;
}

// ===========================================
// Zod Validation Schemas
// ===========================================

// Semantic version pattern
const SEMANTIC_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

// Template status validation
export const TemplateStatusSchema = z.enum(['draft', 'published', 'deprecated', 'archived']);

// Template metadata validation
export const TemplateMetadataSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().optional(),
  author: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// Template usage stats validation
export const TemplateUsageStatsSchema = z.object({
  instanceCount: z.number().int().min(0),
  lastUsed: z.date().optional()
});

// Core workflow template validation
export const WorkflowTemplateSchema = z.object({
  _id: z.string().optional(),
  account: z.string().min(1).max(100),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9-_]+$/, 'Template name must contain only alphanumeric characters, hyphens, and underscores'),
  status: TemplateStatusSchema,
  version: z.string().regex(SEMANTIC_VERSION_REGEX, 'Version must follow semantic versioning (major.minor.patch)'),
  workflowDefinition: z.any(), // WorkflowJSON validation handled separately
  mermaidDiagram: z.string().optional(),
  metadata: TemplateMetadataSchema,
  parentVersion: z.string().optional(),
  usageStats: TemplateUsageStatsSchema.optional()
});

// Template creation input validation
export const CreateWorkflowTemplateInputSchema = z.object({
  account: z.string().min(1).max(100),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9-_]+$/),
  workflowDefinition: z.any(), // WorkflowJSON validation
  mermaidDiagram: z.string().optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  author: z.string().min(1).max(100)
});

// Template update input validation
export const UpdateWorkflowTemplateInputSchema = z.object({
  workflowDefinition: z.any().optional(), // WorkflowJSON validation
  mermaidDiagram: z.string().optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional()
});

// Configurator message validation
export const ConfiguratorMessageSchema = z.object({
  messageId: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  timestamp: z.date(),
  metadata: z.object({
    templateVersion: z.string().optional(),
    model: z.string().optional(),
    tokenCount: z.number().int().min(0).optional(),
    workflowStepGenerated: z.string().optional(),
    functionsCalled: z.array(z.string()).optional(),
    validationErrors: z.array(z.string()).optional(),
    editIntent: z.boolean().optional()
  }).optional()
});

// Configurator conversation validation
export const ConfiguratorConversationSchema = z.object({
  _id: z.string().optional(),
  account: z.string().min(1).max(100),
  organization: z.string().nullable().optional(), // Organization identifier (null for account-wide templates)
  workflowTemplateName: z.string().min(1), // Name of the workflow template this conversation belongs to
  messages: z.array(ConfiguratorMessageSchema),
  sessionInfo: z.object({
    startedAt: z.date(),
    lastActivity: z.date(),
    isActive: z.boolean(),
    userAgent: z.string().optional()
  }),
  retentionPolicy: z.object({
    expiresAt: z.date(),
    archived: z.boolean()
  }).optional()
});

// ===========================================
// Version Management Utilities
// ===========================================

// Parse semantic version
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

export function parseSemanticVersion(version: string): SemanticVersion | null {
  const match = version.match(SEMANTIC_VERSION_REGEX);
  if (!match) return null;
  
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

// Compare semantic versions
export function compareVersions(a: string, b: string): number {
  const versionA = parseSemanticVersion(a);
  const versionB = parseSemanticVersion(b);
  
  if (!versionA || !versionB) {
    throw new Error('Invalid semantic version format');
  }
  
  if (versionA.major !== versionB.major) {
    return versionA.major - versionB.major;
  }
  if (versionA.minor !== versionB.minor) {
    return versionA.minor - versionB.minor;
  }
  return versionA.patch - versionB.patch;
}

// Generate next version
export function generateNextVersion(currentVersion: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
  const version = parseSemanticVersion(currentVersion);
  if (!version) {
    throw new Error('Invalid semantic version format');
  }
  
  switch (type) {
    case 'major':
      return `${version.major + 1}.0.0`;
    case 'minor':
      return `${version.major}.${version.minor + 1}.0`;
    case 'patch':
      return `${version.major}.${version.minor}.${version.patch + 1}`;
    default:
      throw new Error('Invalid version increment type');
  }
}

// Get latest version from array
export function getLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  
  return versions.sort(compareVersions).reverse()[0];
}

// ===========================================
// Template State Management
// ===========================================

// Template state utility functions
export class TemplateStateManager {
  
  // Determine if draft creation should be suggested
  static shouldSuggestDraftCreation(templates: WorkflowTemplate[]): boolean {
    const hasPublished = templates.some(t => t.status === 'published');
    const hasDraft = templates.some(t => t.status === 'draft');
    
    return hasPublished && !hasDraft;
  }
  
  // Get the template to load (draft priority)
  static getTemplateToLoad(templates: WorkflowTemplate[]): WorkflowTemplate | null {
    // Priority: draft -> latest published -> null
    const draft = templates.find(t => t.status === 'draft');
    if (draft) return draft;
    
    const published = templates.filter(t => t.status === 'published');
    if (published.length === 0) return null;
    
    // Return latest published version
    const latest = getLatestVersion(published.map(t => t.version));
    return published.find(t => t.version === latest) || null;
  }
  
  // Determine template state for UI
  static getTemplateState(templates: WorkflowTemplate[]): TemplateResolutionResult['templateState'] {
    if (templates.length === 0) return 'not_found';
    
    const hasDraft = templates.some(t => t.status === 'draft');
    const hasPublished = templates.some(t => t.status === 'published');
    
    if (hasDraft) return 'draft_available';
    if (hasPublished) return 'published_only';
    
    return 'not_found';
  }
}

// ===========================================
// Error Types
// ===========================================

export class TemplateError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class ConversationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}