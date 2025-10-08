// src/app/api/workflow-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  createWorkflowTemplate,
  listWorkflowTemplates
} from '@/app/utils/workflow-template-database';
import {
  TemplateError,
  TemplateStatus,
  TemplateQueryFilters
} from '@/app/types/workflow-template';
import {
  CreateWorkflowTemplateInputSchema
} from '@/app/types/workflow-template-v2';

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
    
    const category = searchParams.get('category');
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
    if (category) filters.category = category;
    if (author) filters.author = author;
    if (tags) filters.tags = tags;
    if (createdAfter) filters.createdAfter = createdAfter;
    if (createdBefore) filters.createdBefore = createdBefore;
    if (organization !== null) filters.organization = organization; // Include organization filter

    // Get templates (returns only latest version per template ID)
    const result = await listWorkflowTemplates(account, filters, page, pageSize);
    
    console.log('✅ [API GET] Returning templates:');
    console.log('  - Total unique templates:', result.templates.length);
    console.log('  - Template IDs:', result.templates.map(t => t.id));
    console.log('  - Template names:', result.templates.map(t => t.metadata.name));

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Failed to list workflow templates:', error);

    if (error instanceof TemplateError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    // Validate input
    const validationResult = CreateWorkflowTemplateInputSchema.safeParse(inputWithContext);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid template data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const templateInput = validationResult.data;

    console.log('📥 [API] Received template data from frontend:');
    console.log('📋 [API] Full request body JSON:', JSON.stringify(templateInput, null, 2));

    // Transform to database format
    // Database expects: composite keys (id, account, organization, version) at top level
    // Descriptive fields (name, description, status, author, timestamps) in metadata object
    const dbInput = {
      account: templateInput.account,
      organization: templateInput.organization || undefined,
      name: templateInput.name,
      workflowDefinition: {
        steps: templateInput.workflowDefinition?.steps || []
      },
      mermaidDiagram: templateInput.mermaidDiagram,
      description: templateInput.description,
      category: templateInput.category,
      tags: templateInput.tags || ['ai-generated'],
      author: templateInput.author || 'system'
    };

    console.log('🔄 [API] Transformed data for database:');
    console.log('📋 [API] Full transformed dbInput JSON:', JSON.stringify(dbInput, null, 2));

    // Create template (id, version, status will be generated by createWorkflowTemplate)
    const result = await createWorkflowTemplate(dbInput);
    
    console.log('✅ [API] Template created successfully:');
    console.log('  - ID:', result.id);
    console.log('  - Version:', result.version);
    console.log('  - Status:', result.metadata.status);
    console.log('  - Name:', result.metadata.name);

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create workflow template:', error);

    if (error instanceof TemplateError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}