// src/test/app/components/ConversationPane.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ConversationPane from '@/app/components/ConversationPane';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';

// Mock the conversation utilities properly
jest.mock('@/app/utils/conversation-manager', () => ({
  ConversationStateManager: jest.fn().mockImplementation(() => ({
    getState: jest.fn().mockReturnValue({
      conversationId: 'mock-conversation-id',
      context: { workflowName: 'Test Workflow' }
    }),
    getMessages: jest.fn().mockReturnValue([]),
    addUserMessage: jest.fn(),
    addAimeMessage: jest.fn(),
    updateMessage: jest.fn(),
    saveConversation: jest.fn()
  }))
}));

jest.mock('@/app/types/conversation', () => ({
  createEmptyConversationState: jest.fn().mockReturnValue({
    conversationId: 'mock-conversation-id',
    workflowId: 'test-workflow',
    messages: [],
    context: {
      workflowId: 'test-workflow',
      workflowName: 'Test Workflow',
      userRole: 'admin',
      userDepartment: 'IT',
      availableFunctions: [],
      conversationGoal: 'create'
    },
    isActive: true,
    isStreaming: false,
    behaviorMetrics: {
      averageResponseTime: 1000,
      userSatisfactionScore: 0.8,
      taskCompletionRate: 0.9
    },
    isAutoSaving: false,
    lastActivity: new Date(),
    metadata: {
      userBehavior: {
        typingSpeed: 50,
        pausePatterns: [],
        commonPhrases: []
      }
    }
  })
}));

// Create a simple test theme to avoid font loading issues
const testTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

// Test wrapper with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>
    {children}
  </ThemeProvider>
);

describe('ConversationPane Component', () => {
  const mockWorkflow: WorkflowJSON = {
    schemaVersion: '1.0',
    metadata: {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      status: 'draft',
      tags: ['test'],
      description: 'A test workflow',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user'
    },
    steps: {}
  };

  const mockValidationResult: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };

  const defaultProps = {
    workflow: mockWorkflow,
    onWorkflowChange: jest.fn(),
    validationResult: mockValidationResult,
    isNewWorkflow: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });

    it('displays the aime assistant header', () => {
      const { getByText } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      expect(getByText('aime Assistant')).toBeInTheDocument();
    });

    it('shows create mode for new workflows', () => {
      const { getByText } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} isNewWorkflow={true} />
        </TestWrapper>
      );

      expect(getByText('Create Mode')).toBeInTheDocument();
    });

    it('shows edit mode for existing workflows', () => {
      const { getByText } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} isNewWorkflow={false} />
        </TestWrapper>
      );

      expect(getByText('Edit Mode')).toBeInTheDocument();
    });
  });

  describe('Interface Elements', () => {
    it('renders message input field', () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      const input = getByPlaceholderText('Type your message... Use @ for functions, # for steps');
      expect(input).toBeInTheDocument();
    });

    it('renders send button', () => {
      const { getAllByTestId } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      // Look for the send icons - there should be at least one
      const sendIcons = getAllByTestId('SendIcon');
      expect(sendIcons.length).toBeGreaterThan(0);
    });

    it('displays help text for input', () => {
      const { getByText } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      expect(getByText(/Press Enter to send/)).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('accepts workflow prop correctly', () => {
      const customWorkflow = {
        ...mockWorkflow,
        metadata: {
          ...mockWorkflow.metadata,
          name: 'Custom Workflow Name'
        }
      };

      const { container } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} workflow={customWorkflow} />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });

    it('handles null validation result', () => {
      const { container } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} validationResult={null} />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('renders with Material-UI components', () => {
      const { container } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      // Check that MUI components are rendered
      const muiElements = container.querySelectorAll('[class*="Mui"]');
      expect(muiElements.length).toBeGreaterThan(0);
    });
  });

  describe('Layout Structure', () => {
    it('has proper flex layout', () => {
      const { container } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveStyle('display: flex');
    });
  });

  describe('Error Resilience', () => {
    it('handles empty workflow gracefully', () => {
      const emptyWorkflow = {
        schemaVersion: '1.0',
        metadata: {
          id: '',
          name: '',
          version: '1.0.0',
          status: 'draft' as const,
          tags: [],
        },
        steps: {}
      };

      const { container } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} workflow={emptyWorkflow} />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Component Features', () => {
    it('initializes conversation management', () => {
      const { container } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      // Component should render without throwing
      expect(container).toBeInTheDocument();
    });

    it('provides workflow integration hooks', () => {
      const mockOnWorkflowChange = jest.fn();
      
      render(
        <TestWrapper>
          <ConversationPane 
            {...defaultProps} 
            onWorkflowChange={mockOnWorkflowChange}
          />
        </TestWrapper>
      );

      // Function is provided but not called during initial render
      expect(mockOnWorkflowChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('provides proper button roles', () => {
      const { getAllByRole } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      // Check for multiple buttons in the interface
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('provides proper input elements', () => {
      const { getByPlaceholderText } = render(<ConversationPane {...defaultProps} />);
      
      const input = getByPlaceholderText('Type your message... Use @ for functions, # for steps');
      expect(input).toBeInTheDocument();
      expect(input.tagName.toLowerCase()).toBe('textarea'); // Updated to textarea for multi-line support
    });
  });

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('handles re-renders without errors', () => {
      const { rerender } = render(
        <TestWrapper>
          <ConversationPane {...defaultProps} />
        </TestWrapper>
      );

      // Multiple re-renders should not cause errors
      for (let i = 0; i < 3; i++) {
        rerender(
          <TestWrapper>
            <ConversationPane {...defaultProps} isNewWorkflow={i % 2 === 0} />
          </TestWrapper>
        );
      }

      expect(true).toBe(true); // If we get here, no errors occurred
    });
  });
});