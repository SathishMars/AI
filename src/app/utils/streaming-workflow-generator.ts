// src/app/utils/streaming-workflow-generator.ts
import { 
  WorkflowGenerationChunk, 
  CreationContext, 
  StructuredGuidance,
  CreationPhase
} from '@/app/types/workflow-creation';
import { WorkflowJSON } from '../types/workflow';
import { streamWorkflowGeneration, ClientWorkflowContext } from './client-workflow-service';

/**
 * Streaming Workflow Generator with Server-Side LLM Integration
 * Uses API calls to generate workflows safely on the server
 */
export class StreamingWorkflowGenerator {
  private accumulatedWorkflow: Partial<WorkflowJSON> = {};
  private buffer = '';
  private stepCount = 0;

  constructor() {
    // Client-side constructor - no LLM initialization needed
    console.log('✅ StreamingWorkflowGenerator initialized for client-side use');
  }

  /**
   * Generate workflow through server-side API with real-time updates
   */
  async *generateWorkflow(
    userInput: string,
    context: CreationContext
  ): AsyncGenerator<WorkflowGenerationChunk> {
    console.log('🚀 Starting server-side LLM workflow generation for:', userInput);
    
    // Convert CreationContext to ClientWorkflowContext
    const apiContext = this.convertContext(context);
    
    try {
      // Use server-side API to generate workflow
      const streamGenerator = streamWorkflowGeneration(userInput, apiContext);
      
      for await (const { chunk, workflow, error } of streamGenerator) {
        if (error) {
          console.error('❌ Stream error:', error);
          yield {
            type: 'conversation',
            content: `Error: ${error}`,
            currentWorkflow: this.accumulatedWorkflow
          };
          continue;
        }

        this.buffer += chunk;
        
        // If we got a complete workflow update
        if (workflow) {
          console.log('📝 Received workflow update from API:', workflow);
          this.accumulatedWorkflow = this.mergeWorkflowUpdate(this.accumulatedWorkflow, workflow);
          this.stepCount = Object.keys(this.accumulatedWorkflow.steps || {}).length;
        }
        
        // Yield the streaming chunk
        yield {
          type: 'workflow_update',
          content: chunk,
          workflowDelta: workflow,
          currentWorkflow: this.accumulatedWorkflow
        };
      }
      
      // Final completion chunk
      yield {
        type: 'conversation',
        content: 'Workflow generation complete!',
        currentWorkflow: this.accumulatedWorkflow
      };
      
    } catch (error) {
      console.error('❌ API workflow generation failed:', error);
      
      // Fallback to simulation if API fails
      yield* this.fallbackSimulation(userInput, context);
    }
  }

  /**
   * Convert CreationContext to ClientWorkflowContext for API
   */
  private convertContext(context: CreationContext): ClientWorkflowContext {
    return {
      user: {
        id: 'user123',
        name: 'Demo User',
        email: 'demo@example.com',
        role: context.userRole || 'Event Coordinator',
        department: context.userDepartment || 'Events',
        manager: 'manager@example.com'
      },
      mrf: context.mrfData ? {
        id: context.mrfData.id,
        title: context.mrfData.title,
        purpose: context.mrfData.category || 'internal',
        maxAttendees: context.mrfData.attendees || 50,
        startDate: context.mrfData.requestedDate?.toISOString().split('T')[0] || '2025-10-15',
        endDate: context.mrfData.requestedDate?.toISOString().split('T')[0] || '2025-10-15',
        location: context.mrfData.location || 'TBD',
        budget: context.mrfData.budget || 10000
      } : {
        id: 'mrf456',
        title: 'Demo Event',
        purpose: 'internal',
        maxAttendees: 50,
        startDate: '2025-10-15',
        endDate: '2025-10-15',
        location: 'Conference Room',
        budget: 10000
      },
      currentWorkflow: context.currentWorkflow
    };
  }

  /**
   * Fallback simulation if LLM is not available
   */
  private async *fallbackSimulation(
    _userInput: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _context: CreationContext // eslint-disable-line @typescript-eslint/no-unused-vars
  ): AsyncGenerator<WorkflowGenerationChunk> {
    console.log('🔄 Using fallback simulation for workflow generation');
    
    const simulatedChunks = [
      'I understand you want to create a workflow.',
      'Let me analyze your requirements...',
      'Based on your input, I\'ll create a structured workflow.',
      'Generating the appropriate steps and conditions.',
      'Workflow generation complete!'
    ];
    
    for (let i = 0; i < simulatedChunks.length; i++) {
      const chunk = simulatedChunks[i];
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to generate workflow steps based on keywords
      const workflowUpdate = await this.parseWorkflowChunk(chunk, this.buffer);
      
      if (workflowUpdate) {
        this.accumulatedWorkflow = this.mergeWorkflowUpdate(this.accumulatedWorkflow, workflowUpdate);
        this.stepCount = Object.keys(this.accumulatedWorkflow.steps || {}).length;
      }
      
      this.buffer += ' ' + chunk;
      
      yield {
        type: i === simulatedChunks.length - 1 ? 'conversation' : 'workflow_update',
        content: chunk,
        workflowDelta: workflowUpdate || undefined,
        currentWorkflow: this.accumulatedWorkflow
      };
    }
  }

