// src/test/app/utils/workflow-validation.test.ts
/**
 * Unit tests for workflow validation utilities
 * 
 * Tests validation functions for nested array workflows with human-readable step IDs
 */

import {
  validateStepIds,
  validateStepReferences,
  validateWorkflowStructure,
  validateWorkflow,
  hasRealSteps,
  isValidStepName,
  validateForAutoSave,
  detectCircularReferences
} from '@/app/utils/workflow-validation';
import { WorkflowStep } from '@/app/types/workflow';

describe('workflow-validation', () => {
  describe('validateStepIds', () => {
    it('should pass validation for valid camelCase IDs', () => {
      const steps: WorkflowStep[] = [
        { id: 'startWorkflow', name: 'Start', type: 'trigger' },
        { id: 'checkBudget', name: 'Check Budget', type: 'condition' },
        { id: 'sendEmail', name: 'Send Email', type: 'action' }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(0);
    });

    it('should detect invalid ID format (not camelCase)', () => {
      const steps: WorkflowStep[] = [
        { id: 'Start-Workflow', name: 'Start', type: 'trigger' },
        { id: 'check_budget', name: 'Check', type: 'condition' },
        { id: 'Send Email', name: 'Send', type: 'action' }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(3);
      expect(errors.every(e => e.severity === 'error')).toBe(true);
      expect(errors.every(e => e.fieldPath === 'id')).toBe(true);
    });

    it('should detect ID starting with uppercase', () => {
      const steps: WorkflowStep[] = [
        { id: 'StartWorkflow', name: 'Start', type: 'trigger' }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].conversationalExplanation).toContain('camelCase');
    });

    it('should detect ID with special characters', () => {
      const steps: WorkflowStep[] = [
        { id: 'start@workflow', name: 'Start', type: 'trigger' },
        { id: 'check#budget', name: 'Check', type: 'condition' }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(2);
    });

    it('should detect ID too short (less than 3 chars)', () => {
      const steps: WorkflowStep[] = [
        { id: 'ab', name: 'Start', type: 'trigger' },
        { id: 'x', name: 'Check', type: 'condition' }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(2);
      expect(errors.every(e => e.technicalMessage.includes('too short'))).toBe(true);
    });

    it('should detect ID too long (more than 50 chars)', () => {
      const steps: WorkflowStep[] = [
        { 
          id: 'thisIsAnExtremelyLongStepIdentifierThatExceedsFiftyCharactersInLength',
          name: 'Start',
          type: 'trigger'
        }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].technicalMessage).toContain('too long');
    });

    it('should detect duplicate step IDs', () => {
      const steps: WorkflowStep[] = [
        { id: 'startWorkflow', name: 'Start 1', type: 'trigger' },
        { id: 'checkBudget', name: 'Check', type: 'condition' },
        { id: 'startWorkflow', name: 'Start 2', type: 'trigger' }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].stepId).toBe('startWorkflow');
      expect(errors[0].technicalMessage).toContain('Duplicate');
    });

    it('should detect duplicates in nested steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'parent',
          name: 'Parent',
          type: 'action',
          children: [
            { id: 'child', name: 'Child 1', type: 'action' },
            { id: 'child', name: 'Child 2', type: 'action' }
          ]
        }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].stepId).toBe('child');
    });

    it('should detect duplicates in conditional steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'condition',
          name: 'Condition',
          type: 'condition',
          onSuccess: { id: 'action', name: 'Action 1', type: 'action' },
          onFailure: { id: 'action', name: 'Action 2', type: 'action' }
        }
      ];

      const errors = validateStepIds(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].stepId).toBe('action');
    });

    it('should validate empty workflow', () => {
      const errors = validateStepIds([]);
      
      expect(errors.length).toBe(0);
    });
  });

  describe('validateStepReferences', () => {
    it('should pass validation when all references exist', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action', onSuccessGoTo: 'step2' },
        { id: 'step2', name: 'Step 2', type: 'action', onSuccessGoTo: 'step3' },
        { id: 'step3', name: 'Step 3', type: 'end' }
      ];

      const errors = validateStepReferences(steps);
      
      expect(errors.length).toBe(0);
    });

    it('should detect invalid onSuccessGoTo reference', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action', onSuccessGoTo: 'nonExistent' },
        { id: 'step2', name: 'Step 2', type: 'end' }
      ];

      const errors = validateStepReferences(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].fieldPath).toBe('onSuccessGoTo');
      expect(errors[0].technicalMessage).toContain('nonExistent');
    });

    it('should detect invalid onFailureGoTo reference', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'condition', onFailureGoTo: 'missing' },
        { id: 'step2', name: 'Step 2', type: 'end' }
      ];

      const errors = validateStepReferences(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].fieldPath).toBe('onFailureGoTo');
      expect(errors[0].technicalMessage).toContain('missing');
    });

    it('should detect multiple invalid references', () => {
      const steps: WorkflowStep[] = [
        { 
          id: 'step1',
          name: 'Step 1',
          type: 'condition',
          onSuccessGoTo: 'missing1',
          onFailureGoTo: 'missing2'
        },
        { id: 'step2', name: 'Step 2', type: 'end' }
      ];

      const errors = validateStepReferences(steps);
      
      expect(errors.length).toBe(2);
    });

    it('should validate references in nested steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'parent',
          name: 'Parent',
          type: 'action',
          children: [
            { id: 'child', name: 'Child', type: 'action', onSuccessGoTo: 'missing' }
          ]
        }
      ];

      const errors = validateStepReferences(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].stepId).toBe('child');
    });

    it('should allow reference to step in same workflow', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action', onSuccessGoTo: 'step3' },
        { id: 'step2', name: 'Step 2', type: 'action', onSuccessGoTo: 'step3' },
        { id: 'step3', name: 'Step 3', type: 'end' }
      ];

      const errors = validateStepReferences(steps);
      
      expect(errors.length).toBe(0);
    });

    it('should handle empty workflow', () => {
      const errors = validateStepReferences([]);
      
      expect(errors.length).toBe(0);
    });
  });

  describe('validateWorkflowStructure', () => {
    it('should pass validation for complete workflow', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'Start', type: 'trigger' },
        { id: 'action', name: 'Action', type: 'action' },
        { id: 'end', name: 'End', type: 'end' }
      ];

      const errors = validateWorkflowStructure(steps);
      
      expect(errors.length).toBe(0);
    });

    it('should error on empty workflow', () => {
      const errors = validateWorkflowStructure([]);
      
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].technicalMessage).toContain('no steps');
    });

    it('should error when no trigger step', () => {
      const steps: WorkflowStep[] = [
        { id: 'action', name: 'Action', type: 'action' },
        { id: 'end', name: 'End', type: 'end' }
      ];

      const errors = validateWorkflowStructure(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].technicalMessage).toContain('no trigger');
    });

    it('should warn when no end step', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'Start', type: 'trigger' },
        { id: 'action', name: 'Action', type: 'action' }
      ];

      const errors = validateWorkflowStructure(steps);
      
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('warning');
      expect(errors[0].technicalMessage).toContain('no explicit end');
    });

    it('should allow multiple trigger steps', () => {
      const steps: WorkflowStep[] = [
        { id: 'start1', name: 'Start 1', type: 'trigger' },
        { id: 'start2', name: 'Start 2', type: 'trigger' },
        { id: 'end', name: 'End', type: 'end' }
      ];

      const errors = validateWorkflowStructure(steps);
      
      expect(errors.length).toBe(0);
    });

    it('should count nested trigger steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'parent',
          name: 'Parent',
          type: 'action',
          children: [
            { id: 'start', name: 'Start', type: 'trigger' }
          ]
        }
      ];

      const errors = validateWorkflowStructure(steps);
      
      // Should have trigger but no end (warning only)
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('warning');
    });
  });

  describe('validateWorkflow', () => {
    it('should run all validations and combine errors', () => {
      const steps: WorkflowStep[] = [
        { id: 'Invalid-ID', name: 'Start', type: 'trigger' },
        { id: 'valid', name: 'Action', type: 'action', onSuccessGoTo: 'missing' }
      ];

      const errors = validateWorkflow(steps);
      
      // Should have errors from both ID validation and reference validation
      expect(errors.length).toBeGreaterThan(1);
    });

    it('should return no errors for valid workflow', () => {
      const steps: WorkflowStep[] = [
        { id: 'startTrigger', name: 'Start', type: 'trigger' },
        { id: 'processAction', name: 'Process', type: 'action' },
        { id: 'workflowEnd', name: 'End', type: 'end' }
      ];

      const errors = validateWorkflow(steps);
      
      // May have warning about end step, but no errors
      const criticalErrors = errors.filter(e => e.severity === 'error');
      expect(criticalErrors.length).toBe(0);
    });

    it('should handle complex nested workflow', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'start',
          name: 'Start',
          type: 'trigger',
          children: [
            {
              id: 'condition',
              name: 'Check',
              type: 'condition',
              onSuccess: { id: 'approve', name: 'Approve', type: 'action' },
              onFailure: { id: 'reject', name: 'Reject', type: 'action' }
            }
          ]
        },
        { id: 'end', name: 'End', type: 'end' }
      ];

      const errors = validateWorkflow(steps);
      
      const criticalErrors = errors.filter(e => e.severity === 'error');
      expect(criticalErrors.length).toBe(0);
    });
  });

  describe('hasRealSteps', () => {
    it('should return true when workflow has action steps', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'Start', type: 'trigger' },
        { id: 'action', name: 'Action', type: 'action' },
        { id: 'end', name: 'End', type: 'end' }
      ];

      expect(hasRealSteps(steps)).toBe(true);
    });

    it('should return true when workflow has condition steps', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'Start', type: 'trigger' },
        { id: 'check', name: 'Check', type: 'condition' },
        { id: 'end', name: 'End', type: 'end' }
      ];

      expect(hasRealSteps(steps)).toBe(true);
    });

    it('should return false when only trigger and end', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'Start', type: 'trigger' },
        { id: 'end', name: 'End', type: 'end' }
      ];

      expect(hasRealSteps(steps)).toBe(false);
    });

    it('should return false for empty workflow', () => {
      expect(hasRealSteps([])).toBe(false);
    });

    it('should return true when real steps are nested', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'start',
          name: 'Start',
          type: 'trigger',
          children: [
            { id: 'action', name: 'Action', type: 'action' }
          ]
        }
      ];

      expect(hasRealSteps(steps)).toBe(true);
    });

    it('should return true for branch steps', () => {
      const steps: WorkflowStep[] = [
        { id: 'branch', name: 'Branch', type: 'branch' }
      ];

      expect(hasRealSteps(steps)).toBe(true);
    });

    it('should return true for merge steps', () => {
      const steps: WorkflowStep[] = [
        { id: 'merge', name: 'Merge', type: 'merge' }
      ];

      expect(hasRealSteps(steps)).toBe(true);
    });
  });

  describe('isValidStepName', () => {
    it('should accept valid step names', () => {
      expect(isValidStepName('Check Budget')).toBe(true);
      expect(isValidStepName('Send Approval Email')).toBe(true);
      expect(isValidStepName('Process Request')).toBe(true);
    });

    it('should reject placeholder names', () => {
      expect(isValidStepName('new')).toBe(false);
      expect(isValidStepName('New')).toBe(false);
      expect(isValidStepName('NEW')).toBe(false);
      expect(isValidStepName('create')).toBe(false);
      expect(isValidStepName('untitled')).toBe(false);
      expect(isValidStepName('step')).toBe(false);
      expect(isValidStepName('action')).toBe(false);
      expect(isValidStepName('condition')).toBe(false);
    });

    it('should reject empty names', () => {
      expect(isValidStepName('')).toBe(false);
      expect(isValidStepName('   ')).toBe(false);
    });

    it('should be case-insensitive for placeholders', () => {
      expect(isValidStepName('NEW')).toBe(false);
      expect(isValidStepName('Create')).toBe(false);
      expect(isValidStepName('UNTITLED')).toBe(false);
    });
  });

  describe('validateForAutoSave', () => {
    it('should allow auto-save for complete workflow', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'Start Workflow', type: 'trigger' },
        { id: 'action', name: 'Process Data', type: 'action' },
        { id: 'end', name: 'Complete', type: 'end' }
      ];

      const result = validateForAutoSave(steps);
      
      expect(result.shouldSave).toBe(true);
      expect(result.reasons.length).toBe(0);
    });

    it('should reject workflow with no real steps', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'Start', type: 'trigger' },
        { id: 'end', name: 'End', type: 'end' }
      ];

      const result = validateForAutoSave(steps);
      
      expect(result.shouldSave).toBe(false);
      expect(result.reasons).toContain('Workflow has no real steps (only trigger/end steps)');
    });

    it('should reject workflow with placeholder names', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'new', type: 'trigger' },
        { id: 'action', name: 'action', type: 'action' }
      ];

      const result = validateForAutoSave(steps);
      
      expect(result.shouldSave).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('placeholder'))).toBe(true);
    });

    it('should collect all reasons for rejection', () => {
      const steps: WorkflowStep[] = [
        { id: 'start', name: 'new', type: 'trigger' },
        { id: 'end', name: 'untitled', type: 'end' }
      ];

      const result = validateForAutoSave(steps);
      
      expect(result.shouldSave).toBe(false);
      expect(result.reasons.length).toBe(3); // No real steps + 2 placeholder names
    });

    it('should handle empty workflow', () => {
      const result = validateForAutoSave([]);
      
      expect(result.shouldSave).toBe(false);
    });
  });

  describe('detectCircularReferences', () => {
    it('should detect simple circular reference', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action', onSuccessGoTo: 'step2' },
        { id: 'step2', name: 'Step 2', type: 'action', onSuccessGoTo: 'step1' }
      ];

      const errors = detectCircularReferences(steps);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].technicalMessage).toContain('Circular reference');
    });

    it('should detect complex circular reference', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action', onSuccessGoTo: 'step2' },
        { id: 'step2', name: 'Step 2', type: 'action', onSuccessGoTo: 'step3' },
        { id: 'step3', name: 'Step 3', type: 'action', onSuccessGoTo: 'step1' }
      ];

      const errors = detectCircularReferences(steps);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].conversationalExplanation).toContain('loop');
    });

    it('should detect self-reference', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action', onSuccessGoTo: 'step1' }
      ];

      const errors = detectCircularReferences(steps);
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should not flag valid linear workflow', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action', onSuccessGoTo: 'step2' },
        { id: 'step2', name: 'Step 2', type: 'action', onSuccessGoTo: 'step3' },
        { id: 'step3', name: 'Step 3', type: 'end' }
      ];

      const errors = detectCircularReferences(steps);
      
      expect(errors.length).toBe(0);
    });

    it('should not flag branching workflow', () => {
      const steps: WorkflowStep[] = [
        { 
          id: 'step1',
          name: 'Step 1',
          type: 'condition',
          onSuccessGoTo: 'step2',
          onFailureGoTo: 'step3'
        },
        { id: 'step2', name: 'Step 2', type: 'action', onSuccessGoTo: 'step4' },
        { id: 'step3', name: 'Step 3', type: 'action', onSuccessGoTo: 'step4' },
        { id: 'step4', name: 'Step 4', type: 'end' }
      ];

      const errors = detectCircularReferences(steps);
      
      expect(errors.length).toBe(0);
    });

    it('should handle workflow with no references', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action' },
        { id: 'step2', name: 'Step 2', type: 'action' }
      ];

      const errors = detectCircularReferences(steps);
      
      expect(errors.length).toBe(0);
    });

    it('should handle empty workflow', () => {
      const errors = detectCircularReferences([]);
      
      expect(errors.length).toBe(0);
    });

    it('should detect circular reference with invalid references', () => {
      // This tests the edge case where a circular ref exists among valid refs
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', type: 'action', onSuccessGoTo: 'step2' },
        { id: 'step2', name: 'Step 2', type: 'action', onSuccessGoTo: 'step1' },
        { id: 'step3', name: 'Step 3', type: 'action', onSuccessGoTo: 'missing' }
      ];

      const errors = detectCircularReferences(steps);
      
      // Should detect the circular reference between step1 and step2
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
