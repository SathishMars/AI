/**
 * API fetch utility that respects Next.js basePath
 * 
 * When basePath is set (e.g., '/aime'), regular fetch('/api/...') goes to root
 * This helper ensures API calls go through the correct basePath
 */

// Hardcoded basePath - must match next.config.ts
// DO NOT use env variable as it can get out of sync
export const BASE_PATH = '/aime/aimeworkflows';

/**
 * Fetch wrapper that automatically prepends basePath to API calls
 * 
 * @example
 * // Instead of: fetch('/api/workflow-templates')
 * // Use: apiFetch('/api/workflow-templates')
 */
export const apiFetch = (
  input: string | URL,
  init?: RequestInit
): Promise<Response> => {
  // If it's a full URL, use it as-is
  if (input instanceof URL || input.toString().startsWith('http')) {
    return fetch(input, init);
  }
  
  // Otherwise, prepend basePath
  const url = `${BASE_PATH}${input}`;
  return fetch(url, init);
};

/**
 * Get the full API URL with basePath
 * Useful for debugging or logging
 */
export const getApiUrl = (path: string): string => {
  return `${BASE_PATH}${path}`;
};

