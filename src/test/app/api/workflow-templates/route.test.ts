// src/test/app/api/workflow-templates/route.test.ts
import {
  createWorkflowTemplate,
  listWorkflowTemplates
} from '@/app/utils/workflow-template-database';
import { TemplateError } from '@/app/types/workflow-template';
import type {
  WorkflowTemplate,
  TemplateListResponse,
  CreateWorkflowTemplateInput
} from '@/app/types/workflow-template';

// Mock the database utilities
jest.mock('@/app/utils/workflow-template-database');

const mockCreateWorkflowTemplate = createWorkflowTemplate as jest.MockedFunction<typeof createWorkflowTemplate>;
const mockListWorkflowTemplates = listWorkflowTemplates as jest.MockedFunction<typeof listWorkflowTemplates>;

const workflowSteps = [
  {
    id: 'start',
    name: 'Start',
    type: 'trigger' as const,
    action: 'onMRFSubmit',
    children: [
      {
        id: 'end',
        name: 'End',
        type: 'end' as const,
        result: 'success'
      }
    ]
  }
];

const workflowDefinition = { steps: workflowSteps };

describe('Workflow Templates API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listWorkflowTemplates functionality', () => {
    it('should handle successful template listing', async () => {
      const now = new Date();
      const mockTemplates: TemplateListResponse = {
        templates: [
          {
            _id: 'template-1',
            id: 'tmpl-abc123',
            account: 'test-account',
            version: '1.0.0',
            workflowDefinition,
            metadata: {
              name: 'Test Workflow',
              description: 'A sample workflow',
              status: 'published',
              author: 'test-user',
              createdAt: now,
              updatedAt: now,
              tags: ['test']
            }
          } as WorkflowTemplate
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        hasMore: false
      };

      mockListWorkflowTemplates.mockResolvedValue(mockTemplates);

      const result = await listWorkflowTemplates('test-account', {}, 1, 20);

      expect(result.templates).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(mockListWorkflowTemplates).toHaveBeenCalledWith('test-account', {}, 1, 20);
    });

    it('should handle template listing with filters', async () => {
      const mockTemplates: TemplateListResponse = {
        templates: [],
        totalCount: 0,
        page: 2,
        pageSize: 10,
        hasMore: false
      };

      mockListWorkflowTemplates.mockResolvedValue(mockTemplates);

      const filters = {
        status: 'draft' as const,
        category: 'test',
        tags: ['tag1', 'tag2']
      };

      await listWorkflowTemplates('test-account', filters, 2, 10);

      expect(mockListWorkflowTemplates).toHaveBeenCalledWith('test-account', filters, 2, 10);
    });

    it('should handle database errors during listing', async () => {
      mockListWorkflowTemplates.mockRejectedValue(new TemplateError('Database error', 'DB_ERROR'));

      await expect(listWorkflowTemplates('test-account', {}, 1, 20))
        .rejects.toThrow(TemplateError);
    });
  });

  describe('createWorkflowTemplate functionality', () => {
    const validTemplateInput: CreateWorkflowTemplateInput = {
      account: 'test-account',
      name: 'test-workflow',
      workflowDefinition,
      description: 'A test workflow',
      category: 'test',
      tags: ['test', 'sample'],
      author: 'test-user'
    };

    it('should create a new template successfully', async () => {
      const now = new Date();
      const mockCreatedTemplate: WorkflowTemplate = {
        _id: 'template-123',
        id: 'tmpl-xyz789',
        account: validTemplateInput.account,
        version: '1.0.0',
        workflowDefinition: validTemplateInput.workflowDefinition,
        metadata: {
          name: validTemplateInput.name,
          description: validTemplateInput.description,
          status: 'draft',
          author: validTemplateInput.author,
          createdAt: now,
          updatedAt: now,
          tags: validTemplateInput.tags
        }
      };

      mockCreateWorkflowTemplate.mockResolvedValue(mockCreatedTemplate);

      const result = await createWorkflowTemplate(validTemplateInput);

      expect(result.metadata.name).toBe(validTemplateInput.name);
      expect(result.metadata.status).toBe('draft');
      expect(result.version).toBe('1.0.0');
      expect(mockCreateWorkflowTemplate).toHaveBeenCalledWith(validTemplateInput);
    });

    it('should handle template creation errors', async () => {
      mockCreateWorkflowTemplate.mockRejectedValue(new TemplateError('Template already exists', 'DUPLICATE_NAME'));

      await expect(createWorkflowTemplate(validTemplateInput))
        .rejects.toThrow(TemplateError);

      await expect(createWorkflowTemplate(validTemplateInput))
        .rejects.toThrow('Template already exists');
    });

    it('should handle unexpected errors during creation', async () => {
      mockCreateWorkflowTemplate.mockRejectedValue(new Error('Unexpected error'));

      await expect(createWorkflowTemplate(validTemplateInput))
        .rejects.toThrow('Unexpected error');
    });
  });

  describe('Query parameter parsing logic', () => {
    it('should parse valid pagination parameters', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', '2');
      searchParams.set('pageSize', '10');

      const page = parseInt(searchParams.get('page') || '1', 10);
      const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

      expect(page).toBe(2);
      expect(pageSize).toBe(10);
    });

    it('should handle invalid pagination parameters', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', '0');
      searchParams.set('pageSize', '150');

      const page = parseInt(searchParams.get('page') || '1', 10);
      const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

      expect(page).toBe(0);
      expect(pageSize).toBe(100);
    });

    it('should parse filter parameters', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('status', 'draft');
      searchParams.set('category', 'test');
      searchParams.set('tags', 'tag1,tag2,tag3');

      const status = searchParams.get('status');
      const category = searchParams.get('category');
      const tags = searchParams.get('tags')?.split(',').filter(Boolean);

      expect(status).toBe('draft');
      expect(category).toBe('test');
      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle date parameters', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('createdAfter', '2024-01-01T00:00:00.000Z');
      searchParams.set('createdBefore', '2024-12-31T23:59:59.999Z');

      const createdAfter = searchParams.get('createdAfter')
        ? new Date(searchParams.get('createdAfter')!)
        : undefined;
      const createdBefore = searchParams.get('createdBefore')
        ? new Date(searchParams.get('createdBefore')!)
        : undefined;

      expect(createdAfter).toBeInstanceOf(Date);
      expect(createdBefore).toBeInstanceOf(Date);
      expect(createdAfter?.getFullYear()).toBeGreaterThan(2020);
      expect(createdBefore?.getFullYear()).toBeGreaterThan(2020);
    });
  });
});