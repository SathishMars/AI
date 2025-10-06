// src/app/types/workflow-template-v2.ts
/**
 * Workflow Template Type System V2
 * 
 * CLEAN type system aligned with database schema (01-initialize-fresh-database.js)
 * This replaces the old WorkflowJSON + WorkflowTemplate hybrid approach
 * 
 * Key Changes:
 * - WorkflowTemplate is PRIMARY type (matches database)
 * - WorkflowDefinition contains ONLY steps (no metadata duplication)
 * - Composite key: {account, organization, id, version}
 * - Template name is user-editable (NOT part of key)
 * - Status: draft | published | deprecated | archived
 * - Semantic versioning with constraints
 */

import { z } from 'zod';
import { WorkflowStep, WorkflowStepSchema } from './workflow';

// ===========================================
// Core Types (Database Schema)
// ===========================================

/**
 * Template lifecycle status
 * 
 * State transitions:
 * - draft → published (creates new published, deprecates old published)
 * - published → deprecated (when new version is published)
 * - deprecated → archived (manual archival)
 * - draft → archived (discard draft)
 */
export type TemplateStatus = 'draft' | 'published' | 'deprecated' | 'archived';

/**
 * Workflow Definition (CLEAN - no metadata duplication)
 * 
 * This is the core workflow structure stored in workflowDefinition field.
 * Contains ONLY the steps array - all metadata lives at template level.
 */
export interface WorkflowDefinition {
  steps: WorkflowStep[];
}

/**
 * Template Metadata
 * 
 * Timestamps, author, and descriptive information
 */
export interface TemplateMetadata {
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  author?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

/**
 * Template Usage Statistics
 * 
 * Track how often template is used
 */
export interface TemplateUsageStats {
  instanceCount: number;
  lastUsed?: Date;
}

/**
 * Workflow Template (PRIMARY TYPE)
 * 
 * This is the main template type that matches the database schema exactly.
 * 
 * Composite Key: {account, organization, id, version}
 * - account: Company identifier (required)
 * - organization: Department identifier (null = account-wide)
 * - id: 10-char short-id (auto-generated, e.g., "a1b2c3d4e5")
 * - version: Semantic version (e.g., "1.0.0")
 * 
 * Version Constraints:
 * - Only 1 published version per template ID
 * - Max 1 draft per template ID
 * - Unlimited deprecated/archived versions
 */
export interface WorkflowTemplate {
  // MongoDB document ID (optional for new documents)
  _id?: string;
  
  // Composite Key Fields
  account: string;                      // Company ID (required)
  organization: string | null;          // Department ID (null = account-wide)
  id: string;                           // 10-char short-id (auto-generated)
  version: string;                      // Semantic version (e.g., "1.0.0")
  
  // Template Properties
  name: string;                         // User-editable name (NOT part of key)
  status: TemplateStatus;               // Lifecycle status
  
  // Workflow Definition (CLEAN - no metadata)
  workflowDefinition: WorkflowDefinition;
  
  // Generated Visualization
  mermaidDiagram?: string;
  
  // Metadata & Tracking
  metadata: TemplateMetadata;
  parentVersion?: string;               // For version lineage tracking
  usageStats?: TemplateUsageStats;
}

// ===========================================
// Input Types (for API operations)
// ===========================================

/**
 * Create Template Input
 * 
 * Used when creating a new workflow template.
 * Auto-generated fields (id, version, timestamps) are excluded.
 */
export interface CreateWorkflowTemplateInput {
  // Context (auto-filled from user context usually)
  account: string;
  organization?: string | null;         // null = account-wide template
  
  // Template Properties
  name: string;                         // Initial name
  
  // Workflow Content
  workflowDefinition: WorkflowDefinition;
  
  // Optional Metadata
  description?: string;
  category?: string;
  tags?: string[];
  author?: string;
}

/**
 * Update Template Input
 * 
 * Used when updating an existing template.
 * All fields are optional - only provided fields are updated.
 */
export interface UpdateWorkflowTemplateInput {
  // Template name can be changed
  name?: string;
  
  // Workflow content
  workflowDefinition?: WorkflowDefinition;
  mermaidDiagram?: string;
  
  // Metadata updates
  description?: string;
  category?: string;
  tags?: string[];
}

/**
 * Publish Template Input
 * 
 * Used when publishing a draft template.
 * Creates new published version and deprecates old published version.
 */
export interface PublishTemplateInput {
  // Optional: Override auto-incremented version
  version?: string;
  
