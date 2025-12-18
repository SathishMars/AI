/**
 * Tests for WorkflowTemplateService
 * 
 * Tests the service layer for workflow template operations including:
 * - Listing templates with filtering and pagination
 * - Creating templates with validation
 * - Auto-extraction of requestTemplateId and type from workflow definition
 */

import { listTemplates, createTemplate } from '@/app/services/workflowTemplateService';
import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import { WorkflowTemplate, WorkflowTemplateMetadata } from '@/app/types/workflowTemplate';

// Mock the database utility
jest.mock('@/app/utils/workflowTemplateDbUtil');

const mockList = WorkflowTemplateDbUtil.list as jest.MockedFunction<typeof WorkflowTemplateDbUtil.list>;
const mockCreate = WorkflowTemplateDbUtil.create as jest.MockedFunction<typeof WorkflowTemplateDbUtil.create>;
const mockFindRequestTemplateId = WorkflowTemplateDbUtil.findRequestTemplateId as jest.MockedFunction<typeof WorkflowTemplateDbUtil.findRequestTemplateId>;
const mockFindWorkflowType = WorkflowTemplateDbUtil.findWorkflowType as jest.MockedFunction<typeof WorkflowTemplateDbUtil.findWorkflowType>;

// Helper to create mock template metadata
const createMockMetadata = (overrides?: Partial<WorkflowTemplateMetadata>): WorkflowTemplateMetadata => ({
  label: 'Test Template',
  description: 'A test template',
  status: 'draft' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'user-123',
  updatedBy: 'user-123',
  ...overrides,
});

// Helper to create mock template
const createMockTemplate = (overrides?: Partial<WorkflowTemplate>): WorkflowTemplate => ({
  id: 'test-template-id',
  account: 'account-123',
  version: '1.0.0',
  metadata: createMockMetadata(),
  workflowDefinition: { steps: [] },
  ...overrides,
});

