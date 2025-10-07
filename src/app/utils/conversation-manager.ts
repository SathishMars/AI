// src/app/utils/conversation-manager.ts
import { 
  ConversationState, 
  ConversationMessage, 
  ConversationContext, 
  MultiConversationManager,
  createEmptyConversationState,
  generateMessageId,
  createUserMessage,
  createAimeMessage,
  ProactiveSuggestion,
  ImplicitBehaviorMetrics,
  MessageMetadata,
  MessageType
} from '@/app/types/conversation';
import { 
  ConfiguratorMessage,
  ConfiguratorMessageMetadata,
  ConfiguratorMessageRole
} from '@/app/types/workflow-template';
import { 
  createConversationApiData, 
  WorkflowContext,
  shouldUseDatabaseConversations 
} from './frontend-conversation-helpers';

export { createEmptyConversationState } from '@/app/types/conversation';

type ConversationManagerOptions = {
  autosaveDelay?: number;
  autosaveRetryCooldown?: number;
  maxAutosaveRetries?: number;
};

class ConversationSaveError extends Error {
  constructor(message: string, public info?: { status: number; body?: unknown }) {
    super(message);
    this.name = 'ConversationSaveError';
  }
}

export class ConversationStateManager {
  private state: ConversationState;
  private autosaveEnabled: boolean = true;
  private autosaveDelay: number;
  private autosaveRetryCooldown: number;
  private maxAutosaveRetries: number;
  private autosaveTimeout: NodeJS.Timeout | null = null;
  private workflowContext: WorkflowContext | null = null;
  private currentWorkflow: { steps?: unknown[] } | null = null;
  private pendingMessageIds: Set<string> = new Set();
  private lastAutosaveError: { signature: string; attempt: number; timestamp: number; error?: unknown } | null = null;
  
  constructor(
    initialState: ConversationState,
    workflowContext?: WorkflowContext | null,
    options: ConversationManagerOptions = {}
  ) {
    this.state = initialState;
    this.workflowContext = workflowContext ?? null;
    this.autosaveDelay = Math.max(100, options.autosaveDelay ?? 100);
    this.autosaveRetryCooldown = Math.max(250, options.autosaveRetryCooldown ?? 5000);
    this.maxAutosaveRetries = Math.max(1, options.maxAutosaveRetries ?? 3);
  }
  
  private getPendingMessages(): ConversationMessage[] {
    if (this.pendingMessageIds.size === 0) {
      return [];
    }

    const pending = this.state.messages.filter(message =>
      this.pendingMessageIds.has(message.id) && this.shouldQueueMessageForAutosave(message)
    );

    if (pending.length !== this.pendingMessageIds.size) {
      const validIds = new Set(pending.map(message => message.id));
      this.pendingMessageIds.forEach(id => {
        if (!validIds.has(id)) {
          this.pendingMessageIds.delete(id);
        }
      });
    }

    return pending.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private shouldQueueMessageForAutosave(message: ConversationMessage): boolean {
    if (message.status !== 'complete') return false;
    return message.sender === 'user' || message.sender === 'aime';
  }

  private getBatchSignature(messages: ConversationMessage[]): string {
    return messages
      .map(message => message.id)
      .sort()
      .join('|');
  }

  private clearAutosaveFailureState(): void {
    this.lastAutosaveError = null;
  }

  private scheduleAutosaveRetry(delay?: number): void {
    if (!this.autosaveEnabled) return;
    if (this.pendingMessageIds.size === 0) return;

    const timeoutDelay = Math.max(this.autosaveDelay, delay ?? this.autosaveDelay);

    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
    }

    this.autosaveTimeout = setTimeout(() => {
      void this.saveConversation();
    }, timeoutDelay);
  }

