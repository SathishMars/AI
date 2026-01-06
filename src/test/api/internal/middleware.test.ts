import { NextRequest, NextResponse } from 'next/server';
import { verifyServiceAuth, withServiceAuth, ServiceContext } from '@/app/api/internal/middleware';
import { verifyServiceToken, JWTVerificationError } from '@/app/lib/jwt-verifier';
import { createTestRequest } from '../../helpers/next-request';

// Mock dependencies
jest.mock('@/app/lib/jwt-verifier', () => {
  const actual = jest.requireActual('@/app/lib/jwt-verifier');
  return {
    ...actual,
    verifyServiceToken: jest.fn(),
    verifyUserToken: jest.fn(),
  };
});

const mockVerifyServiceToken = verifyServiceToken as jest.MockedFunction<typeof verifyServiceToken>;

describe('Service Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyServiceAuth', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const request = createTestRequest('http://localhost:3000/api/internal/workflows');
      const result = await verifyServiceAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
        const json = await result.response.json();
        expect(json.code).toBe('TOKEN_MISSING');
        expect(json.error).toBe('Authorization header required');
      }
    });

    it('should return 401 when Authorization header format is invalid', async () => {
      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'InvalidFormat token',
        },
      });

      const result = await verifyServiceAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
        const json = await result.response.json();
        expect(json.code).toBe('INVALID_AUTH_FORMAT');
      }
    });

    it('should verify valid service token and return context', async () => {
      const mockClaims = {
        iss: 'groupize',
        aud: 'workflows-api',
        sub: 'service:rails',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        jti: 'jti123',
        context: {
          user_id: 'user123',
          account_id: 'account123',
          organization_id: 'org456',
        },
      };

      mockVerifyServiceToken.mockResolvedValue(mockClaims as any);

      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'Bearer valid.service.token',
          'x-service-name': 'rails',
          'x-service-version': '1.0',
          'x-request-id': 'req123',
          'x-environment': 'production',
        },
      });

      const result = await verifyServiceAuth(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.userId).toBe('user123');
        expect(result.context.accountId).toBe('account123');
        expect(result.context.organizationId).toBe('org456');
        expect(result.context.serviceName).toBe('rails');
        expect(result.context.serviceVersion).toBe('1.0');
        expect(result.context.requestId).toBe('req123');
        expect(result.context.environment).toBe('production');
      }
      expect(mockVerifyServiceToken).toHaveBeenCalledWith('valid.service.token');
    });

    it('should return 401 for expired token', async () => {
      const error = new JWTVerificationError('TOKEN_EXPIRED', 'Service token has expired');
      mockVerifyServiceToken.mockRejectedValue(error);

      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'Bearer expired.token',
        },
      });

      const result = await verifyServiceAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        // Debug: check what we actually got
        expect(json.code).toBe('TOKEN_EXPIRED');
        // TOKEN_EXPIRED should return 401 according to the code
        expect(result.response.status).toBe(401);
      }
    });

    it('should return 403 for audience mismatch', async () => {
      mockVerifyServiceToken.mockRejectedValue(
        new JWTVerificationError('AUDIENCE_MISMATCH', 'Service token audience mismatch')
      );

      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'Bearer wrong.audience.token',
        },
      });

      const result = await verifyServiceAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
        const json = await result.response.json();
        expect(json.code).toBe('AUDIENCE_MISMATCH');
      }
    });

    it('should return 403 for subject mismatch', async () => {
      mockVerifyServiceToken.mockRejectedValue(
        new JWTVerificationError('SUBJECT_MISMATCH', 'Service token subject mismatch')
      );

      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'Bearer wrong.subject.token',
        },
      });

      const result = await verifyServiceAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
        const json = await result.response.json();
        expect(json.code).toBe('SUBJECT_MISMATCH');
      }
    });

    it('should return 500 for unexpected errors', async () => {
      mockVerifyServiceToken.mockRejectedValue(new Error('Unexpected error'));

      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'Bearer token',
        },
      });

      const result = await verifyServiceAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(500);
        const json = await result.response.json();
        expect(json.code).toBe('INTERNAL_ERROR');
      }
    });

    it('should handle optional headers gracefully', async () => {
      const mockClaims = {
        iss: 'groupize',
        aud: 'workflows-api',
        sub: 'service:rails',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        jti: 'jti123',
        context: {
          user_id: 'user123',
          account_id: 'account123',
        },
      };

      mockVerifyServiceToken.mockResolvedValue(mockClaims as any);

      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'Bearer valid.token',
          // No optional headers
        },
      });

      const result = await verifyServiceAuth(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.serviceName).toBeUndefined();
        expect(result.context.serviceVersion).toBeUndefined();
        expect(result.context.requestId).toBeUndefined();
        expect(result.context.environment).toBeUndefined();
      }
    });
  });

  describe('withServiceAuth', () => {
    it('should call handler with context when auth succeeds', async () => {
      const mockClaims = {
        iss: 'groupize',
        aud: 'workflows-api',
        sub: 'service:rails',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        jti: 'jti123',
        context: {
          user_id: 'user123',
          account_id: 'account123',
          organization_id: 'org456',
        },
      };

      mockVerifyServiceToken.mockResolvedValue(mockClaims as any);

      const mockHandler = jest.fn().mockResolvedValue(
        new NextResponse(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const wrappedHandler = withServiceAuth(mockHandler);

      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'Bearer valid.token',
        },
      });

      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          userId: 'user123',
          accountId: 'account123',
          organizationId: 'org456',
        })
      );
      expect(response.status).toBe(200);
    });

    it('should return error response when auth fails', async () => {
      mockVerifyServiceToken.mockRejectedValue(
        new JWTVerificationError('TOKEN_EXPIRED', 'Service token has expired')
      );

      const mockHandler = jest.fn();

      const wrappedHandler = withServiceAuth(mockHandler);

      const request = createTestRequest('http://localhost:3000/api/internal/workflows', {
        headers: {
          authorization: 'Bearer expired.token',
        },
      });

      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe('TOKEN_EXPIRED');
    });
  });
});

