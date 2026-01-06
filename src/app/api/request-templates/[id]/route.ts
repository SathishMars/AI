// Workflows/src/app/api/request-templates/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/dal';
import { AuthenticationError, AuthorizationError } from '@/app/lib/auth-errors';
import { railsFetch, RailsApiError } from '@/app/lib/rails-fetcher';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const accountId = session.accountId || request.headers.get('x-account');
    const organizationId = session.organizationId || request.headers.get('x-organization');
    const { id: requestTemplateId } = await params;
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID not found' },
        { status: 400 }
      );
    }
    
    if (!requestTemplateId) {
      return NextResponse.json(
        { error: 'Request template ID is required' },
        { status: 400 }
      );
    }
    
    const data = await railsFetch(
      request,
      `/api/v1/requests/${encodeURIComponent(requestTemplateId)}`,
      {
        method: 'GET',
        searchParams: {
          account_id: accountId,
          organization_id: organizationId || '',
        },
      }
    );

    console.log('[request-templates/[id]] data returned', data);
    
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
      console.error('[request-templates/[id]] Rails API error:', {
        status: error.status,
        statusText: error.statusText,
        errorBody: error.details,
      });
      return NextResponse.json(
        { error: 'Failed to fetch request template from Rails', details: error.details },
        { status: error.status }
      );
    }
    
    console.error('[request-templates/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

