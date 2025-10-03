// src/app/utils/langchain/memory/mongodb-memory.ts
import { MongoDBChatMessageHistory } from "@langchain/community/stores/message/mongodb";
import { BufferMemory } from "langchain/memory";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { getMongoDatabase } from "@/app/utils/mongodb-connection";

export interface WorkflowMemoryConfig {
  sessionId: string;
  workflowId: string;
  userId?: string;
  organization?: string;
  maxMessages?: number;
  ttlSeconds?: number;
}

export interface ConversationContext {
  workflowId: string;
  workflowName?: string;
  userId?: string;
  organization?: string;
  phase?: string;
  metadata?: Record<string, unknown>;
}

/**
 * MongoDB-backed conversation memory for workflow creation sessions
 */
export class WorkflowMemoryManager {
  private static instance: WorkflowMemoryManager;
  private memories: Map<string, BufferMemory> = new Map();
  private messageHistories: Map<string, MongoDBChatMessageHistory> = new Map();

  private constructor() {
    console.log('🧠 WorkflowMemoryManager initialized');
  }

  public static getInstance(): WorkflowMemoryManager {
    if (!WorkflowMemoryManager.instance) {
      WorkflowMemoryManager.instance = new WorkflowMemoryManager();
    }
    return WorkflowMemoryManager.instance;
  }

  /**
   * Get or create memory for a workflow session
   */
  public async getWorkflowMemory(config: WorkflowMemoryConfig): Promise<BufferMemory> {
    const memoryKey = this.getMemoryKey(config);
    
    // Return existing memory if available
    if (this.memories.has(memoryKey)) {
      return this.memories.get(memoryKey)!;
    }

    // Create new memory with MongoDB backing
    const memory = await this.createWorkflowMemory(config);
    this.memories.set(memoryKey, memory);
    
    console.log(`🧠 Created workflow memory for session: ${config.sessionId}`);
    return memory;
  }

  /**
   * Create a new workflow memory instance
   */
  private async createWorkflowMemory(config: WorkflowMemoryConfig): Promise<BufferMemory> {
    const db = await getMongoDatabase();
    const collection = db.collection('workflow_conversations');
    
    // Create MongoDB message history
    const messageHistory = new MongoDBChatMessageHistory({
      collection,
      sessionId: config.sessionId
    });

    // Store message history reference
    this.messageHistories.set(config.sessionId, messageHistory);

    // Create buffer memory with MongoDB persistence
    const memory = new BufferMemory({
      chatHistory: messageHistory,
      memoryKey: "chat_history",
      returnMessages: true
    });

    return memory;
  }

  /**
   * Add context message to memory
   */
  public async addContextMessage(
    sessionId: string,
    context: ConversationContext,
    message: string,
    isUser: boolean = true
  ): Promise<void> {
    const memory = await this.getMemoryBySessionId(sessionId);
    if (!memory) {
      throw new Error(`Memory not found for session: ${sessionId}`);
    }

    // Create message with context metadata
    const messageWithContext = this.enrichMessageWithContext(message, context);
    
    const chatMessage = isUser 
      ? new HumanMessage(messageWithContext)
      : new AIMessage(messageWithContext);

    // Add to memory
    await memory.chatHistory.addMessage(chatMessage);
    
    console.log(`📝 Added ${isUser ? 'user' : 'AI'} message to session: ${sessionId}`);
  }

  /**
   * Add AI response with workflow update context
   */
  public async addWorkflowUpdateMessage(
    sessionId: string,
    response: string,
    workflowUpdate?: Record<string, unknown>
  ): Promise<void> {
    const memory = await this.getMemoryBySessionId(sessionId);
    if (!memory) {
      throw new Error(`Memory not found for session: ${sessionId}`);
    }

    // Enrich response with workflow context
    let enrichedResponse = response;
    if (workflowUpdate) {
      enrichedResponse += `\n\n[Workflow Update: ${JSON.stringify(workflowUpdate)}]`;
    }

    const aiMessage = new AIMessage(enrichedResponse);
    await memory.chatHistory.addMessage(aiMessage);
    
    console.log(`🤖 Added AI workflow update to session: ${sessionId}`);
  }

  /**
   * Get conversation history for a session
   */
  public async getConversationHistory(sessionId: string): Promise<BaseMessage[]> {
    const memory = await this.getMemoryBySessionId(sessionId);
    if (!memory) {
      return [];
    }

    const messages = await memory.chatHistory.getMessages();
    return messages;
  }

  /**
   * Clear conversation history for a session
   */
  public async clearConversationHistory(sessionId: string): Promise<void> {
    const memory = await this.getMemoryBySessionId(sessionId);
    if (memory) {
      await memory.chatHistory.clear();
      console.log(`🗑️ Cleared conversation history for session: ${sessionId}`);
    }
  }

  /**
   * Get memory variables for LLM context
   */
  public async getMemoryVariables(sessionId: string): Promise<Record<string, unknown>> {
    const memory = await this.getMemoryBySessionId(sessionId);
    if (!memory) {
      return {};
    }

    return await memory.loadMemoryVariables({});
  }

