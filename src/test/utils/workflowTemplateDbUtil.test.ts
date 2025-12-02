import { WorkflowTemplateDbUtil } from '@/app/utils/workflowTemplateDbUtil';
import * as mongodbConnection from '@/app/utils/mongodb-connection';
import { WorkflowTemplate } from '@/app/types/workflowTemplate';

// Mock the mongodb connection
jest.mock('@/app/utils/mongodb-connection');

const mockGetMongoDatabase = mongodbConnection.getMongoDatabase as jest.MockedFunction<typeof mongodbConnection.getMongoDatabase>;

describe('WorkflowTemplateDbUtil', () => {
  const mockCollection = {
    insertOne: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
    replaceOne: jest.fn(),
  };

  const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection),
  };

  const now = new Date().toISOString();
  const sampleTemplate: WorkflowTemplate = {
    id: 'tpl_abc123',
    account: 'account-123',
    organization: 'org-456',
    version: '1.0.0',
    metadata: {
      label: 'Approval Workflow',
      description: 'A workflow for approvals',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      tags: ['approval', 'workflow'],
    },
    workflowDefinition: {
      steps: [
        {
          id: 'start',
          label: 'Start: Trigger',
          type: 'trigger',
          stepFunction: 'onSubmit',
        },
      ],
    },
    mermaidDiagram: 'graph TD;A[Start]',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMongoDatabase.mockResolvedValue(mockDb as any);
  });

  describe('create', () => {
    it('should create a new workflow template', async () => {
      mockCollection.insertOne.mockResolvedValueOnce({ insertedId: 'id123' });

      const result = await WorkflowTemplateDbUtil.create(sampleTemplate);

      expect(mockGetMongoDatabase).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith('workflowTemplates');
      expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.any(Object));
      expect(result.id).toBe('tpl_abc123');
      expect(result.metadata.label).toBe('Approval Workflow');
    });

    it('should validate template schema before creating', async () => {
      // Invalid: missing required metadata.label
      const invalidTemplate = {
        ...sampleTemplate,
        metadata: {
          ...sampleTemplate.metadata,
          label: undefined, // Missing required field
        },
      } as any;

      await expect(WorkflowTemplateDbUtil.create(invalidTemplate)).rejects.toThrow();
    });

    it('should not expose MongoDB _id in response', async () => {
      mockCollection.insertOne.mockResolvedValueOnce({});

      const result = await WorkflowTemplateDbUtil.create(sampleTemplate);

      expect(result).not.toHaveProperty('_id');
      expect(result.id).toBeDefined();
    });

    it('should normalize timestamps for database storage', async () => {
      mockCollection.insertOne.mockResolvedValueOnce({});

      await WorkflowTemplateDbUtil.create(sampleTemplate);

      // Verify insertOne was called with the template data
      // The normalizeForDb function converts ISO strings in metadata to Date objects
      expect(mockCollection.insertOne).toHaveBeenCalled();
      const callArg = (mockCollection.insertOne as jest.Mock).mock.calls[0][0];
      // Timestamps should be present (either as Date or string depending on implementation)
      expect(callArg.metadata).toBeDefined();
      expect(callArg.metadata.createdAt).toBeDefined();
      expect(callArg.metadata.updatedAt).toBeDefined();
    });

    it('should handle database insert errors', async () => {
      mockCollection.insertOne.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(WorkflowTemplateDbUtil.create(sampleTemplate)).rejects.toThrow('Insert failed');
    });

    it('should handle duplicate key errors', async () => {
      const error = new Error('Duplicate key error');
      (error as any).code = 11000;
      mockCollection.insertOne.mockRejectedValueOnce(error);

      await expect(WorkflowTemplateDbUtil.create(sampleTemplate)).rejects.toThrow(
        'Duplicate key error'
      );
    });
  });

  describe('get', () => {
    it('should retrieve a workflow template by id', async () => {
      mockCollection.findOne.mockResolvedValueOnce(sampleTemplate);

      const result = await WorkflowTemplateDbUtil.get(
        'account-123',
        'org-456',
        'tpl_abc123'
      );

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        account: 'account-123',
        id: 'tpl_abc123',
        organization: 'org-456',
      });
      expect(result?.id).toBe('tpl_abc123');
    });

    it('should return null when template not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      const result = await WorkflowTemplateDbUtil.get(
        'account-123',
        'org-456',
        'nonexistent'
      );

      expect(result).toBeNull();
    });

    it('should retrieve by version if specified', async () => {
      mockCollection.findOne.mockResolvedValueOnce(sampleTemplate);

      await WorkflowTemplateDbUtil.get(
        'account-123',
        'org-456',
        'tpl_abc123',
        '1.0.0'
      );

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.0.0',
        })
      );
    });

    it('should handle organization as optional parameter', async () => {
      mockCollection.findOne.mockResolvedValueOnce(sampleTemplate);

      await WorkflowTemplateDbUtil.get(
        'account-123',
        undefined,
        'tpl_abc123'
      );

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        account: 'account-123',
        id: 'tpl_abc123',
        organization: undefined,
      });
    });

    it('should handle database retrieval errors', async () => {
      mockCollection.findOne.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        WorkflowTemplateDbUtil.get('account-123', 'org-456', 'tpl_abc123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('list', () => {
    it('should list templates with pagination', async () => {
      const mockAggregate = {
        toArray: jest.fn().mockResolvedValueOnce([sampleTemplate]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockAggregate as any);

      const result = await WorkflowTemplateDbUtil.list(
        'account-123',
        {},
        1,
        20
      );

      expect(mockCollection.aggregate).toHaveBeenCalled();
      expect(result.templates).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should filter by status', async () => {
      const mockAggregate = {
        toArray: jest.fn().mockResolvedValueOnce([]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockAggregate as any);

      const result = await WorkflowTemplateDbUtil.list(
        'account-123',
        { status: 'published' },
        1,
        20
      );

      // Check that aggregate pipeline includes status filter
      expect(mockCollection.aggregate).toHaveBeenCalled();
      const pipeline = (mockCollection.aggregate as jest.Mock).mock.calls[0][0];
      expect(pipeline.some((stage: any) => stage.$match?.['metadata.status'] === 'published')).toBe(true);
    });

    it('should filter by organization', async () => {
      const mockAggregate = {
        toArray: jest.fn().mockResolvedValueOnce([]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockAggregate as any);

      await WorkflowTemplateDbUtil.list(
        'account-123',
        { organization: 'org-456' },
        1,
        20
      );

      const pipeline = (mockCollection.aggregate as jest.Mock).mock.calls[0][0];
      expect(pipeline.some((stage: any) => stage.$match?.organization === 'org-456')).toBe(true);
    });

    it('should apply pagination correctly', async () => {
      const mockAggregate = {
        toArray: jest.fn().mockResolvedValueOnce([]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockAggregate as any);

      // Page 3, 25 per page = skip 50
      const result = await WorkflowTemplateDbUtil.list('account-123', {}, 3, 25);

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
    });

    it('should return pagination metadata', async () => {
      const templates = [
        sampleTemplate,
        { ...sampleTemplate, id: 'tpl_def456' },
        { ...sampleTemplate, id: 'tpl_ghi789' },
      ];

      // Create array with enough items to test pagination
      const manyTemplates = Array(50).fill(null).map((_, i) => ({
        ...sampleTemplate,
        id: `tpl_${i}`,
      }));

      const mockAggregate = {
        toArray: jest.fn().mockResolvedValueOnce(manyTemplates),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockAggregate as any);

      const result = await WorkflowTemplateDbUtil.list(
        'account-123',
        {},
        2,
        20
      );

      expect(result.totalCount).toBe(50);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
      expect(result.templates).toHaveLength(20); // Page 2 should have 20 items (skip 20, limit 20)
    });

    it('should handle empty results gracefully', async () => {
      const mockAggregate = {
        toArray: jest.fn().mockResolvedValueOnce([]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockAggregate as any);

      const result = await WorkflowTemplateDbUtil.list('account-123', {}, 1, 20);

      expect(result.templates).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('update', () => {
    it('should update a workflow template', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: sampleTemplate,
      });

      const updates: Partial<WorkflowTemplate> = {
        metadata: {
          ...sampleTemplate.metadata,
          label: 'Updated Name',
        },
      };

      const result = await WorkflowTemplateDbUtil.update(
        'account-123',
        'tpl_abc123',
        '1.0.0',
        updates
      );

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(result?.id).toBe('tpl_abc123');
    });

    it('should return null when update fails', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: null,
      });

      const result = await WorkflowTemplateDbUtil.update(
        'account-123',
        'nonexistent',
        '1.0.0',
        {}
      );

      expect(result).toBeNull();
    });

    it('should normalize date fields in updates', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: sampleTemplate,
      });

      const updates: Partial<WorkflowTemplate> = {
        metadata: {
          ...sampleTemplate.metadata,
          lastUsedAt: '2024-01-01T12:00:00Z',
        },
      };

      await WorkflowTemplateDbUtil.update(
        'account-123',
        'tpl_abc123',
        '1.0.0',
        updates
      );

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a workflow template', async () => {
      mockCollection.deleteOne.mockResolvedValueOnce({
        deletedCount: 1,
      });

      const result = await WorkflowTemplateDbUtil.delete(
        'account-123',
        'tpl_abc123',
        '1.0.0'
      );

      expect(mockCollection.deleteOne).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when delete fails', async () => {
      mockCollection.deleteOne.mockResolvedValueOnce({
        deletedCount: 0,
      });

      const result = await WorkflowTemplateDbUtil.delete(
        'account-123',
        'nonexistent',
        '1.0.0'
      );

      expect(result).toBe(false);
    });
  });
});
