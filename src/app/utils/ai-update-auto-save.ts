// src/app/utils/ai-update-auto-save.ts
import { 
  WorkflowUpdate, 
  WorkflowDraft
} from '@/app/types/workflow-creation';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import { ConversationMessage } from '@/app/types/conversation';

export class AIUpdateAutoSave {
  private autoSaveQueue: Map<string, WorkflowUpdate> = new Map();
  private saveCallbacks: Map<string, (status: 'saving' | 'saved' | 'error') => void> = new Map();
  
  /**
   * Handle AI workflow update with immediate auto-save
   */
  async handleAIWorkflowUpdate(
    sessionId: string,
    workflowUpdate: WorkflowUpdate,
    conversationMessage: ConversationMessage,
    onWorkflowChange?: (workflow: WorkflowJSON) => void,
    onValidationUpdate?: (validation: ValidationResult) => void
  ): Promise<void> {
    try {
      console.log('💾 Processing AI workflow update for session:', sessionId);
      
      // Show saving indicator
      this.showAutoSaveStatus(sessionId, 'saving');
      
      // Immediate auto-save when AI updates workflow
      await this.saveWorkflowUpdate(sessionId, workflowUpdate);
      
      // Update visualization in real-time if callback provided
      if (onWorkflowChange && this.isCompleteWorkflow(workflowUpdate.workflow)) {
        onWorkflowChange(workflowUpdate.workflow as WorkflowJSON);
      }
      
      // Trigger validation after update if callback provided
      if (onValidationUpdate) {
        onValidationUpdate(workflowUpdate.validation);
      }
      
      // Store conversation context with workflow state
      await this.correlateConversationWithWorkflow(sessionId, conversationMessage, workflowUpdate);
      
      // Generate names if missing
      await this.suggestNamesIfMissing(sessionId, workflowUpdate.workflow);
      
      // Show saved indicator
      this.showAutoSaveStatus(sessionId, 'saved');
      
      console.log('✅ AI workflow update processed successfully');
      
    } catch (error) {
      console.error('❌ Error handling AI workflow update:', error);
      this.showAutoSaveStatus(sessionId, 'error');
      throw error;
    }
  }
  
