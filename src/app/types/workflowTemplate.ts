
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
    description?: string | null;                                 // Optional description
    status: TemplateStatus;                               // Lifecycle status
    createdAt: string;                                    // ISO timestamp of creation
    updatedAt: string;                                    // ISO timestamp of last update
    createdBy: string;                                    // User ID of creator
    updatedBy: string;                                    // User ID of last updater
    tags?: string[] | null;                                      // Optional tags for categorization
    lastUsedAt?: string | null;                                  // ISO timestamp of last usage
    parentVersion?: number | null;                               // Optional parent version for drafts
    copiedFromTemplateId?: string | null;                        // Optional ID of template copied from
    copiedFromVersion?: number | null;                           // Optional version of template copied from
    requestTemplateId?: string | null;                           // Optional request template ID extracted from workflow definition
    type?: 'Request' | 'MRF' | null;                             // Workflow type determined from trigger step
}

export interface WorkflowStepMetadata {
    isNew?: boolean | null;                                      // Flag indicating if the step is newly added
    isModified?: boolean | null;                                 // Flag indicating if the step has been modified
    isDeleted?: boolean | null;                                  // Flag indicating if the step has been deleted
    workflowVersion?: number | null;                             // Version number of the step
    createdAt?: string | null;                                   // ISO timestamp of step creation
    updatedAt?: string | null;                                   // ISO timestamp of last step update
    createdBy?: string | null;                                   // User ID of step creator
    updatedBy?: string | null;                                   // User ID of last step updater
}

export interface WorkflowStep {
    id: string;                                           // Unique step ID (10-char short-id)
    label: string;                                        // human readable step name
    type: string;                                         // Step type (e.g., task, decision, condition, etc.)
    stepFunction?: string | null;                                // Optional tool or service associated with the step
    functionParams?: Record<string, string|boolean|number|object|unknown[]> | null;             // Optional parameters for the tool (supports arrays for json-rules-engine)
    next?: Array<string | WorkflowStep> | null;                  // Optional next steps (for branching)
    conditions?: Array<{ value: string; next: string }>; // Optional conditions for switch case branching steps
    onConditionPass?: string | WorkflowStep | null;              // Optional steps if condition passes
    onConditionFail?: string | WorkflowStep | null;              // Optional steps if condition fails
    onError?: string | WorkflowStep | null;                      // Optional error handling steps
    onTimeout?: string | WorkflowStep | null;                    // Optional timeout handling steps
    timeout?: number | null;                                     // Optional timeout in seconds
    retryCount?: number | null;                                  // Optional retry count on failure
    retryDelay?: number | null;                                  // Optional delay between retries in seconds

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
    mermaidDiagram?: string | null;                              // Optional Mermaid diagram representation
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
    description: z.string().optional().nullable(),
    status: TemplateStatusSchema,
    createdAt: isoString(),
    updatedAt: isoString(),
    createdBy: z.string(),
    updatedBy: z.string(),
    tags: z.array(z.string()).optional().nullable(),
    lastUsedAt: isoString().optional().nullable(),
    parentVersion: z.number().int().optional().nullable(),
    copiedFromTemplateId: z.string().optional().nullable(),
    copiedFromVersion: z.number().int().optional().nullable(),
    requestTemplateId: z.string().optional().nullable(),
    type: z.enum(['Request', 'MRF']).optional().nullable(),
});

export const WorkflowStepMetadataSchema = z.object({
    isNew: z.boolean().optional().nullable(),
    isModified: z.boolean().optional().nullable(),
    isDeleted: z.boolean().optional().nullable(),
    workflowVersion: z.number().int().optional().nullable(),
    createdAt: isoString().optional().nullable(),
    updatedAt: isoString().optional().nullable(),
    createdBy: z.string().optional().nullable(),
    updatedBy: z.string().optional().nullable(),
});

// Recursive step schema - use z.lazy for self-reference
export const WorkflowStepSchema: z.ZodType<WorkflowStep> = z.lazy(() =>
    // Define a recursive value schema for functionParams so objects become explicit records
    (() => {
        const ParamValue: z.ZodTypeAny = z.lazy(() =>
            z.union([
                z.string(),
                z.number(),
                z.boolean(),
                z.array(ParamValue), // Support arrays for json-rules-engine (all/any conditions)
                z.record(z.string(), ParamValue),
            ])
        );

        return z.object({
            id: z.string(),
            label: z.string(),
            type: z.string(),
            stepFunction: z.string().optional().nullable(),
            functionParams: z.record(z.string(), ParamValue).optional().nullable(),
        next: z.array(z.union([z.string(), WorkflowStepSchema])).optional().nullable(),
        // The interface uses a single step reference (string id or nested step) for these handlers
        onConditionPass: z.union([z.string(), WorkflowStepSchema]).optional().nullable(),
        onConditionFail: z.union([z.string(), WorkflowStepSchema]).optional().nullable(),
        onError: z.union([z.string(), WorkflowStepSchema]).optional().nullable(),
        onTimeout: z.union([z.string(), WorkflowStepSchema]).optional().nullable(),
            timeout: z.number().optional().nullable(),
            retryCount: z.number().int().optional().nullable(),
            retryDelay: z.number().optional().nullable(),
        })
    })()
) as unknown as z.ZodType<WorkflowStep>;

export const WorkflowDefinitionSchema = z.object({
    steps: z.array(WorkflowStepSchema),
});

export const WorkflowTemplateSchema = z.object({
    id: z.string(),
    account: z.string(),
    organization: z.string().optional().nullable(),
    version: z.string(),
    metadata: WorkflowTemplateMetadataSchema,
    workflowDefinition: WorkflowDefinitionSchema,
    mermaidDiagram: z.string().optional().nullable(),
});

export const WorkflowTemplateHistorySchema = z.object({
    id: z.string(),
    account: z.string(),
    organization: z.string().optional().nullable(),
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
    const errors = (result.error?.issues || []).map(e => {
        const path = e.path && e.path.length ? e.path.join('.') : '<root>';
        return `${path}: ${e.message}`;
    });
    return { valid: false, errors };
}

export function validateWorkflowTemplate(obj: unknown): ValidationSuccess<WorkflowTemplate> | ValidationFailure {
    const result = WorkflowTemplateSchema.safeParse(obj);
    if (result.success) return { valid: true, data: result.data };

    const errors = (result.error?.issues || []).map(e => {
        const path = e.path && e.path.length ? e.path.join('.') : '<root>';
        return `${path}: ${e.message}`;
    });
    return { valid: false, errors };
}


