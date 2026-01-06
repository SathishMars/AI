// INSIGHTS-SPECIFIC: User-facing messages and text strings
// This file centralizes all user-facing text to allow product management to modify wording
// without requiring code changes.

/**
 * Messages for out-of-scope queries
 */
export const OUT_OF_SCOPE_MESSAGE = `I appreciate your question. However, that topic falls outside the scope of attendee data analysis. I'm specialized in providing insights about attendees, their registration status, travel requests, profiles, and data quality. For information about hotel proposals, event logistics, budgets, sponsorships, or other topics, please check the relevant systems (such as the eBid system) or contact your event manager or appropriate team. Is there anything related to attendee data I can help you with?`;

/**
 * Messages for PII (Personally Identifiable Information) blocked queries
 */
export const PII_BLOCKED_MESSAGE = `AIME Insights policy prohibits the disclosure of personal data, including dietary restrictions. This information is considered out of scope and PII, and cannot be disclosed. I can provide statistical trends or high-level attendee profiles upon request.`;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  CONNECTION_ERROR: "I'm having trouble connecting to my brain right now. Please try again.",
  PROCESSING_ERROR: "I'm sorry, I encountered an error while processing your request.",
  SERVICE_UNAVAILABLE: "Sorry, I'm having trouble connecting to the service right now.",
} as const;

/**
 * Category display names (for UI/future use)
 * These map to the technical category codes used in the system
 */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  statistics_summaries: "Statistics & Summaries",
  registration_status: "Registration Status",
  travel_logistics: "Travel & Logistics",
  profiles_roles: "Profiles & Roles",
  temporal_patterns: "Temporal Patterns",
  data_quality: "Data Quality",
} as const;

/**
 * Scope display names
 */
export const SCOPE_DISPLAY_NAMES: Record<string, string> = {
  in_scope: "In Scope",
  out_of_scope: "Out of Scope",
  pii_blocked: "PII Blocked",
  fallback_error: "Error",
} as const;

/**
 * Helper function to get error message by key
 */
export function getErrorMessage(key: keyof typeof ERROR_MESSAGES): string {
  return ERROR_MESSAGES[key];
}

/**
 * Helper function to get category display name
 */
export function getCategoryDisplayName(category: string): string {
  return CATEGORY_DISPLAY_NAMES[category] || category;
}

/**
 * Helper function to get scope display name
 */
export function getScopeDisplayName(scope: string): string {
  return SCOPE_DISPLAY_NAMES[scope] || scope;
}

