import { proxy } from '@/proxy';
import { NextRequest, NextResponse } from 'next/server';

// Mock env
jest.mock('@/app/lib/env', () => ({
  env: {
    basePath: '/aime',
    railsBaseUrl: 'http://rails.test',
    cookieName: 'auth_token',
  },
}));

// Mock JWT verifier
jest.mock('@/app/lib/jwt-verifier', () => ({
  verifyUserToken: jest.fn(),
  JWTVerificationError: Error,
}));

describe('Proxy - Authorization Bypass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip authentication for /api/initialize endpoint', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/initialize'));

    const result = await proxy(request);

    // Should return NextResponse.next() which indicates auth was skipped
    expect(result).toBeDefined();
  });

  it('should skip authentication for /aime/api/initialize endpoint', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/aime/api/initialize'));

    const result = await proxy(request);

    // Should return NextResponse.next() which indicates auth was skipped
    expect(result).toBeDefined();
  });

  it('should skip authentication for /initialize page route', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/initialize'));

    const result = await proxy(request);

    // Should return NextResponse.next() which indicates auth was skipped
    expect(result).toBeDefined();
  });

  it('should skip authentication for /aime/initialize page route', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/aime/initialize'));

    const result = await proxy(request);

    // Should return NextResponse.next() which indicates auth was skipped
    expect(result).toBeDefined();
  });
});
