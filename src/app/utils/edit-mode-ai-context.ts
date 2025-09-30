// src/app/utils/edit-mode-ai-context.ts
import { WorkflowJSON } from '@/app/types/workflow';
import { ConversationMessage } from '@/app/types/conversation';
import { EditModeContext, EditIntent, WorkflowChange } from '@/app/types/workflow-history';

export class EditModeAIContext {
  private readonly editIndicators = [
    'modify', 'change', 'update', 'edit', 'adjust', 'fix', 'improve',
    'add step', 'remove step', 'change condition', 'update parameter',
    'replace', 'delete', 'insert', 'refactor', 'optimize', 'correct',
    'revise', 'amend', 'alter', 'enhance', 'refine', 'tweak'
  ];

  private readonly intentCategories = {
    step_modification: [
      'add step', 'remove step', 'delete step', 'insert step',
      'step before', 'step after', 'new step', 'additional step'
    ],
    condition_change: [
      'condition', 'if', 'when', 'criteria', 'rule', 'check',
      'validate', 'verify', 'ensure', 'require'
    ],
    parameter_update: [
      'parameter', 'value', 'setting', 'configuration', 'option',
      'field', 'property', 'attribute', 'variable'
    ],
    workflow_structure: [
      'flow', 'sequence', 'order', 'structure', 'organization',
      'arrangement', 'layout', 'hierarchy', 'path', 'route'
    ],
    function_replacement: [
      'function', 'action', 'operation', 'task', 'activity',
      'method', 'procedure', 'process', 'execution'
    ],
    validation_fix: [
      'error', 'issue', 'problem', 'bug', 'fix', 'repair',
      'resolve', 'correct', 'debug', 'troubleshoot'
    ]
  };

  async detectEditModeRequest(
    userMessage: string,
    currentWorkflow: WorkflowJSON,
    conversationHistory: ConversationMessage[]
  ): Promise<EditModeContext> {
    const normalizedMessage = userMessage.toLowerCase();
    
    // Check for edit indicators
    const hasEditIndicator = this.editIndicators.some(indicator => 
      normalizedMessage.includes(indicator)
    );

    // Check for workflow references (step names, existing structure)
    const hasWorkflowReference = this.checkWorkflowReferences(normalizedMessage, currentWorkflow);
    
    // Check for modification context in conversation history
    const hasModificationContext = this.checkModificationContext(conversationHistory);

    const isEditRequest = hasEditIndicator || hasWorkflowReference || hasModificationContext;
    
    if (isEditRequest) {
      const editIntent = await this.classifyEditIntent(userMessage);
      const conversationContext = this.extractRelevantContext(conversationHistory);
      
      return {
        mode: 'edit',
        targetWorkflow: currentWorkflow,
        conversationContext,
        editIntent,
        isDraftMode: currentWorkflow.metadata.status === 'draft',
        changesSinceLastPublish: await this.calculateChangesSinceLastPublish()
      };
    }
    
    return { 
      mode: 'continue', 
      conversationContext: conversationHistory,
      isDraftMode: currentWorkflow.metadata.status === 'draft',
      changesSinceLastPublish: []
    };
  }

  private checkWorkflowReferences(message: string, workflow: WorkflowJSON): boolean {
    const stepNames = Object.values(workflow.steps).map(step => step.name.toLowerCase());
    const workflowName = workflow.metadata.name.toLowerCase();
    
    // Check if message references existing step names or workflow name
    return stepNames.some(stepName => message.includes(stepName)) ||
           message.includes(workflowName) ||
           message.includes('existing') ||
           message.includes('current workflow') ||
           message.includes('this workflow');
  }

  private checkModificationContext(conversationHistory: ConversationMessage[]): boolean {
    // Look for modification context in recent conversation
    const recentMessages = conversationHistory.slice(-5);
    
    return recentMessages.some(msg => {
      const content = msg.content.toLowerCase();
      return this.editIndicators.some(indicator => content.includes(indicator)) ||
             content.includes('workflow') && (
               content.includes('change') || 
               content.includes('update') || 
               content.includes('modify')
             );
    });
  }

