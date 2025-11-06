/**
 * HTTP Error Handling Types
 * 
 * Standardized error types and utilities for consistent error handling
 * across the application, including both server and client code.
 */

/**
 * Standard HTTP error codes
 */
export enum HttpErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * HTTP Error class
 * 
 * Extends native Error with HTTP-specific properties
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isHttpError = true;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code || `HTTP_${statusCode}`;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        statusCode: this.statusCode,
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }

  /**
   * Type guard to check if error is HttpError
   */
  static isHttpError(error: unknown): error is HttpError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isHttpError' in error &&
      error.isHttpError === true
    );
  }
}

/**
 * Specific HTTP error classes for common scenarios
 */

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', details?: unknown) {
    super(HttpErrorCode.BAD_REQUEST, message, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(HttpErrorCode.UNAUTHORIZED, message, 'UNAUTHORIZED', details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(HttpErrorCode.FORBIDDEN, message, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', details?: unknown) {
    super(HttpErrorCode.NOT_FOUND, message, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', details?: unknown) {
    super(HttpErrorCode.CONFLICT, message, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal Server Error', details?: unknown) {
    super(HttpErrorCode.INTERNAL_SERVER_ERROR, message, 'INTERNAL_SERVER_ERROR', details);
    this.name = 'InternalServerError';
  }
}

/**
 * Error response type for API responses
 */
export interface ErrorResponse {
  error: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(obj: unknown): obj is ErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof obj.error === 'object' &&
    obj.error !== null &&
    'statusCode' in obj.error &&
    'message' in obj.error
  );
}

/**
 * Convert any error to HttpError
 */
export function toHttpError(error: unknown): HttpError {
  if (HttpError.isHttpError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new InternalServerError('An unknown error occurred', {
    originalError: String(error),
  });
}

/**
 * Safe error message extractor
 */
export function getErrorMessage(error: unknown): string {
  if (HttpError.isHttpError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Safe error details extractor
 */
export function getErrorDetails(error: unknown): unknown {
  if (HttpError.isHttpError(error)) {
    return error.details;
  }

  return undefined;
}

