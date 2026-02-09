/**
 * Data Access Layer (DAL) for Authentication and Session Management
 * 
 * Centralized session verification and authorization functions following Next.js best practices.
 * This DAL should be used in Server Components, Server Actions, and Route Handlers.
 * 
*/

import { cookies } from 'next/headers';
import { verifyUserToken, JWTVerificationError, UserJWTClaims } from './jwt-verifier';
import { env } from './env';
import { AuthenticationError, AuthorizationError } from './auth-errors';

export interface Session {
  userId: string;
  accountId: string;
  organizationId?: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresAt: Date;
  claims: UserJWTClaims;
}

/**
 * Verify user session from cookie
 * 
 * This is the central session verification function that should be used
 * in Server Components, Server Actions, and Route Handlers.
 * 
 * @returns Session object if authenticated, null if not
 */
export async function verifySession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(env.cookieName)?.value;
    
    if (!token) {
      return null;
    }
    
    const claims = await verifyUserToken(token);
    
    return {
      userId: claims.context.user_id,
      accountId: claims.context.account_id,
      organizationId: claims.context.organization_id,
      email: claims.context.email,
      firstName: claims.context.user_first_name,
      lastName: claims.context.user_last_name,
      expiresAt: new Date(claims.exp * 1000),
      claims,
    };
  } catch (error) {
    if (error instanceof JWTVerificationError) {
      console.error('[DAL] Session verification failed:', error.code);
      return null;
    }
    throw error;
  }
}

/**
 * Require an authenticated session
 * 
 * Throws an error if session is not valid. Use in Server Components,
 * Server Actions, and Route Handlers where authentication is required.
 * 
 * @throws AuthenticationError if session is not authenticated
 * @returns Session object (never null)
 */
export async function requireSession(): Promise<Session> {
  const session = await verifySession();
  if (!session) {
    throw new AuthenticationError('AUTHENTICATION_REQUIRED');
  }
  return session;
}

/**
 * Verify user session from a token string
 * 
 * Middleware-compatible version that accepts a token directly instead of
 * reading from cookies. Use this in Next.js middleware (Edge Runtime) where
 * cookies() from 'next/headers' is not available.
 * 
 * @param token - JWT token string
 * @returns Session object if authenticated, null if not
 */
export async function verifySessionFromToken(token: string | undefined): Promise<Session | null> {
  try {
    if (!token) {
      return null;
    }
    
    const claims = await verifyUserToken(token);
    
    return {
      userId: claims.context.user_id,
      accountId: claims.context.account_id,
      organizationId: claims.context.organization_id,
      email: claims.context.email,
      firstName: claims.context.user_first_name,
      lastName: claims.context.user_last_name,
      expiresAt: new Date(claims.exp * 1000),
      claims,
    };
  } catch (error) {
    if (error instanceof JWTVerificationError) {
      console.error('[DAL] Session verification from token failed:', error.code);
      return null;
    }
    throw error;
  }
}

/**
 * Require an authenticated session from a token string
 * 
 * Middleware-compatible version that accepts a token directly. Use this in
 * Next.js middleware (Edge Runtime) where cookies() from 'next/headers' is not available.
 * 
 * @param token - JWT token string
 * @throws AuthenticationError if session is not authenticated
 * @returns Session object (never null)
 */
export async function requireSessionFromToken(token: string | undefined): Promise<Session> {
  const session = await verifySessionFromToken(token);
  if (!session) {
    throw new AuthenticationError('AUTHENTICATION_REQUIRED');
  }
  return session;
}

/**
 * Get Rails base URL
*/
export function getRailsBaseUrl(): string {
  return env.railsBaseUrl;
}

/**
 * Check if user has access to a specific account
 * 
 * @param session - Authenticated session
 * @param accountId - Account ID to check access for
 * @returns true if user has access, false otherwise
 */
export function hasAccountAccess(session: Session, accountId: string): boolean {
  return session.accountId === accountId;
}

/**
 * Require account access
 * 
 * Throws an error if user doesn't have access to the specified account.
 * 
 * @param session - Authenticated session
 * @param accountId - Account ID to check access for
 * @throws AuthorizationError if user doesn't have account access
 */
export function requireAccountAccess(session: Session, accountId: string): void {
  if (!hasAccountAccess(session, accountId)) {
    throw new AuthorizationError(
      'ACCOUNT_ACCESS_DENIED',
      `Forbidden: Account access denied for account ${accountId}`
    );
  }
}

/**
 * Check if user has access to a specific organization
 * 
 * @param session - Authenticated session
 * @param organizationId - Organization ID to check access for
 * @returns true if user has access, false otherwise
 */
export function hasOrganizationAccess(session: Session, organizationId: string): boolean {
  return session.organizationId === organizationId;
}

/**
 * Require organization access
 * 
 * Throws an error if user doesn't have access to the specified organization.
 * 
 * @param session - Authenticated session
 * @param organizationId - Organization ID to check access for
 * @throws AuthorizationError if user doesn't have organization access
 */
export function requireOrganizationAccess(session: Session, organizationId: string): void {
  if (!hasOrganizationAccess(session, organizationId)) {
    throw new AuthorizationError(
      'ORGANIZATION_ACCESS_DENIED',
      `Forbidden: Organization access denied for organization ${organizationId}`
    );
  }
}
