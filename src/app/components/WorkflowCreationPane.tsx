// src/app/components/WorkflowCreationPane.tsx
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
  Alert,
  AlertTitle
} from '@mui/material';
import {
  SmartToy as AimeIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Error as ErrorIcon
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
        
        // Create conversation context
        const context: CreationContext = {
          workflowId: workflow.metadata?.id || 'new-workflow',
          workflowName: workflow.metadata?.name || 'New Workflow',
          userRole: 'admin',
          userDepartment: 'IT',
          availableFunctions: [],
          conversationGoal: isNewWorkflow ? 'create' : 'edit',
          currentWorkflowSteps: Object.keys(workflow.steps || {}),
          mrfData
        };
        
        // Initialize conversation manager
        const conversationState = createEmptyConversationState(
          workflow.metadata?.id || 'new-workflow',
          context
        );
        const manager = new ConversationStateManager(conversationState);
        
        // Add welcome message based on creation context
        const welcomeMessage = mrfData 
          ? `Hi! I'm aime, your AI workflow assistant. I see you want to create a workflow for "${mrfData.title}". Let's build this together step by step! Just describe what you want the workflow to do.`
          : `Hi! I'm aime, your AI workflow assistant. I'm here to help you ${isNewWorkflow ? 'create a new workflow from scratch' : 'edit your existing workflow'}. What would you like to build or modify?`;
        
        manager.addAimeMessage(welcomeMessage, 'text');
        
        // Add contextual guidance for new workflows
        if (isNewWorkflow) {
          const guidanceMessage = "To get started, you can describe your workflow in natural language. For example: 'When an MRF is submitted, check if it needs approval based on budget or location, then either send for approval or proceed directly.'";
          manager.addAimeMessage(guidanceMessage, 'text');
        }
        setConversationManager(manager);
        
        // Initialize creation session
        const session = await creationFlow.initiateCreation(
          workflow.metadata?.id || 'new-workflow',
          conversationState.conversationId,
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
  
  // Get current conversation context
  const getCurrentContext = useCallback((): CreationContext => {
    if (currentSession) {
      return currentSession.context;
    }
    
    // Default context
    return {
      workflowId: workflow.metadata?.id || 'new-workflow',
      workflowName: workflow.metadata?.name || 'New Workflow',
      userRole: 'admin',
      userDepartment: 'IT',
      availableFunctions: [],
      conversationGoal: isNewWorkflow ? 'create' : 'edit',
      currentWorkflowSteps: Object.keys(workflow.steps || {}),
      mrfData
    };
  }, [currentSession, workflow, isNewWorkflow, mrfData]);
  
  // Helper function to add a message and update state properly
  const addMessage = (content: string, sender: 'user' | 'aime', type: 'text' | 'workflow_generated' = 'text') => {
    if (!conversationManager) return;
    
    // Create a new manager with the current state
    const currentState = conversationManager.getState();
    const newManager = new ConversationStateManager(currentState);
    
    // Add the new message
    if (sender === 'user') {
      newManager.addUserMessage(content);
    } else {
      newManager.addAimeMessage(content, type);
    }
    
    // Update the state with the new manager
    setConversationManager(newManager);
    
    // Ensure scroll to bottom after a short delay to let React update DOM
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };
  
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
      
      // Show processing indicator from aime
      const hasExistingSteps = workflow.steps && Object.keys(workflow.steps).length > 0;
      const processingMessage = hasExistingSteps
        ? '🤖 I see you want to modify the existing workflow. Let me understand the current structure and update it based on your request...'
        : '🤖 Working on your request... I\'m analyzing your requirements and creating the workflow.';
      addMessage(processingMessage, 'aime');
      
      // Call backend API for workflow generation
      const response = await fetch('/api/generate-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: messageText,
          context: getCurrentContext(),
          currentWorkflow: workflow // Include the complete current workflow for context
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate workflow');
      }
      
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
      
      // Show success message from aime
      const hasStepsForSuccess = workflow.steps && Object.keys(workflow.steps).length > 0;
      const successMessage = hasStepsForSuccess
        ? `✅ Perfect! I've modified your existing workflow to incorporate your request. The updated workflow maintains the existing structure while adding the new requirements. Check the visualization on the right to see the changes.`
        : `✅ Excellent! I've created your new workflow based on your request. The workflow includes all the logic you described. You can see the complete workflow structure in the visualization on the right.`;
      addMessage(successMessage, 'aime');
      
    } catch (error) {
      console.error('❌ Error in workflow generation:', error);
      
      // Show error message from aime
      const errorMessage = '❌ I apologize, but I encountered an issue while processing your request. Could you please try rephrasing your requirement or try again?';
      addMessage(errorMessage, 'aime');
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
  
  // Update messages when conversation manager changes
  useEffect(() => {
    if (conversationManager) {
      const currentMessages = conversationManager.getMessages();
      setMessages([...currentMessages]); // Create new array to trigger re-render
    }
  }, [conversationManager]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Use a small timeout to ensure DOM has updated after state changes
    const scrollTimeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    return () => clearTimeout(scrollTimeout);
  }, [messages]); // Depend on messages array for auto-scroll
  
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
        <Box sx={{ ml: 'auto' }}>
          <AutoSaveIndicator status={autoSaveStatus} />
        </Box>
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
                  
                  <SimpleMessageRenderer
                    message={message}
                    isStreaming={isStreaming && message.status === 'streaming'}
                  />
                </Paper>
              </ListItem>
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