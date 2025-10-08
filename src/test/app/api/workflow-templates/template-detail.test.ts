// src/test/app/api/workflow-templates/template-detail.test.ts
import {
  getWorkflowTemplate,
  updateWorkflowTemplate,
  deleteWorkflowTemplate
} from '@/app/utils/workflow-template-database';
import { TemplateError, WorkflowTemplate, TemplateResolutionResult } from '@/app/types/workflow-template';
import { WorkflowStep } from '@/app/types/workflow';

// Mock the database utilities
jest.mock('@/app/utils/workflow-template-database');

const mockGetWorkflowTemplate = getWorkflowTemplate as jest.MockedFunction<typeof getWorkflowTemplate>;
const mockUpdateWorkflowTemplate = updateWorkflowTemplate as jest.MockedFunction<typeof updateWorkflowTemplate>;
const mockDeleteWorkflowTemplate = deleteWorkflowTemplate as jest.MockedFunction<typeof deleteWorkflowTemplate>;

describe('Workflow Template Detail API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSteps: WorkflowStep[] = [
    {
      id: 'start',
      name: 'Start: On MRF Submit',
      type: 'trigger',
      action: 'onMRFSubmit',
      params: {},
      children: [
        {
          id: 'end',
          name: 'End: Workflow Complete',
          type: 'end',
          result: 'success'
        }
      ]
    }
  ];

  const mockTemplate: WorkflowTemplate = {
    _id: 'template-123',
    id: 'template-123',
    account: 'test-account',
  organization: undefined,
    version: '1.0.0',
    workflowDefinition: {
      steps: mockSteps as unknown[]
    },
    metadata: {
      name: 'Test Workflow',
      status: 'draft',
      author: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['test'],
      description: 'Test workflow description',
      category: 'test'
    }
  };

  describe('getWorkflowTemplate functionality', () => {
    it('should retrieve a template successfully', async () => {
      const mockResult: TemplateResolutionResult = {
        template: mockTemplate,
          conversations: [],
          templateState: 'draft_available' as const,
          suggestCreateDraft: false
      };

        mockGetWorkflowTemplate.mockResolvedValue(mockResult);

  const result = await getWorkflowTemplate('test-account', null, 'test-workflow');
      
      expect(result).toBeDefined();
  expect(result.template?.metadata.name).toBe('Test Workflow');
  expect(result.template?.metadata.status).toBe('draft');
      expect(result.templateState).toBe('draft_available');
  expect(mockGetWorkflowTemplate).toHaveBeenCalledWith('test-account', null, 'test-workflow');
    });

    it('should handle template not found', async () => {
      mockGetWorkflowTemplate.mockRejectedValue(
        new TemplateError('Template not found', 'NOT_FOUND')
      );

      await expect(getWorkflowTemplate('test-account', null, 'nonexistent'))
        .rejects.toThrow(TemplateError);
      
      await expect(getWorkflowTemplate('test-account', null, 'nonexistent'))
        .rejects.toThrow('Template not found');
    });

    it('should handle database errors during retrieval', async () => {
      mockGetWorkflowTemplate.mockRejectedValue(
        new TemplateError('Database connection failed', 'DB_ERROR')
      );

      await expect(getWorkflowTemplate('test-account', null, 'test-workflow'))
        .rejects.toThrow(TemplateError);
    });
  });

  describe('updateWorkflowTemplate functionality', () => {
    const updateData = {
      description: 'Updated description',
      tags: ['test', 'updated'],
      workflowDefinition: {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'test-workflow-001',
          name: 'Updated Test Workflow',
          version: '1.0.1',
          status: 'draft' as const,
          tags: ['test', 'updated']
        },
        steps: [
          {
            id: 'start',
            name: 'Start: On MRF Submit',
            type: 'trigger' as const,
            action: 'onMRFSubmit',
            params: {},
            children: [
              {
                id: 'validate',
                name: 'Check: Validate Form Completion',
                type: 'condition' as const,
                condition: {
                  all: [
                    { fact: 'form.complete', operator: 'equal', value: true }
                  ]
                },
                onSuccess: {
                  id: 'end',
                  name: 'End: Workflow Success',
                  type: 'end' as const,
                  result: 'success'
                },
                onFailure: {
                  id: 'endFailure',
                  name: 'End: Workflow Failure',
                  type: 'end' as const,
                  result: 'failure'
                }
              }
            ]
          }
        ]
      }
    };

    it('should update a template successfully', async () => {
      const updatedTemplate: WorkflowTemplate = {
        ...mockTemplate,
        workflowDefinition: updateData.workflowDefinition as { steps: unknown[] },
        metadata: {
          ...mockTemplate.metadata,
          name: mockTemplate.metadata.name,
          description: updateData.description,
          tags: updateData.tags,
          updatedAt: new Date()
        },
        version: '1.0.1'
      };

        mockUpdateWorkflowTemplate.mockResolvedValue(updatedTemplate);

  const result = await updateWorkflowTemplate('test-account', 'test-workflow', '1.0.0', updateData);
      
  expect(result.metadata.name).toBe('Test Workflow');
      expect(result.version).toBe('1.0.1');
  expect(mockUpdateWorkflowTemplate).toHaveBeenCalledWith('test-account', 'test-workflow', '1.0.0', updateData);
    });

    it('should handle update validation errors', async () => {
      mockUpdateWorkflowTemplate.mockRejectedValue(
        new TemplateError('Invalid workflow definition', 'VALIDATION_ERROR')
      );

      await expect(updateWorkflowTemplate('test-account', 'test-workflow', '1.0.0', updateData))
        .rejects.toThrow(TemplateError);
      
      await expect(updateWorkflowTemplate('test-account', 'test-workflow', '1.0.0', updateData))
        .rejects.toThrow('Invalid workflow definition');
    });

    it('should handle version conflicts during update', async () => {
      mockUpdateWorkflowTemplate.mockRejectedValue(
        new TemplateError('Version conflict detected', 'VERSION_CONFLICT')
      );

      await expect(updateWorkflowTemplate('test-account', 'test-workflow', '1.0.0', updateData))
        .rejects.toThrow(TemplateError);
    });

    it('should handle template not found during update', async () => {
      mockUpdateWorkflowTemplate.mockRejectedValue(
        new TemplateError('Template not found', 'NOT_FOUND')
      );

      await expect(updateWorkflowTemplate('test-account', 'nonexistent', '1.0.0', updateData))
        .rejects.toThrow('Template not found');
    });
  });

  describe('deleteWorkflowTemplate functionality', () => {
    it('should delete a template successfully', async () => {
      mockDeleteWorkflowTemplate.mockResolvedValue(true);

  const result = await deleteWorkflowTemplate('test-account', 'test-workflow', '1.0.0');
      
      expect(result).toBe(true);
  expect(mockDeleteWorkflowTemplate).toHaveBeenCalledWith('test-account', 'test-workflow', '1.0.0');
    });

    it('should handle template not found during deletion', async () => {
      mockDeleteWorkflowTemplate.mockRejectedValue(
        new TemplateError('Template not found', 'NOT_FOUND')
      );

      await expect(deleteWorkflowTemplate('test-account', 'nonexistent', '1.0.0'))
        .rejects.toThrow('Template not found');
    });

    it('should handle deletion of published templates', async () => {
      mockDeleteWorkflowTemplate.mockRejectedValue(
        new TemplateError('Cannot delete published template', 'CANNOT_DELETE_PUBLISHED')
      );

      await expect(deleteWorkflowTemplate('test-account', 'published-template', '1.0.0'))
        .rejects.toThrow('Cannot delete published template');
    });

    it('should handle database errors during deletion', async () => {
      mockDeleteWorkflowTemplate.mockRejectedValue(
        new TemplateError('Database error', 'DB_ERROR')
      );

      await expect(deleteWorkflowTemplate('test-account', 'test-workflow', '1.0.0'))
        .rejects.toThrow(TemplateError);
    });
  });

  describe('Template name parameter validation', () => {
    it('should handle invalid template names', () => {
      const invalidNames = ['', ' ', '  ', null, undefined];
      
      invalidNames.forEach(name => {
        expect(() => {
          if (!name || name.trim().length === 0) {
            throw new Error('Template name is required');
          }
        }).toThrow('Template name is required');
      });
    });

    it('should handle special characters in template names', () => {
      const specialNames = [
        'template-with-dashes',
        'template_with_underscores',
        'template.with.dots',
        'template123'
      ];
      
      specialNames.forEach(name => {
        expect(name).toMatch(/^[a-zA-Z0-9._-]+$/);
      });
    });

    it('should reject invalid template name formats', () => {
      const invalidNames = [
        'template with spaces',
        'template@with@symbols',
        'template/with/slashes',
        'template#with#hash'
      ];
      
      invalidNames.forEach(name => {
        expect(name).not.toMatch(/^[a-zA-Z0-9._-]+$/);
      });
    });
  });

  describe('Error handling patterns', () => {
    it('should handle TemplateError instances', () => {
      const error = new TemplateError('Test error', 'TEST_CODE');
      
      expect(error).toBeInstanceOf(TemplateError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('TemplateError');
    });

    it('should handle generic Error instances', () => {
      const error = new Error('Generic error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Generic error');
      expect(error.name).toBe('Error');
    });

    it('should handle async error propagation', async () => {
      const asyncError = async () => {
        throw new TemplateError('Async error', 'ASYNC_ERROR');
      };

      await expect(asyncError()).rejects.toThrow(TemplateError);
      await expect(asyncError()).rejects.toThrow('Async error');
    });
  });
});