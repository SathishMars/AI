/**
 * Workflow Template Service
 * 
 * Shared business logic for workflow template operations.
 * Used by both public and internal API routes.
 */

import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import { WorkflowTemplate, WorkflowTemplateSchema, TemplateStatus } from '@/app/types/workflowTemplate';

/**
 * Parameters for listing templates
 */
export interface ListTemplatesParams {
  account: string;
  organization: string | null | undefined; // undefined/null = account-level only, string = account-level + org-level templates
  page: number;
  pageSize: number;
  status?: TemplateStatus[];
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  type?: 'Request' | 'MRF'; // filter by workflow type
}

/**
 * Parameters for creating a template
 */
export interface CreateTemplateParams {
  account: string;
  organization?: string;
  templateData: unknown;
}

/**
 * List workflow templates with filtering and pagination
 * 
 * @param params - Query parameters
 * @returns Paginated list of templates
 * @throws Error if validation fails
 */
export async function listTemplates(params: ListTemplatesParams) {
  const { 
    account, 
    organization, 
    page, 
    pageSize, 
    status, 
    tags, 
    createdAfter, 
    createdBefore,
    type
  } = params;
  
  // Validate pagination
  if (page < 1) {
    throw new Error('Page must be greater than 0');
  }
  
  if (pageSize < 1) {
    throw new Error('Page size must be greater than 0');
  }
  
  if (pageSize > 100) {
    throw new Error('Page size must not exceed 100');
  }
  
  // Query database
  const result = await WorkflowTemplateDbUtil.list(account, {
    organization,
    status,
    label: undefined,
    tags,
    createdAfter,
    createdBefore,
    type,
  }, page, pageSize);
  
  return result;
}

/**
 * Create a new workflow template
 * 
 * @param params - Template creation parameters
 * @returns Created template
 * @throws Error if validation fails
 */
export async function createTemplate(params: CreateTemplateParams) {
  const { account, organization, templateData } = params;
  
  // Add account/org context to template data
  const inputWithContext: Record<string, unknown> = {
    ...(templateData as Record<string, unknown>),
    account,
  };
  
  if (organization !== undefined) {
    inputWithContext.organization = organization;
  }
  
  // Validate against schema
  const validationResult = WorkflowTemplateSchema.safeParse(inputWithContext);
  if (!validationResult.success) {
    const errorMessages = (validationResult.error?.issues || []).map(e => e.message).join(', ');
    throw new Error(`Invalid template data: ${errorMessages}`);
  }
  
  const templateInput = validationResult.data as WorkflowTemplate;
  
  // Auto-extract and store requestTemplateId and type in metadata from workflow definition
  const requestTemplateId = WorkflowTemplateDbUtil.findRequestTemplateId(templateInput.workflowDefinition?.steps);
  if (requestTemplateId) {
    templateInput.metadata.requestTemplateId = requestTemplateId;
  }
  const workflowType = WorkflowTemplateDbUtil.findWorkflowType(templateInput.workflowDefinition?.steps);
  if (workflowType) {
    templateInput.metadata.type = workflowType;
  }
  
  // Create in database
  const created = await WorkflowTemplateDbUtil.create(templateInput);
  
  return created;
}

