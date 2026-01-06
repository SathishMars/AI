import { NextRequest, NextResponse } from 'next/server';
import { verifyServiceToken, JWTVerificationError, ServiceJWTClaims } from '@/app/lib/jwt-verifier';

export type ServiceContext = {
  serviceName?: string;
  serviceVersion?: string;
  requestId?: string;
  environment?: string;
  userId: string;
  accountId: string;
  organizationId?: string;
};

type ErrorResponse = {
  error: string;
  code: string;
  details?: unknown;
};

/**
 * Verify service token from Authorization header
 * 
 * @param request - Next.js request
 * @returns Service context if valid, error response if invalid
 */
export async function verifyServiceAuth(
request: NextRequest
): Promise<{ success: true; context: ServiceContext } | { success: false; response: NextResponse }> {

const authHeader = request.headers.get('authorization');

if (!authHeader) {
  return {
    success: false,
    response: NextResponse.json(
      {
        error: 'Authorization header required',
        code: 'TOKEN_MISSING',
      } as ErrorResponse,
      { status: 401 }
    ),
  };
}

const match = authHeader.match(/^Bearer\s+(.+)$/i);

if (!match) {
  console.error('[InternalAPI] Invalid Authorization header format');
  return {
    success: false,
    response: NextResponse.json(
      {
        error: 'Authorization header must be in format: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT',
      } as ErrorResponse,
      { status: 401 }
    ),
  };
}

const token = match[1];

let claims: ServiceJWTClaims;
try {
  claims = await verifyServiceToken(token);
} catch (error) {
  if (error instanceof JWTVerificationError) {      
    const statusCode = error.code === 'TOKEN_EXPIRED' ? 401 : 
                        error.code === 'TOKEN_MISSING' ? 401 : 
                        error.code === 'AUDIENCE_MISMATCH' ? 403 :
                        error.code === 'SUBJECT_MISMATCH' ? 403 :
                        403;
    
    return {
      success: false,
      response: NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        } as ErrorResponse,
        { status: statusCode }
      ),
    };
  }
  
  console.error('[InternalAPI] Unexpected verification error:', error);
  return {
    success: false,
    response: NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } as ErrorResponse,
      { status: 500 }
    ),
  };
}


const context: ServiceContext = {
  userId: claims.context.user_id,
  accountId: claims.context.account_id,
  organizationId: claims.context.organization_id,
  serviceName: request.headers.get('x-service-name') || undefined,
  serviceVersion: request.headers.get('x-service-version') || undefined,
  requestId: request.headers.get('x-request-id') || undefined,
  environment: request.headers.get('x-environment') || undefined,
};

console.log('[InternalAPI] Service authenticated:', {
  service: context.serviceName || 'unknown',
  user: context.userId,
  account: context.accountId,
  org: context.organizationId,
  requestId: context.requestId,
});

return { success: true, context };
}

export function withServiceAuth(
  handler: (request: NextRequest, context: ServiceContext) => Promise<NextResponse>
  ): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const verification = await verifyServiceAuth(request);
    
    if (!verification.success) {
      return verification.response;
    }
    
    return handler(request, verification.context);
  };
}

