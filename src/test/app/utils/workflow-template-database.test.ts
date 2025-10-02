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
  getConversationHistory
} from '@/app/utils/workflow-template-database';
import {
  TemplateError,
  CreateWorkflowTemplateInput
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
      countDocuments: jest.fn().mockResolvedValue(0)
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
        if (name === 'workflowConfiguratorConversations') return mockConversationsCollection;
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
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow-001',
          name: 'Test Workflow',
          description: 'A test workflow',
          version: '1.0.0',
          status: 'draft',
          tags: ['test']
        },
        steps: {
          start: {
            name: 'Start',
            type: 'trigger',
            action: 'onMRFSubmit',
            nextSteps: ['end']
          },
          end: {
            name: 'End',
            type: 'end',
            result: 'success'
          }
        }
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
        name: sampleInput.name,
        account: sampleInput.account,
        status: 'draft',
        version: '1.0.0',
        workflowDefinition: sampleInput.workflowDefinition,
        _id: 'mock-object-id'
      });

      expect(mockTemplatesCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: sampleInput.name,
          status: 'draft',
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
        name: 'test-workflow',
        version: '1.0.0',
        status: 'draft',
        workflowDefinition: {},
        metadata: { createdAt: new Date(), updatedAt: new Date(), author: 'test-user' }
      };

      mockTemplatesCollection.findOne.mockResolvedValue(mockTemplate);
      mockTemplatesCollection.findOneAndUpdate.mockResolvedValue({
        ...mockTemplate,
        description: 'Updated Test Workflow Description',
        _id: { toString: () => 'template-id' }
      });

      const updates = { description: 'Updated Test Workflow Description' };
      const result = await updateWorkflowTemplate('test-account', 'test-workflow', '1.0.0', updates);

      expect(result.name).toBe('test-workflow');
      expect(mockTemplatesCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { name: 'test-workflow', version: '1.0.0' },
        { $set: { ...updates, 'metadata.updatedAt': expect.any(Date) } },
        { returnDocument: 'after' }
      );
    });

    it('should throw error when trying to update published template', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue({
        name: 'test-workflow',
        version: '1.0.0',
        status: 'published'
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
        name: 'test-workflow',
        version: '1.0.0',
        status: 'draft'
      };

      mockTemplatesCollection.findOne.mockResolvedValue(mockDraftTemplate);
      mockTemplatesCollection.findOneAndUpdate.mockResolvedValue({
        ...mockDraftTemplate,
        status: 'published',
        _id: { toString: () => 'template-id' }
      });

      const result = await publishWorkflowTemplate('test-account', 'test-workflow', '1.0.0');

      expect(result.status).toBe('published');
      expect(mockTemplatesCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { name: 'test-workflow', version: '1.0.0' },
        { 
          $set: { 
            status: 'published',
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
        name: 'test-workflow',
        displayName: 'Test Workflow',
        version: '1.0.0',
        status: 'published',
        workflowDefinition: { steps: {} },
        mermaidDiagram: 'flowchart TD',
        metadata: {
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

      expect(result.status).toBe('draft');
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
          name: 'test-workflow',
          version: '1.0.0',
          status: 'published'
        },
        {
          _id: { toString: () => 'template-id-2' },
          name: 'test-workflow',
          version: '1.1.0',
          status: 'draft'
        }
      ];

      const mockConversations = [
        {
          _id: { toString: () => 'conv-id-1' },
          templateName: 'test-workflow',
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

      const result = await getWorkflowTemplate('test-account', 'test-workflow');

      expect(result.template?.status).toBe('draft'); // Should prefer draft
      expect(result.templateState).toBe('draft_available');
      expect(result.conversations).toHaveLength(1);
      expect(result.suggestCreateDraft).toBe(false);
    });

    it('should suggest creating draft when only published version exists', async () => {
      const mockTemplates = [
        {
          _id: { toString: () => 'template-id-1' },
          name: 'test-workflow',
          version: '1.0.0',
          status: 'published'
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

      const result = await getWorkflowTemplate('test-account', 'test-workflow');

      expect(result.template?.status).toBe('published');
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

      const result = await getWorkflowTemplate('test-account', 'nonexistent');

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
          name: 'workflow-1',
          status: 'published'
        },
        {
          _id: { toString: () => 'template-2' },
          name: 'workflow-2',
          status: 'draft'
        }
      ];

      mockTemplatesCollection.countDocuments.mockResolvedValue(25);
      mockTemplatesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(mockTemplates)
            })
          })
        })
      });

      const result = await listWorkflowTemplates('test-account', {}, 1, 10);

      expect(result.templates).toHaveLength(2);
      expect(result.totalCount).toBe(25);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should filter templates by status', async () => {
      mockTemplatesCollection.countDocuments.mockResolvedValue(5);
      mockTemplatesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      await listWorkflowTemplates('test-account', { status: 'published' }, 1, 10);

      expect(mockTemplatesCollection.find).toHaveBeenCalledWith({ status: 'published' });
    });
  });

  describe('deleteWorkflowTemplate', () => {
    it('should delete a draft template successfully', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue({
        name: 'test-workflow',
        version: '1.0.0',
        status: 'draft'
      });

      const result = await deleteWorkflowTemplate('test-account', 'test-workflow', '1.0.0');

      expect(result).toBe(true);
      expect(mockTemplatesCollection.deleteOne).toHaveBeenCalledWith({
        name: 'test-workflow',
        version: '1.0.0'
      });
    });

    it('should prevent deletion of published template with instances', async () => {
      mockTemplatesCollection.findOne.mockResolvedValue({
        name: 'test-workflow',
        version: '1.0.0',
        status: 'published',
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
          templateName: 'test-workflow',
          conversationId: 'conv-123',
          userAgent: 'test-browser'
        };

        const result = await createConfiguratorConversation(input);

        expect(result.templateName).toBe(input.templateName);
        expect(result.conversationId).toBe(input.conversationId);
        expect(result._id).toBe('mock-conversation-id');
        expect(mockConversationsCollection.insertOne).toHaveBeenCalled();
      });
    });

    describe('addMessageToConversation', () => {
      it('should add message to existing conversation', async () => {
        const mockConversation = {
          _id: 'conv-id',
          templateName: 'test-workflow',
          conversationId: 'conv-123',
          messages: []
        };

        mockConversationsCollection.findOne.mockResolvedValue(mockConversation);

        const input = {
          account: 'test-account',
          templateName: 'test-workflow',
          conversationId: 'conv-123',
          role: 'user' as const,
          content: 'Hello, aime!'
        };

        const result = await addMessageToConversation(input);

        expect(result.role).toBe('user');
        expect(result.content).toBe('Hello, aime!');
        expect(mockConversationsCollection.updateOne).toHaveBeenCalled();
      });

      it('should create new conversation if none exists', async () => {
        mockConversationsCollection.findOne.mockResolvedValue(null);

        const input = {
          account: 'test-account',
          templateName: 'test-workflow',
          conversationId: 'conv-123',
          role: 'user' as const,
          content: 'Hello, aime!'
        };

        const result = await addMessageToConversation(input);

        expect(result.content).toBe('Hello, aime!');
        expect(mockConversationsCollection.insertOne).toHaveBeenCalled();
      });
    });

    describe('getConversationHistory', () => {
      it('should retrieve conversation history', async () => {
        const mockConversations = [
          {
            _id: { toString: () => 'conv-1' },
            templateName: 'test-workflow',
            conversationId: 'conv-1',
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

        const result = await getConversationHistory('test-account', 'test-workflow', 50);

        expect(result).toHaveLength(1);
        expect(result[0].templateName).toBe('test-workflow');
      });
    });
  });
});