  /**
   * Save conversation turn to memory
   */
  public async saveConversationTurn(
    sessionId: string,
    humanMessage: string,
    aiResponse: string,
    context?: ConversationContext
  ): Promise<void> {
    const memory = await this.getMemoryBySessionId(sessionId);
    if (!memory) {
      throw new Error(`Memory not found for session: ${sessionId}`);
    }

    // Add human message
    const enrichedHumanMessage = context 
      ? this.enrichMessageWithContext(humanMessage, context)
      : humanMessage;
    await memory.chatHistory.addMessage(new HumanMessage(enrichedHumanMessage));

    // Add AI response
    await memory.chatHistory.addMessage(new AIMessage(aiResponse));
    
    console.log(`💬 Saved conversation turn for session: ${sessionId}`);
  }

  /**
   * Get summary of conversation for LLM context
   */
  public async getConversationSummary(sessionId: string, maxTokens: number = 500): Promise<string> {
    const messages = await this.getConversationHistory(sessionId);
    
    if (messages.length === 0) {
      return "No previous conversation.";
    }

    // Create summary of recent messages
    const recentMessages = messages.slice(-10); // Last 10 messages
    let summary = "Recent conversation:\n";
    
    recentMessages.forEach((message) => {
      const role = message.constructor.name === 'HumanMessage' ? 'User' : 'AI';
      const content = typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);
      
      // Truncate long messages to stay within token limit
      const targetLength = Math.floor(maxTokens / recentMessages.length / 4); // Rough token estimation
      const truncatedContent = content.length > targetLength 
        ? content.substring(0, targetLength) + '...'
        : content;
      
      summary += `${role}: ${truncatedContent}\n`;
    });

    return summary;
  }

  /**
   * Search conversation history
   */
  public async searchConversationHistory(
    sessionId: string, 
    query: string
  ): Promise<BaseMessage[]> {
    const messages = await this.getConversationHistory(sessionId);
    const queryLower = query.toLowerCase();
    
    return messages.filter(message => {
      const content = typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);
      return content.toLowerCase().includes(queryLower);
    });
  }

  /**
   * Delete workflow memory session
   */
  public async deleteWorkflowMemory(sessionId: string): Promise<void> {
    // Clear from memory cache
    const memoryKey = Object.keys(this.memories).find(key => key.includes(sessionId));
    if (memoryKey) {
      this.memories.delete(memoryKey);
    }

    // Clear message history
    const messageHistory = this.messageHistories.get(sessionId);
    if (messageHistory) {
      await messageHistory.clear();
      this.messageHistories.delete(sessionId);
    }
    
    console.log(`🗑️ Deleted workflow memory for session: ${sessionId}`);
  }

  /**
   * Get active memory sessions
   */
  public getActiveMemorySessions(): string[] {
    return Array.from(this.messageHistories.keys());
  }

  /**
   * Cleanup expired sessions
   */
  public async cleanupExpiredSessions(): Promise<void> {
    const db = await getMongoDatabase();
    const collection = db.collection('workflow_conversations');
    
    // Remove expired documents (MongoDB TTL will handle this automatically)
    const expiredCount = await collection.countDocuments({
      createdAt: { $lt: new Date(Date.now() - 86400000) } // 24 hours ago
    });

    if (expiredCount > 0) {
      console.log(`🧹 Found ${expiredCount} expired conversation sessions`);
    }
  }

  // Private helper methods

  private getMemoryKey(config: WorkflowMemoryConfig): string {
    return `${config.workflowId}_${config.sessionId}`;
  }

  private async getMemoryBySessionId(sessionId: string): Promise<BufferMemory | undefined> {
    // Find memory by session ID in the key
    for (const [key, memory] of this.memories.entries()) {
      if (key.includes(sessionId)) {
        return memory;
      }
    }
    return undefined;
  }

  private enrichMessageWithContext(
    message: string, 
    context: ConversationContext
  ): string {
    const contextInfo = [
      `[Workflow: ${context.workflowId}]`,
      context.workflowName ? `[Name: ${context.workflowName}]` : '',
      context.phase ? `[Phase: ${context.phase}]` : '',
      context.userId ? `[User: ${context.userId}]` : '',
      context.organization ? `[Org: ${context.organization}]` : ''
    ].filter(Boolean).join(' ');

    return `${contextInfo}\n${message}`;
  }
}

/**
 * Convenience functions for quick access
 */

/**
 * Get the default memory manager instance
 */
export function getWorkflowMemoryManager(): WorkflowMemoryManager {
  return WorkflowMemoryManager.getInstance();
}

/**
 * Create or get workflow memory for a session
 */
export async function createWorkflowMemory(
  sessionId: string,
  workflowId: string,
  options?: Partial<WorkflowMemoryConfig>
): Promise<BufferMemory> {
  const config: WorkflowMemoryConfig = {
    sessionId,
    workflowId,
    ...options
  };
  
  return await getWorkflowMemoryManager().getWorkflowMemory(config);
}

/**
 * Add a conversation turn to workflow memory
 */
export async function addConversationTurn(
  sessionId: string,
  humanMessage: string,
  aiResponse: string,
  context?: ConversationContext
): Promise<void> {
  return await getWorkflowMemoryManager().saveConversationTurn(
    sessionId,
    humanMessage,
    aiResponse,
    context
  );
}

/**
 * Get conversation summary for LLM context
 */
export async function getConversationSummary(
  sessionId: string,
  maxTokens?: number
): Promise<string> {
  return await getWorkflowMemoryManager().getConversationSummary(sessionId, maxTokens);
}