  // Optional: Add publish notes
  publishNotes?: string;
}

/**
 * Create Draft from Published Input
 * 
 * Used when creating a new draft from a published template.
 */
export interface CreateDraftInput {
  author: string;
  description?: string;
}

// ===========================================
// Query Types
// ===========================================

/**
 * Template Query Filters
 * 
 * Used for searching/filtering templates
 */
export interface TemplateQueryFilters {
  account?: string;
  organization?: string | null;        // null for account-wide, string for org-specific
  status?: TemplateStatus | TemplateStatus[];
  category?: string;
  tags?: string[];
  author?: string;
  searchText?: string;                 // Search in name, description
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Template List Response (with pagination)
 */
export interface TemplateListResponse {
  templates: WorkflowTemplate[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Template Resolution Result
 * 
 * Used when loading a template by name/id to determine state
 */
export interface TemplateResolutionResult {
  template: WorkflowTemplate | null;
  templateState: 'draft_available' | 'published_only' | 'not_found';
  availableVersions: string[];
  suggestCreateDraft?: boolean;        // True if only published version exists
}

/**
 * Template Version Info
 * 
 * Lightweight version information for version history
 */
export interface TemplateVersionInfo {
  version: string;
  status: TemplateStatus;
  publishedAt?: Date;
  author?: string;
  description?: string;
}

// ===========================================
// Validation Schemas (Zod)
// ===========================================

// Semantic version pattern
const SEMANTIC_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

// Template status validation
export const TemplateStatusSchema = z.enum(['draft', 'published', 'deprecated', 'archived']);

// Workflow definition validation (CLEAN - only steps)
export const WorkflowDefinitionSchema = z.object({
  steps: z.array(WorkflowStepSchema)
});

// Template metadata validation
export const TemplateMetadataSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().optional(),
  author: z.string().optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(20).optional()
});

// Template usage stats validation
export const TemplateUsageStatsSchema = z.object({
  instanceCount: z.number().int().min(0),
  lastUsed: z.date().optional()
});

// Core workflow template validation
export const WorkflowTemplateSchema = z.object({
  _id: z.string().optional(),
  
  // Composite key
  account: z.string().min(1).max(100),
  organization: z.string().nullable(),
  id: z.string().length(10),                    // 10-char short-id
  version: z.string().regex(SEMANTIC_VERSION_REGEX),
  
  // Template properties
  name: z.string().min(1).max(200),
  status: TemplateStatusSchema,
  
  // Workflow definition (CLEAN)
  workflowDefinition: WorkflowDefinitionSchema,
  mermaidDiagram: z.string().optional(),
  
  // Metadata
  metadata: TemplateMetadataSchema,
  parentVersion: z.string().regex(SEMANTIC_VERSION_REGEX).optional(),
  usageStats: TemplateUsageStatsSchema.optional()
});

// Create template input validation
export const CreateWorkflowTemplateInputSchema = z.object({
  account: z.string().min(1).max(100),
  organization: z.string().nullable().optional(),
  name: z.string().min(1).max(200),
  workflowDefinition: WorkflowDefinitionSchema,
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  author: z.string().max(100).optional()
});

// Update template input validation
export const UpdateWorkflowTemplateInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  workflowDefinition: WorkflowDefinitionSchema.optional(),
  mermaidDiagram: z.string().optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(20).optional()
});

// Publish template input validation
export const PublishTemplateInputSchema = z.object({
  version: z.string().regex(SEMANTIC_VERSION_REGEX).optional(),
  publishNotes: z.string().max(500).optional()
});

// Create draft input validation
export const CreateDraftInputSchema = z.object({
  author: z.string().min(1).max(100),
  description: z.string().max(1000).optional()
});

// ===========================================
// Utility Functions
// ===========================================

/**
 * Parse semantic version string into components
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

/**
 * Increment version for different update types
 */
export function incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
  const { major, minor, patch } = parseVersion(version);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);
  
  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }
  
  return 0;
}

/**
 * Check if workflow definition has at least one step
 */
export function hasSteps(definition: WorkflowDefinition): boolean {
  return definition.steps.length > 0;
}

/**
 * Check if template name is valid (not 'new' or 'create')
 */
export function isValidTemplateName(name: string): boolean {
  const invalidNames = ['new', 'create', '', 'untitled'];
  return !invalidNames.includes(name.toLowerCase().trim());
}

/**
 * Should auto-save template?
 * Rules: Must have ≥1 step AND valid name
 */
export function shouldAutoSave(template: WorkflowTemplate): boolean {
  return hasSteps(template.workflowDefinition) && isValidTemplateName(template.name);
}
