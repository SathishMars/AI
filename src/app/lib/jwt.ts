/**
 * JWT Verification Utility
 * 
 * Handles JWT verification using JWKS (JSON Web Key Sets) with automatic
 * key caching and rotation support. Verifies RS256/PS256 tokens signed by
 * Rails KMS. Only used in embedded mode; standalone mode skips verification.
 */

import { jwtVerify, createRemoteJWKSet, JWTPayload, type JWTVerifyOptions } from 'jose';
import { env } from './env';
import {
  JWTClaims,
  JWTVerification,
  AuthErrorCode,
  createCurrentUserFromClaims,
} from '@/app/types/auth';
import { UnauthorizedError } from '@/app/types/errors';

/**
 * JWKS remote key set instance (cached by jose)
 * jose's createRemoteJWKSet automatically handles:
 * - Key caching
 * - Automatic refetch on unknown kid
 * - Respects Cache-Control headers from JWKS endpoint
 */
let jwksKeySet: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Get or create JWKS key set
 */
function getJWKSKeySet(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksKeySet) {
    if (!env.jwksUrl) {
      throw new Error('JWKS_URL is not configured');
    }
    
    // createRemoteJWKSet handles all caching and key rotation automatically
    // It respects the Cache-Control headers from the JWKS endpoint
    jwksKeySet = createRemoteJWKSet(new URL(env.jwksUrl), {
      // Optional: Add custom headers if needed
      // headers: { 'User-Agent': 'groupize-workflows' },
      
      // Cache timeout (milliseconds) - acts as a fallback if Cache-Control missing
      // Default is 30000ms (30s), but JWKS endpoint sets Cache-Control: max-age=300
      cacheMaxAge: 300_000, // 5 minutes to match JWKS endpoint
    });
    
    console.log(`[JWT] Initialized JWKS key set from: ${env.jwksUrl}`);
  }
  
  return jwksKeySet;
}

/**
 * Verify JWT token (RS256/PS256 with JWKS)
 */
async function verifyToken(token: string): Promise<JWTClaims> {
  try {
    const jwks = getJWKSKeySet();
    
    const verifyOptions: JWTVerifyOptions = {
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      // Clock tolerance for exp, nbf, iat (60 seconds)
      clockTolerance: 60,
    };
    
    const { payload } = await jwtVerify(token, jwks, verifyOptions);
    
    // Validate required custom claims
    const claims = payload as JWTPayload & Partial<JWTClaims>;
    validateClaims(claims);
    
    return claims as JWTClaims;
  } catch (error) {
    throw mapJoseError(error);
  }
}

/**
 * Validate required custom claims exist
 */
function validateClaims(claims: JWTPayload & Partial<JWTClaims>): void {
  const requiredFields: (keyof JWTClaims)[] = [
    'iss',
    'aud',
    'sub',
    'exp',
    'iat',
    'nbf',
    'account_id',
    'email',
    'user_first_name',
    'user_last_name',
    'user_name',
  ];
  
  for (const field of requiredFields) {
    if (!(field in claims) || claims[field] === undefined) {
      throw new UnauthorizedError(`Missing required claim: ${field}`, {
        code: AuthErrorCode.CLAIMS_INVALID,
      });
    }
  }
}

/**
 * Map jose errors to our AuthError format
 */
function mapJoseError(error: unknown): UnauthorizedError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('expired')) {
      return new UnauthorizedError('Token has expired', {
        code: AuthErrorCode.TOKEN_EXPIRED,
        originalError: error.message,
      });
    }
    
    if (message.includes('not yet valid') || message.includes('nbf')) {
      return new UnauthorizedError('Token is not yet valid', {
        code: AuthErrorCode.TOKEN_NOT_YET_VALID,
        originalError: error.message,
      });
    }
    
    if (message.includes('signature')) {
      return new UnauthorizedError('Invalid token signature', {
        code: AuthErrorCode.SIGNATURE_INVALID,
        originalError: error.message,
      });
    }
    
    if (message.includes('issuer')) {
      return new UnauthorizedError('Token issuer mismatch', {
        code: AuthErrorCode.ISSUER_MISMATCH,
        originalError: error.message,
      });
    }
    
    if (message.includes('audience')) {
      return new UnauthorizedError('Token audience mismatch', {
        code: AuthErrorCode.AUDIENCE_MISMATCH,
        originalError: error.message,
      });
    }
    
    if (message.includes('fetch') || message.includes('jwks')) {
      return new UnauthorizedError('Failed to fetch JWKS', {
        code: AuthErrorCode.JWKS_FETCH_FAILED,
        originalError: error.message,
      });
    }
    
    return new UnauthorizedError('Token verification failed', {
      code: AuthErrorCode.VERIFICATION_FAILED,
      originalError: error.message,
    });
  }
  
  return new UnauthorizedError('Unknown verification error', {
    code: AuthErrorCode.UNKNOWN_ERROR,
  });
}

/**
 * Main JWT verification function
 * 
 * Verifies JWT tokens using JWKS (PS256/RS256 from KMS public key).
 * Used only in embedded mode; standalone mode skips JWT verification entirely.
 * 
 * @param token - JWT token string
 * @returns JWTVerification result with claims and current user
 */
export async function verifyJWT(token: string): Promise<JWTVerification> {
  try {
    // Validate token format
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token format',
          statusCode: 401,
        },
      };
    }
    
    // Verify token using JWKS (PS256 from KMS)
    const mode = env.isProduction ? 'production' : 'development';
    console.log(`[JWT] Verifying token in ${mode} mode (PS256 via JWKS)`);
    const claims = await verifyToken(token);
    
    // Create current user from claims
    const currentUser = createCurrentUserFromClaims(claims);
    
    console.log('[JWT] Token verified successfully for user:', currentUser.userId);
    
    return {
      success: true,
      claims,
      currentUser,
    };
  } catch (error) {
    // Convert all errors to UnauthorizedError
    const authError = error instanceof UnauthorizedError
      ? error
      : new UnauthorizedError('JWT verification failed', {
          code: AuthErrorCode.VERIFICATION_FAILED,
          originalError: error instanceof Error ? error.message : String(error),
        });
    
    console.error('[JWT] Verification failed:', authError.message);
    
    return {
      success: false,
      error: {
        code: (authError.details as any)?.code || AuthErrorCode.VERIFICATION_FAILED,
        message: authError.message,
        details: authError.details as string | undefined,
        statusCode: authError.statusCode,
      },
    };
  }
}
