// src/test/utils/functions-library.test.ts
import '@testing-library/jest-dom';
import { 
  functionsLibraryManager, 
  EnhancedFunctionsLibraryManager,
  enhancedFunctionsLibrary 
} from '@/app/utils/functions-library';
import { FunctionDefinition } from '@/app/types/workflow';

describe('Enhanced Functions Library', () => {
  describe('Library Structure', () => {
    it('should have all required functions', () => {
      const library = functionsLibraryManager.getLibrary();
      expect(library.functions).toHaveProperty('requestApproval');
      expect(library.functions).toHaveProperty('collectMeetingInformation');
      expect(library.functions).toHaveProperty('splitUpToExecuteParallelActivities');
      expect(library.functions).toHaveProperty('waitForParallelActivitiesToComplete');
      expect(library.functions).toHaveProperty('callAnAPI');
      expect(library.functions).toHaveProperty('createAnEvent');
      expect(library.functions).toHaveProperty('terminateWorkflow');
      expect(library.functions).toHaveProperty('surveyForFeedback');
      expect(library.functions).toHaveProperty('validateRequestAgainstPolicy');
      expect(library.functions).toHaveProperty('validatePlanAgainstPolicy');
    });

    it('should have proper library metadata', () => {
      const library = functionsLibraryManager.getLibrary();
      expect(library.version).toBe('2.0.0');
      expect(library.metadata.name).toBe('Event Planning Functions Library');
      expect(library.metadata.totalFunctions).toBe(10);
      expect(library.categories).toHaveLength(7);
    });

    it('should have all function categories', () => {
      const categories = functionsLibraryManager.getCategories();
      const categoryIds = categories.map(cat => cat.id);
      expect(categoryIds).toContain('approval');
      expect(categoryIds).toContain('data-collection');
      expect(categoryIds).toContain('workflow-control');
      expect(categoryIds).toContain('integration');
      expect(categoryIds).toContain('event-management');
      expect(categoryIds).toContain('feedback');
      expect(categoryIds).toContain('validation');
    });
  });

  describe('Function Definition Structure', () => {
    it('should have complete function definitions with AI enhancements', () => {
      const requestApproval = functionsLibraryManager.getFunction('requestApproval');
      expect(requestApproval).toBeDefined();
      expect(requestApproval?.id).toBe('func_request_approval');
      expect(requestApproval?.version).toBe('1.2.0');
      expect(requestApproval?.tags).toEqual(['approval', 'workflow', 'notification', 'management']);
      expect(requestApproval?.lifecycle).toBe('active');
      expect(requestApproval?.examples).toHaveLength(1);
      expect(requestApproval?.documentation).toHaveProperty('aiPromptHints');
      expect(requestApproval?.documentation.aiPromptHints).toHaveLength(4);
      expect(requestApproval?.compatibleVersions).toContain('1.2.0');
    });

    it('should have proper parameter definitions with examples and validation', () => {
      const requestApproval = functionsLibraryManager.getFunction('requestApproval');
      expect(requestApproval?.parameters.to).toEqual({
        type: 'string',
        required: true,
        description: 'Email address of approver',
        examples: ['manager@company.com', 'supervisor@company.com'],
        validation: expect.any(Object) // Zod schema
      });
    });

    it('should have comprehensive documentation for each function', () => {
      const createEvent = functionsLibraryManager.getFunction('createAnEvent');
      expect(createEvent?.documentation).toEqual({
        description: 'Creates calendar events with comprehensive resource booking and attendee management',
        usage: 'Use as the final step in event workflows to create actual calendar entries and book resources',
        aiPromptHints: [
          'Use when ready to create the actual event',
          'Ensure all approvals are complete',
          'Include all required resources',
          'Verify attendee availability'
        ],
        commonUseCases: [
          'Business meeting creation',
          'Training session booking',
          'Conference room reservation',
          'Virtual meeting setup'
        ]
      });
    });
  });

  describe('Enhanced Library Manager', () => {
    it('should retrieve functions by category', () => {
      const approvalFunctions = functionsLibraryManager.getFunctionsByCategory('approval');
      expect(approvalFunctions).toHaveLength(1);
      expect(approvalFunctions[0].name).toBe('requestApproval');

      const workflowFunctions = functionsLibraryManager.getFunctionsByCategory('workflow-control');
      expect(workflowFunctions).toHaveLength(3);
      expect(workflowFunctions.map(f => f.name)).toContain('terminateWorkflow');
    });

    it('should retrieve functions by tag', () => {
      const workflowTagged = functionsLibraryManager.getFunctionsByTag('workflow');
      expect(workflowTagged.length).toBeGreaterThan(0);
      
      const parallelTagged = functionsLibraryManager.getFunctionsByTag('parallel');
      expect(parallelTagged).toHaveLength(2);
      expect(parallelTagged.map(f => f.name)).toEqual([
        'splitUpToExecuteParallelActivities',
        'waitForParallelActivitiesToComplete'
      ]);
    });

    it('should retrieve functions by lifecycle', () => {
      const activeFunctions = functionsLibraryManager.getFunctionsByLifecycle('active');
      expect(activeFunctions).toHaveLength(10); // All functions should be active

      const deprecatedFunctions = functionsLibraryManager.getFunctionsByLifecycle('deprecated');
      expect(deprecatedFunctions).toHaveLength(0);

      const experimentalFunctions = functionsLibraryManager.getFunctionsByLifecycle('experimental');
      expect(experimentalFunctions).toHaveLength(0);
    });

    it('should retrieve function by ID', () => {
      const func = functionsLibraryManager.getFunctionById('func_request_approval');
      expect(func?.name).toBe('requestApproval');
    });
  });

  describe('AI Integration Features', () => {
    it('should generate AI function context', () => {
      const aiContext = functionsLibraryManager.getAIFunctionContext();
      
      expect(aiContext.availableFunctions).toHaveLength(10);
      expect(aiContext.categoryDescriptions).toHaveProperty('approval');
      expect(aiContext.usagePatterns).toHaveLength(3);
      expect(aiContext.exampleWorkflows).toHaveLength(3);
      
      // Check if AI function summaries are properly formatted
      const approvalSummary = aiContext.availableFunctions.find(f => f.name === 'requestApproval');
      expect(approvalSummary).toEqual({
        id: 'func_request_approval',
        name: 'requestApproval',
        description: 'Send approval requests to managers/stakeholders with configurable timeout and escalation',
        category: 'approval',
        parameters: expect.any(Array),
        exampleUsage: 'Request approval from direct manager',
        aiPromptHints: [
          'Use when user mentions needing approval',
          'Trigger for budget approvals, manager sign-offs',
          'Include timeout for urgent approvals',
          'Consider CC for transparency'
        ]
      });
    });

    it('should provide category descriptions optimized for AI', () => {
      const aiContext = functionsLibraryManager.getAIFunctionContext();
      expect(aiContext.categoryDescriptions.approval).toBe(
        'Use these functions when workflows require human approval or sign-off from managers, executives, or stakeholders'
      );
      expect(aiContext.categoryDescriptions['workflow-control']).toBe(
        'Use these functions to manage workflow branching, parallel execution, synchronization, and termination'
      );
    });

    it('should provide usage patterns for common workflows', () => {
      const aiContext = functionsLibraryManager.getAIFunctionContext();
      const approvalPattern = aiContext.usagePatterns.find(p => p.id === 'approval_workflow');
      
      expect(approvalPattern).toEqual({
        id: 'approval_workflow',
        name: 'Approval Workflow',
        description: 'Standard approval process for events requiring manager sign-off',
        functions: ['validateRequestAgainstPolicy', 'requestApproval', 'createAnEvent'],
        workflow: 'validate → request approval → create event'
      });
    });

    it('should support function discovery by query', () => {
      const approvalFunctions = functionsLibraryManager.discoverFunctions('approval manager');
      expect(approvalFunctions.length).toBeGreaterThan(0);
      expect(approvalFunctions.some(f => f.name === 'requestApproval')).toBe(true);

      const eventFunctions = functionsLibraryManager.discoverFunctions('calendar booking');
      expect(eventFunctions.some(f => f.name === 'createAnEvent')).toBe(true);

      const parallelFunctions = functionsLibraryManager.discoverFunctions('parallel concurrent');
      expect(parallelFunctions.length).toBe(2);
    });
  });

  describe('Enhanced Validation', () => {
    it('should validate function parameters with Zod schemas', () => {
      // Valid email validation
      const validResult = functionsLibraryManager.validateFunction('requestApproval', {
        to: 'valid@email.com',
        timeout: 24
      });
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid email validation
      const invalidResult = functionsLibraryManager.validateFunction('requestApproval', {
        to: 'invalid-email',
        timeout: 24
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.errors[0]).toContain('Invalid parameter \'to\'');
    });

    it('should validate required parameters', () => {
      const missingParamResult = functionsLibraryManager.validateFunction('requestApproval', {
        cc: 'optional@email.com'
        // Missing required 'to' parameter
      });
      
      expect(missingParamResult.isValid).toBe(false);
      expect(missingParamResult.errors).toContain('Missing required parameter: to');
    });

    it('should validate URL parameters', () => {
      const validUrlResult = functionsLibraryManager.validateFunction('callAnAPI', {
        url: 'https://api.example.com/endpoint',
        method: 'POST'
      });
      expect(validUrlResult.isValid).toBe(true);

      const invalidUrlResult = functionsLibraryManager.validateFunction('callAnAPI', {
        url: 'not-a-valid-url',
        method: 'POST'
      });
      expect(invalidUrlResult.isValid).toBe(false);
    });

    it('should validate array parameters', () => {
      const validArrayResult = functionsLibraryManager.validateFunction('collectMeetingInformation', {
        fields: ['field1', 'field2'],
        requester: 'test@example.com'
      });
      expect(validArrayResult.isValid).toBe(true);
    });
  });

  describe('Version Compatibility', () => {
    it('should check version compatibility', () => {
      expect(functionsLibraryManager.isVersionCompatible('requestApproval', '1.2.0')).toBe(true);
      expect(functionsLibraryManager.isVersionCompatible('requestApproval', '1.0.0')).toBe(true);
      expect(functionsLibraryManager.isVersionCompatible('requestApproval', '2.0.0')).toBe(false);
      expect(functionsLibraryManager.isVersionCompatible('nonExistentFunction', '1.0.0')).toBe(false);
    });
  });

  describe('Usage Statistics', () => {
    it('should provide usage statistics placeholder', () => {
      const stats = functionsLibraryManager.getFunctionUsageStats();
      expect(stats).toHaveProperty('requestApproval');
      expect(stats.requestApproval).toEqual({ callCount: 0, successRate: 100 });
    });
  });

  describe('Dynamic Loading', () => {
    it('should support dynamic function loading', async () => {
      const func = await functionsLibraryManager.loadFunction('func_request_approval');
      expect(func?.name).toBe('requestApproval');

      const nonExistent = await functionsLibraryManager.loadFunction('func_non_existent');
      expect(nonExistent).toBeNull();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with old manager', () => {
      const oldManager = new EnhancedFunctionsLibraryManager();
      expect(oldManager.getFunction('requestApproval')).toBeDefined();
      expect(oldManager.getAllFunctions()).toHaveLength(10);
    });

    it('should export default library for backward compatibility', () => {
      expect(enhancedFunctionsLibrary.version).toBe('2.0.0');
      expect(enhancedFunctionsLibrary.functions).toHaveProperty('requestApproval');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent function gracefully', () => {
      const result = functionsLibraryManager.validateFunction('nonExistentFunction', {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Function 'nonExistentFunction' not found");
    });

    it('should handle empty queries in discovery', () => {
      const results = functionsLibraryManager.discoverFunctions('');
      expect(results).toHaveLength(0);
    });
  });
});