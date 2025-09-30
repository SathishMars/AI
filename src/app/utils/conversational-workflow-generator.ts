// src/app/utils/conversational-workflow-generator.ts
import { 
  CreationContext, 
  CreationPhase
} from '@/app/types/workflow-creation';
import { WorkflowJSON } from '../types/workflow';
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
   */
  private async generateBasicWorkflow(
    userInput: string,
    context: CreationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Promise<Partial<WorkflowJSON>> {
    // This would call the existing LLM workflow generation
    // For now, let's create a realistic workflow based on common patterns
    
    if (userInput.toLowerCase().includes('approval') || userInput.toLowerCase().includes('mrf')) {
      return this.generateMRFApprovalWorkflow(userInput, context, currentWorkflow);
    }
    
    if (userInput.toLowerCase().includes('schedule') || userInput.toLowerCase().includes('reminder')) {
      return this.generateScheduledWorkflow(userInput, context, currentWorkflow);
    }
    
    if (userInput.toLowerCase().includes('notification') || userInput.toLowerCase().includes('email')) {
      return this.generateNotificationWorkflow(userInput, context, currentWorkflow);
    }
    
    // Default workflow structure
    return this.generateDefaultWorkflow(userInput, context, currentWorkflow);
  }

  /**
   * Generate MRF approval workflow template
   */
  private generateMRFApprovalWorkflow(
    userInput: string,
    context: CreationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Partial<WorkflowJSON> {
    const workflowId = currentWorkflow?.metadata?.id || `workflow-${Date.now()}`;
    
    return {
      schemaVersion: '1.0.0',
      metadata: {
        id: workflowId,
        name: 'MRF Approval Workflow',
        description: `Workflow for: ${userInput}`,
        version: '1.0.0',
        status: 'draft',
        createdAt: new Date(),
        tags: ['mrf', 'approval', 'ai-generated']
      },
      steps: {
        start: {
          name: 'MRF Submitted',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['checkApprovalNeeded']
        },
        checkApprovalNeeded: {
          name: 'Check if Approval Needed',
          type: 'condition',
          condition: {
            any: [
              { fact: 'mrf.maxAttendees', operator: 'greaterThan', value: 100 },
              { fact: 'mrf.purpose', operator: 'equal', value: 'external' }
            ]
          },
          onSuccess: 'requestApproval',
          onFailure: 'proceedDirectly'
        },
        requestApproval: {
          name: 'Request Approval',
          type: 'action',
          action: 'requestApproval',
          params: {}, // Empty - needs parameter collection
          onSuccess: 'createEvent',
          onFailure: 'notifyRejection'
        },
        proceedDirectly: {
          name: 'Proceed Without Approval',
          type: 'action',
          action: 'createEvent',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['end']
        },
        createEvent: {
          name: 'Create Event',
          type: 'action',
          action: 'createEvent',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['end']
        },
        notifyRejection: {
          name: 'Notify Rejection',
          type: 'action',
          action: 'sendNotification',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['end']
        },
        end: {
          name: 'Workflow Complete',
          type: 'end',
          result: 'success'
        }
      }
    };
  }

  /**
   * Generate scheduled workflow template
   */
  private generateScheduledWorkflow(
    userInput: string,
    context: CreationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Partial<WorkflowJSON> {
    const workflowId = currentWorkflow?.metadata?.id || `workflow-${Date.now()}`;
    
    return {
      schemaVersion: '1.0.0',
      metadata: {
        id: workflowId,
        name: 'Scheduled Workflow',
        description: `Scheduled workflow for: ${userInput}`,
        version: '1.0.0',
        status: 'draft',
        createdAt: new Date(),
        tags: ['scheduled', 'reminder', 'ai-generated']
      },
      steps: {
        start: {
          name: 'Scheduled Trigger',
          type: 'trigger',
          action: 'onScheduledEvent',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['sendReminder']
        },
        sendReminder: {
          name: 'Send Reminder',
          type: 'action',
          action: 'sendNotification',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['end']
        },
        end: {
          name: 'Workflow Complete',
          type: 'end',
          result: 'success'
        }
      }
    };
  }

  /**
   * Generate notification workflow template
   */
  private generateNotificationWorkflow(
    userInput: string,
    context: CreationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Partial<WorkflowJSON> {
    const workflowId = currentWorkflow?.metadata?.id || `workflow-${Date.now()}`;
    
    return {
      schemaVersion: '1.0.0',
      metadata: {
        id: workflowId,
        name: 'Notification Workflow',
        description: `Notification workflow for: ${userInput}`,
        version: '1.0.0',
        status: 'draft',
        createdAt: new Date(),
        tags: ['notification', 'email', 'ai-generated']
      },
      steps: {
        start: {
          name: 'Event Trigger',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['sendNotification']
        },
        sendNotification: {
          name: 'Send Notification',
          type: 'action',
          action: 'sendNotification',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['end']
        },
        end: {
          name: 'Workflow Complete',
          type: 'end',
          result: 'success'
        }
      }
    };
  }

  /**
   * Generate default workflow template
   */
  private generateDefaultWorkflow(
    userInput: string,
    context: CreationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Partial<WorkflowJSON> {
    const workflowId = currentWorkflow?.metadata?.id || `workflow-${Date.now()}`;
    
    return {
      schemaVersion: '1.0.0',
      metadata: {
        id: workflowId,
        name: 'Custom Workflow',
        description: `Workflow for: ${userInput}`,
        version: '1.0.0',
        status: 'draft',
        createdAt: new Date(),
        tags: ['custom', 'ai-generated']
      },
      steps: {
        start: {
          name: 'Start',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['processRequest']
        },
        processRequest: {
          name: 'Process Request',
          type: 'action',
          action: 'createEvent',
          params: {}, // Empty - needs parameter collection
          nextSteps: ['end']
        },
        end: {
          name: 'Workflow Complete',
          type: 'end',
          result: 'success'
        }
      }
    };
  }

  /**
   * Analyze workflow for incomplete steps
   */
  private analyzeIncompleteSteps(workflow: Partial<WorkflowJSON>): IncompleteStep[] {
    const incompleteSteps: IncompleteStep[] = [];
    
    if (!workflow.steps) {
      return incompleteSteps;
    }

    Object.entries(workflow.steps).forEach(([stepId, step]) => {
      if (step.type === 'trigger' || step.type === 'action') {
        // Check if step has empty params and requires parameters
        if (step.action && (!step.params || Object.keys(step.params).length === 0)) {
          incompleteSteps.push({
            stepId,
            stepName: step.name,
            functionName: step.action,
            missingParameters: this.getRequiredParameters(step.action),
            stepType: step.type as 'trigger' | 'action'
          });
        }
      }
    });

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
    const stepCount = Object.keys(workflow.steps || {}).length;
    
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
    incompleteSteps.slice(0, 2).forEach(step => {
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
    if (workflow.steps && Object.keys(workflow.steps).length > 2) {
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
      nextSteps.push(`Configure ${incompleteSteps[0].stepName}`);
      
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
    if (!workflow.steps || Object.keys(workflow.steps).length === 0) {
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
}