// src/test/app/utils/parameter-collection-system.test.ts
import { ParameterCollectionSystem } from '@/app/utils/parameter-collection-system';
import { ConversationStateManager } from '@/app/utils/conversation-manager';
import { createEmptyConversationState } from '@/app/types/conversation';

describe('ParameterCollectionSystem', () => {
  let parameterSystem: ParameterCollectionSystem;
  let conversationManager: ConversationStateManager;

  beforeEach(() => {
    parameterSystem = new ParameterCollectionSystem();
    
    const conversationState = createEmptyConversationState(
      'test-conv-123',
      {
        workflowId: 'test-workflow-456',
        userRole: 'event_coordinator',
        userDepartment: 'events',
        availableFunctions: ['onMRFSubmit', 'requestApproval', 'createEvent'],
        conversationGoal: 'create'
      }
    );
    
    conversationManager = new ConversationStateManager(conversationState);
  });

  describe('startParameterCollection', () => {
    it('should start parameter collection for onMRFSubmit trigger', async () => {
      const context = {
        conversationId: 'test-conv-123',
        workflowId: 'test-workflow-456',
        stepId: 'start',
        functionName: 'onMRFSubmit',
        stepType: 'trigger' as const,
        currentValues: {}
      };

      const result = await parameterSystem.startParameterCollection(
        context,
        conversationManager
      );

      expect(result.success).toBe(true);
      expect(result.parameters).toBeDefined();
      expect(result.missingParameters.length).toBeGreaterThan(0);
      
      // Should have added messages to conversation
      const messages = conversationManager.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      
      // Should include function description and parameter request
      const messageContents = messages.map(m => m.content).join(' ');
      expect(messageContents).toContain('onMRFSubmit');
    });

    it('should start parameter collection for requestApproval action', async () => {
      const context = {
        conversationId: 'test-conv-123',
        workflowId: 'test-workflow-456',
        stepId: 'approval',
        functionName: 'requestApproval',
        stepType: 'action' as const,
        currentValues: {}
      };

      const result = await parameterSystem.startParameterCollection(
        context,
        conversationManager
      );

      expect(result.success).toBe(true);
      expect(result.missingParameters).toContain('to'); // 'to' parameter is required
      
      const messages = conversationManager.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      
      // Should ask for email parameter
      const messageContents = messages.map(m => m.content).join(' ');
      expect(messageContents).toContain('to');
    });
  });

  describe('handleParameterResponse', () => {
    it('should handle MRF selection response', async () => {
      // First start collection
      const context = {
        conversationId: 'test-conv-123',
        workflowId: 'test-workflow-456',
        stepId: 'start',
        functionName: 'onMRFSubmit',
        stepType: 'trigger' as const,
        currentValues: {}
      };

      await parameterSystem.startParameterCollection(context, conversationManager);
      
      // Then respond with MRF selection
      const collectionId = `${context.conversationId}_${context.stepId}`;
      const result = await parameterSystem.handleParameterResponse(
        collectionId,
        'mrfID',
        'MRF_2024_001',
        conversationManager
      );

      expect(result.success).toBe(true);
      expect(result.parameters.mrfID).toBe('MRF_2024_001');
      
      // Should confirm the selection
      const messages = conversationManager.getMessages();
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.content).toContain('configured');
    });

    it('should handle validation errors gracefully', async () => {
      const context = {
        conversationId: 'test-conv-123',
        workflowId: 'test-workflow-456',
        stepId: 'approval',
        functionName: 'requestApproval',
        stepType: 'action' as const,
        currentValues: {}
      };

      await parameterSystem.startParameterCollection(context, conversationManager);
      
      const collectionId = `${context.conversationId}_${context.stepId}`;
      
      // Provide invalid email
      const result = await parameterSystem.handleParameterResponse(
        collectionId,
        'to',
        'invalid-email',
        conversationManager
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('MRF forms integration', () => {
    it('should provide MRF form choices', async () => {
      const context = {
        conversationId: 'test-conv-123',
        workflowId: 'test-workflow-456',
        stepId: 'start',
        functionName: 'onMRFSubmit',
        stepType: 'trigger' as const,
        currentValues: {}
      };

      const result = await parameterSystem.startParameterCollection(
        context,
        conversationManager
      );

      expect(result.success).toBe(true);
      
      // Check that conversation includes MRF form options
      const messages = conversationManager.getMessages();
      const messageContents = messages.map(m => m.content).join(' ');
      
      // Should mention MRF forms or provide choices
      expect(
        messageContents.includes('MRF') || 
        messageContents.includes('form') ||
        messageContents.includes('choose')
      ).toBe(true);
    });
  });

  describe('parameter validation', () => {
    it('should validate email parameters', async () => {
      const context = {
        conversationId: 'test-conv-123',
        workflowId: 'test-workflow-456',
        stepId: 'approval',
        functionName: 'requestApproval',
        stepType: 'action' as const,
        currentValues: {}
      };

      await parameterSystem.startParameterCollection(context, conversationManager);
      
      const collectionId = `${context.conversationId}_${context.stepId}`;
      
      // Test valid email
      const validResult = await parameterSystem.handleParameterResponse(
        collectionId,
        'to',
        'manager@groupize.com',
        conversationManager
      );

      expect(validResult.validationErrors.length).toBe(0);
      
      // Test invalid email  
      const invalidResult = await parameterSystem.handleParameterResponse(
        collectionId,
        'to',
        'not-an-email',
        conversationManager
      );

      expect(invalidResult.validationErrors.length).toBeGreaterThan(0);
    });

    it('should handle required vs optional parameters', async () => {
      const context = {
        conversationId: 'test-conv-123',
        workflowId: 'test-workflow-456',
        stepId: 'approval',
        functionName: 'requestApproval',
        stepType: 'action' as const,
        currentValues: {}
      };

      const result = await parameterSystem.startParameterCollection(
        context,
        conversationManager
      );

      expect(result.missingParameters).toContain('to'); // Required parameter
      expect(result.missingParameters).not.toContain('cc'); // Optional parameter
    });
  });

  describe('conversation flow', () => {
    it('should provide helpful guidance throughout parameter collection', async () => {
      const context = {
        conversationId: 'test-conv-123',
        workflowId: 'test-workflow-456',
        stepId: 'start',
        functionName: 'onMRFSubmit',
        stepType: 'trigger' as const,
        currentValues: {}
      };

      await parameterSystem.startParameterCollection(context, conversationManager);
      
      const messages = conversationManager.getMessages();
      
      // Should have multiple helpful messages
      expect(messages.length).toBeGreaterThanOrEqual(2);
      
      // Should include function description
      const hasDescription = messages.some(m => 
        m.content.includes('onMRFSubmit') || 
        m.content.includes('trigger')
      );
      expect(hasDescription).toBe(true);
      
      // Should ask for parameter values
      const hasParameterRequest = messages.some(m => 
        m.content.includes('parameter') || 
        m.content.includes('value') ||
        m.content.includes('choose')
      );
      expect(hasParameterRequest).toBe(true);
    });
  });
});