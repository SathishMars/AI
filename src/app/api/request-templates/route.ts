// Workflows/src/app/api/request-templates/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/dal';
import { AuthenticationError, AuthorizationError } from '@/app/lib/auth-errors';
import { railsFetch, RailsApiError } from '@/app/lib/rails-fetcher';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const accountId = session.accountId || request.headers.get('x-account');
    const organizationId = session.organizationId || request.headers.get('x-organization');
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID not found' },
        { status: 400 }
      );
    }
    
    const data = await railsFetch(request, '/api/v1/requests', {
      method: 'GET',
      searchParams: {
        template: 'true',
        active: 'true',
        account_id: accountId,
        ...(organizationId && { organization_id: organizationId }),
      },
    });

    console.log('[request-templates] data returned', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: 'Unauthorized', code: error.code },
        { status: error.statusCode }
      );
    }
    
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: 'Forbidden', code: error.code },
        { status: error.statusCode }
      );
    }
    
    if (error instanceof RailsApiError) {
      console.error('[request-templates] Rails API error:', {
        status: error.status,
        statusText: error.statusText,
        errorBody: error.details,
      });
      return NextResponse.json(
        { error: 'Failed to fetch templates from Rails', details: error.details },
        { status: error.status }
      );
    }
    
    console.error('[request-templates] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}