describe('WorkflowTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listTemplates', () => {
    it('should list templates with default pagination', async () => {
      const mockTemplate = createMockTemplate();
      mockList.mockResolvedValue({
        templates: [mockTemplate],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      const result = await listTemplates({
        account: 'account-123',
        organization: undefined,
        page: 1,
        pageSize: 20,
      });

      expect(mockList).toHaveBeenCalledWith(
        'account-123',
        {
          organization: undefined,
          status: undefined,
          label: undefined,
          tags: undefined,
          createdAfter: undefined,
          createdBefore: undefined,
          type: undefined,
        },
        1,
        20
      );
      expect(result.templates).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should pass type filter to database', async () => {
      mockList.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      await listTemplates({
        account: 'account-123',
        organization: 'org-456',
        page: 1,
        pageSize: 20,
        type: 'Request',
      });

      expect(mockList).toHaveBeenCalledWith(
        'account-123',
        expect.objectContaining({
          type: 'Request',
        }),
        1,
        20
      );
    });

    it('should pass MRF type filter to database', async () => {
      mockList.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      await listTemplates({
        account: 'account-123',
        organization: null,
        page: 1,
        pageSize: 20,
        type: 'MRF',
      });

      expect(mockList).toHaveBeenCalledWith(
        'account-123',
        expect.objectContaining({
          type: 'MRF',
        }),
        1,
        20
      );
    });

    it('should pass status filter to database', async () => {
      mockList.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      await listTemplates({
        account: 'account-123',
        organization: undefined,
        page: 1,
        pageSize: 20,
        status: ['published', 'draft'],
      });

      expect(mockList).toHaveBeenCalledWith(
        'account-123',
        expect.objectContaining({
          status: ['published', 'draft'],
        }),
        1,
        20
      );
    });

    it('should pass tags filter to database', async () => {
      mockList.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      await listTemplates({
        account: 'account-123',
        organization: undefined,
        page: 1,
        pageSize: 20,
        tags: ['tag1', 'tag2'],
      });

      expect(mockList).toHaveBeenCalledWith(
        'account-123',
        expect.objectContaining({
          tags: ['tag1', 'tag2'],
        }),
        1,
        20
      );
    });

    it('should pass date filters to database', async () => {
      const createdAfter = new Date('2024-01-01');
      const createdBefore = new Date('2024-12-31');

      mockList.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      await listTemplates({
        account: 'account-123',
        organization: undefined,
        page: 1,
        pageSize: 20,
        createdAfter,
        createdBefore,
      });

      expect(mockList).toHaveBeenCalledWith(
        'account-123',
        expect.objectContaining({
          createdAfter,
          createdBefore,
        }),
        1,
        20
      );
    });

    it('should throw error for invalid page number', async () => {
      await expect(
        listTemplates({
          account: 'account-123',
          organization: undefined,
          page: 0,
          pageSize: 20,
        })
      ).rejects.toThrow('Page must be greater than 0');
    });

    it('should throw error for invalid page size (less than 1)', async () => {
      await expect(
        listTemplates({
          account: 'account-123',
          organization: undefined,
          page: 1,
          pageSize: 0,
        })
      ).rejects.toThrow('Page size must be greater than 0');
    });

    it('should throw error for page size exceeding 100', async () => {
      await expect(
        listTemplates({
          account: 'account-123',
          organization: undefined,
          page: 1,
          pageSize: 101,
        })
      ).rejects.toThrow('Page size must not exceed 100');
    });

    it('should handle organization as null (account-level only)', async () => {
      mockList.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      await listTemplates({
        account: 'account-123',
        organization: null,
        page: 1,
        pageSize: 20,
      });

      expect(mockList).toHaveBeenCalledWith(
        'account-123',
        expect.objectContaining({
          organization: null,
        }),
        1,
        20
      );
    });

    it('should handle organization as string (org-level query)', async () => {
      mockList.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      await listTemplates({
        account: 'account-123',
        organization: 'org-456',
        page: 1,
        pageSize: 20,
      });

      expect(mockList).toHaveBeenCalledWith(
        'account-123',
        expect.objectContaining({
          organization: 'org-456',
        }),
        1,
        20
      );
    });
  });

  describe('createTemplate', () => {
    it('should create a template with account context', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: createMockMetadata(),
        workflowDefinition: { steps: [] },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
      });

      mockFindRequestTemplateId.mockReturnValue(null);
      mockFindWorkflowType.mockReturnValue(null);
      mockCreate.mockResolvedValue(createdTemplate);

      const result = await createTemplate({
        account: 'account-123',
        templateData,
      });

      expect(mockCreate).toHaveBeenCalled();
      expect(result.account).toBe('account-123');
      expect(result.id).toBe('new-template');
    });

    it('should create a template with organization context', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: createMockMetadata(),
        workflowDefinition: { steps: [] },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
        organization: 'org-456',
      });

      mockFindRequestTemplateId.mockReturnValue(null);
      mockFindWorkflowType.mockReturnValue(null);
      mockCreate.mockResolvedValue(createdTemplate);

      const result = await createTemplate({
        account: 'account-123',
        organization: 'org-456',
        templateData,
      });

      expect(mockCreate).toHaveBeenCalled();
      expect(result.account).toBe('account-123');
      expect(result.organization).toBe('org-456');
    });

    it('should auto-extract and store requestTemplateId from workflow definition', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: createMockMetadata(),
        workflowDefinition: {
          steps: [
            {
              id: 'trigger',
              label: 'On Request',
              type: 'trigger',
              stepFunction: 'onRequest',
              functionParams: {
                requestTemplateId: 'req-template-123',
              },
            },
          ],
        },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
        metadata: {
          ...createMockMetadata(),
          requestTemplateId: 'req-template-123',
        },
      });

      mockFindRequestTemplateId.mockReturnValue('req-template-123');
      mockFindWorkflowType.mockReturnValue('Request');
      mockCreate.mockResolvedValue(createdTemplate);

      const result = await createTemplate({
        account: 'account-123',
        templateData,
      });

      expect(mockFindRequestTemplateId).toHaveBeenCalledWith(templateData.workflowDefinition.steps);
      expect(mockCreate).toHaveBeenCalled();
      const createCallArg = (mockCreate as jest.Mock).mock.calls[0][0];
      expect(createCallArg.metadata.requestTemplateId).toBe('req-template-123');
    });

    it('should auto-extract and store workflow type (Request) from workflow definition', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: createMockMetadata(),
        workflowDefinition: {
          steps: [
            {
              id: 'trigger',
              label: 'On Request',
              type: 'trigger',
              stepFunction: 'onRequest',
            },
          ],
        },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
        metadata: {
          ...createMockMetadata(),
          type: 'Request',
        },
      });

      mockFindRequestTemplateId.mockReturnValue(null);
      mockFindWorkflowType.mockReturnValue('Request');
      mockCreate.mockResolvedValue(createdTemplate);

      const result = await createTemplate({
        account: 'account-123',
        templateData,
      });

      expect(mockFindWorkflowType).toHaveBeenCalledWith(templateData.workflowDefinition.steps);
      expect(mockCreate).toHaveBeenCalled();
      const createCallArg = (mockCreate as jest.Mock).mock.calls[0][0];
      expect(createCallArg.metadata.type).toBe('Request');
    });

    it('should auto-extract and store workflow type (MRF) from workflow definition', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: createMockMetadata(),
        workflowDefinition: {
          steps: [
            {
              id: 'trigger',
              label: 'On MRF',
              type: 'trigger',
              stepFunction: 'onMRF',
            },
          ],
        },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
        metadata: {
          ...createMockMetadata(),
          type: 'MRF',
        },
      });

      mockFindRequestTemplateId.mockReturnValue(null);
      mockFindWorkflowType.mockReturnValue('MRF');
      mockCreate.mockResolvedValue(createdTemplate);

      const result = await createTemplate({
        account: 'account-123',
        templateData,
      });

      expect(mockFindWorkflowType).toHaveBeenCalledWith(templateData.workflowDefinition.steps);
      expect(mockCreate).toHaveBeenCalled();
      const createCallArg = (mockCreate as jest.Mock).mock.calls[0][0];
      expect(createCallArg.metadata.type).toBe('MRF');
    });

    it('should auto-extract both requestTemplateId and type', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: createMockMetadata(),
        workflowDefinition: {
          steps: [
            {
              id: 'trigger',
              label: 'On Request',
              type: 'trigger',
              stepFunction: 'onRequest',
              functionParams: {
                requestTemplateId: 'req-template-123',
              },
            },
          ],
        },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
        metadata: {
          ...createMockMetadata(),
          requestTemplateId: 'req-template-123',
          type: 'Request',
        },
      });

      mockFindRequestTemplateId.mockReturnValue('req-template-123');
      mockFindWorkflowType.mockReturnValue('Request');
      mockCreate.mockResolvedValue(createdTemplate);

      const result = await createTemplate({
        account: 'account-123',
        templateData,
      });

      expect(mockCreate).toHaveBeenCalled();
      const createCallArg = (mockCreate as jest.Mock).mock.calls[0][0];
      expect(createCallArg.metadata.requestTemplateId).toBe('req-template-123');
      expect(createCallArg.metadata.type).toBe('Request');
    });

    it('should not set requestTemplateId when not found', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: createMockMetadata(),
        workflowDefinition: { steps: [] },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
      });

      mockFindRequestTemplateId.mockReturnValue(null);
      mockFindWorkflowType.mockReturnValue(null);
      mockCreate.mockResolvedValue(createdTemplate);

      await createTemplate({
        account: 'account-123',
        templateData,
      });

      expect(mockCreate).toHaveBeenCalled();
      const createCallArg = (mockCreate as jest.Mock).mock.calls[0][0];
      // Should not have requestTemplateId set if not found
      expect(createCallArg.metadata.requestTemplateId).toBeUndefined();
    });

    it('should not set type when not found', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: createMockMetadata(),
        workflowDefinition: { steps: [] },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
      });

      mockFindRequestTemplateId.mockReturnValue(null);
      mockFindWorkflowType.mockReturnValue(null);
      mockCreate.mockResolvedValue(createdTemplate);

      await createTemplate({
        account: 'account-123',
        templateData,
      });

      expect(mockCreate).toHaveBeenCalled();
      const createCallArg = (mockCreate as jest.Mock).mock.calls[0][0];
      // Should not have type set if not found
      expect(createCallArg.metadata.type).toBeUndefined();
    });

    it('should throw error for invalid template data', async () => {
      const invalidTemplateData = {
        // Missing required fields
        id: 'new-template',
      };

      mockFindRequestTemplateId.mockReturnValue(null);
      mockFindWorkflowType.mockReturnValue(null);

      await expect(
        createTemplate({
          account: 'account-123',
          templateData: invalidTemplateData,
        })
      ).rejects.toThrow('Invalid template data');
    });

    it('should preserve existing metadata fields when auto-extracting', async () => {
      const templateData = {
        id: 'new-template',
        version: '1.0.0',
        metadata: {
          ...createMockMetadata(),
          tags: ['existing-tag'],
          description: 'Existing description',
        },
        workflowDefinition: {
          steps: [
            {
              id: 'trigger',
              label: 'On Request',
              type: 'trigger',
              stepFunction: 'onRequest',
              functionParams: {
                requestTemplateId: 'req-template-123',
              },
            },
          ],
        },
      };

      const createdTemplate = createMockTemplate({
        ...templateData,
        account: 'account-123',
        metadata: {
          ...templateData.metadata,
          requestTemplateId: 'req-template-123',
          type: 'Request',
        },
      });

      mockFindRequestTemplateId.mockReturnValue('req-template-123');
      mockFindWorkflowType.mockReturnValue('Request');
      mockCreate.mockResolvedValue(createdTemplate);

      await createTemplate({
        account: 'account-123',
        templateData,
      });

      expect(mockCreate).toHaveBeenCalled();
      const createCallArg = (mockCreate as jest.Mock).mock.calls[0][0];
      expect(createCallArg.metadata.tags).toEqual(['existing-tag']);
      expect(createCallArg.metadata.description).toBe('Existing description');
      expect(createCallArg.metadata.requestTemplateId).toBe('req-template-123');
      expect(createCallArg.metadata.type).toBe('Request');
    });
  });
});

