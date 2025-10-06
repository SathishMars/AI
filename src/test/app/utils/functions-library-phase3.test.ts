// src/test/app/utils/functions-library-phase3.test.ts
import { functionsLibraryManager } from '@/app/utils/functions-library';
import { FunctionDefinition } from '@/app/types/workflow';

describe('Functions Library - Phase 3 Pre-Built Functions', () => {
  describe('Trigger Functions', () => {
    describe('onWorkflowTriggered', () => {
      let func: FunctionDefinition | undefined;

      beforeEach(() => {
        func = functionsLibraryManager.getFunction('onWorkflowTriggered');
      });

      it('should exist in the library', () => {
        expect(func).toBeDefined();
        expect(func?.name).toBe('onWorkflowTriggered');
      });

      it('should have correct category and tags', () => {
        expect(func?.category).toBe('trigger');
        expect(func?.tags).toContain('workflow-chain');
        expect(func?.tags).toContain('trigger');
      });

      it('should have expectedParams parameter', () => {
        expect(func?.parameters.expectedParams).toBeDefined();
        expect(func?.parameters.expectedParams.type).toBe('object');
        expect(func?.parameters.expectedParams.required).toBe(false);
      });

      it('should have validateParams parameter', () => {
        expect(func?.parameters.validateParams).toBeDefined();
        expect(func?.parameters.validateParams.type).toBe('boolean');
        expect(func?.parameters.validateParams.default).toBe(true);
      });

      it('should have proper documentation', () => {
        expect(func?.documentation.description).toContain('entry point');
        expect(func?.documentation.commonUseCases).toContain('Multi-level approval workflows');
      });

      it('should have examples', () => {
        expect(func?.examples).toBeDefined();
        expect(func?.examples?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Action Functions', () => {
    describe('notifyUsers', () => {
      let func: FunctionDefinition | undefined;

      beforeEach(() => {
        func = functionsLibraryManager.getFunction('notifyUsers');
      });

      it('should exist in the library', () => {
        expect(func).toBeDefined();
        expect(func?.name).toBe('notifyUsers');
      });

      it('should have correct category', () => {
        expect(func?.category).toBe('notification');
        expect(func?.tags).toContain('in-app');
        expect(func?.tags).toContain('notification');
      });

      it('should have required recipients parameter', () => {
        expect(func?.parameters.recipients).toBeDefined();
        expect(func?.parameters.recipients.type).toBe('array');
        expect(func?.parameters.recipients.required).toBe(true);
      });

      it('should have required title and message parameters', () => {
        expect(func?.parameters.title).toBeDefined();
        expect(func?.parameters.title.type).toBe('string');
        expect(func?.parameters.title.required).toBe(true);

        expect(func?.parameters.message).toBeDefined();
        expect(func?.parameters.message.type).toBe('string');
        expect(func?.parameters.message.required).toBe(true);
      });

      it('should have optional priority parameter with default', () => {
        expect(func?.parameters.priority).toBeDefined();
        expect(func?.parameters.priority.type).toBe('string');
        expect(func?.parameters.priority.required).toBe(false);
        expect(func?.parameters.priority.default).toBe('normal');
      });

      it('should have optional actionUrl parameter', () => {
        expect(func?.parameters.actionUrl).toBeDefined();
        expect(func?.parameters.actionUrl.type).toBe('string');
        expect(func?.parameters.actionUrl.required).toBe(false);
      });

      it('should have comprehensive examples', () => {
        expect(func?.examples).toBeDefined();
        expect(func?.examples?.length).toBeGreaterThan(0);
        const firstExample = func?.examples?.[0];
        expect(firstExample?.parameters).toHaveProperty('recipients');
        expect(firstExample?.parameters).toHaveProperty('title');
        expect(firstExample?.parameters).toHaveProperty('message');
      });

      it('should have AI-friendly documentation', () => {
        expect(func?.documentation.aiPromptHints).toBeDefined();
        expect(func?.documentation.aiPromptHints.length).toBeGreaterThan(0);
        expect(func?.documentation.commonUseCases).toContain('Approval request notifications');
      });
    });

    describe('collectFormInformation', () => {
      let func: FunctionDefinition | undefined;

      beforeEach(() => {
        func = functionsLibraryManager.getFunction('collectFormInformation');
      });

      it('should exist in the library', () => {
        expect(func).toBeDefined();
        expect(func?.name).toBe('collectFormInformation');
      });

      it('should have correct category', () => {
        expect(func?.category).toBe('data-collection');
        expect(func?.tags).toContain('form');
        expect(func?.tags).toContain('workflow-pause');
      });

      it('should have required formTitle parameter', () => {
        expect(func?.parameters.formTitle).toBeDefined();
        expect(func?.parameters.formTitle.type).toBe('string');
        expect(func?.parameters.formTitle.required).toBe(true);
      });

      it('should have required fields parameter (array type)', () => {
        expect(func?.parameters.fields).toBeDefined();
        expect(func?.parameters.fields.type).toBe('array');
        expect(func?.parameters.fields.required).toBe(true);
      });

      it('should have required assignedTo parameter', () => {
        expect(func?.parameters.assignedTo).toBeDefined();
        expect(func?.parameters.assignedTo.type).toBe('string');
        expect(func?.parameters.assignedTo.required).toBe(true);
      });

      it('should have optional dueDate parameter', () => {
        expect(func?.parameters.dueDate).toBeDefined();
        expect(func?.parameters.dueDate.required).toBe(false);
      });

      it('should have saveToContext parameter with default true', () => {
        expect(func?.parameters.saveToContext).toBeDefined();
        expect(func?.parameters.saveToContext.type).toBe('boolean');
        expect(func?.parameters.saveToContext.default).toBe(true);
      });

      it('should have workflow-pause guidance', () => {
        expect(func?.documentation.description).toContain('Pauses workflow');
        expect(func?.documentation.commonUseCases).toContain('Budget justification collection');
      });
    });

    describe('triggerWorkflow (Updated v2.0.0)', () => {
      let func: FunctionDefinition | undefined;

      beforeEach(() => {
        func = functionsLibraryManager.getFunction('triggerWorkflow');
      });

      it('should exist in the library', () => {
        expect(func).toBeDefined();
        expect(func?.name).toBe('triggerWorkflow');
      });

      it('should be version 2.0.0', () => {
        expect(func?.version).toBe('2.0.0');
      });

      it('should have workflow-control category', () => {
        expect(func?.category).toBe('workflow-control');
        expect(func?.tags).toContain('workflow-chain');
        expect(func?.tags).toContain('orchestration');
      });

      it('should have required workflowId parameter', () => {
        expect(func?.parameters.workflowId).toBeDefined();
        expect(func?.parameters.workflowId.type).toBe('string');
        expect(func?.parameters.workflowId.required).toBe(true);
      });

      it('should have optional params parameter', () => {
        expect(func?.parameters.params).toBeDefined();
        expect(func?.parameters.params.type).toBe('object');
        expect(func?.parameters.params.required).toBe(false);
      });

      it('should have waitForCompletion parameter with default true', () => {
        expect(func?.parameters.waitForCompletion).toBeDefined();
        expect(func?.parameters.waitForCompletion.type).toBe('boolean');
        expect(func?.parameters.waitForCompletion.default).toBe(true);
      });

      it('should have timeout parameter with default 30', () => {
        expect(func?.parameters.timeout).toBeDefined();
        expect(func?.parameters.timeout.type).toBe('number');
        expect(func?.parameters.timeout.default).toBe(30);
      });

      it('should have onSuccessGoTo and onFailureGoTo parameters', () => {
        expect(func?.parameters.onSuccessGoTo).toBeDefined();
        expect(func?.parameters.onSuccessGoTo.type).toBe('string');
        expect(func?.parameters.onSuccessGoTo.required).toBe(false);

        expect(func?.parameters.onFailureGoTo).toBeDefined();
        expect(func?.parameters.onFailureGoTo.type).toBe('string');
        expect(func?.parameters.onFailureGoTo.required).toBe(false);
      });

      it('should have security guidance in documentation', () => {
        const hints = func?.documentation.aiPromptHints;
        expect(hints?.some(hint => hint.toUpperCase().includes('SECURITY'))).toBe(true);
        expect(hints?.some(hint => hint.includes('same account'))).toBe(true);
      });

      it('should have examples with both wait patterns', () => {
        expect(func?.examples).toBeDefined();
        expect(func?.examples?.length).toBeGreaterThan(0);
        
        // Should have example with waitForCompletion true
        const waitExample = func?.examples?.find(ex => 
          ex.parameters.waitForCompletion === true
        );
        expect(waitExample).toBeDefined();
      });
    });
  });

  describe('Function Discovery', () => {
    it('should find onWorkflowTriggered when searching for "workflow trigger"', () => {
      const results = functionsLibraryManager.discoverFunctions('workflow trigger');
      const funcNames = results.map(f => f.name);
      expect(funcNames).toContain('onWorkflowTriggered');
    });

    it('should find notifyUsers when searching for "notification"', () => {
      const results = functionsLibraryManager.discoverFunctions('notification');
      const funcNames = results.map(f => f.name);
      expect(funcNames).toContain('notifyUsers');
    });

    it('should find collectFormInformation when searching for "collect form"', () => {
      const results = functionsLibraryManager.discoverFunctions('collect form');
      const funcNames = results.map(f => f.name);
      expect(funcNames).toContain('collectFormInformation');
    });

    it('should find triggerWorkflow when searching for "trigger workflow"', () => {
      const results = functionsLibraryManager.discoverFunctions('trigger workflow');
      const funcNames = results.map(f => f.name);
      expect(funcNames).toContain('triggerWorkflow');
    });

    it('should find workflow-related functions when searching for "workflow chain"', () => {
      const results = functionsLibraryManager.discoverFunctions('workflow chain');
      const funcNames = results.map(f => f.name);
      expect(funcNames).toContain('onWorkflowTriggered');
      expect(funcNames).toContain('triggerWorkflow');
    });
  });

  describe('Function Categories', () => {
    it('should have all Phase 3 functions in correct categories', () => {
      const triggerFunctions = functionsLibraryManager.getFunctionsByCategory('trigger');
      const triggerNames = triggerFunctions.map(f => f.name);
      expect(triggerNames).toContain('onWorkflowTriggered');

      const notificationFunctions = functionsLibraryManager.getFunctionsByCategory('notification');
      const notificationNames = notificationFunctions.map(f => f.name);
      expect(notificationNames).toContain('notifyUsers');

      const dataCollectionFunctions = functionsLibraryManager.getFunctionsByCategory('data-collection');
      const dataCollectionNames = dataCollectionFunctions.map(f => f.name);
      expect(dataCollectionNames).toContain('collectFormInformation');

      const workflowControlFunctions = functionsLibraryManager.getFunctionsByCategory('workflow-control');
      const workflowControlNames = workflowControlFunctions.map(f => f.name);
      expect(workflowControlNames).toContain('triggerWorkflow');
      expect(workflowControlNames).toContain('terminateWorkflow');
    });
  });

  describe('Function Validation', () => {
    it('should validate notifyUsers parameters correctly', () => {
      const func = functionsLibraryManager.getFunction('notifyUsers');
      expect(func).toBeDefined();

      const validParams = {
        recipients: ['user123'],
        title: 'Test Notification',
        message: 'This is a test message'
      };

      const validation = functionsLibraryManager.validateFunction('notifyUsers', validParams);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for notifyUsers with missing required params', () => {
      const invalidParams = {
        recipients: ['user123']
        // Missing title and message
      };

      const validation = functionsLibraryManager.validateFunction('notifyUsers', invalidParams);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate triggerWorkflow parameters correctly', () => {
      const validParams = {
        workflowId: 'wf_123',
        params: { requestId: 'req_456' },
        waitForCompletion: true
      };

      const validation = functionsLibraryManager.validateFunction('triggerWorkflow', validParams);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate collectFormInformation parameters correctly', () => {
      const validParams = {
        formTitle: 'Budget Form',
        fields: [
          { name: 'amount', type: 'number', label: 'Amount', required: true }
        ],
        assignedTo: 'user123'
      };

      const validation = functionsLibraryManager.validateFunction('collectFormInformation', validParams);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Version Compatibility', () => {
    it('should have compatible versions defined for all Phase 3 functions', () => {
      const functions = ['onWorkflowTriggered', 'notifyUsers', 'collectFormInformation', 'triggerWorkflow'];
      
      functions.forEach(funcName => {
        const func = functionsLibraryManager.getFunction(funcName);
        expect(func?.compatibleVersions).toBeDefined();
        expect(func?.compatibleVersions.length).toBeGreaterThan(0);
      });
    });

    it('should check version compatibility for triggerWorkflow v2.0.0', () => {
      const isCompatible = functionsLibraryManager.isVersionCompatible('triggerWorkflow', '2.0.0');
      expect(isCompatible).toBe(true);
    });
  });

  describe('Metadata Completeness', () => {
    it('should have complete metadata for all Phase 3 functions', () => {
      const functions = ['onWorkflowTriggered', 'notifyUsers', 'collectFormInformation', 'triggerWorkflow'];
      
      functions.forEach(funcName => {
        const func = functionsLibraryManager.getFunction(funcName);
        
        // Check required metadata
        expect(func?.id).toBeDefined();
        expect(func?.name).toBe(funcName);
        expect(func?.description).toBeDefined();
        expect(func?.version).toBeDefined();
        expect(func?.category).toBeDefined();
        expect(func?.tags).toBeDefined();
        expect(func?.tags.length).toBeGreaterThan(0);
        
        // Check parameters
        expect(func?.parameters).toBeDefined();
        expect(Object.keys(func?.parameters || {}).length).toBeGreaterThan(0);
        
        // Check documentation
        expect(func?.documentation).toBeDefined();
        expect(func?.documentation.description).toBeDefined();
        expect(func?.documentation.usage).toBeDefined();
        expect(func?.documentation.aiPromptHints).toBeDefined();
        expect(func?.documentation.commonUseCases).toBeDefined();
        
        // Check examples
        expect(func?.examples).toBeDefined();
        expect(func?.examples?.length).toBeGreaterThan(0);
        
        // Check lifecycle
        expect(func?.lifecycle).toBe('active');
      });
    });
  });

  describe('AI Prompt Hints Quality', () => {
    it('should have actionable AI prompt hints for all Phase 3 functions', () => {
      const functions = ['onWorkflowTriggered', 'notifyUsers', 'collectFormInformation', 'triggerWorkflow'];
      
      functions.forEach(funcName => {
        const func = functionsLibraryManager.getFunction(funcName);
        const hints = func?.documentation.aiPromptHints || [];
        
        expect(hints.length).toBeGreaterThan(2);
        hints.forEach(hint => {
          expect(hint.length).toBeGreaterThan(10);
          expect(typeof hint).toBe('string');
        });
      });
    });
  });
});
