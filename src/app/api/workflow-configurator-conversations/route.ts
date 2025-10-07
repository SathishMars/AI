// src/app/api/workflow-configurator-conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  createConfiguratorConversation,
  addMessageToConversation,
  updateConversationActivity,
  saveMessage,
  getMessages
} from '@/app/utils/workflow-template-database';
import {
  ConversationError,
  ConfiguratorMessage,
  ConfiguratorMessageMetadata,
  ConfiguratorMessageRole
} from '@/app/types/workflow-template';

function coerceDate(input: unknown, fallback: Date = new Date()): Date {
  if (input instanceof Date) {
    return input;
  }

  if (typeof input === 'string' || typeof input === 'number') {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeMessageRole(rawRole: unknown): ConfiguratorMessageRole {
  if (typeof rawRole !== 'string') {
    return 'assistant';
  }

  const role = rawRole.toLowerCase();
  if (role === 'user') return 'user';
  if (role === 'assistant' || role === 'aime' || role === 'ai') return 'assistant';
  if (role === 'system') return 'system';
  return 'assistant';
}

function normalizeSuggestedActions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const actions = raw
    .map(item => (typeof item === 'string' ? item : null))
    .filter((item): item is string => Boolean(item));

  return actions.length > 0 ? actions : null;
}

function normalizeMessageMetadata(raw: unknown, overrides?: Partial<ConfiguratorMessageMetadata>): ConfiguratorMessageMetadata | undefined {
  const metadata: Partial<ConfiguratorMessageMetadata> = {};

  const assign = <K extends keyof ConfiguratorMessageMetadata>(key: K, value: ConfiguratorMessageMetadata[K]) => {
    if (value === undefined || value === null) return;
    metadata[key] = value;
  };

  if (raw && typeof raw === 'object') {
    const metadataSource = raw as Record<string, unknown>;

    if (typeof metadataSource.userAgent === 'string' && metadataSource.userAgent.trim() !== '') {
      assign('userAgent', metadataSource.userAgent);
    }
    if (typeof metadataSource.ipAddress === 'string' && metadataSource.ipAddress.trim() !== '') {
      assign('ipAddress', metadataSource.ipAddress);
    }
    if (typeof metadataSource.model === 'string' && metadataSource.model.trim() !== '') {
      assign('model', metadataSource.model);
    }
    if (typeof metadataSource.provider === 'string' && metadataSource.provider.trim() !== '') {
      assign('provider', metadataSource.provider);
    }
    if (typeof metadataSource.tokensUsed === 'number' && Number.isFinite(metadataSource.tokensUsed)) {
      assign('tokensUsed', metadataSource.tokensUsed);
    }
    const suggested = normalizeSuggestedActions(metadataSource.suggestedActions);
    if (suggested && suggested.length > 0) {
      assign('suggestedActions', suggested);
    }
    if (typeof metadataSource.workflowGenerated === 'boolean') {
      assign('workflowGenerated', metadataSource.workflowGenerated);
    }
    if (typeof metadataSource.mermaidDiagram === 'boolean') {
      assign('mermaidDiagram', metadataSource.mermaidDiagram);
    }
    if (typeof metadataSource.templateVersion === 'string' && metadataSource.templateVersion.trim() !== '') {
      assign('templateVersion', metadataSource.templateVersion);
    }
    if (typeof metadataSource.tokenCount === 'number' && Number.isFinite(metadataSource.tokenCount)) {
      assign('tokenCount', metadataSource.tokenCount);
    }
    if (typeof metadataSource.workflowStepGenerated === 'string' && metadataSource.workflowStepGenerated.trim() !== '') {
      assign('workflowStepGenerated', metadataSource.workflowStepGenerated);
    }
    if (Array.isArray(metadataSource.functionsCalled)) {
      const functions = metadataSource.functionsCalled.filter((fn): fn is string => typeof fn === 'string' && fn.trim() !== '');
      if (functions.length > 0) {
        assign('functionsCalled', functions);
      }
    }
    if (Array.isArray(metadataSource.validationErrors)) {
      const errors = metadataSource.validationErrors.filter((err): err is string => typeof err === 'string' && err.trim() !== '');
      if (errors.length > 0) {
        assign('validationErrors', errors);
      }
    }
    if (typeof metadataSource.editIntent === 'boolean') {
      assign('editIntent', metadataSource.editIntent);
    }
  }

  if (overrides) {
    (Object.keys(overrides) as (keyof ConfiguratorMessageMetadata)[]).forEach(key => {
      const value = overrides[key];
      if (value !== undefined && value !== null) {
        metadata[key] = value;
      }
    });
  }

  return Object.keys(metadata).length > 0 ? metadata as ConfiguratorMessageMetadata : undefined;
}

interface MessageNormalizationContext {
  account: string;
  organization: string | null;
  templateId: string;
  templateName: string;
}

function normalizeMessagePayload(raw: unknown, context: MessageNormalizationContext): Omit<ConfiguratorMessage, '_id'> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid message payload');
  }

  const candidate = raw as Record<string, unknown>;

  const id = typeof candidate.id === 'string' && candidate.id.trim() !== ''
    ? candidate.id.trim()
    : (() => {
        throw new Error('Message payload missing id');
      })();

  const conversationId = typeof candidate.conversationId === 'string' && candidate.conversationId.trim() !== ''
    ? candidate.conversationId.trim()
    : (() => {
        throw new Error('Message payload missing conversationId');
      })();

  const content = typeof candidate.content === 'string' && candidate.content.trim() !== ''
    ? candidate.content
    : (() => {
        throw new Error('Message payload missing content');
      })();

  const roleValue = candidate.role ?? candidate.sender;
  const role = normalizeMessageRole(roleValue);

  const timestamp = coerceDate(candidate.timestamp);

  const overrides: Partial<ConfiguratorMessageMetadata> = {};

  if (typeof candidate.type === 'string') {
    if (candidate.type === 'workflow_generated') {
      overrides.workflowGenerated = true;
      overrides.mermaidDiagram = overrides.mermaidDiagram ?? true;
    }
  }

  const metadata = normalizeMessageMetadata(candidate.metadata, overrides);
  const suggestedActionsFromPayload = normalizeSuggestedActions(candidate.suggestedActions);
  if (metadata && suggestedActionsFromPayload && (!metadata.suggestedActions || metadata.suggestedActions.length === 0)) {
    metadata.suggestedActions = suggestedActionsFromPayload;
  }

  return {
    conversationId,
    account: context.account,
    organization: context.organization,
    workflowTemplateId: context.templateId,
    workflowTemplateName: context.templateName,
    id,
    role,
    content,
    timestamp,
    ...(metadata ? { metadata } : {})
  };
}

