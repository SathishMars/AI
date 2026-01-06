import { verifyUserToken, verifyServiceToken, JWTVerificationError, decodeTokenWithoutVerification, clearJWKSCache } from '@/app/lib/jwt-verifier';
import * as envModule from '@/app/lib/env';
import { jwtVerify, createRemoteJWKSet, decodeJwt } from 'jose';

// Mock the env module
jest.mock('@/app/lib/env', () => ({
  env: {
    railsBaseUrl: 'http://localhost:3000',
    jwksUrl: 'http://localhost:3000/.well-known/jwks.json',
  },
}));

// Mock jose functions
jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
  createRemoteJWKSet: jest.fn(),
  decodeJwt: jest.fn(),
}));

const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
const mockCreateRemoteJWKSet = createRemoteJWKSet as jest.MockedFunction<typeof createRemoteJWKSet>;
const mockDecodeJwt = decodeJwt as jest.MockedFunction<typeof decodeJwt>;

describe('JWT Verifier', () => {
  let mockJWKS: any;

  beforeEach(() => {
    jest.clearAllMocks();
    clearJWKSCache();

    // Setup default JWKS mock
    mockJWKS = jest.fn();
    mockCreateRemoteJWKSet.mockReturnValue(mockJWKS);
  });

  describe('verifyUserToken', () => {
    it('should verify a valid user token', async () => {
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

      mockJwtVerify.mockResolvedValue({
        payload: mockClaims,
        protectedHeader: { alg: 'PS256' },
      } as any);

      const claims = await verifyUserToken('valid.token.here');

      expect(claims.context.user_id).toBe('user123');
      expect(claims.context.account_id).toBe('account123');
      expect(claims.context.organization_id).toBe('org456');
      expect(claims.iss).toBe('groupize');
      expect(claims.aud).toBe('workflows');
      expect(mockJwtVerify).toHaveBeenCalledWith(
        'valid.token.here',
        mockJWKS,
        expect.objectContaining({
          issuer: 'groupize',
          audience: 'workflows',
          clockTolerance: 60,
        })
      );
    });

    it('should throw TOKEN_MISSING for empty token', async () => {
      await expect(verifyUserToken('')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyUserToken('');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('TOKEN_MISSING');
        }
      }
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('should throw TOKEN_EXPIRED for expired token', async () => {
      const error = new Error('Token has expired');
      error.message = 'expired';
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyUserToken('expired.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyUserToken('expired.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('TOKEN_EXPIRED');
        }
      }
    });

    it('should throw AUDIENCE_MISMATCH for wrong audience', async () => {
      const error = new Error('Token audience mismatch');
      error.message = 'audience';
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyUserToken('wrong.audience.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyUserToken('wrong.audience.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('AUDIENCE_MISMATCH');
        }
      }
    });

    it('should throw ISSUER_MISMATCH for wrong issuer', async () => {
      const error = new Error('Token issuer mismatch');
      error.message = 'issuer';
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyUserToken('wrong.issuer.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyUserToken('wrong.issuer.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('ISSUER_MISMATCH');
        }
      }
    });

    it('should throw NOT_YET_VALID for token with future nbf', async () => {
      const error = new Error('Token not yet valid');
      error.message = 'not yet valid';
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyUserToken('future.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyUserToken('future.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('NOT_YET_VALID');
        }
      }
    });

    it('should throw SIGNATURE_INVALID for invalid signature', async () => {
      const error = new Error('Invalid token signature');
      error.message = 'signature';
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyUserToken('invalid.signature.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyUserToken('invalid.signature.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('SIGNATURE_INVALID');
        }
      }
    });

    it('should throw TOKEN_INVALID for other errors', async () => {
      const error = new Error('Some other error');
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyUserToken('invalid.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyUserToken('invalid.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('TOKEN_INVALID');
        }
      }
    });
  });

  describe('verifyServiceToken', () => {
    it('should verify a valid service token', async () => {
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

      mockJwtVerify.mockResolvedValue({
        payload: mockClaims,
        protectedHeader: { alg: 'PS256' },
      } as any);

      const claims = await verifyServiceToken('valid.service.token');

      expect(claims.context.user_id).toBe('user123');
      expect(claims.context.account_id).toBe('account123');
      expect(claims.iss).toBe('groupize');
      expect(claims.aud).toBe('workflows-api');
      expect(claims.sub).toBe('service:rails');
      expect(mockJwtVerify).toHaveBeenCalledWith(
        'valid.service.token',
        mockJWKS,
        expect.objectContaining({
          issuer: 'groupize',
          audience: 'workflows-api',
          subject: 'service:rails',
          clockTolerance: 60,
        })
      );
    });

    it('should throw TOKEN_MISSING for empty token', async () => {
      await expect(verifyServiceToken('')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyServiceToken('');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('TOKEN_MISSING');
        }
      }
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('should throw SUBJECT_MISMATCH for wrong subject', async () => {
      const error = new Error('Token subject mismatch');
      error.message = 'subject';
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyServiceToken('wrong.subject.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyServiceToken('wrong.subject.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('SUBJECT_MISMATCH');
        }
      }
    });

    it('should throw AUDIENCE_MISMATCH for wrong audience', async () => {
      const error = new Error('Token audience mismatch');
      error.message = 'audience';
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyServiceToken('wrong.audience.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyServiceToken('wrong.audience.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('AUDIENCE_MISMATCH');
        }
      }
    });

    it('should throw TOKEN_EXPIRED for expired token', async () => {
      const error = new Error('Service token has expired');
      error.message = 'expired';
      mockJwtVerify.mockRejectedValue(error);

      await expect(verifyServiceToken('expired.token')).rejects.toThrow(JWTVerificationError);
      try {
        await verifyServiceToken('expired.token');
      } catch (err) {
        expect(err).toBeInstanceOf(JWTVerificationError);
        if (err instanceof JWTVerificationError) {
          expect(err.code).toBe('TOKEN_EXPIRED');
        }
      }
    });
  });

  describe('decodeTokenWithoutVerification', () => {
    it('should decode token without verification', () => {
      const mockPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'groupize',
        aud: 'workflows',
      };

      mockDecodeJwt.mockReturnValue(mockPayload);

      const decoded = decodeTokenWithoutVerification('token.here');

      expect(decoded).not.toBeNull();
      expect(decoded?.exp).toBe(mockPayload.exp);
      expect(decoded?.iat).toBe(mockPayload.iat);
      expect(mockDecodeJwt).toHaveBeenCalledWith('token.here');
    });

    it('should return null for invalid token', () => {
      mockDecodeJwt.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const decoded = decodeTokenWithoutVerification('invalid.token');

      expect(decoded).toBeNull();
    });
  });

  describe('JWKS caching', () => {
    it('should cache JWKS for 5 minutes', async () => {
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
        },
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockClaims,
        protectedHeader: { alg: 'PS256' },
      } as any);

      // First call should create JWKS
      clearJWKSCache();
      await verifyUserToken('token1');
      expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1);

      // Second call should use cache (createRemoteJWKSet not called again)
      await verifyUserToken('token2');
      expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1); // Still 1, using cache
    });

    it('should create new JWKS after cache expires', async () => {
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
        },
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockClaims,
        protectedHeader: { alg: 'PS256' },
      } as any);

      // First call
      clearJWKSCache();
      await verifyUserToken('token1');
      expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1);

      // Clear cache manually (simulating expiration)
      clearJWKSCache();

      // Second call should create new JWKS
      await verifyUserToken('token2');
      expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(2);
    });
  });
});
