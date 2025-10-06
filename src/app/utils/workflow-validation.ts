// src/app/utils/workflow-validation.ts
/**
 * Workflow Validation Utilities
 * 
 * Comprehensive validation for nested array workflow structures
 * with human-readable step IDs.
 */

import { WorkflowStep, ValidationError } from '@/app/types/workflow';
import {
  getAllStepIds,
  traverseWorkflow,
  hasRealSteps as hasRealStepsUtil
} from './workflow-navigation';

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate all step IDs in a workflow
 * 
 * Checks:
 * - ID format (camelCase, only letters/numbers)
 * - ID length (3-50 characters)
 * - ID uniqueness
 * 
 * @param steps - Array of workflow steps
 * @returns Array of validation errors
 */
export function validateStepIds(steps: WorkflowStep[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const stepIds = new Set<string>();
  const duplicates = new Set<string>();

  // Regular expression for camelCase validation
  const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;

  traverseWorkflow(steps, (step, path) => {
    const stepNumber = path.map(i => i + 1).join('.');

    // Check ID format
    if (!camelCaseRegex.test(step.id)) {
      errors.push({
        id: generateErrorId(),
        severity: 'error',
        stepId: step.id,
        fieldPath: 'id',
        technicalMessage: `Invalid step ID format: "${step.id}" at step ${stepNumber}`,
        conversationalExplanation: `The step ID "${step.id}" (step ${stepNumber}) must be in camelCase format (start with lowercase letter, only letters and numbers allowed). For example: "checkBudget", "sendEmail", "requestApproval".`,
        suggestedFix: `Change "${step.id}" to camelCase format (e.g., "${step.id.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}")`,
        documentationLink: '/docs/workflow-step-ids'
      });
    }

    // Check ID length
    if (step.id.length < 3) {
      errors.push({
        id: generateErrorId(),
        severity: 'error',
        stepId: step.id,
        fieldPath: 'id',
        technicalMessage: `Step ID too short: "${step.id}" at step ${stepNumber} (minimum 3 characters)`,
        conversationalExplanation: `The step ID "${step.id}" (step ${stepNumber}) is too short. Step IDs must be at least 3 characters long to be meaningful.`,
        suggestedFix: `Make the ID more descriptive (e.g., "${step.id}Action" or "${step.id}Step")`,
        documentationLink: '/docs/workflow-step-ids'
      });
    }

    if (step.id.length > 50) {
      errors.push({
        id: generateErrorId(),
        severity: 'error',
        stepId: step.id,
        fieldPath: 'id',
        technicalMessage: `Step ID too long: "${step.id}" at step ${stepNumber} (maximum 50 characters)`,
        conversationalExplanation: `The step ID "${step.id}" (step ${stepNumber}) is too long. Step IDs should be concise and no more than 50 characters.`,
        suggestedFix: `Shorten the ID to something more concise`,
        documentationLink: '/docs/workflow-step-ids'
      });
    }

    // Check for duplicates
    if (stepIds.has(step.id)) {
      duplicates.add(step.id);
      errors.push({
        id: generateErrorId(),
        severity: 'error',
        stepId: step.id,
        fieldPath: 'id',
        technicalMessage: `Duplicate step ID: "${step.id}" at step ${stepNumber}`,
        conversationalExplanation: `The step ID "${step.id}" (step ${stepNumber}) is already used by another step. Each step must have a unique ID within the workflow.`,
        suggestedFix: `Change the ID to something unique (e.g., "${step.id}2", "${step.id}Alternative", or a different descriptive name)`,
        documentationLink: '/docs/workflow-step-ids'
      });
    } else {
      stepIds.add(step.id);
    }
  });

  return errors;
}

/**
 * Validate all step references (onSuccessGoTo/onFailureGoTo)
 * 
 * Checks:
 * - Referenced step IDs exist
 * - No dangling references
 * 
 * @param steps - Array of workflow steps
 * @returns Array of validation errors
 */
export function validateStepReferences(steps: WorkflowStep[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const stepIds = getAllStepIds(steps);

  traverseWorkflow(steps, (step, path) => {
    const stepNumber = path.map(i => i + 1).join('.');

    // Validate onSuccessGoTo reference
    if (step.onSuccessGoTo && !stepIds.has(step.onSuccessGoTo)) {
      errors.push({
        id: generateErrorId(),
        severity: 'error',
        stepId: step.id,
        fieldPath: 'onSuccessGoTo',
        technicalMessage: `Invalid reference in step ${stepNumber} ("${step.id}"): onSuccessGoTo points to non-existent step "${step.onSuccessGoTo}"`,
        conversationalExplanation: `In step ${stepNumber} ("${step.id}"), the success path references a step "${step.onSuccessGoTo}" that doesn't exist in the workflow.`,
        suggestedFix: `Either create a step with ID "${step.onSuccessGoTo}" or change the reference to an existing step ID`,
        documentationLink: '/docs/workflow-step-references'
      });
    }

    // Validate onFailureGoTo reference
    if (step.onFailureGoTo && !stepIds.has(step.onFailureGoTo)) {
      errors.push({
        id: generateErrorId(),
        severity: 'error',
        stepId: step.id,
        fieldPath: 'onFailureGoTo',
        technicalMessage: `Invalid reference in step ${stepNumber} ("${step.id}"): onFailureGoTo points to non-existent step "${step.onFailureGoTo}"`,
        conversationalExplanation: `In step ${stepNumber} ("${step.id}"), the failure path references a step "${step.onFailureGoTo}" that doesn't exist in the workflow.`,
        suggestedFix: `Either create a step with ID "${step.onFailureGoTo}" or change the reference to an existing step ID`,
        documentationLink: '/docs/workflow-step-references'
      });
    }
  });

  return errors;
}

/**
 * Validate workflow structure
 * 
 * Checks:
 * - At least one trigger step exists
 * - At least one end step exists
 * - No orphaned steps (unreachable steps)
 * 
 * @param steps - Array of workflow steps
 * @returns Array of validation errors
 */
export function validateWorkflowStructure(steps: WorkflowStep[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (steps.length === 0) {
    errors.push({
      id: generateErrorId(),
      severity: 'error',
      technicalMessage: 'Workflow has no steps',
      conversationalExplanation: 'The workflow is empty. You need to add at least one step to create a valid workflow.',
      suggestedFix: 'Add a trigger step to start the workflow',
      documentationLink: '/docs/workflow-structure'
    });
    return errors;
  }

  // Count step types
  let triggerCount = 0;
  let endCount = 0;

  traverseWorkflow(steps, (step) => {
    if (step.type === 'trigger') triggerCount++;
    if (step.type === 'end') endCount++;
  });

  // Validate trigger steps
  if (triggerCount === 0) {
    errors.push({
      id: generateErrorId(),
      severity: 'error',
      technicalMessage: 'Workflow has no trigger step',
      conversationalExplanation: 'Every workflow needs at least one trigger step to define when the workflow starts.',
      suggestedFix: 'Add a trigger step at the beginning of the workflow',
      documentationLink: '/docs/workflow-triggers'
    });
  }

  // Validate end steps
  if (endCount === 0) {
    errors.push({
      id: generateErrorId(),
      severity: 'warning',
      technicalMessage: 'Workflow has no explicit end step',
      conversationalExplanation: 'It\'s recommended to have at least one end step to explicitly mark where the workflow completes.',
      suggestedFix: 'Add an end step to mark the completion of the workflow',
      documentationLink: '/docs/workflow-structure'
    });
  }

  return errors;
}

/**
 * Validate complete workflow
 * 
 * Runs all validation checks and returns combined results
 * 
 * @param steps - Array of workflow steps
 * @returns Array of validation errors
 */
export function validateWorkflow(steps: WorkflowStep[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Run all validations
  errors.push(...validateStepIds(steps));
  errors.push(...validateStepReferences(steps));
  errors.push(...validateWorkflowStructure(steps));

  return errors;
}

/**
 * Check if workflow has real steps (not just trigger/end)
 * 
 * Used for auto-save validation
 * 
 * @param steps - Array of workflow steps
 * @returns True if workflow has at least one real step
 */
export function hasRealSteps(steps: WorkflowStep[]): boolean {
  return hasRealStepsUtil(steps);
}

/**
 * Check if step name is valid (not a placeholder)
 * 
 * @param name - Step name to validate
 * @returns True if name is valid
 */
export function isValidStepName(name: string): boolean {
  const trimmed = name.trim().toLowerCase();
  const placeholders = ['new', 'create', 'untitled', 'step', 'action', 'condition'];
  return trimmed.length > 0 && !placeholders.includes(trimmed);
}

/**
 * Validate workflow for auto-save
 * 
 * Checks if workflow meets minimum requirements for auto-save:
 * - Has at least one real step (not just trigger/end)
 * - All steps have valid names (not placeholders)
 * 
 * @param steps - Array of workflow steps
 * @returns Object with validation result and reasons
 */
export function validateForAutoSave(steps: WorkflowStep[]): {
  shouldSave: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check for real steps
  if (!hasRealSteps(steps)) {
    reasons.push('Workflow has no real steps (only trigger/end steps)');
  }

  // Check step names
  traverseWorkflow(steps, (step) => {
    if (!isValidStepName(step.name)) {
      reasons.push(`Step "${step.id}" has placeholder name "${step.name}"`);
    }
  });

  return {
    shouldSave: reasons.length === 0,
    reasons
  };
}

/**
 * Detect circular references in step references
 * 
 * @param steps - Array of workflow steps
 * @returns Array of validation errors for circular references
 */
export function detectCircularReferences(steps: WorkflowStep[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const stepIds = getAllStepIds(steps);

  function visit(stepId: string, path: string[]): void {
    if (recursionStack.has(stepId)) {
      // Found a cycle
      const cyclePath = [...path, stepId];
      errors.push({
        id: generateErrorId(),
        severity: 'error',
        stepId,
        technicalMessage: `Circular reference detected: ${cyclePath.join(' → ')}`,
        conversationalExplanation: `I found a circular reference where steps reference each other in a loop: ${cyclePath.join(' → ')}. This would cause the workflow to run indefinitely.`,
        suggestedFix: 'Remove one of the references in the cycle to break the loop',
        documentationLink: '/docs/workflow-validation'
      });
      return;
    }

    if (visited.has(stepId)) {
      return;
    }

    visited.add(stepId);
    recursionStack.add(stepId);

    // Find the step and check its references
    traverseWorkflow(steps, (step) => {
      if (step.id === stepId) {
        if (step.onSuccessGoTo && stepIds.has(step.onSuccessGoTo)) {
          visit(step.onSuccessGoTo, [...path, stepId]);
        }
        if (step.onFailureGoTo && stepIds.has(step.onFailureGoTo)) {
          visit(step.onFailureGoTo, [...path, stepId]);
        }
      }
    });

    recursionStack.delete(stepId);
  }

  // Check all steps for circular references
  stepIds.forEach(stepId => {
    if (!visited.has(stepId)) {
      visit(stepId, []);
    }
  });

  return errors;
}
