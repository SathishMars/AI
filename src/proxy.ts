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
export async function proxy(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    console.log('[Auth Middleware] pathname:', pathname, 'basePath:', env.basePath, 'mode:', env.authMode);

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

    if (env.authMode === 'embedded') {
      return await handleEmbeddedMode(request, pathname);
    }

    return await handleStandaloneMode(request);

  } catch (err) {
    console.error('[Auth Middleware] Critical error:', err);
    
    if (env.isProduction && env.authMode === 'embedded') {
      return NextResponse.redirect(getRailsAppUrl());
    }
    
    return NextResponse.next();
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
async function handleEmbeddedMode(request: NextRequest, pathname: string) {
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

async function handleStandaloneMode(request: NextRequest) {
  const url = request.nextUrl;
  const accountFromQuery = url.searchParams.get('account');
  const accountFromHeader = request.headers.get('x-account');
  const accountFromCookie = request.cookies.get('account')?.value;
  const orgFromQuery = url.searchParams.get('organization');
  const orgFromHeader = request.headers.get('x-organization');
  const orgFromCookie = request.cookies.get('organization')?.value;

  const apiUrl = buildApiUrl(request, accountFromQuery, orgFromQuery);
  const fallbackUser = {
    userId: 'john.doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    fullName: 'John Doe'
  };

  let fetchedData: UserSessionData = null;
  try {
    console.log('[Auth Middleware] Fetching user session from', apiUrl.toString());
    const apiRes = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        [MIDDLEWARE_SKIP_HEADER]: MIDDLEWARE_SKIP_VALUE
      }
    });

    if (apiRes.ok) {
      const json = await apiRes.json().catch(() => null);
      if (json && json.success && json.data) {
        fetchedData = json.data;
      }
    } else {
      console.warn('[Auth Middleware] User-session fetch failed with response', apiRes.status);
    }
  } catch (err) {
    console.warn('[Auth Middleware] User-session fetch failed', err);
  }

  const accountId = fetchedData?.account?.id || accountFromQuery || accountFromHeader || accountFromCookie || 'groupize-demos';
  
  let organizationObj = fetchedData?.currentOrganization || null;
  if (!organizationObj) {
    if (orgFromQuery) {
      organizationObj = { id: orgFromQuery };
    } else if (orgFromHeader) {
      organizationObj = { id: orgFromHeader };
    } else if (orgFromCookie) {
      organizationObj = { id: orgFromCookie };
    }
  }
  const organizationId = organizationObj?.id || null;
  const userObj = fetchedData?.user || null;

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

  requestHeaders.set('x-user-id', finalUser.id);
  requestHeaders.set('x-user-first-name', finalUser.firstName);
  requestHeaders.set('x-user-last-name', finalUser.lastName);
  requestHeaders.set('x-user-email', finalUser.email);
  requestHeaders.set('x-user-full-name', `${finalUser.firstName} ${finalUser.lastName}`);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  const cookiePath = env.basePath ? `/${env.basePath}` : '/';
  try {
    res.cookies.set('user', encodeURIComponent(JSON.stringify(finalUser)), {
      path: cookiePath,
      httpOnly: false,
      sameSite: 'lax'
    });
    res.cookies.set('account', encodeURIComponent(JSON.stringify({ id: accountId })), {
      path: cookiePath,
      httpOnly: false,
      sameSite: 'lax'
    });
    if (organizationId) {
      res.cookies.set('organization', encodeURIComponent(JSON.stringify({ id: organizationId })), {
        path: cookiePath,
        httpOnly: false,
        sameSite: 'lax'
      });
    } else {
      try {
        res.cookies.delete('organization');
      } catch {
      }
    }
  } catch (e) {
    console.warn('[Auth Middleware] Could not set user/account cookie', e);
  }
  console.log(
    `[Auth Middleware] Authorized (standalone): ${finalUser.id} (${finalUser.email}) - Account: ${accountId}${organizationId ? `, Org: ${organizationId}` : ''}`
  );

  return res;
}

export const config = {
  matcher: [`/:path*`]
};