  private async classifyEditIntent(userMessage: string): Promise<EditIntent> {
    const normalizedMessage = userMessage.toLowerCase();
    let bestCategory: EditIntent['category'] = 'workflow_structure';
    let maxScore = 0;
    const suggestedActions: string[] = [];
    const expectedChanges: string[] = [];

    // Score each category based on keyword matches
    for (const [category, keywords] of Object.entries(this.intentCategories)) {
      const score = keywords.reduce((acc, keyword) => {
        if (normalizedMessage.includes(keyword)) {
          return acc + 1;
        }
        return acc;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as EditIntent['category'];
      }
    }

    // Generate suggested actions based on category
    switch (bestCategory) {
      case 'step_modification':
        suggestedActions.push('Add new workflow step', 'Remove existing step', 'Reorder steps');
        expectedChanges.push('Workflow step structure will be modified');
        break;
      case 'condition_change':
        suggestedActions.push('Update condition logic', 'Add new validation rule', 'Modify branching criteria');
        expectedChanges.push('Conditional logic will be updated');
        break;
      case 'parameter_update':
        suggestedActions.push('Update step parameters', 'Modify configuration values', 'Set new defaults');
        expectedChanges.push('Step parameters will be modified');
        break;
      case 'workflow_structure':
        suggestedActions.push('Reorganize workflow flow', 'Update step connections', 'Modify execution order');
        expectedChanges.push('Overall workflow structure will change');
        break;
      case 'function_replacement':
        suggestedActions.push('Replace workflow actions', 'Update function calls', 'Change operation types');
        expectedChanges.push('Workflow functions will be updated');
        break;
      case 'validation_fix':
        suggestedActions.push('Fix validation errors', 'Resolve workflow issues', 'Debug problems');
        expectedChanges.push('Workflow errors will be resolved');
        break;
    }

    // Calculate confidence based on multiple factors
    const confidence = Math.min(1.0, (maxScore / 3) + 0.3 + (userMessage.length > 50 ? 0.2 : 0));

    return {
      category: bestCategory,
      confidence,
      suggestedActions,
      expectedChanges,
      targetSteps: this.extractTargetSteps(userMessage)
    };
  }

  private extractTargetSteps(userMessage: string): string[] {
    // Extract step names that might be referenced in the message
    const stepPatterns = [
      /step (?:called |named )?["']([^"']+)["']/gi,
      /(?:the |this )?["']([^"']+)["'] step/gi,
      /step (\w+)/gi
    ];

    const targetSteps: string[] = [];
    
    for (const pattern of stepPatterns) {
      let match;
      while ((match = pattern.exec(userMessage)) !== null) {
        targetSteps.push(match[1]);
      }
    }

    return [...new Set(targetSteps)]; // Remove duplicates
  }

  private extractRelevantContext(conversationHistory: ConversationMessage[]): ConversationMessage[] {
    // Return last 10 messages for context, prioritizing recent workflow-related discussions
    const workflowRelatedMessages = conversationHistory.filter(msg => {
      const content = msg.content.toLowerCase();
      return content.includes('workflow') || 
             content.includes('step') || 
             this.editIndicators.some(indicator => content.includes(indicator));
    });

    // Take last 10 messages, but prioritize workflow-related ones
    const recentMessages = conversationHistory.slice(-10);
    const contextMessages = new Map<string, ConversationMessage>();

    // Add workflow-related messages first
    workflowRelatedMessages.slice(-5).forEach(msg => {
      contextMessages.set(msg.id, msg);
    });

    // Fill remaining with recent messages
    recentMessages.forEach(msg => {
      if (contextMessages.size < 10) {
        contextMessages.set(msg.id, msg);
      }
    });

    return Array.from(contextMessages.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  private async calculateChangesSinceLastPublish(): Promise<WorkflowChange[]> {
    // For now, return empty array - this would typically query the database
    // to find changes since the last published version
    return [];
  }

  /**
   * Generate edit-specific AI prompts based on detected intent
   */
  generateEditModePrompts(editContext: EditModeContext): string[] {
    if (editContext.mode !== 'edit' || !editContext.editIntent) {
      return [];
    }

    const prompts: string[] = [];
    const intent = editContext.editIntent;

    // Base edit mode context
    prompts.push(
      `I understand you want to edit the existing workflow. I have the current ${editContext.isDraftMode ? 'draft' : 'published'} version loaded.`
    );

    // Category-specific prompts
    switch (intent.category) {
      case 'step_modification':
        prompts.push(
          "I can help you add, remove, or reorder workflow steps. What specific changes would you like to make to the step structure?"
        );
        break;
      case 'condition_change':
        prompts.push(
          "I'll help you update the conditional logic. Which conditions or branching rules need to be modified?"
        );
        break;
      case 'parameter_update':
        prompts.push(
          "I can update step parameters and configuration values. Which settings need to be changed?"
        );
        break;
      case 'workflow_structure':
        prompts.push(
          "I'll help you reorganize the workflow structure. How would you like to change the flow and connections?"
        );
        break;
      case 'function_replacement':
        prompts.push(
          "I can replace or update workflow functions and actions. Which operations need to be changed?"
        );
        break;
      case 'validation_fix':
        prompts.push(
          "I'll help resolve any validation issues. Let me check the current workflow for problems that need fixing."
        );
        break;
    }

    // Add suggested actions if available
    if (intent.suggestedActions.length > 0) {
      prompts.push(
        `Here are some things I can help you with: ${intent.suggestedActions.join(', ')}.`
      );
    }

    return prompts;
  }
}