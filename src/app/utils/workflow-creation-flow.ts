// src/app/utils/workflow-creation-flow.ts
import { 
  CreationSession, 
  CreationContext, 
  WorkflowUpdate, 
  createEmptyCreationSession,
  CreationPhase,
  StructuredGuidance,
  MRFData,
  WorkflowGenerationChunk,
  UpdateContext
} from '@/app/types/workflow-creation';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import { StructuredCreationGuide } from './structured-creation-guide';
import { StreamingWorkflowGenerator } from './streaming-workflow-generator';
import { AIUpdateAutoSave } from './ai-update-auto-save';
import { PostUpdateValidationSystem } from './post-update-validation';
import { ParameterCollectionSystem } from './parameter-collection-system';
import type { ParameterCollectionContext } from './parameter-collection-system';

export class WorkflowCreationFlow {
  private creationGuide: StructuredCreationGuide;
  private workflowGenerator: StreamingWorkflowGenerator;
  private autoSave: AIUpdateAutoSave;
  private validationSystem: PostUpdateValidationSystem;
  private parameterCollectionSystem: ParameterCollectionSystem;
  private activeSessions: Map<string, CreationSession> = new Map();
  
  constructor() {
    this.creationGuide = new StructuredCreationGuide();
    this.workflowGenerator = new StreamingWorkflowGenerator();
    this.autoSave = new AIUpdateAutoSave();
    this.validationSystem = new PostUpdateValidationSystem();
    this.parameterCollectionSystem = new ParameterCollectionSystem();
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
          
          // NEW: Check for conversational response and parameter collection needs
          if (chunk.conversationalResponse || chunk.parameterCollectionNeeded) {
            console.log('🗣️ Conversational response detected, checking for parameter collection needs');
            await this.handleConversationalResponse(
              sessionId,
              chunk,
              session,
              onWorkflowChange
            );
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
   * Validate workflow after update with enhanced validation system
   */
  async validateAfterUpdate(sessionId: string, workflow: WorkflowJSON): Promise<ValidationResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    console.log('🔍 Enhanced validation for workflow after update for session:', sessionId);
    
    try {
      // Create update context for validation
      const updateContext: UpdateContext = {
        triggerType: 'ai_update',
        phase: session.currentPhase || 'trigger_definition',
        changes: session.draft.changesSinceLastSave,
        conversationId: sessionId, // Use sessionId as conversation ID
        sessionId,
        previousValidationState: session.draft.validationResult
      };

      // Use enhanced validation system
      const postUpdateResult = await this.validationSystem.validateAfterUpdate(workflow, updateContext);
      
      // Update session with validation result
      session.draft.validationResult = postUpdateResult;
      session.lastActivity = new Date();
      
      console.log('✅ Enhanced validation completed', {
        isValid: postUpdateResult.isValid,
        errorCount: postUpdateResult.errors.length,
        warningCount: postUpdateResult.warnings.length,
        hasConversationalRecovery: !!postUpdateResult.conversationalRecovery
      });
      
      return postUpdateResult;
      
    } catch (error) {
      console.error('❌ Error in enhanced validation:', error);
      return {
        isValid: false,
        errors: [{
          id: 'validation_error',
          severity: 'error',
          technicalMessage: `Enhanced validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          conversationalExplanation: 'I encountered an issue while validating your workflow with the new validation system. Please try again.'
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
   * Start parameter collection for a function (trigger or action)
   */
  async startParameterCollection(
    sessionId: string,
    stepId: string,
    functionName: string,
    stepType: 'trigger' | 'action',
    conversationManager: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    console.log('🔧 Starting parameter collection for:', functionName, 'in step:', stepId);
    
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.error('❌ Session not found for parameter collection:', sessionId);
      return null;
    }

    const context = {
      conversationId: sessionId, // Use sessionId as conversationId
      workflowId: session.workflowId,
      stepId,
      functionName,
      stepType,
      currentValues: {}
    };

    try {
      const result = await this.parameterCollectionSystem.startParameterCollection(
        context,
        conversationManager
      );

      // Update session to track parameter collection
      session.lastActivity = new Date();
      
      return result;
    } catch (error) {
      console.error('❌ Error starting parameter collection:', error);
      conversationManager.addAimeMessage(
        'I encountered an issue setting up parameter collection. Let me try a different approach.',
        'error_recovery'
      );
      return null;
    }
  }

  /**
   * Handle user response for parameter collection
   */
  async handleParameterResponse(
    sessionId: string,
    stepId: string,
    parameterName: string,
    value: unknown,
    conversationManager: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    console.log('📝 Handling parameter response:', parameterName, '=', value);
    
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.error('❌ Session not found for parameter response:', sessionId);
      return null;
    }

    const collectionId = `${sessionId}_${stepId}`;

    try {
      const result = await this.parameterCollectionSystem.handleParameterResponse(
        collectionId,
        parameterName,
        value,
        conversationManager
      );

      // If parameter collection is complete, update workflow step
      if (result.success && result.missingParameters.length === 0) {
        await this.updateWorkflowStepWithParameters(
          sessionId,
          stepId,
          result.parameters,
          conversationManager
        );
      }

      session.lastActivity = new Date();
      return result;
    } catch (error) {
      console.error('❌ Error handling parameter response:', error);
      conversationManager.addAimeMessage(
        'I had trouble processing that parameter. Could you try again?',
        'error_recovery'
      );
      return null;
    }
  }

  /**
   * Update workflow step with collected parameters
   */
  private async updateWorkflowStepWithParameters(
    sessionId: string,
    stepId: string,
    parameters: Record<string, unknown>,
    conversationManager: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      // Update the workflow step with parameters
      if (session.draft.workflowData.steps && session.draft.workflowData.steps[stepId]) {
        session.draft.workflowData.steps[stepId] = {
          ...session.draft.workflowData.steps[stepId],
          params: parameters
        };

        conversationManager.addAimeMessage(
          `✅ Great! I've updated the "${session.draft.workflowData.steps[stepId].name}" step with the parameters you provided. The step is now fully configured.`,
          'text'
        );

        // Validate after parameter update (simplified)
        if (this.isCompleteWorkflow(session.draft.workflowData)) {
          const validationResult = await this.validationSystem.validateAfterUpdate(
            session.draft.workflowData,
            {
              triggerType: 'user_input',
              phase: 'trigger_definition',
              changes: [{
                changeId: `param_update_${Date.now()}`,
                type: 'modify',
                path: `steps.${stepId}.params`,
                timestamp: new Date(),
                source: 'user',
                description: `Updated parameters for ${stepId}`
              }],
              conversationId: sessionId,
              sessionId
            }
          );

          session.draft.validationResult = validationResult;
        }

        // Update activity timestamp
        session.lastActivity = new Date();
        
        conversationManager.addAimeMessage(
          'Parameter configuration complete! What would you like to configure next?',
          'text'
        );

      }
    } catch (error) {
      console.error('❌ Error updating workflow step with parameters:', error);
      conversationManager.addAimeMessage(
        'I had trouble updating the workflow step. Let me try to fix this.',
        'error_recovery'
      );
    }
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

  /**
   * Handle conversational response and trigger parameter collection if needed
   */
  private async handleConversationalResponse(
    sessionId: string,
    chunk: WorkflowGenerationChunk,
    session: CreationSession,
    onWorkflowChange?: (workflow: WorkflowJSON) => void
  ): Promise<void> {
    console.log('🎯 Processing conversational response for parameter collection');
    
    try {
      // Add conversational response as a message
      if (chunk.conversationalResponse) {
        console.log('💬 Adding conversational response:', chunk.conversationalResponse);
        // This would typically go to a conversation manager
        // For now, log it - the UI should pick this up from the chunk
      }
      
      // Add follow-up questions as messages
      if (chunk.followUpQuestions && chunk.followUpQuestions.length > 0) {
        console.log('❓ Adding follow-up questions:', chunk.followUpQuestions);
        // This would typically go to a conversation manager
        // For now, log them - the UI should pick this up from the chunk
      }
      
      // If parameter collection is needed, find the first incomplete step and start collection
      if (chunk.parameterCollectionNeeded && chunk.currentWorkflow?.steps) {
        console.log('🔧 Parameter collection needed, analyzing workflow steps...');
        
        const incompleteSteps = this.findIncompleteSteps(chunk.currentWorkflow);
        console.log('📋 Found incomplete steps:', incompleteSteps.map(s => s.stepId));
        
        if (incompleteSteps.length > 0) {
          const firstStep = incompleteSteps[0];
          console.log('🚀 Starting parameter collection for:', firstStep.stepId, firstStep.functionName);
          
          // Start parameter collection for the first incomplete step
          const parameterContext: ParameterCollectionContext = {
            conversationId: session.conversationId,
            workflowId: session.workflowId,
            stepId: firstStep.stepId,
            functionName: firstStep.functionName,
            stepType: firstStep.stepType,
            currentValues: firstStep.currentParams || {}
          };
          
          // This would typically use a conversation manager, but for now we'll log the start
          console.log('🔍 Parameter collection context:', parameterContext);
          
          // The UI should detect this and start the parameter collection flow
          // For now, we'll just update the session to indicate parameter collection is active
          session.context.currentWorkflow = chunk.currentWorkflow;
          session.lastActivity = new Date();
          
          // Call onWorkflowChange if provided and we have a complete workflow
          if (onWorkflowChange && chunk.currentWorkflow?.schemaVersion) {
            onWorkflowChange(chunk.currentWorkflow as WorkflowJSON);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling conversational response:', error);
    }
  }

  /**
   * Find incomplete steps that need parameter collection
   */
  private findIncompleteSteps(workflow: Partial<WorkflowJSON>): Array<{
    stepId: string;
    stepName: string;
    functionName: string;
    stepType: 'trigger' | 'action';
    currentParams?: Record<string, unknown>;
  }> {
    const incompleteSteps: Array<{
      stepId: string;
      stepName: string;
      functionName: string;
      stepType: 'trigger' | 'action';
      currentParams?: Record<string, unknown>;
    }> = [];
    
    if (!workflow.steps) {
      return incompleteSteps;
    }

    Object.entries(workflow.steps).forEach(([stepId, step]) => {
      if ((step.type === 'trigger' || step.type === 'action') && step.action) {
        // Check if step has empty params and requires parameters
        if (!step.params || Object.keys(step.params).length === 0) {
          incompleteSteps.push({
            stepId,
            stepName: step.name,
            functionName: step.action,
            stepType: step.type as 'trigger' | 'action',
            currentParams: step.params || {}
          });
        }
      }
    });

    return incompleteSteps;
  }
}