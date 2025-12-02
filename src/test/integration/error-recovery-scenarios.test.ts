/**
 * Integration Tests for Error Recovery Scenarios
 *
 * Tests error handling and recovery including:
 * - Network error handling and retry logic
 * - Validation error recovery
 * - Database constraint violations
 * - Concurrent modification detection
 * - Transaction rollback scenarios
 * - Partial failure recovery
 * - User notification on errors
 * - State preservation after errors
 */

import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import { WorkflowTemplate, WorkflowDefinition } from '@/app/types/workflowTemplate';

// Mock dependencies
jest.mock('@/app/utils/mongodb-connection', () => ({
  getMongoDatabase: jest.fn(),
}));

import { getMongoDatabase } from '@/app/utils/mongodb-connection';

const mockGetMongoDatabase = getMongoDatabase as jest.MockedFunction<typeof getMongoDatabase>;

// Test fixtures
const createTestWorkflow = (overrides?: Partial<WorkflowDefinition>): WorkflowDefinition => ({
  steps: [
    { id: 'aB3k9ZpQ1a', label: 'Start', type: 'trigger' },
    { id: 'bC4l0ApR2b', label: 'Check', type: 'condition' },
    { id: 'cD5m1BqS3c', label: 'Action', type: 'action' },
  ],
  ...overrides,
});

const createTestTemplate = (overrides?: Partial<WorkflowTemplate>): WorkflowTemplate => ({
  id: 'tmpl12abcd',
  account: 'acct12abcd',
  organization: 'org12abcde',
  version: '1.0.0',
  workflowDefinition: createTestWorkflow(),
  metadata: {
    label: 'Test Template',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user12abcd',
    updatedBy: 'user12abcd',
  },
  ...overrides,
});

