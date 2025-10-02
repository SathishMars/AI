// src/app/utils/unified-autocomplete-manager.ts

import { AutocompleteProvider, AutocompleteSuggestion, ConversationContext } from '@/app/types/conversation';
import { unifiedAutocompleteProviders } from '@/app/utils/unified-autocomplete-providers';

/**
 * Unified AutocompleteManager that uses the new unified autocomplete system
 * This replaces the old AutocompleteManager with API-driven autocomplete
 */
export class UnifiedAutocompleteManager {
  private providers: AutocompleteProvider[];

  constructor() {
    this.providers = unifiedAutocompleteProviders;
    console.log('🚀 UnifiedAutocompleteManager initialized with', this.providers.length, 'providers:', this.providers.map(p => p.trigger));
  }

  /**
   * Find active trigger and return matching provider
   */
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

  /**
   * Get provider by trigger string
   */
  public getProviderByTrigger(trigger: string): AutocompleteProvider | null {
    return this.providers.find(p => p.trigger === trigger) || null;
  }

  /**
   * Get suggestions for the current context
   */
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
      
      // Sort suggestions by relevance using metadata.relevanceScore
      const sortedSuggestions = this.sortSuggestionsByRelevance(suggestions, activeInfo.searchText);
      return sortedSuggestions;
    } catch (error) {
      console.error('❌ Error getting autocomplete suggestions:', error);
      return [];
    }
  }

  /**
   * Sort suggestions by relevance to search text
   */
  private sortSuggestionsByRelevance(suggestions: AutocompleteSuggestion[], searchText: string): AutocompleteSuggestion[] {
    if (!searchText) return suggestions;
    
    return suggestions.sort((a, b) => {
      // Use metadata.relevanceScore if available
      const aScore = (a.metadata?.relevanceScore as number) || 0;
      const bScore = (b.metadata?.relevanceScore as number) || 0;
      
      if (aScore !== bScore) {
        return bScore - aScore; // Higher scores first
      }
      
      // Fallback to string-based relevance
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

  /**
   * Apply suggestion to text at cursor position
   */
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

  /**
   * Get all available providers for debugging/info
   */
  public getProviders(): AutocompleteProvider[] {
    return this.providers;
  }

  /**
   * Get all available triggers
   */
  public getTriggers(): string[] {
    return this.providers.map(p => p.trigger);
  }
}