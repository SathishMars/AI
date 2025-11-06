import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, createMockToken } from '@/app/lib/jwt';
import { env } from '@/app/lib/env';

/**
 * Authentication Middleware
 * 
 * Protects all routes by verifying JWT token from gpw_session cookie.
 * Implements defense-in-depth with proper error handling and logging.
 * 
 * Flow:
 * 1. Check for gpw_session cookie
 * 2. Verify JWT signature via JWKS (or HS256 in dev standalone mode)
 * 3. Validate claims (exp, aud, iss, etc.)
 * 4. Inject user headers for downstream use
 * 5. On failure: redirect to Rails login (embedded) or allow (mock mode)
 */
export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    // Skip Next.js internals and static assets
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname === '/favicon.ico' ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
    ) {
      return NextResponse.next();
    }

    // AUTHENTICATION: Verify JWT token from cookie
    const token = request.cookies.get(env.cookieName)?.value;
    
    // Handle missing token
    if (!token) {
      console.warn('[Auth Middleware] No token found in cookie:', env.cookieName);
      
      // In mock mode, generate a mock token and set cookie
      if (env.isMockMode) {
        console.log('[Auth Middleware] Mock mode: generating mock token');
        const mockToken = await createMockToken();
        
        const response = NextResponse.next();
        response.cookies.set(env.cookieName, mockToken, {
          httpOnly: true,
          secure: env.isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 60, // 30 minutes
        });
        
        return response;
      }
      
      // In embedded mode, redirect to Rails login
      const loginUrl = new URL('/', env.railsBaseUrl || 'http://localhost:3000');
      console.log('[Auth Middleware] Redirecting to login:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }

    // Verify JWT token
    const verification = await verifyJWT(token);
    
    if (!verification.success) {
      console.error('[Auth Middleware] Token verification failed:', verification.error.code);
      
      // In mock mode, regenerate token
      if (env.isMockMode) {
        console.log('[Auth Middleware] Mock mode: regenerating token after failure');
        const mockToken = await createMockToken();
        
        const response = NextResponse.next();
        response.cookies.set(env.cookieName, mockToken, {
          httpOnly: true,
          secure: env.isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 60,
        });
        
        return response;
      }
      
      // In embedded mode, redirect to Rails login
      const loginUrl = new URL('/', env.railsBaseUrl || 'http://localhost:3000');
      console.log('[Auth Middleware] Token invalid, redirecting to login');
      return NextResponse.redirect(loginUrl);
    }

    // Token is valid - inject headers for downstream use
    const { currentUser } = verification;
    const requestHeaders = new Headers(request.headers);
    
    // Inject user context headers
    requestHeaders.set('x-user-id', currentUser.userId);
    requestHeaders.set('x-user-email', currentUser.email);
    requestHeaders.set('x-user-first-name', currentUser.firstName);
    requestHeaders.set('x-user-last-name', currentUser.lastName);
    requestHeaders.set('x-user-full-name', currentUser.fullName);
    requestHeaders.set('x-account-id', currentUser.accountId);
    
    if (currentUser.organizationId) {
      requestHeaders.set('x-organization-id', currentUser.organizationId);
    }
    
    // Pass authenticated request through
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
    console.log(`[Auth Middleware] Authenticated user: ${currentUser.userId} (${currentUser.email})`);
    
    return response;
  } catch (err) {
    // Critical error in middleware - log and fail safely
    console.error('[Auth Middleware] Critical error:', err);
    
    // In production, redirect to login on critical errors
    if (env.isProduction && !env.isMockMode) {
      const loginUrl = new URL('/', env.railsBaseUrl || 'http://localhost:3000');
      return NextResponse.redirect(loginUrl);
    }
    
    // In development, allow through but log the error
    return NextResponse.next();
  }
}

// Run middleware for all site paths. The middleware itself early-returns for internal/static
// paths (see above) to avoid interfering with Next internals.
export const config = {
  matcher: ['/:path*']
};
