// src/app/utils/structured-creation-guide.ts
import { 
  CreationPhase, 
  StructuredGuidance, 
  MRFData, 
  CreationContext,
  ProactiveSuggestion 
} from '@/app/types/workflow-creation';
import { WorkflowJSON } from '@/app/types/workflow';

export class StructuredCreationGuide {
  
  /**
   * Initiate guided creation with optional MRF data context
   */
  initiateGuidedCreation(mrfData?: MRFData): StructuredGuidance {
    const baseGuidance: StructuredGuidance = {
      currentPhase: 'trigger_definition',
      nextPhase: 'condition_setup',
      phaseInstructions: 'Let\'s start by defining what triggers this workflow. What event should start the process?',
      suggestedFunctions: ['onMRFSubmit', 'onScheduledEvent', 'onAPICall'],
      requiredElements: ['trigger type', 'trigger parameters'],
      completionCriteria: ['Valid trigger defined', 'Trigger parameters specified'],
      progressPercentage: 10
    };

    // Customize guidance based on MRF data
    if (mrfData) {
      baseGuidance.phaseInstructions = `I see you have an MRF for "${mrfData.title}". Let's create a workflow for this event. What should trigger this workflow - the MRF submission, a scheduled date, or something else?`;
      baseGuidance.suggestedFunctions = [
        'onMRFSubmit',
        'onScheduledEvent',
        ...(mrfData.approvalRequired ? ['onApprovalRequested'] : []),
        'onAPICall'
      ];
    }

    return baseGuidance;
  }

  /**
   * Progress to the next phase based on current workflow state
   */
  progressToNextPhase(currentPhase: CreationPhase, workflow: Partial<WorkflowJSON>): StructuredGuidance {
    switch (currentPhase) {
      case 'trigger_definition':
        return this.setupConditionsPhase(workflow);
      case 'condition_setup':
        return this.configureActionsPhase(workflow);
      case 'action_configuration':
        return this.defineEndStatesPhase(workflow);
      case 'end_state_definition':
        return this.refinementPhase(workflow);
      case 'refinement':
        return this.validationPhase(workflow);
      case 'validation':
        return this.completionPhase(workflow);
      default:
        return this.refinementPhase(workflow);
    }
  }

  /**
   * Setup conditions phase guidance
   */
  private setupConditionsPhase(workflow: Partial<WorkflowJSON>): StructuredGuidance {
    const hasSteps = Array.isArray(workflow.steps) && workflow.steps.length > 0;
    
    return {
      currentPhase: 'condition_setup',
      nextPhase: 'action_configuration',
      phaseInstructions: hasSteps 
        ? 'Great! Now let\'s add any conditions or decision points. What criteria should determine the workflow path?'
        : 'Let\'s add some decision logic. What conditions should this workflow check before taking action?',
      suggestedFunctions: [
        'validateRequestAgainstPolicy',
        'checkApprovalRequired',
        'validateBudgetLimits',
        'checkUserPermissions',
        'validateDateAvailability'
      ],
      requiredElements: ['decision logic', 'success/failure paths', 'condition parameters'],
      completionCriteria: ['Conditions defined', 'Branching logic complete', 'Success/failure paths set'],
      progressPercentage: 35
    };
  }

