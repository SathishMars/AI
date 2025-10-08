// src/app/utils/conversational-workflow-generator.ts
import { 
  CreationContext, 
  CreationPhase
} from '@/app/types/workflow-creation';
import { WorkflowJSON, WorkflowStep } from '../types/workflow';
import { ParameterCollectionSystem } from './parameter-collection-system';
import { ConversationStateManager } from './conversation-manager';

export interface ConversationalGenerationResult {
  workflowUpdate?: Partial<WorkflowJSON>;
  conversationalResponse: string;
  followUpQuestions: string[];
  parameterCollectionNeeded: boolean;
  nextSteps: string[];
  phase: CreationPhase;
}

export interface IncompleteStep {
  stepId: string;
  stepName: string;
  functionName?: string;
  missingParameters: string[];
  stepType: 'trigger' | 'action';
}

/**
 * Enhanced workflow generator that combines LLM workflow generation 
 * with conversational parameter collection and follow-up questions
 */
export class ConversationalWorkflowGenerator {
  private parameterCollectionSystem: ParameterCollectionSystem;

  constructor() {
    this.parameterCollectionSystem = new ParameterCollectionSystem();
    console.log('🗣️ ConversationalWorkflowGenerator initialized');
  }

  /**
   * Generate workflow with conversational follow-up
   */
  async generateWithConversation(
    userInput: string,
    context: CreationContext,
    currentWorkflow?: Partial<WorkflowJSON>,
    conversationManager?: ConversationStateManager
  ): Promise<ConversationalGenerationResult> {
    console.log('🎯 Generating conversational workflow for:', userInput);

    // First, generate the basic workflow structure using existing logic
    const workflowUpdate = await this.generateBasicWorkflow(userInput, context, currentWorkflow);
    
    // Analyze the generated workflow for incomplete steps
    const incompleteSteps = this.analyzeIncompleteSteps(workflowUpdate);
    
    // Generate conversational response and follow-up questions
    const conversationalResponse = this.generateConversationalResponse(
      userInput, 
      workflowUpdate, 
      incompleteSteps
    );
    
    const followUpQuestions = this.generateFollowUpQuestions(
      incompleteSteps,
      workflowUpdate
    );

    // Determine if parameter collection is needed
    const parameterCollectionNeeded = incompleteSteps.length > 0;

    // If we have a conversation manager, add the conversational response
    if (conversationManager) {
      conversationManager.addAimeMessage(conversationalResponse, 'text');
      
      // Add follow-up questions
      followUpQuestions.forEach(question => {
        conversationManager.addAimeMessage(question, 'text');
      });

      // Start parameter collection for the first incomplete step
      if (incompleteSteps.length > 0 && parameterCollectionNeeded) {
        await this.initiateParameterCollection(
          incompleteSteps[0],
          context,
          conversationManager
        );
      }
    }

    return {
      workflowUpdate,
      conversationalResponse,
      followUpQuestions,
      parameterCollectionNeeded,
      nextSteps: this.generateNextSteps(incompleteSteps),
      phase: this.determineCurrentPhase(workflowUpdate, incompleteSteps)
    };
  }

  /**
   * Generate basic workflow structure (uses existing LLM logic)
   * TODO: Template workflows below use legacy object format and need conversion to array format
   * For now, this returns a minimal structure - real workflows should come from LLM generation
   */
  private async generateBasicWorkflow(
    userInput: string,
    context: CreationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Promise<Partial<WorkflowJSON>> {
    const workflowId = currentWorkflow?.metadata?.id || `workflow-${Date.now()}`;
    const template = this.selectTemplateForInput(userInput, context, workflowId);

    return template;
  }

  /**
   * Analyze workflow for incomplete steps
   */
  private analyzeIncompleteSteps(workflow: Partial<WorkflowJSON>): IncompleteStep[] {
    const incompleteSteps: IncompleteStep[] = [];
    
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      return incompleteSteps;
    }

    // Recursively check steps in nested array structure
    const checkStep = (step: unknown, parentPath: string = '') => {
      const s = step as Record<string, unknown>;
      if (s.type === 'trigger' || s.type === 'action') {
        // Check if step has empty params and requires parameters
        if (s.action && (!s.params || Object.keys(s.params as Record<string, unknown>).length === 0)) {
          incompleteSteps.push({
            stepId: (s.id || s.name) as string,
            stepName: s.name as string,
            functionName: s.action as string,
            missingParameters: this.getRequiredParameters(s.action as string),
            stepType: s.type as 'trigger' | 'action'
          });
        }
      }
      
      // Check children
      if (s.children && Array.isArray(s.children)) {
        s.children.forEach((child: unknown) => checkStep(child, `${parentPath}.children`));
      }
      
      // Check onSuccess/onFailure branches
      if (s.onSuccess) {
        checkStep(s.onSuccess, `${parentPath}.onSuccess`);
      }
      if (s.onFailure) {
        checkStep(s.onFailure, `${parentPath}.onFailure`);
      }
    };

    workflow.steps.forEach((step: unknown) => checkStep(step));

    return incompleteSteps;
  }

