// src/app/utils/unified-autocomplete-providers.ts

import { AutocompleteProvider, AutocompleteSuggestion, ConversationContext } from '@/app/types/conversation';
import { 
  getFunctionAutocomplete,
  getUserContextAutocomplete,
  getDateFunctionAutocomplete,
  getFormFieldAutocomplete,
  getStepReferenceAutocomplete,
  getLLMContext
} from '@/app/data/workflow-conversation-autocomplete';
import { WorkflowAutocompleteItem, ParameterDefinition } from '@/app/types/workflow-conversation-autocomplete';

function computeRelevanceScore(term: string, input: string): number {
  if (!input) {
    return 30;
  }

  const normalizedTerm = term.toLowerCase();
  const query = input.toLowerCase();

  if (normalizedTerm === query) {
    return 100;
  }

  if (normalizedTerm.startsWith(query)) {
    return 75;
  }

  if (normalizedTerm.includes(query)) {
    return 50;
  }

  return 20;
}

function dedupeSuggestionsByValue(suggestions: AutocompleteSuggestion[]): AutocompleteSuggestion[] {
  const byValue = new Map<string, AutocompleteSuggestion>();

  suggestions.forEach((suggestion) => {
    const existing = byValue.get(suggestion.value);
    if (!existing) {
      byValue.set(suggestion.value, suggestion);
      return;
    }

    const existingScore = (existing.metadata?.relevanceScore as number) ?? 0;
    const suggestionScore = (suggestion.metadata?.relevanceScore as number) ?? 0;

    if (suggestionScore > existingScore) {
      byValue.set(suggestion.value, suggestion);
    }
  });

  return Array.from(byValue.values());
}

function sortSuggestions(suggestions: AutocompleteSuggestion[], limit = 10): AutocompleteSuggestion[] {
  return dedupeSuggestionsByValue(suggestions)
    .sort((a, b) => {
      const aScore = (a.metadata?.relevanceScore as number) ?? 0;
      const bScore = (b.metadata?.relevanceScore as number) ?? 0;

      if (aScore !== bScore) {
        return bScore - aScore;
      }

      return a.display.localeCompare(b.display);
    })
    .slice(0, limit);
}

function buildContextSuggestions(
  entries: Array<[string, unknown]>,
  input: string,
  {
    category,
    icon,
    idPrefix,
    descriptionBuilder
  }: {
    category: AutocompleteSuggestion['category'];
    icon: string;
    idPrefix: string;
    descriptionBuilder?: (key: string, value: unknown) => string;
  }
): AutocompleteSuggestion[] {
  const query = input.toLowerCase();

  return entries
    .filter(([key]) => !input || key.toLowerCase().includes(query))
    .map(([key, value], index) => {
      const relevanceScore = computeRelevanceScore(key, input);
      return {
        id: `${idPrefix}_${key}_${index}`,
        display: key,
        value: key,
        description: descriptionBuilder ? descriptionBuilder(key, value) : undefined,
        category,
        icon,
        metadata: {
          source: 'context',
          contextValue: value,
          relevanceScore
        }
      };
    });
}

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
      llmUsageInstructions: item.llmUsageInstructions ?? item.llmInstructions?.usage,
      llmJsonExample: item.llmJsonExample ?? item.llmInstructions?.jsonExample,
      outputs: item.outputs,
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
          .map(item => createSuggestion(item, input));

        console.log(`🔍 ${trigger} provider found ${suggestions.length} suggestions for "${input}"`);
        return sortSuggestions(suggestions);

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
export const userContextProvider: AutocompleteProvider = {
  trigger: 'user.',
  getSuggestions: async (input: string, context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    try {
      const baseItems = getUserContextAutocomplete();
      const baseSuggestions = baseItems.map(item => createSuggestion(item, input));

      const contextEntries = Object.entries(context.userContext ?? {});
      const contextSuggestions = buildContextSuggestions(contextEntries, input, {
        category: 'userContext',
        icon: '👤',
        idPrefix: 'user_context_dynamic',
        descriptionBuilder: (key, value) => `Current user context value for ${key}${value !== undefined ? `: ${String(value)}` : ''}`
      });

      const suggestions = [...baseSuggestions, ...contextSuggestions];

      return sortSuggestions(suggestions);
    } catch (error) {
      console.error('Error in user. provider:', error);
      return [];
    }
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return suggestion.value;
  }
};

// Date functions provider (date.)
export const dateFunctionsProvider = createProvider('date.', getDateFunctionAutocomplete);

// Form fields provider (mrf.)
export const formFieldsProvider: AutocompleteProvider = {
  trigger: 'mrf.',
  getSuggestions: async (input: string, context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    try {
      // Get base form field suggestions
      const baseItems = getFormFieldAutocomplete();
      const baseSuggestions = baseItems.map(item => createSuggestion(item, input));
      const suggestions: AutocompleteSuggestion[] = [...baseSuggestions];

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
                  relevanceScore: computeRelevanceScore(fieldName, input)
                }
              };
            });

          suggestions.push(...formFieldSuggestions);
        }
      } catch (apiError) {
        console.warn('Could not fetch MRF template for form fields:', apiError);
      }

      if (context?.mrfContext) {
        const contextEntries = Object.entries(context.mrfContext);
        const contextSuggestions = buildContextSuggestions(contextEntries, input, {
          category: 'formField',
          icon: '📝',
          idPrefix: 'mrf_context',
          descriptionBuilder: (key, value) => `MRF context value for ${key}${value !== undefined ? `: ${String(value)}` : ''}`
        });

        suggestions.push(...contextSuggestions);
      }

      return sortSuggestions(suggestions);

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
  getSuggestions: async (input: string, context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    try {
      // Get base step reference suggestions
      const baseItems = getStepReferenceAutocomplete();
      const suggestions = baseItems.map(item => createSuggestion(item, input));

      if (context?.currentWorkflowSteps && context.currentWorkflowSteps.length > 0) {
        const stepSuggestions = context.currentWorkflowSteps
          .filter(step => !input || step.toLowerCase().includes(input.toLowerCase()))
          .map((step, index) => ({
            id: `workflow_step_${index}_${step}`,
            display: step,
            value: step,
            description: 'Reference a workflow step by ID',
            category: 'stepReference',
            icon: '#️⃣',
            metadata: {
              source: 'context',
              relevanceScore: computeRelevanceScore(step, input)
            }
          }));

        suggestions.push(...stepSuggestions);
      }

      // Add steps from current workflow if available in context
      // Note: This would need to be extended based on your context structure
      // For now, we'll use the base suggestions

      return sortSuggestions(suggestions);

    } catch (error) {
      console.error('Error in # provider:', error);
      return [];
    }
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return suggestion.value;
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