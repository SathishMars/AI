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
  ImplicitBehaviorMetrics
} from '@/app/types/conversation';

export class ConversationStateManager {
  private state: ConversationState;
  private autosaveEnabled: boolean = true;
  private autosaveDelay: number = 2000; // 2 seconds after last activity
  private autosaveTimeout: NodeJS.Timeout | null = null;
  
  constructor(initialState: ConversationState) {
    this.state = initialState;
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
    this.scheduleAutosave();
    
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
    
    this.state.messages[messageIndex] = {
      ...this.state.messages[messageIndex],
      ...updates,
      timestamp: updates.timestamp || this.state.messages[messageIndex].timestamp
    };
    
    // Update behavior metrics if message was updated
    this.updateBehaviorMetrics(this.state.messages[messageIndex]);
    
    this.scheduleAutosave();
    return true;
  }
  
  deleteMessage(messageId: string): boolean {
    const initialLength = this.state.messages.length;
    this.state.messages = this.state.messages.filter(m => m.id !== messageId);
    
    if (this.state.messages.length !== initialLength) {
      this.scheduleAutosave();
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
    if (!this.autosaveEnabled) return;
    
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
    }
    
    this.autosaveTimeout = setTimeout(() => {
      this.saveConversation();
    }, this.autosaveDelay);
  }
  
  private async saveConversation(): Promise<void> {
    if (this.state.isAutoSaving) return;
    
    this.state.isAutoSaving = true;
    this.state.lastActivity = new Date();
    
    try {
      // In real implementation, save to backend
      const conversationData = this.getState();
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`conversation_${this.state.conversationId}`, JSON.stringify(conversationData));
      }
      console.log('Conversation autosaved:', this.state.conversationId);
    } catch (error) {
      console.error('Failed to autosave conversation:', error);
    } finally {
      this.state.isAutoSaving = false;
    }
  }
  
  async loadConversation(conversationId: string): Promise<boolean> {
    try {
      const savedData = localStorage.getItem(`conversation_${conversationId}`);
      if (!savedData) return false;
      
      const parsedState = JSON.parse(savedData) as ConversationState;
      
      // Validate and restore state
      this.state = {
        ...parsedState,
        // Restore Date objects
        messages: parsedState.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        lastActivity: new Date(parsedState.lastActivity)
      };
      
      return true;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return false;
    }
  }
  
  // State access
  getState(): ConversationState {
    return { ...this.state };
  }
  
  setState(newState: ConversationState): void {
    this.state = newState;
    this.scheduleAutosave();
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
    this.autosaveDelay = Math.max(500, delay); // Minimum 500ms
  }
  
  // Cleanup
  destroy(): void {
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
      this.autosaveTimeout = null;
    }
  }
}

export class MultiConversationStateManager implements MultiConversationManager {
  public activeConversations: Record<string, ConversationState> = {};
  public currentConversationId: string = '';
  public conversationHistory: string[] = [];
  public maxActiveConversations: number = 5;
  
  private conversationManagers: Record<string, ConversationStateManager> = {};
  
  // Conversation lifecycle
  createConversation(workflowId: string, context: ConversationContext): ConversationState {
    const conversationState = createEmptyConversationState(workflowId, context);
    
    this.activeConversations[conversationState.conversationId] = conversationState;
    this.conversationManagers[conversationState.conversationId] = new ConversationStateManager(conversationState);
    this.conversationHistory.unshift(conversationState.conversationId);
    
    // Set as current conversation
    this.currentConversationId = conversationState.conversationId;
    
    // Limit active conversations
    this.enforceMaxConversations();
    
    return conversationState;
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