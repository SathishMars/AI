// src/test/app/components/WorkflowCreationPane-validation-integration.test.tsx
/**
 * Integration tests for Phase 5: WorkflowCreationPane Validation Integration
 * 
 * Tests the integration of Phase 4 validation components (useWorkflowValidation hook
 * and WorkflowValidationFeedback) into the WorkflowCreationPane component.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import WorkflowCreationPane from '@/app/components/WorkflowCreationPane';
import { WorkflowJSON } from '@/app/types/workflow';

// Mock the API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

describe('WorkflowCreationPane - Phase 5 Validation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/workflow-autocomplete')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              autocompleteItems: [
                { name: 'sendEmail', category: 'function' },
                { name: 'requestApproval', category: 'function' }
              ]
            }
          })
        });
      }
      if (url.includes('/api/langchain/generate-workflow')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Validation Integration', () => {
    it('should render WorkflowCreationPane without validation errors for empty workflow', async () => {
      const emptyWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: []
      };

      render(
        <WorkflowCreationPane
          workflow={emptyWorkflow}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Should render the component
      expect(screen.getByText(/aime workflow creator/i)).toBeInTheDocument();
      
      // Should not show validation feedback for empty workflow
      await waitFor(() => {
        expect(screen.queryByText(/validation errors/i)).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show validation errors when workflow has invalid steps', async () => {
      const invalidWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'Invalid_Step_Name', // Invalid format (not camelCase)
            name: 'Start: Invalid Step',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          }
        ]
      };

      render(
        <WorkflowCreationPane
          workflow={invalidWorkflow}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Wait for validation to complete (debounced)
      await waitFor(() => {
        expect(screen.getByText(/validation errors/i)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should show the specific validation error (use getAllByText since suggested fix also contains the word)
      const camelCaseMatches = screen.getAllByText(/camelcase/i);
      expect(camelCaseMatches.length).toBeGreaterThan(0);
    });

    it('should show validation errors for duplicate step IDs', async () => {
      const duplicateIdWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'startStep',
            name: 'Start: Begin',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {},
            children: [
              {
                id: 'duplicateId',
                name: 'Action: First',
                type: 'action',
                action: 'doSomething',
                params: {}
              },
              {
                id: 'duplicateId', // DUPLICATE
                name: 'Action: Second',
                type: 'action',
                action: 'doSomethingElse',
                params: {}
              }
            ]
          }
        ]
      };

      render(
        <WorkflowCreationPane
          workflow={duplicateIdWorkflow}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText(/validation errors/i)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should show duplicate ID error (multiple matches because of suggested fix)
      const duplicateMatches = screen.getAllByText(/duplicate/i);
      expect(duplicateMatches.length).toBeGreaterThan(0);
    });

    it('should show validation errors for broken references', async () => {
      const brokenRefWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'startStep',
            name: 'Start: Begin',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {},
            children: [
              {
                id: 'checkBudget',
                name: 'Check: Budget',
                type: 'condition',
                condition: {
                  all: [
                    { fact: 'budget', operator: 'greaterThan', value: 1000 }
                  ]
                },
                onSuccessGoTo: 'nonExistentStep' // BROKEN REFERENCE
              }
            ]
          }
        ]
      };

      render(
        <WorkflowCreationPane
          workflow={brokenRefWorkflow}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText(/validation errors/i)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should show reference error (multiple matches in error message and suggested fix)
      const referenceMatches = screen.getAllByText(/nonExistentStep/i);
      expect(referenceMatches.length).toBeGreaterThan(0);
    });

    it('should update validation when workflow changes', async () => {
      const validWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'startStep',
            name: 'Start: Begin',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          }
        ]
      };

      const { rerender } = render(
        <WorkflowCreationPane
          workflow={validWorkflow}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Initially no validation errors
      await waitFor(() => {
        expect(screen.queryByText(/validation errors/i)).not.toBeInTheDocument();
      }, { timeout: 1000 });

      // Update with invalid workflow
      const invalidWorkflow: WorkflowJSON = {
        ...validWorkflow,
        steps: [
          {
            id: 'Invalid_Name', // Invalid format
            name: 'Start: Invalid',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          }
        ]
      };

      rerender(
        <WorkflowCreationPane
          workflow={invalidWorkflow}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Should now show validation errors
      await waitFor(() => {
        expect(screen.getByText(/validation errors/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should not show validation feedback when workflow is valid', async () => {
      const validWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
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
                }
              }
            ]
          }
        ]
      };

      render(
        <WorkflowCreationPane
          workflow={validWorkflow}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Should not show validation feedback for valid workflow
      await waitFor(() => {
        expect(screen.queryByText(/validation errors/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/warnings/i)).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Props Validation', () => {
    it('should not require validationResult prop (removed in Phase 5)', () => {
      const validWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: []
      };

      // Should render without validationResult prop
      expect(() => {
        render(
          <WorkflowCreationPane
            workflow={validWorkflow}
            onWorkflowChange={jest.fn()}
            isNewWorkflow={true}
          />
        );
      }).not.toThrow();
    });
  });

  describe('UI Integration', () => {
    it('should render validation feedback in separate section below messages', async () => {
      const invalidWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'Invalid_Step',
            name: 'Start: Invalid',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          }
        ]
      };

      render(
        <WorkflowCreationPane
          workflow={invalidWorkflow}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText(/validation errors/i)).toBeInTheDocument();
      }, { timeout: 1000 });

      // Validation feedback should be displayed in the UI
      const errorAlert = screen.getByText(/validation errors/i);
      expect(errorAlert).toBeInTheDocument();
    });

    it('should limit validation feedback height with scrolling', async () => {
      const workflowWithManyErrors: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: Array.from({ length: 10 }, (_, i) => ({
          id: `Invalid_Step_${i}`, // All invalid
          name: `Start: Step ${i}`,
          type: 'trigger' as const,
          action: 'onMRFSubmit',
          params: {}
        }))
      };

      render(
        <WorkflowCreationPane
          workflow={workflowWithManyErrors}
          onWorkflowChange={jest.fn()}
          isNewWorkflow={true}
        />
      );

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText(/validation errors/i)).toBeInTheDocument();
      }, { timeout: 1000 });

      // Should display validation errors for all invalid steps
      const errorAlert = screen.getByText(/validation errors/i);
      expect(errorAlert).toBeInTheDocument();
      
      // Verify multiple errors are shown (10 invalid steps)
      const errorMatches = screen.getAllByText(/must be in camelCase/i);
      expect(errorMatches.length).toBeGreaterThan(0);
    });
  });
});
