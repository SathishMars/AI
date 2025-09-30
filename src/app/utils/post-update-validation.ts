// src/app/utils/post-update-validation.ts
import { 
  WorkflowJSON, 
  ValidationResult, 
  ValidationError
} from '@/app/types/workflow';
import {
  PostUpdateValidationResult,
  UpdateContext,
  ValidationStrategy,
  ConversationalRecovery,
  ValidationIssue,
  AutoFixOption,
  WorkflowChange
} from '@/app/types/workflow-creation';
import { ConversationalErrorHandler } from './conversational-error-handler';

/**
 * Post-update validation system with streaming awareness and conversational recovery
 */
export class PostUpdateValidationSystem {
  private validationCache: Map<string, CachedValidationResult> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  private errorHandler: ConversationalErrorHandler;

  constructor() {
    this.errorHandler = new ConversationalErrorHandler();
    console.log('✅ PostUpdateValidationSystem initialized');
  }

  /**
   * Main validation entry point after workflow updates
   */
  async validateAfterUpdate(
    workflow: WorkflowJSON,
    updateContext: UpdateContext
  ): Promise<PostUpdateValidationResult> {
    console.log('🔍 Starting post-update validation for:', updateContext.triggerType);

    try {
      // Determine validation strategy based on update context
      const strategy = this.optimizeValidationPerformance(workflow, updateContext.changes);
      
      // Perform validation with caching
      const validationResult = await this.performValidationWithCaching(
        workflow,
        updateContext,
        strategy
      );

      // Create post-update specific result
      const postUpdateResult: PostUpdateValidationResult = {
        ...validationResult,
        updateSpecificIssues: this.extractUpdateSpecificIssues(validationResult, updateContext),
        validationTriggeredBy: updateContext.triggerType,
        conversationalRecovery: await this.generateConversationalRecovery(
          validationResult,
          updateContext
        )
      };

      // Cache results for future use
      await this.cacheValidationResults(workflow.metadata.id, postUpdateResult);

      // Trigger conversational recovery if needed
      if (!postUpdateResult.isValid && postUpdateResult.conversationalRecovery) {
        await this.initiateConversationalRecovery(
          postUpdateResult.errors,
          updateContext
        );
      }

      console.log('✅ Post-update validation completed', {
        isValid: postUpdateResult.isValid,
        errorCount: postUpdateResult.errors.length,
        warningCount: postUpdateResult.warnings.length
      });

      return postUpdateResult;

    } catch (error) {
      console.error('❌ Error in post-update validation:', error);
      return this.createErrorValidationResult(error, updateContext);
    }
  }

  /**
   * Handle streaming validation during AI updates
   */
  async *handleStreamingValidation(
    stream: AsyncGenerator<{ workflow: Partial<WorkflowJSON>; updateContext: UpdateContext }>
  ): AsyncGenerator<{ validationUpdate: ValidationResult; workflow: WorkflowJSON }> {
    console.log('🌊 Starting streaming validation');

    for await (const { workflow: partialWorkflow, updateContext } of stream) {
      // Only validate if we have a complete enough workflow
      if (this.isValidatableWorkflow(partialWorkflow)) {
        const completeWorkflow = this.ensureCompleteWorkflow(partialWorkflow);
        
        // Use lightweight validation for streaming
        const streamingStrategy: ValidationStrategy = {
          fullValidation: false,
          incrementalValidation: true,
          cacheablePortions: [],
          priorityRules: ['critical', 'structural'],
          streamingCompatible: true
        };

        const validationResult = await this.performValidationWithCaching(
          completeWorkflow,
          updateContext,
          streamingStrategy
        );

        yield {
          validationUpdate: validationResult,
          workflow: completeWorkflow
        };
      }
    }
  }

  /**
   * Initiate conversational error recovery
   */
  async initiateConversationalRecovery(
    errors: ValidationError[],
    context: UpdateContext
  ): Promise<void> {
    console.log('💬 Initiating conversational error recovery for', errors.length, 'errors');

    try {
      // Filter and prioritize errors
      const criticalErrors = errors.filter(e => e.severity === 'error');
      const warnings = errors.filter(e => e.severity === 'warning');

      // Handle critical errors immediately
      if (criticalErrors.length > 0) {
        await this.handleCriticalErrors(criticalErrors, context);
      }

      // Queue warnings for appropriate conversation moments
      if (warnings.length > 0) {
        await this.queueWarningsForConversation(warnings, context);
      }

    } catch (error) {
      console.error('❌ Error in conversational recovery:', error);
    }
  }

