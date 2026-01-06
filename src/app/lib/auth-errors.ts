/**
 * Authentication and Authorization Error Classes
 * 
 * Custom error classes for better error handling and type safety in route handlers.
 * These errors can be caught and converted to appropriate HTTP status codes.
 */

export type AuthErrorCode = 
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHORIZATION_DENIED'
  | 'ACCOUNT_ACCESS_DENIED'
  | 'ORGANIZATION_ACCESS_DENIED';

/**
 * Authentication Error
 * 
 * Thrown when a user is not authenticated (missing or invalid session/token).
 * Should result in a 401 Unauthorized response.
 */
export class AuthenticationError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number = 401;

  constructor(
    code: AuthErrorCode = 'AUTHENTICATION_REQUIRED',
    message?: string
  ) {
    const defaultMessage = code === 'AUTHENTICATION_REQUIRED'
      ? 'Unauthorized: Session required'
      : 'Unauthorized';
    
    super(message || defaultMessage);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

/**
 * Authorization Error
 * 
 * Thrown when a user is authenticated but doesn't have permission for the requested resource.
 * Should result in a 403 Forbidden response.
 */
export class AuthorizationError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number = 403;

  constructor(
    code: AuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

