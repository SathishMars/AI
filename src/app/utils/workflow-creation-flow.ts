// src/app/utils/workflow-creation-flow.ts
import { 
  CreationSession, 
  CreationContext, 
  WorkflowUpdate, 
  createEmptyCreationSession,
  CreationPhase,
  StructuredGuidance,
  MRFData,
  WorkflowGenerationChunk
} from '@/app/types/workflow-creation';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import { StructuredCreationGuide } from './structured-creation-guide';
import { StreamingWorkflowGenerator } from './streaming-workflow-generator';
import { AIUpdateAutoSave } from './ai-update-auto-save';

export class WorkflowCreationFlow {
  private creationGuide: StructuredCreationGuide;
  private workflowGenerator: StreamingWorkflowGenerator;
  private autoSave: AIUpdateAutoSave;
  private activeSessions: Map<string, CreationSession> = new Map();
  
  constructor() {
    this.creationGuide = new StructuredCreationGuide();
    this.workflowGenerator = new StreamingWorkflowGenerator();
    this.autoSave = new AIUpdateAutoSave();
  }
  
  /**
   * Initiate a new workflow creation session
   */
  async initiateCreation(
    workflowId: string,
    conversationId: string,
    context: CreationContext,
    mrfData?: MRFData
  ): Promise<CreationSession> {
    console.log('🚀 Initiating workflow creation session:', workflowId);
    
    try {
      // Create enhanced context with MRF data
      const enhancedContext: CreationContext = {
        ...context,
        mrfData,
        structuredGuidance: this.creationGuide.initiateGuidedCreation(mrfData)
      };
      
      // Create new creation session
      const session = createEmptyCreationSession(workflowId, conversationId, enhancedContext);
      
      // Store active session
      this.activeSessions.set(session.sessionId, session);
      
      // Register auto-save callback for this session
      this.autoSave.registerAutoSaveCallback(session.sessionId, (status) => {
        this.handleAutoSaveStatus(session.sessionId, status);
      });
      
      // Try to recover existing draft
      const existingDraft = await this.autoSave.recoverDraft(session.sessionId);
      if (existingDraft) {
        session.draft = existingDraft;
        console.log('🔄 Recovered existing draft for session');
      }
      
      console.log('✅ Creation session initiated:', session.sessionId);
      return session;
      
    } catch (error) {
      console.error('❌ Error initiating creation session:', error);
      throw new Error(`Failed to initiate creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Handle streaming workflow generation
   */
  async *handleStreamingGeneration(
    sessionId: string,
    userDescription: string,
    onWorkflowChange?: (workflow: WorkflowJSON) => void,
    onValidationUpdate?: (validation: ValidationResult) => void
  ): AsyncGenerator<WorkflowGenerationChunk> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    console.log('🌊 Starting streaming generation for session:', sessionId);
    
    try {
      // Generate workflow through streaming
      const streamGenerator = this.workflowGenerator.generateWorkflow(
        userDescription,
        session.context
      );
      
      for await (const chunk of streamGenerator) {
        // Handle workflow updates
        if (chunk.type === 'workflow_update' && chunk.currentWorkflow) {
          // Update session with new workflow state
          session.draft.workflowData = chunk.currentWorkflow;
          session.lastActivity = new Date();
          
          // Create workflow update for auto-save
          const workflowUpdate: WorkflowUpdate = {
            updateId: `stream_update_${Date.now()}`,
            workflow: chunk.currentWorkflow,
            changes: [], // Streaming changes are incremental
            validation: chunk.validation || { isValid: true, errors: [], warnings: [], info: [] },
            suggestions: chunk.suggestions || [],
            autoSaved: true,
            timestamp: new Date()
          };
          
          // Trigger auto-save
          await this.autoSave.handleAIWorkflowUpdate(
            sessionId,
            workflowUpdate,
            {
              id: `stream_msg_${Date.now()}`,
              sender: 'aime',
              content: chunk.content,
              timestamp: new Date(),
              status: 'complete',
              type: 'workflow_generated'
            },
            onWorkflowChange,
            onValidationUpdate
          );
          
          // Update structured guidance
          if (chunk.guidance) {
            session.structuredGuidance = chunk.guidance;
            session.context.structuredGuidance = chunk.guidance;
          }
        }
        
        // Handle guidance updates
        if (chunk.type === 'guidance' && chunk.guidance) {
          session.structuredGuidance = chunk.guidance;
          session.context.structuredGuidance = chunk.guidance;
          session.lastActivity = new Date();
        }
        
        yield chunk;
      }
      
      console.log('✅ Streaming generation completed for session:', sessionId);
      
    } catch (error) {
      console.error('❌ Error in streaming generation:', error);
      yield {
        type: 'conversation',
        content: `I encountered an error while generating the workflow: ${error instanceof Error ? error.message : 'Unknown error'}. Let me try a different approach.`,
        currentWorkflow: session.draft.workflowData
      };
    }
  }
  
  /**
   * Process user refinement request
   */
  async processUserRefinement(
    sessionId: string,
    request: string,
    onWorkflowChange?: (workflow: WorkflowJSON) => void,
    onValidationUpdate?: (validation: ValidationResult) => void
  ): Promise<WorkflowUpdate> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    console.log('🔧 Processing user refinement for session:', sessionId);
    
    try {
      // Create enhanced context with current workflow for refinement
      const refinementContext = {
        ...session.context,
        currentWorkflow: session.draft.workflowData
      };
      
      // Process refinement through streaming generator with current workflow context
      const streamGenerator = this.workflowGenerator.generateWorkflow(
        request,
        refinementContext
      );
      
      let finalWorkflow = session.draft.workflowData;
      let lastValidation: ValidationResult = { isValid: true, errors: [], warnings: [], info: [] };
      
      // Process streaming updates
      for await (const chunk of streamGenerator) {
        if (chunk.type === 'workflow_update' && chunk.currentWorkflow) {
          // Merge with existing workflow to ensure completeness
          const mergedWorkflow = {
            ...session.draft.workflowData,
            ...chunk.currentWorkflow
          } as WorkflowJSON;
          
          finalWorkflow = mergedWorkflow;
          lastValidation = chunk.validation || lastValidation;
          
          // Update session with latest state
          session.draft.workflowData = mergedWorkflow;
          session.lastActivity = new Date();
          
          // Trigger callbacks for real-time updates - only if workflow is complete
          if (onWorkflowChange && this.isCompleteWorkflow(mergedWorkflow)) {
            onWorkflowChange(mergedWorkflow);
          }
          if (onValidationUpdate && chunk.validation) {
            onValidationUpdate(chunk.validation);
          }
        }
      }
      
      // Create final workflow update object
      const workflowUpdate: WorkflowUpdate = {
        updateId: `refinement_${Date.now()}`,
        workflow: finalWorkflow,
        changes: [], // Could be enhanced to track specific changes
        validation: lastValidation,
        suggestions: [],
        autoSaved: true,
        timestamp: new Date()
      };
      
      // Trigger auto-save
      await this.autoSave.handleAIWorkflowUpdate(
        sessionId,
        workflowUpdate,
        {
          id: `refinement_msg_${Date.now()}`,
          sender: 'user',
          content: request,
          timestamp: new Date(),
          status: 'complete',
          type: 'text'
        },
        onWorkflowChange,
        onValidationUpdate
      );
      
      // Update guidance based on refinement
      const updatedGuidance = this.updateGuidanceAfterRefinement(session, workflowUpdate);
      if (updatedGuidance) {
        session.structuredGuidance = updatedGuidance;
        session.context.structuredGuidance = updatedGuidance;
      }
      
      console.log('✅ User refinement processed successfully');
      return workflowUpdate;
      
    } catch (error) {
      console.error('❌ Error processing user refinement:', error);
      throw new Error(`Failed to process refinement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Validate workflow after update
   */
  async validateAfterUpdate(sessionId: string, _workflow: WorkflowJSON): Promise<ValidationResult> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    console.log('🔍 Validating workflow after update for session:', sessionId);
    
    try {
      // Basic validation (expand with actual validation logic)
      const validation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        info: []
      };
      
      // Update session with validation result
      session.draft.validationResult = validation;
      session.lastActivity = new Date();
      
      return validation;
      
    } catch (error) {
      console.error('❌ Error validating workflow:', error);
      return {
        isValid: false,
        errors: [{
          id: 'validation_error',
          severity: 'error',
          technicalMessage: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          conversationalExplanation: 'There was an issue validating your workflow. Please try again.'
        }],
        warnings: [],
        info: []
      };
    }
  }
  
  /**
   * Guide structured creation through phases
   */
  guideStructuredCreation(sessionId: string, phase?: CreationPhase): StructuredGuidance {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const currentPhase = phase || session.structuredGuidance.currentPhase;
    const guidance = this.creationGuide.progressToNextPhase(currentPhase, session.draft.workflowData);
    
    // Update session guidance
    session.structuredGuidance = guidance;
    session.context.structuredGuidance = guidance;
    session.lastActivity = new Date();
    
    return guidance;
  }
  
  /**
   * Get creation session
   */
  getSession(sessionId: string): CreationSession | undefined {
    return this.activeSessions.get(sessionId);
  }
  
  /**
   * Get all active sessions
   */
  getActiveSessions(): CreationSession[] {
    return Array.from(this.activeSessions.values());
  }
  
  /**
   * Complete creation session
   */
  async completeCreationSession(
    sessionId: string,
    finalWorkflow: WorkflowJSON
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    console.log('🎯 Completing creation session:', sessionId);
    
    try {
      // Final validation
      const validation = await this.validateAfterUpdate(sessionId, finalWorkflow);
      
      if (!validation.isValid) {
        throw new Error('Workflow validation failed during completion');
      }
      
      // Mark session as complete
      session.currentPhase = 'completion';
      session.structuredGuidance = this.creationGuide.progressToNextPhase('completion', finalWorkflow);
      session.lastActivity = new Date();
      
      // Final auto-save
      const finalUpdate: WorkflowUpdate = {
        updateId: `completion_${Date.now()}`,
        workflow: finalWorkflow,
        changes: [],
        validation,
        suggestions: [],
        autoSaved: true,
        timestamp: new Date()
      };
      
      await this.autoSave.handleAIWorkflowUpdate(
        sessionId,
        finalUpdate,
        {
          id: `completion_msg_${Date.now()}`,
          sender: 'aime',
          content: 'Workflow creation completed successfully!',
          timestamp: new Date(),
          status: 'complete',
          type: 'text'
        }
      );
      
      console.log('✅ Creation session completed successfully');
      
    } catch (error) {
      console.error('❌ Error completing creation session:', error);
      throw error;
    }
  }
  
  /**
   * Clean up creation session
   */
  cleanupSession(sessionId: string): void {
    console.log('🧹 Cleaning up creation session:', sessionId);
    
    // Unregister auto-save callback
    this.autoSave.unregisterAutoSaveCallback(sessionId);
    
    // Clear auto-save queue for this session
    this.autoSave.clearAutoSaveQueue(sessionId);
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    
    console.log('✅ Session cleanup completed');
  }
  
  /**
   * Handle auto-save status updates
   */
  private handleAutoSaveStatus(sessionId: string, status: 'saving' | 'saved' | 'error'): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      // Update session activity
      session.lastActivity = new Date();
      
      console.log(`💾 Auto-save status for session ${sessionId}: ${status}`);
    }
  }
  
  /**
   * Update guidance after refinement
   */
  private updateGuidanceAfterRefinement(
    session: CreationSession,
    workflowUpdate: WorkflowUpdate
  ): StructuredGuidance | null {
    try {
      // Check if current phase is now complete
      const isPhaseComplete = this.creationGuide.isPhaseComplete(
        session.structuredGuidance.currentPhase,
        workflowUpdate.workflow
      );
      
      if (isPhaseComplete) {
        // Progress to next phase
        return this.creationGuide.progressToNextPhase(
          session.structuredGuidance.currentPhase,
          workflowUpdate.workflow
        );
      } else {
        // Update progress percentage
        const updatedGuidance = { ...session.structuredGuidance };
        updatedGuidance.progressPercentage = this.creationGuide.calculateCompletionPercentage(
          workflowUpdate.workflow,
          session.structuredGuidance.currentPhase
        );
        return updatedGuidance;
      }
    } catch (error) {
      console.error('❌ Error updating guidance after refinement:', error);
      return null;
    }
  }
  
  /**
   * Check if workflow has all required fields to be considered complete
   */
  private isCompleteWorkflow(workflow: Partial<WorkflowJSON>): workflow is WorkflowJSON {
    return !!(
      workflow.schemaVersion &&
      workflow.metadata?.id &&
      workflow.metadata?.name &&
      workflow.metadata?.version &&
      workflow.metadata?.status &&
      workflow.steps &&
      Object.keys(workflow.steps).length > 0
    );
  }

  /**
   * Get creation analytics for session
   */
  getCreationAnalytics(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    const creationTime = new Date().getTime() - session.createdAt.getTime();
    const stepCount = session.draft.workflowData.steps ? Object.keys(session.draft.workflowData.steps).length : 0;
    
    return {
      sessionId,
      totalCreationTime: creationTime,
      currentPhase: session.structuredGuidance.currentPhase,
      progressPercentage: session.structuredGuidance.progressPercentage,
      stepCount,
      version: session.draft.version,
      autoSaveCount: session.draft.changesSinceLastSave.length,
      isValid: session.draft.validationResult?.isValid || false
    };
  }
}