  /**
   * Cache validation results for performance
   */
  async cacheValidationResults(
    workflowId: string,
    results: PostUpdateValidationResult
  ): Promise<void> {
    const cacheKey = `${workflowId}_${Date.now()}`;
    const cachedResult: CachedValidationResult = {
      results,
      timestamp: new Date(),
      workflowHash: this.generateWorkflowHash(results),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    };

    this.validationCache.set(cacheKey, cachedResult);
    console.log('💾 Cached validation results for', workflowId);
  }

  /**
   * Optimize validation performance based on changes
   */
  optimizeValidationPerformance(
    workflow: WorkflowJSON,
    changes: WorkflowChange[]
  ): ValidationStrategy {
    const hasStructuralChanges = changes.some(change => 
      change.path.includes('steps') || change.path.includes('metadata')
    );

    const hasMinorChanges = changes.length < 3 && 
      changes.every(change => change.type === 'modify');

    return {
      fullValidation: hasStructuralChanges,
      incrementalValidation: hasMinorChanges,
      cacheablePortions: hasMinorChanges ? ['metadata', 'functions'] : [],
      priorityRules: hasStructuralChanges ? ['critical', 'structural', 'logical'] : ['critical'],
      streamingCompatible: !hasStructuralChanges
    };
  }

  // Private helper methods
  private async performValidationWithCaching(
    workflow: WorkflowJSON,
    updateContext: UpdateContext,
    strategy: ValidationStrategy
  ): Promise<ValidationResult> {
    // Check cache first
    const cachedResult = await this.getCachedValidationResult(workflow, updateContext);
    if (cachedResult && !strategy.fullValidation) {
      console.log('📋 Using cached validation result');
      return cachedResult;
    }

    // For now, use a simple validation that doesn't require the full functions library
    // TODO: Integrate with proper functions library when available
    const simpleValidation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Basic structural validation
    if (!workflow.metadata?.id) {
      simpleValidation.errors.push({
        id: 'missing_workflow_id',
        severity: 'error',
        technicalMessage: 'Workflow ID is required',
        conversationalExplanation: 'Your workflow needs an ID to be properly saved and referenced.'
      });
    }

    if (!workflow.steps || Object.keys(workflow.steps).length === 0) {
      simpleValidation.errors.push({
        id: 'missing_workflow_steps',
        severity: 'error',
        technicalMessage: 'Workflow must have at least one step',
        conversationalExplanation: 'Your workflow needs at least one step to be functional. Let me help you add some steps.',
        suggestedFix: 'Add a start step and an end step to create a basic workflow structure'
      });
    }

    simpleValidation.isValid = simpleValidation.errors.length === 0;
    return simpleValidation;
  }

  private async getCachedValidationResult(
    workflow: WorkflowJSON,
    _updateContext: UpdateContext // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ValidationResult | null> {
    const workflowHash = this.generateWorkflowHash(workflow);
    
    for (const [key, cached] of this.validationCache.entries()) {
      if (cached.workflowHash === workflowHash && 
          cached.expiresAt > new Date() &&
          key.includes(workflow.metadata.id)) {
        return cached.results;
      }
    }
    
    return null;
  }

  private generateWorkflowHash(workflow: WorkflowJSON | ValidationResult): string {
    return `hash_${JSON.stringify(workflow).length}_${Date.now()}`;
  }

  private extractUpdateSpecificIssues(
    validationResult: ValidationResult,
    _updateContext: UpdateContext // eslint-disable-line @typescript-eslint/no-unused-vars
  ): ValidationIssue[] {
    return validationResult.errors.map(error => ({
      issueId: error.id,
      severity: error.severity as 'error' | 'warning' | 'info',
      message: error.conversationalExplanation || error.technicalMessage,
      path: error.fieldPath || error.stepId || 'unknown',
      suggestion: error.suggestedFix,
      autoFixable: false // TODO: Implement auto-fix detection
    }));
  }