  /**
   * Save workflow update to draft storage
   */
  private async saveWorkflowUpdate(sessionId: string, update: WorkflowUpdate): Promise<void> {
    try {
      // Get or create draft
      const draft = await this.getDraft(sessionId) || this.createNewDraft(sessionId);
      
      // Update draft with new workflow data
      draft.workflowData = this.mergeWorkflowUpdate(draft.workflowData, update.workflow);
      draft.lastModified = new Date();
      draft.version++;
      draft.autoSavedByAI = true;
      draft.validationResult = update.validation;
      
      // Add changes to tracking
      draft.changesSinceLastSave.push(...update.changes);
      
      // Persist draft to storage
      await this.persistDraft(draft);
      
      console.log(`📝 Draft saved: version ${draft.version} for session ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Error saving workflow update:', error);
      throw new Error(`Failed to save workflow update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get existing draft or null
   */
  private async getDraft(sessionId: string): Promise<WorkflowDraft | null> {
    try {
      // In real implementation, this would fetch from database or localStorage
      const draftKey = `workflow_draft_${sessionId}`;
      const storedDraft = localStorage.getItem(draftKey);
      
      if (storedDraft) {
        const draft = JSON.parse(storedDraft);
        // Convert date strings back to Date objects
        draft.lastModified = new Date(draft.lastModified);
        draft.changesSinceLastSave = draft.changesSinceLastSave.map((change: {changeId: string; timestamp: string; type: string; path: string; description: string; source: string}) => ({
          ...change,
          timestamp: new Date(change.timestamp)
        }));
        return draft;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting draft:', error);
      return null;
    }
  }
  
  /**
   * Create new draft for session
   */
  private createNewDraft(sessionId: string): WorkflowDraft {
    return {
      draftId: `draft_${sessionId}`,
      workflowData: {},
      version: 1,
      lastModified: new Date(),
      autoSavedByAI: false,
      changesSinceLastSave: []
    };
  }
  
  /**
   * Persist draft to storage
   */
  private async persistDraft(draft: WorkflowDraft): Promise<void> {
    try {
      // In real implementation, this would save to database
      const draftKey = `workflow_draft_${draft.draftId.replace('draft_', '')}`;
      localStorage.setItem(draftKey, JSON.stringify(draft));
      
      // Also save to queue for potential batch operations
      this.autoSaveQueue.set(draft.draftId, {
        updateId: `auto_save_${Date.now()}`,
        workflow: draft.workflowData,
        changes: draft.changesSinceLastSave,
        validation: draft.validationResult || { isValid: true, errors: [], warnings: [], info: [] },
        suggestions: [],
        autoSaved: true,
        timestamp: draft.lastModified
      });
      
    } catch (error) {
      console.error('❌ Error persisting draft:', error);
      throw error;
    }
  }
  
  /**
   * Merge workflow update with existing workflow data
   */
  private mergeWorkflowUpdate(
    existing: Partial<WorkflowJSON>, 
    update: Partial<WorkflowJSON>
  ): Partial<WorkflowJSON> {
    const merged = { ...existing };
    
    // Merge metadata
    if (update.metadata) {
      merged.metadata = {
        ...merged.metadata,
        ...update.metadata,
        updatedAt: new Date()
      };
    }
    
    // Merge steps
    if (update.steps) {
      merged.steps = {
        ...merged.steps,
        ...update.steps
      };
    }
    
    // Merge other properties
    Object.keys(update).forEach(key => {
      if (key !== 'metadata' && key !== 'steps') {
        (merged as Record<string, unknown>)[key] = (update as Record<string, unknown>)[key];
      }
    });
    
    return merged;
  }
  
  /**
   * Correlate conversation message with workflow state
   */
  private async correlateConversationWithWorkflow(
    sessionId: string,
    conversationMessage: ConversationMessage,
    workflowUpdate: WorkflowUpdate
  ): Promise<void> {
    try {
      // Store correlation data
      const correlationKey = `correlation_${sessionId}_${conversationMessage.id}`;
      const correlationData = {
        sessionId,
        messageId: conversationMessage.id,
        messageContent: conversationMessage.content,
        messageTimestamp: conversationMessage.timestamp,
        workflowUpdateId: workflowUpdate.updateId,
        workflowVersion: await this.getWorkflowVersion(sessionId),
        changes: workflowUpdate.changes,
        timestamp: new Date()
      };
      
      // In real implementation, this would go to a database
      localStorage.setItem(correlationKey, JSON.stringify(correlationData));
      
      console.log('🔗 Conversation-workflow correlation stored');
      
    } catch (error) {
      console.error('❌ Error correlating conversation with workflow:', error);
      // Don't throw - this is supplementary functionality
    }
  }
  
  /**
   * Get current workflow version for session
   */
  private async getWorkflowVersion(sessionId: string): Promise<number> {
    const draft = await this.getDraft(sessionId);
    return draft?.version || 1;
  }
  
  /**
   * Suggest names for missing workflow elements
   */
  private async suggestNamesIfMissing(
    sessionId: string, 
    workflow: Partial<WorkflowJSON>
  ): Promise<void> {
    try {
      const suggestions: { workflowName?: string; stepNames: Record<string, string> } = {
        stepNames: {}
      };
      
      // Suggest workflow name if missing
      if (!workflow.metadata?.name || workflow.metadata.name === 'New Workflow') {
        suggestions.workflowName = await this.generateWorkflowName(workflow);
      }
      
      // Suggest step names if missing
      if (workflow.steps) {
        for (const [stepId, step] of Object.entries(workflow.steps)) {
          if (!step.name || step.name === '') {
            suggestions.stepNames[stepId] = await this.generateStepName(step, workflow);
          }
        }
      }
      
      // Store suggestions for UI to pick up
      if (suggestions.workflowName || Object.keys(suggestions.stepNames).length > 0) {
        const suggestionsKey = `naming_suggestions_${sessionId}`;
        localStorage.setItem(suggestionsKey, JSON.stringify({
          ...suggestions,
          timestamp: new Date(),
          applied: false
        }));
        
        console.log('🏷️ Name suggestions generated:', suggestions);
      }
      
    } catch (error) {
      console.error('❌ Error generating name suggestions:', error);
      // Don't throw - this is supplementary functionality
    }
  }
  
  /**
   * Generate workflow name based on content
   */
  private async generateWorkflowName(workflow: Partial<WorkflowJSON>): Promise<string> {
    // Simple name generation - in real implementation would use AI
    const functions = this.extractFunctionNames(workflow);
    const triggerType = this.extractTriggerType(workflow);
    
    if (functions.length > 0 && triggerType) {
      return `${triggerType} → ${functions[0]} Workflow`;
    } else if (triggerType) {
      return `${triggerType} Workflow`;
    } else if (functions.length > 0) {
      return `${functions[0]} Process`;
    }
    
    return 'AI Generated Workflow';
  }
  
  /**
   * Generate step name based on step content
   */
  private async generateStepName(step: {type: string; action?: string; result?: string}, _workflow: Partial<WorkflowJSON>): Promise<string> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Simple step name generation
    switch (step.type) {
      case 'trigger':
        return step.action ? `Start: ${step.action}` : 'Start Workflow';
      case 'condition':
        return 'Check Conditions';
      case 'action':
        return step.action ? `Execute: ${step.action}` : 'Perform Action';
      case 'end':
        return step.result === 'success' ? 'Complete Successfully' : 'End Workflow';
      default:
        return 'Workflow Step';
    }
  }
  
  /**
   * Extract function names from workflow
   */
  private extractFunctionNames(workflow: Partial<WorkflowJSON>): string[] {
    if (!workflow.steps) return [];
    
    const functions = Object.values(workflow.steps)
      .filter(step => step.action)
      .map(step => step.action!)
      .map(action => action.replace('functions.', ''))
      .filter((value, index, array) => array.indexOf(value) === index); // unique
    
    return functions;
  }
  
  /**
   * Extract trigger type from workflow
   */
  private extractTriggerType(workflow: Partial<WorkflowJSON>): string {
    if (!workflow.steps) return 'Manual';
    
    const triggerStep = Object.values(workflow.steps).find(step => step.type === 'trigger');
    if (triggerStep?.action) {
      return triggerStep.action.replace('on', '').replace('Submit', ' Submission');
    }
    
    return 'Event';
  }
  
  /**
   * Show auto-save status to user
   */
  private showAutoSaveStatus(sessionId: string, status: 'saving' | 'saved' | 'error'): void {
    const callback = this.saveCallbacks.get(sessionId);
    if (callback) {
      callback(status);
    }
    
    // Also dispatch custom event for UI components to listen to
    const event = new CustomEvent('autoSaveStatus', {
      detail: { sessionId, status, timestamp: new Date() }
    });
    window.dispatchEvent(event);
    
    console.log(`💾 Auto-save status for ${sessionId}: ${status}`);
  }
  
  /**
   * Register callback for auto-save status updates
   */
  registerAutoSaveCallback(
    sessionId: string, 
    callback: (status: 'saving' | 'saved' | 'error') => void
  ): void {
    this.saveCallbacks.set(sessionId, callback);
  }
  
  /**
   * Unregister auto-save callback
   */
  unregisterAutoSaveCallback(sessionId: string): void {
    this.saveCallbacks.delete(sessionId);
  }
  
  /**
   * Check if workflow data is complete enough to be a full WorkflowJSON
   */
  private isCompleteWorkflow(workflow: Partial<WorkflowJSON>): boolean {
    return !!(
      workflow.metadata &&
      workflow.steps &&
      Object.keys(workflow.steps).length > 0 &&
      workflow.schemaVersion
    );
  }
  
  /**
   * Recover draft for session
   */
  async recoverDraft(sessionId: string): Promise<WorkflowDraft | null> {
    try {
      const draft = await this.getDraft(sessionId);
      if (draft) {
        console.log(`🔄 Draft recovered for session ${sessionId}: version ${draft.version}`);
        return draft;
      }
      return null;
    } catch (error) {
      console.error('❌ Error recovering draft:', error);
      return null;
    }
  }
  
  /**
   * Clear auto-save queue for session
   */
  clearAutoSaveQueue(sessionId: string): void {
    const draftId = `draft_${sessionId}`;
    this.autoSaveQueue.delete(draftId);
    this.saveCallbacks.delete(sessionId);
  }
  
  /**
   * Get auto-save queue size
   */
  getQueueSize(): number {
    return this.autoSaveQueue.size;
  }
  
  /**
   * Force save all queued updates
   */
  async flushAutoSaveQueue(): Promise<void> {
    console.log(`💾 Flushing auto-save queue: ${this.autoSaveQueue.size} items`);
    
    const promises = Array.from(this.autoSaveQueue.entries()).map(async ([draftId, update]) => {
      try {
        const sessionId = draftId.replace('draft_', '');
        await this.saveWorkflowUpdate(sessionId, update);
      } catch (error) {
        console.error(`❌ Error flushing queue item ${draftId}:`, error);
      }
    });
    
    await Promise.all(promises);
    this.autoSaveQueue.clear();
    
    console.log('✅ Auto-save queue flushed');
  }
}