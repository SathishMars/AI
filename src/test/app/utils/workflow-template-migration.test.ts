// src/test/app/utils/workflow-template-migration.test.ts
/**
 * Unit tests for workflow template migration utilities
 */

import {
  workflowJSONToDefinition,
  workflowJSONToTemplate,
  templateToWorkflowJSON,
  createInputToTemplate,
  extractTemplateName,
  validateTemplateName,
  isLegacyWorkflowJSON,
  isWorkflowTemplate,
  normalizeToTemplate,
  normalizeToWorkflowJSON
} from '@/app/utils/workflow-template-migration';
import { WorkflowJSON, WorkflowStep } from '@/app/types/workflow';
import { WorkflowTemplate, CreateWorkflowTemplateInput } from '@/app/types/workflow-template-v2';

describe('workflow-template-migration', () => {
  // Sample data
  const sampleSteps: WorkflowStep[] = [
    {
      id: 'startTrigger',
      name: 'Start: On Request',
      type: 'trigger',
      action: 'onRequest',
      params: { requestType: 'all' }
    },
    {
      id: 'checkBudget',
      name: 'Check: Budget Limit',
      type: 'condition',
      condition: {
        all: [{ fact: 'amount', operator: 'greaterThan', value: 1000 }]
      },
      onSuccessGoTo: 'requestApproval',
      onFailureGoTo: 'autoApprove'
    }
  ];

  const sampleWorkflowJSON: WorkflowJSON = {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'legacy123',
      name: 'Test Workflow',
      description: 'Test description',
      version: '1.0.0',
      status: 'draft',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      createdBy: 'test-user',
      tags: ['test', 'sample']
    },
    steps: sampleSteps,
    mermaidDiagram: 'graph TD; A-->B;'
  };

  describe('workflowJSONToDefinition', () => {
    it('should extract steps from WorkflowJSON', () => {
      const definition = workflowJSONToDefinition(sampleWorkflowJSON);
      
      expect(definition.steps).toEqual(sampleSteps);
      expect(definition.steps).toHaveLength(2);
    });

    it('should not include metadata in definition', () => {
      const definition = workflowJSONToDefinition(sampleWorkflowJSON);
      
      expect(definition).not.toHaveProperty('metadata');
      expect(definition).toHaveProperty('steps');
      expect(Object.keys(definition)).toEqual(['steps']);
    });
  });

  describe('workflowJSONToTemplate', () => {
    it('should convert WorkflowJSON to WorkflowTemplate', () => {
      const template = workflowJSONToTemplate(sampleWorkflowJSON, 'company123', 'dept456');
      
      expect(template.account).toBe('company123');
      expect(template.organization).toBe('dept456');
      expect(template.name).toBe('Test Workflow');
      expect(template.status).toBe('draft');
      expect(template.version).toBe('1.0.0');
      expect(template.workflowDefinition.steps).toEqual(sampleSteps);
    });

    it('should generate short ID', () => {
      const template = workflowJSONToTemplate(sampleWorkflowJSON, 'company123');
      
      expect(template.id).toBeDefined();
      expect(template.id).toHaveLength(10);
      expect(template.id).toMatch(/^[a-zA-Z0-9]{10}$/);
    });

    it('should handle null organization for account-wide templates', () => {
      const template = workflowJSONToTemplate(sampleWorkflowJSON, 'company123', null);
      
      expect(template.organization).toBeNull();
    });

    it('should preserve mermaid diagram', () => {
      const template = workflowJSONToTemplate(sampleWorkflowJSON, 'company123');
      
      expect(template.mermaidDiagram).toBe('graph TD; A-->B;');
    });

    it('should handle missing optional fields', () => {
      const minimalJSON: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'minimal',
          name: 'Minimal',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: []
      };
      
      const template = workflowJSONToTemplate(minimalJSON, 'company123');
      
      expect(template.name).toBe('Minimal');
      expect(template.workflowDefinition.steps).toEqual([]);
      expect(template.mermaidDiagram).toBeUndefined();
    });
  });

  describe('templateToWorkflowJSON', () => {
    const sampleTemplate: WorkflowTemplate = {
      account: 'company123',
      organization: 'dept456',
      id: 'a1b2c3d4e5',
      version: '2.0.0',
      name: 'Template Name',
      status: 'published',
      workflowDefinition: { steps: sampleSteps },
      mermaidDiagram: 'graph TD; A-->B;',
      metadata: {
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        publishedAt: new Date('2025-01-03'),
        author: 'author-user',
        description: 'Template description',
        category: 'approval',
        tags: ['tag1', 'tag2']
      }
    };

    it('should convert WorkflowTemplate to WorkflowJSON', () => {
      const workflowJSON = templateToWorkflowJSON(sampleTemplate);
      
      expect(workflowJSON.schemaVersion).toBe('1.0.0');
      expect(workflowJSON.metadata.name).toBe('Template Name');
      expect(workflowJSON.metadata.version).toBe('2.0.0');
      expect(workflowJSON.steps).toEqual(sampleSteps);
    });

    it('should map published status correctly', () => {
      const workflowJSON = templateToWorkflowJSON(sampleTemplate);
      
      expect(workflowJSON.metadata.status).toBe('published');
    });

    it('should map draft status correctly', () => {
      const draftTemplate = { ...sampleTemplate, status: 'draft' as const };
      const workflowJSON = templateToWorkflowJSON(draftTemplate);
      
      expect(workflowJSON.metadata.status).toBe('draft');
    });

    it('should preserve mermaid diagram', () => {
      const workflowJSON = templateToWorkflowJSON(sampleTemplate);
      
      expect(workflowJSON.mermaidDiagram).toBe('graph TD; A-->B;');
    });
  });

  describe('createInputToTemplate', () => {
    const createInput: CreateWorkflowTemplateInput = {
      account: 'company123',
      organization: 'dept456',
      name: 'New Template',
      workflowDefinition: { steps: sampleSteps },
      description: 'New template description',
      category: 'approval',
      tags: ['new', 'test'],
      author: 'creator-user'
    };

    it('should create template from input', () => {
      const template = createInputToTemplate(createInput);
      
      expect(template.account).toBe('company123');
      expect(template.organization).toBe('dept456');
      expect(template.name).toBe('New Template');
      expect(template.status).toBe('draft');
      expect(template.version).toBe('1.0.0');
      expect(template.workflowDefinition.steps).toEqual(sampleSteps);
    });

    it('should generate short ID', () => {
      const template = createInputToTemplate(createInput);
      
      expect(template.id).toBeDefined();
      expect(template.id).toHaveLength(10);
    });

    it('should set initial status to draft', () => {
      const template = createInputToTemplate(createInput);
      
      expect(template.status).toBe('draft');
    });

    it('should set initial version to 1.0.0', () => {
      const template = createInputToTemplate(createInput);
      
      expect(template.version).toBe('1.0.0');
    });

    it('should set timestamps', () => {
      const before = new Date();
      const template = createInputToTemplate(createInput);
      const after = new Date();
      
      expect(template.metadata.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(template.metadata.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(template.metadata.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(template.metadata.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should handle null organization', () => {
      const inputWithNullOrg = { ...createInput, organization: null };
      const template = createInputToTemplate(inputWithNullOrg);
      
      expect(template.organization).toBeNull();
    });
  });

  describe('extractTemplateName', () => {
    it('should extract name from direct name field', () => {
      const data = { name: 'Direct Name', metadata: { name: 'Metadata Name' } };
      expect(extractTemplateName(data)).toBe('Direct Name');
    });

    it('should extract name from metadata if no direct name', () => {
      const data = { metadata: { name: 'Metadata Name' } };
      expect(extractTemplateName(data)).toBe('Metadata Name');
    });

    it('should return "Untitled Workflow" if no name found', () => {
      const data = { foo: 'bar' };
      expect(extractTemplateName(data)).toBe('Untitled Workflow');
    });

    it('should return "Untitled Workflow" for null/undefined', () => {
      expect(extractTemplateName(null)).toBe('Untitled Workflow');
      expect(extractTemplateName(undefined)).toBe('Untitled Workflow');
    });
  });

  describe('validateTemplateName', () => {
    it('should accept valid names', () => {
      expect(validateTemplateName('Valid Name')).toEqual({ valid: true });
      expect(validateTemplateName('My Workflow')).toEqual({ valid: true });
      expect(validateTemplateName('Approval Flow 123')).toEqual({ valid: true });
    });

    it('should reject empty names', () => {
      const result = validateTemplateName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject whitespace-only names', () => {
      const result = validateTemplateName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject reserved words', () => {
      expect(validateTemplateName('new').valid).toBe(false);
      expect(validateTemplateName('NEW').valid).toBe(false);
      expect(validateTemplateName('create').valid).toBe(false);
      expect(validateTemplateName('CREATE').valid).toBe(false);
      expect(validateTemplateName('untitled').valid).toBe(false);
      expect(validateTemplateName('UNTITLED').valid).toBe(false);
    });
  });

  describe('isLegacyWorkflowJSON', () => {
    it('should return true for WorkflowJSON format', () => {
      expect(isLegacyWorkflowJSON(sampleWorkflowJSON)).toBe(true);
    });

    it('should return false for WorkflowTemplate format', () => {
      const template: WorkflowTemplate = {
        account: 'company123',
        organization: null,
        id: 'a1b2c3d4e5',
        version: '1.0.0',
        name: 'Test',
        status: 'draft',
        workflowDefinition: { steps: [] },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      
      expect(isLegacyWorkflowJSON(template)).toBe(false);
    });

    it('should return false for invalid data', () => {
      expect(isLegacyWorkflowJSON(null)).toBe(false);
      expect(isLegacyWorkflowJSON(undefined)).toBe(false);
      expect(isLegacyWorkflowJSON('string')).toBe(false);
      expect(isLegacyWorkflowJSON(123)).toBe(false);
      expect(isLegacyWorkflowJSON({ foo: 'bar' })).toBe(false);
    });
  });

  describe('isWorkflowTemplate', () => {
    it('should return true for WorkflowTemplate format', () => {
      const template: WorkflowTemplate = {
        account: 'company123',
        organization: null,
        id: 'a1b2c3d4e5',
        version: '1.0.0',
        name: 'Test',
        status: 'draft',
        workflowDefinition: { steps: [] },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      
      expect(isWorkflowTemplate(template)).toBe(true);
    });

    it('should return false for WorkflowJSON format', () => {
      expect(isWorkflowTemplate(sampleWorkflowJSON)).toBe(false);
    });

    it('should return false for invalid data', () => {
      expect(isWorkflowTemplate(null)).toBe(false);
      expect(isWorkflowTemplate(undefined)).toBe(false);
      expect(isWorkflowTemplate('string')).toBe(false);
      expect(isWorkflowTemplate(123)).toBe(false);
      expect(isWorkflowTemplate({ foo: 'bar' })).toBe(false);
    });
  });

  describe('normalizeToTemplate', () => {
    it('should pass through WorkflowTemplate unchanged', () => {
      const template: WorkflowTemplate = {
        account: 'company123',
        organization: null,
        id: 'a1b2c3d4e5',
        version: '1.0.0',
        name: 'Test',
        status: 'draft',
        workflowDefinition: { steps: sampleSteps },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      
      const normalized = normalizeToTemplate(template, 'company123');
      
      expect(normalized).toEqual(template);
    });

    it('should convert WorkflowJSON to WorkflowTemplate', () => {
      const normalized = normalizeToTemplate(sampleWorkflowJSON, 'company123', 'dept456');
      
      expect(normalized.account).toBe('company123');
      expect(normalized.organization).toBe('dept456');
      expect(normalized.name).toBe('Test Workflow');
      expect(normalized.workflowDefinition.steps).toEqual(sampleSteps);
    });

    it('should throw error for invalid data', () => {
      expect(() => normalizeToTemplate({}, 'company123')).toThrow();
      expect(() => normalizeToTemplate({ foo: 'bar' }, 'company123')).toThrow();
    });
  });

  describe('normalizeToWorkflowJSON', () => {
    it('should pass through WorkflowJSON unchanged', () => {
      const normalized = normalizeToWorkflowJSON(sampleWorkflowJSON);
      
      expect(normalized).toEqual(sampleWorkflowJSON);
    });

    it('should convert WorkflowTemplate to WorkflowJSON', () => {
      const template: WorkflowTemplate = {
        account: 'company123',
        organization: null,
        id: 'a1b2c3d4e5',
        version: '2.0.0',
        name: 'Test Template',
        status: 'published',
        workflowDefinition: { steps: sampleSteps },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test-user'
        }
      };
      
      const normalized = normalizeToWorkflowJSON(template);
      
      expect(normalized.metadata.name).toBe('Test Template');
      expect(normalized.metadata.version).toBe('2.0.0');
      expect(normalized.metadata.status).toBe('published');
      expect(normalized.steps).toEqual(sampleSteps);
    });

    it('should throw error for invalid data', () => {
      expect(() => normalizeToWorkflowJSON({})).toThrow();
      expect(() => normalizeToWorkflowJSON({ foo: 'bar' })).toThrow();
    });
  });
});
