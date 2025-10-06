// src/app/api/workflow-templates/[templateName]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkflowTemplate,
  createDraftFromPublished,
  updateWorkflowTemplate,
  publishWorkflowTemplate,
  deleteWorkflowTemplate
} from '@/app/utils/workflow-template-database';
import { TemplateError } from '@/app/types/workflow-template';
import { WorkflowTemplateService } from '@/app/services/workflow-template-service';

/**
 * Workflow Template API Routes
 * 
 * GET    /api/workflow-templates/[templateName] - Get template with conversation history
 * PUT    /api/workflow-templates/[templateName] - Update template
 * DELETE /api/workflow-templates/[templateName] - Delete template
 * POST   /api/workflow-templates/[templateName] - Create draft from published template
 */

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/workflow-templates/[templateName]
 * Retrieve a workflow template with conversation history
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Decode URL-encoded template ID
    const decodedTemplateId = decodeURIComponent(id);

    // Get account from headers or query params
    const url = new URL(request.url);
    const account = url.searchParams.get('account') || request.headers.get('x-account') || 'groupize-demos';
    const organization = url.searchParams.get('organization') || request.headers.get('x-organization') || null;

    // Get template with conversation history
    const result = await getWorkflowTemplate(account, organization,decodedTemplateId);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Failed to get workflow template:', error);

    if (error instanceof TemplateError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workflow-templates/[templateName]
 * Update an existing workflow template
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: templateName } = await params;
    const body = await request.json();

    if (!templateName) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    const { version, updates, action } = body;

    if (!version) {
      return NextResponse.json(
        { error: 'Template version is required' },
        { status: 400 }
      );
    }

    // Get account from headers or body
    const account = body.account || request.headers.get('x-account') || 'default-account';

    // Decode URL-encoded template name
    const decodedTemplateName = decodeURIComponent(templateName);

    let result;

    // Handle different actions
    switch (action) {
      case 'publish':
        result = await publishWorkflowTemplate(account, decodedTemplateName, version);
        break;

      case 'update':
        if (!updates) {
          return NextResponse.json(
            { error: 'Updates are required for update action' },
            { status: 400 }
          );
        }
        
        // Validate workflow structure if workflowDefinition is being updated
        if (updates.workflowDefinition) {
          const service = new WorkflowTemplateService();
          
          // Support both legacy WorkflowJSON and new WorkflowDefinition format
          // WorkflowDefinition has { steps: WorkflowStep[] }
          // WorkflowJSON has { steps: unknown[], metadata: {...}, schemaVersion: string }
          const isWorkflowDefinition = updates.workflowDefinition.steps && 
            !updates.workflowDefinition.metadata && 
            !updates.workflowDefinition.schemaVersion;
          
          if (isWorkflowDefinition) {
            // Validate new format
            const workflowValidation = service.validateWorkflow(updates.workflowDefinition);
            
            if (!workflowValidation.isValid) {
              return NextResponse.json(
                { 
                  error: 'Invalid workflow structure',
                  code: 'INVALID_WORKFLOW',
                  details: workflowValidation.errors
                },
                { status: 400 }
              );
            }
          } else {
            // Legacy format - WorkflowJSON with metadata
            // Basic validation only (full validation requires WorkflowDefinition)
            if (!Array.isArray(updates.workflowDefinition.steps)) {
              return NextResponse.json(
                { 
                  error: 'Invalid workflow structure: steps must be an array',
                  code: 'INVALID_WORKFLOW'
                },
                { status: 400 }
              );
            }
          }
        }
        
        result = await updateWorkflowTemplate(account, decodedTemplateName, version, updates);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "update" or "publish"' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Failed to update workflow template:', error);

    if (error instanceof TemplateError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflow-templates/[templateName]
 * Create a draft from a published template
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: templateName } = await params;
    const body = await request.json();

    if (!templateName) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    const { publishedVersion, author } = body;

    if (!publishedVersion) {
      return NextResponse.json(
        { error: 'Published version is required' },
        { status: 400 }
      );
    }

    if (!author) {
      return NextResponse.json(
        { error: 'Author is required' },
        { status: 400 }
      );
    }

    // Get account from headers or body
    const account = body.account || request.headers.get('x-account') || 'default-account';

    // Decode URL-encoded template name
    const decodedTemplateName = decodeURIComponent(templateName);

    // Create draft from published template
    const result = await createDraftFromPublished(
      account,
      decodedTemplateName,
      publishedVersion,
      author
    );

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create draft from published template:', error);

    if (error instanceof TemplateError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : 
                        error.code === 'DRAFT_EXISTS' ? 409 : 400;
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflow-templates/[templateName]
 * Delete a workflow template
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: templateName } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');

    if (!templateName) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        { error: 'Template version is required as query parameter' },
        { status: 400 }
      );
    }

    // Get account from headers or query params
    const account = request.headers.get('x-account') || 'default-account';

    // Decode URL-encoded template name
    const decodedTemplateName = decodeURIComponent(templateName);

    // Delete template
    const deleted = await deleteWorkflowTemplate(account, decodedTemplateName, version);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete workflow template:', error);

    if (error instanceof TemplateError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : 
                        error.code === 'DELETION_BLOCKED' ? 409 : 400;
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}