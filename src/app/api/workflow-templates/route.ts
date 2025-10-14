// src/app/api/workflow-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import { WorkflowTemplate, WorkflowTemplateSchema, TemplateStatus } from '@/app/types/workflowTemplate';

type TemplateQueryFilters = {
  status?: TemplateStatus[] | TemplateStatus;
  category?: string;
  author?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  organization?: string | null;
};

/**
 * Workflow Templates API Routes
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

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    
    // Parse status - can be comma-separated values like "draft,published"
    const statusParam = searchParams.get('status');
    const status = statusParam 
      ? statusParam.split(',').map(s => s.trim() as TemplateStatus)
      : undefined;
    
    const author = searchParams.get('author');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const createdAfter = searchParams.get('createdAfter') 
      ? new Date(searchParams.get('createdAfter')!) 
      : undefined;
    const createdBefore = searchParams.get('createdBefore') 
      ? new Date(searchParams.get('createdBefore')!) 
      : undefined;

    // Get account and organization from headers or query params (for multi-tenancy)
    const account = searchParams.get('account') || request.headers.get('x-account') || 'groupize-demos';
    const organization = searchParams.get('organization') || request.headers.get('x-organization') || null;
    
    // Debug logging
    console.log('🌐 [API GET] Workflow templates list request:');
    console.log('  - Account:', account);
    console.log('  - Organization:', organization);
    console.log('  - Status filter:', status);
    console.log('  - Page:', page, '/ Page size:', pageSize);
    
    // Validate page and pageSize
    if (page < 1) {
      return NextResponse.json(
        { error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }

    if (pageSize < 1) {
      return NextResponse.json(
        { error: 'Page size must be greater than 0' },
        { status: 400 }
      );
    }

    // Build filters
    const filters: TemplateQueryFilters = {};
    if (status) filters.status = status;
    if (author) filters.author = author;
    if (tags) filters.tags = tags;
    if (createdAfter) filters.createdAfter = createdAfter;
    if (createdBefore) filters.createdBefore = createdBefore;
    if (organization !== null) filters.organization = organization; // Include organization filter

    // Get templates (returns only latest version per template ID)
    const result = await WorkflowTemplateDbUtil.list(account, {
      organization: filters.organization,
      status: filters.status,
      label: undefined,
      tags: filters.tags,
      createdAfter: filters.createdAfter,
      createdBefore: filters.createdBefore
    }, page, pageSize);

    const templates = result.templates as WorkflowTemplate[];

    console.log('✅ [API GET] Returning templates:');
    console.log('  - Total unique templates:', templates.length);
    console.log('  - Template IDs:', templates.map((t) => t.id));
    console.log('  - Template labels:', templates.map((t) => t.metadata.label));

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('Failed to list workflow templates:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/workflow-templates
 * Create a new workflow template
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Get account and organization from headers or body (for multi-tenancy)
    const account = body.account || request.headers.get('x-account') || 'default-account';
    const organization = body.organization || request.headers.get('x-organization') || undefined;
    
    // Add account and organization to the input
    const inputWithContext = { ...body, account };
    if (organization !== undefined) {
      inputWithContext.organization = organization;
    }

    // Validate input against WorkflowTemplate schema (expects full WorkflowTemplate)
    // For convenience we accept a full WorkflowTemplate object from the client.
    try {
      WorkflowTemplateSchema.parse(inputWithContext);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid template data', details: (e as Error).message }, { status: 400 });
    }

    const templateInput = inputWithContext as WorkflowTemplate;

    console.log('📥 [API] Received template data from frontend:');
    console.log('📋 [API] Full request body JSON:', JSON.stringify(templateInput, null, 2));

    // Received a WorkflowTemplate-shaped object. We accept it as-is and store it.

    // Create template in the database via util
    try {
      const created = await WorkflowTemplateDbUtil.create(templateInput);
      console.log('✅ [API] Template created successfully:');
      console.log('  - ID:', created.id);
      console.log('  - Version:', created.version);
      console.log('  - Status:', created.metadata.status);
      console.log('  - Label:', created.metadata.label);
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create template';
      return NextResponse.json({ error: message }, { status: 400 });
    }

  } catch (error) {
    console.error('Failed to create workflow template:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}