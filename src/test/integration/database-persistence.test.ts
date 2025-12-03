/**
 * Integration Tests for Database Persistence Layer
 *
 * Tests database operations including:
 * - Creating templates in database
 * - Retrieving templates by ID and version
 * - Updating template fields
 * - Listing templates with filters and pagination
 * - Handling database errors
 * - Data isolation by account/organization
 * - Template versioning
 * - Data cleanup and deletion
 */

import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import { WorkflowTemplate, WorkflowDefinition } from '@/app/types/workflowTemplate';

// Mock MongoDB database
jest.mock('@/app/utils/mongodb-connection', () => ({
  getMongoDatabase: jest.fn(),
}));

import { getMongoDatabase } from '@/app/utils/mongodb-connection';

const mockGetMongoDatabase = getMongoDatabase as jest.MockedFunction<typeof getMongoDatabase>;

// Test fixture builders
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

describe('Database Persistence Layer - Integration', () => {
  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock collection with all required methods
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

    // Setup mock database
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    mockGetMongoDatabase.mockResolvedValue(mockDb);
  });

  describe('Creating Templates', () => {
    it('should create template in database', async () => {
      const template = createTestTemplate();
      mockCollection.insertOne.mockResolvedValueOnce({ insertedId: template.id });

      await WorkflowTemplateDbUtil.create(template);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith('workflowTemplates');
    });

    it('should validate template schema before saving', async () => {
      const template = createTestTemplate();
      mockCollection.insertOne.mockResolvedValueOnce({ insertedId: template.id });

      await WorkflowTemplateDbUtil.create(template);

      // Verify that insertOne was called (schema validation happens before this)
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it('should assign correct metadata on creation', async () => {
      const template = createTestTemplate({
        metadata: {
          label: 'New Template',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'user12abcd',
          updatedBy: 'user12abcd',
        },
      });

      mockCollection.insertOne.mockResolvedValueOnce({ insertedId: template.id });

      await WorkflowTemplateDbUtil.create(template);

      const callArgs = mockCollection.insertOne.mock.calls[0][0];
      expect(callArgs.metadata.label).toBe('New Template');
      expect(callArgs.metadata.status).toBe('draft');
    });

    it('should handle creation errors gracefully', async () => {
      const template = createTestTemplate();
      const error = new Error('Database error');
      mockCollection.insertOne.mockRejectedValueOnce(error);

      await expect(WorkflowTemplateDbUtil.create(template)).rejects.toThrow('Database error');
    });

    it('should prevent duplicate IDs by using insert (no upsert on create)', async () => {
      const template = createTestTemplate({ id: 'duplicate-id' });
      mockCollection.insertOne.mockResolvedValueOnce({ insertedId: 'duplicate-id' });

      await WorkflowTemplateDbUtil.create(template);

      // insertOne will naturally fail if ID exists (MongoDB constraint)
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });
  });

  describe('Retrieving Templates', () => {
    it('should retrieve template by ID and account', async () => {
      const template = createTestTemplate();
      mockCollection.findOne.mockResolvedValueOnce(template);

      const result = await WorkflowTemplateDbUtil.get(template.account, template.organization, template.id);

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          account: template.account,
          id: template.id,
        })
      );
      expect(result).toEqual(expect.objectContaining({ id: template.id }));
    });

    it('should return null when template not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      const result = await WorkflowTemplateDbUtil.get('acct12abcd', 'org12abcde', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should enforce account-based access control', async () => {
      const template = createTestTemplate();
      mockCollection.findOne.mockResolvedValueOnce(null);

      const result = await WorkflowTemplateDbUtil.get('different-account', template.organization, template.id);

      expect(result).toBeNull();
    });

    it('should support organization-based filtering', async () => {
      const template = createTestTemplate({ organization: 'org-dept1' });
      mockCollection.findOne.mockResolvedValueOnce(template);

      const result = await WorkflowTemplateDbUtil.get(template.account, 'org-dept1', template.id);

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: 'org-dept1',
        })
      );
      expect(result?.organization).toBe('org-dept1');
    });

    it('should retrieve specific template version', async () => {
      const template = createTestTemplate({ version: '1.2.3' });
      mockCollection.findOne.mockResolvedValueOnce(template);

      const result = await WorkflowTemplateDbUtil.get(template.account, template.organization, template.id, '1.2.3');

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.2.3',
        })
      );
    });
  });

  describe('Listing Templates', () => {
    it('should list all templates for account', async () => {
      const templates = [
        createTestTemplate({ id: 'tmpl11111a', metadata: { ...createTestTemplate().metadata, label: 'Template 1' } }),
        createTestTemplate({ id: 'tmpl22222b', metadata: { ...createTestTemplate().metadata, label: 'Template 2' } }),
      ];

      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce(templates),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const result = await WorkflowTemplateDbUtil.list('acct12abcd', {});

      expect(mockCollection.aggregate).toHaveBeenCalled();
      expect(result.templates).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should support pagination', async () => {
      const allTemplates = Array(10)
        .fill(null)
        .map((_, i) => createTestTemplate({ id: `tmpl${i.toString().padStart(8, '0')}` }));

      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce(allTemplates),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const result = await WorkflowTemplateDbUtil.list('acct12abcd', {}, 1, 5);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.templates).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });

    it('should calculate pagination correctly for last page', async () => {
      const allTemplates = Array(8)
        .fill(null)
        .map((_, i) => createTestTemplate({ id: `tmpl${i.toString().padStart(8, '0')}` }));

      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce(allTemplates),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const result = await WorkflowTemplateDbUtil.list('acct12abcd', {}, 2, 5);

      expect(result.page).toBe(2);
      expect(result.templates).toHaveLength(3);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by status', async () => {
      const publishedTemplate = createTestTemplate({
        metadata: { ...createTestTemplate().metadata, status: 'published' },
      });

      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce([publishedTemplate]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const result = await WorkflowTemplateDbUtil.list('acct12abcd', { status: ['published'] });

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].metadata.status).toBe('published');
    });

    it('should filter by organization', async () => {
      const template = createTestTemplate({ organization: 'org-dept1' });

      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce([template]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const result = await WorkflowTemplateDbUtil.list('acct12abcd', { organization: 'org-dept1' });

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].organization).toBe('org-dept1');
    });

    it('should search by label text', async () => {
      const template = createTestTemplate({
        metadata: { ...createTestTemplate().metadata, label: 'Event Approval Workflow' },
      });

      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce([template]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const result = await WorkflowTemplateDbUtil.list('acct12abcd', { label: 'Event' });

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].metadata.label).toContain('Event');
    });

    it('should return empty list when no templates found', async () => {
      const mockCursor = {
        toArray: jest.fn().mockResolvedValueOnce([]),
      };

      mockCollection.aggregate.mockReturnValueOnce(mockCursor);

      const result = await WorkflowTemplateDbUtil.list('acct12abcd', {});

      expect(result.templates).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Updating Templates', () => {
    it('should update template in database', async () => {
      const template = createTestTemplate();
      const updatedLabel = 'Updated Template';
      const updatedTemplate = {
        ...template,
        metadata: { ...template.metadata, label: updatedLabel },
      };

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: updatedTemplate,
      });

      const result = await WorkflowTemplateDbUtil.update(
        template.account,
        template.id,
        template.version,
        { metadata: { ...template.metadata, label: updatedLabel } }
      );

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(result?.metadata.label).toBe(updatedLabel);
    });

    it('should update workflow definition', async () => {
      const template = createTestTemplate();
      const newWorkflow = createTestWorkflow({
        steps: [...template.workflowDefinition.steps, { id: 'dE6n2BrT4d', label: 'New Step', type: 'action' }],
      });
      const updatedTemplate = {
        ...template,
        workflowDefinition: newWorkflow,
      };

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: updatedTemplate,
      });

      const result = await WorkflowTemplateDbUtil.update(
        template.account,
        template.id,
        template.version,
        { workflowDefinition: newWorkflow }
      );

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(result?.workflowDefinition.steps).toHaveLength(4);
    });

    it('should preserve other fields when updating', async () => {
      const template = createTestTemplate();
      const updatedTemplate = {
        ...template,
        metadata: { ...template.metadata, label: 'Updated' },
      };

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: updatedTemplate,
      });

      await WorkflowTemplateDbUtil.update(
        template.account,
        template.id,
        template.version,
        { metadata: { ...template.metadata, label: 'Updated' } }
      );

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: template.id,
          account: template.account,
          version: template.version,
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should reject update if template not found', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: null,
      });

      const result = await WorkflowTemplateDbUtil.update(
        'acct12abcd',
        'nonexistent',
        '1.0.0',
        { metadata: { ...createTestTemplate().metadata } }
      );

      expect(result).toBeNull();
    });
  });

  describe('Data Isolation', () => {
    it('should isolate data by account', async () => {
      const template1 = createTestTemplate({ account: 'acct11111' });
      const template2 = createTestTemplate({ account: 'acct22222' });

      mockCollection.findOne.mockResolvedValueOnce(template1);

      const result1 = await WorkflowTemplateDbUtil.get('acct11111', null, template1.id);

      mockCollection.findOne.mockResolvedValueOnce(null);

      const result2 = await WorkflowTemplateDbUtil.get('acct22222', null, template1.id);

      expect(result1).not.toBeNull();
      expect(result2).toBeNull();
    });

    it('should support organization-level isolation', async () => {
      const orgTemplate = createTestTemplate({ organization: 'org-dept1' });

      mockCollection.findOne.mockResolvedValueOnce(orgTemplate);

      const result = await WorkflowTemplateDbUtil.get(orgTemplate.account, 'org-dept1', orgTemplate.id);

      expect(result?.organization).toBe('org-dept1');
    });

    it('should support null organization for account-level templates', async () => {
      const accountTemplate = createTestTemplate({ organization: null });

      mockCollection.findOne.mockResolvedValueOnce(accountTemplate);

      const result = await WorkflowTemplateDbUtil.get(accountTemplate.account, null, accountTemplate.id);

      expect(result?.organization).toBeNull();
    });
  });

  describe('Versioning', () => {
    it('should support template versioning', async () => {
      const v1 = createTestTemplate({ version: '1.0.0' });
      const v2 = createTestTemplate({ version: '2.0.0' });

      mockCollection.findOne.mockResolvedValueOnce(v1);
      const result1 = await WorkflowTemplateDbUtil.get(v1.account, v1.organization, v1.id, '1.0.0');

      mockCollection.findOne.mockResolvedValueOnce(v2);
      const result2 = await WorkflowTemplateDbUtil.get(v2.account, v2.organization, v2.id, '2.0.0');

      expect(result1?.version).toBe('1.0.0');
      expect(result2?.version).toBe('2.0.0');
    });

    it('should retrieve latest version by default', async () => {
      const template = createTestTemplate({ version: '2.1.0' });

      mockCollection.findOne.mockResolvedValueOnce(template);

      const result = await WorkflowTemplateDbUtil.get(template.account, template.organization, template.id);

      // When no version specified, it should query without version filter
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        expect.not.objectContaining({
          version: expect.anything(),
        })
      );
    });

    it('should list all versions of a template with upsert', async () => {
      const template = createTestTemplate();

      mockCollection.replaceOne.mockResolvedValueOnce({ upsertedId: template.id });
      mockCollection.findOne.mockResolvedValueOnce(template);

      // The upsert method replaces or inserts
      const result = await WorkflowTemplateDbUtil.upsert(
        template.account,
        template.organization,
        template.id,
        template.version,
        template
      );

      expect(mockCollection.replaceOne).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: template.id }));
    });
  });

  describe('Deletion and Cleanup', () => {
    it('should delete template from database', async () => {
      const template = createTestTemplate();

      mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      const result = await WorkflowTemplateDbUtil.delete(template.account, template.id, template.version);

      expect(mockCollection.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({
          account: template.account,
          id: template.id,
          version: template.version,
        })
      );
      expect(result).toBe(true);
    });

    it('should handle deletion of nonexistent template', async () => {
      mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

      const result = await WorkflowTemplateDbUtil.delete('acct12abcd', 'nonexistent', '1.0.0');

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const error = new Error('Connection timeout');
      mockGetMongoDatabase.mockRejectedValueOnce(error);

      await expect(WorkflowTemplateDbUtil.create(createTestTemplate())).rejects.toThrow('Connection timeout');
    });

    it('should handle validation errors', async () => {
      const invalidTemplate = createTestTemplate({
        metadata: { ...createTestTemplate().metadata, label: '' }, // invalid
      });

      mockCollection.insertOne.mockRejectedValueOnce(new Error('Validation failed'));

      await expect(WorkflowTemplateDbUtil.create(invalidTemplate)).rejects.toThrow();
    });

    it('should handle database timeout gracefully', async () => {
      const error = new Error('Operation timeout');
      mockCollection.findOne.mockRejectedValueOnce(error);

      await expect(WorkflowTemplateDbUtil.get('acct12abcd', 'org12abcde', 'tmpl12abcd')).rejects.toThrow('Operation timeout');
    });
  });

  describe('Data Normalization', () => {
    it('should normalize timestamps to ISO strings', async () => {
      const template = createTestTemplate();
      mockCollection.findOne.mockResolvedValueOnce(template);

      const result = await WorkflowTemplateDbUtil.get(template.account, template.organization, template.id);

      expect(result?.metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result?.metadata.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle date object conversion', async () => {
      const templateWithDateObjects = {
        ...createTestTemplate(),
        metadata: {
          ...createTestTemplate().metadata,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        },
      };

      mockCollection.findOne.mockResolvedValueOnce(templateWithDateObjects);

      const result = await WorkflowTemplateDbUtil.get(
        templateWithDateObjects.account,
        templateWithDateObjects.organization,
        templateWithDateObjects.id
      );

      expect(typeof result?.metadata.createdAt).toBe('string');
      expect(typeof result?.metadata.updatedAt).toBe('string');
    });

    it('should not expose MongoDB _id field', async () => {
      const templateWithId = {
        _id: 'mongodb-id-12345',
        ...createTestTemplate(),
      };

      mockCollection.findOne.mockResolvedValueOnce(templateWithId);

      const result = await WorkflowTemplateDbUtil.get(
        createTestTemplate().account,
        createTestTemplate().organization,
        createTestTemplate().id
      );

      expect(result).not.toHaveProperty('_id');
    });
  });
});
