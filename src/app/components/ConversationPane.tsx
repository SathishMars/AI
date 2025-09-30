// src/app/components/ConversationPane.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  List,
  ListItem,
  Tooltip,
  Fade,
  CircularProgress,
  TextField,
  Popper,
  ClickAwayListener,
  MenuList,
  MenuItem
} from '@mui/material';
import {
  SmartToy as AimeIcon,
  Send as SendIcon,
  Psychology as SuggestionIcon
} from '@mui/icons-material';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import { ConversationContext, ProactiveSuggestion } from '@/app/types/conversation';
import { ConversationStateManager } from '@/app/utils/conversation-manager';
import { createEmptyConversationState } from '@/app/types/conversation';
import { AutocompleteManager } from '@/app/utils/autocomplete-providers';
import { AutocompleteSuggestion } from '@/app/types/conversation';

// Enhanced SmartAutocomplete with multi-line support and autocomplete
const SmartAutocomplete = ({ value, onChange, onKeyPress, placeholder, disabled, inputRef, context }: {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (event: React.KeyboardEvent) => void;
  placeholder: string;
  disabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  context?: ConversationContext;
}) => {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [autocompleteManager] = useState(() => new AutocompleteManager());
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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
    
    const cursorPosition = textarea.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPosition);
    
    console.log('🔍 Checking triggers at cursor position:', cursorPosition, 'Text before cursor:', textBeforeCursor);
    
    // Check for triggers: @, #, mrf., user.
    const endsWithAt = textBeforeCursor.endsWith('@');
    const endsWithHash = textBeforeCursor.endsWith('#');
    const triggerMatch = textBeforeCursor.match(/[@#]\w*$|\b(mrf|user)\.\w*$/);
    
    if (triggerMatch || endsWithAt || endsWithHash) {
      console.log('🎯 Autocomplete triggered for:', textBeforeCursor);
      try {
        const newSuggestions = await autocompleteManager.getSuggestions(value, cursorPosition, context);
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
  }, [context, value, autocompleteManager]);

  // Handle autocomplete trigger detection
  const handleInputChange = async (newValue: string) => {
    onChange(newValue);
    
    if (!context) {
      console.log('No context available for autocomplete');
      return;
    }

    // Use a small delay to ensure the textarea value is updated, then check triggers
    setTimeout(checkTriggersAtCursor, 0);
  };

  // Handle cursor position changes (clicks, arrow keys, etc.)
  const handleCursorChange = useCallback(() => {
    // Small delay to ensure cursor position is updated
    setTimeout(checkTriggersAtCursor, 100);
  }, [checkTriggersAtCursor]);

  // Handle suggestion selection
  const applySuggestion = (suggestion: AutocompleteSuggestion) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Find and replace the trigger text - support both single char (@, #) and multi-char (mrf., user.)
    const singleCharTriggerMatch = textBeforeCursor.match(/[@#]\w*$/);
    const multiCharTriggerMatch = textBeforeCursor.match(/\b(mrf|user)\.\w*$/);
    const triggerMatch = singleCharTriggerMatch || multiCharTriggerMatch;
    
    if (triggerMatch) {
      const startPos = cursorPosition - triggerMatch[0].length;
      
      // For multi-character triggers, find the provider by the full trigger
      let provider = null;
      if (multiCharTriggerMatch) {
        const fullTrigger = multiCharTriggerMatch[1] + '.'; // e.g., 'mrf.' or 'user.'
        provider = autocompleteManager.getProviderByTrigger(fullTrigger);
      } else if (singleCharTriggerMatch) {
        const trigger = singleCharTriggerMatch[0][0]; // @ or #
        provider = autocompleteManager.getProviderByTrigger(trigger);
      }
      
      const formattedValue = provider ? provider.formatSuggestion(suggestion) : suggestion.value;
      const newText = textBeforeCursor.substring(0, startPos) + 
                     formattedValue + 
                     textAfterCursor;
      onChange(newText);
    }
    
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) {
      onKeyPress(event);
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
      case 'Tab':
        if (selectedIndex >= 0) {
          event.preventDefault();
          applySuggestion(suggestions[selectedIndex]);
        } else {
          onKeyPress(event);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        onKeyPress(event);
    }
  };

  // Sync refs
  useEffect(() => {
    if (inputRef) {
      (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = textAreaRef.current;
    }
  }, [inputRef]);

  return (
    <Box sx={{ flex: 1, position: 'relative' }}>
      <TextField
        inputRef={textAreaRef}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        multiline
        maxRows={5}
        variant="outlined"
        size="small"
        fullWidth
        inputProps={{
          onKeyDown: handleKeyDown,
          onClick: handleCursorChange,
          onKeyUp: handleCursorChange,
          onSelect: handleCursorChange
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            resize: 'none',
            minHeight: '40px'
          },
          '& textarea': {
            resize: 'none !important',
            overflow: 'auto !important'
          }
        }}
      />
      
      {/* Autocomplete Suggestions Popup */}
      <Popper
        open={showSuggestions}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
          <Paper elevation={4} sx={{ maxHeight: 200, overflow: 'auto', minWidth: 250 }}>
            <MenuList dense>
              {suggestions.map((suggestion, index) => (
                <MenuItem
                  key={suggestion.id}
                  selected={index === selectedIndex}
                  onClick={() => applySuggestion(suggestion)}
                  sx={{ fontSize: '14px' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {suggestion.icon && (
                      <span style={{ marginRight: 8, fontSize: '16px' }}>
                        {suggestion.icon}
                      </span>
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {suggestion.display}
                      </Typography>
                      {suggestion.description && (
                        <Typography variant="caption" color="text.secondary">
                          {suggestion.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </MenuList>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
};

const StreamingMessageRenderer = ({ message, isStreaming }: {
  message: { content: string; status?: string };
  isStreaming: boolean;
}) => (
  <Box>
    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
      {message.content}
      {isStreaming && <span style={{ opacity: 0.5 }}>▋</span>}
    </Typography>
  </Box>
);

const ProactiveSuggestionChips = ({ suggestions, onSuggestionClick }: {
  suggestions: ProactiveSuggestion[];
  onSuggestionClick: (suggestion: ProactiveSuggestion) => void;
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
    {suggestions.map((suggestion) => (
      <Chip
        key={suggestion.id}
        label={suggestion.title}
        size="small"
        onClick={() => onSuggestionClick(suggestion)}
        color="primary"
        variant="outlined"
        sx={{ cursor: 'pointer' }}
      />
    ))}
  </Box>
);

const MultiConversationTabs = ({ conversations, activeId, onConversationSelect, onNewConversation }: {
  conversations: Array<{ id: string; name: string }>;
  activeId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', p: 1, borderBottom: 1, borderColor: 'divider' }}>
    {conversations.map((conv) => (
      <Chip
        key={conv.id}
        label={conv.name}
        size="small"
        color={conv.id === activeId ? 'primary' : 'default'}
        onClick={() => onConversationSelect(conv.id)}
        sx={{ mr: 1, cursor: 'pointer' }}
      />
    ))}
    <IconButton size="small" onClick={onNewConversation} color="primary">
      <SendIcon />
    </IconButton>
  </Box>
);

// Export SmartAutocomplete for use in other components
export { SmartAutocomplete };

interface ConversationPaneProps {
  workflow: WorkflowJSON;
  onWorkflowChange: (workflow: WorkflowJSON) => void;
  validationResult: ValidationResult | null;
  isNewWorkflow: boolean;
}

export default function ConversationPane({
  workflow,
  onWorkflowChange: _onWorkflowChange, // eslint-disable-line @typescript-eslint/no-unused-vars
  validationResult: _validationResult, // eslint-disable-line @typescript-eslint/no-unused-vars
  isNewWorkflow
}: ConversationPaneProps) {
  const [conversations, setConversations] = useState<Map<string, ConversationStateManager>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions] = useState<ProactiveSuggestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Helper function to get current conversation context
  const getCurrentContext = useCallback((): ConversationContext => {
    const activeManager = activeConversationId ? conversations.get(activeConversationId) : null;
    if (activeManager) {
      return activeManager.getState().context;
    }
    
    // Default context when no active conversation
    return {
      workflowId: workflow.metadata?.id || 'new-workflow',
      workflowName: workflow.metadata?.name || 'New Workflow',
      userRole: 'admin',
      userDepartment: 'IT',
      availableFunctions: [],
      conversationGoal: isNewWorkflow ? 'create' : 'edit',
      currentWorkflowSteps: Object.keys(workflow.steps || {})
    };
  }, [activeConversationId, conversations, workflow, isNewWorkflow]);

  const createNewConversation = useCallback((workflowName: string) => {
    const context: ConversationContext = {
      workflowId: workflow.metadata?.id || 'new-workflow',
      workflowName,
      userRole: 'admin',
      userDepartment: 'IT',
      availableFunctions: [],
      conversationGoal: isNewWorkflow ? 'create' : 'edit'
    };
    
    const conversationState = createEmptyConversationState(workflow.metadata?.id || 'new-workflow', context);
    const manager = new ConversationStateManager(conversationState);
    
    // Add welcome message
    manager.addAimeMessage(
      `Hi! I'm aime, your AI workflow assistant. I'm here to help you ${isNewWorkflow ? 'create' : 'edit'} your workflow. What would you like to do?`,
      'text'
    );
    
    const conversationId = conversationState.conversationId;
    setConversations(prev => new Map(prev).set(conversationId, manager));
    setActiveConversationId(conversationId);
    
    return conversationId;
  }, [workflow.metadata?.id, isNewWorkflow]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isStreaming) return;

    // Create a conversation if none exists
    let currentConversationId = activeConversationId;
    if (!currentConversationId) {
      currentConversationId = createNewConversation(workflow.metadata?.name || 'New Workflow');
    }

    const manager = conversations.get(currentConversationId);
    if (!manager) return;

    setIsStreaming(true);
    const messageText = currentMessage;
    setCurrentMessage('');

    try {
      // Add user message
      manager.addUserMessage(messageText);
      
      // Simulate AI response (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      manager.addAimeMessage(
        'Thank you for your message. I can help you with workflow creation and editing.',
        'text'
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSuggestionClick = (suggestion: ProactiveSuggestion) => {
    setCurrentMessage(suggestion.title);
  };

  const onNewConversation = () => {
    createNewConversation(`Conversation ${conversations.size + 1}`);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConversationId]);

  // Initialize first conversation
  useEffect(() => {
    if (conversations.size === 0) {
      createNewConversation(workflow.metadata?.name || 'New Workflow');
    }
  }, [conversations.size, createNewConversation, workflow.metadata?.name]);

  const activeManager = activeConversationId ? conversations.get(activeConversationId) : null;
  const messages = activeManager ? activeManager.getMessages() : [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Multi-conversation tabs */}
      <MultiConversationTabs
        conversations={Array.from(conversations.entries()).map(([id, manager]) => ({
          id,
          name: manager.getState().context.workflowName || `Conversation ${id.slice(-6)}`
        }))}
        activeId={activeConversationId}
        onConversationSelect={setActiveConversationId}
        onNewConversation={onNewConversation}
      />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <AimeIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          aime assistant
        </Typography>
        <Chip
          label={isNewWorkflow ? 'Create Mode' : 'Edit Mode'}
          size="small"
          sx={{ ml: 'auto' }}
          color={isNewWorkflow ? 'success' : 'info'}
        />
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {messages.length > 0 ? (
          <List sx={{ height: '100%', overflow: 'auto' }}>
            {messages.map((message) => (
              <ListItem key={message.id} sx={{ display: 'block', py: 1 }}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: message.sender === 'user' ? 'primary.light' : 'grey.100',
                    color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2,
                    maxWidth: '80%',
                    ml: message.sender === 'user' ? 'auto' : 0
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {message.sender === 'aime' && <AimeIcon sx={{ mr: 1, fontSize: 16 }} />}
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      {message.sender === 'user' ? 'You' : 'aime'}
                    </Typography>
                    <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.7 }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                  
                  <StreamingMessageRenderer
                    message={message}
                    isStreaming={isStreaming && message.status === 'streaming'}
                  />
                  
                  {message.suggestions && message.suggestions.length > 0 && (
                    <ProactiveSuggestionChips
                      suggestions={message.suggestions}
                      onSuggestionClick={handleSuggestionClick}
                    />
                  )}
                </Paper>
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              Start a conversation to create or edit your workflow
            </Typography>
          </Box>
        )}
      </Box>

      {/* Proactive Suggestions */}
      {suggestions.length > 0 && (
        <Fade in>
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SuggestionIcon sx={{ mr: 1, fontSize: 16, color: 'primary.main' }} />
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
                Suggestions
              </Typography>
            </Box>
            <ProactiveSuggestionChips
              suggestions={suggestions}
              onSuggestionClick={handleSuggestionClick}
            />
          </Box>
        </Fade>
      )}

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <SmartAutocomplete
            value={currentMessage}
            onChange={setCurrentMessage}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... Use @ for functions, # for steps, mrf. for form fields, user. for user info"
            disabled={isStreaming}
            inputRef={inputRef}
            context={getCurrentContext()}
          />
          
          <Tooltip title="Send message">
            <span>
              <IconButton 
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isStreaming}
                color="primary"
                sx={{ mb: 1 }}
              >
                {isStreaming ? (
                  <CircularProgress size={24} />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Press Enter to send • Shift+Enter for new line • Use @ for functions, # for workflow steps, mrf. for form fields, user. for user info
        </Typography>
      </Box>
    </Box>
  );
}