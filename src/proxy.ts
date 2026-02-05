import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/app/lib/env';
import { requireSessionFromToken, requireAccountAccess, requireOrganizationAccess } from '@/app/lib/dal';
import { logger } from '@/app/lib/logger';

const MIDDLEWARE_SKIP_HEADER = 'x-middleware-skip';
const MIDDLEWARE_SKIP_VALUE = '1';

function getRailsAppUrl(): URL {
  return new URL('/', env.railsBaseUrl || 'http://groupize.local');
}

export async function proxy(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    logger.debugMiddleware('[Auth Middleware] Processing request for:', pathname);
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname === '/favicon.ico' ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
      pathname === '/health'
    ) {
      return NextResponse.next();
    }

    // Skip if already processed by middleware (prevent recursion)
    if (request.headers.get(MIDDLEWARE_SKIP_HEADER) === MIDDLEWARE_SKIP_VALUE) {
      return NextResponse.next();
    }

    // Skip the user-session endpoint itself to prevent infinite loop
    if (pathname === '/api/user-session/') {
      return NextResponse.next();
    }

    if (request.nextUrl.pathname.startsWith('/api/health')) {
      return NextResponse.next();
    }

    // Skip the auth renewal endpoint - it needs to handle expired/missing tokens
    // and will proxy to Rails which will decide if renewal is valid
    if (pathname.startsWith('/api/auth/renew') || pathname.startsWith(`${env.basePath}/api/auth/renew`)) {
      return NextResponse.next();
    }

    // Skip internal API routes - they use service token auth via withServiceAuth wrapper
    if (pathname.startsWith('/api/internal/') || pathname.startsWith(`${env.basePath}/api/internal/`)) {
      logger.debugMiddleware('[Auth Middleware] Skipping internal API route (uses service auth)');
      return NextResponse.next();
    }

    // Skip database initialization endpoint - called during deployment, not on every request
    if (
      pathname.startsWith('/api/initialize') || 
      pathname.startsWith(`${env.basePath}/api/initialize`)||
      pathname.startsWith('/initialize') || 
      pathname.startsWith(`${env.basePath}/initialize`)
    ) {
      logger.debugMiddleware('[Auth Middleware] Skipping database initialization endpoint');
      return NextResponse.next();
    }

    // Skip insights routes - they don't require authentication
    if (
      pathname.startsWith('/insights') || 
      pathname.startsWith('/arrivals') ||
      pathname.startsWith(`${env.basePath}/insights`) ||
      pathname.startsWith(`${env.basePath}/arrivals`)
    ) {
      logger.debugMiddleware('[Auth Middleware] Skipping insights route (no auth required)');
      return NextResponse.next();
    }

    // Skip insights API routes - chat doesn't require workflow authentication
    // Note: GraphQL now connects directly to standalone server, so /api/graphql proxy is no longer used
    if (
      pathname.startsWith('/api/chat') ||
      pathname.startsWith(`${env.basePath}/api/chat`)
    ) {
      console.log('[Auth Middleware] Skipping insights API route (no auth required)');
      return NextResponse.next();
    }

    return await handleUserAuth(request, pathname);

  } catch (err) {
    console.error('[Auth Middleware] Critical error:', err);
    return NextResponse.redirect(getRailsAppUrl());
  }
}


/**
 * Handle JWT authentication and route protection
 * 
 * Architecture:
 * - Verifies JWT token from cookie and extracts user/account/org claims
 * - Validates URL account/org IDs against JWT claims (route protection)
 * - Client-side hook (useJwtRenewal) calls Next.js /api/auth/renew endpoint
 * - Next.js /api/auth/renew proxies to Rails /auth/renew, forwarding cookies
 * - All JWT and cookie handling stays server-side (Next.js ↔ Rails)
 * - Browser never directly interacts with Rails or handles JWTs
 */
async function handleUserAuth(request: NextRequest, pathname: string) {
  const token = request.cookies.get(env.cookieName)?.value;
  
  if (!token) {
    const railsUrl = getRailsAppUrl();
    logger.debugMiddleware('[Auth Middleware] No token found, redirecting to rails app:', railsUrl.toString());
    return NextResponse.redirect(railsUrl);
  }

  // Use DAL function for middleware-compatible session verification
  let session;
  try {
    session = await requireSessionFromToken(token);
  } catch (error) {
    console.error('[Auth Middleware] Session verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.redirect(getRailsAppUrl());
  }

  return buildAuthorizedResponse(request, pathname, session);
}

/**
 * Build an authorized response with user context headers
 */
async function buildAuthorizedResponse(
  request: NextRequest,
  pathname: string,
  session: Awaited<ReturnType<typeof requireSessionFromToken>>
): Promise<NextResponse> {
  const fullName = `${session.firstName} ${session.lastName}`.trim();
  
  const currentUser = {
    userId: session.userId,
    accountId: session.accountId,
    organizationId: session.organizationId,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    fullName,
    expiresAt: session.expiresAt.toISOString(),
  };
  
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
  
  if (urlAccountId) {
    try {
      requireAccountAccess(session, urlAccountId);
    } catch (error) {
      console.error(
        `[Auth Middleware] Account access denied. URL: ${urlAccountId}, JWT: ${session.accountId}`
      );
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Forbidden: Account access denied' },
        { status: 403 }
      );
    }
  }
  
  if (urlOrgId) {
    try {
      requireOrganizationAccess(session, urlOrgId);
    } catch (error) {
      console.error(
        `[Auth Middleware] Organization access denied. URL: ${urlOrgId}, JWT: ${session.organizationId || 'none'}`
      );
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Forbidden: Organization access denied' },
        { status: 403 }
      );
    }
  }
  
  const requestHeaders = new Headers(request.headers);
  
  requestHeaders.set('x-user-id', currentUser.userId);
  requestHeaders.set('x-user-email', currentUser.email);
  requestHeaders.set('x-user-first-name', currentUser.firstName);
  requestHeaders.set('x-user-last-name', currentUser.lastName);
  requestHeaders.set('x-user-full-name', currentUser.fullName);
  requestHeaders.set('x-account-id', currentUser.accountId);
  
  if (currentUser.organizationId) {
    requestHeaders.set('x-organization-id', currentUser.organizationId);
  }
  
  if (currentUser.expiresAt) {
    requestHeaders.set('x-session-expires-at', currentUser.expiresAt);
  }
  
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

export const config = {
  matcher: [`/:path*`]
};