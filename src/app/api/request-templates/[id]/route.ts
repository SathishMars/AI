// Workflows/src/app/api/request-templates/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/app/lib/env';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = request.headers.get('x-account');
    const organizationId = request.headers.get('x-organization');
    const requestTemplateId = params.id;
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID not found in request headers' },
        { status: 400 }
      );
    }
    
    if (!requestTemplateId) {
      return NextResponse.json(
        { error: 'Request template ID is required' },
        { status: 400 }
      );
    }
    
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('gpw_session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const jwtToken = sessionCookie.value;
    const railsBaseUrl = env.railsBaseUrl;
    const url = new URL(`${railsBaseUrl}/api/v1/requests/${encodeURIComponent(requestTemplateId)}`);


    url.searchParams.set('account_id', accountId);
    url.searchParams.set('organization_id', organizationId || '');
    
    const railsResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Cookie': `gpw_session=${jwtToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (!railsResponse.ok) {
      const errorText = await railsResponse.text();
      console.error('[request-templates/[id]] Rails API error:', {
        status: railsResponse.status,
        statusText: railsResponse.statusText,
        errorBody: errorText,
      });
      return NextResponse.json(
        { error: 'Failed to fetch request template from Rails', details: errorText },
        { status: railsResponse.status }
      );
    }
    
    const data = await railsResponse.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

