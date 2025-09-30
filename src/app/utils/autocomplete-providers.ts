// src/app/utils/autocomplete-providers.ts
import { AutocompleteProvider, AutocompleteSuggestion, ConversationContext } from '@/app/types/conversation';
import { EnhancedFunctionsLibraryManager } from './functions-library';
import { FunctionDefinition } from '@/app/types/workflow';
import { MRFTemplate } from '@/app/api/mrf-template/route';
import { UserContext } from '@/app/api/user-context/route';

// Get field icon based on data type
function getFieldIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'string': '📝',
    'number': '🔢',
    'boolean': '✅',
    'date': '📅',
    'array': '📋',
    'object': '🏷️'
  };
  return iconMap[type] || '📄';
}

// Get user field icon based on category
function getUserFieldIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'basic': '👤',
    'contact': '📧',
    'organizational': '🏢',
    'preferences': '⚙️',
    'permissions': '🔐'
  };
  return iconMap[category] || '👤';
}

// Get function icon based on category
function getFunctionIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'approval': '✓',
    'communication': '💬',
    'workflow': '🔄',
    'validation': '🔍',
    'integration': '🔗',
    'event': '📅',
    'data': '📊'
  };
  return iconMap[category] || '⚙️';
}

// Functions autocomplete provider (@)
const functionsProvider: AutocompleteProvider = {
  trigger: '@',
  getSuggestions: async (input: string, _context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    const functionsLibrary = new EnhancedFunctionsLibraryManager();
    const functions = functionsLibrary.discoverFunctions(input);
    
    console.log('📚 Functions library found:', functions.length, 'functions for query:', input || '(empty)');
    
    const suggestions = functions.map((f: FunctionDefinition) => ({
      id: f.id,
      display: f.name,
      value: f.id,
      description: f.description,
      category: f.category,
      icon: getFunctionIcon(f.category),
      metadata: {
        parameters: f.parameters,
        examples: f.examples
      }
    }));
    
    return suggestions;
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return `@${suggestion.value}`;
  }
};

// MRF variables autocomplete provider (mrf.)
const mrfVariablesProvider: AutocompleteProvider = {
  trigger: 'mrf.',
  getSuggestions: async (input: string, _context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    try {
      console.log('🏢 Fetching MRF template variables for query:', input);
      
      const response = await fetch('/api/mrf-template?includeExamples=true');
      if (!response.ok) {
        console.error('Failed to fetch MRF template:', response.statusText);
        return [];
      }
      
      const { data: mrfTemplate }: { data: MRFTemplate } = await response.json();
      
      const suggestions: AutocompleteSuggestion[] = Object.entries(mrfTemplate.fields)
        .filter(([fieldName]) => 
          !input || fieldName.toLowerCase().includes(input.toLowerCase())
        )
        .map(([fieldName, fieldDef]) => ({
          id: `mrf_${fieldName}`,
          display: fieldName,
          value: fieldName,
          description: `${fieldDef.description} (${fieldDef.type})${fieldDef.required ? ' - Required' : ''}`,
          category: fieldDef.type,
          icon: getFieldIcon(fieldDef.type),
          metadata: {
            type: fieldDef.type,
            required: fieldDef.required,
            examples: fieldDef.examples || [],
            validation: fieldDef.validation
          }
        }));
      
      console.log('📋 MRF variables found:', suggestions.length);
      return suggestions;
    } catch (error) {
      console.error('Error fetching MRF variables:', error);
      return [];
    }
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return `mrf.${suggestion.value}`;
  }
};

