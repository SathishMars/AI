// src/test/app/hooks/useWorkflowValidation.test.ts
/**
 * Tests for useWorkflowValidation hook
 * 
 * Phase 4: Frontend Integration
 * Tests real-time validation with debouncing, error grouping, and state management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflowValidation } from '@/app/hooks/useWorkflowValidation';
import { WorkflowStep } from '@/app/types/workflow';

describe('useWorkflowValidation Hook', () => {
  // Valid workflow for testing
  const validWorkflow: WorkflowStep[] = [
    {
      id: 'startStep',
      name: 'Start: Begin Workflow',
      type: 'trigger',
      action: 'onMRFSubmit',
      params: {},
      children: [
        {
          id: 'checkBudget',
          name: 'Check: Budget Approval',
          type: 'condition',
          condition: {
            all: [
              { fact: 'budget', operator: 'greaterThan', value: 1000 }
            ]
          },
          onSuccess: {
            id: 'approveEvent',
            name: 'Action: Approve Event',
            type: 'action',
            action: 'approveEvent',
            params: {}
          },
          onFailure: {
            id: 'rejectEvent',
            name: 'Action: Reject Event',
            type: 'action',
            action: 'rejectEvent',
            params: {}
          }
        }
      ]
    }
  ];

  // Invalid workflow - duplicate IDs
  const invalidWorkflowDuplicateIds: WorkflowStep[] = [
    {
      id: 'startStep',
      name: 'Start: Begin Workflow',
      type: 'trigger',
      action: 'onMRFSubmit',
      params: {},
      children: [
        {
          id: 'duplicateId',
          name: 'Check: First Step',
          type: 'condition',
          condition: { all: [] },
          onSuccess: {
            id: 'duplicateId', // DUPLICATE ID
            name: 'Action: Second Step',
            type: 'action',
            action: 'doSomething',
            params: {}
          }
        }
      ]
    }
  ];

  // Invalid workflow - invalid step ID format (not camelCase)
  const invalidWorkflowBadIdFormat: WorkflowStep[] = [
    {
      id: 'Invalid_Step_Name', // Invalid format (underscores)
      name: 'Start: Begin Workflow',
      type: 'trigger',
      action: 'onMRFSubmit',
      params: {}
    }
  ];

  // Invalid workflow - broken reference
  const invalidWorkflowBrokenRef: WorkflowStep[] = [
    {
      id: 'startStep',
      name: 'Start: Begin Workflow',
      type: 'trigger',
      action: 'onMRFSubmit',
      params: {},
      children: [
        {
          id: 'checkBudget',
          name: 'Check: Budget',
          type: 'condition',
          condition: { all: [] },
          onSuccessGoTo: 'nonExistentStep' // BROKEN REFERENCE
        }
      ]
    }
  ];

  // Invalid workflow - circular reference
  const invalidWorkflowCircular: WorkflowStep[] = [
    {
      id: 'stepA',
      name: 'Start: Step A',
      type: 'trigger',
      action: 'onMRFSubmit',
      params: {},
      children: [
        {
          id: 'stepB',
          name: 'Action: Step B',
          type: 'action',
          action: 'doSomething',
          params: {},
          onSuccessGoTo: 'stepC'
        },
        {
          id: 'stepC',
          name: 'Action: Step C',
          type: 'action',
          action: 'doSomething',
          params: {},
          onSuccessGoTo: 'stepB' // Creates circular reference B -> C -> B
        }
      ]
    }
  ];

  describe('Basic Validation', () => {
    it('should initialize with valid state', () => {
      const { result } = renderHook(() => useWorkflowValidation());

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
      expect(result.current.warnings).toEqual([]);
      expect(result.current.errorsByStep.size).toBe(0);
    });

    it('should validate a valid workflow successfully', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(validWorkflow);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      }, { timeout: 500 });

      expect(result.current.errors).toEqual([]);
    });

    it('should detect duplicate step IDs', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowDuplicateIds);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errorsByType.stepIds.length).toBeGreaterThan(0);
    });

    it('should detect invalid step ID format', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowBadIdFormat);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      expect(result.current.errors.length).toBeGreaterThan(0);
      
      // Should have step ID error
      const hasStepIdError = result.current.errors.some(
        e => e.conversationalExplanation.toLowerCase().includes('camelcase') ||
             e.conversationalExplanation.toLowerCase().includes('format')
      );
      expect(hasStepIdError).toBe(true);
    });

    it('should detect broken references', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowBrokenRef);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errorsByType.references.length).toBeGreaterThan(0);
    });

    it('should detect circular references', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowCircular);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errorsByType.circular.length).toBeGreaterThan(0);
    });
  });

  describe('Error Grouping', () => {
    it('should group errors by step', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowDuplicateIds);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      expect(result.current.errorsByStep.size).toBeGreaterThan(0);
    });

    it('should group errors by type', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowDuplicateIds);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      const errorsByType = result.current.errorsByType;
      expect(errorsByType).toHaveProperty('stepIds');
      expect(errorsByType).toHaveProperty('references');
      expect(errorsByType).toHaveProperty('structure');
      expect(errorsByType).toHaveProperty('circular');
    });
  });

  describe('Helper Functions', () => {
    it('should get errors for a specific step', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowBrokenRef);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      const stepErrors = result.current.getStepErrors('checkBudget');
      expect(Array.isArray(stepErrors)).toBe(true);
    });

    it('should check if a step has errors', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowBrokenRef);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      const hasErrors = result.current.hasStepErrors('checkBudget');
      expect(typeof hasErrors).toBe('boolean');
    });

    it('should get error messages as strings', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowDuplicateIds);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      const errorMessages = result.current.getErrorMessages();
      expect(Array.isArray(errorMessages)).toBe(true);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(typeof errorMessages[0]).toBe('string');
    });

    it('should get user-friendly error explanations', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(invalidWorkflowDuplicateIds);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      const userFriendlyErrors = result.current.getUserFriendlyErrors();
      expect(Array.isArray(userFriendlyErrors)).toBe(true);
      expect(userFriendlyErrors.length).toBeGreaterThan(0);
      expect(typeof userFriendlyErrors[0]).toBe('string');
    });
  });

  describe('Clear Validation', () => {
    it('should clear validation errors', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      // First validate with errors
      act(() => {
        result.current.validate(invalidWorkflowDuplicateIds);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });

      // Then clear
      act(() => {
        result.current.clearValidation();
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
      expect(result.current.warnings).toEqual([]);
      expect(result.current.errorsByStep.size).toBe(0);
    });
  });

  describe('Debouncing', () => {
    it('should debounce validation calls', async () => {
      const onValidationComplete = jest.fn();
      const { result } = renderHook(() => 
        useWorkflowValidation({ 
          debounceMs: 200,
          onValidationComplete
        })
      );

      // Make multiple rapid calls
      act(() => {
        result.current.validate(validWorkflow);
        result.current.validate(validWorkflow);
        result.current.validate(validWorkflow);
      });

      // Callback should only be called once after debounce
      await waitFor(() => {
        expect(onValidationComplete).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });

    it('should respect custom debounce time', async () => {
      const onValidationComplete = jest.fn();
      const { result } = renderHook(() => 
        useWorkflowValidation({ 
          debounceMs: 100,
          onValidationComplete
        })
      );

      act(() => {
        result.current.validate(validWorkflow);
      });

      // Callback should not be called immediately
      expect(onValidationComplete).not.toHaveBeenCalled();

      // Wait for debounce to complete
      await waitFor(() => {
        expect(onValidationComplete).toHaveBeenCalled();
      }, { timeout: 300 });
    });
  });

  describe('Validation Callback', () => {
    it('should call onValidationComplete callback', async () => {
      const onValidationComplete = jest.fn();
      const { result } = renderHook(() => 
        useWorkflowValidation({ 
          debounceMs: 100,
          onValidationComplete
        })
      );

      act(() => {
        result.current.validate(validWorkflow);
      });

      await waitFor(() => {
        expect(onValidationComplete).toHaveBeenCalled();
      }, { timeout: 500 });

      const callArg = onValidationComplete.mock.calls[0][0];
      expect(callArg).toHaveProperty('isValid');
      expect(callArg).toHaveProperty('errors');
      expect(callArg).toHaveProperty('warnings');
    });
  });

  describe('Auto-validation Option', () => {
    it('should respect autoValidate option', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ 
          autoValidate: false,
          debounceMs: 100
        })
      );

      act(() => {
        result.current.validate(validWorkflow);
      });

      // With autoValidate false, validation should still work when called manually
      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      }, { timeout: 500 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty workflow array', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate([]);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      }, { timeout: 500 });
    });

    it('should handle workflow with no errors but warnings', async () => {
      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(validWorkflow);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      }, { timeout: 500 });

      // Valid workflow should have no warnings either
      expect(result.current.warnings).toEqual([]);
    });

    it('should handle step with no ID', async () => {
      const workflowNoId: WorkflowStep[] = [
        {
          id: '', // Empty ID
          name: 'Start: Begin Workflow',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        }
      ];

      const { result } = renderHook(() => 
        useWorkflowValidation({ debounceMs: 100 })
      );

      act(() => {
        result.current.validate(workflowNoId);
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      }, { timeout: 500 });
    });
  });
});