  private buildConfiguratorMetadata(message: ConversationMessage): ConfiguratorMessageMetadata | undefined {
    const metadata: ConfiguratorMessageMetadata = {};
    let hasMetadata = false;

    const messageMetadata: MessageMetadata | undefined = message.metadata;

    if (messageMetadata?.workflowStepGenerated) {
      metadata.workflowStepGenerated = messageMetadata.workflowStepGenerated;
      hasMetadata = true;
    }

    if (messageMetadata?.functionsCalled && messageMetadata.functionsCalled.length > 0) {
      metadata.functionsCalled = [...messageMetadata.functionsCalled];
      hasMetadata = true;
    }

    if (messageMetadata?.validationErrors && messageMetadata.validationErrors.length > 0) {
      metadata.validationErrors = [...messageMetadata.validationErrors];
      hasMetadata = true;
    }

    if (messageMetadata?.editedWorkflowJSON) {
      metadata.editIntent = true;
      hasMetadata = true;
    }

    const suggestedActions = new Set<string>();

    if (messageMetadata?.suggestions) {
      messageMetadata.suggestions.forEach(suggestion => {
        const label = suggestion.actionText || suggestion.title;
        if (label) {
          suggestedActions.add(label);
        }
      });
    }

    if (message.suggestions) {
      message.suggestions.forEach(suggestion => {
        const label = suggestion.actionText || suggestion.title;
        if (label) {
          suggestedActions.add(label);
        }
      });
    }

    if (suggestedActions.size > 0) {
      metadata.suggestedActions = Array.from(suggestedActions);
      hasMetadata = true;
    }

    if (message.type === 'workflow_generated') {
      metadata.workflowGenerated = true;
      metadata.mermaidDiagram = true;
      hasMetadata = true;
    }

    return hasMetadata ? metadata : undefined;
  }

  private mapMessageForPersistence(message: ConversationMessage): Omit<ConfiguratorMessage, '_id'> | null {
    if (!this.workflowContext) {
      return null;
    }

    const { account, organization, workflowTemplateId, workflowTemplateName } = this.workflowContext;
    if (!account || !workflowTemplateName) {
      return null;
    }

    const templateIdentifier = workflowTemplateId || workflowTemplateName;
    if (!templateIdentifier) {
      return null;
    }

    const role: ConfiguratorMessageRole = message.sender === 'user' ? 'user' : 'assistant';
    const metadata = this.buildConfiguratorMetadata(message);

    return {
      conversationId: this.state.conversationId,
      account,
      organization: organization ?? null,
      workflowTemplateId: templateIdentifier,
      workflowTemplateName,
      id: message.id,
      role,
      content: message.content,
      timestamp: message.timestamp,
      ...(metadata ? { metadata } : {})
    };
  }

