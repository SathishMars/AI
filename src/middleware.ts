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

    // Log token for debugging (first 50 chars only)
    console.log('[Auth Middleware] Token found, length:', token.length);
    console.log('[Auth Middleware] Token preview:', token.substring(0, 50) + '...');
    
    // Decode header to see algorithm (for debugging)
    try {
      const headerB64 = token.split('.')[0];
      const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
      console.log('[Auth Middleware] Token algorithm:', header.alg);
    } catch (e) {
      console.log('[Auth Middleware] Could not decode token header');
    }
    
    // Verify JWT token
    const verification = await verifyJWT(token);
    
    if (!verification.success) {
      console.error('[Auth Middleware] Token verification failed:', verification.error.code);
      console.error('[Auth Middleware] Error details:', verification.error.message);
      if (verification.error.originalError) {
        console.error('[Auth Middleware] Original error:', verification.error.originalError);
      }
      
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

    // Token is valid - validate URL-based scoping
    const { currentUser } = verification;
    
    // Parse account and org from URL path
    // URL format: /accounts/:accountId/orgs/:orgId/... or /accounts/:accountId/...
    const pathSegments = pathname.split('/').filter(Boolean);
    let urlAccountId: string | null = null;
    let urlOrgId: string | null = null;
    
    const accountsIndex = pathSegments.indexOf('accounts');
    if (accountsIndex !== -1 && pathSegments[accountsIndex + 1]) {
      urlAccountId = pathSegments[accountsIndex + 1];
      
      const orgsIndex = pathSegments.indexOf('orgs');
      if (orgsIndex !== -1 && pathSegments[orgsIndex + 1]) {
        urlOrgId = pathSegments[orgsIndex + 1];
      }
    }
    
    // URL scoping validation (ONLY in embedded/production mode)
    // In standalone mode, URL scoping is optional for easier development
    if (!env.isMockMode) {
      // Validate account ID from URL matches JWT claims
      if (urlAccountId && urlAccountId !== currentUser.accountId) {
        console.error(
          `[Auth Middleware] Account ID mismatch. URL: ${urlAccountId}, JWT: ${currentUser.accountId}`
        );
        return NextResponse.json(
          { error: 'Forbidden: Account access denied' },
          { status: 403 }
        );
      }
      
      // Validate organization ID from URL matches JWT claims (if present)
      if (urlOrgId) {
        if (!currentUser.organizationId) {
          console.error(
            `[Auth Middleware] User ${currentUser.userId} attempted to access org ${urlOrgId} but has no org in JWT`
          );
          return NextResponse.json(
            { error: 'Forbidden: Organization access denied' },
            { status: 403 }
          );
        }
        
        if (urlOrgId !== currentUser.organizationId) {
          console.error(
            `[Auth Middleware] Org ID mismatch. URL: ${urlOrgId}, JWT: ${currentUser.organizationId}`
          );
          return NextResponse.json(
            { error: 'Forbidden: Organization access denied' },
            { status: 403 }
          );
        }
      }
    } else {
      // Standalone mode: URL scoping is optional, just log it
      if (urlAccountId || urlOrgId) {
        console.log(
          `[Auth Middleware] Standalone mode: URL scope detected (account:${urlAccountId}, org:${urlOrgId}) - validation skipped`
        );
      }
    }
    
    // All validation passed - inject headers for downstream use
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
    
    // Inject URL-based scoping info (for API routes to use)
    if (urlAccountId) {
      requestHeaders.set('x-url-account-id', urlAccountId);
    }
    if (urlOrgId) {
      requestHeaders.set('x-url-org-id', urlOrgId);
    }
    
    // Pass authenticated and authorized request through
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
    const scope = urlOrgId 
      ? `org:${urlOrgId}` 
      : urlAccountId 
        ? `account:${urlAccountId}` 
        : env.isMockMode 
          ? 'mock' 
          : 'global';
    console.log(
      `[Auth Middleware] Authorized: ${currentUser.userId} (${currentUser.email}) - Scope: ${scope}${env.isMockMode ? ' (standalone)' : ''}`
    );
    
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
