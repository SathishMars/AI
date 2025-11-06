/**
 * Authentication and Authorization Types
 * 
 * Defines JWT claims, viewer patterns, and authentication state
 * for the Workflows Next.js application.
 */

/**
 * Standard JWT Claims
 * Following RFC 7519 for registered claims
 */
export interface JWTClaims {
  // Standard registered claims
  iss: string;              // Issuer (e.g., "groupize")
  aud: string;              // Audience (e.g., "workflows")
  sub: string;              // Subject (user ID)
  exp: number;              // Expiration time (Unix timestamp)
  nbf: number;              // Not before (Unix timestamp)
  iat: number;              // Issued at (Unix timestamp)
  
  // Custom application claims
  account_id: string;
  organization_id?: string | null;  // Optional for account-level access
  email: string;
  user_first_name: string;
  user_last_name: string;
  user_name: string;
}

/**
 * CurrentUser - Minimal user representation for SSR
 * 
 * This is derived from JWT claims and passed from server to client
 * to avoid hydration mismatches. Never contains the raw token.
 */
export interface CurrentUser {
  userId: string;
  accountId: string;
  organizationId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isAuthenticated: true;  // Type guard - only authenticated users have a CurrentUser
}

/**
 * Null current user for unauthenticated state
 */
export interface NullCurrentUser {
  isAuthenticated: false;
}

/**
 * Union type for current user state
 */
export type CurrentUserState = CurrentUser | NullCurrentUser;

/**
 * Authentication context provided to client components
 */
export interface AuthContextValue {
  currentUser: CurrentUserState;
  isLoading: boolean;
  error: AuthError | null;
}

/**
 * JWT verification result
 */
export interface JWTVerificationResult {
  success: true;
  claims: JWTClaims;
  currentUser: CurrentUser;
}

export interface JWTVerificationError {
  success: false;
  error: AuthError;
}

export type JWTVerification = JWTVerificationResult | JWTVerificationError;

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  // Token errors
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_NOT_YET_VALID = 'TOKEN_NOT_YET_VALID',
  
  // Signature errors
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  JWKS_FETCH_FAILED = 'JWKS_FETCH_FAILED',
  
  // Claims errors
  CLAIMS_INVALID = 'CLAIMS_INVALID',
  AUDIENCE_MISMATCH = 'AUDIENCE_MISMATCH',
  ISSUER_MISMATCH = 'ISSUER_MISMATCH',
  
  // General errors
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Authentication error
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: string;
  statusCode?: number;
}

/**
 * Type guard to check if current user is authenticated
 */
export function isAuthenticated(currentUser: CurrentUserState): currentUser is CurrentUser {
  return currentUser.isAuthenticated === true;
}

/**
 * Helper to create a CurrentUser from JWT claims
 */
export function createCurrentUserFromClaims(claims: JWTClaims): CurrentUser {
  return {
    userId: claims.sub,
    accountId: claims.account_id,
    organizationId: claims.organization_id || null,
    email: claims.email,
    firstName: claims.user_first_name,
    lastName: claims.user_last_name,
    fullName: claims.user_name,
    isAuthenticated: true,
  };
}

/**
 * Null current user constant
 */
export const NULL_CURRENT_USER: NullCurrentUser = {
  isAuthenticated: false,
};

