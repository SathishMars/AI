
import { NextRequest, NextResponse } from 'next/server';
import { isWorkflowTemplateReadyForPublish } from '@/app/utils/WorkflowStepUtils';
import { WorkflowTemplate } from '@/app/types/workflowTemplate';

/**
 * POST /api/workflow-templates/validate
 * Expects a JSON body containing a WorkflowTemplate object.
 * Returns { valid: boolean, errors: string[] }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('application/json')) {
			return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
		}

		let body: unknown;
			try {
				body = await request.json();
			} catch {
				return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
			}

		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'Request body must be a workflow template object' }, { status: 400 });
		}

		// Cast to WorkflowTemplate for validation function. The validator will perform detailed checks.
		const template = body as WorkflowTemplate;

		const result = await isWorkflowTemplateReadyForPublish(template);

		// 200 OK with validation result
		return NextResponse.json({ valid: result.valid, errors: result.errors }, { status: 200 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}



