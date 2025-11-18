import { NextRequest } from 'next/server';

/**
 * Helper to create NextRequest instances for testing
 * Uses the mocked NextRequest from __mocks__/next-server.ts
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, cookies = {} } = options;

  // Build cookie header string
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');

  // Create headers with cookie if provided
  const allHeaders: Record<string, string> = { ...headers };
  if (cookieHeader) {
    allHeaders.cookie = cookieHeader;
  }

  // Create NextRequest directly - the mock handles initialization
  const request = new NextRequest(url, {
    method,
    headers: allHeaders,
  });

  return request;
}