  /**
   * Enhanced workflow parsing based on user requirements
   */
  private async parseWorkflowChunk(chunk: string, buffer: string): Promise<Partial<WorkflowJSON> | null> {
    const lowerChunk = chunk.toLowerCase();
    const lowerBuffer = buffer.toLowerCase();
    
    console.log('🔍 Parsing chunk:', chunk);
    
    // Generate trigger step
    if ((lowerChunk.includes('start') || lowerChunk.includes('workflow') || lowerChunk.includes('mrf')) && 
        !lowerBuffer.includes('start:')) {
      console.log('🎯 Generating trigger step');
      return this.generateTriggerStep();
    }
    
    // Generate condition step for approval logic
    if ((lowerChunk.includes('condition') || lowerChunk.includes('approval') || lowerChunk.includes('external') || 
         lowerChunk.includes('greater than') || lowerChunk.includes('manager')) && 
        !lowerBuffer.includes('checkapproval')) {
      console.log('🎯 Generating condition step');
      return this.generateApprovalConditionStep();
    }
    
    // Generate action steps
    if ((lowerChunk.includes('action') || lowerChunk.includes('create') || lowerChunk.includes('notification')) && 
        !lowerBuffer.includes('createevent')) {
      console.log('🎯 Generating action step');
      return this.generateActionStep();
    }
    
    return null;
  }

  /**
   * Generate trigger step
   */
  private generateTriggerStep(): Partial<WorkflowJSON> {
    return {
      metadata: {
        id: `workflow-${Date.now()}`,
        name: 'AI Generated Workflow',
        description: 'Workflow created through AI assistance',
        version: '1.0.0',
        status: 'draft',
        createdAt: new Date(),
        tags: ['ai-generated', 'mrf-workflow']
      },
      steps: {
        start: {
          name: 'MRF Submitted',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: { mrfID: 'dynamic' },
          nextSteps: ['checkApprovalNeeded']
        }
      }
    };
  }

  /**
   * Generate approval condition step based on user requirements
   */
  private generateApprovalConditionStep(): Partial<WorkflowJSON> {
    return {
      steps: {
        checkApprovalNeeded: {
          name: 'Check Approval Requirements',
          type: 'condition',
          condition: {
            any: [
              {
                fact: 'mrf.purpose',
                operator: 'equal',
                value: 'external'
              },
              {
                fact: 'mrf.maxAttendees',
                operator: 'greaterThan',
                value: 100
              }
            ]
          },
          onSuccess: 'requestManagerApproval',
          onFailure: 'proceedDirectly'
        },
        requestManagerApproval: {
          name: 'Request Manager Approval',
          type: 'action',
          action: 'functions.requestApproval',
          params: {
            to: 'user.manager',
            subject: 'Event Approval Required',
            data: 'mrf'
          },
          onSuccess: 'createEvent',
          onFailure: 'notifyUser'
        },
        proceedDirectly: {
          name: 'Proceed Without Approval',
          type: 'action',
          action: 'functions.proceedDirectly',
          params: { reason: 'No approval required' },
          nextSteps: ['createEvent']
        }
      }
    };
  }

  /**
   * Generate action step
   */
  private generateActionStep(): Partial<WorkflowJSON> {
    return {
      steps: {
        createEvent: {
          name: 'Create Event',
          type: 'action',
          action: 'functions.createEvent',
          params: { mrfID: 'dynamic' },
          onSuccess: 'sendNotification',
          onFailure: 'logError'
        },
        sendNotification: {
          name: 'Send Confirmation',
          type: 'action',
          action: 'functions.sendNotification',
          params: {
            to: 'user.email',
            subject: 'Event Created Successfully'
          },
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
   * Merge workflow update with accumulated workflow
   */
  private mergeWorkflowUpdate(
    accumulated: Partial<WorkflowJSON>, 
    update: Partial<WorkflowJSON>
  ): Partial<WorkflowJSON> {
    const merged = { ...accumulated };
    
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
    
    // Set schema version if not present
    if (!merged.schemaVersion) {
      merged.schemaVersion = '1.0';
    }
    
    console.log('🔄 Merged workflow:', merged);
    return merged;
  }

  /**
   * Get current workflow state
   */
  getWorkflow(): Partial<WorkflowJSON> {
    return this.accumulatedWorkflow;
  }

  /**
   * Reset generator state
   */
  reset(): void {
    this.accumulatedWorkflow = {};
    this.buffer = '';
    this.stepCount = 0;
  }

  /**
   * Get creation guidance based on current state
   */
  getGuidance(): StructuredGuidance {
    const currentPhase: CreationPhase = this.stepCount === 0 ? 'trigger_definition' : 
                        this.stepCount < 3 ? 'condition_setup' : 'validation';
    
    const phaseData = {
      'trigger_definition': {
        instructions: 'Define what triggers your workflow to start',
        functions: ['onMRFSubmit', 'onEventRequest'],
        elements: ['trigger step', 'initial parameters']
      },
      'condition_setup': {
        instructions: 'Set up conditions and approval logic',
        functions: ['functions.requestApproval', 'functions.checkConditions'],
        elements: ['condition rules', 'success/failure paths']
      },
      'validation': {
        instructions: 'Review and validate your workflow',
        functions: ['functions.validate', 'functions.test'],
        elements: ['complete workflow', 'error handling']
      }
    };
    
    const data = phaseData[currentPhase] || phaseData['trigger_definition'];
    
    return {
      currentPhase,
      phaseInstructions: data.instructions,
      suggestedFunctions: data.functions,
      requiredElements: data.elements,
      completionCriteria: ['All required elements defined', 'No validation errors'],
      progressPercentage: Math.min((this.stepCount / 5) * 100, 100)
    };
  }
}