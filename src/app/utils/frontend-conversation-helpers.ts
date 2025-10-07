// src/app/utils/frontend-conversation-helpers.ts

/**
 * Frontend helper utilities for conversation management
 * These utilities help frontend components work with natural key components
 * (account, organization, workflowTemplateName) directly
 */

export interface WorkflowContext {
  account: string;
  organization?: string | null;
  workflowTemplateId?: string;
  workflowTemplateName: string;
}

/**
 * Create API request data for conversation endpoints using natural key components
 * This is the main helper that frontend components should use
 */
export function createConversationApiData(
  context: WorkflowContext,
  additionalData: Record<string, unknown> = {}
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    account: context.account,
    organization: context.organization || null,
    templateName: context.workflowTemplateName
  };

  if (context.workflowTemplateId) {
    base.templateId = context.workflowTemplateId;
  }

  return {
    ...base,
    ...additionalData
  };
}

/**
 * Helper to determine if frontend should use backend conversation persistence
 * Returns true if we have enough context to use the database conversation system
 */
export function shouldUseDatabaseConversations(
  account?: string,
  workflowTemplateId?: string
): boolean {
  if (!account) return false;
  if (!workflowTemplateId) return false;
  const normalizedId = workflowTemplateId.trim().toLowerCase();
  return normalizedId !== '' && normalizedId !== 'new' && normalizedId !== 'new-workflow';
}

/**
 * Create a simple key string for frontend tracking (not for API use)
 * This is just for internal frontend state management
 */
export function createFrontendKey(
  account: string,
  organization: string | null,
  workflowTemplateId: string,
  workflowTemplateName: string
): string {
  const baseId = workflowTemplateId || workflowTemplateName;
  return organization 
    ? `${account}-${organization}-${baseId}`
    : `${account}-${baseId}`;
}