  /**
   * Get required parameters for a function
   */
  private getRequiredParameters(functionName: string): string[] {
    // This would typically lookup the function definition
    // For now, return common parameters based on function name
    const functionParameterMap: Record<string, string[]> = {
      'onMRFSubmit': ['mrfID'],
      'onScheduledEvent': ['schedule'],
      'requestApproval': ['to'],
      'createEvent': ['mrfID'],
      'sendNotification': ['to', 'subject'],
      'proceedDirectly': [],
      'notifyRejection': ['to']
    };

    const cleanName = functionName.replace(/^functions\./, '');
    return functionParameterMap[cleanName] || [];
  }

  /**
   * Generate conversational response
   */
  private generateConversationalResponse(
    userInput: string,
    workflow: Partial<WorkflowJSON>,
    incompleteSteps: IncompleteStep[]
  ): string {
    const workflowName = workflow.metadata?.name || 'workflow';
    const stepCount = Array.isArray(workflow.steps) ? workflow.steps.length : 0;
    
    let response = `Great! I've created a ${workflowName.toLowerCase()} with ${stepCount} steps based on your request: "${userInput}".`;
    
    if (incompleteSteps.length > 0) {
      response += `\n\nTo complete the setup, I need some additional details for ${incompleteSteps.length} step${incompleteSteps.length > 1 ? 's' : ''}:`;
      
      incompleteSteps.slice(0, 3).forEach((step, index) => {
        response += `\n${index + 1}. **${step.stepName}**: Configuration needed for ${step.functionName}`;
      });
      
      if (incompleteSteps.length > 3) {
        response += `\n... and ${incompleteSteps.length - 3} more steps`;
      }
      
      // Make it clear that parameter collection is starting
      const firstStep = incompleteSteps[0];
      if (firstStep.functionName === 'onMRFSubmit') {
        response += `\n\n**Starting with MRF Configuration:** I'll help you select which MRF form should trigger this workflow. You'll see the available options next.`;
      } else {
        response += `\n\nLet me help you configure these step by step, starting with "${firstStep.stepName}".`;
      }
    } else {
      response += '\n\nThe workflow is complete and ready to use!';
    }
    
    return response;
  }

