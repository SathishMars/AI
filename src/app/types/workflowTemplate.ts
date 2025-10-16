
import { z } from 'zod';

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

export interface WorkflowTemplateMetadata {
    label: string;                                        // Template label (human readable name)
    description?: string;                                 // Optional description
    status: TemplateStatus;                               // Lifecycle status
    createdAt: string;                                    // ISO timestamp of creation
    updatedAt: string;                                    // ISO timestamp of last update
    createdBy: string;                                    // User ID of creator
    updatedBy: string;                                    // User ID of last updater
    tags?: string[];                                      // Optional tags for categorization
    lastUsedAt?: string;                                  // ISO timestamp of last usage
    parentVersion?: number;                               // Optional parent version for drafts
    copiedFromTemplateId?: string;                        // Optional ID of template copied from
    copiedFromVersion?: number;                           // Optional version of template copied from
}

export interface WorkflowStepMetadata {
    isNew?: boolean;                                      // Flag indicating if the step is newly added
    isModified?: boolean;                                 // Flag indicating if the step has been modified
    isDeleted?: boolean;                                  // Flag indicating if the step has been deleted
    workflowVersion?: number;                             // Version number of the step
    createdAt?: string;                                   // ISO timestamp of step creation
    updatedAt?: string;                                   // ISO timestamp of last step update
    createdBy?: string;                                   // User ID of step creator
    updatedBy?: string;                                   // User ID of last step updater
}

export interface WorkflowStep {
    id: string;                                           // Unique step ID (10-char short-id)
    label: string;                                        // human readable step name
    type: string;                                         // Step type (e.g., task, decision, condition, etc.)
    stepFunction?: string;                                // Optional tool or service associated with the step
    functionParams?: Record<string, unknown>;             // Optional parameters for the tool
    next?: Array<string | WorkflowStep>;                  // Optional next steps (for branching)
    conditions?: Array<{ value: string; next: string }>; // Optional conditions for switch case branching steps
    onConditionPass?: string | WorkflowStep;              // Optional steps if condition passes
    onConditionFail?: string | WorkflowStep;              // Optional steps if condition fails
    onError?: string | WorkflowStep;                      // Optional error handling steps
    onTimeout?: string | WorkflowStep;                    // Optional timeout handling steps
    timeout?: number;                                     // Optional timeout in seconds
    retryCount?: number;                                  // Optional retry count on failure
    retryDelay?: number;                                  // Optional delay between retries in seconds

}

export interface WorkflowDefinition {
    // Define the structure of the workflow definition here
    // This is a placeholder and should be replaced with actual fields
    steps: Array<WorkflowStep>;                           // Array of workflow steps
}

export interface WorkflowTemplate {
    id: string;                                           // 10-char short-id (auto-generated, composite key)
    account: string;                                      // Account ID (composite key)
    organization?: string | null;                         // Optional organization ID (composite key)
    version: string;                                      // Version number (auto-incremented, composite key)
    metadata: WorkflowTemplateMetadata;                   // Metadata about the template
    workflowDefinition: WorkflowDefinition;               // JSON content of the workflow template
    mermaidDiagram?: string;                              // Optional Mermaid diagram representation
}

export interface WorkflowTemplateHistory {
    id: string;                                           // 10-char short-id (auto-generated, composite key)
    account: string;                                      // Account ID (composite key)
    organization?: string | null;                         // Optional organization ID (composite key)
    version: string;                                      // Version number of the associated template
    label: string;                                        // Human-readable label for the template
    status: TemplateStatus;                               // Lifecycle status at the time of change
    changedAt: string;                                   // ISO timestamp of when the change occurred
    changedBy: string;                                   // User ID of who made the change
} 

// -------------------------
// Zod schema validators
// -------------------------

export const TemplateStatusSchema = z.enum(['draft', 'published', 'deprecated', 'archived']);

const isoString = () => z.string().refine((s) => !isNaN(Date.parse(s)), { message: 'Invalid ISO timestamp' });

export const WorkflowTemplateMetadataSchema = z.object({
    label: z.string(),
    description: z.string().optional(),
    status: TemplateStatusSchema,
    createdAt: isoString(),
    updatedAt: isoString(),
    createdBy: z.string(),
    updatedBy: z.string(),
    tags: z.array(z.string()).optional(),
    lastUsedAt: isoString().optional(),
    parentVersion: z.number().int().optional(),
    copiedFromTemplateId: z.string().optional(),
    copiedFromVersion: z.number().int().optional(),
});

export const WorkflowStepMetadataSchema = z.object({
    isNew: z.boolean().optional(),
    isModified: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    workflowVersion: z.number().int().optional(),
    createdAt: isoString().optional(),
    updatedAt: isoString().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
});

// Recursive step schema - use z.lazy for self-reference
export const WorkflowStepSchema: z.ZodType<WorkflowStep> = z.lazy(() =>
    z.object({
        id: z.string(),
        label: z.string(),
        type: z.string(),
        stepFunction: z.string().optional(),
        functionParams: z.record(z.unknown()).optional(),
    next: z.array(z.union([z.string(), WorkflowStepSchema])).optional(),
    // The interface uses a single step reference (string id or nested step) for these handlers
    onConditionPass: z.union([z.string(), WorkflowStepSchema]).optional(),
    onConditionFail: z.union([z.string(), WorkflowStepSchema]).optional(),
    onError: z.union([z.string(), WorkflowStepSchema]).optional(),
    onTimeout: z.union([z.string(), WorkflowStepSchema]).optional(),
        timeout: z.number().optional(),
        retryCount: z.number().int().optional(),
        retryDelay: z.number().optional(),
    })
);

export const WorkflowDefinitionSchema = z.object({
    steps: z.array(WorkflowStepSchema),
});

export const WorkflowTemplateSchema = z.object({
    id: z.string(),
    account: z.string(),
    organization: z.string().nullable().optional(),
    version: z.string(),
    metadata: WorkflowTemplateMetadataSchema,
    workflowDefinition: WorkflowDefinitionSchema,
    mermaidDiagram: z.string().optional(),
});

export const WorkflowTemplateHistorySchema = z.object({
    id: z.string(),
    account: z.string(),
    organization: z.string().nullable().optional(),
    version: z.string(),
    label: z.string(),
    status: TemplateStatusSchema,
    changedAt: isoString(),
    changedBy: z.string(),
});

export type WorkflowTemplateFromSchema = z.infer<typeof WorkflowTemplateSchema>;

// -------------------------
// Validation helpers
// -------------------------

type ValidationSuccess<T> = { valid: true; data: T };
type ValidationFailure = { valid: false; errors: string[] };

export function validateWorkflowDefinition(obj: unknown): ValidationSuccess<WorkflowDefinition> | ValidationFailure {
    const result = WorkflowDefinitionSchema.safeParse(obj);
    if (result.success) return { valid: true, data: result.data };

    // Flatten Zod errors to readable messages
    const errors = (result.error.errors || []).map(e => {
        const path = e.path && e.path.length ? e.path.join('.') : '<root>';
        return `${path}: ${e.message}`;
    });
    return { valid: false, errors };
}

export function validateWorkflowTemplate(obj: unknown): ValidationSuccess<WorkflowTemplate> | ValidationFailure {
    const result = WorkflowTemplateSchema.safeParse(obj);
    if (result.success) return { valid: true, data: result.data };

    const errors = (result.error.errors || []).map(e => {
        const path = e.path && e.path.length ? e.path.join('.') : '<root>';
        return `${path}: ${e.message}`;
    });
    return { valid: false, errors };
}


