// src/test/validators/workflow.test.ts
import '@testing-library/jest-dom';
import { validateWorkflow, detectCircularDependencies } from '@/app/validators/workflow';
import { functionsLibraryManager } from '@/app/utils/functions-library';
import { WorkflowJSON } from '@/app/types/workflow';

describe('Workflow Validation', () => {
  const validWorkflow: WorkflowJSON = {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'A test workflow',
      version: '1.0.0',
      status: 'draft',
      tags: []
    },
    steps: {
      start: {
        name: 'Start',
        type: 'trigger',
        action: 'onMRFSubmit',
        params: { mrfID: 'test' },
        nextSteps: ['end']
      },
      end: {
        name: 'End',
        type: 'end',
        result: 'success'
      }
    }
  };

  describe('validateWorkflow', () => {
    it('should validate a valid workflow', async () => {
      const result = await validateWorkflow(validWorkflow, functionsLibraryManager.getLibrary());
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate function references', async () => {
      const workflowWithValidFunction: WorkflowJSON = {
        ...validWorkflow,
        steps: {
          ...validWorkflow.steps,
          approval: {
            name: 'Request Approval',
            type: 'action',
            action: 'functions.requestApproval',
            params: { to: 'manager@example.com' },
            nextSteps: ['end']
          }
        }
      };

      const result = await validateWorkflow(workflowWithValidFunction, functionsLibraryManager.getLibrary());
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid function references', async () => {
      const workflowWithInvalidFunction: WorkflowJSON = {
        ...validWorkflow,
        steps: {
          ...validWorkflow.steps,
          invalid: {
            name: 'Invalid Function',
            type: 'action',
            action: 'functions.nonExistentFunction',
            params: {},
            nextSteps: ['end']
          }
        }
      };

      const result = await validateWorkflow(workflowWithInvalidFunction, functionsLibraryManager.getLibrary());
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.technicalMessage.includes('Function not found: nonExistentFunction'))).toBe(true);
    });

    it('should detect missing required parameters', async () => {
      const workflowWithMissingParams: WorkflowJSON = {
        ...validWorkflow,
        steps: {
          ...validWorkflow.steps,
          approval: {
            name: 'Request Approval',
            type: 'action',
            action: 'functions.requestApproval',
            params: {}, // Missing required 'to' parameter
            nextSteps: ['end']
          }
        }
      };

      const result = await validateWorkflow(workflowWithMissingParams, functionsLibraryManager.getLibrary());
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.technicalMessage.includes('Missing required parameter: to'))).toBe(true);
    });

    it('should detect invalid schema version', async () => {
      const workflowWithInvalidVersion: WorkflowJSON = {
        ...validWorkflow,
        schemaVersion: '0.5.0' // Invalid version
      };

      const result = await validateWorkflow(workflowWithInvalidVersion, functionsLibraryManager.getLibrary());
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.technicalMessage.includes('Unsupported schema version'))).toBe(true);
    });

    it('should handle malformed workflow data', async () => {
      const malformedWorkflow = {
        // Missing required fields
        invalidField: 'test'
      };

      const result = await validateWorkflow(malformedWorkflow, functionsLibraryManager.getLibrary());
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect circular dependencies', () => {
      const circularWorkflow: WorkflowJSON = {
        ...validWorkflow,
        steps: {
          step1: {
            name: 'Step 1',
            type: 'action',
            action: 'functions.requestApproval',
            params: { to: 'test@example.com' },
            nextSteps: ['step2']
          },
          step2: {
            name: 'Step 2',
            type: 'action',
            action: 'functions.createAnEvent',
            params: {},
            nextSteps: ['step1'] // Circular reference
          }
        }
      };

      const errors = detectCircularDependencies(circularWorkflow);
      expect(errors).toHaveLength(1);
      expect(errors[0].technicalMessage).toContain('Circular dependency detected');
    });

    it('should not detect false positives for valid workflows', () => {
      const validComplexWorkflow: WorkflowJSON = {
        ...validWorkflow,
        steps: {
          start: {
            name: 'Start',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: { mrfID: 'test' },
            nextSteps: ['approval']
          },
          approval: {
            name: 'Approval',
            type: 'action',
            action: 'functions.requestApproval',
            params: { to: 'manager@example.com' },
            onSuccess: 'createEvent',
            onFailure: 'end'
          },
          createEvent: {
            name: 'Create Event',
            type: 'action',
            action: 'functions.createAnEvent',
            params: {},
            nextSteps: ['end']
          },
          end: {
            name: 'End',
            type: 'end',
            result: 'success'
          }
        }
      };

      const errors = detectCircularDependencies(validComplexWorkflow);
      expect(errors).toHaveLength(0);
    });
  });
});