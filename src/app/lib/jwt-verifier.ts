/**
   * JWT Verifier Utility
   * 
   * Single-issuer verification model:
   * - Rails is the ONLY token issuer
   * - Next.js ONLY verifies tokens
   * - All tokens verified via Rails JWKS endpoint
   * 
   * Token Types:
   * 1. User Tokens (aud="workflows") - Browser → Next.js
   * 2. Service Tokens (aud="workflows-api") - Rails → Next.js /api/internal/**
*/

import { createRemoteJWKSet, jwtVerify, decodeJwt, JWTPayload, JWTVerifyResult } from 'jose';
import { env } from '@/app/lib/env';

const JWKS_CACHE_TTL = 5 * 60 * 1000;
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksCacheTime: number | null = null;
// Promise-based cache to prevent race conditions during concurrent cache refreshes
let jwksCachePromise: Promise<ReturnType<typeof createRemoteJWKSet>> | null = null;


export interface UserJWTClaims extends JWTPayload {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  nbf: number;
  context: {
    user_id: string;
    email: string;
    user_first_name: string;
    user_last_name: string;
    account_id: string;
    organization_id?: string;
  };
}

export interface ServiceJWTClaims extends JWTPayload {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  nbf: number;
  jti: string;
  context: {
    user_id: string;
    account_id: string;
    organization_id?: string;
  };
}

export type VerificationErrorCode =
  | 'TOKEN_MISSING'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'SIGNATURE_INVALID'
  | 'ISSUER_MISMATCH'
  | 'AUDIENCE_MISMATCH'
  | 'SUBJECT_MISMATCH'
  | 'NOT_YET_VALID'
  | 'JWKS_FETCH_FAILED';


export class JWTVerificationError extends Error {
  constructor(
    public code: VerificationErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'JWTVerificationError';
  }
}


/**
 * Get JWKS with race condition protection
 * 
 * Uses a promise-based cache to ensure concurrent requests share the same
 * JWKS instance creation, preventing multiple fetches when cache expires.
 */
async function getJWKS(): Promise<ReturnType<typeof createRemoteJWKSet>> {
  const now = Date.now();

  if (jwksCache && jwksCacheTime && (now - jwksCacheTime < JWKS_CACHE_TTL)) {
    return jwksCache;
  }

  if (jwksCachePromise) {
    return await jwksCachePromise;
  }

  jwksCachePromise = (async () => {
    try {
      const newCache = createRemoteJWKSet(new URL(env.jwksUrl), {
        cacheMaxAge: JWKS_CACHE_TTL,
        cooldownDuration: 30000,
      });

      jwksCache = newCache;
      jwksCacheTime = Date.now();
      
      return newCache;
    } finally {
      jwksCachePromise = null;
    }
  })();

  return await jwksCachePromise;
}

export async function verifyUserToken(token: string): Promise<UserJWTClaims> {
  if (!token) {
    throw new JWTVerificationError('TOKEN_MISSING', 'No token provided');
  }

  try {
    const JWKS = await getJWKS();
    
    const result: JWTVerifyResult = await jwtVerify(token, JWKS, {
      issuer: 'groupize',
      audience: 'workflows',
      clockTolerance: 60,
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[JWTVerifier] User token verified', {
        user_id: (result.payload as UserJWTClaims).context.user_id,
        account_id: (result.payload as UserJWTClaims).context.account_id,
        organization_id: (result.payload as UserJWTClaims).context.organization_id,
      });
    }
    
    return result.payload as UserJWTClaims;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new JWTVerificationError('TOKEN_EXPIRED', 'Token has expired', error);
      }
      if (error.message.includes('signature')) {
        throw new JWTVerificationError('SIGNATURE_INVALID', 'Invalid token signature', error);
      }
      if (error.message.includes('issuer')) {
        throw new JWTVerificationError('ISSUER_MISMATCH', 'Token issuer mismatch', error);
      }
      if (error.message.includes('audience')) {
        throw new JWTVerificationError('AUDIENCE_MISMATCH', 'Token audience mismatch', error);
      }
      if (error.message.includes('not yet valid')) {
        throw new JWTVerificationError('NOT_YET_VALID', 'Token not yet valid', error);
      }
    }
    
    throw new JWTVerificationError('TOKEN_INVALID', 'Token verification failed', error);
  }
}


export async function verifyServiceToken(token: string): Promise<ServiceJWTClaims> {
  if (!token) {
    throw new JWTVerificationError('TOKEN_MISSING', 'No token provided');
  }

  try {
    const JWKS = await getJWKS();
    
    const result: JWTVerifyResult = await jwtVerify(token, JWKS, {
      issuer: 'groupize',
      audience: 'workflows-api',
      subject: 'service:rails',
      clockTolerance: 60,
    });
    
    return result.payload as ServiceJWTClaims;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new JWTVerificationError('TOKEN_EXPIRED', 'Service token has expired', error);
      }
      if (error.message.includes('signature')) {
        throw new JWTVerificationError('SIGNATURE_INVALID', 'Invalid service token signature', error);
      }
      if (error.message.includes('issuer')) {
        throw new JWTVerificationError('ISSUER_MISMATCH', 'Service token issuer mismatch', error);
      }
      if (error.message.includes('audience')) {
        throw new JWTVerificationError('AUDIENCE_MISMATCH', 'Service token audience mismatch (expected workflows-api)', error);
      }
      if (error.message.includes('subject')) {
        throw new JWTVerificationError('SUBJECT_MISMATCH', 'Service token subject mismatch (expected service:rails)', error);
      }
      if (error.message.includes('not yet valid')) {
        throw new JWTVerificationError('NOT_YET_VALID', 'Service token not yet valid', error);
      }
    }
    
    throw new JWTVerificationError('TOKEN_INVALID', 'Service token verification failed', error);
  }
}

/**
 * Decode JWT token without verification to check expiration
 * Used to determine if expired token is within grace period for renewal
 */
export function decodeTokenWithoutVerification(token: string): { exp?: number; iat?: number } | null {
  try {
    const decoded = decodeJwt(token);
    return decoded;
  } catch (error) {
    console.error('[JWTVerifier] Failed to decode token', error);
    return null;
  }
}

export function clearJWKSCache(): void {
  jwksCache = null;
  jwksCacheTime = null;
  jwksCachePromise = null;
}

