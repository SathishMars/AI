// src/app/api/workflow-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  createWorkflowTemplate,
  listWorkflowTemplates
} from '@/app/utils/workflow-template-database';
import {
  TemplateError,
  CreateWorkflowTemplateInputSchema,
  TemplateStatus,
  TemplateQueryFilters
} from '@/app/types/workflow-template';

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
    const status = searchParams.get('status') as TemplateStatus | null;
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

    // Get templates
    const result = await listWorkflowTemplates(account, filters, page, pageSize);

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

    // Create template
    const result = await createWorkflowTemplate(templateInput);

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