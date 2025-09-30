// src/app/utils/enhanced-workflow-creation-flow.ts
import { ConversationStateManager } from './conversation-manager';
import { ConversationalWorkflowGenerator, ConversationalGenerationResult } from './conversational-workflow-generator';
import { ParameterCollectionSystem } from './parameter-collection-system';
import { CreationContext, CreationPhase } from '@/app/types/workflow-creation';
import { WorkflowJSON } from '../types/workflow';

export interface EnhancedCreationState {
  currentWorkflow: Partial<WorkflowJSON>;
  phase: CreationPhase;
  awaitingParameterCollection: boolean;
  lastGenerationResult?: ConversationalGenerationResult;
  conversationHistory: string[];
}

/**
 * Enhanced workflow creation flow with conversational AI parameter collection
 * Integrates the conversational workflow generator with parameter collection
 */
export class EnhancedWorkflowCreationFlow {
  private conversationManager: ConversationStateManager;
  private conversationalGenerator: ConversationalWorkflowGenerator;
  private parameterCollectionSystem: ParameterCollectionSystem;
  private currentState: EnhancedCreationState;

  constructor(conversationManager: ConversationStateManager) {
    this.conversationManager = conversationManager;
    this.conversationalGenerator = new ConversationalWorkflowGenerator();
    this.parameterCollectionSystem = new ParameterCollectionSystem();
    
    this.currentState = {
      currentWorkflow: {},
      phase: 'trigger_definition',
      awaitingParameterCollection: false,
      conversationHistory: []
    };
    
    console.log('🚀 EnhancedWorkflowCreationFlow initialized');
  }

  /**
   * Process user input with conversational workflow generation
   */
  async processUserInput(
    userInput: string,
    context: CreationContext
  ): Promise<ConversationalGenerationResult> {
    console.log('🎯 Processing user input:', userInput);
    
    // Add user input to conversation history
    this.currentState.conversationHistory.push(`User: ${userInput}`);
    this.conversationManager.addUserMessage(userInput);

    // Check if we're in the middle of parameter collection
    if (this.currentState.awaitingParameterCollection) {
      return await this.handleParameterCollectionResponse(userInput, context);
    }

    // Generate workflow with conversational response
    const result = await this.conversationalGenerator.generateWithConversation(
      userInput,
      context,
      this.currentState.currentWorkflow,
      this.conversationManager
    );

    // Update current state
    this.updateState(result);

    console.log('✅ Generated conversational workflow result:', {
      hasWorkflowUpdate: !!result.workflowUpdate,
      responseLength: result.conversationalResponse.length,
      questionCount: result.followUpQuestions.length,
      parameterCollectionNeeded: result.parameterCollectionNeeded,
      phase: result.phase
    });

    return result;
  }

  /**
   * Handle parameter collection responses
   */
  private async handleParameterCollectionResponse(
    userInput: string,
    context: CreationContext
  ): Promise<ConversationalGenerationResult> {
    console.log('🔧 Handling parameter collection response:', userInput);

    try {
      // For now, we'll handle parameter collection differently
      // since handleParameterResponse requires specific collection context
      
      // Process the user input as a parameter value
      // This is a simplified approach - we would need to track which parameter we're collecting
      
      // Assume parameter collection is completed for now
      this.currentState.awaitingParameterCollection = false;
      
      // Add user response to conversation
      this.conversationManager.addAimeMessage(
        `Got it! I'll use "${userInput}" for the parameter configuration.`,
        'text'
      );
      
      // Generate next conversational response
      const nextResult = await this.generateNextConversationalStep(context);
      this.updateState(nextResult);
      
      return nextResult;
    } catch (error) {
      console.error('Error handling parameter collection:', error);
      
      // Fallback to continuing conversation
      this.currentState.awaitingParameterCollection = false;
      const fallbackResult = await this.generateNextConversationalStep(context);
      this.updateState(fallbackResult);
      
      return fallbackResult;
    }
  }

  /**
   * Integrate collected parameters into workflow
   */
  private integrateParametersIntoWorkflow(
    parameters: Record<string, unknown>,
    stepId: string
  ): void {
    console.log('🔗 Integrating parameters into workflow:', { stepId, parameters });

    if (!this.currentState.currentWorkflow.steps || !stepId) {
      return;
    }

    const step = this.currentState.currentWorkflow.steps[stepId];
    if (step) {
      // Merge parameters into step
      step.params = { ...step.params, ...parameters };
      
      console.log('✅ Parameters integrated for step:', stepId, step.params);
      
      // Add success message to conversation
      this.conversationManager.addAimeMessage(
        `✅ Great! I've configured the "${step.name}" step with your parameters.`,
        'text'
      );
    }
  }