// User variables autocomplete provider (user.)
const userVariablesProvider: AutocompleteProvider = {
  trigger: 'user.',
  getSuggestions: async (input: string, _context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    try {
      console.log('👤 Fetching user context variables for query:', input);
      
      const response = await fetch('/api/user-context?includeValues=false');
      if (!response.ok) {
        console.error('Failed to fetch user context:', response.statusText);
        return [];
      }
      
      const { data: userContext }: { data: UserContext } = await response.json();
      
      const suggestions: AutocompleteSuggestion[] = Object.entries(userContext.profile)
        .filter(([fieldName]) => 
          !input || fieldName.toLowerCase().includes(input.toLowerCase())
        )
        .map(([fieldName, fieldDef]) => ({
          id: `user_${fieldName}`,
          display: fieldName,
          value: fieldName,
          description: `${fieldDef.description} (${fieldDef.type}) - ${fieldDef.category}`,
          category: fieldDef.category,
          icon: getUserFieldIcon(fieldDef.category),
          metadata: {
            type: fieldDef.type,
            category: fieldDef.category,
            examples: fieldDef.examples || []
          }
        }));
      
      console.log('👥 User variables found:', suggestions.length);
      return suggestions;
    } catch (error) {
      console.error('Error fetching user variables:', error);
      return [];
    }
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return `user.${suggestion.value}`;
  }
};
const workflowStepsProvider: AutocompleteProvider = {
  trigger: '#',
  getSuggestions: async (input: string, context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    const steps = context.currentWorkflowSteps || [];
    
    return steps
      .filter(stepName => stepName.toLowerCase().includes(input.toLowerCase()))
      .map(stepName => ({
        id: `step_${stepName}`,
        display: stepName,
        value: stepName,
        description: `Reference workflow step: ${stepName}`,
        category: 'workflow_step',
        icon: '🔗'
      }));
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return `#${suggestion.value}`;
  }
};

// User context autocomplete provider (user.)
const userContextProvider: AutocompleteProvider = {
  trigger: 'user.',
  getSuggestions: async (input: string, context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    const userProperties = ['name', 'email', 'manager', 'region', 'department', 'role', 'permissions'];
    
    return userProperties
      .filter(prop => prop.toLowerCase().includes(input.toLowerCase()))
      .map(prop => ({
        id: `user.${prop}`,
        display: prop,
        value: `user.${prop}`,
        description: `User property: ${prop}`,
        category: 'user_context',
        icon: '👤',
        metadata: {
          contextPath: `user.${prop}`,
          currentValue: context.userContext?.[prop] || 'undefined'
        }
      }));
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return suggestion.value;
  }
};

// MRF context autocomplete provider (mrf.)
const mrfContextProvider: AutocompleteProvider = {
  trigger: 'mrf.',
  getSuggestions: async (input: string, context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    const mrfProperties = ['attendees', 'budget', 'date', 'duration', 'location', 'type', 'requester', 'title', 'description'];
    
    return mrfProperties
      .filter(prop => prop.toLowerCase().includes(input.toLowerCase()))
      .map(prop => ({
        id: `mrf.${prop}`,
        display: prop,
        value: `mrf.${prop}`,
        description: `MRF property: ${prop}`,
        category: 'mrf_data',
        icon: '📋',
        metadata: {
          contextPath: `mrf.${prop}`,
          currentValue: context.mrfContext?.[prop] || 'undefined'
        }
      }));
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return suggestion.value;
  }
};

