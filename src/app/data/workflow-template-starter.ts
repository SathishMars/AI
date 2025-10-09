import { WorkflowTemplate } from "@/app/types/workflowTemplate";

export const workflowTemplateStarter: WorkflowTemplate = {
    id: "needs-to-be-set",  // 10-char short-id (auto-generated, composite key)
    account: "needs-to-be-set",  // Account ID (composite key)
    organization: null,  // Optional organization ID (composite key)
    version: "0.1.0",  // Version number (auto-incremented, composite key)
    metadata: {
        label: "New Workflow Template",  // Template label (human readable name)
        description: "A brief description of the workflow template.",  // Optional description
        status: "draft",  // Lifecycle status
        createdAt: new Date().toISOString(),  // ISO timestamp of creation
        updatedAt: new Date().toISOString(),  // ISO timestamp of last update
        createdBy: "needs-to-be-set",  // User ID of creator
        updatedBy: "needs-to-be-set",  // User ID of last updater
        tags: [],  // Optional tags for categorization
    },
    workflowDefinition: {
        steps: []  // Array of workflow steps
    },
    mermaidDiagram: "",  // Optional Mermaid diagram representation 
};