  private async saveMessagesToDatabaseAPI(messages: ConversationMessage[]): Promise<void> {
    if (!this.workflowContext) {
      return;
    }

    const payload = messages
      .map(message => this.mapMessageForPersistence(message))
      .filter((message): message is Omit<ConfiguratorMessage, '_id'> => Boolean(message));

    if (payload.length === 0) {
      return;
    }

    const requestBody = {
      action: 'save_messages',
      ...createConversationApiData(this.workflowContext, {
        messages: payload
      })
    };

    const response = await fetch('/api/workflow-configurator-conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = undefined;
      }

      const bodyError = typeof (errorBody as { error?: string })?.error === 'string'
        ? (errorBody as { error: string }).error
        : undefined;

      const message = bodyError || response.statusText || 'Failed to save messages';

      console.error('Conversation autosave API failed:', {
        status: response.status,
        statusText: response.statusText,
        error: message,
        details: errorBody
      });

      throw new ConversationSaveError(message, {
        status: response.status,
        body: errorBody
      });
    }
  }

  /**
   * Set the workflow context for database operations
   */
  setWorkflowContext(context: WorkflowContext): void {
    this.workflowContext = context;
    this.clearAutosaveFailureState();
  }
  
  /**
   * Set the current workflow for validation before saving
   */
  setCurrentWorkflow(workflow: { steps?: unknown[] } | null): void {
    this.currentWorkflow = workflow;
    this.clearAutosaveFailureState();
  }
  
  // Message management
  addMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage {
    const fullMessage: ConversationMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date()
    };
    
    this.state.messages.push(fullMessage);
    this.updateBehaviorMetrics(fullMessage);
    if (this.shouldQueueMessageForAutosave(fullMessage)) {
      this.pendingMessageIds.add(fullMessage.id);
      this.clearAutosaveFailureState();
      this.scheduleAutosave();
    }
    
    return fullMessage;
  }
  
  addUserMessage(content: string): ConversationMessage {
    return this.addMessage(createUserMessage(content));
  }
  
  addAimeMessage(content: string, type: ConversationMessage['type'] = 'text'): ConversationMessage {
    return this.addMessage(createAimeMessage(content, type));
  }
  
  updateMessage(messageId: string, updates: Partial<ConversationMessage>): boolean {
    const messageIndex = this.state.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return false;
    
    const updatedMessage: ConversationMessage = {
      ...this.state.messages[messageIndex],
      ...updates,
      timestamp: updates.timestamp || this.state.messages[messageIndex].timestamp
    };

    this.state.messages[messageIndex] = updatedMessage;

    // Update behavior metrics if message was updated
    this.updateBehaviorMetrics(updatedMessage);

    if (this.shouldQueueMessageForAutosave(updatedMessage)) {
      this.pendingMessageIds.add(messageId);
      this.clearAutosaveFailureState();
      this.scheduleAutosave();
    } else {
      this.pendingMessageIds.delete(messageId);
    }
    return true;
  }
  
  deleteMessage(messageId: string): boolean {
    const initialLength = this.state.messages.length;
    this.state.messages = this.state.messages.filter(m => m.id !== messageId);
    
    if (this.state.messages.length !== initialLength) {
      this.pendingMessageIds.delete(messageId);
      this.clearAutosaveFailureState();
      if (this.pendingMessageIds.size > 0) {
        this.scheduleAutosave();
      }
      return true;
    }
    return false;
  }
  
  getMessages(): ConversationMessage[] {
    return [...this.state.messages];
  }
  
  getMessageById(messageId: string): ConversationMessage | undefined {
    return this.state.messages.find(m => m.id === messageId);
  }
  
  // Streaming management
  startStreaming(messageId: string): void {
    this.state.isStreaming = true;
    this.state.currentStreamId = messageId;
    this.updateMessage(messageId, { status: 'streaming' });
  }
  
  stopStreaming(messageId?: string): void {
    this.state.isStreaming = false;
    
    if (messageId) {
      this.updateMessage(messageId, { status: 'complete' });
    }
    
    if (this.state.currentStreamId) {
      this.updateMessage(this.state.currentStreamId, { status: 'complete' });
      this.state.currentStreamId = undefined;
    }
  }
  
  isCurrentlyStreaming(): boolean {
    return this.state.isStreaming;
  }
  
  getCurrentStreamId(): string | undefined {
    return this.state.currentStreamId;
  }
  
  // Context management
  updateContext(updates: Partial<ConversationContext>): void {
    this.state.context = { ...this.state.context, ...updates };
    this.clearAutosaveFailureState();
    this.scheduleAutosave();
  }
  
  getContext(): ConversationContext {
    return { ...this.state.context };
  }
  
  // Proactive suggestions
  addSuggestions(messageId: string, suggestions: ProactiveSuggestion[]): boolean {
    return this.updateMessage(messageId, { suggestions });
  }
  
  getSuggestions(messageId: string): ProactiveSuggestion[] {
    const message = this.getMessageById(messageId);
    return message?.suggestions || [];
  }
  
  // Behavior metrics tracking
  private updateBehaviorMetrics(message: ConversationMessage): void {
    const metrics = this.state.behaviorMetrics;
    
    metrics.messageCount++;
    
    if (message.sender === 'aime' && message.status === 'complete') {
      // Track response time (mock calculation)
      const avgTime = metrics.averageResponseTime;
      const newResponseTime = Date.now(); // In real implementation, measure actual response time
      metrics.averageResponseTime = (avgTime + newResponseTime) / metrics.messageCount;
    }
    
    // Track function usage
    if (message.metadata?.functionsCalled) {
      message.metadata.functionsCalled.forEach(funcName => {
        metrics.functionsUsedCount[funcName] = (metrics.functionsUsedCount[funcName] || 0) + 1;
      });
    }
    
    this.state.behaviorMetrics = metrics;
  }
  
  getBehaviorMetrics(): ImplicitBehaviorMetrics {
    return { ...this.state.behaviorMetrics };
  }
  
  // Conversation persistence
  private scheduleAutosave(): void {
    if (this.pendingMessageIds.size === 0) return;
    this.scheduleAutosaveRetry(this.autosaveDelay);
  }
  
  private async saveConversation(): Promise<void> {
    if (this.state.isAutoSaving) return;
    if (this.pendingMessageIds.size === 0) return;
    
    // CRITICAL: Don't save conversation if workflow has no steps yet
    if (!this.workflowContext) {
      console.log('⏭️ Skipping conversation save: no workflow context set');
      return;
    }

    const { account, workflowTemplateId } = this.workflowContext;
    if (!shouldUseDatabaseConversations(account, workflowTemplateId)) {
      // No database context - conversation is ephemeral (not persisted)
      return;
    }

    const pendingMessages = this.getPendingMessages();
    if (pendingMessages.length === 0) {
      return;
    }

    const batchSignature = this.getBatchSignature(pendingMessages);
    const lastFailure = this.lastAutosaveError;

    if (lastFailure && lastFailure.signature === batchSignature) {
      const elapsed = Date.now() - lastFailure.timestamp;

      if (lastFailure.attempt >= this.maxAutosaveRetries) {
        console.warn('Skipping autosave: max retries reached for current message batch', {
          conversationId: this.state.conversationId,
          pendingMessageIds: pendingMessages.map(message => message.id),
          maxRetries: this.maxAutosaveRetries
        });
        return;
      }

      if (elapsed < this.autosaveRetryCooldown) {
        const waitMs = this.autosaveRetryCooldown - elapsed;
        console.log(`Autosave retry cooling down for ${waitMs}ms`);
        this.scheduleAutosaveRetry(waitMs);
        return;
      }
    }
    
    this.state.isAutoSaving = true;
    this.state.lastActivity = new Date();
    
    try {
      await this.saveMessagesToDatabaseAPI(pendingMessages);
      pendingMessages.forEach(message => this.pendingMessageIds.delete(message.id));
      console.log(`Conversation autosaved (${pendingMessages.length} message(s)) for:`, this.state.conversationId);
      this.clearAutosaveFailureState();
    } catch (error) {
      if (error instanceof ConversationSaveError) {
        console.error('Failed to autosave conversation messages:', {
          conversationId: this.state.conversationId,
          error: error.message,
          details: error.info
        });
      } else {
        console.error('Failed to autosave conversation messages:', error);
      }

      const previousFailure = this.lastAutosaveError;
      const attempt = previousFailure && previousFailure.signature === batchSignature
        ? previousFailure.attempt + 1
        : 1;

      this.lastAutosaveError = {
        signature: batchSignature,
        attempt,
        timestamp: Date.now(),
        error
      };

      if (attempt < this.maxAutosaveRetries) {
        this.scheduleAutosaveRetry(this.autosaveRetryCooldown);
      } else {
        console.warn('Autosave retries exhausted; waiting for new messages before retrying', {
          conversationId: this.state.conversationId,
          pendingMessageIds: pendingMessages.map(message => message.id)
        });
      }
    } finally {
      this.state.isAutoSaving = false;
    }
  }
  
  async loadConversation(conversationId: string): Promise<boolean> {
    try {
      if (this.workflowContext && shouldUseDatabaseConversations(
        this.workflowContext.account,
        this.workflowContext.workflowTemplateId
      )) {
        const messages = await this.loadMessagesFromDatabaseAPI();
        if (messages.length > 0) {
          this.restoreConversationMessages(messages);
          console.log('Loaded conversation from database:', conversationId);
          return true;
        }
      }
      
      // No database context or no saved conversation - return false
      // New/unsaved templates will start with fresh conversation
      console.log('No saved conversation found for:', conversationId);
      return false;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return false;
    }
  }
  
  /**
   * Load conversation from database via API
   */
  private async loadMessagesFromDatabaseAPI(): Promise<ConfiguratorMessage[]> {
    if (!this.workflowContext) return [];

    const { account, organization, workflowTemplateId, workflowTemplateName } = this.workflowContext;
    if (!shouldUseDatabaseConversations(account, workflowTemplateId)) {
      return [];
    }

    const params = new URLSearchParams();
    if (workflowTemplateId) {
      params.append('templateId', workflowTemplateId);
    }
    params.append('templateName', workflowTemplateName);
    params.append('limit', '500');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-account': account
    };

    if (organization) {
      headers['x-organization'] = organization;
    }

    const response = await fetch(`/api/workflow-configurator-conversations?${params.toString()}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to load conversation messages: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result?.data?.messages || !Array.isArray(result.data.messages)) {
      return [];
    }

    return (result.data.messages as ConfiguratorMessage[]).map(message => ({
      ...message,
      timestamp: new Date(message.timestamp)
    }));
  }

  private restoreConversationMessages(messages: ConfiguratorMessage[]): void {
    const conversationMessages = messages.map(message => this.convertConfiguratorMessage(message));
    this.state.messages = conversationMessages;

    if (conversationMessages.length > 0) {
      this.state.lastActivity = conversationMessages[conversationMessages.length - 1].timestamp;
    }

    this.state.behaviorMetrics.messageCount = conversationMessages.length;
    this.state.behaviorMetrics.functionsUsedCount = conversationMessages.reduce<Record<string, number>>((acc, message) => {
      if (message.metadata?.functionsCalled) {
        message.metadata.functionsCalled.forEach((fn: string) => {
          acc[fn] = (acc[fn] || 0) + 1;
        });
      }
      return acc;
    }, {});

    this.pendingMessageIds.clear();
  }

  private convertConfiguratorMessage(message: ConfiguratorMessage): ConversationMessage {
    const sender: ConversationMessage['sender'] = message.role === 'user' ? 'user' : 'aime';
    const type = this.resolveMessageTypeFromMetadata(message);

    const conversationMessage: ConversationMessage = {
      id: message.id,
      sender,
      content: message.content,
      timestamp: new Date(message.timestamp),
      status: 'complete',
      type
    };

    const metadata: MessageMetadata = {};

    if (message.metadata?.workflowStepGenerated) {
      metadata.workflowStepGenerated = message.metadata.workflowStepGenerated;
    }

    if (message.metadata?.functionsCalled && message.metadata.functionsCalled.length > 0) {
      metadata.functionsCalled = [...message.metadata.functionsCalled];
    }

    if (message.metadata?.validationErrors && message.metadata.validationErrors.length > 0) {
      metadata.validationErrors = [...message.metadata.validationErrors];
    }

    if (message.metadata?.editIntent) {
      metadata.editedWorkflowJSON = true;
    }

    if (Object.keys(metadata).length > 0) {
      conversationMessage.metadata = metadata;
    }

    return conversationMessage;
  }

  private resolveMessageTypeFromMetadata(message: ConfiguratorMessage): MessageType {
    if (message.metadata?.workflowGenerated) {
      return 'workflow_generated';
    }

    if (message.metadata?.validationErrors && message.metadata.validationErrors.length > 0) {
      return 'validation_result';
    }

    return 'text';
  }
  
  // State access
  getState(): ConversationState {
    return { ...this.state };
  }
  
  setState(newState: ConversationState, options?: { triggerAutosave?: boolean }): void {
    this.state = newState;
    this.pendingMessageIds.clear();
    this.clearAutosaveFailureState();
    if (options?.triggerAutosave) {
      newState.messages.forEach(message => {
        if (this.shouldQueueMessageForAutosave(message)) {
          this.pendingMessageIds.add(message.id);
        }
      });
      if (this.pendingMessageIds.size > 0) {
        this.scheduleAutosave();
      }
    }
  }
  
  // Configuration
  setAutosaveEnabled(enabled: boolean): void {
    this.autosaveEnabled = enabled;
    if (!enabled && this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
      this.autosaveTimeout = null;
    }
  }
  
  setAutosaveDelay(delay: number): void {
    this.autosaveDelay = Math.max(100, delay); // Minimum 100ms
  }
  
  // Cleanup
  destroy(): void {
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
      this.autosaveTimeout = null;
    }
    this.pendingMessageIds.clear();
  }
}

export class MultiConversationStateManager implements MultiConversationManager {
  public activeConversations: Record<string, ConversationState> = {};
  public currentConversationId: string = '';
  public conversationHistory: string[] = [];
  public maxActiveConversations: number = 5;
  
  private conversationManagers: Record<string, ConversationStateManager> = {};
  
  // Conversation lifecycle
  createConversation(
    workflowId: string, 
    context: ConversationContext, 
    workflowContext?: { account: string; organization?: string | null; workflowTemplateName: string }
  ): ConversationState {
    const conversationState = createEmptyConversationState(workflowId, context, workflowContext);
    
    this.activeConversations[conversationState.conversationId] = conversationState;
    this.conversationManagers[conversationState.conversationId] = new ConversationStateManager(conversationState);
    this.conversationHistory.unshift(conversationState.conversationId);
    
    // Set as current conversation
    this.currentConversationId = conversationState.conversationId;
    
    // Limit active conversations
    this.enforceMaxConversations();
    
    return conversationState;
  }
  
  // Create or retrieve conversation with workflow context support
  createOrRetrieveConversation(
    workflowId: string, 
    context: ConversationContext,
    workflowContext?: { account: string; organization?: string | null; workflowTemplateName: string }
  ): ConversationState {
    // Generate consistent ID if we have workflow context
    const targetId = workflowContext 
      ? (workflowContext.organization 
          ? `${workflowContext.account}-${workflowContext.organization}-${workflowContext.workflowTemplateName}`
          : `${workflowContext.account}-${workflowContext.workflowTemplateName}`)
      : null;
    
    // If we have a target ID and conversation exists, return existing
    if (targetId && this.activeConversations[targetId]) {
      this.currentConversationId = targetId;
      return this.activeConversations[targetId];
    }
    
    // Create new conversation
    return this.createConversation(workflowId, context, workflowContext);
  }
  
  switchConversation(conversationId: string): boolean {
    if (!this.activeConversations[conversationId]) {
      return false;
    }
    
    this.currentConversationId = conversationId;
    
    // Move to front of history
    this.conversationHistory = this.conversationHistory.filter(id => id !== conversationId);
    this.conversationHistory.unshift(conversationId);
    
    return true;
  }
  
  closeConversation(conversationId: string): boolean {
    if (!this.activeConversations[conversationId]) {
      return false;
    }
    
    // Save before closing
    const manager = this.conversationManagers[conversationId];
    if (manager) {
      manager.destroy();
      delete this.conversationManagers[conversationId];
    }
    
    delete this.activeConversations[conversationId];
    this.conversationHistory = this.conversationHistory.filter(id => id !== conversationId);
    
    // Switch to another conversation if current was closed
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = this.conversationHistory[0] || '';
    }
    
    return true;
  }
  
  getCurrentConversation(): ConversationState | null {
    return this.activeConversations[this.currentConversationId] || null;
  }
  
  getCurrentManager(): ConversationStateManager | null {
    return this.conversationManagers[this.currentConversationId] || null;
  }
  
  getConversationManager(conversationId: string): ConversationStateManager | null {
    return this.conversationManagers[conversationId] || null;
  }
  
  getAllConversations(): ConversationState[] {
    return Object.values(this.activeConversations);
  }
  
  getConversationCount(): number {
    return Object.keys(this.activeConversations).length;
  }
  
  // Private methods
  private enforceMaxConversations(): void {
    const conversationIds = Object.keys(this.activeConversations);
    
    if (conversationIds.length > this.maxActiveConversations) {
      const oldest = this.conversationHistory.slice(this.maxActiveConversations);
      oldest.forEach(id => this.closeConversation(id));
    }
  }
  
  // Bulk operations
  saveAllConversations(): Promise<void[]> {
    const savePromises = Object.values(this.conversationManagers).map(manager => 
      manager['saveConversation']?.() || Promise.resolve()
    );
    
    return Promise.all(savePromises);
  }
  
  loadConversation(conversationId: string): Promise<boolean> {
    // Create temporary manager to load conversation
    const tempManager = new ConversationStateManager(
      createEmptyConversationState('temp', {} as ConversationContext)
    );
    
    return tempManager.loadConversation(conversationId).then(success => {
      if (success) {
        const state = tempManager.getState();
        this.activeConversations[conversationId] = state;
        this.conversationManagers[conversationId] = tempManager;
        
        if (!this.conversationHistory.includes(conversationId)) {
          this.conversationHistory.unshift(conversationId);
        }
        
        this.enforceMaxConversations();
      }
      
      return success;
    });
  }
  
  // Configuration
  setMaxActiveConversations(max: number): void {
    this.maxActiveConversations = Math.max(1, max);
    this.enforceMaxConversations();
  }
}