  /**
   * Generate follow-up questions
   */
  private generateFollowUpQuestions(
    incompleteSteps: IncompleteStep[],
    workflow: Partial<WorkflowJSON>
  ): string[] {
    const questions: string[] = [];
    
    // Add immediate next step question first
    if (incompleteSteps.length > 0) {
      const firstStep = incompleteSteps[0];
      switch (firstStep.functionName) {
        case 'onMRFSubmit':
          questions.push(`📋 **Next:** I'll show you the available MRF forms to choose from for the "${firstStep.stepName}" trigger.`);
          break;
        case 'requestApproval':
          questions.push(`👥 **Next:** I'll help you configure who should receive the approval request for "${firstStep.stepName}".`);
          break;
        case 'createEvent':
          questions.push(`📅 **Next:** I'll help you set up the event creation details for "${firstStep.stepName}".`);
          break;
        case 'sendNotification':
          questions.push(`📧 **Next:** I'll help you configure the notification settings for "${firstStep.stepName}".`);
          break;
        case 'onScheduledEvent':
          questions.push(`⏰ **Next:** I'll help you set up the schedule for "${firstStep.stepName}".`);
          break;
        default:
          questions.push(`⚙️ **Next:** I'll help you configure the "${firstStep.stepName}" step parameters.`);
      }
    }
    
    // Add additional contextual questions
  incompleteSteps.slice(0, 3).forEach(step => {
      switch (step.functionName) {
        case 'onMRFSubmit':
          if (!questions.some(q => q.includes('MRF form'))) {
            questions.push(`🔧 Which MRF form should trigger this workflow? I can show you the available forms.`);
          }
          break;
        case 'requestApproval':
          questions.push(`👥 Who should receive the approval request? I can suggest managers, departments, or specific roles.`);
          break;
        case 'createEvent':
          questions.push(`📅 What details should be included when creating the event from the MRF?`);
          break;
        case 'sendNotification':
          questions.push(`📧 Who should receive notifications and what should the message say?`);
          break;
        case 'onScheduledEvent':
          questions.push(`⏰ When should this workflow run? I can help you set up a schedule.`);
          break;
        default:
          questions.push(`⚙️ Let's configure the "${step.stepName}" step. What parameters should it use?`);
      }
    });
    
    // Add workflow-level questions
    if (Array.isArray(workflow.steps) && workflow.steps.length > 2) {
      questions.push(`🔄 Would you like to add any additional steps or modify the workflow flow?`);
    }
    
    return questions;
  }

  /**
   * Generate next steps for the user
   */
  private generateNextSteps(
    incompleteSteps: IncompleteStep[]
  ): string[] {
    const nextSteps: string[] = [];
    
    if (incompleteSteps.length > 0) {
      nextSteps.push(`Configure ${this.formatStepName(incompleteSteps[0].stepName)}`);
      
      if (incompleteSteps.length > 1) {
        nextSteps.push(`Configure remaining ${incompleteSteps.length - 1} steps`);
      }
      
      nextSteps.push('Test workflow');
      nextSteps.push('Deploy workflow');
    } else {
      nextSteps.push('Review workflow');
      nextSteps.push('Test workflow');  
      nextSteps.push('Deploy workflow');
    }
    
    return nextSteps;
  }

  /**
   * Determine current creation phase
   */
  private determineCurrentPhase(
    workflow: Partial<WorkflowJSON>,
    incompleteSteps: IncompleteStep[]
  ): CreationPhase {
    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      return 'trigger_definition';
    }
    
    if (incompleteSteps.some(step => step.stepType === 'trigger')) {
      return 'trigger_definition';
    }
    
    if (incompleteSteps.some(step => step.stepType === 'action')) {
      return 'action_configuration';
    }
    
