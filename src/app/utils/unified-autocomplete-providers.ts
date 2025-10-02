// src/app/utils/unified-autocomplete-providers.ts

import { AutocompleteProvider, AutocompleteSuggestion } from '@/app/types/conversation';
import { 
  getFunctionAutocomplete,
  getUserContextAutocomplete,
  getDateFunctionAutocomplete,
  getFormFieldAutocomplete,
  getStepReferenceAutocomplete,
  getLLMContext
} from '@/app/data/workflow-conversation-autocomplete';
import { WorkflowAutocompleteItem, ParameterDefinition } from '@/app/types/workflow-conversation-autocomplete';

// Helper to format parameter display
function formatParameters(parameters?: ParameterDefinition[]): string {
  if (!parameters || parameters.length === 0) return '';
  
  const paramNames = parameters.map(p => 
    p.required ? p.name : `[${p.name}]`
  ).join(', ');
  
  return `(${paramNames})`;
}

// Helper to create suggestion from autocomplete item
function createSuggestion(item: WorkflowAutocompleteItem, input: string): AutocompleteSuggestion {
  const suggestion: AutocompleteSuggestion = {
    id: item.id,
    display: `${item.displayName}${formatParameters(item.parameters)}`,
    value: item.name,
    description: item.description,
    category: item.category,
    icon: item.icon || '⚙️',
    metadata: {
      examples: item.examples,
      parameters: item.parameters,
      hasRequiredParams: item.parameters?.some(p => p.required) || false,
      llmInstructions: item.llmInstructions,
      relevanceScore: calculateRelevance(item, input)
    }
  };

  return suggestion;
}

// Calculate relevance score for ranking
function calculateRelevance(item: WorkflowAutocompleteItem, input: string): number {
  const query = input.toLowerCase();
  let score = 0;

  // Exact name match
  if (item.name.toLowerCase() === query) score += 100;
  
  // Name starts with query
  if (item.name.toLowerCase().startsWith(query)) score += 50;
  
  // Display name contains query
  if (item.displayName.toLowerCase().includes(query)) score += 30;
  
  // Description contains query
  if (item.description.toLowerCase().includes(query)) score += 20;
  
  // Tags contain query
  if (item.tags?.some(tag => tag.toLowerCase().includes(query))) score += 15;
  
  // Examples contain query
  if (item.examples.some(ex => ex.toLowerCase().includes(query))) score += 10;

  return score;
}

// Generic provider factory
function createProvider(trigger: string, getItems: () => WorkflowAutocompleteItem[]): AutocompleteProvider {
  return {
    trigger,
    getSuggestions: async (input: string): Promise<AutocompleteSuggestion[]> => {
      try {
        const items = getItems();
        
        // Filter items based on input
        const filteredItems = items.filter(item => {
          if (!input) return true;
          const query = input.toLowerCase();
          return (
            item.name.toLowerCase().includes(query) ||
            item.displayName.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
            item.examples.some(ex => ex.toLowerCase().includes(query))
          );
        });

        // Convert to suggestions and sort by relevance
        const suggestions = filteredItems
          .map(item => createSuggestion(item, input))
          .sort((a, b) => (b.metadata?.relevanceScore as number || 0) - (a.metadata?.relevanceScore as number || 0))
          .slice(0, 10); // Limit to top 10 results

        console.log(`🔍 ${trigger} provider found ${suggestions.length} suggestions for "${input}"`);
        return suggestions;

      } catch (error) {
        console.error(`Error in ${trigger} provider:`, error);
        return [];
      }
    },
    formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
      return suggestion.display;
    }
  };
}

// Functions provider (@)
export const functionsProvider = createProvider('@', getFunctionAutocomplete);

// User context provider (user.)
export const userContextProvider = createProvider('user.', getUserContextAutocomplete);

// Date functions provider (date.)
export const dateFunctionsProvider = createProvider('date.', getDateFunctionAutocomplete);

// Form fields provider (mrf.)
export const formFieldsProvider: AutocompleteProvider = {
  trigger: 'mrf.',
  getSuggestions: async (input: string): Promise<AutocompleteSuggestion[]> => {
    try {
      // Get base form field suggestions
      const baseItems = getFormFieldAutocomplete();
      let suggestions = baseItems.map(item => createSuggestion(item, input));

      // Try to get actual form fields from MRF template API
      try {
        const response = await fetch('/api/mrf-template?includeValues=false');
        if (response.ok) {
          const { data: mrfTemplate } = await response.json();
          
          // Add actual form fields from template
          const formFieldSuggestions: AutocompleteSuggestion[] = Object.entries(mrfTemplate.fields || {})
            .filter(([fieldName]) => 
              !input || fieldName.toLowerCase().includes(input.toLowerCase())
            )
            .map(([fieldName, fieldDef]) => {
              const field = fieldDef as { label?: string; description?: string; type?: string };
              return {
                id: `mrf_${fieldName}`,
                display: field.label || fieldName,
                value: fieldName,
                description: field.description || `Form field: ${fieldName}`,
                category: 'formField',
                icon: '📝',
                metadata: {
                  examples: [`mrf.${fieldName} for conditions`, `use mrf.${fieldName} in workflow`],
                  fieldType: field.type,
                  relevanceScore: input ? (fieldName.toLowerCase().includes(input.toLowerCase()) ? 50 : 0) : 0
                }
              };
            });

          suggestions = [...suggestions, ...formFieldSuggestions];
        }
      } catch (apiError) {
        console.warn('Could not fetch MRF template for form fields:', apiError);
      }

      return suggestions
        .sort((a, b) => (b.metadata?.relevanceScore as number || 0) - (a.metadata?.relevanceScore as number || 0))
        .slice(0, 10);

    } catch (error) {
      console.error('Error in mrf. provider:', error);
      return [];
    }
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return suggestion.display;
  }
};

// Step references provider (#)
export const stepReferencesProvider: AutocompleteProvider = {
  trigger: '#',
  getSuggestions: async (input: string): Promise<AutocompleteSuggestion[]> => {
    try {
      // Get base step reference suggestions
      const baseItems = getStepReferenceAutocomplete();
      const suggestions = baseItems.map(item => createSuggestion(item, input));

      // Add steps from current workflow if available in context
      // Note: This would need to be extended based on your context structure
      // For now, we'll use the base suggestions

      return suggestions
        .sort((a, b) => (b.metadata?.relevanceScore as number || 0) - (a.metadata?.relevanceScore as number || 0))
        .slice(0, 10);

    } catch (error) {
      console.error('Error in # provider:', error);
      return [];
    }
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return suggestion.display;
  }
};

// Unified provider array
export const unifiedAutocompleteProviders: AutocompleteProvider[] = [
  functionsProvider,
  userContextProvider,
  dateFunctionsProvider,
  formFieldsProvider,
  stepReferencesProvider
];

// Export for LLM context
export { getLLMContext };