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

/**
 * Get the GraphQL server URL for direct connection
 * Falls back to localhost:4000 for development
 */
export const getGraphQLUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use public env var or default to localhost
    return process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
  }
  // Server-side: use server env var or default to localhost
  return process.env.GRAPHQL_URL || 'http://localhost:4000/graphql';
};