    return 'completion';
  }

  /**
   * Initiate parameter collection for a step
   */
  private async initiateParameterCollection(
    incompleteStep: IncompleteStep,
    context: CreationContext,
    conversationManager: ConversationStateManager
  ): Promise<void> {
    if (!incompleteStep.functionName) {
      return;
    }

    const parameterContext = {
      conversationId: 'current', // This would come from context
      workflowId: context.workflowId || 'current-workflow',
      stepId: incompleteStep.stepId,
      functionName: incompleteStep.functionName,
      stepType: incompleteStep.stepType,
      currentValues: {}
    };

    try {
      await this.parameterCollectionSystem.startParameterCollection(
        parameterContext,
        conversationManager
      );
    } catch (error) {
      console.error('Error starting parameter collection:', error);
      conversationManager.addAimeMessage(
        `I'll help you configure the "${incompleteStep.stepName}" step. What parameters would you like to set?`,
        'text'
      );
    }
  }

  private selectTemplateForInput(
    userInput: string,
    context: CreationContext,
    workflowId: string
  ): WorkflowJSON {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('mrf') || lowerInput.includes('approval')) {
      return this.buildMrfApprovalTemplate(userInput, context, workflowId);
    }

    if (
      lowerInput.includes('schedule') ||
      lowerInput.includes('scheduled') ||
      lowerInput.includes('reminder')
    ) {
      return this.buildScheduledTemplate(userInput, context, workflowId);
    }

    if (lowerInput.includes('notification') || lowerInput.includes('email')) {
      return this.buildNotificationTemplate(userInput, context, workflowId);
    }

    return this.buildCustomTemplate(userInput, context, workflowId);
  }

  private buildMrfApprovalTemplate(
    userInput: string,
    context: CreationContext,
    workflowId: string
  ): WorkflowJSON {
    const steps: WorkflowStep[] = [
      {
        id: 'startOnMrf',
        name: 'Start: On MRF Submission',
        type: 'trigger',
        action: 'onMRFSubmit',
        params: {},
        children: [
          {
            id: 'checkRequiresApproval',
            name: 'Check: Requires Approval',
            type: 'condition',
            condition: {
              any: [
                { fact: 'form.totalCost', operator: 'greaterThan', value: 10000 },
                { fact: 'form.attendees', operator: 'greaterThan', value: 100 }
              ]
            },
            onSuccess: {
              id: 'requestManagerApproval',
              name: 'Action: Request Manager Approval',
              type: 'action',
              action: 'requestApproval',
              params: {}
            },
            onFailure: {
              id: 'createEventAction',
              name: 'Action: Create Event',
              type: 'action',
              action: 'createEvent',
              params: {}
            }
          }
        ]
      },
      {
        id: 'workflowComplete',
        name: 'End: Workflow Complete',
        type: 'end',
        result: 'success'
      }
    ];

    return this.composeWorkflow('MRF Approval Workflow', userInput, workflowId, steps, context);
  }

  private buildScheduledTemplate(
    userInput: string,
    context: CreationContext,
    workflowId: string
  ): WorkflowJSON {
    const steps: WorkflowStep[] = [
      {
        id: 'scheduledTrigger',
        name: 'Start: On Scheduled Event',
        type: 'trigger',
        action: 'onScheduledEvent',
        params: {},
        children: [
          {
            id: 'sendReminderNotification',
            name: 'Action: Send Reminder Notification',
            type: 'action',
            action: 'sendNotification',
            params: {}
          }
        ]
      },
      {
        id: 'scheduleComplete',
        name: 'End: Workflow Complete',
        type: 'end',
        result: 'success'
      }
    ];

    return this.composeWorkflow('Scheduled Workflow', userInput, workflowId, steps, context);
  }

  private buildNotificationTemplate(
    userInput: string,
    context: CreationContext,
    workflowId: string
  ): WorkflowJSON {
    const steps: WorkflowStep[] = [
      {
        id: 'eventCreatedTrigger',
        name: 'Start: On Event Created',
        type: 'trigger',
        action: 'onEventCreated',
        params: {},
        children: [
          {
            id: 'sendNotificationStep',
            name: 'Action: Send Notification Email',
            type: 'action',
            action: 'sendNotification',
            params: {}
          }
        ]
      },
      {
        id: 'notificationComplete',
        name: 'End: Workflow Complete',
        type: 'end',
        result: 'success'
      }
    ];

    return this.composeWorkflow('Notification Workflow', userInput, workflowId, steps, context);
  }

  private buildCustomTemplate(
    userInput: string,
    context: CreationContext,
    workflowId: string
  ): WorkflowJSON {
    const steps: WorkflowStep[] = [
      {
        id: 'customTrigger',
        name: 'Start: On Custom Event',
        type: 'trigger',
        action: 'onCustomEvent',
        params: {},
        children: [
          {
            id: 'customAction',
            name: 'Action: Custom Function',
            type: 'action',
            action: 'customFunction',
            params: {}
          }
        ]
      },
      {
        id: 'customComplete',
        name: 'End: Workflow Complete',
        type: 'end',
        result: 'success'
      }
    ];

    return this.composeWorkflow('Custom Workflow', userInput, workflowId, steps, context);
  }

  private composeWorkflow(
    name: string,
    userInput: string,
    workflowId: string,
    steps: WorkflowStep[],
    context: CreationContext
  ): WorkflowJSON {
    return {
      schemaVersion: '1.0.0',
      metadata: {
        id: workflowId,
        name,
        description: `Workflow for: ${userInput}`,
        version: '1.0.0',
        status: 'draft',
        createdAt: new Date(),
        tags: ['ai-generated'],
        author: context.userRole
      },
      steps
    };
  }

  private formatStepName(stepName: string): string {
    return stepName.replace(/^(Start|Action|Check|End):\s*/, '').trim();
  }
}