async function handleSaveMessages(params: {
  account: string;
  organization?: string | null;
  templateId?: string;
  templateName?: string;
  messages?: unknown;
}): Promise<NextResponse> {
  try {
    const { account, organization, templateId, templateName, messages } = params;

    if (!templateId || typeof templateId !== 'string' || templateId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'templateId is required to save messages'
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'messages array is required'
        },
        { status: 400 }
      );
    }

    const context: MessageNormalizationContext = {
      account,
      organization: organization ?? null,
      templateId,
      templateName: templateName || templateId
    };

    const normalizedMessages = messages.map(message => normalizeMessagePayload(message, context));

    await Promise.all(normalizedMessages.map(msg => saveMessage(msg)));

    return NextResponse.json({
      success: true,
      data: {
        saved: normalizedMessages.length
      }
    });
  } catch (error) {
    console.error('Failed to save conversation messages:', error);
    if (error instanceof ConversationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save conversation messages'
      },
      { status: 500 }
    );
  }
}

/**
 * Workflow Configurator Conversations API Routes
 * 
 * GET  /api/workflow-configurator-conversations - Get conversation history for a template
 * POST /api/workflow-configurator-conversations - Create conversation or add message
 */

/**
 * GET /api/workflow-configurator-conversations
 * Get conversation history for a workflow template
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const templateName = searchParams.get('templateName');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Validate limit
    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Get account and organization from headers
    const account = request.headers.get('x-account') || 'default-account';
    const organization = request.headers.get('x-organization') || null; // null for account-wide templates

    const messages = await getMessages({
      account,
      organization,
      workflowTemplateId: templateId,
      workflowTemplateName: templateName || undefined,
      limit
    });

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        templateName,
        messages,
        count: messages.length
      }
    });

  } catch (error) {
    console.error('Failed to get conversation history:', error);

    if (error instanceof ConversationError) {
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
 * POST /api/workflow-configurator-conversations
 * Create a conversation or add a message to existing conversation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Get account and organization from headers or body
    const account = body.account || request.headers.get('x-account') || 'default-account';
    const organization = body.organization || request.headers.get('x-organization') || null;

    switch (action) {
      case 'create_conversation':
        return await handleCreateConversation({ ...data, account, organization });
      
      case 'add_message':
        return await handleAddMessage({ ...data, account, organization });
      
      case 'update_activity':
        return await handleUpdateActivity({ ...data, account, organization });
      
      case 'save_messages':
        return await handleSaveMessages({ ...data, account, organization });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "create_conversation", "add_message", "update_activity", or "save_messages"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Failed to handle conversation request:', error);

    if (error instanceof ConversationError) {
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
 * Handle creating a new conversation
 */
