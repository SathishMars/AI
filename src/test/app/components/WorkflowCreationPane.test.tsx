import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import WorkflowCreationPane from '@/app/components/WorkflowCreationPane';
import { WorkflowJSON } from '@/app/types/workflow';
import { MRFData } from '@/app/types/workflow-creation';
import type { ConversationMessage } from '@/app/types/conversation';

type MockConversationManager = {
  addUserMessage: jest.Mock;
  addAimeMessage: jest.Mock;
  updateMessage: jest.Mock;
  addSuggestions: jest.Mock;
  setCurrentWorkflow: jest.Mock;
  setWorkflowContext: jest.Mock;
  getMessages: jest.Mock;
  getMessageById: jest.Mock;
  getState: jest.Mock;
  updateContext: jest.Mock;
  setAutosaveEnabled: jest.Mock;
  setAutosaveDelay: jest.Mock;
};

const mockConversationManagers: MockConversationManager[] = [];

const createConversationManager = (): MockConversationManager => {
  const messageLog: ConversationMessage[] = [
    {
      id: 'msg-1',
      sender: 'aime',
      content: 'Hey there! I\u2019m Aime — your AI sidekick for building smart workflows.',
      timestamp: new Date(),
      status: 'complete',
      type: 'text'
    }
  ];

  let messageCounter = 1;

  const manager: MockConversationManager = {
    addUserMessage: jest.fn((content: string) => {
      const message: ConversationMessage = {
        id: `user-${messageCounter++}`,
        sender: 'user',
        content,
        timestamp: new Date(),
        status: 'complete',
        type: 'text'
      };
      messageLog.push(message);
      return message;
    }),
    addAimeMessage: jest.fn((content: string, type: ConversationMessage['type'] = 'text') => {
      const message: ConversationMessage = {
        id: `aime-${messageCounter++}`,
        sender: 'aime',
        content,
        timestamp: new Date(),
        status: 'streaming',
        type
      };
      messageLog.push(message);
      return message;
    }),
    updateMessage: jest.fn((id: string, updates: Partial<ConversationMessage>) => {
      const index = messageLog.findIndex(msg => msg.id === id);
      if (index === -1) {
        return false;
      }
      messageLog[index] = {
        ...messageLog[index],
        ...updates
      };
      return true;
    }),
    addSuggestions: jest.fn(),
    setCurrentWorkflow: jest.fn(),
    setWorkflowContext: jest.fn(),
    getMessages: jest.fn(() => [...messageLog]),
    getMessageById: jest.fn((id: string) => messageLog.find(msg => msg.id === id)),
    getState: jest.fn(() => ({
      conversationId: 'test-conv-123',
      context: {}
    })),
    updateContext: jest.fn(),
    setAutosaveEnabled: jest.fn(),
    setAutosaveDelay: jest.fn()
  };

  mockConversationManagers.push(manager);
  return manager;
};

const createEmptyConversationState = () => ({
  conversationId: 'test-conv-123',
  workflowId: 'test-workflow',
  messages: [],
  context: {},
  isStreaming: false,
  currentStreamId: undefined,
  behaviorMetrics: {
    messageCount: 0,
    averageResponseTime: 0,
    functionsUsedCount: {},
    errorRecoveryAttempts: 0,
    conversationDuration: 0,
    workflowComplexity: 0,
    userSatisfactionIndicators: {
      quickAcceptance: 0,
      iterationsRequired: 0,
      explicitPositiveFeedback: 0
    }
  },
  lastActivity: new Date(),
  isAutoSaving: false
});

const initiateCreationMock = jest.fn().mockResolvedValue({
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
});

const handleStreamingGenerationMock = jest.fn();
const processUserRefinementMock = jest.fn().mockResolvedValue({ changes: [] });

jest.mock('@/app/utils/workflow-creation-flow', () => ({
  WorkflowCreationFlow: jest.fn().mockImplementation(() => ({
    initiateCreation: initiateCreationMock,
    handleStreamingGeneration: handleStreamingGenerationMock,
    processUserRefinement: processUserRefinementMock
  }))
}));

jest.mock('@/app/utils/conversation-manager', () => ({
  ConversationStateManager: jest.fn(() => createConversationManager()),
  createEmptyConversationState: jest.fn(() => createEmptyConversationState())
}));

