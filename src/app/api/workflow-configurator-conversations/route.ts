// src/app/api/workflow-configurator-conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  createConfiguratorConversation,
  addMessageToConversation,
  getConversationHistory,
  updateConversationActivity
} from '@/app/utils/workflow-template-database';
import {
  ConversationError,
  ConfiguratorMessage,
  ConfiguratorMessageMetadata,
  ConfiguratorMessageRole
} from '@/app/types/workflow-template';

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
    const templateName = searchParams.get('templateName');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!templateName) {
      return NextResponse.json(
        { error: 'Template name is required' },
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

    // Get conversation history
    const conversations = await getConversationHistory(account, templateName, organization, limit);

    return NextResponse.json({
      success: true,
      data: {
        templateName,
        conversations,
        count: conversations.length
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
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "create_conversation", "add_message", or "update_activity"' },
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
  conversationId?: string;
  initialMessage?: ConfiguratorMessage;
  userAgent?: string;
  account: string;
  organization?: string | null;
}): Promise<NextResponse> {
  const { templateName, conversationId, initialMessage, userAgent, account, organization } = data;

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
    conversationId,
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
  conversationId?: string;
  role?: string;
  content?: string;
  metadata?: ConfiguratorMessageMetadata;
  account: string;
  organization?: string | null;
}): Promise<NextResponse> {
  const { templateName, conversationId, role, content, metadata, account, organization } = data;

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
  const message = await addMessageToConversation({
    account,
    organization: organization || null,
    workflowTemplateName: templateName,
    conversationId,
    role: role as ConfiguratorMessageRole,
    content,
    metadata
  });

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
  conversationId?: string;
  account: string;
  organization?: string | null;
}): Promise<NextResponse> {
  const { templateName, conversationId, account, organization } = data;

  if (!templateName) {
    return NextResponse.json(
      { error: 'Template name is required' },
      { status: 400 }
    );
  }

  if (!conversationId) {
    return NextResponse.json(
      { error: 'Conversation ID is required' },
      { status: 400 }
    );
  }

  // Update conversation activity
  await updateConversationActivity(account, templateName, conversationId, organization);

  return NextResponse.json({
    success: true,
    message: 'Conversation activity updated'
  });
}