// src/app/api/workflow-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, createTemplate } from '@/app/services/workflowTemplateService';
import { TemplateStatus } from '@/app/types/workflowTemplate';

/**
 * Public Workflow Templates API Routes
 * 
 * User-facing endpoints (authenticated via user JWT cookie)
 * - UX-optimized responses
 * - Can change with UI requirements
 * 
 * GET  /api/workflow-templates - List templates with filtering and pagination
 * POST /api/workflow-templates - Create a new template
 */

/**
 * GET /api/workflow-templates
 * List workflow templates with filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters (public API specific)
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    
    const statusParam = searchParams.get('status');
    const status = statusParam 
      ? statusParam.split(',').map(s => s.trim() as TemplateStatus)
      : undefined;
    
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const createdAfter = searchParams.get('createdAfter') 
      ? new Date(searchParams.get('createdAfter')!) 
      : undefined;
    const createdBefore = searchParams.get('createdBefore') 
      ? new Date(searchParams.get('createdBefore')!) 
      : undefined;

    // Get account/org from headers (injected by middleware from user token)
    const account = searchParams.get('account') || request.headers.get('x-account') || 'groupize-demos';
    // If no organization provided, pass undefined to get ALL templates for account (not just account-level)
    const organization = searchParams.get('organization') || request.headers.get('x-organization') || undefined;
    
    // Logging (public API context)
    console.log('🌐 [Public API] List templates:', {
      account,
      organization,
      status,
      page,
      pageSize,
    });
    
    // Call shared business logic
    const result = await listTemplates({
      account,
      organization,
      page,
      pageSize,
      status,
      tags,
      createdAfter,
      createdBefore,
    });

    console.log('✅ [Public API] Returning', result.templates.length, 'templates');

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('[Public API] Failed to list templates:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error instanceof Error && error.message.includes('must be greater') ? 400 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

/**
 * POST /api/workflow-templates
 * Create a new workflow template
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Get account/org from headers (injected by middleware from user token)
    const account = body.account || request.headers.get('x-account') || 'default-account';
    const organization = body.organization || request.headers.get('x-organization') || undefined;
    
    console.log('📥 [Public API] Create template:', { account, organization });
    
    // Call shared business logic
    const created = await createTemplate({
      account,
      organization,
      templateData: body,
    });
    
    console.log('✅ [Public API] Template created:', {
      id: created.id,
      version: created.version,
      status: created.metadata.status,
      label: created.metadata.label,
    });
    
    return NextResponse.json({ success: true, data: created }, { status: 201 });

  } catch (error) {
    console.error('[Public API] Failed to create template:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error instanceof Error && error.message.includes('Invalid template') ? 400 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}