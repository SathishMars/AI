/**
 * Internal Workflow Templates API
 * 
 * Service-to-service endpoints for Rails to call Next.js.
 * Protected by service token authentication (aud="workflows-api").
 * 
 * Purpose:
 * - Backend automation (stable contract)
 * - Separate from user-facing APIs (different SLA)
 * - Service token required (user tokens rejected)
 * - No CSRF risk (header-based auth)
 * - Separate observability (system-critical traffic)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withServiceAuth } from '@/app/api/internal/middleware';
import { listTemplates, createTemplate } from '@/app/services/workflowTemplateService';
import { TemplateStatus } from '@/app/types/workflowTemplate';

export const GET = withServiceAuth(async (request: NextRequest, context): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const statusParam = searchParams.get('status');
    const status = statusParam 
      ? statusParam.split(',').map(s => s.trim() as TemplateStatus)
      : undefined;
    const typeParam = searchParams.get('type');
    const type = typeParam === 'Request' || typeParam === 'MRF' ? typeParam : undefined;
    const account = context.accountId;
    const organization = context.organizationId || undefined;
    
    const result = await listTemplates({
      account,
      organization,
      page,
      pageSize,
      status,
      type,
    });

    return NextResponse.json({ 
      success: true, 
      data: result 
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error instanceof Error && error.message.includes('must be greater') ? 400 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
});

/**
 * POST /api/internal/workflow-templates
 * Create a new workflow template (Rails → Next.js)
 * 
 * Authentication: Service token (aud="workflows-api", sub="service:rails")
 * Authorization: Account/org from verified token claims
 */
export const POST = withServiceAuth(async (request: NextRequest, context): Promise<NextResponse> => {
  try {
    const body = await request.json();
    const account = context.accountId;
    const organization = context.organizationId;

    console.log('[Internal API] Create template:', {
      service: context.serviceName,
      user: context.userId,
      account,
      organization,
      requestId: context.requestId,
    });

    const created = await createTemplate({
      account,
      organization,
      templateData: body,
    });
    
    console.log('[Internal API] Template created:', created.id);
    
    return NextResponse.json({ 
      success: true, 
      data: created 
    }, { status: 201 });

  } catch (error) {
    console.error('[Internal API] Failed to create template:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error instanceof Error && error.message.includes('Invalid template') ? 400 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
});