async function handleCreateConversation(data: {
  templateName?: string;
  initialMessage?: ConfiguratorMessage;
  userAgent?: string;
  account: string;
  organization?: string | null;
}): Promise<NextResponse> {
  const { templateName, initialMessage, userAgent, account, organization } = data;

  if (!templateName) {
    return NextResponse.json(
      { error: 'Template name is required' },
      { status: 400 }
    );
  }

  // Create conversation
  const conversation = await createConfiguratorConversation({
    account,
    organization: organization || null,
    workflowTemplateName: templateName,
    initialMessage,
    userAgent
  });

  return NextResponse.json({
    success: true,
    data: conversation
  }, { status: 201 });
}

/**
 * Handle adding a message to conversation
 */
async function handleAddMessage(data: {
  templateName?: string;
  templateId?: string;
  role?: string;
  content?: string;
  metadata?: ConfiguratorMessageMetadata;
  account: string;
  organization?: string | null;
}): Promise<NextResponse> {
  const { templateName, templateId, role, content, metadata, account, organization } = data;

  if (!templateName) {
    return NextResponse.json(
      { error: 'Template name is required' },
      { status: 400 }
    );
  }

  if (!role || !['user', 'assistant', 'system'].includes(role)) {
    return NextResponse.json(
      { error: 'Valid role is required (user, assistant, or system)' },
      { status: 400 }
    );
  }

  if (!content || typeof content !== 'string') {
    return NextResponse.json(
      { error: 'Content is required and must be a string' },
      { status: 400 }
    );
  }

  // Add message to conversation
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const conversationTemplateKey = templateId || templateName;
  const conversationId = `${account}_${organization || 'account'}_${conversationTemplateKey}`;
  
  const message = await addMessageToConversation(
    account,
    organization || null,
    templateName,
    {
      conversationId,
      account,
      organization: organization || null,
      workflowTemplateName: templateName,
      workflowTemplateId: conversationTemplateKey,
      id: messageId,
      role: role as ConfiguratorMessageRole,
      content,
      timestamp: new Date(),
      ...(metadata && { metadata })
    }
  );

  return NextResponse.json({
    success: true,
    data: message
  }, { status: 201 });
}

/**
 * Handle updating conversation activity
 */
async function handleUpdateActivity(data: {
  templateName?: string;
  account: string;
  organization?: string | null;
}): Promise<NextResponse> {
  const { templateName, account, organization } = data;

  if (!templateName) {
    return NextResponse.json(
      { error: 'Template name is required' },
      { status: 400 }
    );
  }

  // Update conversation activity
  await updateConversationActivity(account, templateName, organization);

  return NextResponse.json({
    success: true,
    message: 'Conversation activity updated'
  });
}