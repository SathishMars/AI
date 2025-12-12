// Workflows/src/app/lib/rails-fetcher.ts

import { NextRequest } from 'next/server';
import { env } from '@/app/lib/env';

/**
 * Custom error class for Rails API errors
 */
export class RailsApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public details?: string,
    message?: string
  ) {
    super(message || `Rails API error: ${statusText}`);
    this.name = 'RailsApiError';
  }
}

/**
 * Rails API Fetcher Utility
 * 
 * Centralized utility for making authenticated requests to the Rails backend.
 * Handles JWT token extraction, header construction, and error handling.
 * 
 * Throws RailsApiError for non-ok responses, allowing routes to handle errors appropriately.
 * 
 * @example
 * try {
 *   const data = await railsFetch(request, '/api/v1/requests', {
 *     method: 'GET',
 *     searchParams: { template: 'true', account_id: accountId }
 *   });
 *   return NextResponse.json(data);
 * } catch (error) {
 *   if (error instanceof RailsApiError) {
 *     return NextResponse.json(
 *       { error: 'Failed to fetch from Rails', details: error.details },
 *       { status: error.status }
 *     );
 *   }
 *   throw error;
 * }
 */
export async function railsFetch<T = unknown>(
  request: NextRequest,
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    searchParams?: Record<string, string | number | boolean>;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const jwtToken = request.cookies.get(env.cookieName)?.value || '';
  const railsBaseUrl = env.railsBaseUrl;
  const url = new URL(path, railsBaseUrl);

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = new Headers({
    'Authorization': `Bearer ${jwtToken}`,
    'Cookie': `gpw_session=${jwtToken}`,
    'Accept': 'application/json',
    ...options.headers,
  });

  if (options.body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new RailsApiError(
        response.status,
        response.statusText,
        errorText
      );
    }

    const data = await response.json() as T;
    return data;
  } catch (error) {
    if (error instanceof RailsApiError) {
      throw error;
    }
    
    console.error('[Rails Fetcher] Unexpected error:', error);
    throw new RailsApiError(
      500,
      'Internal Server Error',
      error instanceof Error ? error.message : String(error),
      'Failed to communicate with Rails API'
    );
  }
}

