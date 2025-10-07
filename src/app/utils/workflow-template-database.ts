// src/app/utils/workflow-template-database.ts
import { getMongoDatabase } from './mongodb-connection';
import { generateConversationId } from './conversation-id-generator';
import { generateShortId } from './short-id-generator';
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
    console.log('💾 [DB] createWorkflowTemplate - Input received:');
    console.log('  - Account:', input.account);
    console.log('  - Organization:', input.organization);
    console.log('  - Name:', input.name);
    console.log('  - Author:', input.author);
    console.log('  - WorkflowDefinition:', {
      hasSteps: !!input.workflowDefinition?.steps,
      stepsIsArray: Array.isArray(input.workflowDefinition?.steps),
      stepsCount: input.workflowDefinition?.steps?.length || 0
    });
    console.log('  - Tags:', input.tags);
    console.log('  - Category:', input.category);

    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Generate short ID for new template
    const templateId = generateShortId();
    console.log('  - Generated Template ID:', templateId);

    // Check if template with this account + name already exists
    const existingTemplate = await collection.findOne({ 
      account: input.account,
      organization: input.organization || null,
      'metadata.name': input.name 
    });
    let version = '1.0.0';
    
    if (existingTemplate) {
      console.log('  - Existing template found, calculating next version...');
      // Generate next version
      const existingVersions = await collection
        .find({ 
          account: input.account,
          organization: input.organization || null,
          'metadata.name': input.name 
        })
        .project({ version: 1 })
        .toArray();
      
      const versions = existingVersions.map(t => t.version);
      const latestVersion = getLatestVersion(versions);
      
      if (latestVersion) {
        version = generateNextVersion(latestVersion, 'minor');
      }
      console.log('  - New version:', version);
    } else {
      console.log('  - New template, version:', version);
    }

    // Build template document (without _id for insertion)
    const now = new Date();
    
    // Build metadata object with proper typing
    interface TemplateDocMetadata {
      name: string;
      status: 'draft' | 'published' | 'deprecated' | 'archived';
      author: string;
      createdAt: Date;
      updatedAt: Date;
      tags: string[];
      description?: string;
      category?: string;
      publishedAt?: Date;
      updatedBy?: string;
    }
    
    const metadata: TemplateDocMetadata = {
      name: input.name,  // Descriptive name in metadata (REQUIRED)
      status: 'draft',  // Status in metadata (REQUIRED)
      author: input.author,  // Author (REQUIRED)
      createdAt: now,  // Date object (REQUIRED)
      updatedAt: now,  // Date object (REQUIRED)
      tags: input.tags || []  // Tags array (REQUIRED - default to empty)
    };
    
    // Only add optional fields if they have non-null/undefined values
    if (input.description) {
      metadata.description = input.description;
    }
    if (input.category) {
      metadata.category = input.category;
    }
    
    const templateDoc = {
      id: templateId,  // 10-char short-id (composite key)
      account: input.account,  // Composite key
      organization: input.organization || null,  // Composite key (nullable)
      version,  // Composite key
      workflowDefinition: input.workflowDefinition,
      metadata,
      usageStats: {
        instanceCount: 0  // MongoDB will accept this as int if it's a whole number
      }
    };

    console.log('📄 [DB] Template document structure before save:');
    console.log('  - Composite Keys:', {
      id: templateDoc.id,
      account: templateDoc.account,
      organization: templateDoc.organization,
      version: templateDoc.version
    });
    console.log('  - Metadata:', {
      name: templateDoc.metadata.name,
      status: templateDoc.metadata.status,
      author: templateDoc.metadata.author,
      tags: templateDoc.metadata.tags
    });
    console.log('  - WorkflowDefinition.steps count:', templateDoc.workflowDefinition.steps?.length || 0);

    // Validate template
    const docForValidation = {
      ...templateDoc,
      _id: 'temp-id' // Add temporary ID for validation
    };
    
    console.log('📋 [DB] Full document being validated:', JSON.stringify(docForValidation, null, 2));
    
    const validationResult = WorkflowTemplateSchema.safeParse(docForValidation);
    if (!validationResult.success) {
      console.error('❌ [DB] Template validation failed:', validationResult.error.issues);
      console.error('❌ [DB] Document that failed validation:', JSON.stringify(docForValidation, null, 2));
      throw new TemplateError(
        'Template validation failed',
        'VALIDATION_ERROR',
        { errors: validationResult.error.issues }
      );
    }
    console.log('✅ [DB] Template validation passed');

    // Insert template
    console.log('💾 [DB] Inserting template into MongoDB...');
    try {
      const result = await collection.insertOne(templateDoc);
      console.log('✅ [DB] Template inserted with MongoDB _id:', result.insertedId.toString());
      
      // Return created template with MongoDB ID
      return {
        ...templateDoc,
        organization: templateDoc.organization ?? undefined,  // Convert null to undefined for type compatibility
        _id: result.insertedId.toString()
      } as WorkflowTemplate;
    } catch (insertError: unknown) {
      // MongoDB schema validation error - extract details
      if (insertError && typeof insertError === 'object' && 'code' in insertError && insertError.code === 121) {
        console.error('❌ [DB] MongoDB Schema Validation Error Details:');
        if ('errInfo' in insertError) {
          console.error(JSON.stringify(insertError.errInfo, null, 2));
        }
        throw new TemplateError(
          'Document failed MongoDB schema validation',
          'SCHEMA_VALIDATION_ERROR',
          { 
            mongoError: insertError,
            document: templateDoc
          }
        );
      }
      throw insertError;
    }

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
  id: string,
  version: string,
  updates: UpdateWorkflowTemplateInput
): Promise<WorkflowTemplate> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Find existing template by composite key
    const existingTemplate = await collection.findOne({ account, id, version });
    if (!existingTemplate) {
      throw new TemplateError(
        `Template not found: ${id} v${version} for account ${account}`,
        'NOT_FOUND'
      );
    }

    // Only allow updates to draft templates
    if (existingTemplate.metadata?.status !== 'draft') {
      throw new TemplateError(
        'Only draft templates can be updated',
        'INVALID_STATUS',
        { currentStatus: existingTemplate.metadata?.status }
      );
    }

    // Build update document - map fields to metadata
    const updateDoc: Record<string, unknown> = {
      'metadata.updatedAt': new Date()
    };
    
    if (updates.name) updateDoc['metadata.name'] = updates.name;
    if (updates.description) updateDoc['metadata.description'] = updates.description;
    if (updates.category) updateDoc['metadata.category'] = updates.category;
    if (updates.tags) updateDoc['metadata.tags'] = updates.tags;
    if (updates.updatedBy) updateDoc['metadata.updatedBy'] = updates.updatedBy;
    if (updates.workflowDefinition) updateDoc.workflowDefinition = updates.workflowDefinition;
    if (updates.mermaidDiagram) updateDoc.mermaidDiagram = updates.mermaidDiagram;

    // Update template
    const result = await collection.findOneAndUpdate(
      { account, id, version },
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
  id: string,
  version: string
): Promise<WorkflowTemplate> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Find draft template
    const draftTemplate = await collection.findOne({ 
      account, 
      id, 
      version, 
      'metadata.status': 'draft' 
    });
    if (!draftTemplate) {
      throw new TemplateError(
        `Draft template not found: ${id} v${version} for account ${account}`,
        'NOT_FOUND'
      );
    }

    // Update to published status
    const result = await collection.findOneAndUpdate(
      { account, id, version },
      { 
        $set: { 
          'metadata.status': 'published',
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
  id: string,
  publishedVersion: string,
  author: string
): Promise<WorkflowTemplate> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Find published template
    const publishedTemplate = await collection.findOne({ 
      account,
      id, 
      version: publishedVersion, 
      'metadata.status': 'published' 
    });
    
    if (!publishedTemplate) {
      throw new TemplateError(
        `Published template not found: ${id} v${publishedVersion} for account ${account}`,
        'NOT_FOUND'
      );
    }

    // Check if draft already exists for this template ID
    const existingDraft = await collection.findOne({ 
      account, 
      id, 
      'metadata.status': 'draft' 
    });
    if (existingDraft) {
      throw new TemplateError(
        'Draft version already exists',
        'DRAFT_EXISTS',
        { existingVersion: existingDraft.version }
      );
    }

    // Generate next version
    const existingVersions = await collection
      .find({ account, id })
      .project({ version: 1 })
      .toArray();
    
    const versions = existingVersions.map(t => t.version);
    const latestVersion = getLatestVersion(versions);
    const nextVersion = generateNextVersion(latestVersion || publishedVersion, 'minor');

    // Create new draft template (without _id for insertion)
    const draftTemplateDoc = {
      id: publishedTemplate.id,  // Keep same template ID (composite key)
      account: publishedTemplate.account,  // Composite key
      organization: publishedTemplate.organization,  // Composite key
      version: nextVersion,  // Composite key
      workflowDefinition: publishedTemplate.workflowDefinition,
      mermaidDiagram: publishedTemplate.mermaidDiagram,
      metadata: {
        ...publishedTemplate.metadata,
        status: 'draft' as const,
        author,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: undefined
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
      organization: draftTemplateDoc.organization ?? undefined,  // Convert null to undefined for type compatibility
      _id: result.insertedId.toString()
    } as WorkflowTemplate;

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

    // Get all versions of the template by ID
    const templates = await templatesCollection
      .find({ account, organization, id: workflowTemplateID })
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

    console.log('📊 [DB] listWorkflowTemplates called:');
    console.log('  - Account:', account);
    console.log('  - Filters:', JSON.stringify(filters));
    console.log('  - Page:', page, '/ Page size:', pageSize);

    // Build match stage for aggregation pipeline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchStage: any = { account };
    
    // Add organization filter if specified in filters
    if (filters.organization !== undefined) {
      matchStage.organization = filters.organization; // null for account-wide, string for org-specific
    }
    
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        matchStage['metadata.status'] = { $in: filters.status };
      } else {
        matchStage['metadata.status'] = filters.status;
      }
    }
    
    if (filters.category) {
      matchStage['metadata.category'] = filters.category;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      matchStage['metadata.tags'] = { $in: filters.tags };
    }
    
    if (filters.author) {
      matchStage['metadata.author'] = filters.author;
    }
    
    if (filters.createdAfter || filters.createdBefore) {
      matchStage['metadata.createdAt'] = {};
      if (filters.createdAfter) {
        matchStage['metadata.createdAt'].$gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        matchStage['metadata.createdAt'].$lte = filters.createdBefore;
      }
    }

    console.log('🔍 [DB] Match stage:', JSON.stringify(matchStage));

    // Use aggregation pipeline to get only the latest version per template ID
    // Strategy: Group by template ID, keep the one with latest updatedAt
    // Priority: draft > published > deprecated > archived (within same updatedAt)
    const aggregationPipeline = [
      // Stage 1: Match filters
      { $match: matchStage },
      
      // Stage 2: Sort by updatedAt descending (most recent first)
      { $sort: { 'metadata.updatedAt': -1 } },
      
      // Stage 3: Group by template ID, keep first (most recent) document
      {
        $group: {
          _id: '$id',  // Group by template id (not MongoDB _id)
          doc: { $first: '$$ROOT' }  // Keep entire first document
        }
      },
      
      // Stage 4: Replace root with the kept document
      { $replaceRoot: { newRoot: '$doc' } },
      
      // Stage 5: Sort by name for consistent ordering
      { $sort: { 'metadata.name': 1 } }
    ];

    console.log('🔧 [DB] Aggregation pipeline:', JSON.stringify(aggregationPipeline, null, 2));

    // Execute aggregation to get all matching unique templates
    const allTemplates = await collection.aggregate(aggregationPipeline).toArray();
    
    console.log('📋 [DB] Found', allTemplates.length, 'unique templates after deduplication');

    // Get total count (unique templates)
    const totalCount = allTemplates.length;

    // Apply pagination to the deduplicated results
    const skip = (page - 1) * pageSize;
    const paginatedTemplates = allTemplates.slice(skip, skip + pageSize);

    // Convert to WorkflowTemplate objects
    const workflowTemplates: WorkflowTemplate[] = paginatedTemplates.map(template => ({
      ...template,
      _id: template._id.toString()
    })) as WorkflowTemplate[];

    console.log('✅ [DB] Returning', workflowTemplates.length, 'templates for page', page);
    console.log('📄 [DB] Template details:');
    workflowTemplates.forEach(t => {
      console.log(`  - ${t.id}: "${t.metadata.name}" (v${t.version}, ${t.metadata.status})`);
    });

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
  id: string,
  version: string
): Promise<boolean> {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection(COLLECTION_TEMPLATES);

    // Only allow deletion of draft templates
    const template = await collection.findOne({ account, id, version });
    if (!template) {
      throw new TemplateError(
        `Template not found: ${id} v${version} for account ${account}`,
        'NOT_FOUND'
      );
    }

    if (template.metadata?.status === 'published' && template.usageStats?.instanceCount > 0) {
      throw new TemplateError(
        'Cannot delete published template with active instances',
        'DELETION_BLOCKED',
        { instanceCount: template.usageStats.instanceCount }
      );
    }

    // Delete template
    const result = await collection.deleteOne({ account, id, version });
    
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