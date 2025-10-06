// src/app/utils/workflow-template-migration.ts
/**
 * Migration utilities for converting between WorkflowJSON and WorkflowTemplate formats
 * 
 * This utility provides:
 * - Conversion from legacy WorkflowJSON to new WorkflowTemplate format
 * - Conversion from WorkflowTemplate to legacy WorkflowJSON (for backward compatibility)
 * - Validation and error handling
 */

import { WorkflowJSON, WorkflowStep } from '@/app/types/workflow';
import { 
  WorkflowTemplate,
  WorkflowDefinition,
  CreateWorkflowTemplateInput
} from '@/app/types/workflow-template-v2';
import { generateShortId } from './short-id-generator';

/**
 * Convert legacy WorkflowJSON to clean WorkflowDefinition
 * 
 * Removes embedded metadata and returns only the steps array
 */
export function workflowJSONToDefinition(workflowJSON: WorkflowJSON): WorkflowDefinition {
  return {
    steps: workflowJSON.steps as WorkflowStep[] // Type assertion safe - validated by WorkflowJSON schema
  };
}

/**
 * Convert WorkflowJSON to full WorkflowTemplate
 * 
 * This is used when migrating from the old format to the new format.
 * Extracts metadata from WorkflowJSON and creates a proper WorkflowTemplate.
 * 
 * @param workflowJSON - Legacy workflow format
 * @param account - Account identifier
 * @param organization - Organization identifier (null for account-wide)
 * @returns Complete WorkflowTemplate
 */
export function workflowJSONToTemplate(
  workflowJSON: WorkflowJSON,
  account: string,
  organization: string | null = null
): WorkflowTemplate {
  const now = new Date();
  
  // Extract metadata from WorkflowJSON
  const metadata = workflowJSON.metadata;
  
  return {
    // Composite key
    account,
    organization,
    id: generateShortId(),                    // Generate new 10-char ID
    version: metadata.version || '1.0.0',
    
    // Template properties
    name: metadata.name || 'Untitled Workflow',
    status: metadata.status || 'draft',
    
    // Clean workflow definition (no metadata)
    workflowDefinition: {
      steps: workflowJSON.steps as WorkflowStep[] // Type assertion safe - validated by WorkflowJSON schema
    },
    
    // Mermaid diagram (if exists)
    mermaidDiagram: workflowJSON.mermaidDiagram,
    
    // Metadata
    metadata: {
      createdAt: metadata.createdAt || now,
      updatedAt: metadata.updatedAt || now,
      publishedAt: metadata.status === 'published' ? now : undefined,
      author: metadata.createdBy,
      description: metadata.description,
      tags: metadata.tags || []
    }
  };
}

/**
 * Convert WorkflowTemplate to legacy WorkflowJSON format
 * 
 * Used for backward compatibility with components that still expect WorkflowJSON.
 * This will be deprecated once all components are migrated.
 * 
 * @param template - New WorkflowTemplate format
 * @returns Legacy WorkflowJSON format
 */
export function templateToWorkflowJSON(template: WorkflowTemplate): WorkflowJSON {
  return {
    schemaVersion: '1.0.0',
    
    // Reconstruct metadata from template fields
    metadata: {
      id: template.id,
      name: template.name,
      description: template.metadata.description,
      version: template.version,
      status: template.status === 'published' ? 'published' : 'draft',
      createdAt: template.metadata.createdAt,
      updatedAt: template.metadata.updatedAt,
      createdBy: template.metadata.author,
      tags: template.metadata.tags || []
    },
    
    // Steps from workflow definition
    steps: template.workflowDefinition.steps,
    
    // Mermaid diagram
    mermaidDiagram: template.mermaidDiagram
  };
}

/**
 * Convert WorkflowDefinition to WorkflowJSON
 * 
 * Used when component receives WorkflowDefinition but needs WorkflowJSON format.
 * Creates a minimal WorkflowJSON with default metadata.
 * 
 * @param definition - Workflow definition with steps
 * @returns WorkflowJSON for component use
 */
export function workflowDefinitionToJSON(definition: WorkflowDefinition): WorkflowJSON {
  return {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'temp-id',
      name: 'Untitled Workflow',
      version: '1.0.0',
      status: 'draft',
      tags: []
    },
    steps: definition.steps
  };
}

