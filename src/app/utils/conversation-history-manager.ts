// src/app/utils/conversation-history-manager.ts
import { ConversationMessage } from '@/app/types/conversation';
import { WorkflowJSON } from '@/app/types/workflow';
import { 
  ConversationHistoryResponse, 
  ConversationSearchResult, 
  PaginationOptions,
  VirtualScrollMetadata,
  ConversationSession
} from '@/app/types/workflow-history';

export class ConversationHistoryManager {
  private readonly RETENTION_YEARS = 5;
  private readonly MAX_MESSAGES_PER_LOAD = 50;
  private readonly storageKey = 'groupize_conversation_history';

  /**
   * Load conversation history with pagination and virtual scrolling support
   */
  async loadConversationHistory(
    workflowId: string,
    pagination: PaginationOptions = { page: 1, limit: this.MAX_MESSAGES_PER_LOAD }
  ): Promise<ConversationHistoryResponse> {
    try {
      const sessions = await this.getConversationSessions(workflowId);
      const allMessages = this.flattenSessionMessages(sessions);
      
      // Apply pagination
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedMessages = allMessages.slice(startIndex, endIndex);

      // Generate virtual scroll metadata
      const virtualScrollMetadata = this.generateVirtualScrollMetadata(
        allMessages.length,
        pagination.limit,
        pagination.page
      );

      return {
        messages: paginatedMessages,
        totalCount: allMessages.length,
        hasMore: endIndex < allMessages.length,
        virtualScrollMetadata
      };
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return {
        messages: [],
        totalCount: 0,
        hasMore: false,
        virtualScrollMetadata: this.generateVirtualScrollMetadata(0, pagination.limit, 1)
      };
    }
  }

  /**
   * Save conversation message with workflow context
   */
  async saveConversationMessage(
    workflowId: string,
    message: ConversationMessage,
    workflowContext: WorkflowJSON,
    sessionId?: string
  ): Promise<void> {
    try {
      const enrichedMessage = {
        ...message,
        workflowId,
        timestamp: message.timestamp || new Date(),
        workflowSnapshot: workflowContext,
        retentionDate: this.calculateRetentionDate(),
        searchableContent: await this.generateSearchableContent(message)
      };

      // Get or create session
      const currentSessionId = sessionId || await this.getCurrentSessionId(workflowId);
      const session = await this.getOrCreateSession(workflowId, currentSessionId);
      
      // Add message to session
      session.messages.push(enrichedMessage);
      session.sessionMetadata.aiInteractions++;
      
      if (message.sender === 'user') {
        // Update modification count for user messages that indicate edits
        const isModificationRequest = this.isModificationRequest(message.content);
        if (isModificationRequest) {
          session.sessionMetadata.modificationsCount++;
        }
      }

      // Save session
      await this.saveConversationSession(workflowId, session);

      console.log(`💬 Conversation message saved for workflow ${workflowId}`);
    } catch (error) {
      console.error('Error saving conversation message:', error);
      throw error;
    }
  }

