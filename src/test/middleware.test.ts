import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';
import { verifyUserToken, JWTVerificationError } from '@/app/lib/jwt-verifier';
import * as envModule from '@/app/lib/env';
import { createTestRequest } from './helpers/next-request';

// Mock dependencies
jest.mock('@/app/lib/jwt-verifier');
jest.mock('@/app/lib/env');

const mockVerifyUserToken = verifyUserToken as jest.MockedFunction<typeof verifyUserToken>;

describe('Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();

    // Default env mock
    (envModule as any).env = {
      authMode: 'embedded',
      cookieName: 'gpw_session',
      railsBaseUrl: 'http://groupize.local',
      basePath: '/aime/aimeworkflows',
      isProduction: false,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Static asset skipping', () => {
    it('should skip _next routes', async () => {
      const request = createTestRequest('http://localhost:3000/_next/static/chunk.js');
      const response = await middleware(request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should skip static files', async () => {
      const request = createTestRequest('http://localhost:3000/static/image.png');
      const response = await middleware(request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should skip favicon', async () => {
      const request = createTestRequest('http://localhost:3000/favicon.ico');
      const response = await middleware(request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should skip image files', async () => {
      const request = createTestRequest('http://localhost:3000/image.jpg');
      const response = await middleware(request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });
  });

  describe('Embedded mode', () => {
    beforeEach(() => {
      (envModule as any).env.authMode = 'embedded';
    });

    it('should redirect to Rails when no token', async () => {
      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/');
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('location')).toContain('groupize.local');
    });

    it('should verify token and proceed when valid', async () => {
      const mockClaims = {
        iss: 'groupize',
        aud: 'workflows',
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'user123',
          email: 'test@example.com',
          user_first_name: 'John',
          user_last_name: 'Doe',
          account_id: 'account123',
          organization_id: 'org456',
        },
      };

      mockVerifyUserToken.mockResolvedValue(mockClaims as any);

      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/accounts/account123/orgs/org456/workflows', {
        cookies: {
          gpw_session: 'valid.token.here',
        },
      });

      const response = await middleware(request);

      expect(mockVerifyUserToken).toHaveBeenCalledWith('valid.token.here');
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(response.headers.get('x-user-id')).toBe('user123');
      expect(response.headers.get('x-account-id')).toBe('account123');
      expect(response.headers.get('x-organization-id')).toBe('org456');
    });

    it('should redirect to Rails when token verification fails', async () => {
      mockVerifyUserToken.mockRejectedValue(
        new JWTVerificationError('TOKEN_EXPIRED', 'Token has expired')
      );

      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/', {
        cookies: {
          gpw_session: 'expired.token.here',
        },
      });

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('location')).toContain('groupize.local');
    });

    it('should return 403 when account ID mismatch', async () => {
      const mockClaims = {
        iss: 'groupize',
        aud: 'workflows',
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'user123',
          email: 'test@example.com',
          user_first_name: 'John',
          user_last_name: 'Doe',
          account_id: 'account123', // JWT has account123
          organization_id: 'org456',
        },
      };

      mockVerifyUserToken.mockResolvedValue(mockClaims as any);

      // URL has different account ID
      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/accounts/wrong-account/workflows', {
        cookies: {
          gpw_session: 'valid.token.here',
        },
      });

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);
    });

    it('should return 403 when org ID mismatch', async () => {
      const mockClaims = {
        iss: 'groupize',
        aud: 'workflows',
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'user123',
          email: 'test@example.com',
          user_first_name: 'John',
          user_last_name: 'Doe',
          account_id: 'account123',
          organization_id: 'org456', // JWT has org456
        },
      };

      mockVerifyUserToken.mockResolvedValue(mockClaims as any);

      // URL has different org ID
      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/accounts/account123/orgs/wrong-org/workflows', {
        cookies: {
          gpw_session: 'valid.token.here',
        },
      });

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);
    });

    it('should return 403 when user has no org but URL requires org', async () => {
      const mockClaims = {
        iss: 'groupize',
        aud: 'workflows',
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'user123',
          email: 'test@example.com',
          user_first_name: 'John',
          user_last_name: 'Doe',
          account_id: 'account123',
          // No organization_id in JWT
        },
      };

      mockVerifyUserToken.mockResolvedValue(mockClaims as any);

      // URL requires org but JWT has none
      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/accounts/account123/orgs/org456/workflows', {
        cookies: {
          gpw_session: 'valid.token.here',
        },
      });

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);
    });

    it('should inject user headers correctly', async () => {
      const mockClaims = {
        iss: 'groupize',
        aud: 'workflows',
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'user123',
          email: 'test@example.com',
          user_first_name: 'John',
          user_last_name: 'Doe',
          account_id: 'account123',
          organization_id: 'org456',
        },
      };

      mockVerifyUserToken.mockResolvedValue(mockClaims as any);

      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/accounts/account123/orgs/org456/workflows', {
        cookies: {
          gpw_session: 'valid.token.here',
        },
      });

      const response = await middleware(request);

      expect(response.headers.get('x-user-id')).toBe('user123');
      expect(response.headers.get('x-user-email')).toBe('test@example.com');
      expect(response.headers.get('x-user-first-name')).toBe('John');
      expect(response.headers.get('x-user-last-name')).toBe('Doe');
      expect(response.headers.get('x-user-full-name')).toBe('John Doe');
      expect(response.headers.get('x-account-id')).toBe('account123');
      expect(response.headers.get('x-organization-id')).toBe('org456');
      expect(response.headers.get('x-url-account-id')).toBe('account123');
      expect(response.headers.get('x-url-org-id')).toBe('org456');
    });

    it('should skip internal API routes', async () => {
      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/api/internal/workflows');
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(mockVerifyUserToken).not.toHaveBeenCalled();
    });

    it('should skip user-session endpoint', async () => {
      const request = createTestRequest('http://localhost:3000/api/user-session/');
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(mockVerifyUserToken).not.toHaveBeenCalled();
    });
  });

  describe('Standalone mode', () => {
    beforeEach(() => {
      (envModule as any).env.authMode = 'standalone';
      (envModule as any).env.basePath = '/aime/aimeworkflows';
    });

    it('should skip JWT verification in standalone mode', async () => {
      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/');
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(mockVerifyUserToken).not.toHaveBeenCalled();
    });

    it('should inject default user headers in standalone mode', async () => {
      // Mock fetch for user-session API
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/');
      const response = await middleware(request);

      expect(response.headers.get('x-user-id')).toBe('john.doe');
      expect(response.headers.get('x-user-email')).toBe('john.doe@example.com');
      expect(response.headers.get('x-account-id')).toBe('groupize-demos');
    });

    it('should use account from query params in standalone mode', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/?account=test-account');
      const response = await middleware(request);

      expect(response.headers.get('x-account-id')).toBe('test-account');
    });

    it('should use organization from query params in standalone mode', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/?account=test-account&organization=test-org');
      const response = await middleware(request);

      expect(response.headers.get('x-organization-id')).toBe('test-org');
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      (envModule as any).env.authMode = 'embedded';
      (envModule as any).env.isProduction = false;
    });

    it('should handle unexpected errors gracefully in development', async () => {
      mockVerifyUserToken.mockRejectedValue(new Error('Unexpected error'));

      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/', {
        cookies: {
          gpw_session: 'token',
        },
      });

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      // In embedded mode, errors redirect to Rails for re-authentication
      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('Location')).toBe('http://groupize.local/');
    });

    it('should redirect on error in production', async () => {
      (envModule as any).env.isProduction = true;
      mockVerifyUserToken.mockRejectedValue(new Error('Unexpected error'));

      const request = createTestRequest('http://localhost:3000/aime/aimeworkflows/', {
        cookies: {
          gpw_session: 'token',
        },
      });

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307); // Redirect in production
    });
  });
});

