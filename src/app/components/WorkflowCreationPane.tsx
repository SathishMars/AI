// src/app/components/WorkflowCreationPane.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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
  Alert,
  AlertTitle
} from '@mui/material';
import {
  SmartToy as AimeIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import { 
  CreationSession, 
  CreationContext, 
  MRFData
} from '@/app/types/workflow-creation';
import { ConversationMessage } from '@/app/types/conversation';
import { WorkflowCreationFlow } from '@/app/utils/workflow-creation-flow';
import { createEmptyConversationState, ConversationStateManager } from '@/app/utils/conversation-manager';
import { SmartAutocomplete } from './ConversationPane';
import { populateFunctionSchemas, DEFAULT_REFERENCE_DATA } from '@/app/utils/function-schemas';
import { ConversationHistoryMessage } from '@/app/utils/llm-workflow-generator';

// Memoized message item component to prevent unnecessary re-renders
const MessageItem = memo(({ message, isStreaming }: { message: ConversationMessage; isStreaming: boolean }) => (
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
      
      <SimpleMessageRenderer
        message={message}
        isStreaming={isStreaming && message.status === 'streaming'}
      />
    </Paper>
  </ListItem>
));

MessageItem.displayName = 'MessageItem';

// Enhanced auto-save status indicator

// Auto-save status indicator
const AutoSaveIndicator = ({ status }: { status: 'saving' | 'saved' | 'error' | 'idle' }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'saving': return <CircularProgress size={16} />;
      case 'saved': return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'error': return <ErrorIcon sx={{ color: 'error.main' }} />;
      default: return null;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'error': return 'Save failed';
      default: return '';
    }
  };
  
  return (
    <Fade in={status !== 'idle'}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {getStatusIcon()}
        <Typography variant="caption" color="text.secondary">
          {getStatusText()}
        </Typography>
      </Box>
    </Fade>
  );
};

// Simple message display without workflow content
const SimpleMessageRenderer = ({ 
  message, 
  isStreaming 
}: {
  message: { content: string; status?: string };
  isStreaming: boolean;
}) => (
  <Box>
    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
      {message.content}
      {isStreaming && <span style={{ opacity: 0.5 }}>▋</span>}
    </Typography>
  </Box>
);

interface WorkflowCreationPaneProps {
  workflow: WorkflowJSON;
  onWorkflowChange: (workflow: WorkflowJSON) => void;
  validationResult: ValidationResult | null;
  isNewWorkflow: boolean;
  mrfData?: MRFData;
}

