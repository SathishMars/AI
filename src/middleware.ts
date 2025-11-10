import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/app/lib/jwt';
import { env } from '@/app/lib/env';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Authentication Middleware
 * 
 * Supports two modes via AUTH_MODE environment variable:
 * 
 * 1. EMBEDDED MODE (default):
 *    - Verifies JWT token from gpw_session cookie
 *    - Validates RS256 signature via JWKS
 *    - Validates claims (exp, aud, iss, etc.)
 *    - Redirects to Rails login on failure
 * 
 * 2. STANDALONE MODE:
 *    - Skips JWT verification
 *    - Uses mocked user API for development
 *    - Injects user headers from API response
 * 
 * Both modes inject user context headers for downstream API routes.
 */
export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    console.log("[middleware] pathname:", pathname, 'basePath:', basePath, 'mode:', env.authMode);

    // Skip Next.js internals and static assets
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname === '/favicon.ico' ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
    ) {
      return NextResponse.next();
    }

    // Skip if already processed by middleware (prevent recursion)
    if (request.headers.get('x-middleware-skip') === '1') {
      return NextResponse.next();
    }

    // Skip the user-session endpoint itself to prevent infinite loop
    if (pathname === '/api/user-session/') {
      return NextResponse.next();
    }

    // ==========================================
    // EMBEDDED MODE: JWT Verification Required
    // ==========================================
    if (env.authMode === 'embedded') {
      return await handleEmbeddedMode(request, pathname);
    }

    // ==========================================
    // STANDALONE MODE: Use Mocked User API
    // ==========================================
    return await handleStandaloneMode(request, pathname);

  } catch (err) {
    console.error('[Auth Middleware] Critical error:', err);
    
    // In production embedded mode, redirect to login on critical errors
    if (env.isProduction && env.authMode === 'embedded') {
      const loginUrl = new URL('/', env.railsBaseUrl || 'http://localhost:3000');
      return NextResponse.redirect(loginUrl);
    }
    
    // In development/standalone, allow through but log the error
    return NextResponse.next();
  }
}

/**
 * Handle embedded mode: verify JWT token from cookie
 */
