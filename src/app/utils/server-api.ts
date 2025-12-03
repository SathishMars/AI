import { env } from '@/app/lib/env';
import { cookies } from 'next/headers';

/**
 * Server-side fetch wrapper for making internal API calls within Next.js
 * Constructs absolute URLs and optionally forwards cookies from the request context
 * 
 * IMPORTANT: This file can only be imported in server-side code (route handlers, server components)
 * Do not import this in client-side code or components marked with 'use client'
 * 
 * @example
 * // In a server component or route handler:
 * const response = await serverApiFetch('/api/request-templates', {
 *   headers: { 'x-account': '123' }
 * });
 */
export const serverApiFetch = async (
  input: string | URL,
  init?: RequestInit
): Promise<Response> => {
  if (input instanceof URL || input.toString().startsWith('http')) {
    return fetch(input, init);
  }

  const path = `${env.basePath}${input}`;
  const url = new URL(path, env.appUrl);

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('gpw_session');
  
  const headers = new Headers(init?.headers);
  if (sessionCookie) {
    headers.set('Cookie', `gpw_session=${sessionCookie.value}`);
  }

  return fetch(url.toString(), {
    ...init,
    headers,
  });
};


