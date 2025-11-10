import { NextRequest, NextResponse } from 'next/server';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Middleware to ensure API routes always receive `x-account` and `x-organization` headers.
 *
 * Priority order for values:
 * 1. URL query params (`account`, `organization`)
 * 2. Existing request headers (`x-account`, `x-organization`)
 * 3. Cookies (`account`, `organization`)
 * 4. Fallback defaults (account: 'groupize-demos', organization: none)
 *
 * Applies to all `/api/*` routes by default (see `config.matcher`).
 */
export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    console.log("[middleware] the pathname:", pathname, ' basePath:', basePath);

    // Skip Next.js internals and static assets to avoid unnecessary middleware work
    // This preserves performance for assets and avoids interfering with internal handlers
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname === '/favicon.ico' ||
      pathname.startsWith('/api/_next')
    ) {
      return NextResponse.next();
    }

    // If this request was made by our middleware (internal fetch), skip processing to avoid recursion
    // We set the header 'x-middleware-skip: 1' on internal fetches below.
    if (request.headers.get('x-middleware-skip') === '1') {
      return NextResponse.next();
    }

    // Skip middleware for the user-session endpoint itself to avoid any chance of recursion
    if (pathname === `/api/user-session`) {
      return NextResponse.next();
    }

    const url = request.nextUrl;

    // Resolve account/org candidates from common sources (query/header/cookie)
    const accountFromQuery = url.searchParams.get('account');
    const accountFromHeader = request.headers.get('x-account');
    const accountFromCookie = request.cookies.get('account')?.value;
    const orgFromQuery = url.searchParams.get('organization');
    const orgFromHeader = request.headers.get('x-organization');
    const orgFromCookie = request.cookies.get('organization')?.value;

    // Build a best-effort API URL to fetch full user/session context
    // Include any resolved query params so the API can be aware if desired.
    let apiUrl: URL;
    try {
      apiUrl = new URL(`${basePath}/api/user-session`, request.nextUrl.origin);
      if (accountFromQuery) apiUrl.searchParams.set('account', accountFromQuery);
      if (orgFromQuery) apiUrl.searchParams.set('organization', orgFromQuery);
    } catch {
      // Fallback when origin isn't available for some runtimes
      const host = request.headers.get('host') || 'localhost:3000';
      apiUrl = new URL(`http://${host}${basePath}/api/user-session`);
      if (accountFromQuery) apiUrl.searchParams.set('account', accountFromQuery);
      if (orgFromQuery) apiUrl.searchParams.set('organization', orgFromQuery);
    }

    // Default mock fallback (kept for robustness if fetch fails)
    const fallbackUser = {
      userId: 'john.doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      fullName: 'John Doe'
    };

    // Small type to represent the subset of the /api/user-session response we consume
    type DemoUser = {
      id?: string;
      userId?: string;
      // Some responses store names/emails at top-level or under profile
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
          // Mark this fetch as internal so middleware doesn't re-run its logic on the server
          'x-middleware-skip': '1'
        }
      });

      if (apiRes.ok) {
        const json = await apiRes.json().catch(() => null);
        if (json && json.success && json.data) {
          fetchedData = json.data;
        }
      } else {
        console.warn('[Middleware]: user-session fetch failed with response', apiRes);
      }
    } catch (err) {
      // network/fetch failed; we'll fall back to defaults below
      console.warn('Middleware: user-session fetch failed', err);
    }

    // Determine final values (prefer fetched data, then explicit request values, then defaults)
    const accountId = fetchedData?.account?.id || accountFromQuery || accountFromHeader || accountFromCookie || 'groupize-demos';
    const organizationObj = fetchedData?.currentOrganization || (orgFromQuery ? { id: orgFromQuery } : orgFromHeader ? { id: orgFromHeader } : orgFromCookie ? { id: orgFromCookie } : null);
    const organizationId = organizationObj?.id || null;
    const userObj = fetchedData?.user || null;

    // Clone existing headers and inject our resolved values (overwriting if present)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-account', accountId);
    if (organizationId) {
      requestHeaders.set('x-organization', organizationId);
    } else {
      requestHeaders.delete('x-organization');
    }

    // Prefer user data from fetched response; otherwise use fallback mock
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

    // Inject user headers for API consumers
    requestHeaders.set('x-user-id', finalUser.id);
    requestHeaders.set('x-user-first-name', finalUser.firstName);
    requestHeaders.set('x-user-last-name', finalUser.lastName);
    requestHeaders.set('x-user-email', finalUser.email);
    requestHeaders.set('x-user-full-name', `${finalUser.firstName} ${finalUser.lastName}`);

    // Return a response that includes the modified headers and a client-readable cookie
    const res = NextResponse.next({
      request: {
        // Provide the modified headers so downstream API routes see them
        headers: requestHeaders
      }
    });

    // Store the user/account/org as JSON-encoded cookies so frontend JS can read them easily.
    // Use encodeURIComponent to keep the cookie values safe. Non-httpOnly so client can read.
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
        // remove cookie when no org
        try {
          // use single-arg delete to match ResponseCookies API in some runtimes
          res.cookies.delete('organization');
        } catch {
          // some runtimes may not support delete; ignore
        }
      }
    } catch (e) {
      console.warn('Could not set user/account cookie in middleware', e);
    }

    return res;
  } catch (err) {
    // If anything goes wrong, continue without modification but log for debugging
    // Avoid throwing to ensure middleware doesn't block requests in production
    console.error('Middleware error injecting account/org headers', err);
    return NextResponse.next();
  }
}

// Run middleware for all site paths. The middleware itself early-returns for internal/static
// paths (see above) to avoid interfering with Next internals.
export const config = {
  matcher: [`/:path*`]
};