// src/test/utils/conversation-manager.test.ts
import { ConversationStateManager, MultiConversationStateManager } from '@/app/utils/conversation-manager';
import { createEmptyConversationState } from '@/app/types/conversation';
import type { ConversationContext, ConversationMessage } from '@/app/types/conversation';

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ConversationStateManager', () => {
  let manager: ConversationStateManager;
  let mockContext: ConversationContext;

  beforeEach(() => {
    const initialState = createEmptyConversationState('test-workflow', {
      workflowId: 'test-workflow',
      workflowName: 'Test Workflow',
      userRole: 'admin',
      userDepartment: 'operations',
      availableFunctions: ['testFunction'],
      conversationGoal: 'create'
    });
    
    manager = new ConversationStateManager(initialState);
    mockContext = initialState.context;
    
    // Clear localStorage mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('Message Management', () => {
    test('should add user message correctly', () => {
      const message = manager.addUserMessage('Hello, aime!');
      
      expect(message.sender).toBe('user');
      expect(message.content).toBe('Hello, aime!');
      expect(message.status).toBe('complete');
      expect(message.type).toBe('text');
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    test('should add aime message correctly', () => {
      const message = manager.addAimeMessage('Hello! How can I help?', 'text');
      
      expect(message.sender).toBe('aime');
      expect(message.content).toBe('Hello! How can I help?');
      expect(message.status).toBe('streaming');
      expect(message.type).toBe('text');
    });

    test('should update message correctly', () => {
      const message = manager.addUserMessage('Test message');
      const updated = manager.updateMessage(message.id, { 
        content: 'Updated message',
        status: 'complete'
      });
      
      expect(updated).toBe(true);
      
      const updatedMessage = manager.getMessageById(message.id);
      expect(updatedMessage?.content).toBe('Updated message');
      expect(updatedMessage?.status).toBe('complete');
    });

    test('should delete message correctly', () => {
      const message = manager.addUserMessage('To be deleted');
      const initialCount = manager.getMessages().length;
      
      const deleted = manager.deleteMessage(message.id);
      
      expect(deleted).toBe(true);
      expect(manager.getMessages().length).toBe(initialCount - 1);
      expect(manager.getMessageById(message.id)).toBeUndefined();
    });

    test('should return false when updating non-existent message', () => {
      const updated = manager.updateMessage('non-existent', { content: 'test' });
      expect(updated).toBe(false);
    });
  });

  describe('Streaming Management', () => {
    test('should start and stop streaming correctly', () => {
      const message = manager.addAimeMessage('Streaming message');
      
      manager.startStreaming(message.id);
      expect(manager.isCurrentlyStreaming()).toBe(true);
      expect(manager.getCurrentStreamId()).toBe(message.id);
      
      manager.stopStreaming(message.id);
      expect(manager.isCurrentlyStreaming()).toBe(false);
      expect(manager.getCurrentStreamId()).toBeUndefined();
    });

    test('should update message status during streaming', () => {
      const message = manager.addAimeMessage('Test');
      
      manager.startStreaming(message.id);
      const streamingMessage = manager.getMessageById(message.id);
      expect(streamingMessage?.status).toBe('streaming');
      
      manager.stopStreaming(message.id);
      const completedMessage = manager.getMessageById(message.id);
      expect(completedMessage?.status).toBe('complete');
    });
  });

  describe('Context Management', () => {
    test('should update context correctly', () => {
      const updates = { userRole: 'manager', workflowName: 'Updated Workflow' };
      
      manager.updateContext(updates);
      const context = manager.getContext();
      
      expect(context.userRole).toBe('manager');
      expect(context.workflowName).toBe('Updated Workflow');
      expect(context.workflowId).toBe(mockContext.workflowId); // Should preserve other fields
    });

    test('should return context copy to prevent mutation', () => {
      const context1 = manager.getContext();
      const context2 = manager.getContext();
      
      expect(context1).toEqual(context2);
      expect(context1).not.toBe(context2); // Different object references
    });
  });

  describe('Suggestions Management', () => {
    test('should add and retrieve suggestions correctly', () => {
      const message = manager.addAimeMessage('Test message');
      const suggestions = [
        {
          id: 'suggestion-1',
          type: 'function' as const,
          title: 'Use requestApproval',
          description: 'Add approval step',
          actionText: '@requestApproval',
          priority: 'high' as const
        }
      ];
      
      const updated = manager.addSuggestions(message.id, suggestions);
      expect(updated).toBe(true);
      
      const retrievedSuggestions = manager.getSuggestions(message.id);
      expect(retrievedSuggestions).toEqual(suggestions);
    });

    test('should return empty array for non-existent message suggestions', () => {
      const suggestions = manager.getSuggestions('non-existent');
      expect(suggestions).toEqual([]);
    });
  });

  describe('Autosave Functionality', () => {
    test('should schedule autosave after message addition', async () => {
      manager.setAutosaveDelay(100); // Short delay for testing
      
      manager.addUserMessage('Test message');
      
      // Wait for autosave to trigger
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    test('should respect autosave enabled/disabled setting', () => {
      manager.setAutosaveEnabled(false);
      manager.addUserMessage('Test message');
      
      // Should not trigger autosave
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Behavior Metrics', () => {
    test('should track message count correctly', () => {
      manager.addUserMessage('Message 1');
      manager.addAimeMessage('Response 1');
      manager.addUserMessage('Message 2');
      
      const metrics = manager.getBehaviorMetrics();
      expect(metrics.messageCount).toBe(3);
    });

    test('should track function usage', () => {
      const message = manager.addAimeMessage('Used functions');
      manager.updateMessage(message.id, {
        metadata: { functionsCalled: ['requestApproval', 'createEvent'] }
      });
      
      const metrics = manager.getBehaviorMetrics();
      expect(metrics.functionsUsedCount.requestApproval).toBe(1);
      expect(metrics.functionsUsedCount.createEvent).toBe(1);
    });
  });
});

describe('MultiConversationStateManager', () => {
  let multiManager: MultiConversationStateManager;
  let mockContext: ConversationContext;

  beforeEach(() => {
    multiManager = new MultiConversationStateManager();
    mockContext = {
      workflowId: 'test-workflow',
      workflowName: 'Test Workflow',
      userRole: 'admin',
      userDepartment: 'operations',
      availableFunctions: ['testFunction'],
      conversationGoal: 'create'
    };
  });

  describe('Conversation Lifecycle', () => {
    test('should create new conversation correctly', () => {
      const conversation = multiManager.createConversation('workflow-1', mockContext);
      
      expect(conversation.workflowId).toBe('workflow-1');
      expect(conversation.context).toEqual(mockContext);
      expect(conversation.conversationId).toBeDefined();
      expect(multiManager.getConversationCount()).toBe(1);
    });

    test('should switch between conversations correctly', () => {
      const conv1 = multiManager.createConversation('workflow-1', mockContext);
      const conv2 = multiManager.createConversation('workflow-2', { ...mockContext, workflowId: 'workflow-2' });
      
      // Should start with conv2 as current (most recent)
      expect(multiManager.currentConversationId).toBe(conv2.conversationId);
      
      // Switch to conv1
      const switched = multiManager.switchConversation(conv1.conversationId);
      expect(switched).toBe(true);
      expect(multiManager.currentConversationId).toBe(conv1.conversationId);
    });

    test('should return false when switching to non-existent conversation', () => {
      const switched = multiManager.switchConversation('non-existent');
      expect(switched).toBe(false);
    });

    test('should close conversation correctly', () => {
      const conv1 = multiManager.createConversation('workflow-1', mockContext);
      const conv2 = multiManager.createConversation('workflow-2', { ...mockContext, workflowId: 'workflow-2' });
      
      const closed = multiManager.closeConversation(conv1.conversationId);
      expect(closed).toBe(true);
      expect(multiManager.getConversationCount()).toBe(1);
      expect(multiManager.activeConversations[conv1.conversationId]).toBeUndefined();
    });

    test('should switch to another conversation when current is closed', () => {
      const conv1 = multiManager.createConversation('workflow-1', mockContext);
      const conv2 = multiManager.createConversation('workflow-2', { ...mockContext, workflowId: 'workflow-2' });
      
      // Close current conversation (conv2)
      multiManager.closeConversation(conv2.conversationId);
      
      // Should automatically switch to conv1
      expect(multiManager.currentConversationId).toBe(conv1.conversationId);
    });
  });

  describe('Conversation Management', () => {
    test('should get current conversation correctly', () => {
      const conversation = multiManager.createConversation('workflow-1', mockContext);
      const current = multiManager.getCurrentConversation();
      
      expect(current).toEqual(conversation);
    });

    test('should get conversation manager correctly', () => {
      const conversation = multiManager.createConversation('workflow-1', mockContext);
      const manager = multiManager.getCurrentManager();
      
      expect(manager).toBeInstanceOf(ConversationStateManager);
      expect(manager?.getState().conversationId).toBe(conversation.conversationId);
    });

    test('should return null for non-existent conversation manager', () => {
      const manager = multiManager.getConversationManager('non-existent');
      expect(manager).toBeNull();
    });

    test('should get all conversations correctly', () => {
      multiManager.createConversation('workflow-1', mockContext);
      multiManager.createConversation('workflow-2', { ...mockContext, workflowId: 'workflow-2' });
      
      const allConversations = multiManager.getAllConversations();
      expect(allConversations.length).toBe(2);
    });
  });

  describe('Conversation Limits', () => {
    test('should enforce max active conversations', () => {
      multiManager.setMaxActiveConversations(2);
      
      const conv1 = multiManager.createConversation('workflow-1', mockContext);
      const conv2 = multiManager.createConversation('workflow-2', { ...mockContext, workflowId: 'workflow-2' });
      const conv3 = multiManager.createConversation('workflow-3', { ...mockContext, workflowId: 'workflow-3' });
      
      // Should only have 2 conversations (oldest should be removed)
      expect(multiManager.getConversationCount()).toBe(2);
      expect(multiManager.activeConversations[conv1.conversationId]).toBeUndefined();
      expect(multiManager.activeConversations[conv2.conversationId]).toBeDefined();
      expect(multiManager.activeConversations[conv3.conversationId]).toBeDefined();
    });

    test('should respect minimum of 1 max conversation', () => {
      multiManager.setMaxActiveConversations(0); // Should be adjusted to 1
      
      multiManager.createConversation('workflow-1', mockContext);
      multiManager.createConversation('workflow-2', { ...mockContext, workflowId: 'workflow-2' });
      
      expect(multiManager.getConversationCount()).toBe(1);
    });
  });

  describe('Conversation History', () => {
    test('should maintain conversation history order', () => {
      const conv1 = multiManager.createConversation('workflow-1', mockContext);
      const conv2 = multiManager.createConversation('workflow-2', { ...mockContext, workflowId: 'workflow-2' });
      
      expect(multiManager.conversationHistory[0]).toBe(conv2.conversationId);
      expect(multiManager.conversationHistory[1]).toBe(conv1.conversationId);
      
      // Switch to conv1 - should move to front
      multiManager.switchConversation(conv1.conversationId);
      expect(multiManager.conversationHistory[0]).toBe(conv1.conversationId);
      expect(multiManager.conversationHistory[1]).toBe(conv2.conversationId);
    });
  });
});