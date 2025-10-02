// src/test/utils/unified-autocomplete-manager.test.ts
import { UnifiedAutocompleteManager } from '@/app/utils/unified-autocomplete-manager';
import type { ConversationContext } from '@/app/types/conversation';

// Mock the API for testing
global.fetch = jest.fn();

describe('UnifiedAutocompleteManager', () => {
  let autocompleteManager: UnifiedAutocompleteManager;
  let mockContext: ConversationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    autocompleteManager = new UnifiedAutocompleteManager();
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
      const result = autocompleteManager.findActiveProvider('Hello @req', 10); // cursor after 'req'
      expect(result?.provider.trigger).toBe('@');
      expect(result?.searchText).toBe('req');
    });

    test('should detect user. trigger for user context', () => {
      const result = autocompleteManager.findActiveProvider('Hello user.na', 14); // cursor after 'na'
      expect(result?.provider.trigger).toBe('user.');
      expect(result?.searchText).toBe('na');
    });

    test('should detect mrf. trigger for form fields', () => {
      const result = autocompleteManager.findActiveProvider('form mrf.attend', 15);
      expect(result?.provider.trigger).toBe('mrf.');
      expect(result?.searchText).toBe('attend');
    });

    test('should detect # trigger for workflow steps', () => {
      const result = autocompleteManager.findActiveProvider('go to #check', 13); // cursor after 'check'
      expect(result?.provider.trigger).toBe('#');
      expect(result?.searchText).toBe('check');
    });

    test('should detect date. trigger for date functions', () => {
      const result = autocompleteManager.findActiveProvider('on date.now', 12); // cursor after 'now'
      expect(result?.provider.trigger).toBe('date.');
      expect(result?.searchText).toBe('now');
    });

    test('should return null for no trigger', () => {
      const result = autocompleteManager.findActiveProvider('Hello world', 11);
      expect(result).toBeNull();
    });

    test('should handle cursor at different positions', () => {
      const text = 'Start @req then user.name';
      
      // Cursor after @req
      const result1 = autocompleteManager.findActiveProvider(text, 10);
      expect(result1?.provider.trigger).toBe('@');
      expect(result1?.searchText).toBe('req');
      
      // Cursor after user.name
      const result2 = autocompleteManager.findActiveProvider(text, 25);
      expect(result2?.provider.trigger).toBe('user.');
      expect(result2?.searchText).toBe('name');
    });
  });

  describe('Autocomplete Suggestions', () => {
    test('should fetch function suggestions from API', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            autocompleteItems: [
              { name: 'requestApproval', description: 'Request approval from manager' },
              { name: 'createEvent', description: 'Create a new event' }
            ]
          }
        })
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const suggestions = await autocompleteManager.getSuggestions('Hello @req', 10, mockContext);
      
      expect(fetch).toHaveBeenCalledWith('/api/workflow-autocomplete?category=function&includeMetadata=true');
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].value).toBe('requestApproval');
    });

    test('should handle API errors gracefully for functions', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      const suggestions = await autocompleteManager.getSuggestions('Hello @req', 10, mockContext);
      
      // Should return fallback suggestions on API error (from static data)
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('should provide user context suggestions without API', async () => {
      const suggestions = await autocompleteManager.getSuggestions('Hello user.na', 14, mockContext);
      
      expect(suggestions.some(s => s.value === 'name')).toBe(true);
      expect(suggestions.some(s => s.value === 'email')).toBe(true);
      expect(suggestions.some(s => s.value === 'department')).toBe(true);
    });

    test('should provide workflow step suggestions without API', async () => {
      const suggestions = await autocompleteManager.getSuggestions('go to #check', 13, mockContext);
      
      expect(suggestions.some(s => s.value === 'checkApproval')).toBe(true);
    });
  });
});