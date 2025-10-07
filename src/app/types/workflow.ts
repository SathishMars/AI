// src/app/types/workflow.ts
import { z } from 'zod';

// Schema versioning
export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const COMPATIBLE_VERSIONS = ['1.0.0'];

// Condition type for recursive schema
export interface WorkflowCondition {
  all?: WorkflowCondition[];
  any?: WorkflowCondition[];
  fact?: string;
  operator?: string;
  value?: unknown;
  path?: string;
  params?: Record<string, unknown>;
}

// json-rules-engine condition schema
export const ConditionSchema: z.ZodType<WorkflowCondition> = z.lazy(() => 
  z.object({
    all: z.array(ConditionSchema).optional(),
    any: z.array(ConditionSchema).optional(),
    fact: z.string().optional(),
    operator: z.string().optional(),
    value: z.any().optional(),
    path: z.string().optional(),
    params: z.record(z.string(), z.any()).optional()
  }).refine(
    (data) => {
      // Must have either all/any OR fact/operator/value
      const hasLogical = data.all || data.any;
      const hasComparison = data.fact && data.operator && data.value !== undefined;
      return hasLogical || hasComparison;
    },
    { message: "Condition must have either logical operators (all/any) or comparison (fact/operator/value)" }
  )
);

// Workflow step types (NESTED ARRAY ARCHITECTURE with Human-Readable IDs)
// Define the base schema without type annotation to avoid circular reference
export const WorkflowStepSchema: z.ZodSchema = z.lazy(() =>
  z.object({
    // Required fields
    id: z.string()
      .regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'Step ID must be camelCase (only letters and numbers, start with letter)')
      .min(3, 'Step ID must be at least 3 characters')
      .max(50, 'Step ID must be at most 50 characters'),
    name: z.string().min(1, 'Step name is required'),
    type: z.enum(['trigger', 'condition', 'action', 'end', 'branch', 'merge', 'workflow']),
    
    // Optional fields
    action: z.string().optional(),
    params: z.record(z.string(), z.any()).optional(),
    
    // For condition steps
    condition: ConditionSchema.optional(),
    
    // Sequential children (nested array)
    children: z.array(z.lazy(() => WorkflowStepSchema)).optional(),
    
    // Conditional paths - inline steps (full step objects)
    onSuccess: z.lazy(() => WorkflowStepSchema).optional(),
    onFailure: z.lazy(() => WorkflowStepSchema).optional(),
    
    // Conditional paths - references to other steps (by human-readable ID)
    onSuccessGoTo: z.string().optional(),
    onFailureGoTo: z.string().optional(),
    
    // For end steps
    result: z.enum(['success', 'failure', 'cancelled', 'timeout']).optional(),
    
    // For workflow trigger steps (triggers another workflow in same account)
    workflowId: z.string().optional(),
    workflowParams: z.record(z.string(), z.any()).optional()
  })
);

// Workflow metadata (LLM-generated format - will be transformed for database)
// NOTE: This is what the LLM generates. When saving to database, we transform:
// - id, account, organization, version → top level (composite key)
// - name, description, status, author, timestamps → metadata object
export const WorkflowMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'deprecated', 'archived']).default('draft'),
  author: z.string().optional(), // User creating the workflow
  createdAt: z.string().optional(), // ISO date string from LLM
  updatedAt: z.string().optional(), // ISO date string from LLM
  category: z.string().optional(),
  tags: z.array(z.string()).default(['ai-generated'])
});

// Workflow definition interface (ONLY steps array - no metadata duplication)
export interface WorkflowDefinition {
  steps: WorkflowStep[];
}

// Workflow definition schema
export const WorkflowDefinitionSchema = z.object({
  steps: z.array(WorkflowStepSchema)
});

// Internal workflow format (simple - just steps array)
// Used throughout the application for workflow editing and manipulation
export const WorkflowJSONSchema = z.object({
  steps: z.array(WorkflowStepSchema) // Nested array of workflow steps
});

