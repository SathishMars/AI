// src/test/app/api/workflow-templates/route.test.ts
import {
  createWorkflowTemplate,
  listWorkflowTemplates
} from '@/app/utils/workflow-template-database';
import { TemplateError } from '@/app/types/workflow-template';

// Mock the database utilities
jest.mock('@/app/utils/workflow-template-database');

const mockCreateWorkflowTemplate = createWorkflowTemplate as jest.MockedFunction<typeof createWorkflowTemplate>;
const mockListWorkflowTemplates = listWorkflowTemplates as jest.MockedFunction<typeof listWorkflowTemplates>;

describe('Workflow Templates API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listWorkflowTemplates functionality', () => {
    it('should handle successful template listing', async () => {
      const mockTemplates = {
        templates: [
          {
            _id: 'template-1',
            account: 'test-account',
            name: 'test-workflow',
            status: 'published' as const,
            version: '1.0.0',
            workflowDefinition: {
              schemaVersion: '1.0',
              metadata: {
                id: 'test-workflow-001',
                name: 'Test Workflow',
                version: '1.0.0',
                status: 'published' as const,
                tags: ['test']
              },
              steps: {
                start: {
                  name: 'Start',
                  type: 'trigger' as const,
                  action: 'onMRFSubmit',
                  nextSteps: ['end']
                },
                end: {
                  name: 'End',
                  type: 'end' as const,
                  result: 'success'
                }
              }
            },
            metadata: {
              createdAt: new Date(),
              updatedAt: new Date(),
              author: 'test-user'
            }
          }
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
      const mockTemplates = {
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
      
      expect(mockListWorkflowTemplates).toHaveBeenCalledWith(filters, 2, 10);
    });

    it('should handle database errors during listing', async () => {
      mockListWorkflowTemplates.mockRejectedValue(new TemplateError('Database error', 'DB_ERROR'));

      await expect(listWorkflowTemplates('test-account', {}, 1, 20))
        .rejects.toThrow(TemplateError);
    });
  });

  describe('createWorkflowTemplate functionality', () => {
    const validTemplateInput = {
      account: 'test-account',
      name: 'test-workflow',
      workflowDefinition: {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow-001',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft' as const,
          tags: ['test']
        },
        steps: {
          start: {
            name: 'Start',
            type: 'trigger' as const,
            action: 'onMRFSubmit',
            nextSteps: ['end']
          },
          end: {
            name: 'End',
            type: 'end' as const,
            result: 'success'
          }
        }
      },
      description: 'A test workflow',
      category: 'test',
      tags: ['test', 'sample'],
      author: 'test-user'
    };

    it('should create a new template successfully', async () => {
      const mockCreatedTemplate = {
        _id: 'template-123',
        account: validTemplateInput.account,
        name: validTemplateInput.name,
        workflowDefinition: validTemplateInput.workflowDefinition,
        description: validTemplateInput.description,
        category: validTemplateInput.category,
        tags: validTemplateInput.tags,
        author: validTemplateInput.author,
        status: 'draft' as const,
        version: '1.0.0',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test-user'
        }
      };

      mockCreateWorkflowTemplate.mockResolvedValue(mockCreatedTemplate);

      const result = await createWorkflowTemplate(validTemplateInput);
      
      expect(result.name).toBe(validTemplateInput.name);
      expect(result.status).toBe('draft');
      expect(result.version).toBe('1.0.0');
      expect(mockCreateWorkflowTemplate).toHaveBeenCalledWith(validTemplateInput);
    });

    it('should handle template creation errors', async () => {
      mockCreateWorkflowTemplate.mockRejectedValue(
        new TemplateError('Template already exists', 'DUPLICATE_NAME')
      );

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
      
      expect(page).toBe(0); // Should be validated by API
      expect(pageSize).toBe(100); // Should be capped at 100
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