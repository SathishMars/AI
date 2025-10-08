// src/test/app/utils/conversational-workflow-generator.test.ts
import { ConversationalWorkflowGenerator } from '@/app/utils/conversational-workflow-generator';
import { CreationContext } from '@/app/types/workflow-creation';
import { ConversationStateManager } from '@/app/utils/conversation-manager';

describe('ConversationalWorkflowGenerator', () => {
  let generator: ConversationalWorkflowGenerator;
  let mockConversationManager: jest.Mocked<ConversationStateManager>;

  beforeEach(() => {
    generator = new ConversationalWorkflowGenerator();
    mockConversationManager = {
      addAimeMessage: jest.fn(),
      addUserMessage: jest.fn(),
      getMessages: jest.fn(() => []),
      clearMessages: jest.fn(),
      getConversationContext: jest.fn(() => ({ workflowId: 'test', userRole: 'admin', userDepartment: 'IT', availableFunctions: [], conversationGoal: 'create' }))
    } as unknown as jest.Mocked<ConversationStateManager>;
  });

  describe('generateWithConversation', () => {
    it('should generate MRF approval workflow with conversational response', async () => {
      const userInput = 'Create a workflow for MRF approval process';
      const context: CreationContext = {
        workflowId: 'workflow-456',
        workflowName: 'Test Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'create'
      };

      const result = await generator.generateWithConversation(
        userInput,
        context,
        undefined,
        mockConversationManager
      );

  // Check that workflow was generated
  expect(result.workflowUpdate).toBeDefined();
  expect(result.workflowUpdate?.metadata?.name).toBe('MRF Approval Workflow');
  expect(Array.isArray(result.workflowUpdate?.steps)).toBe(true);
  expect(result.workflowUpdate?.steps?.length).toBeGreaterThan(0);
  const triggerStep = result.workflowUpdate?.steps?.[0];
  expect(triggerStep?.action).toBe('onMRFSubmit');
      
      // Check that conversational response was generated
      expect(result.conversationalResponse.toLowerCase()).toContain('mrf approval workflow');
      expect(result.conversationalResponse.length).toBeGreaterThan(50);
      
      // Check that follow-up questions were generated
  expect(result.followUpQuestions.length).toBeGreaterThanOrEqual(3);
  expect(result.followUpQuestions.some(question => question.includes('MRF form'))).toBe(true);
  expect(result.followUpQuestions.some(question => question.includes('approval request'))).toBe(true);
      
      // Check that parameter collection is needed
      expect(result.parameterCollectionNeeded).toBe(true);
      
      // Check that next steps are provided
  expect(result.nextSteps[0]).toContain('On MRF Submission');
      
      // Check that conversation manager was called
      expect(mockConversationManager.addAimeMessage).toHaveBeenCalledWith(
        expect.stringContaining('mrf approval workflow'),
        'text'
      );
    });

    it('should generate scheduled workflow with conversational response', async () => {
      const userInput = 'Set up a reminder workflow that runs every Monday';
      const context: CreationContext = {
        workflowId: 'workflow-789',
        workflowName: 'Test Scheduled Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'create'
      };

      const result = await generator.generateWithConversation(
        userInput,
        context,
        undefined,
        mockConversationManager
      );

      // Check that scheduled workflow was generated
      expect(result.workflowUpdate).toBeDefined();
      expect(result.workflowUpdate?.metadata?.name).toBe('Scheduled Workflow');
  const scheduledTrigger = result.workflowUpdate?.steps?.find(step => step.id === 'scheduledTrigger');
  expect(scheduledTrigger?.action).toBe('onScheduledEvent');
      
      // Check conversational response
      expect(result.conversationalResponse.toLowerCase()).toContain('scheduled workflow');
      
      // Check follow-up questions
      expect(result.followUpQuestions).toContain('⏰ When should this workflow run? I can help you set up a schedule.');
      
      // Check parameter collection needed
      expect(result.parameterCollectionNeeded).toBe(true);
    });

    it('should generate notification workflow with conversational response', async () => {
      const userInput = 'Send email notifications when events are created';
      const context: CreationContext = {
        workflowId: 'workflow-012',
        workflowName: 'Test Notification Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'create'
      };

      const result = await generator.generateWithConversation(
        userInput,
        context,
        undefined,
        mockConversationManager
      );

      // Check that notification workflow was generated
      expect(result.workflowUpdate).toBeDefined();
      expect(result.workflowUpdate?.metadata?.name).toBe('Notification Workflow');
      const notificationStep = result.workflowUpdate?.steps?.flatMap(step => [
        step,
        ...(step.children ?? []),
        step.onSuccess ?? [],
        step.onFailure ?? []
      ]).find(step => step?.id === 'sendNotificationStep');
      expect(notificationStep?.action).toBe('sendNotification');
      
      // Check conversational response
      expect(result.conversationalResponse.toLowerCase()).toContain('notification workflow');
      
      // Check follow-up questions include notification configuration
      expect(result.followUpQuestions.some(q => q.includes('notifications'))).toBe(true);
    });

    it('should identify incomplete steps correctly', async () => {
      const userInput = 'Create approval workflow';
      const context: CreationContext = {
        workflowId: 'workflow-identify',
        workflowName: 'Test Identify Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'create'
      };

      const result = await generator.generateWithConversation(
        userInput,
        context,
        undefined,
        mockConversationManager
      );

      // All steps should have empty params, so parameter collection is needed
      expect(result.parameterCollectionNeeded).toBe(true);
      
      // Should have multiple follow-up questions for different steps
      expect(result.followUpQuestions.length).toBeGreaterThan(0);
      
      // Next steps should include configuration tasks
      expect(result.nextSteps.some(step => step.includes('Configure'))).toBe(true);
    });

    it('should determine creation phase correctly', async () => {
      const userInput = 'Simple trigger workflow';
      const context: CreationContext = {
        workflowId: 'workflow-phase',
        workflowName: 'Test Phase Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'create'
      };

      const result = await generator.generateWithConversation(
        userInput,
        context,
        undefined,
        mockConversationManager
      );

      // Should start with trigger definition phase
      expect(result.phase).toBe('trigger_definition');
    });

    it('should update existing workflow', async () => {
      const userInput = 'Add email notification step';
      const context: CreationContext = {
        workflowId: 'workflow-update',
        workflowName: 'Test Update Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'edit'
      };
      
      const existingWorkflow = {
        metadata: {
          id: 'existing-workflow',
          name: 'Existing Workflow',
          version: '1.0.0',
          status: 'draft' as const,
          tags: ['test'],
          createdAt: new Date()
        },
        steps: [
          {
            id: 'start',
            name: 'Start: On MRF Submit',
            type: 'trigger' as const,
            action: 'onMRFSubmit',
            params: { mrfID: 'test-123' },
            onSuccess: {
              id: 'end',
              name: 'End: Workflow Complete',
              type: 'end' as const,
              result: 'success'
            }
          }
        ]
      };

      const result = await generator.generateWithConversation(
        userInput,
        context,
        existingWorkflow,
        mockConversationManager
      );

      // Should generate new workflow structure (existing logic creates new workflow)
      expect(result.workflowUpdate).toBeDefined();
      expect(result.conversationalResponse).toContain('workflow');
    });

    it('should handle workflow completion scenario', async () => {
      const userInput = 'Simple workflow';
      const context: CreationContext = {
        workflowId: 'workflow-complete',
        workflowName: 'Test Complete Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'create'
      };

      // Simulate workflow with all parameters filled
      const completeWorkflow = {
        metadata: {
          id: 'complete-workflow',
          name: 'Complete Workflow',
          version: '1.0.0',
          status: 'draft' as const,
          tags: ['test'],
          createdAt: new Date()
        },
        steps: [
          {
            id: 'start',
            name: 'Start: On MRF Submit',
            type: 'trigger' as const,
            action: 'onMRFSubmit',
            params: { mrfID: 'test-123' },
            onSuccess: {
              id: 'end',
              name: 'End: Workflow Complete',
              type: 'end' as const,
              result: 'success'
            }
          }
        ]
      };

      const result = await generator.generateWithConversation(
        userInput,
        context,
        completeWorkflow,
        mockConversationManager
      );

      // Should still generate conversational response
      expect(result.conversationalResponse).toBeDefined();
      expect(result.followUpQuestions).toBeDefined();
    });
  });

  describe('workflow generation patterns', () => {
    it('should generate appropriate workflow based on keywords', async () => {
      const testCases = [
        { input: 'approval workflow', expectedName: 'MRF Approval Workflow' },
        { input: 'scheduled reminder', expectedName: 'Scheduled Workflow' },
        { input: 'email notification', expectedName: 'Notification Workflow' },
        { input: 'custom process', expectedName: 'Custom Workflow' }
      ];

      for (const testCase of testCases) {
        const context: CreationContext = {
          workflowId: `workflow-${testCase.input.replace(/\s+/g, '-')}`,
          workflowName: `Test ${testCase.input}`,
          userRole: 'admin',
          userDepartment: 'IT',
          availableFunctions: [],
          conversationGoal: 'create'
        };

        const result = await generator.generateWithConversation(
          testCase.input,
          context,
          undefined,
          mockConversationManager
        );

        expect(result.workflowUpdate?.metadata?.name).toBe(testCase.expectedName);
      }
    });

    it('should generate contextual follow-up questions', async () => {
      const context: CreationContext = {
        workflowId: 'workflow-questions',
        workflowName: 'Test Questions Workflow',
        userRole: 'admin',
        userDepartment: 'IT',
        availableFunctions: [],
        conversationGoal: 'create'
      };

      const result = await generator.generateWithConversation(
        'MRF approval with manager approval',
        context,
        undefined,
        mockConversationManager
      );

      // Should have questions specific to MRF and approval
      const questionsText = result.followUpQuestions.join(' ');
      expect(questionsText).toContain('MRF');
      expect(questionsText).toContain('approval');
    });
  });
});