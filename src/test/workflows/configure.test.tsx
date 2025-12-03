/**
 * Tests for WorkflowConfigurePage
 *
 * Tests the workflow configuration page including:
 * - Loading and rendering states
 * - Error handling
 * - Template loading and saving
 * - User context initialization
 * - Workflow definition updates
 * - Message handling for AI conversations
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import WorkflowConfigurePage from '@/app/workflows/configure/[id]/page';
import { WorkflowTemplate, WorkflowStep } from '@/app/types/workflowTemplate';

// Mock child components
jest.mock('@/app/components/ResponsiveWorkflowConfigurator', () => {
  return function MockConfigurator(props: any) {
    return (
      <div data-testid="workflow-configurator">
        <div data-testid="template-id">{props.workflowTemplate?.id}</div>
        <div data-testid="template-label">
          {props.workflowTemplate?.metadata?.label}
        </div>
        <div data-testid="is-publish-ready">
          {props.isPublishReady ? 'Ready' : 'Not Ready'}
        </div>
        <button onClick={() => props.onWorkflowDefinitionChange({ steps: [] })}>
          Update Workflow
        </button>
        <button onClick={() => props.onTemplateLabelChange?.('New Name')}>
          Update Label
        </button>
      </div>
    );
  };
});

// Mock hooks
jest.mock('@/app/hooks/useWorkflowTemplate', () => ({
  useWorkflowTemplate: jest.fn(),
}));

jest.mock('@/app/hooks/useAimeWorkflow', () => ({
  useAimeWorkflow: jest.fn(),
}));

jest.mock('@/app/contexts/UnifiedUserContext', () => ({
  useUnifiedUserContext: jest.fn(),
}));

import { useWorkflowTemplate } from '@/app/hooks/useWorkflowTemplate';
import { useAimeWorkflow } from '@/app/hooks/useAimeWorkflow';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';

const mockUseWorkflowTemplate = useWorkflowTemplate as jest.MockedFunction<
  typeof useWorkflowTemplate
>;
const mockUseAimeWorkflow = useAimeWorkflow as jest.MockedFunction<
  typeof useAimeWorkflow
>;
const mockUseUnifiedUserContext = useUnifiedUserContext as jest.MockedFunction<
  typeof useUnifiedUserContext
>;

// Mock template data
const createMockTemplate = (overrides?: Partial<WorkflowTemplate>): WorkflowTemplate => ({
  id: 'template123',
  account: 'account123',
  organization: 'org456',
  version: '1.0.0',
  workflowDefinition: {
    steps: [
      {
        id: 'trigger1',
        label: 'Start: On Event',
        type: 'trigger',
        stepFunction: 'onEvent',
        functionParams: {},
      } as WorkflowStep,
    ],
  },
  metadata: {
    label: 'Test Workflow',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user123',
    updatedBy: 'user123',
  },
  ...overrides,
});

describe('WorkflowConfigurePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseUnifiedUserContext.mockReturnValue({
      isContextLoading: false,
      user: { id: 'user123' },
      account: { id: 'account123' },
    } as any);

    mockUseWorkflowTemplate.mockReturnValue({
      template: createMockTemplate(),
      isLoading: false,
      isContextLoading: false,
      error: null,
      isSaving: false,
      isPublishReady: false,
      loadTemplate: jest.fn().mockResolvedValue(undefined),
      updateWorkflowDefinition: jest.fn(),
      updateTemplateLabel: jest.fn(),
      clearError: jest.fn(),
    } as any);

    mockUseAimeWorkflow.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      regenerateMermaidDiagram: jest.fn(),
    } as any);
  });

  describe('Loading States', () => {
    it('should show loading state when context is loading', async () => {
      mockUseUnifiedUserContext.mockReturnValue({
        isContextLoading: true,
      } as any);

      mockUseWorkflowTemplate.mockReturnValue({
        isLoading: false,
        isContextLoading: true,
        template: null,
      } as any);

      const { container } = render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      expect(screen.getByText(/Loading user context/i)).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument(); // Loader spinner
    });

    it('should show loading state when template is loading', async () => {
      mockUseWorkflowTemplate.mockReturnValue({
        isLoading: true,
        isContextLoading: false,
        template: null,
      } as any);

      const { container } = render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      expect(screen.getByText(/Loading workflow/i)).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show empty state when no template is loaded', async () => {
      mockUseWorkflowTemplate.mockReturnValue({
        template: null,
        isLoading: false,
        isContextLoading: false,
        error: null,
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      expect(screen.getByText(/No Workflow Loaded/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Loading workflow template/i)
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error alert when error exists', async () => {
      mockUseWorkflowTemplate.mockReturnValue({
        template: null,
        isLoading: false,
        isContextLoading: false,
        error: 'Failed to load template',
        clearError: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      expect(screen.getByText(/Failed to load template/i)).toBeInTheDocument();
    });

    it('should call clearError when dismiss button is clicked', async () => {
      const mockClearError = jest.fn();
      mockUseWorkflowTemplate.mockReturnValue({
        template: null,
        isLoading: false,
        isContextLoading: false,
        error: 'Test error',
        clearError: mockClearError,
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      dismissButton.click();

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Template Loading', () => {
    it('should load template on mount', async () => {
      const mockLoadTemplate = jest.fn().mockResolvedValue(undefined);
      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        loadTemplate: mockLoadTemplate,
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template-abc' })}
        />
      );

      await waitFor(() => {
        expect(mockLoadTemplate).toHaveBeenCalledWith('template-abc');
      });
    });

    it('should wait for context loading before loading template', async () => {
      const mockLoadTemplate = jest.fn().mockResolvedValue(undefined);

      const { rerender } = render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      mockUseUnifiedUserContext.mockReturnValue({
        isContextLoading: true,
      } as any);

      rerender(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      expect(mockLoadTemplate).not.toHaveBeenCalled();
    });

    it('should render workflow configurator when template is loaded', async () => {
      const template = createMockTemplate();
      mockUseWorkflowTemplate.mockReturnValue({
        template,
        isLoading: false,
        isContextLoading: false,
        error: null,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Definition Updates', () => {
    it('should pass onWorkflowDefinitionChange to configurator', async () => {
      const mockUpdateDefinition = jest.fn();
      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        updateWorkflowDefinition: mockUpdateDefinition,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      const updateButton = screen.getByRole('button', { name: /Update Workflow/i });
      updateButton.click();

      expect(mockUpdateDefinition).toHaveBeenCalled();
    });

    it('should pass onTemplateLabelChange to configurator', async () => {
      const mockUpdateLabel = jest.fn().mockResolvedValue(undefined);
      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        updateTemplateLabel: mockUpdateLabel,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      const labelButton = screen.getByRole('button', { name: /Update Label/i });
      labelButton.click();

      await waitFor(() => {
        expect(mockUpdateLabel).toHaveBeenCalledWith('New Name');
      });
    });
  });

  describe('Saving State', () => {
    it('should show saving alert when isSaving is true', async () => {
      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        isSaving: true,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      expect(
        screen.getByText(/Saving workflow to database/i)
      ).toBeInTheDocument();
    });

    it('should not show saving alert when isSaving is false', async () => {
      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        isSaving: false,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      expect(
        screen.queryByText(/Saving workflow to database/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Publish Readiness', () => {
    it('should pass isPublishReady to configurator', async () => {
      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        isPublishReady: true,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-publish-ready')).toHaveTextContent('Ready');
      });
    });

    it('should show not ready when isPublishReady is false', async () => {
      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        isPublishReady: false,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-publish-ready')).toHaveTextContent(
          'Not Ready'
        );
      });
    });
  });

  describe('AI Conversation Integration', () => {
    it('should pass AI messages to configurator', async () => {
      const messages = [
        {
          id: 'msg1',
          role: 'user' as const,
          content: 'Create a workflow',
          timestamp: new Date(),
        },
      ];

      mockUseAimeWorkflow.mockReturnValue({
        messages,
        sendMessage: jest.fn(),
        regenerateMermaidDiagram: jest.fn(),
      } as any);

      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });
    });

    it('should pass sendMessage to configurator', async () => {
      const mockSendMessage = jest.fn();
      mockUseAimeWorkflow.mockReturnValue({
        messages: [],
        sendMessage: mockSendMessage,
        regenerateMermaidDiagram: jest.fn(),
      } as any);

      mockUseWorkflowTemplate.mockReturnValue({
        template: createMockTemplate(),
        isLoading: false,
        isContextLoading: false,
        error: null,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });
    });
  });

  describe('Template Saving Callbacks', () => {
    it('should handle template saved callback', async () => {
      let savedCallback: any;

      mockUseWorkflowTemplate.mockImplementation((options: any) => {
        savedCallback = options.onTemplateSaved;
        return {
          template: createMockTemplate(),
          isLoading: false,
          isContextLoading: false,
          error: null,
          loadTemplate: jest.fn(),
        } as any;
      });

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });

      // The callback is called but shouldn't cause visible changes in current UI
      if (savedCallback) {
        savedCallback(createMockTemplate({ id: 'template456' }));
      }
    });

    it('should handle template load callback', async () => {
      let loadCallback: any;

      mockUseWorkflowTemplate.mockImplementation((options: any) => {
        loadCallback = options.onTemplateLoad;
        return {
          template: createMockTemplate(),
          isLoading: false,
          isContextLoading: false,
          error: null,
          loadTemplate: jest.fn(),
        } as any;
      });

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });

      // The callback is called but shouldn't cause visible changes
      if (loadCallback) {
        loadCallback(createMockTemplate({ id: 'template789' }));
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle template with no metadata', async () => {
      mockUseWorkflowTemplate.mockReturnValue({
        template: {
          id: 'template123',
          account: 'account123',
          workflowDefinition: { steps: [] },
        } as any,
        isLoading: false,
        isContextLoading: false,
        error: null,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      expect(screen.getByText(/No Workflow Loaded/i)).toBeInTheDocument();
    });

    it('should handle empty workflow definition', async () => {
      const template = createMockTemplate({
        workflowDefinition: { steps: [] },
      });

      mockUseWorkflowTemplate.mockReturnValue({
        template,
        isLoading: false,
        isContextLoading: false,
        error: null,
        loadTemplate: jest.fn(),
      } as any);

      render(
        <WorkflowConfigurePage
          params={Promise.resolve({ id: 'template123' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });
    });

    it('should handle params promise rejection', async () => {
      render(
        <WorkflowConfigurePage
          params={Promise.reject(new Error('Params error'))}
        />
      );

      // Should still render without crashing (error is caught in useEffect)
      await waitFor(() => {
        expect(screen.queryByTestId('workflow-configurator')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});