/**
 * Convert CreateWorkflowTemplateInput to WorkflowTemplate
 * 
 * Used when creating a new template from input data.
 * Generates all auto-generated fields.
 * 
 * @param input - Template creation input
 * @returns Complete WorkflowTemplate ready for database
 */
export function createInputToTemplate(input: CreateWorkflowTemplateInput): WorkflowTemplate {
  const now = new Date();
  
  return {
    // Composite key
    account: input.account,
    organization: input.organization || null,
    id: generateShortId(),                    // Auto-generate 10-char ID
    version: '1.0.0',                         // Always start at 1.0.0
    
    // Template properties
    name: input.name,
    status: 'draft',                          // New templates always start as draft
    
    // Workflow definition
    workflowDefinition: input.workflowDefinition,
    
    // Metadata
    metadata: {
      createdAt: now,
      updatedAt: now,
      author: input.author,
      description: input.description,
      category: input.category,
      tags: input.tags || []
    }
  };
}

/**
 * Extract template name from various sources
 * 
 * Priority: name field > metadata.name > 'Untitled'
 */
export function extractTemplateName(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    
    // Check direct name field
    if (typeof obj.name === 'string' && obj.name) {
      return obj.name;
    }
    
    // Check metadata.name
    if (typeof obj.metadata === 'object' && obj.metadata !== null) {
      const metadata = obj.metadata as Record<string, unknown>;
      if (typeof metadata.name === 'string' && metadata.name) {
        return metadata.name;
      }
    }
  }
  
  return 'Untitled Workflow';
}

/**
 * Validate template name is not a reserved word
 */
export function validateTemplateName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim().toLowerCase();
  
  if (!trimmed) {
    return { valid: false, error: 'Template name cannot be empty' };
  }
  
  const reserved = ['new', 'create', 'untitled'];
  if (reserved.includes(trimmed)) {
    return { valid: false, error: `'${name}' is a reserved word and cannot be used as template name` };
  }
  
  return { valid: true };
}

/**
 * Check if data is in legacy WorkflowJSON format
 */
export function isLegacyWorkflowJSON(data: unknown): data is WorkflowJSON {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  
  // WorkflowJSON has 'metadata' and 'steps' at top level
  return (
    typeof obj.metadata === 'object' &&
    obj.metadata !== null &&
    Array.isArray(obj.steps)
  );
}

/**
 * Check if data is in new WorkflowTemplate format
 */
export function isWorkflowTemplate(data: unknown): data is WorkflowTemplate {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  
  // WorkflowTemplate has 'account', 'id', 'workflowDefinition' at top level
  return (
    typeof obj.account === 'string' &&
    typeof obj.id === 'string' &&
    typeof obj.workflowDefinition === 'object' &&
    obj.workflowDefinition !== null
  );
}

/**
 * Normalize data to WorkflowTemplate format
 * 
 * Accepts either legacy WorkflowJSON or new WorkflowTemplate format
 * and ensures output is always WorkflowTemplate.
 * 
 * @param data - Data in any format
 * @param account - Account identifier (required for conversion)
 * @param organization - Organization identifier (optional)
 * @returns WorkflowTemplate or throws error
 */
export function normalizeToTemplate(
  data: unknown,
  account: string,
  organization: string | null = null
): WorkflowTemplate {
  // Already in new format
  if (isWorkflowTemplate(data)) {
    return data;
  }
  
  // Legacy format - convert
  if (isLegacyWorkflowJSON(data)) {
    return workflowJSONToTemplate(data, account, organization);
  }
  
  throw new Error('Invalid workflow data format: must be WorkflowTemplate or WorkflowJSON');
}

/**
 * Normalize data to WorkflowJSON format (for backward compatibility)
 * 
 * Accepts either new WorkflowTemplate or legacy WorkflowJSON format
 * and ensures output is always WorkflowJSON.
 * 
 * @param data - Data in any format
 * @returns WorkflowJSON or throws error
 */
export function normalizeToWorkflowJSON(data: unknown): WorkflowJSON {
  // Already in legacy format
  if (isLegacyWorkflowJSON(data)) {
    return data;
  }
  
  // New format - convert
  if (isWorkflowTemplate(data)) {
    return templateToWorkflowJSON(data);
  }
  
  throw new Error('Invalid workflow data format: must be WorkflowTemplate or WorkflowJSON');
}