// LLM-generated workflow format (includes full context)
// This is what the LLM generates when creating/updating workflows
export const LLMWorkflowResponseSchema = z.object({
  account: z.string().optional(), // Account identifier (from context)
  organization: z.string().nullable().optional(), // Organization identifier (from context)
  metadata: WorkflowMetadataSchema, // Descriptive fields (name, description, status, author, tags)
  workflowDefinition: z.object({
    steps: z.array(WorkflowStepSchema) // Nested array of workflow steps
  })
});

// TypeScript types derived from schemas
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'trigger' | 'condition' | 'action' | 'end' | 'branch' | 'merge' | 'workflow';
  action?: string;
  params?: Record<string, unknown>;
  condition?: WorkflowCondition;
  children?: WorkflowStep[];
  onSuccess?: WorkflowStep;
  onFailure?: WorkflowStep;
  onSuccessGoTo?: string;
  onFailureGoTo?: string;
  result?: 'success' | 'failure' | 'cancelled' | 'timeout';
  workflowId?: string;
  workflowParams?: Record<string, unknown>;
}

export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;
export type WorkflowJSON = z.infer<typeof WorkflowJSONSchema>; // Simple format: { steps: [] }
export type LLMWorkflowResponse = z.infer<typeof LLMWorkflowResponseSchema>; // Full format from LLM

// Validation error types
export interface ValidationError {
  id: string;
  severity: 'error' | 'warning' | 'info';
  stepId?: string;
  fieldPath?: string;
  technicalMessage: string;
  conversationalExplanation: string;
  suggestedFix?: string;
  documentationLink?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

// Schema migration interface
export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (workflow: unknown) => WorkflowJSON;
  description: string;
}

// Function parameter definition with Zod schema support
export interface FunctionParameter {
  type: string;
  required: boolean;
  description: string;
  default?: unknown;
  examples?: unknown[];
  validation?: z.ZodSchema;
}

// Function example for AI and documentation
export interface FunctionExample {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  expectedOutput?: unknown;
  context: string; // When to use this example
}

// Function dependency definition
export interface FunctionDependency {
  functionId: string;
  version: string;
  optional: boolean;
}

// AI function context for prompt engineering
export interface AIFunctionContext {
  availableFunctions: FunctionSummary[];
  categoryDescriptions: Record<string, string>;
  usagePatterns: UsagePattern[];
  exampleWorkflows: string[];
}

export interface FunctionSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: ParameterSummary[];
  exampleUsage: string;
  aiPromptHints: string[];
}

export interface ParameterSummary {
  name: string;
  type: string;
  required: boolean;
  description: string;
  examples: unknown[];
}

export interface UsagePattern {
  id: string;
  name: string;
  description: string;
  functions: string[];
  workflow: string;
}

// Enhanced function definition
export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  namespace: string;
  category: string;
  tags: string[];
  parameters: Record<string, FunctionParameter>;
  returnType: string;
  examples: FunctionExample[];
  documentation: {
    description: string;
    usage: string;
    aiPromptHints: string[];
    commonUseCases: string[];
  };
  lifecycle: 'active' | 'deprecated' | 'experimental';
  dependencies?: FunctionDependency[];
  compatibleVersions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Library metadata
export interface LibraryMetadata {
  version: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  totalFunctions: number;
  categories: FunctionCategory[];
}

export interface FunctionCategory {
  id: string;
  name: string;
  description: string;
  aiDescription: string; // AI-optimized description
  functionCount: number;
}

// Enhanced functions library with dynamic capabilities
export interface FunctionsLibrary {
  version: string;
  metadata: LibraryMetadata;
  functions: Record<string, FunctionDefinition>;
  categories: FunctionCategory[];
}

// Chat integration types
export interface ChatErrorMessage {
  type: 'validation_error';
  errors: ValidationError[];
  workflowContext: string;
  suggestedActions: string[];
}