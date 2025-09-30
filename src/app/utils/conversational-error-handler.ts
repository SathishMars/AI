// src/app/utils/conversational-error-handler.ts
import { ValidationError } from '@/app/types/workflow';
import { ConversationalRecovery, UpdateContext } from '@/app/types/workflow-creation';
import { ConversationStateManager } from './conversation-manager';

/**
 * Conversational Error Handler - Integrates validation errors with aime chat interface
 */
export class ConversationalErrorHandler {
  constructor() {
    console.log('✅ ConversationalErrorHandler initialized');
  }

  /**
   * Handle critical errors that require immediate user attention
   */
  async handleCriticalErrors(
    errors: ValidationError[],
    context: UpdateContext,
    conversationManager: ConversationStateManager
  ): Promise<void> {
    console.log('🚨 Handling critical errors in conversation:', errors.length);

    const criticalErrors = errors.filter(e => e.severity === 'error');
    
    if (criticalErrors.length === 0) {
      return;
    }

    // Generate conversational error message
    const errorMessage = this.generateCriticalErrorMessage(criticalErrors);
    
    // Add to conversation as aime message
    conversationManager.addAimeMessage(errorMessage, 'error_recovery');

    // If multiple errors, offer guided resolution
    if (criticalErrors.length > 1) {
      const guidanceMessage = `I found ${criticalErrors.length} issues that need attention. Would you like me to guide you through fixing them one by one, or would you prefer to see all the issues at once?`;
      conversationManager.addAimeMessage(guidanceMessage, 'text');
    }
  }

  /**
   * Queue warnings for appropriate conversation moments
   */
  async queueWarningsForConversation(
    warnings: ValidationError[],
    context: UpdateContext,
    conversationManager: ConversationStateManager
  ): Promise<void> {
    console.log('⚠️ Queueing warnings for conversation:', warnings.length);

    if (warnings.length === 0) {
      return;
    }

    // Generate friendly warning message
    const warningMessage = this.generateWarningMessage(warnings);
    
    // Add as info-level message that doesn't interrupt the flow
    conversationManager.addAimeMessage(warningMessage, 'text');

    // Offer optional improvements
    if (warnings.length > 0) {
      const improvementMessage = `These are just suggestions to make your workflow even better. Feel free to continue with your current task, or let me know if you'd like to address any of these improvements.`;
      conversationManager.addAimeMessage(improvementMessage, 'text');
    }
  }

  /**
   * Provide step-by-step error resolution guidance
   */
  async provideStepByStepGuidance(
    error: ValidationError,
    context: UpdateContext,
    conversationManager: ConversationStateManager
  ): Promise<void> {
    console.log('📋 Providing step-by-step guidance for error:', error.id);

    // Generate conversational explanation
    const explanation = error.conversationalExplanation || error.technicalMessage;
    conversationManager.addAimeMessage(`Let's fix this issue: ${explanation}`, 'text');

    // Provide specific guidance
    if (error.suggestedFix) {
      const guidanceMessage = `Here's how we can fix this: ${error.suggestedFix}`;
      conversationManager.addAimeMessage(guidanceMessage, 'text');
    }

    // Offer to make the fix automatically if possible
    const offerMessage = "Would you like me to help you fix this, or would you prefer to make the changes yourself?";
    conversationManager.addAimeMessage(offerMessage, 'text');
  }

  /**
   * Generate user-friendly error recovery suggestions
   */
  generateRecoverySuggestions(
    errors: ValidationError[],
    _context: UpdateContext // eslint-disable-line @typescript-eslint/no-unused-vars
  ): ConversationalRecovery {
    const errorExplanation = this.generateErrorExplanation(errors);
    const recoveryPrompt = this.generateRecoveryPrompt(errors);
    const suggestedActions = this.generateSuggestedActions(errors);

    return {
      recoveryId: `recovery_${Date.now()}`,
      errorExplanation,
      recoveryPrompt,
      suggestedActions,
      autoFixOptions: [] // TODO: Implement auto-fix detection
    };
  }

