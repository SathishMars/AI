
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
    tool?: string;                                        // Optional tool or service associated with the step
    toolParams?: Record<string, unknown>;                 // Optional parameters for the tool
    next?: Array<string | WorkflowStep>;                  // Optional next steps (for branching)
    onConditionPass?: Array<string | WorkflowStep>;       // Optional steps if condition passes
    onConditionFail?: Array<string | WorkflowStep>;       // Optional steps if condition fails
    onError?: Array<string | WorkflowStep>;               // Optional error handling steps
    onTimeout?: Array<string | WorkflowStep>;             // Optional timeout handling steps
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

