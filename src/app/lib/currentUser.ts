/**
 * Server-Side Current User Utility
 * 
 * Provides access to the authenticated current user in Server Components and Server Actions.
 * Reads from headers injected by middleware (never reads cookies directly on client).
 * 
 * This implements the "Current User Pattern" for SSR:
 * - Server: Read current user from middleware-injected headers
 * - Pass to client as initialCurrentUser prop
 * - Client: Never reads httpOnly cookies
 * 
 * Benefits:
 * - No hydration mismatches
 * - Security (JWT cookie is httpOnly)
 * - Type-safe current user access
 */

import { headers } from 'next/headers';
import { CurrentUser, CurrentUserState, NULL_CURRENT_USER } from '@/app/types/auth';

/**
 * Get the current authenticated user from server context
 * 
 * This should ONLY be called from:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 * 
 * @returns CurrentUser if authenticated, NULL_CURRENT_USER if not
 */
export async function getCurrentUser(): Promise<CurrentUserState> {
  try {
    const headersList = await headers();
    
    // Read user context from headers injected by middleware
    const userId = headersList.get('x-user-id');
    const email = headersList.get('x-user-email');
    const firstName = headersList.get('x-user-first-name');
    const lastName = headersList.get('x-user-last-name');
    const fullName = headersList.get('x-user-full-name');
    const accountId = headersList.get('x-account-id');
    const organizationId = headersList.get('x-organization-id');
    
    // If any required field is missing, return null current user
    if (!userId || !email || !firstName || !lastName || !fullName || !accountId) {
      console.warn('[getCurrentUser] Missing required user headers');
      return NULL_CURRENT_USER;
    }
    
    const currentUser: CurrentUser = {
      userId,
      accountId,
      organizationId: organizationId || null,
      email,
      firstName,
      lastName,
      fullName,
      isAuthenticated: true,
    };
    
    return currentUser;
  } catch (error) {
    console.error('[getCurrentUser] Error reading current user from headers:', error);
    return NULL_CURRENT_USER;
  }
}

/**
 * Require authentication - throw error if not authenticated
 * 
 * Use this in Server Components/Actions that absolutely require authentication
 * 
 * @throws Error if not authenticated
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();
  
  if (!currentUser.isAuthenticated) {
    throw new Error('Authentication required');
  }
  
  return currentUser;
}

/**
 * Get account ID from current user
 * 
 * Convenience method for getting the account ID
 */
export async function getAccountId(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  return currentUser.isAuthenticated ? currentUser.accountId : null;
}

/**
 * Get organization ID from current user
 * 
 * Convenience method for getting the organization ID
 */
export async function getOrganizationId(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  return currentUser.isAuthenticated ? currentUser.organizationId || null : null;
}

/**
 * Check if current user is authenticated
 * 
 * Type guard for server-side authentication checks
 */
export async function isAuthenticated(): Promise<boolean> {
  const currentUser = await getCurrentUser();
  return currentUser.isAuthenticated;
}

