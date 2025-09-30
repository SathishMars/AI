// src/test/utils/autocomplete-providers.test.ts
import { AutocompleteManager } from '@/app/utils/autocomplete-providers';
import type { ConversationContext } from '@/app/types/conversation';

describe('AutocompleteManager', () => {
  let autocompleteManager: AutocompleteManager;
  let mockContext: ConversationContext;

  beforeEach(() => {
    autocompleteManager = new AutocompleteManager();
    mockContext = {
      workflowId: 'test-workflow',
      workflowName: 'Test Workflow',
      userRole: 'admin',
      userDepartment: 'operations',
      availableFunctions: ['requestApproval', 'createEvent'],
      conversationGoal: 'create',
      currentWorkflowSteps: ['start', 'checkApproval', 'createEvent'],
      userContext: { name: 'John Doe', email: 'john@example.com', department: 'operations' },
      mrfContext: { attendees: 50, budget: 5000, location: 'Conference Room A' }
    };
  });

  describe('Trigger Detection', () => {
    test('should detect @ trigger for functions', () => {
      const result = autocompleteManager.findActiveProvider('Hello @req', 9);
      expect(result?.provider.trigger).toBe('@');
      expect(result?.searchText).toBe('req');
    });

    test('should detect # trigger for workflow steps', () => {
      const result = autocompleteManager.findActiveProvider('Go to #check', 11);
      expect(result?.provider.trigger).toBe('#');
      expect(result?.searchText).toBe('check');
    });

    test('should detect user. trigger for user context', () => {
      const result = autocompleteManager.findActiveProvider('The user.na', 10);
      expect(result?.provider.trigger).toBe('user.');
      expect(result?.searchText).toBe('na');
    });

    test('should detect mrf. trigger for MRF context', () => {
      const result = autocompleteManager.findActiveProvider('Check mrf.attend', 15);
      expect(result?.provider.trigger).toBe('mrf.');
      expect(result?.searchText).toBe('attend');
    });

    test('should detect date. trigger for date shortcuts', () => {
      const result = autocompleteManager.findActiveProvider('Set date.tom', 12);
      expect(result?.provider.trigger).toBe('date.');
      expect(result?.searchText).toBe('tom');
    });

    test('should detect / trigger for commands', () => {
      const result = autocompleteManager.findActiveProvider('Run /valid', 9);
      expect(result?.provider.trigger).toBe('/');
      expect(result?.searchText).toBe('valid');
    });

    test('should return null when no trigger is active', () => {
      const result = autocompleteManager.findActiveProvider('Hello world', 5);
      expect(result).toBeNull();
    });

    test('should handle cursor position correctly', () => {
      const text = 'Hello @req world';
      
      // Cursor in middle of trigger
      const result1 = autocompleteManager.findActiveProvider(text, 8);
      expect(result1?.provider.trigger).toBe('@');
      expect(result1?.searchText).toBe('r');
      
      // Cursor after trigger
      const result2 = autocompleteManager.findActiveProvider(text, 10);
      expect(result2?.provider.trigger).toBe('@');
      expect(result2?.searchText).toBe('req');
      
      // Cursor after space (should not detect trigger)
      const result3 = autocompleteManager.findActiveProvider(text, 11);
      expect(result3).toBeNull();
    });
  });

  describe('Function Suggestions (@)', () => {
    test('should return function suggestions for @ trigger', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Hello @req', 9, mockContext);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].category).toBe('approval');
      expect(suggestions[0].display).toContain('requestApproval');
    });

    test('should filter functions by search text', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Use @create', 10, mockContext);
      
      const hasCreateFunction = suggestions.some(s => s.display.toLowerCase().includes('create'));
      expect(hasCreateFunction).toBe(true);
    });

    test('should return empty array for @ with no matching functions', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Use @nonexistent', 16, mockContext);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('Workflow Step Suggestions (#)', () => {
    test('should return workflow step suggestions for # trigger', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Go to #check', 11, mockContext);
      
      expect(suggestions.length).toBeGreaterThan(0);
      const checkSuggestion = suggestions.find(s => s.display === 'checkApproval');
      expect(checkSuggestion).toBeDefined();
      expect(checkSuggestion?.category).toBe('workflow_step');
    });

    test('should filter steps by search text', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Link #start', 10, mockContext);
      
      const startSuggestion = suggestions.find(s => s.display === 'start');
      expect(startSuggestion).toBeDefined();
    });

    test('should return empty array when no workflow steps exist', async () => {
      const emptyContext = { ...mockContext, currentWorkflowSteps: [] };
      const suggestions = await autocompleteManager.getSuggestions('Go to #any', 8, emptyContext);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('User Context Suggestions (user.)', () => {
    test('should return user context suggestions for user. trigger', async () => {
      const suggestions = await autocompleteManager.getSuggestions('The user.na', 10, mockContext);
      
      expect(suggestions.length).toBeGreaterThan(0);
      const nameSuggestion = suggestions.find(s => s.display === 'name');
      expect(nameSuggestion).toBeDefined();
      expect(nameSuggestion?.category).toBe('user_context');
    });

    test('should filter user properties by search text', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Check user.em', 12, mockContext);
      
      const emailSuggestion = suggestions.find(s => s.display === 'email');
      expect(emailSuggestion).toBeDefined();
    });

    test('should include current values in metadata', async () => {
      const suggestions = await autocompleteManager.getSuggestions('user.', 5, mockContext);
      
      const nameSuggestion = suggestions.find(s => s.display === 'name');
      expect(nameSuggestion?.metadata?.currentValue).toBe('John Doe');
    });
  });

  describe('MRF Context Suggestions (mrf.)', () => {
    test('should return MRF context suggestions for mrf. trigger', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Check mrf.attend', 15, mockContext);
      
      expect(suggestions.length).toBeGreaterThan(0);
      const attendeesSuggestion = suggestions.find(s => s.display === 'attendees');
      expect(attendeesSuggestion).toBeDefined();
      expect(attendeesSuggestion?.category).toBe('mrf_data');
    });

    test('should filter MRF properties by search text', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Set mrf.bud', 10, mockContext);
      
      const budgetSuggestion = suggestions.find(s => s.display === 'budget');
      expect(budgetSuggestion).toBeDefined();
    });

    test('should include current values in metadata', async () => {
      const suggestions = await autocompleteManager.getSuggestions('mrf.', 4, mockContext);
      
      const attendeesSuggestion = suggestions.find(s => s.display === 'attendees');
      expect(attendeesSuggestion?.metadata?.currentValue).toBe(50);
    });
  });

  describe('Date Shortcuts (date.)', () => {
    test('should return date shortcut suggestions for date. trigger', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Set date.tom', 12, mockContext);
      
      expect(suggestions.length).toBeGreaterThan(0);
      const tomorrowSuggestion = suggestions.find(s => s.display === 'tomorrow');
      expect(tomorrowSuggestion).toBeDefined();
      expect(tomorrowSuggestion?.category).toBe('date_shortcut');
    });

    test('should provide actual date values', async () => {
      const suggestions = await autocompleteManager.getSuggestions('date.today', 10, mockContext);
      
      const todaySuggestion = suggestions.find(s => s.display === 'today');
      expect(todaySuggestion?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    });
  });

  describe('Command Suggestions (/)', () => {
    test('should return command suggestions for / trigger', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Run /valid', 9, mockContext);
      
      expect(suggestions.length).toBeGreaterThan(0);
      const validateSuggestion = suggestions.find(s => s.display === 'validate');
      expect(validateSuggestion).toBeDefined();
      expect(validateSuggestion?.category).toBe('command');
    });

    test('should filter commands by search text', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Execute /exp', 10, mockContext);
      
      const exportSuggestion = suggestions.find(s => s.display === 'export');
      expect(exportSuggestion).toBeDefined();
    });
  });

  describe('Suggestion Application', () => {
    test('should apply @ function suggestion correctly', () => {
      const suggestion = {
        id: 'func_request_approval',
        display: 'requestApproval',
        value: 'func_request_approval',
        description: 'Send approval requests',
        category: 'approval'
      };
      
      const result = autocompleteManager.applySuggestion('Hello @req world', 9, suggestion);
      
      expect(result.newText).toBe('Hello @func_request_approval world');
      expect(result.newCursorPosition).toBe('Hello @func_request_approval'.length);
    });

    test('should apply # workflow step suggestion correctly', () => {
      const suggestion = {
        id: 'step_checkApproval',
        display: 'checkApproval',
        value: 'checkApproval',
        description: 'Reference workflow step',
        category: 'workflow_step'
      };
      
      const result = autocompleteManager.applySuggestion('Go to #check', 11, suggestion);
      
      expect(result.newText).toBe('Go to #checkApproval');
      expect(result.newCursorPosition).toBe('Go to #checkApproval'.length);
    });

    test('should apply user context suggestion correctly', () => {
      const suggestion = {
        id: 'user.name',
        display: 'name',
        value: 'user.name',
        description: 'User property: name',
        category: 'user_context'
      };
      
      const result = autocompleteManager.applySuggestion('The user.na is', 10, suggestion);
      
      expect(result.newText).toBe('The user.name is');
      expect(result.newCursorPosition).toBe('The user.name'.length);
    });

    test('should handle case when no active provider found', () => {
      const suggestion = {
        id: 'test',
        display: 'test',
        value: 'test',
        description: 'test'
      };
      
      const result = autocompleteManager.applySuggestion('Hello world', 5, suggestion);
      
      expect(result.newText).toBe('Hello world');
      expect(result.newCursorPosition).toBe(5);
    });
  });

  describe('Suggestion Sorting', () => {
    test('should sort suggestions by relevance', async () => {
      const suggestions = await autocompleteManager.getSuggestions('@req', 4, mockContext);
      
      // Suggestions starting with search text should come first
      if (suggestions.length > 1) {
        const firstSuggestion = suggestions[0];
        expect(firstSuggestion.display.toLowerCase().startsWith('req')).toBe(true);
      }
    });

    test('should prioritize exact matches', async () => {
      // This would need actual function names that match exactly
      const suggestions = await autocompleteManager.getSuggestions('user.name', 9, mockContext);
      
      if (suggestions.length > 0) {
        const exactMatch = suggestions.find(s => s.display === 'name');
        const firstSuggestion = suggestions[0];
        expect(exactMatch?.display).toBe(firstSuggestion?.display);
      }
    });
  });

  describe('Provider Management', () => {
    test('should get provider by trigger', () => {
      const provider = autocompleteManager.getProviderByTrigger('@');
      expect(provider?.trigger).toBe('@');
    });

    test('should return null for non-existent trigger', () => {
      const provider = autocompleteManager.getProviderByTrigger('nonexistent');
      expect(provider).toBeNull();
    });

    test('should add custom provider', () => {
      const customProvider = {
        trigger: 'custom.',
        getSuggestions: async () => [
          { id: 'custom1', display: 'custom', value: 'custom', description: 'Custom suggestion' }
        ],
        formatSuggestion: (suggestion: { value: string }) => suggestion.value
      };
      
      autocompleteManager.addProvider(customProvider);
      const provider = autocompleteManager.getProviderByTrigger('custom.');
      expect(provider).toBe(customProvider);
    });

    test('should remove provider', () => {
      autocompleteManager.removeProvider('@');
      const provider = autocompleteManager.getProviderByTrigger('@');
      expect(provider).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty search text', async () => {
      const suggestions = await autocompleteManager.getSuggestions('@', 1, mockContext);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should handle cursor at start of text', () => {
      const result = autocompleteManager.findActiveProvider('@test', 0);
      expect(result).toBeNull();
    });

    test('should handle cursor at end of text', () => {
      const result = autocompleteManager.findActiveProvider('Hello @req', 11);
      expect(result?.provider.trigger).toBe('@');
      expect(result?.searchText).toBe('req');
    });

    test('should handle multiple triggers in same text', () => {
      const result = autocompleteManager.findActiveProvider('Use @func in #step', 15);
      expect(result?.provider.trigger).toBe('#');
      expect(result?.searchText).toBe('step');
    });

    test('should handle invalid cursor position', () => {
      const result = autocompleteManager.findActiveProvider('test', 100);
      expect(result).toBeNull();
    });
  });
});