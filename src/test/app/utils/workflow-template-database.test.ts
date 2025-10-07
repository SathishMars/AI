// src/test/app/utils/workflow-template-database.test.ts
import {
  createWorkflowTemplate,
  updateWorkflowTemplate,
  publishWorkflowTemplate,
  createDraftFromPublished,
  getWorkflowTemplate,
  listWorkflowTemplates,
  deleteWorkflowTemplate,
  createConfiguratorConversation,
  addMessageToConversation,
  getConversationHistory,
  saveMessage
} from '@/app/utils/workflow-template-database';
import {
  TemplateError,
  CreateWorkflowTemplateInput,
  ConfiguratorMessage
} from '@/app/types/workflow-template';
import { getMongoDatabase } from '@/app/utils/mongodb-connection';

// Mock MongoDB connection
jest.mock('@/app/utils/mongodb-connection');

const mockGetMongoDatabase = getMongoDatabase as jest.MockedFunction<typeof getMongoDatabase>;

describe('Workflow Template Database Operations', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTemplatesCollection: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockConversationsCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database collections
    mockTemplatesCollection = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        project: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        }),
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([])
            })
          })
        }),
        toArray: jest.fn().mockResolvedValue([])
      }),
      insertOne: jest.fn().mockResolvedValue({
        insertedId: { toString: () => 'mock-object-id' }
      }),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      })
    };

    mockConversationsCollection = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          })
        })
      }),
      insertOne: jest.fn().mockResolvedValue({
        insertedId: { toString: () => 'mock-conversation-id' }
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    };

    mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'workflowTemplates') return mockTemplatesCollection;
        if (name === 'aimeWorkflowConversations') return mockConversationsCollection;
        return {};
      })
    };

    // Mock the database connection
    (mockGetMongoDatabase as jest.MockedFunction<typeof getMongoDatabase>)
      .mockResolvedValue(mockDb);
  });

  describe('createWorkflowTemplate', () => {
    const sampleInput: CreateWorkflowTemplateInput = {
      account: 'test-account',
      name: 'test-workflow',
      workflowDefinition: {
        steps: [
          {
            id: 'startStep',
            name: 'Start: Trigger Example',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {},
            children: [
              {
                id: 'endStep',
                name: 'End: Finish Example',
                type: 'end',
                result: 'success'
              }
            ]
          }
        ]
      },
      description: 'A test workflow template',
      category: 'test',
      tags: ['test', 'sample'],
      author: 'test-user'
    };

    it('should create a new workflow template successfully', async () => {
      // Mock no existing templates
      mockTemplatesCollection.findOne.mockResolvedValue(null);

      const result = await createWorkflowTemplate(sampleInput);

      expect(result).toMatchObject({
        account: sampleInput.account,
        version: '1.0.0',
        workflowDefinition: expect.objectContaining({
          steps: expect.any(Array)
        }),
        metadata: expect.objectContaining({
          name: sampleInput.name,
          status: 'draft',
          author: sampleInput.author
        }),
        _id: 'mock-object-id'
      });

      expect(mockTemplatesCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          account: sampleInput.account,
          metadata: expect.objectContaining({
            name: sampleInput.name,
            status: 'draft'
          }),
          version: '1.0.0'
        })
      );
    });

    it('should generate next version when template exists', async () => {
      // Mock existing template
      mockTemplatesCollection.findOne.mockResolvedValue({
        name: 'test-workflow',
        version: '1.0.0'
      });

      // Mock existing versions query
      mockTemplatesCollection.find.mockReturnValue({
        project: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            { version: '1.0.0' },
            { version: '1.1.0' }
          ])
        })
      });

      const result = await createWorkflowTemplate(sampleInput);

      expect(result.version).toBe('1.2.0');
    });

    it('should throw TemplateError for invalid input', async () => {
      const invalidInput = {
        ...sampleInput,
        name: '' // Invalid name
      };

      await expect(createWorkflowTemplate(invalidInput)).rejects.toThrow(TemplateError);
    });
  });

  describe('updateWorkflowTemplate', () => {
    it('should update a draft template successfully', async () => {
      const mockTemplate = {
        _id: 'template-id',
        account: 'test-account',
        id: 'test-workflow',
        version: '1.0.0',
        workflowDefinition: { steps: [] },
        metadata: { name: 'test-workflow', status: 'draft', createdAt: new Date(), updatedAt: new Date(), author: 'test-user' }
      };

      mockTemplatesCollection.findOne.mockResolvedValue(mockTemplate);
      mockTemplatesCollection.findOneAndUpdate.mockResolvedValue({
        ...mockTemplate,
        metadata: {
          ...mockTemplate.metadata,
          description: 'Updated Test Workflow Description'
        },
        _id: { toString: () => 'template-id' }
      });

      const updates = { description: 'Updated Test Workflow Description' };
      const result = await updateWorkflowTemplate('test-account', 'test-workflow', '1.0.0', updates);

      expect(result.metadata?.name).toBe('test-workflow');
      expect(result.metadata?.description).toBe('Updated Test Workflow Description');
      expect(mockTemplatesCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { account: 'test-account', id: 'test-workflow', version: '1.0.0' },
        { $set: { 'metadata.description': updates.description, 'metadata.updatedAt': expect.any(Date) } },
        { returnDocument: 'after' }
      );
    });

    it('should throw error when trying to update published template', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue({
        account: 'test-account',
        id: 'test-workflow',
        version: '1.0.0',
        metadata: { status: 'published' }
      });

      await expect(updateWorkflowTemplate('test-account', 'test-workflow', '1.0.0', {}))
        .rejects.toThrow(TemplateError);
    });

    it('should throw error when template not found', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue(null);

      await expect(updateWorkflowTemplate('test-account', 'nonexistent', '1.0.0', {}))
        .rejects.toThrow(TemplateError);
    });
  });

  describe('publishWorkflowTemplate', () => {
    it('should publish a draft template successfully', async () => {
      const mockDraftTemplate = {
        _id: 'template-id',
        account: 'test-account',
        id: 'test-workflow',
        version: '1.0.0',
        metadata: { status: 'draft', author: 'test-user', createdAt: new Date(), updatedAt: new Date() }
      };

      mockTemplatesCollection.findOne.mockResolvedValue(mockDraftTemplate);
      mockTemplatesCollection.findOneAndUpdate.mockResolvedValue({
        ...mockDraftTemplate,
        metadata: { ...mockDraftTemplate.metadata, status: 'published', publishedAt: new Date() },
        _id: { toString: () => 'template-id' }
      });

      const result = await publishWorkflowTemplate('test-account', 'test-workflow', '1.0.0');

      expect(result.metadata?.status).toBe('published');
      expect(mockTemplatesCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { account: 'test-account', id: 'test-workflow', version: '1.0.0' },
        { 
          $set: { 
            'metadata.status': 'published',
            'metadata.publishedAt': expect.any(Date),
            'metadata.updatedAt': expect.any(Date)
          }
        },
        { returnDocument: 'after' }
      );
    });

    it('should throw error when draft template not found', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue(null);

      await expect(publishWorkflowTemplate('test-account', 'nonexistent', '1.0.0'))
        .rejects.toThrow(TemplateError);
    });
  });

  describe('createDraftFromPublished', () => {
    it('should create draft from published template successfully', async () => {
      const mockPublishedTemplate = {
        account: 'test-account',
        id: 'test-workflow',
        organization: null,
        version: '1.0.0',
        workflowDefinition: { steps: [] },
        mermaidDiagram: 'flowchart TD',
        metadata: {
          name: 'test-workflow',
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'original-author'
        }
      };

      // Mock published template exists
      mockTemplatesCollection.findOne
        .mockResolvedValueOnce(mockPublishedTemplate) // First call - find published
        .mockResolvedValueOnce(null); // Second call - check for existing draft

      // Mock versions query for next version generation
      mockTemplatesCollection.find.mockReturnValue({
        project: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{ version: '1.0.0' }])
        })
      });

      const result = await createDraftFromPublished('test-account', 'test-workflow', '1.0.0', 'new-author');

  expect(result.metadata.status).toBe('draft');
      expect(result.version).toBe('1.1.0');
      expect(result.parentVersion).toBe('1.0.0');
      expect(result.metadata.author).toBe('new-author');
    });

    it('should throw error when published template not found', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue(null);

      await expect(createDraftFromPublished('test-account', 'nonexistent', '1.0.0', 'author'))
        .rejects.toThrow(TemplateError);
    });

    it('should throw error when draft already exists', async () => {
      mockTemplatesCollection.findOne
        .mockResolvedValueOnce({ status: 'published' }) // Published exists
        .mockResolvedValueOnce({ status: 'draft' }); // Draft exists

      await expect(createDraftFromPublished('test-account', 'test-workflow', '1.0.0', 'author'))
        .rejects.toThrow(TemplateError);
    });
  });

  describe('getWorkflowTemplate', () => {
    it('should return template with conversations and correct state', async () => {
      const mockTemplates = [
        {
          _id: { toString: () => 'template-id-1' },
          account: 'test-account',
          organization: 'main-org',
          id: 'test-workflow',
          version: '1.0.0',
          metadata: { status: 'published', name: 'Workflow Published', updatedAt: new Date() }
        },
        {
          _id: { toString: () => 'template-id-2' },
          account: 'test-account',
          organization: 'main-org',
          id: 'test-workflow',
          version: '1.1.0',
          metadata: { status: 'draft', name: 'Workflow Draft', updatedAt: new Date() }
        }
      ];

      const mockConversations = [
        {
          _id: { toString: () => 'conv-id-1' },
          account: 'test-account',
          organization: 'main-org',
          workflowTemplateID: 'test-workflow',
          workflowTemplateName: 'test-workflow',
          conversationId: 'conv-1',
          messages: []
        }
      ];

      mockTemplatesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockTemplates)
        })
      });

      mockConversationsCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockConversations)
        })
      });

      const result = await getWorkflowTemplate('test-account', 'main-org', 'test-workflow');

      expect(result.template?.metadata.status).toBe('draft'); // Should prefer draft
      expect(result.templateState).toBe('draft_available');
      expect(result.conversations).toHaveLength(1);
      expect(result.suggestCreateDraft).toBe(false);
    });

    it('should suggest creating draft when only published version exists', async () => {
      const mockTemplates = [
        {
          _id: { toString: () => 'template-id-1' },
          account: 'test-account',
          organization: 'main-org',
          id: 'test-workflow',
          version: '1.0.0',
          metadata: { status: 'published', name: 'Workflow Published', updatedAt: new Date() }
        }
      ];

      mockTemplatesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockTemplates)
        })
      });

      mockConversationsCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      });

      const result = await getWorkflowTemplate('test-account', 'main-org', 'test-workflow');

      expect(result.template?.metadata.status).toBe('published');
      expect(result.templateState).toBe('published_only');
      expect(result.suggestCreateDraft).toBe(true);
    });

    it('should return not_found state when no templates exist', async () => {
      mockTemplatesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      });

      mockConversationsCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      });

  const result = await getWorkflowTemplate('test-account', 'main-org', 'nonexistent');

      expect(result.template).toBeNull();
      expect(result.templateState).toBe('not_found');
      expect(result.suggestCreateDraft).toBe(false);
    });
  });

  describe('listWorkflowTemplates', () => {
    it('should list templates with pagination', async () => {
      const mockTemplates = [
        {
          _id: { toString: () => 'template-1' },
          account: 'test-account',
          id: 'workflow-1',
          version: '1.0.0',
          metadata: { name: 'Workflow 1', status: 'published', updatedAt: new Date() }
        },
        {
          _id: { toString: () => 'template-2' },
          account: 'test-account',
          id: 'workflow-2',
          version: '1.0.0',
          metadata: { name: 'Workflow 2', status: 'draft', updatedAt: new Date() }
        }
      ];

      mockTemplatesCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockTemplates)
      });

      const result = await listWorkflowTemplates('test-account', {}, 1, 10);

      expect(result.templates).toHaveLength(2);
      expect(result.templates[0].metadata.name).toBe('Workflow 1');
      expect(result.templates[1].metadata.status).toBe('draft');
      expect(result.totalCount).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should filter templates by status', async () => {
      const mockTemplates = [
        {
          _id: { toString: () => 'template-1' },
          account: 'test-account',
          id: 'workflow-1',
          version: '1.0.0',
          metadata: { name: 'Workflow 1', status: 'published', updatedAt: new Date() }
        }
      ];

      mockTemplatesCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockTemplates)
      });

      await listWorkflowTemplates('test-account', { status: 'published' }, 1, 10);

      expect(mockTemplatesCollection.aggregate).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('deleteWorkflowTemplate', () => {
    it('should delete a draft template successfully', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue({
        account: 'test-account',
        id: 'test-workflow',
        version: '1.0.0',
        metadata: { status: 'draft' }
      });

      const result = await deleteWorkflowTemplate('test-account', 'test-workflow', '1.0.0');

      expect(result).toBe(true);
      expect(mockTemplatesCollection.deleteOne).toHaveBeenCalledWith({
        account: 'test-account',
        id: 'test-workflow',
        version: '1.0.0'
      });
    });

    it('should prevent deletion of published template with instances', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue({
        account: 'test-account',
        id: 'test-workflow',
        version: '1.0.0',
        metadata: { status: 'published' },
        usageStats: { instanceCount: 5 }
      });

      await expect(deleteWorkflowTemplate('test-account', 'test-workflow', '1.0.0'))
        .rejects.toThrow(TemplateError);

      expect(mockTemplatesCollection.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('Conversation Operations', () => {
    describe('createConfiguratorConversation', () => {
      it('should create a new conversation successfully', async () => {
        const input = {
          account: 'test-account',
          workflowTemplateName: 'test-workflow',
          userAgent: 'test-browser'
        };

        const result = await createConfiguratorConversation(input);

        expect(result.workflowTemplateName).toBe(input.workflowTemplateName);
        expect(result.conversationId).toBe('test-account--test-workflow'); // Generated deterministically
        expect(result._id).toBe('mock-conversation-id');
        expect(mockConversationsCollection.insertOne).toHaveBeenCalled();
      });
    });

    describe('addMessageToConversation', () => {
      it('should add message to existing conversation', async () => {
        const mockConversation = {
          _id: 'conv-id',
          account: 'test-account',
          organization: null,
          workflowTemplateName: 'test-workflow',
          workflowTemplateID: 'test-workflow',
          messages: []
        };

        mockConversationsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
        mockConversationsCollection.findOne.mockResolvedValue(mockConversation);

        const message: ConfiguratorMessage = {
          conversationId: 'conv_test-account_account-wide_test-workflow',
          account: 'test-account',
          organization: null,
          workflowTemplateName: 'test-workflow',
          workflowTemplateId: 'test-workflow-id',
          id: 'msg_123',
          role: 'user' as const,
          content: 'Hello, aime!',
          timestamp: new Date()
        };

        const result = await addMessageToConversation('test-account', null, 'test-workflow', message);

        expect(result).toBeTruthy();
        expect(result!.workflowTemplateName).toBe('test-workflow');
        expect(mockConversationsCollection.updateOne).toHaveBeenCalled();
        expect(mockConversationsCollection.findOne).toHaveBeenCalled();
      });

      it('should return null if conversation not found', async () => {
        mockConversationsCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });

        const message: ConfiguratorMessage = {
          conversationId: 'conv_test-account_account-wide_test-workflow',
          account: 'test-account',
          organization: null,
          workflowTemplateName: 'test-workflow',
          workflowTemplateId: 'test-workflow-id',
          id: 'msg_123',
          role: 'user' as const,
          content: 'Hello, aime!',
          timestamp: new Date()
        };

        const result = await addMessageToConversation('test-account', null, 'test-workflow', message);

        expect(result).toBeNull();
        expect(mockConversationsCollection.updateOne).toHaveBeenCalled();
      });
    });

    describe('saveMessage', () => {
      it('should strip null metadata values and unset the field', async () => {
        const timestamp = new Date();
        const message = {
          conversationId: 'conv-1',
          account: 'test-account',
          organization: null,
          workflowTemplateId: 'template-1',
          workflowTemplateName: 'Test Template',
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello aime',
          timestamp,
          metadata: null
        } as unknown as Omit<ConfiguratorMessage, '_id'>;

        const savedDocument = {
          _id: { toString: () => 'mongo-id' },
          conversationId: message.conversationId,
          account: message.account,
          organization: message.organization,
          workflowTemplateId: message.workflowTemplateId,
          workflowTemplateName: message.workflowTemplateName,
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp
        };

        mockConversationsCollection.findOne.mockResolvedValue(savedDocument);

        await expect(saveMessage(message)).resolves.toMatchObject({ id: 'msg-1' });

        const updateCall = mockConversationsCollection.updateOne.mock.calls[0];
        const updateDoc = updateCall[1];

        expect(updateDoc.$set.metadata).toBeUndefined();
        expect(updateDoc.$unset).toEqual({ metadata: '' });
      });

      it('should retain defined metadata values while removing nullish entries', async () => {
        const timestamp = new Date();
        const message = {
          conversationId: 'conv-2',
          account: 'test-account',
          organization: null,
          workflowTemplateId: 'template-1',
          workflowTemplateName: 'Test Template',
          id: 'msg-2',
          role: 'assistant' as const,
          content: 'Workflow generated',
          timestamp,
          metadata: {
            provider: null,
            tokensUsed: 0,
            workflowGenerated: false,
            suggestedActions: []
          }
        } as unknown as Omit<ConfiguratorMessage, '_id'>;

        const savedDocument = {
          _id: { toString: () => 'mongo-id-2' },
          conversationId: message.conversationId,
          account: message.account,
          organization: message.organization,
          workflowTemplateId: message.workflowTemplateId,
          workflowTemplateName: message.workflowTemplateName,
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp,
          metadata: {
            tokensUsed: 0,
            workflowGenerated: false
          }
        };

        mockConversationsCollection.findOne.mockResolvedValue(savedDocument);

        await expect(saveMessage(message)).resolves.toMatchObject({ id: 'msg-2' });

  const updateCall = mockConversationsCollection.updateOne.mock.calls[0];
        const updateDoc = updateCall[1];

        expect(updateDoc.$set.metadata).toEqual({
          tokensUsed: 0,
          workflowGenerated: false
        });
        expect(updateDoc.$unset).toBeUndefined();
      });
    });

    describe('getConversationHistory', () => {
      it('should retrieve conversation history', async () => {
        const mockConversations = [
          {
            _id: { toString: () => 'conv-1' },
            account: 'test-account',
            organization: null,
            workflowTemplateName: 'test-workflow',
            workflowTemplateID: 'test-workflow',
            messages: []
          }
        ];

        mockConversationsCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(mockConversations)
            })
          })
        });

        const result = await getConversationHistory('test-account', 'test-workflow', null, 50);

        expect(result).toHaveLength(1);
        expect(result[0].workflowTemplateName).toBe('test-workflow');
        expect(result[0].conversationId).toBe('test-account--test-workflow'); // Generated deterministically
      });
    });
  });
});