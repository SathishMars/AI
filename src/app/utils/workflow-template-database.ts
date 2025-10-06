// src/app/utils/workflow-template-database.ts
import { getMongoDatabase } from './mongodb-connection';
import { generateConversationId } from './conversation-id-generator';
import {
  WorkflowTemplate,
  ConfiguratorConversation,
  CreateWorkflowTemplateInput,
  UpdateWorkflowTemplateInput,
  TemplateQueryFilters,
  TemplateListResponse,
  TemplateResolutionResult,
  CreateConversationInput,
  ConfiguratorMessage,
  TemplateStateManager,
  TemplateError,
  ConversationError,
  WorkflowTemplateSchema,
  ConfiguratorConversationSchema,
  ConfiguratorMessageSchema,
  generateNextVersion,
  getLatestVersion
} from '@/app/types/workflow-template';

/**
 * Workflow Template Database Operations
 * 
 * This module provides comprehensive database operations for:
 * - Workflow template CRUD operations with versioning
 * - Configurator conversation persistence and retrieval
 * - Template state management and resolution
 * - Version control and lifecycle management
 */

const COLLECTION_TEMPLATES = 'workflowTemplates';
const COLLECTION_CONVERSATIONS = 'aimeWorkflowConversations';

// ===========================================
// Template Database Operations
// ===========================================

/**
 * Create a new workflow template
 */
