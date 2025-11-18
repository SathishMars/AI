import { NextRequest, NextResponse } from 'next/server';
import { withServiceAuth } from '@/app/api/internal/middleware';
import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import { WorkflowTemplate } from '@/app/types/workflowTemplate';
import ShortUniqueId from 'short-unique-id';

const uid = new ShortUniqueId({ length: 10, dictionary: 'alphanum' });

function generateShortId(): string {
  return uid.rnd();
}

export const POST = withServiceAuth(async (request: NextRequest, context): Promise<NextResponse> => {
  try {
    const body = await request.json();    
    const name = body.name || 'New Workflow';
    const account = context.accountId;
    const organization = context.organizationId || null;
    const userId = context.userId;
    const templateId = generateShortId();
    const now = new Date().toISOString();

    const template: WorkflowTemplate = {
      id: templateId,
      account,
      organization,
      version: '0.1.0',
      metadata: {
        label: name,
        description: '',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        tags: [],
      },
      workflowDefinition: {
        steps: [],
      },
    };

    const created = await WorkflowTemplateDbUtil.create(template);
    
    return NextResponse.json({ 
      success: true, 
      data: created 
    }, { status: 201 });

  } catch (error) {
    console.error('[Internal API Init] Failed to initialize template:', error);
    console.error('[Internal API Init] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: message,
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
});

