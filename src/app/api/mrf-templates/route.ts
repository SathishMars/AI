import { NextResponse } from 'next/server';
import MrfTemplateDBUtil from '@/app/utils/mrfTemplateDBUtil';

/**
 * GET /api/mrf-templates?account=...&organization=...&userId=...
 * Returns an array of MRf template summaries for the given account.
 */
export async function GET(request: Request) {
  try {
    // Read account/org/user from headers injected by middleware (preferred)
    const account = request.headers.get('x-account') || undefined;
    const organization = request.headers.get('x-organization') ?? undefined;
    const userId = request.headers.get('x-user-id') ?? undefined;

    if (!account) {
      return NextResponse.json({ error: 'Missing required header: x-account' }, { status: 400 });
    }

    const templates = await MrfTemplateDBUtil.getTemplatesForAccount(account, organization, userId);

    return NextResponse.json({ data: templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
