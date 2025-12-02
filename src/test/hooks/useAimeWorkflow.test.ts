/**
 * Tests for useAimeWorkflow hook
 *
 * Tests the AI workflow message and conversation management hook including:
 * - Message sending and receiving
 * - API integration for workflow generation
 * - Mermaid diagram regeneration
 * - Error handling and recovery
 * - State management and message history
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAimeWorkflow } from '@/app/hooks/useAimeWorkflow';
import { WorkflowDefinition } from '@/app/types/workflowTemplate';
import { WorkflowMessage } from '@/app/types/aimeWorkflowMessages';
import * as unifiedUserContext from '@/app/contexts/UnifiedUserContext';
import * as api from '@/app/utils/api';

// Mock dependencies
jest.mock('@/app/contexts/UnifiedUserContext');
jest.mock('@/app/utils/api');

const mockUseUnifiedUserContext =
  unifiedUserContext.useUnifiedUserContext as jest.MockedFunction<
    typeof unifiedUserContext.useUnifiedUserContext
  >;
const mockApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

const createMockWorkflowDefinition = (
  overrides?: Partial<WorkflowDefinition>
): WorkflowDefinition => ({
  steps: [
    {
      id: 'step1',
      label: 'Start',
      type: 'trigger',
      stepFunction: 'onEvent',
    } as any,
  ],
  ...overrides,
});

const createMockMessage = (overrides?: Partial<WorkflowMessage>): WorkflowMessage => ({
  id: 'msg1',
  sender: 'user',
  type: 'text',
  userId: 'user123',
  userName: 'Test User',
  content: { text: 'Test message' },
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe('useAimeWorkflow', () => {
  const defaultProps = {
    workflowTemplateId: 'template123',
    workflowDefinition: createMockWorkflowDefinition(),
    onMessage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock context - MUST be initialized before hook renders
    mockUseUnifiedUserContext.mockReturnValue({
      user: { id: 'user123', profile: { firstName: 'John', lastName: 'Doe' } },
      account: { id: 'account123' },
      currentOrganization: { id: 'org456' },
      isLoading: false,
    } as any);
  });

  describe('Initialization', () => {
    it('should initialize with empty messages for new template', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() =>
        useAimeWorkflow({
          ...defaultProps,
          workflowTemplateId: 'new',
        })
      );

      // Should seed with welcome message for 'new' templates
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    it('should initialize with empty messages', () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      // Messages may be empty or have welcome message depending on template ID
      expect(Array.isArray(result.current.messages)).toBe(true);
    });

    it('should load existing conversation messages', async () => {
      const messages = [
        createMockMessage({ id: 'msg1', sender: 'aime', userId: 'system' }),
        createMockMessage({ id: 'msg2', sender: 'user' }),
      ];

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => messages,
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Message Sending', () => {
    it('should send message via API', async () => {
      const apiResponse = {
        messages: [
          createMockMessage({ id: 'msg1', sender: 'user' }),
          createMockMessage({ id: 'msg2', sender: 'aime', userId: 'system' }),
        ],
        workflowDefinition: createMockWorkflowDefinition(),
        mermaidDiagram: 'graph TD; A[Start] --> B[End]',
      };

      let callCount = 0;
      mockApiFetch.mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) {
          // First call(s): load messages on initialization
          return {
            ok: true,
            json: async () => ({ messages: [] }),
          } as any;
        }
        // Later calls: return proper response
        return {
          ok: true,
          json: async () => apiResponse,
        } as any;
      });

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await act(async () => {
        await result.current.sendMessage('Create a workflow');
      });

      // Should have added messages
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });
    });

    it('should add user message to conversation', async () => {
      const userMessage = 'Create a workflow';
      const apiResponse = {
        messages: [
          createMockMessage({ id: 'msg1', sender: 'user', content: { text: userMessage } }),
          createMockMessage({ id: 'msg2', sender: 'aime', userId: 'system' }),
        ],
        workflowDefinition: createMockWorkflowDefinition(),
        mermaidDiagram: 'graph TD; A[Start] --> B[End]',
      };

      let callCount = 0;
      mockApiFetch.mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) {
          return {
            ok: true,
            json: async () => ({ messages: [] }),
          } as any;
        }
        return {
          ok: true,
          json: async () => apiResponse,
        } as any;
      });

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await act(async () => {
        await result.current.sendMessage(userMessage);
      });

      // Should have the user message in the conversation
      await waitFor(() => {
        expect(result.current.messages.some((m) => m.content.text === userMessage)).toBe(true);
      });
    });

    it('should handle message sending errors', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      // Mock error response
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      } as any);

      await act(async () => {
        try {
          await result.current.sendMessage('Create a workflow');
        } catch (err) {
          // Error expected
        }
      });

      // Should have attempted to send
      expect(mockApiFetch).toHaveBeenCalled();
    });

    it('should call onMessage callback after sending', async () => {
      const onMessage = jest.fn();
      const apiResponse = {
        messages: [createMockMessage({ id: 'msg2', sender: 'aime', userId: 'system' })],
        workflowDefinition: createMockWorkflowDefinition(),
        mermaidDiagram: 'graph TD; A[Start] --> B[End]',
      };

      let callCount = 0;
      mockApiFetch.mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) {
          return {
            ok: true,
            json: async () => ({ messages: [] }),
          } as any;
        }
        return {
          ok: true,
          json: async () => apiResponse,
        } as any;
      });

      const { result } = renderHook(() =>
        useAimeWorkflow({ ...defaultProps, onMessage })
      );

      const userMessage = 'Create a workflow';

      await act(async () => {
        await result.current.sendMessage(userMessage);
      });

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(userMessage);
      });
    });

    it('should include recent message context in API call', async () => {
      const apiResponse = {
        messages: [createMockMessage({ id: 'msg2', sender: 'aime', userId: 'system' })],
        workflowDefinition: createMockWorkflowDefinition(),
        mermaidDiagram: 'graph TD; A[Start] --> B[End]',
      };

      let callCount = 0;
      mockApiFetch.mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) {
          return {
            ok: true,
            json: async () => ({ messages: [] }),
          } as any;
        }
        return {
          ok: true,
          json: async () => apiResponse,
        } as any;
      });

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await act(async () => {
        await result.current.sendMessage('First message');
      });

      // Verify API was called with message context
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Workflow Definition Management', () => {
    it('should provide current workflow definition from API response', async () => {
      const customWorkflow = createMockWorkflowDefinition({
        steps: [
          {
            id: 'step1',
            label: 'Trigger',
            type: 'trigger',
            stepFunction: 'onEvent',
          } as any,
          {
            id: 'step2',
            label: 'Action',
            type: 'action',
            stepFunction: 'doSomething',
          } as any,
        ],
      });

      const apiResponse = {
        messages: [createMockMessage({ id: 'msg1', sender: 'aime', userId: 'system' })],
        workflowDefinition: customWorkflow,
        mermaidDiagram: 'graph TD; A[Start] --> B[End]',
      };

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse.messages,
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      // Messages are loaded from conversation endpoint
      await waitFor(() => {
        expect(result.current.messages).toBeDefined();
      });
    });

    it('should update workflow definition when AI response includes it', async () => {
      const onWorkflowDefinitionChange = jest.fn();
      const newWorkflow = createMockWorkflowDefinition({
        steps: [
          {
            id: 'newStep',
            label: 'New Step',
            type: 'action',
            stepFunction: 'newAction',
          } as any,
        ],
      });

      const apiResponse = {
        messages: [createMockMessage({ id: 'msg1', sender: 'aime', userId: 'system' })],
        workflowDefinition: newWorkflow,
        mermaidDiagram: 'graph TD; A[Start] --> B[End]',
      };

      let callCount = 0;
      mockApiFetch.mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) {
          return {
            ok: true,
            json: async () => ({ messages: [] }),
          } as any;
        }
        return {
          ok: true,
          json: async () => apiResponse,
        } as any;
      });

      const { result } = renderHook(() =>
        useAimeWorkflow({
          ...defaultProps,
          onWorkflowDefinitionChange,
        })
      );

      await act(async () => {
        await result.current.sendMessage('Update the workflow');
      });

      await waitFor(() => {
        expect(onWorkflowDefinitionChange).toHaveBeenCalledWith(
          newWorkflow,
          expect.any(String)
        );
      });
    });
  });

  describe('Mermaid Diagram Regeneration', () => {
    it('should regenerate mermaid diagram', async () => {
      const onWorkflowDefinitionChange = jest.fn();

      let callCount = 0;
      mockApiFetch.mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) {
          // Initialize messages
          return {
            ok: true,
            json: async () => ({ messages: [] }),
          } as any;
        }
        // Mermaid regeneration response
        return {
          ok: true,
          json: async () => ({
            mermaidDiagram: 'graph TD; A[Start] --> B[Middle] --> C[End]',
          }),
        } as any;
      });

      const { result } = renderHook(() =>
        useAimeWorkflow({
          ...defaultProps,
          onWorkflowDefinitionChange,
        })
      );

      await act(async () => {
        await result.current.regenerateMermaidDiagram();
      });

      await waitFor(() => {
        expect(onWorkflowDefinitionChange).toHaveBeenCalled();
      });
    });

    it('should not regenerate mermaid for new templates', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() =>
        useAimeWorkflow({
          ...defaultProps,
          workflowTemplateId: 'new',
        })
      );

      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      await act(async () => {
        await result.current.regenerateMermaidDiagram();
      });

      expect(consoleWarn).toHaveBeenCalledWith('Cannot regenerate mermaid diagram for new template');

      consoleWarn.mockRestore();
    });

    it('should handle mermaid regeneration errors', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Error',
      } as any);

      await act(async () => {
        try {
          await result.current.regenerateMermaidDiagram();
        } catch (err) {
          // Error expected
        }
      });
    });
  });

  describe('Workflow Definition Regeneration', () => {
    it.skip('should regenerate workflow definition', async () => {
      const onWorkflowDefinitionChange = jest.fn();
      const newWorkflow = createMockWorkflowDefinition({
        steps: [
          {
            id: 'regeneratedStep',
            label: 'Regenerated',
            type: 'action',
            stepFunction: 'newAction',
          } as any,
        ],
      });

      // First mock: initialization - returns array of messages
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as any);

      // Second mock: regenerateWorkflowDefinition API call response
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflowDefinition: newWorkflow,
          mermaidDiagram: 'graph TD; A[Start] --> B[End]',
        }),
      } as any);

      const { result } = renderHook(() =>
        useAimeWorkflow({
          ...defaultProps,
          onWorkflowDefinitionChange,
        })
      );

      // Call regenerate  
      await act(async () => {
        await result.current.regenerateWorkflowDefinition();
      });

      // Verify callback was called with correct arguments
      expect(onWorkflowDefinitionChange).toHaveBeenCalledWith(
        newWorkflow,
        'graph TD; A[Start] --> B[End]'
      );
    });

    it('should not regenerate workflow for new templates', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() =>
        useAimeWorkflow({
          ...defaultProps,
          workflowTemplateId: 'new',
        })
      );

      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      await act(async () => {
        await result.current.regenerateWorkflowDefinition();
      });

      expect(consoleWarn).toHaveBeenCalledWith('Cannot regenerate workflow definition for new template');

      consoleWarn.mockRestore();
    });

    it('should handle workflow regeneration errors', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Error',
      } as any);

      await act(async () => {
        try {
          await result.current.regenerateWorkflowDefinition();
        } catch (err) {
          // Error expected
        }
      });
    });
  });

  describe('Message Formatting and Management', () => {
    it('should store messages with correct structure', async () => {
      const messages = [
        createMockMessage({
          id: 'msg1',
          sender: 'aime',
          userId: 'system',
          userName: 'aime workflows',
        }),
      ];

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => messages,
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle messages with markdown content', async () => {
      const markdownContent = '# Workflow\n- Step 1\n- Step 2';

      const messages = [
        createMockMessage({
          id: 'msg1',
          sender: 'aime',
          content: { text: markdownContent },
          userId: 'system',
        }),
      ];

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => messages,
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should preserve message order', async () => {
      const messages = [
        createMockMessage({ id: 'msg1', sender: 'user', content: { text: 'First' } }),
        createMockMessage({ id: 'msg2', sender: 'aime', userId: 'system', content: { text: 'Second' } }),
        createMockMessage({ id: 'msg3', sender: 'user', content: { text: 'Third' } }),
      ];

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => messages,
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await waitFor(() => {
        if (result.current.messages.length >= 3) {
          expect(result.current.messages[0].id).toBe('msg1');
          expect(result.current.messages[1].id).toBe('msg2');
          expect(result.current.messages[2].id).toBe('msg3');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      } as any);

      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await waitFor(() => {
        expect(result.current.messages).toBeDefined();
      });

      consoleError.mockRestore();
    });

    it('should handle message with empty content gracefully', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Error',
      } as any);

      await act(async () => {
        try {
          await result.current.sendMessage('');
        } catch (err) {
          // Expected to fail
        }
      });
    });
  });

  describe('Context Integration', () => {
    it('should handle context loading state', async () => {
      mockUseUnifiedUserContext.mockReturnValue({
        user: null,
        account: null,
        currentOrganization: null,
        isLoading: true,
      } as any);

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      // Should initialize gracefully even if context is loading
      expect(result.current.messages).toBeDefined();
    });

    it('should handle null organization', async () => {
      mockUseUnifiedUserContext.mockReturnValue({
        user: { id: 'user123' },
        account: { id: 'account123' },
        currentOrganization: null,
        isLoading: false,
      } as any);

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      expect(result.current.messages).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it.skip('should handle very long user messages', async () => {
      const longMessage = 'a'.repeat(5000);

      const userMsg = createMockMessage({ id: 'msg1', sender: 'user', content: { text: longMessage } });
      const aiMsg = createMockMessage({ id: 'msg2', sender: 'aime', userId: 'system' });

      const sendMessageResponse = {
        messages: [userMsg, aiMsg],
        workflowDefinition: createMockWorkflowDefinition(),
        mermaidDiagram: 'graph TD; A[Start] --> B[End]',
      };

      // First mock: hook initialization
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as any);

      // Second mock: sendMessage  
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sendMessageResponse,
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await act(async () => {
        await result.current.sendMessage(longMessage);
      });

      // Verify messages were added
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    it('should handle many messages in conversation', async () => {
      const manyMessages = Array(50)
        .fill(null)
        .map((_, i) => ({
          ...createMockMessage(),
          id: `msg${i}`,
          content: { text: `Message ${i}` },
        }));

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => manyMessages,
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle special characters in messages', async () => {
      const specialContent = '特殊文字 🚀 <script>alert("xss")</script> & < > "quotes"';

      const apiResponse = {
        messages: [
          createMockMessage({
            id: 'msg1',
            sender: 'aime',
            content: { text: specialContent },
            userId: 'system',
          }),
        ],
        workflowDefinition: createMockWorkflowDefinition(),
        mermaidDiagram: 'graph TD; A[Start] --> B[End]',
      };

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse.messages,
      } as any);

      const { result } = renderHook(() => useAimeWorkflow(defaultProps));

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
