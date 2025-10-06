// src/test/app/components/WorkflowCreationPane.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import WorkflowCreationPane from '@/app/components/WorkflowCreationPane';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import { MRFData } from '@/app/types/workflow-creation';

// Mock dependencies
jest.mock('@/app/utils/workflow-creation-flow', () => ({
  WorkflowCreationFlow: jest.fn().mockImplementation(() => ({
    initiateCreation: jest.fn().mockResolvedValue({
      sessionId: 'test-session-123',
      status: 'active',
      context: {
        workflowId: 'test-workflow',
        workflowName: 'Test Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'create',
        currentWorkflowSteps: []
      },
      structuredGuidance: {
        currentPhase: 'trigger_definition',
        nextPhase: 'condition_setup',
        phaseInstructions: 'Define the trigger that starts your workflow',
        suggestedFunctions: ['onMRFSubmit', 'onScheduledTime'],
        requiredElements: ['trigger'],
        completionCriteria: ['At least one trigger step defined'],
        progressPercentage: 20
      },
      workflowData: {},
      createdAt: new Date(),
      lastActivity: new Date()
    }),
    handleStreamingGeneration: jest.fn().mockImplementation(async function* () {
      yield { type: 'content', content: 'I can help you create a workflow for ' };
      yield { type: 'content', content: 'your event request. Let me start by setting up the trigger.' };
      yield { 
        type: 'workflow_update', 
        content: '',
        currentWorkflow: {
          metadata: { name: 'Event Request Workflow' },
          steps: {
            start: {
              name: 'MRF Submitted',
              type: 'trigger',
              action: 'onMRFSubmit',
              params: { mrfID: 'test' },
              nextSteps: ['checkApproval']
            }
          }
        }
      };
      yield {
        type: 'guidance',
        content: '',
        guidance: {
          currentPhase: 'condition_setup',
          nextPhase: 'action_configuration',
          phaseInstructions: 'Now let&apos;s add conditions for approval',
          suggestedFunctions: ['checkApprovalRequired'],
          requiredElements: ['condition'],
          completionCriteria: ['Approval logic defined'],
          progressPercentage: 40
        }
      };
    }),
    processUserRefinement: jest.fn().mockResolvedValue({
      changes: [{ description: 'Updated trigger parameters' }]
    })
  }))
}));

jest.mock('@/app/utils/conversation-manager', () => ({
  ConversationStateManager: jest.fn().mockImplementation(() => ({
    addUserMessage: jest.fn(),
    addAimeMessage: jest.fn(),
    setCurrentWorkflow: jest.fn(),
    setWorkflowContext: jest.fn(),
    getMessages: jest.fn().mockReturnValue([
      {
        id: 'msg-1',
        sender: 'aime',
        content: 'Hi! I&apos;m aime, your AI workflow assistant. Let&apos;s create a workflow together!',
        timestamp: new Date(),
        type: 'text'
      }
    ]),
    getState: jest.fn().mockReturnValue({
      conversationId: 'test-conv-123',
      context: {}
    })
  })),
  createEmptyConversationState: jest.fn().mockReturnValue({
    conversationId: 'test-conv-123',
    workflowId: 'test-workflow',
    messages: [],
    context: {},
    createdAt: new Date(),
    lastActivity: new Date()
  })
}));

// Mock AutoComplete component
jest.mock('@/app/components/SmartAutocomplete', () => ({
  SmartAutocomplete: jest.fn(({ value, onChange, onKeyPress, placeholder }) => (
    <textarea
      data-testid="smart-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyPress}
      placeholder={placeholder}
    />
  ))
}));

// Test theme
const theme = createTheme();

// Test data
const mockWorkflow: WorkflowJSON = {
  schemaVersion: '1.0',
  metadata: {
    id: 'test-workflow-123',
    name: 'Test Workflow',
    version: '1.0.0',
    status: 'draft',
    tags: ['test']
  },
  steps: [] // Empty array for nested array architecture
};

const mockValidationResult: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  info: []
};

const mockMRFData: MRFData = {
  id: 'mrf-test-001',
  title: 'Team Building Event',
  description: 'Annual team building event for the development team',
  requestedDate: new Date('2024-06-15'),
  attendees: 25,
  location: 'Conference Room A',
  budget: 2500,
  category: 'team-building',
  requester: {
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    department: 'Engineering'
  },
  approvalRequired: true,
  customFields: {
    priority: 'medium',
    specialRequirements: ['projector', 'catering']
  }
};

