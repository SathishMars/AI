// src/test/app/components/ResponsiveWorkflowConfigurator-v2-support.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResponsiveWorkflowConfigurator from '@/app/components/ResponsiveWorkflowConfigurator';
import { WorkflowJSON } from '@/app/types/workflow';
import { WorkflowDefinition } from '@/app/types/workflow-template-v2';
// Mock user context and account hooks
jest.mock('@/app/contexts/UnifiedUserContext', () => ({
  useUnifiedUserContext: () => ({
    account: { id: 'test-account', name: 'Test Account' },
    currentOrganization: null,
    isLoading: false
  }),
  useAccount: () => ({
    account: { id: 'test-account', name: 'Test Account' },
    isLoading: false
  }),
  useOrganization: () => ({
    currentOrganization: null,
    isLoading: false
  })
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams()
}));

// Mock child components  
jest.mock('@/app/components/WorkflowCreationPane', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function WorkflowCreationPane({ workflow }: { workflow: any }) {
    return (
      <div data-testid="workflow-creation-pane">
        {workflow ? `Steps: ${Array.isArray(workflow.steps) ? workflow.steps.length : 0}` : 'No workflow'}
      </div>
    );
  };
});

jest.mock('@/app/components/VisualizationPane', () => ({
  __esModule: true,
  default: () => <div data-testid="visualization-pane">Visualization</div>
}));

jest.mock('@/app/components/HistoryPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="history-panel">History</div>
}));

jest.mock('@/app/components/WorkflowTemplateNameDialog', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => open ? <div data-testid="name-dialog">Name Dialog</div> : null
}));

describe('ResponsiveWorkflowConfigurator V2 Support', () => {
  const mockWorkflowJSON: WorkflowJSON = {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      status: 'draft',
      tags: []
    },
    steps: [
      { id: 'step1', name: 'Step 1', type: 'trigger', action: 'start' }
    ]
  };

  const mockWorkflowDefinition: WorkflowDefinition = {
    steps: [
      { id: 'step1', name: 'Step 1', type: 'trigger', action: 'start' },
      { id: 'step2', name: 'Step 2', type: 'action', action: 'process' }
    ]
  };

  const mockValidationResult = { isValid: true, errors: [], warnings: [], info: [] };
  const mockOnWorkflowChange = jest.fn();

  // Helper to check if component rendered successfully
  const componentRendered = (container: HTMLElement) => {
    // Check for any key UI elements that should be present
    return container.querySelector('[data-testid="workflow-creation-pane"]') !== null ||
           container.textContent?.includes('Steps:') === true;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Legacy WorkflowJSON Support', () => {
    it('should accept and render WorkflowJSON (legacy format)', () => {
      const { container } = render(
          <ResponsiveWorkflowConfigurator
            workflow={mockWorkflowJSON}
            onWorkflowChange={mockOnWorkflowChange}
            validationResult={mockValidationResult}
            isNewWorkflow={false}
          />
      );

      // Component should render without throwing
      expect(container).toBeTruthy();
      // Should show 1 step
      expect(container.textContent).toContain('Steps: 1');
    });
  });

  describe('New WorkflowDefinition Support', () => {
    it('should accept and convert WorkflowDefinition to WorkflowJSON', () => {
      const { container } = render(
          <ResponsiveWorkflowConfigurator
            workflowDefinition={mockWorkflowDefinition}
            onWorkflowChange={mockOnWorkflowChange}
            validationResult={mockValidationResult}
            isNewWorkflow={false}
          />
      );

      expect(container).toBeTruthy();
      // Should show 2 steps from WorkflowDefinition
      expect(container.textContent).toContain('Steps: 2');
    });

    it('should prefer WorkflowDefinition over legacy workflow when both provided', () => {
      const { container } = render(
          <ResponsiveWorkflowConfigurator
            workflow={mockWorkflowJSON}
            workflowDefinition={mockWorkflowDefinition}
            onWorkflowChange={mockOnWorkflowChange}
            validationResult={mockValidationResult}
            isNewWorkflow={false}
          />
      );

      // Should use WorkflowDefinition (2 steps) not WorkflowJSON (1 step)
      expect(container.textContent).toContain('Steps: 2');
    });

    it('should convert WorkflowDefinition with proper metadata', () => {
      const { container } = render(
          <ResponsiveWorkflowConfigurator
            workflowDefinition={mockWorkflowDefinition}
            onWorkflowChange={mockOnWorkflowChange}
            validationResult={mockValidationResult}
            isNewWorkflow={true}
          />
      );

      // Component should render without errors
      expect(container).toBeTruthy();
      expect(container.textContent).toContain('Steps: 2');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when neither workflow nor workflowDefinition provided', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
            <ResponsiveWorkflowConfigurator
              onWorkflowChange={mockOnWorkflowChange}
              validationResult={mockValidationResult}
              isNewWorkflow={false}
            />
        );
      }).toThrow('ResponsiveWorkflowConfigurator requires either workflow or workflowDefinition prop');

      consoleSpy.mockRestore();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing code using workflow prop', () => {
      const { container, rerender } = render(
          <ResponsiveWorkflowConfigurator
            workflow={mockWorkflowJSON}
            onWorkflowChange={mockOnWorkflowChange}
            validationResult={mockValidationResult}
            isNewWorkflow={false}
          />
      );

      expect(container).toBeTruthy();
      expect(container.textContent).toContain('Steps: 1');

      // Update workflow
      const updatedWorkflow = {
        ...mockWorkflowJSON,
        steps: [...mockWorkflowJSON.steps, { id: 'step2', name: 'Step 2', type: 'action' as const, action: 'process' }]
      };

      rerender(
          <ResponsiveWorkflowConfigurator
            workflow={updatedWorkflow}
            onWorkflowChange={mockOnWorkflowChange}
            validationResult={mockValidationResult}
            isNewWorkflow={false}
          />
      );

      expect(container.textContent).toContain('Steps: 2');
    });
  });
});
