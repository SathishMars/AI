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

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/aime';
  const url = `${basePath}${input}`;
  return fetch(url, init);
};