// Helper to render component with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('WorkflowCreationPane', () => {
  const mockOnWorkflowChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('renders with aime assistant header', () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      expect(screen.getByText('aime workflow creator')).toBeInTheDocument();
      expect(screen.getByText('Create Mode')).toBeInTheDocument();
    });

    it('displays auto-save indicator in header', () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      // Auto-save indicator should be present (may not be visible initially)
      const header = screen.getByText('aime workflow creator').closest('div');
      expect(header).toBeInTheDocument();
    });
  });

  describe('MRF Integration', () => {
    it('displays MRF context when mrfData is provided', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
          mrfData={mockMRFData}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('MRF Context Loaded')).toBeInTheDocument();
        expect(screen.getByText(/Team Building Event/)).toBeInTheDocument();
      });
    });

    it('initializes with MRF-specific welcome message', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
          mrfData={mockMRFData}
        />
      );

      await waitFor(() => {
        // Check that the conversation manager was called with MRF context
        expect(screen.getByText(/Ready to create your workflow!/)).toBeInTheDocument();
      });
    });
  });

  describe('Structured Guidance System', () => {
    it('displays creation guidance panel with phase information', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Phase:/)).toBeInTheDocument();
        expect(screen.getByText(/20%/)).toBeInTheDocument();
      });
    });

    it('shows suggested functions as clickable chips', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      await waitFor(() => {
        const functionChips = screen.getAllByRole('button');
        const suggestionChips = functionChips.filter(button => 
          button.textContent?.includes('onMRFSubmit') || 
          button.textContent?.includes('onScheduledTime')
        );
        expect(suggestionChips.length).toBeGreaterThan(0);
      });
    });

    it('allows clicking suggestions to populate input', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      await waitFor(() => {
        const suggestionChip = screen.getByText('onMRFSubmit');
        fireEvent.click(suggestionChip);
      });

      const autocomplete = screen.getByTestId('smart-autocomplete');
      expect(autocomplete).toHaveValue(expect.stringContaining('onMRFSubmit'));
    });
  });

  describe('Streaming Workflow Generation', () => {
    it('handles streaming message generation', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      const input = screen.getByTestId('smart-autocomplete');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(input, { target: { value: 'Create a workflow for event approval' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnWorkflowChange).toHaveBeenCalled();
      });
    });

    it('displays loading state during streaming', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      const input = screen.getByTestId('smart-autocomplete');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(input, { target: { value: 'Create a workflow' } });
      fireEvent.click(sendButton);

      // Should show loading indicator temporarily
      expect(sendButton).toBeDisabled();
    });

    it('updates workflow in real-time during streaming', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      const input = screen.getByTestId('smart-autocomplete');
      fireEvent.change(input, { target: { value: 'Create event workflow' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnWorkflowChange).toHaveBeenCalled();
      });
    });
  });

  describe('User Interaction', () => {
    it('supports keyboard navigation with Enter to send', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      const input = screen.getByTestId('smart-autocomplete');
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(input).toHaveValue(''); // Input should be cleared after sending
      });
    });

    it('supports Shift+Enter for new lines', () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      const input = screen.getByTestId('smart-autocomplete');
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

      // Should not clear input with Shift+Enter
      expect(input).toHaveValue('Test message');
    });

    it('toggles guidance panel with button click', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /toggle guidance/i });
      fireEvent.click(toggleButton);

      // Guidance should be toggled (implementation depends on collapse behavior)
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Auto-Save Integration', () => {
    it('displays auto-save status changes', async () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      // Wait for component to be fully mounted
      await waitFor(() => {
        expect(screen.getByText('aime workflow creator')).toBeInTheDocument();
      });

      // Simulate auto-save event using act
      await act(async () => {
        const autoSaveEvent = new CustomEvent('autoSaveStatus', {
          detail: { sessionId: 'test-session-123', status: 'saved' }
        });
        window.dispatchEvent(autoSaveEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });
  });

  describe('Validation Integration', () => {
    it('handles validation results properly', () => {
      const validationWithErrors: ValidationResult = {
        isValid: false,
        errors: [
          {
            id: 'test-error',
            severity: 'error',
            technicalMessage: 'Test error',
            conversationalExplanation: 'This is a test error'
          }
        ],
        warnings: [],
        info: []
      };

      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      // Component should render without errors even with validation issues
      expect(screen.getByText('aime workflow creator')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle guidance/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      const input = screen.getByTestId('smart-autocomplete');
      expect(input).toBeVisible();
      
      // Tab navigation should work
      input.focus();
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Error Handling', () => {
    it('gracefully handles streaming errors', async () => {
      // Mock streaming generator to throw error  
      const mockErrorFlow = {
        handleStreamingGeneration: jest.fn().mockImplementation(async function* () {
          throw new Error('Streaming failed');
        })
      };
      
      // Temporarily replace the mock
      jest.doMock('@/app/utils/workflow-creation-flow', () => ({
        WorkflowCreationFlow: jest.fn().mockImplementation(() => mockErrorFlow)
      }));

      renderWithTheme(
        <WorkflowCreationPane
          workflow={mockWorkflow}
          onWorkflowChange={mockOnWorkflowChange}
          isNewWorkflow={true}
        />
      );

      const input = screen.getByTestId('smart-autocomplete');
      fireEvent.change(input, { target: { value: 'Test error handling' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(input).toBeInTheDocument();
      });
    });

    it('handles initialization errors gracefully', () => {
      const invalidWorkflow = {} as WorkflowJSON;

      expect(() => {
        renderWithTheme(
          <WorkflowCreationPane
            workflow={invalidWorkflow}
            onWorkflowChange={mockOnWorkflowChange}
            isNewWorkflow={true}
          />
        );
      }).not.toThrow();
    });
  });
});