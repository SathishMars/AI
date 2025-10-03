// src/app/utils/frontend-conversation-helpers.ts

/**
 * Frontend helper utilities for conversation management
 * These utilities help frontend components work with natural key components
 * (account, organization, workflowTemplateName) directly
 */

export interface WorkflowContext {
  account: string;
  organization?: string | null;
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
  return {
    account: context.account,
    organization: context.organization || null,
    templateName: context.workflowTemplateName,
    ...additionalData
  };
}

/**
 * Helper to determine if frontend should use backend conversation persistence
 * Returns true if we have enough context to use the database conversation system
 */
export function shouldUseDatabaseConversations(
  account?: string,
  workflowTemplateName?: string
): boolean {
  return !!(account && workflowTemplateName);
}

/**
 * Create a simple key string for frontend tracking (not for API use)
 * This is just for internal frontend state management
 */
export function createFrontendKey(
  account: string,
  organization: string | null,
  workflowTemplateName: string
): string {
  return organization 
    ? `${account}-${organization}-${workflowTemplateName}`
    : `${account}-${workflowTemplateName}`;
}