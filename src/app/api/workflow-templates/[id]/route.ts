// src/app/api/workflow-templates/[templateName]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import { workflowTemplateStarter } from '@/app/data/workflow-template-starter';
import { WorkflowTemplateSchema, WorkflowTemplate } from '@/app/types/workflowTemplate';
import ShortUniqueId from 'short-unique-id';
import AimeWorkflowMessagesDBUtil from '@/app/utils/aimeWorkflowMessagesDBUtil';

// Reusable ShortUniqueId instance (10 chars, alphanum) — follow repo policy
const uid = new ShortUniqueId({ length: 10, dictionary: 'alphanum' });

// Wrapper to call uid in a type-safe way (the package instance is callable at runtime)
function generateShortUniqueId(): string {
  // runtime-callable but typings sometimes lack call signature; coerce to function
  return uid.rnd();
}

/**
 * Workflow Template API Routes
 * 
 * GET    /api/workflow-templates/[templateName] - Get template details
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

    // Get template (latest or single version) from DB util
    // If frontend requests a new template (id === 'new'), return a starter template
    if (decodedTemplateId === 'new') {
      const userId = request.headers.get('x-user-id') || 'unknown-user';
      const starter = JSON.parse(JSON.stringify(workflowTemplateStarter));
      starter.id = generateShortUniqueId();
      starter.account = account;
      starter.organization = organization;
      // reset version and metadata for a new draft
      starter.version = '0.1.0';
      starter.metadata = {
        ...starter.metadata,
        label: '',
        description: '',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,
        updatedBy: userId,
        tags: []
      };
      starter.workflowDefinition = { steps: [] };
      starter.mermaidDiagram = '';
      return NextResponse.json({ success: true, data: starter });
    }

    const result = await WorkflowTemplateDbUtil.get(account, organization, decodedTemplateId);

    if (!result) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('[WorkflowTemplatesRoute] Failed to get workflow template:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
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
    const body = await request.text();

    if (!templateName) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    // Decode URL-encoded template name
    const decodedTemplateName = decodeURIComponent(templateName);

    // Parse body as full WorkflowTemplate (client should send JSON)
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate against Zod schema
    try {
      WorkflowTemplateSchema.parse(parsedBody);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid template data';
      return NextResponse.json({ error: 'Invalid template data', details: msg }, { status: 400 });
    }

  const template = parsedBody as WorkflowTemplate;

    // Determine account and organization from body or headers
    const account = template.account || request.headers.get('x-account') || 'default-account';
    const organization = template.organization !== undefined ? template.organization : (request.headers.get('x-organization') || null);
    const version = template.version;

    if (!version) {
      return NextResponse.json({ error: 'Template version is required' }, { status: 400 });
    }

    // Upsert using composite key
    const upserted = await WorkflowTemplateDbUtil.upsert(account, organization, decodedTemplateName, version, template);
    return NextResponse.json({ success: true, data: upserted });

  } catch (error) {
    console.error('[WorkflowTemplatesRoute] Failed to update workflow template:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
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
    const bodyText = await request.text();

    if (!templateName) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    // Decode URL-encoded template name
    // [POST /api/workflow-templates/[templateName]] Decoding template name
    console.log('[POST /api/workflow-templates/[templateName]] Received templateName:', templateName);
    const decodedTemplateName = decodeURIComponent(templateName);
    console.log('[POST /api/workflow-templates/[templateName]] Decoded templateName:', decodedTemplateName);

    // Parse body as full WorkflowTemplate (client should send JSON)
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.log('[POST /api/workflow-templates/[templateName]] Parsed the request body:', parsedBody);

    // Validate against schema
    try {
      WorkflowTemplateSchema.parse(parsedBody);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid template data';
      return NextResponse.json({ error: 'Invalid template data', details: msg }, { status: 400 });
    }
    console.log('[POST /api/workflow-templates/[templateName]] validated against workflowTemplateSchema');

    const template = parsedBody as WorkflowTemplate;
    const account = template.account || request.headers.get('x-account') || 'default-account';
    const organization = template.organization !== undefined ? template.organization : (request.headers.get('x-organization') || null);
    const version = template.version;

    if (!version) {
      return NextResponse.json({ error: 'Template version is required' }, { status: 400 });
    }

    console.log('[POST /api/workflow-templates/[templateName]] About to upsert the template with composite key:', { account, organization, decodedTemplateName, version });

    // Upsert the template
    const upserted = await WorkflowTemplateDbUtil.upsert(account, organization, decodedTemplateName, version, template);
    return NextResponse.json({ success: true, data: upserted }, { status: 201 });

  } catch (error) {
    console.error('[WorkflowTemplatesRoute] Failed to create draft from published template:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
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
    const deleted = await WorkflowTemplateDbUtil.delete(account, decodedTemplateName, version);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found or could not be deleted' },
        { status: 404 }
      );
    }

    const deletedChats = await AimeWorkflowMessagesDBUtil.deleteMessagesForTemplate(account, decodedTemplateName);
    console.log(`[WorkflowTemplatesRoute] Deleted ${deletedChats.deletedCount} associated conversation messages.`); 


    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('[WorkflowTemplatesRoute] Failed to delete workflow template:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}