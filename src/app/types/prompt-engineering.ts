// src/app/types/prompt-engineering.ts
import { z } from 'zod';
import { AITaskType, LLMProviderType } from './llm';

// Core prompt engineering types
export type PromptType = 'system' | 'user' | 'assistant' | 'function' | 'hybrid';
export type PromptCategory = 'workflow_generation' | 'workflow_editing' | 'validation' | 'explanation' | 'optimization';
export type PromptComplexity = 'simple' | 'medium' | 'complex' | 'enterprise';

// Prompt template interface
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  complexity: PromptComplexity;
  taskType: AITaskType;
  provider: LLMProviderType | 'universal';
  template: string;
  variables: PromptVariable[];
  examples: PromptExample[];
  metadata: PromptMetadata;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  defaultValue?: unknown;
  validation?: VariableValidation;
  contextPath?: string; // Path to extract from WorkflowContext
}

export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  customValidator?: string; // Function name for custom validation
}

export interface PromptExample {
  id: string;
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: string;
  actualOutput?: string;
  accuracy?: number;
  timestamp: Date;
}

export interface PromptMetadata {
  author: string;
  tags: string[];
  performance: PerformanceMetrics;
  usage: UsageMetrics;
  effectiveness: EffectivenessMetrics;
  lastTested: Date;
  testResults?: TestResult[];
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  costPerRequest: number;
  throughput: number; // requests per minute
}

export interface UsageMetrics {
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  lastUsed: Date;
  popularityScore: number;
}

export interface EffectivenessMetrics {
  accuracyScore: number; // 0-1
  qualityScore: number; // 0-1  
  userSatisfactionScore: number; // 0-1
  consistencyScore: number; // 0-1
  overallEffectiveness: number; // weighted average
}

export interface TestResult {
  testId: string;
  timestamp: Date;
  input: Record<string, unknown>;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  accuracy: number;
  responseTime: number;
  tokenUsage: number;
  feedback?: string;
}

// Prompt engineering strategies
export interface PromptStrategy {
  id: string;
  name: string;
  description: string;
  techniques: PromptTechnique[];
  applicableTaskTypes: AITaskType[];
  complexity: PromptComplexity;
  effectiveness: number;
  examples: string[];
}

export interface PromptTechnique {
  name: string;
  description: string;
  pattern: string;
  variables: string[];
  benefits: string[];
  limitations: string[];
  bestPractices: string[];
}

// Context-aware prompt generation
export interface ContextualPrompt {
  baseTemplate: PromptTemplate;
  contextAdaptations: ContextAdaptation[];
  dynamicVariables: DynamicVariable[];
  conditionalLogic: ConditionalLogic[];
  finalPrompt: string;
  confidence: number;
  reasoning: string[];
}

export interface ContextAdaptation {
  condition: string; // JavaScript expression
  modification: string; // Template modification
  priority: number;
  description: string;
}

export interface DynamicVariable {
  name: string;
  source: 'context' | 'user' | 'system' | 'calculated';
  extractor: string; // Function or path to extract value
  transformer?: string; // Function to transform value
  fallback?: unknown;
}

export interface ConditionalLogic {
  condition: string;
  action: 'include' | 'exclude' | 'modify' | 'replace';
  target: string; // Template section or variable
  value?: string;
  priority: number;
}

// Prompt optimization and evolution
export interface PromptOptimization {
  originalTemplate: PromptTemplate;
  optimizedTemplate: PromptTemplate;
  optimizationStrategy: OptimizationStrategy;
  improvementMetrics: ImprovementMetrics;
  testResults: OptimizationTestResult[];
  confidence: number;
  rollbackPoint?: string;
}

export interface OptimizationStrategy {
  type: 'genetic' | 'gradient' | 'reinforcement' | 'manual' | 'hybrid';
  parameters: Record<string, unknown>;
  iterations: number;
  convergenceCriteria: ConvergenceCriteria;
}

export interface ConvergenceCriteria {
  minImprovement: number;
  maxIterations: number;
  stabilityWindow: number;
  successThreshold: number;
}

export interface ImprovementMetrics {
  accuracyImprovement: number;
  speedImprovement: number;
  costReduction: number;
  qualityImprovement: number;
  consistencyImprovement: number;
}

export interface OptimizationTestResult {
  iteration: number;
  template: string;
  performance: PerformanceMetrics;
  effectiveness: EffectivenessMetrics;
  testCases: TestResult[];
  improvement: number;
}

// Prompt versioning and A/B testing
export interface PromptVersion {
  version: string;
  template: PromptTemplate;
  changelog: VersionChange[];
  parentVersion?: string;
  branches: string[];
  status: 'draft' | 'testing' | 'production' | 'deprecated';
  metrics: VersionMetrics;
}

export interface VersionChange {
  timestamp: Date;
  author: string;
  type: 'creation' | 'modification' | 'optimization' | 'fix' | 'rollback';
  description: string;
  changes: string[];
  impact: ChangeImpact;
}

export interface ChangeImpact {
  performanceChange: number;
  accuracyChange: number;
  costChange: number;
  breaking: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface VersionMetrics {
  adoptionRate: number;
  successRate: number;
  rollbackRate: number;
  userFeedback: number;
  performanceRating: number;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABVariant[];
  trafficSplit: Record<string, number>;
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  results?: ABTestResults;
  significance: number;
  winningVariant?: string;
}

export interface ABVariant {
  id: string;
  name: string;
  template: PromptTemplate;
  trafficPercentage: number;
  metrics: VariantMetrics;
}

export interface VariantMetrics {
  impressions: number;
  conversions: number;
  conversionRate: number;
  averageResponseTime: number;
  averageAccuracy: number;
  costPerConversion: number;
  userSatisfaction: number;
}

export interface ABTestResults {
  winner: string;
  confidence: number;
  statisticalSignificance: number;
  effectSize: number;
  recommendations: string[];
  detailedMetrics: Record<string, VariantMetrics>;
}

// Prompt library and management
export interface PromptLibrary {
  id: string;
  name: string;
  description: string;
  organization: string;
  templates: PromptTemplate[];
  strategies: PromptStrategy[];
  categories: LibraryCategory[];
  permissions: LibraryPermissions;
  metadata: LibraryMetadata;
}

export interface LibraryCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  templateIds: string[];
  color: string;
  icon: string;
}