  /**
   * Semantic search using content matching (simplified version)
   */
  async searchConversationHistory(
    workflowId: string,
    query: string
  ): Promise<ConversationSearchResult[]> {
    try {
      const sessions = await this.getConversationSessions(workflowId);
      const allMessages = this.flattenSessionMessages(sessions);
      
      const results: ConversationSearchResult[] = [];
      const queryLower = query.toLowerCase();
      
      for (const message of allMessages) {
        const contentLower = message.content.toLowerCase();
        
        // Simple text matching - in a real implementation, this would use AI embeddings
        if (contentLower.includes(queryLower)) {
          const relevanceScore = this.calculateRelevanceScore(message.content, query);
          
          if (relevanceScore > 0.3) {
            results.push({
              messageId: message.id,
              relevanceScore,
              contextSnippet: this.generateContextSnippet(message.content, query),
              highlightedContent: this.highlightMatches(message.content, query),
              timestamp: message.timestamp,
              workflowVersionId: message.metadata?.workflowStepGenerated
            });
          }
        }
      }

      // Sort by relevance score
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 20);
    } catch (error) {
      console.error('Error searching conversation history:', error);
      return [];
    }
  }

  /**
   * Get conversation statistics for workflow
   */
  async getConversationStats(workflowId: string): Promise<{
    totalMessages: number;
    totalSessions: number;
    averageMessagesPerSession: number;
    lastActivity: Date | null;
    retentionStatus: 'active' | 'approaching_expiry' | 'expired';
  }> {
    try {
      const sessions = await this.getConversationSessions(workflowId);
      const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
      const lastActivity = sessions.length > 0 
        ? new Date(Math.max(...sessions.map(s => s.endTime?.getTime() || s.startTime.getTime())))
        : null;

      // Check retention status
      const retentionStatus = this.checkRetentionStatus(lastActivity);

      return {
        totalMessages,
        totalSessions: sessions.length,
        averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
        lastActivity,
        retentionStatus
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalMessages: 0,
        totalSessions: 0,
        averageMessagesPerSession: 0,
        lastActivity: null,
        retentionStatus: 'active'
      };
    }
  }

  /**
   * Archive old conversations based on retention policy
   */
  async archiveOldConversations(): Promise<{
    archivedSessions: number;
    archivedMessages: number;
  }> {
    try {
      const allWorkflowIds = await this.getAllWorkflowIds();
      let totalArchivedSessions = 0;
      let totalArchivedMessages = 0;

      for (const workflowId of allWorkflowIds) {
        const sessions = await this.getConversationSessions(workflowId);
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - this.RETENTION_YEARS);

        const sessionsToArchive = sessions.filter(session => 
          session.startTime < cutoffDate
        );

        if (sessionsToArchive.length > 0) {
          // Archive sessions (in a real implementation, this would move to archive storage)
          const remainingSessions = sessions.filter(session => 
            session.startTime >= cutoffDate
          );

          await this.saveConversationSessions(workflowId, remainingSessions);

          totalArchivedSessions += sessionsToArchive.length;
          totalArchivedMessages += sessionsToArchive.reduce(
            (sum, session) => sum + session.messages.length, 
            0
          );
        }
      }

      console.log(`📦 Archived ${totalArchivedSessions} sessions with ${totalArchivedMessages} messages`);
      
      return {
        archivedSessions: totalArchivedSessions,
        archivedMessages: totalArchivedMessages
      };
    } catch (error) {
      console.error('Error archiving conversations:', error);
      return { archivedSessions: 0, archivedMessages: 0 };
    }
  }

  // Private helper methods

  private async getConversationSessions(workflowId: string): Promise<ConversationSession[]> {
    try {
      const stored = localStorage.getItem(`${this.storageKey}_${workflowId}`);
      if (!stored) return [];

      const sessions = JSON.parse(stored);
      return this.deserializeDateFields(sessions);
    } catch (error) {
      console.error('Error loading conversation sessions:', error);
      return [];
    }
  }

  private async saveConversationSessions(workflowId: string, sessions: ConversationSession[]): Promise<void> {
    try {
      localStorage.setItem(`${this.storageKey}_${workflowId}`, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving conversation sessions:', error);
      throw error;
    }
  }

  private async saveConversationSession(workflowId: string, session: ConversationSession): Promise<void> {
    const sessions = await this.getConversationSessions(workflowId);
    const existingIndex = sessions.findIndex(s => s.sessionId === session.sessionId);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await this.saveConversationSessions(workflowId, sessions);
  }

  private async getOrCreateSession(workflowId: string, sessionId: string): Promise<ConversationSession> {
    const sessions = await this.getConversationSessions(workflowId);
    const existing = sessions.find(s => s.sessionId === sessionId);
    
    if (existing) {
      return existing;
    }

    // Create new session
    const newSession: ConversationSession = {
      sessionId,
      workflowId,
      startTime: new Date(),
      messages: [],
      workflowVersionsCreated: [],
      userContext: {
        userId: 'current-user', // Would come from auth context
        userRole: 'admin',
        userDepartment: 'IT'
      },
      sessionMetadata: {
        editMode: false, // Will be updated based on messages
        initialIntent: 'create',
        aiInteractions: 0,
        modificationsCount: 0
      }
    };

    return newSession;
  }

  private async getCurrentSessionId(workflowId: string): Promise<string> {
    // Generate session ID based on workflow and current time
    return `session_${workflowId}_${Date.now()}`;
  }

  private flattenSessionMessages(sessions: ConversationSession[]): ConversationMessage[] {
    const allMessages: ConversationMessage[] = [];
    
    for (const session of sessions) {
      allMessages.push(...session.messages);
    }

    // Sort by timestamp (most recent first)
    return allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private generateVirtualScrollMetadata(
    totalCount: number,
    pageSize: number,
    currentPage: number
  ): VirtualScrollMetadata {
    const itemHeight = 120; // Estimated height per message item
    const visibleStart = (currentPage - 1) * pageSize;
    const visibleEnd = Math.min(visibleStart + pageSize, totalCount);

    return {
      totalHeight: totalCount * itemHeight,
      itemHeight,
      visibleRange: { start: visibleStart, end: visibleEnd },
      loadingRange: { start: Math.max(0, visibleStart - pageSize), end: Math.min(totalCount, visibleEnd + pageSize) }
    };
  }

  private calculateRetentionDate(): Date {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + this.RETENTION_YEARS);
    return retentionDate;
  }

  private async generateSearchableContent(message: ConversationMessage): Promise<string> {
    // Extract searchable content from message
    const content = message.content.toLowerCase();
    
    // Add metadata if available
    const metadata = message.metadata;
    if (metadata) {
      const metadataText = [
        ...(metadata.functionsCalled || []),
        ...(metadata.validationErrors || []),
        metadata.workflowStepGenerated
      ].filter(Boolean).join(' ').toLowerCase();
      
      return `${content} ${metadataText}`;
    }

    return content;
  }

  private isModificationRequest(content: string): boolean {
    const modificationKeywords = [
      'modify', 'change', 'update', 'edit', 'adjust', 'fix', 'improve',
      'add', 'remove', 'delete', 'replace', 'alter'
    ];
    
    const contentLower = content.toLowerCase();
    return modificationKeywords.some(keyword => contentLower.includes(keyword));
  }

  private calculateRelevanceScore(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Simple relevance scoring based on word matches
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    let score = 0;
    
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 1 / queryWords.length;
      }
    }

    // Boost score for exact matches
    if (contentLower.includes(queryLower)) {
      score += 0.5;
    }

    return Math.min(1.0, score);
  }

  private generateContextSnippet(content: string, query: string): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const index = contentLower.indexOf(queryLower);
    
    if (index === -1) {
      return content.substring(0, 100) + '...';
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + queryLower.length + 50);
    
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  }

  private highlightMatches(content: string, query: string): string {
    const queryLower = query.toLowerCase();
    const regex = new RegExp(`(${queryLower})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  private checkRetentionStatus(lastActivity: Date | null): 'active' | 'approaching_expiry' | 'expired' {
    if (!lastActivity) return 'active';

    const now = new Date();
    const yearsInactive = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (yearsInactive >= this.RETENTION_YEARS) {
      return 'expired';
    } else if (yearsInactive >= this.RETENTION_YEARS - 0.5) {
      return 'approaching_expiry';
    } else {
      return 'active';
    }
  }

  private async getAllWorkflowIds(): Promise<string[]> {
    // Simple implementation using localStorage keys
    const workflowIds: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storageKey)) {
        const workflowId = key.replace(`${this.storageKey}_`, '');
        workflowIds.push(workflowId);
      }
    }

    return workflowIds;
  }

  private deserializeDateFields(sessions: ConversationSession[]): ConversationSession[] {
    return sessions.map(session => ({
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined,
      messages: session.messages.map(message => ({
        ...message,
        timestamp: new Date(message.timestamp)
      }))
    }));
  }
}