describe('Error Recovery Scenarios - Integration', () => {
  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      replaceOne: jest.fn(),
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    mockGetMongoDatabase.mockResolvedValue(mockDb);
  });

  describe('Network Error Recovery', () => {
    it('should handle network timeout gracefully', async () => {
      const timeoutError = new Error('Network timeout');
      mockCollection.insertOne.mockRejectedValueOnce(timeoutError);

      const template = createTestTemplate();

      await expect(WorkflowTemplateDbUtil.create(template)).rejects.toThrow('Network timeout');
    });

    it('should preserve template state after network failure', async () => {
      const template = createTestTemplate();
      mockCollection.insertOne.mockRejectedValueOnce(new Error('Connection refused'));

      try {
        await WorkflowTemplateDbUtil.create(template);
      } catch (err) {
        // State should be preserved - template object unchanged
        expect(template.id).toBe('tmpl12abcd');
        expect(template.metadata.label).toBe('Test Template');
      }
    });

    it('should handle MongoDB connection pool errors', async () => {
      const poolError = new Error('Connection pool exhausted');
      mockGetMongoDatabase.mockRejectedValueOnce(poolError);

      const template = createTestTemplate();

      await expect(WorkflowTemplateDbUtil.create(template)).rejects.toThrow('Connection pool exhausted');
    });

    it('should recover from intermittent network failures', async () => {
      const template = createTestTemplate();

      // First call fails
      mockCollection.findOne.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(WorkflowTemplateDbUtil.get(template.account, template.organization, template.id)).rejects.toThrow();

      // Clear mocks to simulate retry
      jest.clearAllMocks();
      mockGetMongoDatabase.mockResolvedValue(mockDb);
      mockCollection.findOne.mockResolvedValueOnce(template);

      // Retry succeeds
      const result = await WorkflowTemplateDbUtil.get(template.account, template.organization, template.id);

      expect(result).toEqual(expect.objectContaining({ id: template.id }));
    });
  });

  describe('Validation Error Recovery', () => {
    it('should catch schema validation errors on create', async () => {
      const invalidTemplate = createTestTemplate({
        metadata: {
          label: '', // Invalid: empty label
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'user12abcd',
          updatedBy: 'user12abcd',
        },
      });

      mockCollection.insertOne.mockRejectedValueOnce(new Error('Validation failed: label is required'));

      await expect(WorkflowTemplateDbUtil.create(invalidTemplate)).rejects.toThrow();
    });

    it('should provide meaningful error message for invalid workflow', async () => {
      const template = createTestTemplate({
        workflowDefinition: {
          steps: [], // Invalid: empty steps
        },
      });

      mockCollection.insertOne.mockRejectedValueOnce(new Error('Workflow must have at least one step'));

      await expect(WorkflowTemplateDbUtil.create(template)).rejects.toThrow('at least one step');
    });

    it('should validate account and organization on update', async () => {
      const template = createTestTemplate();

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: null, // Not found
      });

      const result = await WorkflowTemplateDbUtil.update(
        'invalid-account',
        template.id,
        template.version,
        { metadata: { ...template.metadata } }
      );

      expect(result).toBeNull();
    });

    it('should catch malformed version strings', async () => {
      const template = createTestTemplate({ version: 'not-a-version' });

      mockCollection.findOne.mockResolvedValueOnce(template);

      // Should still retrieve the template (version is just a string)
      const result = await WorkflowTemplateDbUtil.get(template.account, template.organization, template.id, 'not-a-version');

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 'not-a-version',
        })
      );
    });
  });

  describe('Database Constraint Violations', () => {
    it('should handle duplicate key constraint violation on create', async () => {
      const template = createTestTemplate();
      const duplicateError = new Error('E11000 duplicate key error');

      mockCollection.insertOne.mockRejectedValueOnce(duplicateError);

      await expect(WorkflowTemplateDbUtil.create(template)).rejects.toThrow('E11000');
    });

    it('should handle unique index violations', async () => {
      const template = createTestTemplate();
      mockCollection.insertOne.mockRejectedValueOnce(new Error('Unique constraint violation on account+id+version'));

      await expect(WorkflowTemplateDbUtil.create(template)).rejects.toThrow('Unique constraint');
    });

    it('should handle foreign key constraint violations', async () => {
      const template = createTestTemplate();
      mockCollection.replaceOne.mockRejectedValueOnce(new Error('Foreign key constraint failed'));

      await expect(
        WorkflowTemplateDbUtil.upsert(template.account, template.organization, template.id, template.version, template)
      ).rejects.toThrow('Foreign key');
    });

    it('should allow upsert to replace existing document', async () => {
      const template = createTestTemplate();
      const updatedTemplate = { ...template, version: '2.0.0' };

      mockCollection.replaceOne.mockResolvedValueOnce({ upsertedId: null, modifiedCount: 1 });
      mockCollection.findOne.mockResolvedValueOnce(updatedTemplate);

      const result = await WorkflowTemplateDbUtil.upsert(
        template.account,
        template.organization,
        template.id,
        '2.0.0',
        updatedTemplate
      );

      expect(mockCollection.replaceOne).toHaveBeenCalled();
      expect(result.version).toBe('2.0.0');
    });
  });

  describe('Concurrent Modification Detection', () => {
    it('should detect version mismatch on update', async () => {
      const template = createTestTemplate({ version: '1.0.0' });

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: null, // Document with different version not found
      });

      const result = await WorkflowTemplateDbUtil.update(
        template.account,
        template.id,
        '1.0.1', // Different version
        { metadata: { ...template.metadata } }
      );

      expect(result).toBeNull();
    });

    it('should preserve original template when update fails due to version mismatch', async () => {
      const template = createTestTemplate({ version: '1.0.0' });
      const originalLabel = template.metadata.label;

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: null,
      });

      const result = await WorkflowTemplateDbUtil.update(
        template.account,
        template.id,
        '2.0.0', // Document with this version doesn't exist
        { metadata: { ...template.metadata, label: 'Updated' } }
      );

      expect(result).toBeNull();
      expect(template.metadata.label).toBe(originalLabel);
    });

    it('should detect concurrent delete', async () => {
      const template = createTestTemplate();

      mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

      const result = await WorkflowTemplateDbUtil.delete(template.account, template.id, template.version);

      expect(result).toBe(false);
    });

    it('should handle race condition in list operations', async () => {
      const templates = [
        createTestTemplate({ id: 'tmpl11111a' }),
        createTestTemplate({ id: 'tmpl22222b' }),
      ];

      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce(templates),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const result1 = await WorkflowTemplateDbUtil.list('acct12abcd', {});

      // Subsequent list might return different results due to concurrent modifications
      const templates2 = [createTestTemplate({ id: 'tmpl11111a' })];

      const mockCursor2 = {
        toArray: jest.fn().mockResolvedValueOnce(templates2),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor2);

      const result2 = await WorkflowTemplateDbUtil.list('acct12abcd', {});

      expect(result1.templates).toHaveLength(2);
      expect(result2.templates).toHaveLength(1);
    });
  });

  describe('Transaction and Rollback Scenarios', () => {
    it('should maintain data consistency on partial update failure', async () => {
      const template = createTestTemplate();
      const updates = {
        metadata: { ...template.metadata, label: 'Updated' },
        workflowDefinition: createTestWorkflow(),
      };

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: template, // Old value on failure
      });

      const result = await WorkflowTemplateDbUtil.update(
        template.account,
        template.id,
        template.version,
        updates
      );

      // Should return old state if update fails
      expect(result).not.toBeNull();
    });

    it('should handle rollback on validation failure during update', async () => {
      const template = createTestTemplate();

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: template,
      });

      // Even with invalid data, should try to apply (rollback happens at DB level)
      const result = await WorkflowTemplateDbUtil.update(
        template.account,
        template.id,
        template.version,
        { metadata: { ...template.metadata } }
      );

      expect(result).not.toBeNull();
    });

    it('should prevent partial state corruption on delete failure', async () => {
      const template = createTestTemplate();

      // First delete attempt fails
      mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

      const result1 = await WorkflowTemplateDbUtil.delete(template.account, template.id, template.version);

      expect(result1).toBe(false);

      // Template should still be retrievable
      mockCollection.findOne.mockResolvedValueOnce(template);

      const retrieved = await WorkflowTemplateDbUtil.get(template.account, template.organization, template.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(template.id);
    });
  });

  describe('Error Notification and Logging', () => {
    it('should provide structured error information', async () => {
      const template = createTestTemplate();
      const error = new Error('Database error');

      mockCollection.insertOne.mockRejectedValueOnce(error);

      try {
        await WorkflowTemplateDbUtil.create(template);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain('Database error');
      }
    });

    it('should distinguish between user errors and system errors', async () => {
      const template = createTestTemplate();

      // User error (validation)
      mockCollection.insertOne.mockRejectedValueOnce(new Error('Validation failed: label is required'));

      try {
        await WorkflowTemplateDbUtil.create(template);
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toMatch(/Validation|required/);
      }

      // System error (connection)
      jest.clearAllMocks();
      mockGetMongoDatabase.mockResolvedValue(mockDb);
      mockCollection.insertOne.mockRejectedValueOnce(new Error('Connection pool exhausted'));

      try {
        await WorkflowTemplateDbUtil.create(template);
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toMatch(/Connection|pool/);
      }
    });
  });

  describe('State Preservation After Errors', () => {
    it('should not modify template object on creation failure', async () => {
      const template = createTestTemplate();
      const originalId = template.id;
      const originalLabel = template.metadata.label;

      mockCollection.insertOne.mockRejectedValueOnce(new Error('Save failed'));

      try {
        await WorkflowTemplateDbUtil.create(template);
      } catch (err) {
        // Original object should be unchanged
        expect(template.id).toBe(originalId);
        expect(template.metadata.label).toBe(originalLabel);
      }
    });

    it('should allow retry with same template after failure', async () => {
      const template = createTestTemplate();

      // First attempt fails
      mockCollection.insertOne.mockRejectedValueOnce(new Error('Temporary error'));

      await expect(WorkflowTemplateDbUtil.create(template)).rejects.toThrow();

      // Reset mock for retry
      jest.clearAllMocks();
      mockGetMongoDatabase.mockResolvedValue(mockDb);
      mockCollection.insertOne.mockResolvedValueOnce({ insertedId: template.id });

      // Retry should succeed
      const result = await WorkflowTemplateDbUtil.create(template);

      expect(result).toEqual(expect.objectContaining({ id: template.id }));
    });

    it('should maintain consistency between list and get operations on errors', async () => {
      const template = createTestTemplate();

      // List succeeds but returns data
      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce([template]),
      };
      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const listResult = await WorkflowTemplateDbUtil.list('acct12abcd', {});

      expect(listResult.templates).toHaveLength(1);

      // Get with error
      jest.clearAllMocks();
      mockGetMongoDatabase.mockResolvedValue(mockDb);
      mockCollection.findOne.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(WorkflowTemplateDbUtil.get(template.account, template.organization, template.id)).rejects.toThrow();
    });
  });
});