export default function WorkflowCreationPane({
  workflow,
  onWorkflowChange,
  validationResult, // eslint-disable-line @typescript-eslint/no-unused-vars
  isNewWorkflow,
  mrfData
}: WorkflowCreationPaneProps) {
  // Creation flow state
  const [creationFlow] = useState(() => new WorkflowCreationFlow());
  const [currentSession, setCurrentSession] = useState<CreationSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error' | 'idle'>('idle');
  
  // Conversation state
  const [conversationManager, setConversationManager] = useState<ConversationStateManager | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // UI state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Initialize creation session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('🚀 Initializing workflow creation session');
        
        const workflowId = workflow.metadata?.id || 'new-workflow';
        
        // Create conversation context
        const context: CreationContext = {
          workflowId,
          workflowName: workflow.metadata?.name || 'New Workflow',
          userRole: 'admin',
          userDepartment: 'IT',
          availableFunctions: [],
          conversationGoal: isNewWorkflow ? 'create' : 'edit',
          currentWorkflowSteps: Object.keys(workflow.steps || {}),
          mrfData
        };
        
        // Try to load existing conversation first
        const existingConversationKey = `conversation_${workflowId}`;
        let manager: ConversationStateManager | null = null;
        
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedData = localStorage.getItem(existingConversationKey);
          if (savedData) {
            try {
              const parsedState = JSON.parse(savedData);
              // Restore conversation state with proper Date objects
              const restoredState = {
                ...parsedState,
                messages: parsedState.messages.map((msg: ConversationMessage) => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                })),
                lastActivity: new Date(parsedState.lastActivity),
                context: { ...context, ...parsedState.context } // Merge with current context
              };
              
              manager = new ConversationStateManager(restoredState);
              console.log('✅ Loaded existing conversation with', restoredState.messages.length, 'messages');
            } catch (error) {
              console.warn('⚠️ Failed to restore conversation, creating new one:', error);
            }
          }
        }
        
        // Create new conversation if no existing one found
        if (!manager) {
          const conversationState = createEmptyConversationState(workflowId, context);
          manager = new ConversationStateManager(conversationState);
          
          // Add combined welcome and guidance message only for new conversations
          const welcomeMessage = mrfData 
            ? `Hi! I'm aime, your AI workflow assistant. I see you want to create a workflow for "${mrfData.title}". Let's build this together step by step! Just describe what you want the workflow to do.`
            : isNewWorkflow
              ? `Hi! I'm aime, your AI workflow assistant. I'm here to help you create a new workflow from scratch. What would you like to build or modify?\n\nTo get started, you can describe your workflow in natural language. For example: 'When an MRF is submitted, check if it needs approval based on budget or location, then either send for approval or proceed directly.'`
              : `Hi! I'm aime, your AI workflow assistant. I'm here to help you edit your existing workflow. What would you like to build or modify?`;          
          manager.addAimeMessage(welcomeMessage, 'text');
          console.log('✅ Created new conversation with welcome message');
        }
        
        setConversationManager(manager);
        
        // Initialize creation session
        const session = await creationFlow.initiateCreation(
          workflowId,
          manager.getState().conversationId,
          context,
          mrfData
        );
        
        setCurrentSession(session);
        
        console.log('✅ Creation session initialized successfully');
        
      } catch (error) {
        console.error('❌ Error initializing creation session:', error);
      }
    };
    
    initializeSession();
  }, [workflow.metadata?.id, workflow.metadata?.name, workflow.steps, isNewWorkflow, mrfData, creationFlow]);
  
  // Handle auto-save status events
  useEffect(() => {
    const handleAutoSaveEvent = (event: CustomEvent) => {
      if (event.detail.sessionId === currentSession?.sessionId) {
        setAutoSaveStatus(event.detail.status);
        
        // Reset to idle after showing saved status
        if (event.detail.status === 'saved') {
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        }
      }
    };
    
    window.addEventListener('autoSaveStatus', handleAutoSaveEvent as EventListener);
    return () => window.removeEventListener('autoSaveStatus', handleAutoSaveEvent as EventListener);
  }, [currentSession?.sessionId]);
  
  // Helper function to get recent conversation history (last 10 message pairs)
  const getConversationHistory = useCallback((): ConversationHistoryMessage[] => {
    if (!conversationManager) return [];
    
    const messages = conversationManager.getMessages();
    const history: ConversationHistoryMessage[] = [];
    
    // Take last 20 messages (up to 10 pairs), but skip the welcome message
    const recentMessages = messages
      .filter(msg => msg.content !== 'Hello! I\'m Aime, your AI workflow assistant. I\'m here to help you create and customize workflows for your team.') // Skip welcome message
      .slice(-20); // Last 20 messages
    
    recentMessages.forEach(msg => {
      history.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      });
    });
    
    return history;
  }, [conversationManager]);

  // Get current conversation context
  const getCurrentContext = useCallback((): CreationContext => {
    if (currentSession) {
      return currentSession.context;
    }
    
    // Default context with enhanced data
    return {
      workflowId: workflow.metadata?.id || 'new-workflow',
      workflowName: workflow.metadata?.name || 'New Workflow',
      userRole: 'admin',
      userDepartment: 'IT',
      availableFunctions: [
        'onMRFSubmit',
        'requestApproval', 
        'createEvent',
        'sendNotification',
        'onScheduledEvent',
        'onApprovalReceived',
        'updateMRFStatus'
      ],
      conversationGoal: isNewWorkflow ? 'create' : 'edit',
      currentWorkflowSteps: Object.keys(workflow.steps || {}),
      mrfData
    };
  }, [currentSession, workflow, isNewWorkflow, mrfData]);
  
  // Helper function to add a message and update state properly
  const addMessage = useCallback((content: string, sender: 'user' | 'aime', type: 'text' | 'workflow_generated' = 'text') => {
    if (!conversationManager) return;
    
    // Create the message object with unique ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: ConversationMessage = {
      id: messageId,
      sender,
      content,
      timestamp: new Date(),
      status: sender === 'user' ? 'complete' : 'streaming',
      type,
    };
    
    // Add to local state first (primary source of truth for UI)
    setMessages(prev => [...prev, newMessage]);
    
    // Also add to conversation manager for persistence
    if (sender === 'user') {
      conversationManager.addUserMessage(content);
    } else {
      conversationManager.addAimeMessage(content, type);
    }
  }, [conversationManager]);

  // Helper function to replace the last aime message
  const replaceLastAimeMessage = useCallback((content: string, type: 'text' | 'workflow_generated' = 'text') => {
    if (!conversationManager) return;
    
    // Update local state (primary source of truth for UI)
    setMessages(prev => {
      const lastAimeIndex = prev.findLastIndex(msg => msg.sender === 'aime');
      
      if (lastAimeIndex !== -1) {
        const newMessages = [...prev];
        newMessages[lastAimeIndex] = {
          ...newMessages[lastAimeIndex],
          content,
          type,
          timestamp: new Date(),
          status: 'complete' as const
        };
        
        // Scroll to bottom after message replacement
        setTimeout(() => {
          // Check if scrollIntoView exists (JSDOM compatibility)
          if (messagesEndRef.current?.scrollIntoView) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
        
        return newMessages;
      }
      return prev;
    });
  }, [conversationManager]);
  
  // Handle keyboard input
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };
  
  // Send message and generate workflow via backend
  const sendMessage = async () => {
    if (!currentMessage.trim() || isStreaming || !currentSession || !conversationManager) return;
    
    setIsStreaming(true);
    const messageText = currentMessage;
    setCurrentMessage('');
    setIsCreating(true);
    
    try {
      console.log('📤 Sending user message:', messageText);
      
      // Add user message to conversation
      addMessage(messageText, 'user');
      
      // Show processing indicator from aime (will be replaced with actual response)
      const hasExistingSteps = workflow.steps && Object.keys(workflow.steps).length > 0;
      const processingMessage = hasExistingSteps
        ? 'I see you want to modify the existing workflow. Let me understand the current structure and update it based on your request...'
        : 'Working on your request... I\'m analyzing your requirements and creating the workflow.';
      addMessage(processingMessage, 'aime');
      
      // Call backend API for workflow generation with enhanced context
      const baseContext = getCurrentContext();
      const conversationHistory = getConversationHistory();
      const functionSchemas = populateFunctionSchemas(DEFAULT_REFERENCE_DATA);
      
      const enhancedContext = {
        ...baseContext,
        // Add enhanced data for LLM context
        conversationHistory,
        functionSchemas,
        referenceData: DEFAULT_REFERENCE_DATA
      };
      
      const response = await fetch('/api/generate-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: messageText,
          context: enhancedContext,
          currentWorkflow: workflow // Include the complete current workflow for context
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate workflow');
      }
      
      console.log('📊 API Response:', result);
      
      // Update workflow in the right pane
      if (result.workflow && onWorkflowChange) {
        const completeWorkflow = createCompleteWorkflow(result.workflow);
        if (completeWorkflow) {
          console.log('✅ Updating workflow with:', completeWorkflow);
          onWorkflowChange(completeWorkflow);
        }
      }
      
      // Small delay to make the interaction feel natural
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Handle conversational response and follow-up questions
      if (result.conversationalResponse) {
        console.log('💬 Conversational response detected:', result.conversationalResponse);
        
        // Group conversational response with follow-up questions in a single message
        let combinedMessage = result.conversationalResponse;
        
        // Add follow-up questions if present
        if (result.followUpQuestions && result.followUpQuestions.length > 0) {
          console.log('❓ Follow-up questions:', result.followUpQuestions);
          
          // Add the questions to the same message bubble
          combinedMessage += `\n\nTo complete your workflow, I need some additional information:\n\n${result.followUpQuestions.map((question: string, index: number) => `${index + 1}. ${question}`).join('\n')}`;
          
          // If parameter collection is needed, add the hint to the same message
          if (result.parameterCollectionNeeded) {
            console.log('🔧 Parameter collection needed');
            combinedMessage += "\n\nPlease provide the information above so I can complete the workflow configuration with the specific details.";
          }
        }
        
        // Replace the processing message with the actual LLM response
        replaceLastAimeMessage(combinedMessage);
      } else {
        // Replace with standard success message when no conversational response
        const hasStepsForSuccess = workflow.steps && Object.keys(workflow.steps).length > 0;
        const successMessage = hasStepsForSuccess
          ? `Perfect! I've modified your existing workflow to incorporate your request. The updated workflow maintains the existing structure while adding the new requirements. Check the visualization on the right to see the changes.`
          : `Excellent! I've created your new workflow based on your request. The workflow includes all the logic you described. You can see the complete workflow structure in the visualization on the right.`;
        replaceLastAimeMessage(successMessage);
      }
      
    } catch (error) {
      console.error('❌ Error in workflow generation:', error);
      
      // Replace processing message with error message
      const errorMessage = 'I apologize, but I encountered an issue while processing your request. Could you please try rephrasing your requirement or try again?';
      replaceLastAimeMessage(errorMessage);
    } finally {
      setIsStreaming(false);
      setIsCreating(false);
    }
  };
  
  // Create complete workflow from partial data
  const createCompleteWorkflow = (partialWorkflow: Partial<WorkflowJSON>): WorkflowJSON | null => {
    console.log('🔨 Building complete workflow from partial:', partialWorkflow);
    
    // Build a complete workflow by merging partial data with current workflow
    const baseWorkflow = workflow;
    
    const completeWorkflow: WorkflowJSON = {
      schemaVersion: partialWorkflow.schemaVersion || baseWorkflow.schemaVersion || '1.0',
      metadata: {
        ...baseWorkflow.metadata,
        ...partialWorkflow.metadata,
        updatedAt: new Date()
      },
      steps: {
        ...baseWorkflow.steps,
        ...partialWorkflow.steps
      }
    };
    
    console.log('✅ Created complete workflow:', completeWorkflow);
    return completeWorkflow;
  };
  
  // Handle manual refinement
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRefinement = async (refinementRequest: string) => {
    if (!currentSession) return;
    
    try {
      setIsCreating(true);
      
      const workflowUpdate = await creationFlow.processUserRefinement(
        currentSession.sessionId,
        refinementRequest,
        onWorkflowChange
      );
      
      // Update conversation
      conversationManager?.addUserMessage(refinementRequest);
      conversationManager?.addAimeMessage(
        `I've updated the workflow based on your request. The changes include: ${workflowUpdate.changes.map(c => c.description).join(', ')}.`,
        'workflow_generated'
      );
      
    } catch (error) {
      console.error('❌ Error processing refinement:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Get messages and trigger re-render when they change
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  
  // Initialize messages from conversation manager only once when it's set
  useEffect(() => {
    if (conversationManager && messages.length === 0) {
      const currentMessages = conversationManager.getMessages();
      setMessages([...currentMessages]);
    }
  }, [conversationManager, messages.length]);
  
  // Simple background persistence - save messages occasionally without affecting UI
  useEffect(() => {
    if (!conversationManager || messages.length === 0) return;
    
    // Save to localStorage periodically (non-intrusive)
    const saveInterval = setInterval(() => {
      try {
        const workflowId = workflow.metadata?.id || 'new-workflow';
        const conversationKey = `conversation_${workflowId}`;
        const state = conversationManager.getState();
        
        // Update conversation manager with current local messages if they differ
        const managerMessages = conversationManager.getMessages();
        if (messages.length > managerMessages.length) {
          // Local state has more messages, sync the difference
          const newMessages = messages.slice(managerMessages.length);
          newMessages.forEach(msg => {
            if (msg.sender === 'user') {
              conversationManager.addUserMessage(msg.content);
            } else {
              conversationManager.addAimeMessage(msg.content, msg.type);
            }
          });
        }
        
        localStorage.setItem(conversationKey, JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to save conversation:', error);
      }
    }, 5000); // Save every 5 seconds
    
    return () => clearInterval(saveInterval);
  }, [conversationManager, messages, workflow.metadata?.id]);
  

  // Auto-scroll to bottom when new messages are added (not when existing ones are updated)
  const previousMessageCount = useRef(0);
  useEffect(() => {
    if (messages.length > previousMessageCount.current) {
      // Only scroll when new messages are added, not when existing ones are updated
      const scrollTimeout = setTimeout(() => {
        // Check if scrollIntoView exists (JSDOM compatibility)
        if (messagesEndRef.current?.scrollIntoView) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50); // Reduced delay for better UX
      
      previousMessageCount.current = messages.length;
      return () => clearTimeout(scrollTimeout);
    }
  }, [messages.length]); // Only depend on message count, not the entire array
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Header with Auto-Save Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <AimeIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          aime workflow creator
        </Typography>
        <Chip
          label={isNewWorkflow ? 'Create Mode' : 'Edit Mode'}
          size="small"
          sx={{ ml: 2 }}
          color={isNewWorkflow ? 'success' : 'info'}
        />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Toggle guidance">
            <IconButton 
              size="small" 
              aria-label="Toggle guidance"
              onClick={() => {/* Toggle guidance panel */}}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          <AutoSaveIndicator status={autoSaveStatus} />
        </Box>
      </Box>
      
      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {messages.length > 0 ? (
          <List sx={{ height: '100%', overflow: 'auto' }}>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isStreaming={isStreaming && message.status === 'streaming'}
              />
            ))}
            <div ref={messagesEndRef} />
          </List>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Ready to create your workflow!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
              I&apos;ll guide you through creating a workflow step by step. Just describe what you want to build and I&apos;ll help you structure it properly.
            </Typography>
            {mrfData && (
              <Alert severity="info" sx={{ mt: 2, maxWidth: 400 }}>
                <AlertTitle>MRF Context Loaded</AlertTitle>
                Creating workflow for: {mrfData.title}
              </Alert>
            )}
          </Box>
        )}
      </Box>
      
      {/* Input Area with Enhanced Features */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <SmartAutocomplete
            value={currentMessage}
            onChange={setCurrentMessage}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to build... Use @ for functions, # for steps, mrf. for form fields, user. for user info"
            disabled={isStreaming || isCreating}
            inputRef={inputRef}
            context={getCurrentContext()}
          />
          
          <Tooltip title="Send message">
            <span>
              <IconButton 
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isStreaming || isCreating}
                color="primary"
                sx={{ mb: 1 }}
                aria-label="Send message"
              >
                {isStreaming || isCreating ? (
                  <CircularProgress size={24} />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Press Enter to send • Shift+Enter for new line • I&apos;ll auto-save as we build
        </Typography>
      </Box>
    </Box>
  );
}