export async function createWorkflowTemplate(
  input: CreateWorkflowTemplateInput
): Promise<WorkflowTemplate> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Check if template with this account + name already exists
    const existingTemplate = await collection.findOne({ 
      account: input.account, 
      name: input.name 
    });
    let version = '1.0.0';
    
    if (existingTemplate) {
      // Generate next version
      const existingVersions = await collection
        .find({ account: input.account, name: input.name })
        .project({ version: 1 })
        .toArray();
      
      const versions = existingVersions.map(t => t.version);
      const latestVersion = getLatestVersion(versions);
      
      if (latestVersion) {
        version = generateNextVersion(latestVersion, 'minor');
      }
    }

    // Build template document (without _id for insertion)
    const templateDoc = {
      account: input.account,
      name: input.name,
      status: 'draft' as const,
      version,
      workflowDefinition: input.workflowDefinition,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: input.author,
        description: input.description,
        category: input.category,
        tags: input.tags
      },
      usageStats: {
        instanceCount: 0
      }
    };

    // Validate template
    const validationResult = WorkflowTemplateSchema.safeParse({
      ...templateDoc,
      _id: 'temp-id' // Add temporary ID for validation
    });
    if (!validationResult.success) {
      throw new TemplateError(
        'Template validation failed',
        'VALIDATION_ERROR',
        { errors: validationResult.error.issues }
      );
    }

    // Insert template
    const result = await collection.insertOne(templateDoc);
    
    // Return created template with MongoDB ID
    return {
      ...templateDoc,
      _id: result.insertedId.toString()
    };

  } catch (error) {
    if (error instanceof TemplateError) throw error;
    
    console.error('Failed to create workflow template:', error);
    throw new TemplateError(
      'Failed to create workflow template',
      'CREATE_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Update an existing workflow template
 */
export async function updateWorkflowTemplate(
  account: string,
  name: string,
  version: string,
  updates: UpdateWorkflowTemplateInput
): Promise<WorkflowTemplate> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Find existing template
    const existingTemplate = await collection.findOne({ account, name, version });
    if (!existingTemplate) {
      throw new TemplateError(
        `Template not found: ${name} v${version} for account ${account}`,
        'NOT_FOUND'
      );
    }

    // Only allow updates to draft templates
    if (existingTemplate.status !== 'draft') {
      throw new TemplateError(
        'Only draft templates can be updated',
        'INVALID_STATUS',
        { currentStatus: existingTemplate.status }
      );
    }

    // Build update document
    const updateDoc = {
      ...updates,
      'metadata.updatedAt': new Date()
    };

    // Update template
    const result = await collection.findOneAndUpdate(
      { name, version },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new TemplateError(
        'Failed to update template',
        'UPDATE_ERROR'
      );
    }

    return {
      ...result,
      _id: result._id.toString()
    } as WorkflowTemplate;

  } catch (error) {
    if (error instanceof TemplateError) throw error;
    
    console.error('Failed to update workflow template:', error);
    throw new TemplateError(
      'Failed to update workflow template',
      'UPDATE_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Publish a draft template
 */
export async function publishWorkflowTemplate(
  account: string,
  name: string,
  version: string
): Promise<WorkflowTemplate> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Find draft template
    const draftTemplate = await collection.findOne({ account, name, version, status: 'draft' });
    if (!draftTemplate) {
      throw new TemplateError(
        `Draft template not found: ${name} v${version} for account ${account}`,
        'NOT_FOUND'
      );
    }

    // Update to published status
    const result = await collection.findOneAndUpdate(
      { account, name, version },
      { 
        $set: { 
          status: 'published',
          'metadata.publishedAt': new Date(),
          'metadata.updatedAt': new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new TemplateError(
        'Failed to publish template',
        'PUBLISH_ERROR'
      );
    }

    return {
      ...result,
      _id: result._id.toString()
    } as WorkflowTemplate;

  } catch (error) {
    if (error instanceof TemplateError) throw error;
    
    console.error('Failed to publish workflow template:', error);
    throw new TemplateError(
      'Failed to publish workflow template',
      'PUBLISH_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Create a new draft from a published template
 */
export async function createDraftFromPublished(
  account: string,
  name: string,
  publishedVersion: string,
  author: string
): Promise<WorkflowTemplate> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Find published template
    const publishedTemplate = await collection.findOne({ 
      account,
      name, 
      version: publishedVersion, 
      status: 'published' 
    });
    
    if (!publishedTemplate) {
      throw new TemplateError(
        `Published template not found: ${name} v${publishedVersion} for account ${account}`,
        'NOT_FOUND'
      );
    }

    // Check if draft already exists
    const existingDraft = await collection.findOne({ account, name, status: 'draft' });
    if (existingDraft) {
      throw new TemplateError(
        'Draft version already exists',
        'DRAFT_EXISTS',
        { existingVersion: existingDraft.version }
      );
    }

    // Generate next version
    const existingVersions = await collection
      .find({ account, name })
      .project({ version: 1 })
      .toArray();
    
    const versions = existingVersions.map(t => t.version);
    const latestVersion = getLatestVersion(versions);
    const nextVersion = generateNextVersion(latestVersion || publishedVersion, 'minor');

    // Create new draft template (without _id for insertion)
    const draftTemplateDoc = {
      account: publishedTemplate.account,
      name: publishedTemplate.name,
      status: 'draft' as const,
      version: nextVersion,
      workflowDefinition: publishedTemplate.workflowDefinition,
      mermaidDiagram: publishedTemplate.mermaidDiagram,
      metadata: {
        ...publishedTemplate.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: undefined,
        author
      },
      parentVersion: publishedVersion,
      usageStats: {
        instanceCount: 0
      }
    };

    // Insert draft
    const result = await collection.insertOne(draftTemplateDoc);
    
    return {
      ...draftTemplateDoc,
      _id: result.insertedId.toString()
    };

  } catch (error) {
    if (error instanceof TemplateError) throw error;
    
    console.error('Failed to create draft from published template:', error);
    throw new TemplateError(
      'Failed to create draft from published template',
      'CREATE_DRAFT_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Get workflow template by name (with draft/published priority)
 */
export async function getWorkflowTemplate(account: string, organization: string | null, workflowTemplateID: string): Promise<TemplateResolutionResult> {
  try {
    const db = await getMongoDatabase();
    const templatesCollection = db.collection(COLLECTION_TEMPLATES);
    const conversationsCollection = db.collection(COLLECTION_CONVERSATIONS);

    // Get all versions of the template
    const templates = await templatesCollection
      .find({ account, organization, name: workflowTemplateID })
      .sort({ version: -1 })
      .toArray();

    // Convert to WorkflowTemplate objects
    const workflowTemplates: WorkflowTemplate[] = templates.map(template => ({
      ...template,
      _id: template._id.toString()
    })) as WorkflowTemplate[];

    // Get conversation history
    const conversations = await conversationsCollection
      .find({ account, organization, workflowTemplateID })
      .sort({ 'timestamp': 1 })
      .toArray();

    // Convert to ConfiguratorConversation objects
    const configuratorConversations: ConfiguratorConversation[] = conversations.map(conv => ({
      ...conv,
      _id: conv._id.toString()
    })) as ConfiguratorConversation[];

    // Determine template state and which template to return
    const templateState = TemplateStateManager.getTemplateState(workflowTemplates);
    const templateToLoad = TemplateStateManager.getTemplateToLoad(workflowTemplates);
    const suggestCreateDraft = TemplateStateManager.shouldSuggestDraftCreation(workflowTemplates);

    return {
      template: templateToLoad,
      conversations: configuratorConversations,
      templateState,
      suggestCreateDraft
    };

  } catch (error) {
    console.error('Failed to get workflow template:', error);
    throw new TemplateError(
      'Failed to get workflow template',
      'GET_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * List workflow templates with filtering and pagination
 */
export async function listWorkflowTemplates(
  account: string,
  filters: TemplateQueryFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<TemplateListResponse> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Build query - always filter by account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { account };
    
    // Add organization filter if specified in filters
    if (filters.organization !== undefined) {
      query.organization = filters.organization; // null for account-wide, string for org-specific
    }
    
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    }
    
    if (filters.category) {
      query['metadata.category'] = filters.category;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query['metadata.tags'] = { $in: filters.tags };
    }
    
    if (filters.author) {
      query['metadata.author'] = filters.author;
    }
    
    if (filters.createdAfter || filters.createdBefore) {
      query['metadata.createdAt'] = {};
      if (filters.createdAfter) {
        query['metadata.createdAt'].$gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        query['metadata.createdAt'].$lte = filters.createdBefore;
      }
    }

    // Get total count
    const totalCount = await collection.countDocuments(query);

    // Get paginated results
    const skip = (page - 1) * pageSize;
    const templates = await collection
      .find(query)
      .sort({ 'metadata.updatedAt': -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    // Convert to WorkflowTemplate objects
    const workflowTemplates: WorkflowTemplate[] = templates.map(template => ({
      ...template,
      _id: template._id.toString()
    })) as WorkflowTemplate[];

    return {
      templates: workflowTemplates,
      totalCount,
      page,
      pageSize,
      hasMore: skip + pageSize < totalCount
    };

  } catch (error) {
    console.error('Failed to list workflow templates:', error);
    throw new TemplateError(
      'Failed to list workflow templates',
      'LIST_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Delete a workflow template
 */
export async function deleteWorkflowTemplate(
  account: string,
  name: string,
  version: string
): Promise<boolean> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Only allow deletion of draft templates
    const template = await collection.findOne({ account, name, version });
    if (!template) {
      throw new TemplateError(
        `Template not found: ${name} v${version} for account ${account}`,
        'NOT_FOUND'
      );
    }

    if (template.status === 'published' && template.usageStats?.instanceCount > 0) {
      throw new TemplateError(
        'Cannot delete published template with active instances',
        'DELETION_BLOCKED',
        { instanceCount: template.usageStats.instanceCount }
      );
    }

    // Delete template
    const result = await collection.deleteOne({ account, name, version });
    
    return result.deletedCount > 0;

  } catch (error) {
    if (error instanceof TemplateError) throw error;
    
    console.error('Failed to delete workflow template:', error);
    throw new TemplateError(
      'Failed to delete workflow template',
      'DELETE_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ===========================================
// Conversation Database Operations
// ===========================================

/**
 * Create a new configurator conversation
 * @deprecated Use saveMessage() instead for flat message architecture
 */
export async function createConfiguratorConversation(
  input: CreateConversationInput
): Promise<ConfiguratorConversation> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_CONVERSATIONS);

    // Calculate retention expiry (5 years from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 5);

    // Build conversation document (without _id for insertion)
    const conversationDoc = {
      account: input.account,
      organization: input.organization || null, // Set to null if not provided for account-wide templates
      workflowTemplateName: input.workflowTemplateName,
      messages: input.initialMessage ? [input.initialMessage] : [],
      sessionInfo: {
        startedAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        userAgent: input.userAgent
      },
      retentionPolicy: {
        expiresAt,
        archived: false
      }
    };

    // Validate conversation
    const validationResult = ConfiguratorConversationSchema.safeParse({
      ...conversationDoc,
      _id: 'temp-id' // Add temporary ID for validation
    });
    if (!validationResult.success) {
      throw new ConversationError(
        'Conversation validation failed',
        'VALIDATION_ERROR',
        { errors: validationResult.error.issues }
      );
    }

    // Insert conversation
    const result = await collection.insertOne(conversationDoc);
    
    // Return conversation with generated conversationId for frontend compatibility
    const resultConversation = {
      ...conversationDoc,
      _id: result.insertedId.toString(),
      // Add deterministic conversationId for API compatibility
      conversationId: generateConversationId(
        conversationDoc.account,
        conversationDoc.organization,
        conversationDoc.workflowTemplateName
      )
    };
    
    return resultConversation as unknown as ConfiguratorConversation;

  } catch (error) {
    if (error instanceof ConversationError) throw error;
    
    console.error('Failed to create configurator conversation:', error);
    throw new ConversationError(
      'Failed to create configurator conversation',
      'CREATE_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Add a message to an existing conversation
 * @deprecated Use saveMessage() instead for flat message architecture
 */
export async function addMessageToConversation(
  account: string,
  organization: string | null,
  workflowTemplateName: string,
  message: ConfiguratorMessage
): Promise<ConfiguratorConversation | null> {
  try {
    const db = await getMongoDatabase();
    
    // Convert message to plain object for MongoDB (legacy format)
    const messageDoc = {
      messageId: message.id, // Use id field from new structure
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      ...(message.metadata && { metadata: message.metadata })
    };
    
    // Use updateOne and then find to avoid complex type issues
    const updateResult = await db.collection('aimeWorkflowConversations').updateOne(
      { 
        account, 
        organization,
        workflowTemplateName
      },
      { 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: { messages: messageDoc } as any,
        $set: { lastUpdated: new Date() }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return null;
    }

    // Fetch the updated document
    const result = await db.collection('aimeWorkflowConversations').findOne({
      account, 
      organization,
      workflowTemplateName
    });

    if (!result) {
      return null;
    }

    return {
      ...result,
      _id: result._id.toString(),
      // Add deterministic conversationId for frontend compatibility
      conversationId: generateConversationId(
        result.account,
        result.organization,
        result.workflowTemplateName
      )
    } as ConfiguratorConversation;
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    throw error;
  }
}

/**
 * Get conversation history for a template
 */
export async function getConversationHistory(
  account: string,
  workflowTemplateName: string,
  organization?: string | null,
  limit: number = 50
): Promise<ConfiguratorConversation[]> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_CONVERSATIONS);

    // Build query filter
    const filter: Record<string, string | null> = { 
      account, 
      workflowTemplateName
    };
    
    // Include organization filter only if provided (otherwise get all conversations for template)
    if (organization !== undefined) {
      filter.organization = organization;
    }

    const conversations = await collection
      .find(filter)
      .sort({ 'sessionInfo.lastActivity': -1 })
      .limit(limit)
      .toArray();

    return conversations.map(conv => ({
      ...conv,
      _id: conv._id.toString(),
      // Add deterministic conversationId for frontend compatibility
      conversationId: generateConversationId(
        conv.account,
        conv.organization,
        conv.workflowTemplateName
      )
    })) as ConfiguratorConversation[];

  } catch (error) {
    console.error('Failed to get conversation history:', error);
    throw new ConversationError(
      'Failed to get conversation history',
      'GET_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Update conversation session activity
 */
export async function updateConversationActivity(
  account: string,
  workflowTemplateName: string,
  organization?: string | null
): Promise<void> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_CONVERSATIONS);

    // Build filter
    const filter: Record<string, string | null> = { 
      account, 
      workflowTemplateName
    };
    
    // Include organization if provided
    if (organization !== undefined) {
      filter.organization = organization;
    }

    await collection.updateOne(
      filter,
      {
        $set: {
          'sessionInfo.lastActivity': new Date(),
          'sessionInfo.isActive': true
        }
      }
    );

  } catch (error) {
    console.error('Failed to update conversation activity:', error);
    // Non-critical operation, don't throw
  }
}

// ===========================================
// Flat Message Database Operations (New Architecture)
// ===========================================

/**
 * Save a single message to the database
 * Each message is stored as a separate document
 */
export async function saveMessage(
  message: Omit<ConfiguratorMessage, '_id'>
): Promise<ConfiguratorMessage> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_CONVERSATIONS);

    // Validate message
    const validationResult = ConfiguratorMessageSchema.safeParse(message);
    if (!validationResult.success) {
      throw new ConversationError(
        'Message validation failed',
        'VALIDATION_ERROR',
        { errors: validationResult.error.issues }
      );
    }

    // Insert message document
    const result = await collection.insertOne(message);
    
    return {
      ...message,
      _id: result.insertedId.toString()
    };

  } catch (error) {
    if (error instanceof ConversationError) throw error;
    
    console.error('Failed to save message:', error);
    throw new ConversationError(
      'Failed to save message',
      'SAVE_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Get all messages for a conversation
 * Returns messages ordered by timestamp ascending
 */
export async function getMessages(
  account: string,
  organization: string | null,
  workflowTemplateName: string
): Promise<ConfiguratorMessage[]> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_CONVERSATIONS);

    const messages = await collection
      .find({
        account,
        organization,
        workflowTemplateName
      })
      .sort({ timestamp: 1 }) // Order by timestamp ascending
      .toArray();

    return messages.map(msg => ({
      ...msg,
      _id: msg._id?.toString()
    })) as ConfiguratorMessage[];

  } catch (error) {
    console.error('Failed to get messages:', error);
    throw new ConversationError(
      'Failed to get messages',
      'GET_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Get a single message by ID
 */
export async function getMessageById(
  account: string,
  organization: string | null,
  workflowTemplateName: string,
  messageId: string
): Promise<ConfiguratorMessage | null> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_CONVERSATIONS);

    const message = await collection.findOne({
      account,
      organization,
      workflowTemplateName,
      id: messageId
    });

    if (!message) {
      return null;
    }

    return {
      ...message,
      _id: message._id?.toString()
    } as ConfiguratorMessage;

  } catch (error) {
    console.error('Failed to get message by ID:', error);
    throw new ConversationError(
      'Failed to get message',
      'GET_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Delete all messages for a conversation
 */
export async function deleteConversationMessages(
  account: string,
  organization: string | null,
  workflowTemplateName: string
): Promise<number> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_CONVERSATIONS);

    const result = await collection.deleteMany({
      account,
      organization,
      workflowTemplateName
    });

    return result.deletedCount;

  } catch (error) {
    console.error('Failed to delete conversation messages:', error);
    throw new ConversationError(
      'Failed to delete messages',
      'DELETE_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}