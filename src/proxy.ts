import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, JWTVerificationError, UserJWTClaims } from '@/app/lib/jwt-verifier';
import { env } from '@/app/lib/env';

const MIDDLEWARE_SKIP_HEADER = 'x-middleware-skip';
const MIDDLEWARE_SKIP_VALUE = '1';

// standalone mode
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


function getRailsAppUrl(): URL {
  return new URL('/', env.railsBaseUrl || 'http://groupize.local');
}



function buildApiUrl(request: NextRequest, accountFromQuery: string | null, orgFromQuery: string | null): URL {
  try {
    const apiUrl = new URL(`${env.basePath}/api/user-session/`, request.nextUrl.origin);
    if (accountFromQuery) apiUrl.searchParams.set('account', accountFromQuery);
    if (orgFromQuery) apiUrl.searchParams.set('organization', orgFromQuery);
    return apiUrl;
  } catch {
    const host = request.headers.get('host') || 'localhost:3000';
    const apiUrl = new URL(`http://${host}${env.basePath}/api/user-session/`);
    if (accountFromQuery) apiUrl.searchParams.set('account', accountFromQuery);
    if (orgFromQuery) apiUrl.searchParams.set('organization', orgFromQuery);
    return apiUrl;
  }
}

export async function proxy(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname === '/favicon.ico' ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
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

    // Skip internal API routes - they use service token auth via withServiceAuth wrapper
    if (pathname.startsWith('/api/internal/') || pathname.startsWith(`${env.basePath}/api/internal/`)) {
      console.log('[Auth Middleware] Skipping internal API route (uses service auth)');
      return NextResponse.next();
    }

    return await handleUserAuth(request, pathname);

  } catch (err) {
    console.error('[Auth Middleware] Critical error:', err);
    return NextResponse.redirect(getRailsAppUrl());
  }
}


/**
 * Handle embedded mode authentication
 * 
 * Architecture:
 * - Client-side hook (useJwtRenewal) handles proactive renewal 5 minutes before token expiry
 * - Middleware only verifies tokens and redirects if expired/invalid
 * - This separation ensures renewal happens proactively in the browser, not reactively in middleware
 */
async function handleUserAuth(request: NextRequest, pathname: string) {
  const token = request.cookies.get(env.cookieName)?.value;
  
  if (!token) {
    const railsUrl = getRailsAppUrl();
    console.log('[Auth Middleware] No token found, redirecting to rails app:', railsUrl.toString());
    return NextResponse.redirect(railsUrl);
  }

  let claims: UserJWTClaims;
  try {
    claims = await verifyUserToken(token);
  } catch (error) {
    if (error instanceof JWTVerificationError) {
      console.error('[Auth Middleware] Token verification failed:', error.code);
      console.error('[Auth Middleware] Error details:', error.message);
    } else {
      console.error('[Auth Middleware] Unexpected verification error:', error);
    }
    
    return NextResponse.redirect(getRailsAppUrl());
  }

  return buildAuthorizedResponse(request, pathname, claims);
}

/**
 * Build an authorized response with user context headers
 */
async function buildAuthorizedResponse(
  request: NextRequest,
  pathname: string,
  claims: UserJWTClaims
): Promise<NextResponse> {
  const fullName = `${claims.context.user_first_name} ${claims.context.user_last_name}`.trim();
  
  const currentUser = {
    userId: claims.context.user_id,
    accountId: claims.context.account_id,
    organizationId: claims.context.organization_id,
    email: claims.context.email,
    firstName: claims.context.user_first_name,
    lastName: claims.context.user_last_name,
    fullName,
    expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : undefined,
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
  
  if (urlAccountId && urlAccountId !== currentUser.accountId) {
    console.error(
      `[Auth Middleware] Account ID mismatch. URL: ${urlAccountId}, JWT: ${currentUser.accountId}`
    );
    return NextResponse.json(
      { error: 'Forbidden: Account access denied' },
      { status: 403 }
    );
  }
  
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