  private async generateConversationalRecovery(
    validationResult: ValidationResult,
    updateContext: UpdateContext
  ): Promise<ConversationalRecovery | undefined> {
    if (validationResult.errors.length === 0) {
      return undefined;
    }

    const errorExplanation = this.generateErrorExplanation(validationResult.errors);
    const recoveryPrompt = this.generateRecoveryPrompt(validationResult.errors, updateContext);

    return {
      recoveryId: `recovery_${Date.now()}`,
      errorExplanation,
      recoveryPrompt,
      suggestedActions: this.generateSuggestedActions(validationResult.errors),
      autoFixOptions: this.generateAutoFixOptions(validationResult.errors)
    };
  }

  private generateErrorExplanation(errors: ValidationError[]): string {
    if (errors.length === 1) {
      return errors[0].conversationalExplanation || errors[0].technicalMessage;
    }

    const errorSummary = errors.map(e => 
      e.conversationalExplanation || e.technicalMessage
    ).join('; ');

    return `I found ${errors.length} issues with your workflow: ${errorSummary}`;
  }

  private generateRecoveryPrompt(errors: ValidationError[], _updateContext: UpdateContext): string { // eslint-disable-line @typescript-eslint/no-unused-vars
    const criticalCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    if (criticalCount > 0) {
      return `Let's fix these ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} first. Would you like me to guide you through resolving them one by one?`;
    }

    if (warningCount > 0) {
      return `I noticed ${warningCount} potential improvement${warningCount > 1 ? 's' : ''} for your workflow. Would you like to address them now or continue with your current task?`;
    }

    return 'Your workflow looks good! Is there anything specific you\'d like me to help you with?';
  }

  private generateSuggestedActions(errors: ValidationError[]): string[] {
    return errors
      .map(error => error.suggestedFix)
      .filter((fix): fix is string => !!fix)
      .slice(0, 3); // Limit to top 3 suggestions
  }

  private generateAutoFixOptions(_errors: ValidationError[]): AutoFixOption[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    // TODO: Implement intelligent auto-fix detection
    return [];
  }

  private async handleCriticalErrors(
    errors: ValidationError[],
    _context: UpdateContext // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    console.log('🚨 Handling critical errors:', errors.length);
    
    // TODO: Integrate with conversation system to display critical errors
    // This would typically send messages to the conversation interface
  }

  private async queueWarningsForConversation(
    warnings: ValidationError[],
    _context: UpdateContext // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    console.log('⚠️ Queueing warnings for conversation:', warnings.length);
    
    // TODO: Integrate with conversation system to queue warnings
  }

  private isValidatableWorkflow(workflow: Partial<WorkflowJSON>): boolean {
    return !!(workflow.metadata?.id && workflow.steps && Object.keys(workflow.steps).length > 0);
  }

  private ensureCompleteWorkflow(partialWorkflow: Partial<WorkflowJSON>): WorkflowJSON {
    return {
      schemaVersion: partialWorkflow.schemaVersion || '1.0.0',
      metadata: {
        id: partialWorkflow.metadata?.id || 'temp-workflow',
        name: partialWorkflow.metadata?.name || 'Temporary Workflow',
        version: partialWorkflow.metadata?.version || '1.0.0',
        status: partialWorkflow.metadata?.status || 'draft',
        tags: partialWorkflow.metadata?.tags || [],
        ...partialWorkflow.metadata
      },
      steps: partialWorkflow.steps || {},
      ...partialWorkflow
    } as WorkflowJSON;
  }

  private createErrorValidationResult(
    error: unknown,
    updateContext: UpdateContext
  ): PostUpdateValidationResult {
    return {
      isValid: false,
      errors: [{
        id: `validation_system_error_${Date.now()}`,
        severity: 'error',
        technicalMessage: `Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        conversationalExplanation: 'I encountered an issue while validating your workflow. Please try again or contact support if the problem persists.'
      }],
      warnings: [],
      info: [],
      updateSpecificIssues: [],
      validationTriggeredBy: updateContext.triggerType
    };
  }
}

// Supporting types
interface CachedValidationResult {
  results: ValidationResult;
  timestamp: Date;
  workflowHash: string;
  expiresAt: Date;
}