// Date/time shortcuts provider
const dateTimeProvider: AutocompleteProvider = {
  trigger: 'date.',
  getSuggestions: async (input: string, _context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    const dateShortcuts = [
      { key: 'today', description: 'Today\'s date', value: new Date().toISOString().split('T')[0] },
      { key: 'tomorrow', description: 'Tomorrow\'s date', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
      { key: 'yesterday', description: 'Yesterday\'s date', value: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
      { key: 'next_week', description: 'One week from today', value: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
      { key: 'next_month', description: 'One month from today', value: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] }
    ];
    
    return dateShortcuts
      .filter(shortcut => shortcut.key.includes(input.toLowerCase()) || shortcut.description.toLowerCase().includes(input.toLowerCase()))
      .map(shortcut => ({
        id: `date.${shortcut.key}`,
        display: shortcut.key,
        value: shortcut.value,
        description: shortcut.description,
        category: 'date_shortcut',
        icon: '📅'
      }));
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return suggestion.value;
  }
};

// Special commands provider
const commandsProvider: AutocompleteProvider = {
  trigger: '/',
  getSuggestions: async (input: string, _context: ConversationContext): Promise<AutocompleteSuggestion[]> => {
    const commands = [
      { cmd: 'validate', description: 'Validate current workflow', icon: '✅' },
      { cmd: 'export', description: 'Export workflow as JSON', icon: '📤' },
      { cmd: 'import', description: 'Import workflow from JSON', icon: '📥' },
      { cmd: 'clear', description: 'Clear conversation history', icon: '🗑️' },
      { cmd: 'help', description: 'Show available commands and functions', icon: '❓' },
      { cmd: 'optimize', description: 'Suggest workflow optimizations', icon: '⚡' },
      { cmd: 'diagram', description: 'Generate workflow diagram', icon: '📊' }
    ];
    
    return commands
      .filter(cmd => cmd.cmd.includes(input.toLowerCase()) || cmd.description.toLowerCase().includes(input.toLowerCase()))
      .map(cmd => ({
        id: `cmd_${cmd.cmd}`,
        display: cmd.cmd,
        value: `/${cmd.cmd}`,
        description: cmd.description,
        category: 'command',
        icon: cmd.icon
      }));
  },
  formatSuggestion: (suggestion: AutocompleteSuggestion): string => {
    return suggestion.value;
  }
};

// Main autocomplete manager
export class AutocompleteManager {
  private providers: AutocompleteProvider[] = [
    functionsProvider,
    workflowStepsProvider,
    mrfVariablesProvider,
    userVariablesProvider,
    userContextProvider,
    mrfContextProvider,
    dateTimeProvider,
    commandsProvider
  ];

  constructor() {
    console.log('🚀 AutocompleteManager initialized with', this.providers.length, 'providers:', this.providers.map(p => p.trigger));
  }

  // Find active trigger and return matching provider
  public findActiveProvider(text: string, cursorPosition: number): { provider: AutocompleteProvider; searchText: string } | null {
    const textBeforeCursor = text.substring(0, cursorPosition);
    
    for (const provider of this.providers) {
      const triggerIndex = textBeforeCursor.lastIndexOf(provider.trigger);
      
      if (triggerIndex !== -1) {
        // Check if this is the most recent trigger
        const afterTrigger = textBeforeCursor.substring(triggerIndex + provider.trigger.length);
        
        // Only activate if there's no whitespace after trigger (except for multi-char triggers)
        if (!afterTrigger.includes(' ') || provider.trigger.includes('.')) {
          return {
            provider,
            searchText: afterTrigger
          };
        }
      }
    }
    
    return null;
  }

  // Get suggestions for the current context
  public async getSuggestions(
    text: string, 
    cursorPosition: number, 
    context: ConversationContext
  ): Promise<AutocompleteSuggestion[]> {
    const activeInfo = this.findActiveProvider(text, cursorPosition);
    
    if (!activeInfo) {
      return [];
    }
    
    try {
      const suggestions = await activeInfo.provider.getSuggestions(activeInfo.searchText, context);
      
      // Sort suggestions by relevance
      const sortedSuggestions = this.sortSuggestionsByRelevance(suggestions, activeInfo.searchText);
      return sortedSuggestions;
    } catch (error) {
      console.error('❌ Error getting autocomplete suggestions:', error);
      return [];
    }
  }

  // Sort suggestions by relevance to search text
  private sortSuggestionsByRelevance(suggestions: AutocompleteSuggestion[], searchText: string): AutocompleteSuggestion[] {
    if (!searchText) return suggestions;
    
    return suggestions.sort((a, b) => {
      const aExactMatch = a.display.toLowerCase() === searchText.toLowerCase();
      const bExactMatch = b.display.toLowerCase() === searchText.toLowerCase();
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      const aStartsWith = a.display.toLowerCase().startsWith(searchText.toLowerCase());
      const bStartsWith = b.display.toLowerCase().startsWith(searchText.toLowerCase());
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return a.display.localeCompare(b.display);
    });
  }

  // Apply suggestion to text at cursor position
  public applySuggestion(
    text: string, 
    cursorPosition: number, 
    suggestion: AutocompleteSuggestion
  ): { newText: string; newCursorPosition: number } {
    const activeInfo = this.findActiveProvider(text, cursorPosition);
    
    if (!activeInfo) {
      return { newText: text, newCursorPosition: cursorPosition };
    }
    
    const triggerStart = text.lastIndexOf(activeInfo.provider.trigger, cursorPosition - 1);
    const beforeTrigger = text.substring(0, triggerStart);
    const afterCursor = text.substring(cursorPosition);
    
    const formattedSuggestion = activeInfo.provider.formatSuggestion(suggestion);
    const newText = beforeTrigger + formattedSuggestion + afterCursor;
    const newCursorPosition = beforeTrigger.length + formattedSuggestion.length;
    
    return { newText, newCursorPosition };
  }

  // Get provider information for a trigger
  public getProviderByTrigger(trigger: string): AutocompleteProvider | null {
    return this.providers.find(p => p.trigger === trigger) || null;
  }

  // Add custom provider
  public addProvider(provider: AutocompleteProvider): void {
    this.providers.push(provider);
  }

  // Remove provider by trigger
  public removeProvider(trigger: string): void {
    this.providers = this.providers.filter(p => p.trigger !== trigger);
  }
}