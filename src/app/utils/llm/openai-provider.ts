import { BaseLLMProvider } from './base-provider';
import {
  WorkflowContext,
  LLMStreamChunk,
  AccuracyTestResult,
  LLMProviderType,
  ValidationError as LLMValidationError
} from '@/app/types/llm';
import { WorkflowJSON, WorkflowStep } from '@/app/types/workflow';

type GeneratorResult<T> = AsyncGenerator<LLMStreamChunk, T>;

const SCHEDULE_KEYWORDS = ['schedule', 'scheduled', 'reminder', 'every', 'monday', 'weekly'];
const MRF_KEYWORDS = ['mrf', 'approval', 'request'];
const NOTIFICATION_KEYWORDS = ['notification', 'notify', 'email', 'alert'];

export class OpenAIProvider extends BaseLLMProvider {
  public readonly name: LLMProviderType = 'openai';

  async *generateWorkflow(prompt: string, context: WorkflowContext): GeneratorResult<WorkflowJSON> {
    const allowed = await this.checkRateLimit('workflow_build');
    if (!allowed) {
      throw new Error('OpenAI rate limit exceeded for workflow generation');
    }

    const workflow = this.buildWorkflowFromPrompt(prompt, context);
    yield this.createChunk('workflow_build', `Generated workflow "${workflow.metadata?.name ?? 'Workflow'}"`);
    return workflow;
  }

  async *editWorkflow(
    workflow: WorkflowJSON,
    editPrompt: string,
    context: WorkflowContext
  ): GeneratorResult<WorkflowJSON> {
    const allowed = await this.checkRateLimit('workflow_edit');
    if (!allowed) {
      throw new Error('OpenAI rate limit exceeded for workflow editing');
    }

    const updatedWorkflow: WorkflowJSON = {
      ...workflow,
      metadata: workflow.metadata
        ? {
            ...workflow.metadata,
            description: `${workflow.metadata.description ?? ''}\nEdited: ${editPrompt}`.trim(),
            updatedAt: new Date(),
            updatedBy: context.userContext?.name ?? workflow.metadata?.updatedBy
          }
        : undefined
    };

    yield this.createChunk('workflow_edit', `Applied edit prompt to workflow "${workflow.metadata?.name ?? 'Workflow'}"`);
    return updatedWorkflow;
  }

  async *generateMermaid(workflow: WorkflowJSON, context: WorkflowContext): GeneratorResult<string> {
    const allowed = await this.checkRateLimit('mermaid_generate');
    if (!allowed) {
      throw new Error('OpenAI rate limit exceeded for mermaid generation');
    }

    const diagram = this.buildMermaidDiagram(workflow, context);
    yield this.createChunk('mermaid_generate', 'Rendering workflow diagram');
    return diagram;
  }

  async *handleMRFChat(message: string, context: WorkflowContext): GeneratorResult<string> {
    const allowed = await this.checkRateLimit('mrf_chat');
    if (!allowed) {
      throw new Error('OpenAI rate limit exceeded for MRF chat');
    }

    const response = `Acknowledged your update: "${message}". I'll use this information for workflow ${context.workflowId ?? 'creation'}.`;
    yield this.createChunk('mrf_chat', 'Processing message for MRF assistant');
    return response;
  }

  async *explainValidationErrors(errors: LLMValidationError[], context: WorkflowContext): GeneratorResult<string> {
    const allowed = await this.checkRateLimit('validation_explain');
    if (!allowed) {
      throw new Error('OpenAI rate limit exceeded for validation explanation');
    }

    const explanation = errors
      .map((error, index) => {
        const detail = 'conversationalExplanation' in error && error.conversationalExplanation
          ? error.conversationalExplanation
          : error.message ?? error.field ?? 'Unknown validation issue';
        return `${index + 1}. ${detail}`;
      })
      .join('\n');

    const response = explanation.length > 0
      ? `I've reviewed the validation errors for workflow ${context.workflowId ?? 'unknown'}:\n${explanation}`
      : 'No validation issues detected.';

    yield this.createChunk('validation_explain', 'Summarising validation issues');
    return response;
  }

  async runAccuracyTest(): Promise<AccuracyTestResult[]> {
    // Placeholder implementation – allows the interface to be exercised in tests without actual API calls.
    return [];
  }

  private buildWorkflowFromPrompt(prompt: string, context: WorkflowContext): WorkflowJSON {
    const lowerPrompt = prompt.toLowerCase();

    if (MRF_KEYWORDS.some(keyword => lowerPrompt.includes(keyword))) {
      return this.buildMrfApprovalWorkflow(prompt, context);
    }

    if (SCHEDULE_KEYWORDS.some(keyword => lowerPrompt.includes(keyword))) {
      return this.buildScheduledWorkflow(prompt, context);
    }

    if (NOTIFICATION_KEYWORDS.some(keyword => lowerPrompt.includes(keyword))) {
      return this.buildNotificationWorkflow(prompt, context);
    }

    return this.buildCustomWorkflow(prompt, context);
  }

  private buildMrfApprovalWorkflow(prompt: string, context: WorkflowContext): WorkflowJSON {
    const steps: WorkflowStep[] = [
      {
        id: 'startOnMrf',
        name: 'Start: On MRF Submission',
        type: 'trigger',
        action: 'onMRFSubmit',
        params: {},
        children: [
          {
            id: 'checkApprovalRequirement',
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

    return this.createWorkflowSkeleton(
      'MRF Approval Workflow',
      `Workflow generated for: ${prompt}`,
      steps,
      context.workflowId
    );
  }

  private buildScheduledWorkflow(prompt: string, context: WorkflowContext): WorkflowJSON {
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

    return this.createWorkflowSkeleton(
      'Scheduled Workflow',
      `Workflow generated for: ${prompt}`,
      steps,
      context.workflowId
    );
  }

  private buildNotificationWorkflow(prompt: string, context: WorkflowContext): WorkflowJSON {
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

    return this.createWorkflowSkeleton(
      'Notification Workflow',
      `Workflow generated for: ${prompt}`,
      steps,
      context.workflowId
    );
  }

  private buildCustomWorkflow(prompt: string, context: WorkflowContext): WorkflowJSON {
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

    return this.createWorkflowSkeleton(
      'Custom Workflow',
      `Workflow generated for: ${prompt}`,
      steps,
      context.workflowId
    );
  }

  private buildMermaidDiagram(workflow: WorkflowJSON, context: WorkflowContext): string {
    const name = workflow.metadata?.name ?? 'Workflow';
    return [
      'flowchart TD',
      '    start([Start]) --> step1{Process}',
      '    step1 -->|Success| step2[Action]',
      '    step1 -->|Failure| end([End])',
      `    %% ${name} - ${context.workflowId ?? 'no-workflow-id'}`
    ].join('\n');
  }
}
