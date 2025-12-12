import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/dal';
import { AuthenticationError, AuthorizationError } from '@/app/lib/auth-errors';
import { validateWorkflowDefinition, WorkflowDefinition } from '@/app/types/workflowTemplate';
import { AimeWorkflowConversationsRecord, WorkflowMessage } from '@/app/types/aimeWorkflowMessages';
import { generateMermaidFromWorkflow } from '@/app/utils/MermaidGenerator';
import ShortUniqueId from 'short-unique-id';
import AimeWorkflowMessagesDBUtil from '@/app/utils/aimeWorkflowMessagesDBUtil';
import { runAgentToGenerateWorkflow } from '@/app/utils/aiSdkAgent';

// Increase timeout for AI workflow generation (can take 5+ minutes)
export const maxDuration = 300; // 5 minutes

// 10-char alphanumeric short id generator (reusable instance)
const uid = new ShortUniqueId({ length: 10, dictionary: 'alphanum' });

// Helper to produce an id string
function generateShortId(): string {
  // use rnd() to generate id string with this package version
  // (instance is not directly callable in typings)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return uid.rnd();
}


type GenerateRequestBody = {
  templateId?: string; // optional template ID for context
  sessionId?: string; // optional session ID for context
  // one of these may be present or both absent
  workflowDefinition?: unknown; // will validate if present
  messages: unknown; // should be WorkflowMessage[]
};

type GeneratedResponseBody = {
  messages: WorkflowMessage[]; // responses from aime
  workflowDefinition?: WorkflowDefinition; // optional modified definition
  mermaidDiagram?: string; // optional mermaid diagram text
  modifiedStepIds?: string[]; // step ids added/modified
};

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    
    const body = (await req.json()) as GenerateRequestBody;
    const account = session.accountId || req.headers.get('x-account');
    const organizationHeader = session.organizationId || req.headers.get('x-organization');
    const organization = organizationHeader === null ? null : organizationHeader;

    let isNewConversation: boolean = false;
    const resolvedUserId = session.userId;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
    }

    if (!account) {
      return NextResponse.json({ error: 'Missing account information in the request' }, { status: 400 });
    }

    const { workflowDefinition: rawDef, messages: rawMessages, sessionId, templateId } = body as GenerateRequestBody;
    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId in request' }, { status: 400 });
    }


    // Validate workflowDefinition if present
    let parsedWorkflowDef: WorkflowDefinition | null = null;
    if (rawDef !== undefined && rawDef !== null) {
      const vd = validateWorkflowDefinition(rawDef);
      if (!vd.valid) {
        return NextResponse.json({ error: 'Invalid workflowDefinition', details: vd.errors }, { status: 400 });
      }
      parsedWorkflowDef = vd.data;
    }

    // Validate messages
    if (!Array.isArray(rawMessages)) {
      return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
    }

    const messages: WorkflowMessage[] = (rawMessages as unknown[]).map((m) => {
      const mm = m as Record<string, unknown>;
      const sender = (mm['sender'] === 'aime' || mm['sender'] === 'user' || mm['sender'] === 'system')
        ? (mm['sender'] as 'aime' | 'user' | 'system')
        : 'user';

      // Build a properly typed content object
      const content: WorkflowMessage['content'] = (mm['content'] && typeof mm['content'] === 'object')
        ? (mm['content'] as WorkflowMessage['content'])
        : { text: String(mm['content'] ?? '') };

      return {
        id: String(mm['id'] ?? ''),
        sender,
        content,
        timestamp: String(mm['timestamp'] ?? new Date().toISOString()),
        userId: mm['userId'] as string | undefined,
        userName: mm['userName'] as string | undefined,
        type: mm['type'] as ('text' | 'image' | 'file') | undefined,
        metadata: mm['metadata'] as Record<string, unknown> | undefined,
      } as WorkflowMessage;
    });

    isNewConversation = messages.length === 2 && messages[0].sender === 'aime';
    if (isNewConversation) { //we need to store these in the database
      const upsertPromises = messages.map(async (m) => {

        const messageToStore: AimeWorkflowConversationsRecord = {
          ...m,
          account,
          organization,
          templateId,
          userId: resolvedUserId || m.userId || undefined,
        } as AimeWorkflowConversationsRecord;
        try {
          await AimeWorkflowMessagesDBUtil.upsertMessage(messageToStore);
        } catch (error) {
          console.error('Error storing message in DB:', error);
        }
      });
      await Promise.all(upsertPromises);
      console.log('Stored new conversation messages in DB');
    } else {
      //We need to store just the last message that has come from the user.
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender !== 'aime') {
        const messageToStore: AimeWorkflowConversationsRecord = {
          ...lastMessage,
          account,
          organization,
          templateId,
          userId: resolvedUserId || lastMessage.userId || undefined,
        } as AimeWorkflowConversationsRecord;
        try {
          await AimeWorkflowMessagesDBUtil.upsertMessage(messageToStore);
          console.log('Stored user message in DB:', lastMessage.id);
        } catch (error) {
          console.error('Error storing user message in DB:', error);
        }
      }
    }

    const orgForCall: string | undefined = organization === null ? undefined : organization;
    const result = await runAgentToGenerateWorkflow(messages, parsedWorkflowDef, sessionId ?? generateShortId(), templateId, account, orgForCall, resolvedUserId);
    //stored the "aime" messages 
    if (result.messages && result.messages.length > 0) {
      const upsertPromises = result.messages.map(async (m) => {
        if (m.sender === 'aime') {
          const messageToStore: AimeWorkflowConversationsRecord = {
            ...m,
            account,
            organization,
            templateId,
            userId: resolvedUserId || m.userId || undefined,
          } as AimeWorkflowConversationsRecord;
          try {
            await AimeWorkflowMessagesDBUtil.upsertMessage(messageToStore);
          } catch (error) {
            console.error('Error storing message in DB:', error);
          }
        }
      });
      await Promise.all(upsertPromises);
      console.log('Stored aime response messages in DB');
    }

    const receivedWorkflowDefinition: WorkflowDefinition | undefined = (result.messages && result.messages[result.messages.length - 1]?.content.workflowDefinition)
      ? (result.messages[result.messages.length - 1]?.content.workflowDefinition as WorkflowDefinition)
      : undefined;

    // Build response

    const mermaidDiagram: string | undefined = receivedWorkflowDefinition ? generateMermaidFromWorkflow(receivedWorkflowDefinition) : undefined;
    // console.log('[route] generated mermaid diagram', mermaidDiagram);

    const responseBody: GeneratedResponseBody = {
      messages: result.messages,
      workflowDefinition: receivedWorkflowDefinition,
      mermaidDiagram,
      modifiedStepIds: result.modifiedStepIds ?? [],
    };



    return NextResponse.json(responseBody, { status: 200 });
  } catch (err: unknown) {
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
    
    console.log("[route] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