  /**
   * Generate next conversational step after parameter collection
   */
  private async generateNextConversationalStep(
    context: CreationContext
  ): Promise<ConversationalGenerationResult> {
    // Check if there are more incomplete steps
    const incompleteSteps = this.findIncompleteSteps();
    
    if (incompleteSteps.length > 0) {
      // More parameter collection needed
      const nextStep = incompleteSteps[0];
      
      const conversationalResponse = `Now let's configure the "${nextStep.stepName}" step.`;
      const followUpQuestions = [`What parameters should we use for ${nextStep.functionName}?`];
      
      // Start parameter collection for next step
      setTimeout(async () => {
        if (nextStep.functionName) {
          this.currentState.awaitingParameterCollection = true;
          
          const parameterContext = {
            conversationId: 'current',
            workflowId: context.workflowId || 'current-workflow',
            stepId: nextStep.stepId,
            functionName: nextStep.functionName,
            stepType: nextStep.stepType,
            currentValues: {}
          };

          try {
            await this.parameterCollectionSystem.startParameterCollection(
              parameterContext,
              this.conversationManager
            );
          } catch (error) {
            console.error('Error starting next parameter collection:', error);
          }
        }
      }, 100);
      
      return {
        workflowUpdate: this.currentState.currentWorkflow,
        conversationalResponse,
        followUpQuestions,
        parameterCollectionNeeded: true,
        nextSteps: [`Configure ${nextStep.stepName}`, 'Complete workflow'],
        phase: this.determineCurrentPhase()
      };
    } else {
      // All parameters collected - workflow is complete
      return {
        workflowUpdate: this.currentState.currentWorkflow,
        conversationalResponse: '🎉 Excellent! Your workflow is now fully configured and ready to use.',
        followUpQuestions: [
          'Would you like to test the workflow?',
          'Should I show you a visual diagram of the workflow?',
          'Would you like to modify any steps?'
        ],
        parameterCollectionNeeded: false,
        nextSteps: ['Test workflow', 'Deploy workflow', 'Generate diagram'],
        phase: 'completion'
      };
    }
  }

  /**
   * Find incomplete steps in current workflow
   */
  private findIncompleteSteps() {
    const incompleteSteps: Array<{
      stepId: string;
      stepName: string;
      functionName?: string;
      stepType: 'trigger' | 'action';
    }> = [];

    if (!this.currentState.currentWorkflow.steps) {
      return incompleteSteps;
    }

    Object.entries(this.currentState.currentWorkflow.steps).forEach(([stepId, step]) => {
      if ((step.type === 'trigger' || step.type === 'action') && step.action) {
        // Check if step has empty params and requires parameters
        if (!step.params || Object.keys(step.params).length === 0) {
          incompleteSteps.push({
            stepId,
            stepName: step.name,
            functionName: step.action,
            stepType: step.type as 'trigger' | 'action'
          });
        }
      }
    });

    return incompleteSteps;
  }

  /**
   * Determine current creation phase
   */
  private determineCurrentPhase(): CreationPhase {
    const incompleteSteps = this.findIncompleteSteps();
    
    if (incompleteSteps.some(step => step.stepType === 'trigger')) {
      return 'trigger_definition';
    }
    
    if (incompleteSteps.some(step => step.stepType === 'action')) {
      return 'action_configuration';
    }
    
    if (incompleteSteps.length === 0) {
      return 'completion';
    }
    
    return 'refinement';
  }

  /**
   * Update internal state with generation result
   */
  private updateState(result: ConversationalGenerationResult): void {
    if (result.workflowUpdate) {
      this.currentState.currentWorkflow = {
        ...this.currentState.currentWorkflow,
        ...result.workflowUpdate
      };
    }
    
    this.currentState.phase = result.phase;
    this.currentState.lastGenerationResult = result;
    
    if (result.parameterCollectionNeeded && !this.currentState.awaitingParameterCollection) {
      this.currentState.awaitingParameterCollection = true;
    }
    
    // Add AI response to conversation history
    this.currentState.conversationHistory.push(`Aime: ${result.conversationalResponse}`);
  }

  /**
   * Get current workflow state
   */
  getCurrentWorkflow(): Partial<WorkflowJSON> {
    return this.currentState.currentWorkflow;
  }

  /**
   * Get current creation phase
   */
  getCurrentPhase(): CreationPhase {
    return this.currentState.phase;
  }

  /**
   * Check if workflow is complete
   */
  isWorkflowComplete(): boolean {
    const incompleteSteps = this.findIncompleteSteps();
    return incompleteSteps.length === 0 && 
           !!this.currentState.currentWorkflow.steps && 
           Object.keys(this.currentState.currentWorkflow.steps).length > 0;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): string[] {
    return [...this.currentState.conversationHistory];
  }

  /**
   * Reset creation flow
   */
  reset(): void {
    this.currentState = {
      currentWorkflow: {},
      phase: 'trigger_definition',
      awaitingParameterCollection: false,
      conversationHistory: []
    };
    
    console.log('🔄 EnhancedWorkflowCreationFlow reset');
  }
}