  /**
   * Configure actions phase guidance
   */
  private configureActionsPhase(_workflow: Partial<WorkflowJSON>): StructuredGuidance { // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      currentPhase: 'action_configuration',
      nextPhase: 'end_state_definition',
      phaseInstructions: 'Now let\'s define the actions this workflow should take. What should happen when conditions are met?',
      suggestedFunctions: [
        'createAnEvent',
        'sendNotification',
        'requestApproval',
        'updateDatabase',
        'sendEmail',
        'generateReport',
        'scheduleFollowUp'
      ],
      requiredElements: ['action functions', 'function parameters', 'error handling'],
      completionCriteria: ['Actions defined', 'Parameters configured', 'Error paths handled'],
      progressPercentage: 60
    };
  }

  /**
   * Define end states phase guidance
   */
  private defineEndStatesPhase(_workflow: Partial<WorkflowJSON>): StructuredGuidance { // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      currentPhase: 'end_state_definition',
      nextPhase: 'refinement',
      phaseInstructions: 'Let\'s define how this workflow should end. What are the possible completion states?',
      suggestedFunctions: [
        'markWorkflowComplete',
        'sendCompletionNotification',
        'logWorkflowResult',
        'triggerFollowUpWorkflow'
      ],
      requiredElements: ['end conditions', 'completion actions', 'result logging'],
      completionCriteria: ['End states defined', 'Completion actions set', 'Results captured'],
      progressPercentage: 80
    };
  }

  /**
   * Refinement phase guidance
   */
  private refinementPhase(workflow: Partial<WorkflowJSON>): StructuredGuidance {
    const stepCount = Array.isArray(workflow.steps) ? workflow.steps.length : 0;
    
    return {
      currentPhase: 'refinement',
      nextPhase: 'validation',
      phaseInstructions: `Your workflow has ${stepCount} steps. Let's review and refine it. Are there any improvements or additional features you'd like to add?`,
      suggestedFunctions: [
        'optimizeWorkflowPerformance',
        'addErrorHandling',
        'enhanceNotifications',
        'addLogging'
      ],
      requiredElements: ['workflow review', 'optimization', 'error handling'],
      completionCriteria: ['Workflow reviewed', 'Optimizations applied', 'Ready for validation'],
      progressPercentage: 90
    };
  }

  /**
   * Validation phase guidance
   */
  private validationPhase(_workflow: Partial<WorkflowJSON>): StructuredGuidance { // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      currentPhase: 'validation',
      nextPhase: 'completion',
      phaseInstructions: 'Let\'s validate your workflow to ensure it\'s ready for use. I\'ll check for any issues or improvements.',
      suggestedFunctions: [
        'validateWorkflowStructure',
        'checkFunctionAvailability',
        'testWorkflowPaths',
        'verifyPermissions'
      ],
      requiredElements: ['structure validation', 'function validation', 'path testing'],
      completionCriteria: ['No validation errors', 'All paths tested', 'Functions verified'],
      progressPercentage: 95
    };
  }

  /**
   * Completion phase guidance
   */
  private completionPhase(_workflow: Partial<WorkflowJSON>): StructuredGuidance { // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      currentPhase: 'completion',
      phaseInstructions: 'Excellent! Your workflow is complete and ready. You can now save, test, or deploy it.',
      suggestedFunctions: [
        'saveWorkflow',
        'testWorkflow',
        'deployWorkflow',
        'shareWorkflow'
      ],
      requiredElements: ['final review', 'deployment decision'],
      completionCriteria: ['Workflow complete', 'Ready for deployment'],
      progressPercentage: 100
    };
  }

  /**
   * Generate phase-specific proactive suggestions
   */
  generateProactiveSuggestions(
    phase: CreationPhase, 
    workflow: Partial<WorkflowJSON>, 
    context: CreationContext
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    switch (phase) {
      case 'trigger_definition':
        suggestions.push(...this.getTriggerSuggestions(workflow, context));
        break;
      case 'condition_setup':
        suggestions.push(...this.getConditionSuggestions(workflow, context));
        break;
      case 'action_configuration':
        suggestions.push(...this.getActionSuggestions(workflow, context));
        break;
      case 'end_state_definition':
        suggestions.push(...this.getEndStateSuggestions(workflow, context));
        break;
      case 'refinement':
        suggestions.push(...this.getRefinementSuggestions(workflow, context));
        break;
      case 'validation':
        suggestions.push(...this.getValidationSuggestions(workflow, context));
        break;
    }

    return suggestions;
  }

  /**
   * Get trigger-specific suggestions
   */
  private getTriggerSuggestions(workflow: Partial<WorkflowJSON>, context: CreationContext): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    if (context.mrfData) {
      suggestions.push({
        id: 'suggest_mrf_trigger',
        type: 'function',
        title: 'MRF Submission Trigger',
        description: 'Start this workflow when an MRF is submitted',
        actionText: 'Add MRF trigger',
        priority: 'high',
        phase: 'trigger_definition',
        metadata: { functionName: 'onMRFSubmit', mrfId: context.mrfData.id }
      });
    }

    suggestions.push({
      id: 'suggest_scheduled_trigger',
      type: 'function',
      title: 'Scheduled Trigger',
      description: 'Start workflow at specific times or dates',
      actionText: 'Add scheduled trigger',
      priority: 'medium',
      phase: 'trigger_definition',
      metadata: { functionName: 'onScheduledEvent' }
    });

    return suggestions;
  }

  /**
   * Get condition-specific suggestions
   */
  private getConditionSuggestions(workflow: Partial<WorkflowJSON>, context: CreationContext): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    if (context.mrfData?.approvalRequired) {
      suggestions.push({
        id: 'suggest_approval_check',
        type: 'function',
        title: 'Approval Required Check',
        description: 'Check if this request requires approval',
        actionText: 'Add approval condition',
        priority: 'high',
        phase: 'condition_setup',
        metadata: { functionName: 'checkApprovalRequired' }
      });
    }

    if (context.mrfData?.budget) {
      suggestions.push({
        id: 'suggest_budget_validation',
        type: 'function',
        title: 'Budget Validation',
        description: 'Validate budget against limits',
        actionText: 'Add budget check',
        priority: 'medium',
        phase: 'condition_setup',
        metadata: { functionName: 'validateBudgetLimits', budget: context.mrfData.budget }
      });
    }

    return suggestions;
  }

  /**
   * Get action-specific suggestions
   */
  private getActionSuggestions(_workflow: Partial<WorkflowJSON>, _context: CreationContext): ProactiveSuggestion[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    const suggestions: ProactiveSuggestion[] = [];

    suggestions.push({
      id: 'suggest_create_event',
      type: 'function',
      title: 'Create Event',
      description: 'Create the event from MRF data',
      actionText: 'Add create event action',
      priority: 'high',
      phase: 'action_configuration',
      metadata: { functionName: 'createAnEvent' }
    });

    suggestions.push({
      id: 'suggest_send_notification',
      type: 'function',
      title: 'Send Notification',
      description: 'Notify stakeholders of workflow progress',
      actionText: 'Add notification',
      priority: 'medium',
      phase: 'action_configuration',
      metadata: { functionName: 'sendNotification' }
    });

    return suggestions;
  }

  /**
   * Get end state suggestions
   */
  private getEndStateSuggestions(_workflow: Partial<WorkflowJSON>, _context: CreationContext): ProactiveSuggestion[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    const suggestions: ProactiveSuggestion[] = [];

    suggestions.push({
      id: 'suggest_completion_notification',
      type: 'function',
      title: 'Completion Notification',
      description: 'Send final notification when workflow completes',
      actionText: 'Add completion notification',
      priority: 'medium',
      phase: 'end_state_definition',
      metadata: { functionName: 'sendCompletionNotification' }
    });

    return suggestions;
  }

  /**
   * Get refinement suggestions
   */
  private getRefinementSuggestions(workflow: Partial<WorkflowJSON>, _context: CreationContext): ProactiveSuggestion[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    const suggestions: ProactiveSuggestion[] = [];

    // Check if workflow needs error handling
    const hasErrorHandling = this.hasErrorHandling(workflow);
    if (!hasErrorHandling) {
      suggestions.push({
        id: 'suggest_error_handling',
        type: 'improvement',
        title: 'Add Error Handling',
        description: 'Add error handling for better reliability',
        actionText: 'Improve error handling',
        priority: 'high',
        phase: 'refinement',
        metadata: { improvementType: 'error_handling' }
      });
    }

    // Check if workflow needs logging
    const hasLogging = this.hasLogging(workflow);
    if (!hasLogging) {
      suggestions.push({
        id: 'suggest_logging',
        type: 'improvement',
        title: 'Add Logging',
        description: 'Add logging for better monitoring',
        actionText: 'Add logging',
        priority: 'medium',
        phase: 'refinement',
        metadata: { improvementType: 'logging' }
      });
    }

    return suggestions;
  }

  /**
   * Get validation suggestions
   */
  private getValidationSuggestions(_workflow: Partial<WorkflowJSON>, _context: CreationContext): ProactiveSuggestion[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    const suggestions: ProactiveSuggestion[] = [];

    suggestions.push({
      id: 'suggest_test_workflow',
      type: 'validation',
      title: 'Test Workflow',
      description: 'Run a test execution of your workflow',
      actionText: 'Test workflow',
      priority: 'high',
      phase: 'validation',
      metadata: { validationType: 'test_execution' }
    });

    return suggestions;
  }

  /**
   * Check if workflow has error handling
   */
  private hasErrorHandling(workflow: Partial<WorkflowJSON>): boolean {
    if (!workflow.steps) return false;
    
    return Object.values(workflow.steps).some(step => 
      step.onFailure || 
      (step.type === 'action' && step.action?.includes('error')) ||
      (step.name && step.name.toLowerCase().includes('error'))
    );
  }

  /**
   * Check if workflow has logging
   */
  private hasLogging(workflow: Partial<WorkflowJSON>): boolean {
    if (!workflow.steps) return false;
    
    return Object.values(workflow.steps).some(step => 
      (step.action && step.action.includes('log')) ||
      (step.name && step.name.toLowerCase().includes('log'))
    );
  }

  /**
   * Calculate completion percentage based on workflow structure
   */
  calculateCompletionPercentage(workflow: Partial<WorkflowJSON>, phase: CreationPhase): number {
    const basePercentage = this.getPhaseBasePercentage(phase);
    
    if (!Array.isArray(workflow.steps)) return basePercentage;
    
    const stepCount = workflow.steps.length;
    const hasValidSteps = stepCount > 0;
    const hasTrigger = workflow.steps.some((step: { type?: string }) => step.type === 'trigger');
    const hasActions = workflow.steps.some((step: { type?: string }) => step.type === 'action');
    const hasEndStates = workflow.steps.some((step: { type?: string }) => step.type === 'end');
    
    let bonus = 0;
    if (hasValidSteps) bonus += 5;
    if (hasTrigger) bonus += 5;
    if (hasActions) bonus += 5;
    if (hasEndStates) bonus += 5;
    
    return Math.min(100, basePercentage + bonus);
  }

  /**
   * Get base percentage for each phase
   */
  private getPhaseBasePercentage(phase: CreationPhase): number {
    switch (phase) {
      case 'trigger_definition': return 10;
      case 'condition_setup': return 35;
      case 'action_configuration': return 60;
      case 'end_state_definition': return 80;
      case 'refinement': return 90;
      case 'validation': return 95;
      case 'completion': return 100;
      default: return 0;
    }
  }

  /**
   * Get user-friendly phase name
   */
  getPhaseName(phase: CreationPhase): string {
    switch (phase) {
      case 'trigger_definition': return 'Define Triggers';
      case 'condition_setup': return 'Setup Conditions';
      case 'action_configuration': return 'Configure Actions';
      case 'end_state_definition': return 'Define End States';
      case 'refinement': return 'Refine & Optimize';
      case 'validation': return 'Validate & Test';
      case 'completion': return 'Complete';
      default: return 'Unknown Phase';
    }
  }

  /**
   * Check if phase is complete based on workflow structure
   */
  isPhaseComplete(phase: CreationPhase, workflow: Partial<WorkflowJSON>): boolean {
    if (!workflow.steps) return false;
    
    const steps = Object.values(workflow.steps);
    
    switch (phase) {
      case 'trigger_definition':
        return steps.some(step => step.type === 'trigger');
      case 'condition_setup':
        return steps.some(step => step.type === 'condition') || steps.length >= 2;
      case 'action_configuration':
        return steps.some(step => step.type === 'action');
      case 'end_state_definition':
        return steps.some(step => step.type === 'end');
      case 'refinement':
        return steps.length >= 3 && this.hasErrorHandling(workflow);
      case 'validation':
        return true; // Validation is always considered complete once reached
      case 'completion':
        return true;
      default:
        return false;
    }
  }
}