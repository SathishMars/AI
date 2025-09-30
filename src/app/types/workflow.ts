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

// Workflow step types
export const WorkflowStepSchema = z.object({
  name: z.string(),
  type: z.enum(['trigger', 'condition', 'action', 'end']),
  action: z.string().optional(),
  params: z.record(z.string(), z.any()).optional(),
  condition: ConditionSchema.optional(),
  nextSteps: z.array(z.string()).optional(),
  onSuccess: z.string().optional(),
  onFailure: z.string().optional(),
  result: z.string().optional()
});

// Workflow metadata
export const WorkflowMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  status: z.enum(['draft', 'published']).default('draft'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).default([])
});

// Main workflow schema
export const WorkflowJSONSchema = z.object({
  schemaVersion: z.string().default(CURRENT_SCHEMA_VERSION),
  metadata: WorkflowMetadataSchema,
  steps: z.record(z.string(), WorkflowStepSchema)
});

// TypeScript types derived from schemas
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;
export type WorkflowJSON = z.infer<typeof WorkflowJSONSchema>;

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