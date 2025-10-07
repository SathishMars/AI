'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  Tooltip,
  CircularProgress,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  SmartToy as AimeIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { WorkflowJSON, WorkflowStep } from '@/app/types/workflow';
import { 
  CreationSession, 
  CreationContext, 
  MRFData
} from '@/app/types/workflow-creation';
import { ConversationMessage } from '@/app/types/conversation';
import { WorkflowCreationFlow } from '@/app/utils/workflow-creation-flow';
import { createEmptyConversationState, ConversationStateManager } from '@/app/utils/conversation-manager';
import { WorkflowContext } from '@/app/utils/frontend-conversation-helpers';
import { generateUniqueTemplateName } from '@/app/utils/template-name-generator';
import { SmartAutocomplete } from './SmartAutocomplete';
import { ConversationHistoryMessage } from '@/app/utils/llm-workflow-generator';
import { WorkflowAutocompleteItem } from '@/app/types/workflow-conversation-autocomplete';
import { getLLMContext } from '@/app/data/workflow-conversation-autocomplete';
// Phase 4: Frontend validation integration
import { useWorkflowValidation, WorkflowValidationState } from '@/app/hooks/useWorkflowValidation';
import { WorkflowValidationFeedback } from './WorkflowValidationFeedback';

// Cache for available functions to prevent constant API calls
let availableFunctionsCache: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper to fetch available functions from unified API
const fetchAvailableFunctions = async (): Promise<string[]> => {
  // Return cached result if still valid
  const now = Date.now();
  if (availableFunctionsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return availableFunctionsCache;
  }
  
  try {
    const response = await fetch('/api/workflow-autocomplete?category=function&includeMetadata=false');
    if (response.ok) {
      const { data } = await response.json();
      const functions = data.autocompleteItems?.map((item: WorkflowAutocompleteItem) => item.name) || [];
      
      // Cache the result
      availableFunctionsCache = functions;
      cacheTimestamp = now;
      
      return functions;
    }
  } catch (error) {
    console.warn('Could not fetch available functions, using fallback:', error);
  }
  
  // Fallback to basic function list
  const fallback = ['sendEmail', 'requestApproval', 'createEvent'];
  if (!availableFunctionsCache) {
    availableFunctionsCache = fallback;
    cacheTimestamp = now;
  }
  return fallback;
};

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

/**
 * WorkflowCreationPane - Enhanced with LangChain Integration
 * 
 * This component now uses the LangChain/LangGraph architecture for:
 * - Persistent conversation memory across sessions
 * - Multi-provider LLM management (OpenAI/Anthropic)
 * - Tool-aware workflow generation with function calling
 * - Enhanced context understanding and iterative refinement
 * 
 * Key LangChain Features:
 * - Conversation memory stored in MongoDB
 * - Tool registry integration for workflow functions
 * - Multi-provider LLM switching based on task complexity
 * - Session-based conversation tracking
 */

interface WorkflowCreationPaneProps {
  workflow: WorkflowJSON;
  onWorkflowChange: (workflow: WorkflowJSON) => void;
  isNewWorkflow: boolean;
  mrfData?: MRFData;
}

