import { env } from '@/app/lib/env';

/**
 * Client-side fetch wrapper that automatically prepends basePath to API calls
 * 
 * @example
 * // Instead of: fetch('/api/workflow-templates')
 * // Use: apiFetch('/api/workflow-templates')
 */
export const apiFetch = (
  input: string | URL,
  init?: RequestInit
  ): Promise<Response> => {
  if (input instanceof URL || input.toString().startsWith('http')) {
    return fetch(input, init);
  }

  // Client-side: use relative URL with basePath
  const url = `${env.basePath}${input}`;
  return fetch(url, init);
};
