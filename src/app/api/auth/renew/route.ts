import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/app/lib/env';
import { getRailsBaseUrl } from '@/app/lib/dal';

/**
 * JWT Renewal Proxy Endpoint
 * 
 * Proxies JWT renewal requests to Rails backend while keeping all JWT/cookie handling
 * server-side. The browser never directly interacts with Rails or sees JWT tokens.
 * 
 * Architecture:
 * - Client calls this Next.js endpoint
 * - Next.js forwards cookies to Rails /auth/renew
 * - Next.js forwards set-cookie headers from Rails back to client
 * - Returns { ok, expiresAt } to browser
 */
export async function POST(request: NextRequest) {
  try {
    const railsRenewUrl = `${env.railsBaseUrl}/auth/renew`;
    
    const cookieHeader = request.headers.get('cookie') || '';
    console.log('[Auth Renew] Proxying renewal request to Rails, cookies present:', !!cookieHeader);
    
    const railsResponse = await fetch(railsRenewUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });

    let responseData: { expiresAt?: string; error?: string; code?: string } = {};
    try {
      const responseText = await railsResponse.text();
      if (responseText) {
        responseData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('[Auth Renew] Failed to parse Rails response:', parseError);
    }

    if (!railsResponse.ok) {
      const shouldRedirect = railsResponse.status === 401 || railsResponse.status === 403;
      
      return NextResponse.json(
        {
          ok: false,
          error: responseData.error || (railsResponse.status === 401 ? 'Session expired' : 'Renewal failed'),
          code: responseData.code || (railsResponse.status === 401 ? 'SESSION_EXPIRED' : 'RENEWAL_FAILED'),
          shouldRedirect,
          redirectUrl: shouldRedirect ? getRailsBaseUrl() : undefined,
        },
        { status: railsResponse.status }
      );
    }

    const nextResponse = NextResponse.json({
      ok: true,
      expiresAt: responseData.expiresAt,
    });

    const setCookieHeaders = railsResponse.headers.getSetCookie();
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;

  } catch (error) {
    console.error('[Auth Renew] Renewal proxy error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Renewal request failed',
        code: 'RENEWAL_ERROR',
        shouldRedirect: false,
      },
      { status: 500 }
    );
  }
}