export default function WorkflowCreationPane({
  workflow,
  onWorkflowChange,
  isNewWorkflow,
  mrfData
}: WorkflowCreationPaneProps) {
  // Creation flow state
  const [creationFlow] = useState(() => new WorkflowCreationFlow());
  const [currentSession, setCurrentSession] = useState<CreationSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Memoize validation callback to prevent infinite loops
  const onValidationComplete = useCallback((state: WorkflowValidationState) => {
    console.log('🔍 Validation complete:', state.isValid ? 'PASS' : 'FAIL', 
                `- ${state.errors.length} errors, ${state.warnings.length} warnings`);
  }, []);

  // Phase 4: Real-time workflow validation
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isValid: isWorkflowValid,
    errors: validationErrors,
    warnings: validationWarnings,
    validate: validateWorkflow,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getStepErrors,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hasStepErrors
  } = useWorkflowValidation({
    debounceMs: 500,
    onValidationComplete
  });
  
  // Conversation state
  const [conversationManager, setConversationManager] = useState<ConversationStateManager | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationContext, setConversationContext] = useState<CreationContext | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [workflowContext, setWorkflowContext] = useState<WorkflowContext | null>(null); // Used for LangChain conversation context
  
  // UI state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Stable references to prevent re-renders
  const workflowIdRef = useRef<string>('');
  const workflowNameRef = useRef<string>('');
  
  // Initialize creation session
  useEffect(() => {
    const currentWorkflowId = workflow.metadata?.id || 'new-workflow';
    const currentWorkflowName = workflow.metadata?.name || 'New Workflow';
    
    // Only reinitialize if the core identifiers have actually changed
    if (workflowIdRef.current === currentWorkflowId && 
        workflowNameRef.current === currentWorkflowName &&
        conversationManager) {
      return;
    }
    
    workflowIdRef.current = currentWorkflowId;
    workflowNameRef.current = currentWorkflowName;
    
    const initializeSession = async () => {
      try {
        console.log('🚀 Initializing workflow creation session');
        
        // Create workflow context for database integration
        const workflowContextForDb: WorkflowContext = {
          account: 'groupize-demos', // TODO: Get from user context
          organization: null, // TODO: Get from user context if needed
          workflowTemplateName: currentWorkflowName || generateUniqueTemplateName()
        };
        setWorkflowContext(workflowContextForDb);
        
        // Fetch available functions from API - cache this to prevent constant calls
        const availableFunctions = await fetchAvailableFunctions();
        
        // Create conversation context
        const context: CreationContext = {
          workflowId: currentWorkflowId,
          workflowName: currentWorkflowName,
          userRole: 'admin',
          userDepartment: 'IT',
          availableFunctions,
          conversationGoal: isNewWorkflow ? 'create' : 'edit',
          currentWorkflowSteps: Array.isArray(workflow.steps) ? workflow.steps.map((s: WorkflowStep) => s.id || s.name) : [],
          mrfData
        };
        
        // Set the context state
        setConversationContext(context);
        
        // TODO: For saved templates (not 'new-workflow'), load conversation from database
        // For now, always create fresh conversation state
        // Database integration will be added in future to persist conversations for saved templates
        
        const conversationState = createEmptyConversationState(currentWorkflowId, context);
        const manager = new ConversationStateManager(conversationState, workflowContextForDb);
        
        // Add welcome message for new conversation
        const welcomeMessage = mrfData 
          ? `Hi! I'm aime, your AI workflow assistant powered by LangChain. I see you want to create a workflow for "${mrfData.title}". Let's build this together step by step! Just describe what you want the workflow to do.`
          : isNewWorkflow
            ? `Hi! I'm aime, your AI workflow assistant powered by LangChain. I'm here to help you create a new workflow from scratch. What would you like to build?\n\nTo get started, you can describe your workflow in natural language. For example: 'When an MRF is submitted, check if it needs approval based on budget or location, then either send for approval or proceed directly.'`
            : `Hi! I'm aime, your AI workflow assistant powered by LangChain. I'm here to help you edit your existing workflow. What would you like to modify?`;          
        manager.addAimeMessage(welcomeMessage, 'text');
        console.log('✅ Created fresh conversation session');
        
        setConversationManager(manager);
        
        // Initialize creation session
        const session = await creationFlow.initiateCreation(
          currentWorkflowId,
          manager.getState().conversationId,
          context,
          mrfData
        );
        
        setCurrentSession(session);
        
        // Perform LangChain health check
        try {
          const healthResponse = await fetch('/api/langchain/generate-workflow', {
            method: 'GET'
          });
          
          if (healthResponse.ok) {
            console.log('✅ LangChain API health check passed');
          } else {
            console.warn('⚠️ LangChain API health check failed, falling back to direct API');
          }
        } catch (healthError) {
          console.warn('⚠️ LangChain API not available, will use fallback:', healthError);
        }
        
        console.log('✅ Creation session initialized successfully');
        
      } catch (error) {
        console.error('❌ Error initializing creation session:', error);
      }
    };
    
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewWorkflow, mrfData]); // Only depend on props that should trigger reinitialization
  
  // Update conversation manager with current workflow for validation
  useEffect(() => {
    if (conversationManager) {
      // Pass workflow steps in nested array format
      conversationManager.setCurrentWorkflow({ steps: workflow.steps });
    }
  }, [conversationManager, workflow]);
  
  // Phase 4: Validate workflow steps when they change
  useEffect(() => {
    // Only validate if we have a valid array of steps
    if (workflow.steps && Array.isArray(workflow.steps) && workflow.steps.length > 0) {
      console.log('🔍 Validating workflow with', workflow.steps.length, 'steps');
      // Type assertion safe here because we check Array.isArray above
      validateWorkflow(workflow.steps as WorkflowStep[]);
    }
    // Note: If steps is empty/undefined/not-an-array, validation hook will keep previous state
    // The hook's internal logic handles empty arrays gracefully
  }, [workflow.steps, validateWorkflow]);
  
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
      const hasExistingSteps = Array.isArray(workflow.steps) && workflow.steps.length > 0;
      const processingMessage = hasExistingSteps
        ? 'I see you want to modify the existing workflow. Let me understand the current structure and update it based on your request...'
        : 'Working on your request... I\'m analyzing your requirements and creating the workflow.';
      addMessage(processingMessage, 'aime');
      
      // Call backend API for workflow generation with enhanced LangChain context
      if (!conversationContext) {
        console.error('Conversation context not available');
        setIsCreating(false);
        return;
      }
      
      const baseContext = conversationContext;
      const conversationHistory = getConversationHistory();
      
      // Get rich function definitions from workflow-conversation-autocomplete
      const llmFunctionContext = getLLMContext();
      
      const enhancedContext = {
        ...baseContext,
        // Enhanced conversation features from original system
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        user: {
          id: 'user-1', // TODO: Get from user context
          name: baseContext.userRole || 'User',
          email: 'user@company.com', // TODO: Get from user context
          role: baseContext.userRole || 'admin',
          department: baseContext.userDepartment || 'IT',
          manager: 'manager@company.com' // TODO: Get from user context
        },
        mrf: {
          id: baseContext.mrfData?.id || 'new-mrf',
          title: baseContext.mrfData?.title || 'New Event',
          purpose: baseContext.mrfData?.description || 'general',
          maxAttendees: baseContext.mrfData?.attendees || 50,
          startDate: baseContext.mrfData?.requestedDate?.toISOString() || new Date().toISOString(),
          endDate: baseContext.mrfData?.requestedDate?.toISOString() || new Date().toISOString(),
          location: baseContext.mrfData?.location || 'TBD',
          budget: baseContext.mrfData?.budget || 0
        },
        currentDate: new Date().toISOString(),
        functionDefinitions: llmFunctionContext // Rich function definitions with parameters and examples
      };
      
      // Use the new LangChain API endpoint with conversation memory
      const response = await fetch('/api/langchain/generate-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: messageText,
          context: enhancedContext,
          config: {
            sessionId: currentSession.sessionId,
            workflowId: conversationManager.getState().conversationId,
            mode: 'conversational', // Enable conversational mode for iterative workflow building
            enableMemory: true, // Enable conversation memory
            enableTools: true, // Enable tool calling
            conversationalMode: true // CRITICAL: Enable conversational mode for parameter collection
          },
          currentWorkflow: workflow, // Include the complete current workflow for context
        }),
      });

      const result = await response.json();
      console.log('🔍 API Response Structure:', JSON.stringify(result, null, 2));
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate workflow');
      }
      
      // Extract the workflow from the LangChain response structure
      console.log('🔍 Checking result.success:', result.success);
      console.log('🔍 Checking result.result:', result.result);
      
      const workflowData = result.success ? result.result?.workflow : result.workflow;
      const conversationalResponse = result.success ? result.result?.conversationalResponse : result.conversationalResponse;
      const followUpQuestions = result.success ? result.result?.followUpQuestions : result.followUpQuestions;
      const parameterCollectionNeeded = result.success ? result.result?.parameterCollectionNeeded : result.parameterCollectionNeeded;
      
      // Update workflow in the right pane
      if (workflowData && onWorkflowChange) {
        const completeWorkflow = createCompleteWorkflow(workflowData);
        if (completeWorkflow) {
          console.log('✅ Updating workflow with:', completeWorkflow);
          onWorkflowChange(completeWorkflow);
        }
      }
      
      // Small delay to make the interaction feel natural
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Handle conversational response and follow-up questions
      if (conversationalResponse) {
        console.log('💬 Conversational response detected:', conversationalResponse);
        
        // Group conversational response with follow-up questions in a single message
        let combinedMessage = conversationalResponse;
        
        // Add follow-up questions if present
        if (followUpQuestions && followUpQuestions.length > 0) {
          console.log('❓ Follow-up questions:', followUpQuestions);
          
          // Add the questions to the same message bubble
          combinedMessage += `\n\nTo complete your workflow, I need some additional information:\n\n${followUpQuestions.map((question: string, index: number) => `${index + 1}. ${question}`).join('\n')}`;
          
          // If parameter collection is needed, add the hint to the same message
          if (parameterCollectionNeeded) {
            console.log('🔧 Parameter collection needed');
            combinedMessage += "\n\nPlease provide the information above so I can complete the workflow configuration with the specific details.";
          }
        }
        
        // Replace the processing message with the actual LLM response
        replaceLastAimeMessage(combinedMessage);
      } else {
        // Replace with standard success message when no conversational response
        const hasStepsForSuccess = Array.isArray(workflow.steps) && workflow.steps.length > 0;
        const successMessage = hasStepsForSuccess
          ? `Perfect! I've modified your existing workflow to incorporate your request. The updated workflow maintains the existing structure while adding the new requirements. Check the visualization on the right to see the changes.`
          : `Excellent! I've created your new workflow based on your request. The workflow includes all the logic you described. You can see the complete workflow structure in the visualization on the right.`;
        replaceLastAimeMessage(successMessage);
      }
      
    } catch (error) {
      console.error('❌ Error in workflow generation:', error);
      
      // Enhanced error handling with LangChain context
      let errorMessage = 'I apologize, but I encountered an issue while processing your request.';
      
      if (error instanceof Error) {
        if (error.message.includes('LangChain')) {
          errorMessage += ' There seems to be an issue with the AI processing engine. Please try again in a moment.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage += ' There seems to be a network issue. Please check your connection and try again.';
        } else {
          errorMessage += ' Could you please try rephrasing your requirement or try again?';
        }
      }
      
      // Replace processing message with error message
      replaceLastAimeMessage(errorMessage);
    } finally {
      setIsStreaming(false);
      setIsCreating(false);
    }
  };
  
  // Create complete workflow from partial data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createCompleteWorkflow = (partialWorkflow: Partial<WorkflowJSON> | any): WorkflowJSON | null => {
    console.log('🔨 Building complete workflow from partial:', partialWorkflow);
    
    // Handle new LLM format: { account, organization, metadata, workflowDefinition: { steps } }
    // vs old format: { schemaVersion, metadata, steps }
    let steps: unknown[] = [];
    
    // Check if it's the new format with workflowDefinition
    if (partialWorkflow.workflowDefinition?.steps) {
      console.log('📦 New format detected: workflowDefinition.steps');
      steps = Array.isArray(partialWorkflow.workflowDefinition.steps) 
        ? partialWorkflow.workflowDefinition.steps 
        : [];
    } 
    // Check if it's the old format with steps at top level
    else if (partialWorkflow.steps) {
      console.log('📦 Old format detected: steps at top level');
      steps = Array.isArray(partialWorkflow.steps) 
        ? partialWorkflow.steps 
        : [];
    }
    // Fallback to current workflow steps
    else if (Array.isArray(workflow.steps)) {
      console.log('📦 Using current workflow steps');
      steps = workflow.steps;
    }
    
    interface StepSummary { id?: string; name?: string; type?: string }
    console.log('📊 Steps extracted:', {
      count: steps.length,
      isArray: Array.isArray(steps),
      firstStep: steps[0] ? { 
        id: (steps[0] as StepSummary).id, 
        name: (steps[0] as StepSummary).name,
        type: (steps[0] as StepSummary).type
      } : null
    });
    
    // Build a complete workflow in the simple internal format
    const completeWorkflow: WorkflowJSON = {
      // Simple internal format: just { steps: [] }
      steps: steps
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
  
  // TODO: Database persistence for saved templates
  // For saved templates (with real IDs), conversations should be persisted to database
  // This will be implemented when database conversation storage is added
  // New/unsaved templates will have ephemeral conversations (session-only)
  

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
      {/* Messages Area - Full height for maximum chat space */}
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
      
      {/* Phase 4: Validation Feedback */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', maxHeight: '300px', overflow: 'auto' }}>
          <WorkflowValidationFeedback
            errors={validationErrors}
            warnings={validationWarnings}
            groupByType={true}
            showWarnings={true}
            showSuccessState={false}
          />
        </Box>
      )}
      
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
            context={conversationContext || undefined}
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