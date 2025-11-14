/**
 * Mock for jose library to handle ES module issues in Jest
 * This provides the functions we use from jose for JWT verification
 */

// Mock key pair generation
export async function generateKeyPair(alg: string) {
  // Return mock keys - in real tests, we'll use actual keys
  return {
    publicKey: { type: 'public', alg },
    privateKey: { type: 'private', alg },
  };
}

// Mock JWK import
export async function importJWK(key: any, alg: string) {
  return { ...key, alg };
}

// Mock JWT signing
export class SignJWT {
  private payload: any = {};
  private protectedHeader: any = {};
  private claims: any = {};

  setProtectedHeader(header: any) {
    this.protectedHeader = header;
    return this;
  }

  setIssuedAt(time: number) {
    this.claims.iat = time;
    return this;
  }

  setNotBefore(time: number) {
    this.claims.nbf = time;
    return this;
  }

  setExpirationTime(time: number) {
    this.claims.exp = time;
    return this;
  }

  setIssuer(iss: string) {
    this.claims.iss = iss;
    return this;
  }

  setAudience(aud: string) {
    this.claims.aud = aud;
    return this;
  }

  setSubject(sub: string) {
    this.claims.sub = sub;
    return this;
  }

  setJti(jti: string) {
    this.claims.jti = jti;
    return this;
  }

  async sign(key: any): Promise<string> {
    // Return a mock token - in real tests, we'll use actual signed tokens
    const header = Buffer.from(JSON.stringify(this.protectedHeader)).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ ...this.payload, ...this.claims })).toString('base64url');
    return `${header}.${payload}.signature`;
  }
}

// Mock JWT verification
export async function jwtVerify(
  token: string,
  keySet: any,
  options: any
): Promise<{ payload: any }> {
  // This will be mocked in individual tests
  throw new Error('jwtVerify should be mocked in tests');
}

// Mock JWT decoding
export function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload;
  } catch (error) {
    throw new Error('Failed to decode token');
  }
}

// Mock remote JWK set creation
export function createRemoteJWKSet(url: URL, options?: any): any {
  // Return a function that can be mocked
  return async (protectedHeader: any) => {
    throw new Error('JWKS should be mocked in tests');
  };
}

// Types
export type JWTPayload = {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  jti?: string;
  [key: string]: any;
};

export type JWTVerifyResult = {
  payload: JWTPayload;
  protectedHeader: any;
};