export interface LibraryPermissions {
  readers: string[];
  writers: string[];
  admins: string[];
  public: boolean;
  shareLevel: 'organization' | 'team' | 'private';
}

export interface LibraryMetadata {
  version: string;
  lastUpdated: Date;
  totalTemplates: number;
  mostUsedTemplates: string[];
  trending: string[];
  featured: string[];
  stats: LibraryStats;
}

export interface LibraryStats {
  totalUsage: number;
  averageRating: number;
  totalContributors: number;
  growthRate: number;
  popularCategories: string[];
}

// Zod schemas for validation
export const PromptVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string(),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.string()).optional(),
    customValidator: z.string().optional()
  }).optional(),
  contextPath: z.string().optional()
});

export const PromptExampleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  input: z.record(z.string(), z.unknown()),
  expectedOutput: z.string(),
  actualOutput: z.string().optional(),
  accuracy: z.number().min(0).max(1).optional(),
  timestamp: z.date()
});

export const PromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['workflow_generation', 'workflow_editing', 'validation', 'explanation', 'optimization']),
  complexity: z.enum(['simple', 'medium', 'complex', 'enterprise']),
  taskType: z.enum(['workflow_build', 'workflow_edit', 'mrf_chat', 'validation_explain', 'mermaid_generate']),
  provider: z.union([z.enum(['openai', 'anthropic']), z.literal('universal')]),
  template: z.string(),
  variables: z.array(PromptVariableSchema),
  examples: z.array(PromptExampleSchema),
  version: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Helper functions
export function createPromptId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function validatePromptTemplate(template: unknown): PromptTemplate {
  return PromptTemplateSchema.parse(template) as PromptTemplate;
}

export function calculateEffectiveness(metrics: EffectivenessMetrics): number {
  const weights = {
    accuracy: 0.3,
    quality: 0.25,
    userSatisfaction: 0.25,
    consistency: 0.2
  };
  
  return (
    metrics.accuracyScore * weights.accuracy +
    metrics.qualityScore * weights.quality +
    metrics.userSatisfactionScore * weights.userSatisfaction +
    metrics.consistencyScore * weights.consistency
  );
}

export function interpolatePrompt(
  template: string, 
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    const value = variables[variableName];
    return value !== undefined ? String(value) : match;
  });
}

// Default prompt templates for common scenarios
export const DEFAULT_WORKFLOW_GENERATION_TEMPLATE: PromptTemplate = {
  id: 'default_workflow_generation',
  name: 'Default Workflow Generation',
  description: 'Standard template for generating new workflows from user requirements',
  category: 'workflow_generation',
  complexity: 'medium',
  taskType: 'workflow_build',
  provider: 'universal',
  template: `You are an expert workflow designer. Create a comprehensive workflow based on the following requirements:

**User Request:** {{userRequest}}
**User Context:** {{userContext}}
**MRF Data:** {{mrfData}}
**Available Functions:** {{availableFunctions}}

**Requirements:**
1. Create a workflow that follows the json-rules-engine schema
2. Include proper conditional logic for approvals and validations
3. Use appropriate pre-built functions from the library
4. Ensure all steps have clear names and proper error handling
5. Follow the organization's compliance rules: {{complianceRules}}

**Output Format:**
Return a valid WorkflowJSON object with:
- Clear step names and descriptions
- Proper conditional logic using json-rules-engine format
- Appropriate function calls with parameters
- Success and failure paths for each conditional step
- Metadata including workflow name, description, and version

**Workflow JSON:**`,
  variables: [
    {
      name: 'userRequest',
      type: 'string',
      description: 'The user\'s workflow request description',
      required: true,
      contextPath: 'conversationHistory.0.content'
    },
    {
      name: 'userContext',
      type: 'object',
      description: 'User information including role, department, permissions',
      required: true,
      contextPath: 'userContext'
    },
    {
      name: 'mrfData',
      type: 'object',
      description: 'Meeting Request Form data if applicable',
      required: false,
      contextPath: 'mrfData'
    },
    {
      name: 'availableFunctions',
      type: 'object',
      description: 'Available pre-built functions from the library',
      required: true,
      contextPath: 'functionsLibrary'
    },
    {
      name: 'complianceRules',
      type: 'object',
      description: 'Organization compliance and policy rules',
      required: false,
      contextPath: 'organizationPolicy.complianceRules'
    }
  ],
  examples: [],
  metadata: {
    author: 'system',
    tags: ['workflow', 'generation', 'default'],
    performance: {
      averageResponseTime: 2500,
      tokenUsage: { input: 500, output: 800, total: 1300 },
      costPerRequest: 0.02,
      throughput: 24
    },
    usage: {
      totalInvocations: 0,
      successfulInvocations: 0,
      failedInvocations: 0,
      lastUsed: new Date(),
      popularityScore: 1.0
    },
    effectiveness: {
      accuracyScore: 0.85,
      qualityScore: 0.80,
      userSatisfactionScore: 0.78,
      consistencyScore: 0.82,
      overallEffectiveness: 0.81
    },
    lastTested: new Date()
  },
  version: '1.0.0',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};