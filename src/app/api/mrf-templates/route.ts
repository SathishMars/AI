import { NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/dal';
import { AuthenticationError, AuthorizationError } from '@/app/lib/auth-errors';
import MrfTemplateDBUtil from '@/app/utils/mrfTemplateDBUtil';

/**
 * GET /api/mrf-templates?account=...&organization=...&userId=...
 * Returns an array of MRf template summaries for the given account.
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const account = session.accountId || request.headers.get('x-account') || undefined;
    const organization = (session.organizationId || request.headers.get('x-organization')) ?? undefined;
    const userId = (session.userId || request.headers.get('x-user-id')) ?? undefined;

    if (!account) {
      return NextResponse.json({ error: 'Missing required header: x-account' }, { status: 400 });
    }

    const templates = await MrfTemplateDBUtil.getTemplatesForAccount(account, organization, userId);

    return NextResponse.json({ data: templates });
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json(
        { error: 'Unauthorized', code: err.code },
        { status: err.statusCode }
      );
    }
    
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: 'Forbidden', code: err.code },
        { status: err.statusCode }
      );
    }
    
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