  /**
   * Handle validation success with positive reinforcement
   */
  async handleValidationSuccess(
    conversationManager: ConversationStateManager
  ): Promise<void> {
    const successMessages = [
      "Great! Your workflow looks good now. 🎉",
      "Perfect! All validation checks passed. ✅",
      "Excellent! Your workflow is ready to go. 🚀",
      "Nice work! Everything looks correct. 👍"
    ];

    const randomMessage = successMessages[Math.floor(Math.random() * successMessages.length)];
    conversationManager.addAimeMessage(randomMessage, 'text');
  }

  // Private helper methods
  private generateCriticalErrorMessage(errors: ValidationError[]): string {
    if (errors.length === 1) {
      const error = errors[0];
      return `I found a critical issue that needs your attention: ${error.conversationalExplanation || error.technicalMessage}`;
    }

    const errorList = errors.map((error, index) => 
      `${index + 1}. ${error.conversationalExplanation || error.technicalMessage}`
    ).join('\n');

    return `I found ${errors.length} critical issues that need attention:\n\n${errorList}`;
  }

  private generateWarningMessage(warnings: ValidationError[]): string {
    if (warnings.length === 1) {
      const warning = warnings[0];
      return `I noticed a potential improvement: ${warning.conversationalExplanation || warning.technicalMessage}`;
    }

    const warningList = warnings.map((warning, index) => 
      `${index + 1}. ${warning.conversationalExplanation || warning.technicalMessage}`
    ).join('\n');

    return `I noticed ${warnings.length} potential improvements for your workflow:\n\n${warningList}`;
  }

  private generateErrorExplanation(errors: ValidationError[]): string {
    if (errors.length === 1) {
      return errors[0].conversationalExplanation || errors[0].technicalMessage;
    }

    return `I found ${errors.length} issues that need attention. The main problems are related to workflow structure and validation requirements.`;
  }

  private generateRecoveryPrompt(errors: ValidationError[]): string {
    const criticalCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    if (criticalCount > 0) {
      return `Let's address these ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} first. I can guide you through fixing them step by step. What would you like to tackle first?`;
    }

    if (warningCount > 0) {
      return `These are suggestions to improve your workflow. Would you like to address them now, or shall we continue with your current task?`;
    }

    return "Everything looks good! What would you like to work on next?";
  }

  private generateSuggestedActions(errors: ValidationError[]): string[] {
    const actions = errors
      .map(error => error.suggestedFix)
      .filter((fix): fix is string => !!fix)
      .slice(0, 3); // Limit to top 3 suggestions

    // Add generic helpful actions if we don't have specific suggestions
    if (actions.length === 0) {
      return [
        "Review the workflow structure",
        "Check all required fields",
        "Verify step connections"
      ];
    }

    return actions;
  }
}

/**
 * Error priority classification for conversation handling
 */
export enum ErrorPriority {
  CRITICAL = 'critical',      // Blocks workflow execution - show immediately
  HIGH = 'high',             // Important issues - show at next opportunity
  MEDIUM = 'medium',         // Improvements - queue for appropriate moment
  LOW = 'low'               // Minor suggestions - show only when asked
}

/**
 * Determine error priority based on severity and context
 */
export function classifyErrorPriority(error: ValidationError, context: UpdateContext): ErrorPriority {
  // Critical errors always have highest priority
  if (error.severity === 'error') {
    return ErrorPriority.CRITICAL;
  }

  // Warnings during AI updates are medium priority
  if (error.severity === 'warning' && context.triggerType === 'ai_update') {
    return ErrorPriority.MEDIUM;
  }

  // User-triggered validations get higher priority
  if (context.triggerType === 'manual' || context.triggerType === 'user_input') {
    return ErrorPriority.HIGH;
  }

  return ErrorPriority.LOW;
}