async function handleEmbeddedMode(request: NextRequest, pathname: string) {
  // Get JWT token from cookie
  const token = request.cookies.get(env.cookieName)?.value;
  
  if (!token) {
    console.warn('[Auth Middleware] Embedded mode: No token found in cookie:', env.cookieName);
    const loginUrl = new URL('/', env.railsBaseUrl || 'http://localhost:3000');
    console.log('[Auth Middleware] Redirecting to login:', loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  console.log('[Auth Middleware] Token found, length:', token.length);
  
  // Verify JWT token
  const verification = await verifyJWT(token);
  
  if (!verification.success) {
    console.error('[Auth Middleware] Token verification failed:', verification.error.code);
    console.error('[Auth Middleware] Error details:', verification.error.message);
    
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
  
  // Also set legacy headers for compatibility
  requestHeaders.set('x-account', currentUser.accountId);
  if (currentUser.organizationId) {
    requestHeaders.set('x-organization', currentUser.organizationId);
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
      : 'global';
  console.log(
    `[Auth Middleware] Authorized (embedded): ${currentUser.userId} (${currentUser.email}) - Scope: ${scope}`
  );
  
  return response;
}

/**
 * Handle standalone mode: use mocked user API
 */
async function handleStandaloneMode(request: NextRequest, pathname: string) {
  const url = request.nextUrl;

  // Resolve account/org candidates from common sources (query/header/cookie)
  const accountFromQuery = url.searchParams.get('account');
  const accountFromHeader = request.headers.get('x-account');
  const accountFromCookie = request.cookies.get('account')?.value;
  const orgFromQuery = url.searchParams.get('organization');
  const orgFromHeader = request.headers.get('x-organization');
  const orgFromCookie = request.cookies.get('organization')?.value;

  // Build API URL to fetch full user/session context
  let apiUrl: URL;
  try {
    apiUrl = new URL(`${basePath}/api/user-session/`, request.nextUrl.origin);
    if (accountFromQuery) apiUrl.searchParams.set('account', accountFromQuery);
    if (orgFromQuery) apiUrl.searchParams.set('organization', orgFromQuery);
  } catch {
    // Fallback when origin isn't available
    const host = request.headers.get('host') || 'localhost:3000';
    apiUrl = new URL(`http://${host}${basePath}/api/user-session/`);
    if (accountFromQuery) apiUrl.searchParams.set('account', accountFromQuery);
    if (orgFromQuery) apiUrl.searchParams.set('organization', orgFromQuery);
  }

  // Default mock fallback
  const fallbackUser = {
    userId: 'john.doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    fullName: 'John Doe'
  };

  type DemoUser = {
    id?: string;
    userId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    profile?: { firstName?: string; lastName?: string; email?: string };
  };

  type UserSessionData = {
    user?: DemoUser;
    account?: { id?: string };
    currentOrganization?: { id?: string } | null;
  } | null;

  let fetchedData: UserSessionData = null;
  try {
    console.log("[middleware] fetching user session from", apiUrl.toString());
    const apiRes = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-middleware-skip': '1'
      }
    });

    if (apiRes.ok) {
      const json = await apiRes.json().catch(() => null);
      if (json && json.success && json.data) {
        fetchedData = json.data;
      }
    } else {
      console.warn('[Middleware]: user-session fetch failed with response', apiRes.status);
    }
  } catch (err) {
    console.warn('Middleware: user-session fetch failed', err);
  }

  // Determine final values
  const accountId = fetchedData?.account?.id || accountFromQuery || accountFromHeader || accountFromCookie || 'groupize-demos';
  const organizationObj = fetchedData?.currentOrganization || (orgFromQuery ? { id: orgFromQuery } : orgFromHeader ? { id: orgFromHeader } : orgFromCookie ? { id: orgFromCookie } : null);
  const organizationId = organizationObj?.id || null;
  const userObj = fetchedData?.user || null;

  // Clone existing headers and inject resolved values
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-account', accountId);
  requestHeaders.set('x-account-id', accountId);
  if (organizationId) {
    requestHeaders.set('x-organization', organizationId);
    requestHeaders.set('x-organization-id', organizationId);
  } else {
    requestHeaders.delete('x-organization');
    requestHeaders.delete('x-organization-id');
  }

  // Prefer user data from fetched response; otherwise use fallback
  const finalUser = userObj
    ? {
        id: userObj.id ?? userObj.userId ?? '',
        firstName: userObj.profile?.firstName ?? userObj.firstName ?? fallbackUser.firstName,
        lastName: userObj.profile?.lastName ?? userObj.lastName ?? fallbackUser.lastName,
        email: userObj.profile?.email ?? userObj.email ?? fallbackUser.email
      }
    : {
        id: fallbackUser.userId,
        firstName: fallbackUser.firstName,
        lastName: fallbackUser.lastName,
        email: fallbackUser.email
      };

  // Inject user headers
  requestHeaders.set('x-user-id', finalUser.id);
  requestHeaders.set('x-user-first-name', finalUser.firstName);
  requestHeaders.set('x-user-last-name', finalUser.lastName);
  requestHeaders.set('x-user-email', finalUser.email);
  requestHeaders.set('x-user-full-name', `${finalUser.firstName} ${finalUser.lastName}`);

  // Return response with modified headers
  const res = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  // Store user/account/org as JSON-encoded cookies for frontend
  try {
    res.cookies.set('user', encodeURIComponent(JSON.stringify(finalUser)), {
      path: `/${basePath}`,
      httpOnly: false,
      sameSite: 'lax'
    });
    res.cookies.set('account', encodeURIComponent(JSON.stringify({ id: accountId })), {
      path: `/${basePath}`,
      httpOnly: false,
      sameSite: 'lax'
    });
    if (organizationId) {
      res.cookies.set('organization', encodeURIComponent(JSON.stringify({ id: organizationId })), {
        path: `/${basePath}/`,
        httpOnly: false,
        sameSite: 'lax'
      });
    } else {
      try {
        res.cookies.delete('organization');
      } catch {
        // ignore delete errors
      }
    }
  } catch (e) {
    console.warn('Could not set user/account cookie in middleware', e);
  }

  console.log(
    `[Auth Middleware] Authorized (standalone): ${finalUser.id} (${finalUser.email}) - Account: ${accountId}${organizationId ? `, Org: ${organizationId}` : ''}`
  );

  return res;
}

// Run middleware for all site paths
export const config = {
  matcher: [`/:path*`]
};
