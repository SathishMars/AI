// src/app/components/SmartAutocomplete.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TextField,
  Popper,
  ClickAwayListener,
  MenuList,
  MenuItem,
  Paper
} from '@mui/material';
import { ConversationContext } from '@/app/types/conversation';
import { AutocompleteSuggestion } from '@/app/types/conversation';
import { UnifiedAutocompleteManager } from '@/app/utils/unified-autocomplete-manager';

interface SmartAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (event: React.KeyboardEvent) => void;
  placeholder: string;
  disabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  context?: ConversationContext;
}

// Enhanced SmartAutocomplete with multi-line support and autocomplete
export const SmartAutocomplete: React.FC<SmartAutocompleteProps> = ({ 
  value, 
  onChange, 
  onKeyPress, 
  placeholder, 
  disabled, 
  inputRef, 
  context 
}) => {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [autocompleteManager] = useState(() => new UnifiedAutocompleteManager());
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const latestValueRef = useRef(value);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  // Auto-resize textarea based on content (max 5 lines)
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const lineHeight = 24; // Approximate line height
      const maxHeight = lineHeight * 5; // 5 lines max
      const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Handle cursor position changes and check for triggers
  const checkTriggersAtCursor = useCallback(async () => {
    if (!context) return;
    
    const textarea = textAreaRef.current;
    if (!textarea) return;
    
    const currentValue = latestValueRef.current;
    const cursorPosition = textarea.selectionStart ?? currentValue.length;
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    
    console.log('🔍 Checking triggers at cursor position:', cursorPosition, 'Text before cursor:', textBeforeCursor);
    
    // Check for triggers: @, #, mrf., user.
    const endsWithAt = textBeforeCursor.endsWith('@');
    const endsWithHash = textBeforeCursor.endsWith('#');
    const triggerMatch = textBeforeCursor.match(/[@#]\w*$|\b(mrf|user)\.\w*$/);
    
    if (triggerMatch || endsWithAt || endsWithHash) {
      console.log('🎯 Autocomplete triggered for:', textBeforeCursor);
      try {
  const newSuggestions = await autocompleteManager.getSuggestions(currentValue, cursorPosition, context);
        console.log('✅ Got', newSuggestions.length, 'suggestions');
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
        setSelectedIndex(-1);
        setAnchorEl(textarea);
      } catch (error) {
        console.error('❌ Error getting autocomplete suggestions:', error);
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [context, autocompleteManager]);

  // Apply selected suggestion
  const applySuggestion = (suggestion: AutocompleteSuggestion) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);

    // Find the trigger and replace the text after it
    let newText = value;
    let newCursorPosition = cursorPosition;

    if (textBeforeCursor.endsWith('@') || textBeforeCursor.endsWith('#')) {
      // Just triggered, append suggestion
      newText = textBeforeCursor + suggestion.value + textAfterCursor;
      newCursorPosition = cursorPosition + suggestion.value.length;
    } else {
      // Find the start of the current word/trigger
      const triggers = ['@', '#', 'user.', 'mrf.', 'date.'];
      let triggerStart = -1;
      
      for (const trigger of triggers) {
        const lastIndex = textBeforeCursor.lastIndexOf(trigger);
        if (lastIndex > triggerStart) {
          triggerStart = lastIndex;
        }
      }
      
      if (triggerStart >= 0) {
        const beforeTrigger = value.substring(0, triggerStart);
        const triggerPart = textBeforeCursor.substring(triggerStart);
        const triggerMatch = triggerPart.match(/^(@|#|user\.|mrf\.|date\.)/);
        
        if (triggerMatch) {
          const trigger = triggerMatch[1];
          newText = beforeTrigger + trigger + suggestion.value + textAfterCursor;
          newCursorPosition = beforeTrigger.length + trigger.length + suggestion.value.length;
        }
      }
    }

    onChange(newText);
    setShowSuggestions(false);
    
    // Set cursor position after state update
    setTimeout(() => {
      if (textarea) {
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        textarea.focus();
      }
    }, 0);
  };

  // Handle input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
  latestValueRef.current = newValue;
  onChange(newValue);
    
    // Trigger autocomplete check after a small delay
    setTimeout(() => {
      checkTriggersAtCursor();
    }, 50);
  };

  // Handle key navigation in suggestions
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev <= 0 ? suggestions.length - 1 : prev - 1);
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            event.preventDefault();
            applySuggestion(suggestions[selectedIndex]);
            return;
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    }
    
    onKeyPress(event);
  };

  // Handle click outside to close suggestions
  const handleClickAway = () => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle cursor position changes for autocomplete
  const handleSelect = () => {
    setTimeout(() => {
      checkTriggersAtCursor();
    }, 10);
  };

  return (
    <>
      <TextField
        multiline
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        disabled={disabled}
        autoFocus
        inputRef={(el) => {
          textAreaRef.current = el;
          if (inputRef) {
            (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            minHeight: 'auto',
            alignItems: 'flex-start',
            padding: '12px',
            '& textarea': {
              resize: 'none',
              overflow: 'auto',
              lineHeight: '24px',
              fontFamily: 'inherit'
            }
          }
        }}
      />
      
      {showSuggestions && (
        <Popper
          open={showSuggestions}
          anchorEl={anchorEl}
          placement="bottom-start"
          style={{ zIndex: 1300 }}
        >
          <ClickAwayListener onClickAway={handleClickAway}>
            <Paper elevation={3} sx={{ maxHeight: 200, overflow: 'auto', minWidth: 200 }}>
              <MenuList dense>
                {suggestions.map((suggestion, index) => (
                  <MenuItem
                    key={suggestion.id}
                    selected={index === selectedIndex}
                    onClick={() => applySuggestion(suggestion)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      minHeight: '40px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {suggestion.icon && `${suggestion.icon} `}
                      {suggestion.display}
                    </div>
                    {suggestion.description && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        {suggestion.description}
                      </div>
                    )}
                  </MenuItem>
                ))}
              </MenuList>
            </Paper>
          </ClickAwayListener>
        </Popper>
      )}
    </>
  );
};