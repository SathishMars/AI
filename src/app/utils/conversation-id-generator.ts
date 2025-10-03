// src/app/utils/conversation-id-generator.ts
/**
 * Conversation ID Generator Utility
 * 
 * Generates deterministic conversation IDs based on account, organization, and workflow template name.
 * This ensures each conversation has a predictable, meaningful identifier that can be used
 * for frontend state management without requiring database lookups.
 */

/**
 * Generate a deterministic conversation ID from account, organization, and workflow template name
 * 
 * Format: account--org--templateName or account--templateName (if no organization)
 * 
 * @param account - Account identifier
 * @param organization - Organization identifier (can be null, undefined, or empty string)
 * @param workflowTemplateName - Workflow template name
 * @returns Deterministic conversation ID
 */
export function generateConversationId(
  account: string,
  organization: string | null | undefined,
  workflowTemplateName: string
): string {
  // Sanitize inputs to ensure URL-safe and consistent IDs
  const sanitizedAccount = sanitizeIdComponent(account);
  const sanitizedTemplate = sanitizeIdComponent(workflowTemplateName);
  
  // Handle null, undefined, or empty organization
  const hasOrganization = organization && organization.trim() !== '';
  
  if (hasOrganization) {
    const sanitizedOrg = sanitizeIdComponent(organization);
    return `${sanitizedAccount}--${sanitizedOrg}--${sanitizedTemplate}`;
  } else {
    return `${sanitizedAccount}--${sanitizedTemplate}`;
  }
}

/**
 * Parse a conversation ID back into its components
 * 
 * @param conversationId - The conversation ID to parse
 * @returns Object with account, organization, and workflowTemplateName
 */
export function parseConversationId(conversationId: string): {
  account: string;
  organization: string | null;
  workflowTemplateName: string;
} {
  const parts = conversationId.split('--');
  
  if (parts.length === 2) {
    // Format: account--templateName (no organization)
    return {
      account: desanitizeIdComponent(parts[0]),
      organization: null,
      workflowTemplateName: desanitizeIdComponent(parts[1])
    };
  } else if (parts.length === 3) {
    // Format: account--org--templateName
    return {
      account: desanitizeIdComponent(parts[0]),
      organization: desanitizeIdComponent(parts[1]),
      workflowTemplateName: desanitizeIdComponent(parts[2])
    };
  } else {
    throw new Error(`Invalid conversation ID format: ${conversationId}`);
  }
}

/**
 * Validate if a conversation ID has the correct format
 * 
 * @param conversationId - The conversation ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidConversationId(conversationId: string): boolean {
  try {
    const parsed = parseConversationId(conversationId);
    return !!(parsed.account && parsed.workflowTemplateName);
  } catch {
    return false;
  }
}

/**
 * Generate a human-readable display name for a conversation
 * 
 * @param conversationId - The conversation ID
 * @returns Human-readable name
 */
export function getConversationDisplayName(conversationId: string): string {
  try {
    const { organization, workflowTemplateName } = parseConversationId(conversationId);
    
    if (organization) {
      return `${workflowTemplateName} (${organization})`;
    } else {
      return workflowTemplateName;
    }
  } catch {
    return conversationId; // Fallback to raw ID if parsing fails
  }
}

/**
 * Sanitize a component for use in conversation ID
 * Makes it URL-safe and consistent
 */
function sanitizeIdComponent(component: string): string {
  return component
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-') // Replace non-alphanumeric with dashes
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
}

/**
 * Reverse the sanitization to get original component name
 */
function desanitizeIdComponent(component: string): string {
  // For now, just return as-is since we're using this for display
  // In the future, we could store a mapping if we need exact reconstruction
  return component;
}

/**
 * Generate conversation ID for account-wide templates
 */
export function generateAccountWideConversationId(
  account: string,
  workflowTemplateName: string
): string {
  return generateConversationId(account, null, workflowTemplateName);
}

/**
 * Generate conversation ID for organization-specific templates
 */
export function generateOrgSpecificConversationId(
  account: string,
  organization: string,
  workflowTemplateName: string
): string {
  return generateConversationId(account, organization, workflowTemplateName);
}

/**
 * Check if a conversation ID represents an account-wide conversation
 */
export function isAccountWideConversation(conversationId: string): boolean {
  try {
    const { organization } = parseConversationId(conversationId);
    return organization === null;
  } catch {
    return false;
  }
}

/**
 * Examples:
 * 
 * generateConversationId('groupize-demos', null, 'Employee Onboarding')
 * // Returns: "groupize-demos--employee-onboarding"
 * 
 * generateConversationId('groupize-demos', 'HR Department', 'Performance Review Workflow')
 * // Returns: "groupize-demos--hr-department--performance-review-workflow"
 * 
 * parseConversationId('groupize-demos--hr-department--performance-review-workflow')
 * // Returns: { account: "groupize-demos", organization: "hr-department", workflowTemplateName: "performance-review-workflow" }
 */