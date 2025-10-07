// src/test/app/utils/workflow-format-adapter.test.ts
/**
 * Tests for workflow format adapter utilities
 * 
 * IMPORTANT: Legacy format conversion functions have been removed.
 * Only nested array format is supported now.
 * See: ai-implementation-summaries/workflow-template-architecture-complete.md
 */
import { describe, it, expect } from '@jest/globals';
import {
  isValidNestedFormat,
  ensureNestedArrayFormat,
  validateWorkflowStructure
} from '@/app/utils/workflow-format-adapter';
import { WorkflowStep, WorkflowJSON } from '@/app/types/workflow';

describe('workflow-format-adapter', () => {
  describe('isValidNestedFormat', () => {
    it('should return true for valid nested array format', () => {
      const validWorkflow = {
        steps: [
          { id: "start", name: "Start", type: "trigger" },
          { id: "check", name: "Check", type: "condition" }
        ]
      };
      
      expect(isValidNestedFormat(validWorkflow)).toBe(true);
    });

    it('should return false for object-keyed format', () => {
      const objectFormat = {
        steps: {
          "1": { name: "Start", type: "trigger" },
          "1.1": { name: "Check", type: "condition" }
        }
      };
      
      expect(isValidNestedFormat(objectFormat)).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isValidNestedFormat(null)).toBe(false);
      expect(isValidNestedFormat(undefined)).toBe(false);
      expect(isValidNestedFormat({})).toBe(false);
      expect(isValidNestedFormat({ steps: "invalid" })).toBe(false);
    });

    it('should return true for empty array', () => {
      const emptyWorkflow = { steps: [] };
      expect(isValidNestedFormat(emptyWorkflow)).toBe(true);
    });
  });

  describe('ensureNestedArrayFormat', () => {
    it('should return steps array for valid workflow', () => {
      const workflow: WorkflowJSON = {
        steps: [
          { 
            id: "start", 
            name: "Start: On MRF Submission", 
            type: "trigger",
            action: "onMRFSubmit",
            params: {}
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      const result = ensureNestedArrayFormat(workflow);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("start");
      expect(result[0].name).toBe("Start: On MRF Submission");
    });

    it('should return empty array for invalid workflow structure', () => {
      const invalidWorkflow = {
        steps: { "1": { name: "Bad" } }
      } as unknown as WorkflowJSON;
      
      const result = ensureNestedArrayFormat(invalidWorkflow);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for invalid input', () => {
      const invalidWorkflow = {} as unknown as WorkflowJSON;
      const result = ensureNestedArrayFormat(invalidWorkflow);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle nested children correctly', () => {
      const workflow: WorkflowJSON = {
        steps: [
          {
            id: "start",
            name: "Start",
            type: "trigger",
            action: "onMRFSubmit",
            params: {},
            children: [
              {
                id: "check",
                name: "Check",
                type: "condition",
                params: {}
              }
            ]
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      const result = ensureNestedArrayFormat(workflow);
      
      expect(result).toHaveLength(1);
      expect(result[0].children).toBeDefined();
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe("check");
    });
  });

  describe('validateWorkflowStructure', () => {
    it('should validate correct workflow structure', () => {
      const validWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "startWorkflow",
            name: "Start: On MRF Submission",
            type: "trigger",
            action: "onMRFSubmit",
            params: {}
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(validWorkflow)).toBe(true);
    });

    it('should reject workflow with non-array steps', () => {
      const invalidWorkflow = {
        steps: { "1": { name: "Bad" } },
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      } as unknown as WorkflowJSON;
      
      expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
    });

    it('should reject step with missing id', () => {
      const invalidWorkflow: WorkflowJSON = {
        steps: [
          {
            name: "Missing ID",
            type: "trigger",
            action: "onMRFSubmit",
            params: {}
          } as WorkflowStep
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
    });

    it('should reject step with missing name', () => {
      const invalidWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "test",
            type: "trigger",
            action: "onMRFSubmit",
            params: {}
          } as WorkflowStep
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
    });

    it('should reject step with missing type', () => {
      const invalidWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "test",
            name: "Test Step",
            action: "onMRFSubmit",
            params: {}
          } as WorkflowStep
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
    });

    it('should reject step with invalid ID format (not camelCase)', () => {
      const invalidWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "Invalid-ID-123",
            name: "Test Step",
            type: "trigger",
            action: "onMRFSubmit",
            params: {}
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
    });

    it('should accept step with proper camelCase ID', () => {
      const validWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "startWorkflowOnMRF",
            name: "Start: On MRF Submission",
            type: "trigger",
            action: "onMRFSubmit",
            params: {}
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(validWorkflow)).toBe(true);
    });

    it('should validate nested children', () => {
      const validWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "start",
            name: "Start",
            type: "trigger",
            action: "onMRFSubmit",
            params: {},
            children: [
              {
                id: "check",
                name: "Check",
                type: "condition",
                params: {}
              }
            ]
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(validWorkflow)).toBe(true);
    });

    it('should reject if children is not an array', () => {
      const invalidWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "start",
            name: "Start",
            type: "trigger",
            action: "onMRFSubmit",
            params: {},
            children: { "bad": "format" } as unknown as WorkflowStep[]
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
    });

    it('should reject if child step is invalid', () => {
      const invalidWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "start",
            name: "Start",
            type: "trigger",
            action: "onMRFSubmit",
            params: {},
            children: [
              {
                id: "Invalid-ID",
                name: "Bad Child",
                type: "condition",
                params: {}
              }
            ]
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
    });

    it('should validate inline onSuccess branch', () => {
      const validWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "check",
            name: "Check",
            type: "condition",
            params: {},
            onSuccess: {
              id: "success",
              name: "Success",
              type: "action",
              action: "doSomething",
              params: {}
            }
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(validWorkflow)).toBe(true);
    });

    it('should reject invalid inline onSuccess branch', () => {
      const invalidWorkflow: WorkflowJSON = {
        steps: [
          {
            id: "check",
            name: "Check",
            type: "condition",
            params: {},
            onSuccess: {
              id: "Bad-ID",
              name: "Success",
              type: "action",
              action: "doSomething",
              params: {}
            }
          }
        ],
        schemaVersion: "1.0.0",
        metadata: {
          id: "test123",
          name: "Test Workflow",
          status: "draft",
          version: "1.0.0",
          tags: []
        }
      };
      
      expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
    });
  });
});