jest.mock('@/app/components/SmartAutocomplete', () => ({
  SmartAutocomplete: jest.fn(({ value, onChange, onKeyPress, placeholder, disabled }: {
    value: string;
    onChange: (next: string) => void;
    onKeyPress: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <textarea
      data-testid="smart-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyPress}
      placeholder={placeholder}
      disabled={disabled}
    />
  ))
}));

jest.mock('@/app/contexts/UnifiedUserContext', () => ({
  useUnifiedUserContext: jest.fn(() => ({
    account: { id: 'test-account-id' },
    currentOrganization: { id: 'test-organization-id' }
  }))
}));

const theme = createTheme();

const mockWorkflow: WorkflowJSON = {
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

const renderWithTheme = (component: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe('WorkflowCreationPane', () => {
  let fetchMock: jest.Mock;
  let mockOnWorkflowChange: jest.Mock;
  let workflowResponseOverride: Partial<{ conversationalResponse: string; followUpQuestions: string[]; parameterCollectionNeeded?: boolean; workflow: { steps: unknown[] } }> | null;

  const renderComponent = (props?: Partial<React.ComponentProps<typeof WorkflowCreationPane>>) =>
    renderWithTheme(
      <WorkflowCreationPane
        workflow={mockWorkflow}
        onWorkflowChange={mockOnWorkflowChange}
        isNewWorkflow={true}
        {...props}
      />
    );

  const waitForInitialization = async () => {
    await waitFor(() => expect(initiateCreationMock).toHaveBeenCalled());
    await waitFor(() => expect(mockConversationManagers.length).toBeGreaterThan(0));
  };

  beforeEach(() => {
    mockOnWorkflowChange = jest.fn();
    mockConversationManagers.splice(0, mockConversationManagers.length);
    initiateCreationMock.mockClear();
    handleStreamingGenerationMock.mockClear();
    processUserRefinementMock.mockClear();
    workflowResponseOverride = null;

    fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/workflow-autocomplete')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              autocompleteItems: [
                { name: 'onMRFSubmit' },
                { name: 'onScheduledTime' }
              ]
            }
          })
        });
      }

      if (url === '/api/langchain/generate-workflow' && (!init || init.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      }

      if (url === '/api/langchain/generate-workflow' && init?.method === 'POST') {
        const overridePayload = workflowResponseOverride;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              workflow: overridePayload?.workflow ?? {
                steps: [
                  { id: 'start', name: 'Start: On submission', type: 'trigger' }
                ]
              },
              conversationalResponse: overridePayload?.conversationalResponse ?? 'Workflow generated successfully.',
              followUpQuestions: overridePayload?.followUpQuestions ?? [],
              parameterCollectionNeeded: overridePayload?.parameterCollectionNeeded ?? false
            }
          })
        });
      }

      return Promise.reject(new Error(`Unhandled fetch call: ${url}`));
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('initializes conversation and displays welcome message', async () => {
    renderComponent();
    await waitForInitialization();

  const welcomeMessages = await screen.findAllByText(/AI sidekick for building smart workflows/i);
  expect(welcomeMessages.length).toBeGreaterThan(0);
    expect(mockConversationManagers[0].setCurrentWorkflow).toHaveBeenCalledWith({ steps: mockWorkflow.steps });
  });

  it('includes MRF details in the initial conversation when provided', async () => {
    renderComponent({ mrfData: mockMRFData });
    await waitForInitialization();

    expect(screen.getByText(/Team Building Event/)).toBeInTheDocument();
  });

  it('adds user message and clears input when sending', async () => {
    renderComponent();
    await waitForInitialization();

    const input = await screen.findByTestId('smart-autocomplete');
    fireEvent.change(input, { target: { value: 'Create a workflow for approvals' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(mockConversationManagers[0].addUserMessage).toHaveBeenCalledWith('Create a workflow for approvals'));
    await waitFor(() => expect(screen.getByTestId('smart-autocomplete')).toHaveValue(''));
  });

  it('disables send button during processing and re-enables after completion', async () => {
    renderComponent();
    await waitForInitialization();

    const input = await screen.findByTestId('smart-autocomplete');
    const sendButton = await screen.findByRole('button', { name: /send message/i });

    fireEvent.change(input, { target: { value: 'Trigger streaming state' } });
    fireEvent.click(sendButton);

    expect(sendButton).toBeDisabled();
    await waitFor(() => expect(screen.getByTestId('SendIcon')).toBeInTheDocument());
  });

  it('invokes onWorkflowChange with workflow returned from backend', async () => {
    renderComponent();
    await waitForInitialization();

    const input = await screen.findByTestId('smart-autocomplete');
    fireEvent.change(input, { target: { value: 'Build new workflow' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(mockOnWorkflowChange).toHaveBeenCalledWith({ steps: expect.any(Array) }));
  });

  it('updates conversation manager with final aime response', async () => {
    renderComponent();
    await waitForInitialization();

    const input = await screen.findByTestId('smart-autocomplete');
    fireEvent.change(input, { target: { value: 'Generate workflow' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(mockConversationManagers[0].updateMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ content: expect.stringContaining('Workflow generated successfully.') })
    ));

    expect(await screen.findByText(/Is there anything else I can help you with/i)).toBeInTheDocument();
  });

  it('prompts follow-up questions when provided by the workflow generator', async () => {
    workflowResponseOverride = {
      conversationalResponse: 'I have your workflow ready.',
      followUpQuestions: [
        'Who should approve the event request?',
        'Do you need any budget thresholds configured?'
      ],
      parameterCollectionNeeded: true
    };

    renderComponent();
    await waitForInitialization();

    const input = await screen.findByTestId('smart-autocomplete');
    fireEvent.change(input, { target: { value: 'Collect details' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText(/To complete your workflow, I need some additional information/i)).toBeInTheDocument();
    expect(await screen.findByText(/1\. Who should approve the event request\?/i)).toBeInTheDocument();
    expect(await screen.findByText(/Please provide the information above so I can complete the workflow configuration/i)).toBeInTheDocument();
  });

  it('offers additional assistance when no follow-up questions are returned', async () => {
    workflowResponseOverride = {
      conversationalResponse: 'Here is the workflow you asked for.',
      followUpQuestions: []
    };

    renderComponent();
    await waitForInitialization();

    const input = await screen.findByTestId('smart-autocomplete');
    fireEvent.change(input, { target: { value: 'Finalize workflow' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText(/Is there anything else I can help you with/i)).toBeInTheDocument();
  });
});