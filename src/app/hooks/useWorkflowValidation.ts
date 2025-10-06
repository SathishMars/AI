// src/app/hooks/useWorkflowValidation.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { WorkflowStep, ValidationError } from '@/app/types/workflow';
import {
  validateStepIds,
  validateStepReferences,
  validateWorkflowStructure,
  detectCircularReferences
} from '@/app/utils/workflow-validation';

/**
 * Validation state returned by the hook
 */
export interface WorkflowValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  errorsByStep: Map<string, ValidationError[]>;
  errorsByType: {
    stepIds: ValidationError[];
    references: ValidationError[];
    structure: ValidationError[];
    circular: ValidationError[];
  };
}

/**
 * Hook options
 */
export interface UseWorkflowValidationOptions {
  /**
   * Enable auto-validation on step changes
   * @default true
   */
  autoValidate?: boolean;
  
  /**
   * Debounce delay in milliseconds
   * @default 500
   */
  debounceMs?: number;
  
  /**
   * Callback when validation completes
   */
  onValidationComplete?: (state: WorkflowValidationState) => void;
}

/**
 * Return type for useWorkflowValidation hook
 */
export interface UseWorkflowValidationReturn extends WorkflowValidationState {
  /**
   * Manually trigger validation
   */
  validate: (steps: WorkflowStep[]) => void;
  
  /**
   * Clear all validation errors
   */
  clearValidation: () => void;
  
  /**
   * Get validation errors for a specific step
   */
  getStepErrors: (stepId: string) => ValidationError[];
  
  /**
   * Check if a specific step has errors
   */
  hasStepErrors: (stepId: string) => boolean;
  
  /**
   * Get all error messages as strings
   */
  getErrorMessages: () => string[];
  
  /**
   * Get all user-friendly error explanations
   */
  getUserFriendlyErrors: () => string[];
}

/**
 * Custom hook for real-time workflow validation
 * 
 * @example
 * ```tsx
 * const { isValid, errors, validate, getStepErrors } = useWorkflowValidation();
 * 
 * // Validate workflow steps
 * useEffect(() => {
 *   validate(workflow.steps);
 * }, [workflow.steps]);
 * 
 * // Check if specific step has errors
 * const stepErrors = getStepErrors('checkBudget');
 * ```
 */
export function useWorkflowValidation(
  options: UseWorkflowValidationOptions = {}
): UseWorkflowValidationReturn {
  const {
    autoValidate = true,
    debounceMs = 500,
    onValidationComplete
  } = options;

  // Validation state
  const [validationState, setValidationState] = useState<WorkflowValidationState>({
    isValid: true,
    errors: [],
    warnings: [],
    errorsByStep: new Map(),
    errorsByType: {
      stepIds: [],
      references: [],
      structure: [],
      circular: []
    }
  });

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStepsRef = useRef<string>('');

  /**
   * Group errors by step ID
   */
  const groupErrorsByStep = useCallback((errors: ValidationError[]): Map<string, ValidationError[]> => {
    const grouped = new Map<string, ValidationError[]>();
    
    errors.forEach(error => {
      const stepId = error.stepId || 'unknown';
      const existing = grouped.get(stepId) || [];
      grouped.set(stepId, [...existing, error]);
    });
    
    return grouped;
  }, []);

  /**
   * Perform validation on workflow steps
   */
  const performValidation = useCallback((steps: WorkflowStep[]) => {
    // Run all validation utilities from Phase 1
    const stepIdErrors = validateStepIds(steps);
    const referenceErrors = validateStepReferences(steps);
    const structureErrors = validateWorkflowStructure(steps);
    const circularErrors = detectCircularReferences(steps);

    // Combine all errors
    const allErrors = [
      ...stepIdErrors,
      ...referenceErrors,
      ...structureErrors,
      ...circularErrors
    ];

    // Separate errors from warnings (based on severity)
    const errors = allErrors.filter(e => e.severity === 'error');
    const warnings = allErrors.filter(e => e.severity === 'warning' || e.severity === 'info');

    // Group errors by step and type
    const errorsByStep = groupErrorsByStep(errors);
    const errorsByType = {
      stepIds: stepIdErrors,
      references: referenceErrors,
      structure: structureErrors,
      circular: circularErrors
    };

    // Create new validation state
    const newState: WorkflowValidationState = {
      isValid: errors.length === 0,
      errors,
      warnings,
      errorsByStep,
      errorsByType
    };

    setValidationState(newState);

    // Call completion callback if provided
    if (onValidationComplete) {
      onValidationComplete(newState);
    }

    return newState;
  }, [groupErrorsByStep, onValidationComplete]);

  /**
   * Validate with debouncing
   */
  const validate = useCallback((steps: WorkflowStep[]) => {
    // Skip validation if steps haven't changed (performance optimization)
    const stepsString = JSON.stringify(steps);
    if (stepsString === lastStepsRef.current && !autoValidate) {
      return;
    }
    lastStepsRef.current = stepsString;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce validation
    debounceTimerRef.current = setTimeout(() => {
      performValidation(steps);
    }, debounceMs);
  }, [performValidation, debounceMs, autoValidate]);

  /**
   * Clear all validation errors
   */
  const clearValidation = useCallback(() => {
    setValidationState({
      isValid: true,
      errors: [],
      warnings: [],
      errorsByStep: new Map(),
      errorsByType: {
        stepIds: [],
        references: [],
        structure: [],
        circular: []
      }
    });
    
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    lastStepsRef.current = '';
  }, []);

  /**
   * Get errors for a specific step
   */
  const getStepErrors = useCallback((stepId: string): ValidationError[] => {
    return validationState.errorsByStep.get(stepId) || [];
  }, [validationState.errorsByStep]);

  /**
   * Check if a specific step has errors
   */
  const hasStepErrors = useCallback((stepId: string): boolean => {
    return getStepErrors(stepId).length > 0;
  }, [getStepErrors]);

  /**
   * Get all error messages as strings (technical)
   */
  const getErrorMessages = useCallback((): string[] => {
    return validationState.errors.map(e => e.technicalMessage);
  }, [validationState.errors]);

  /**
   * Get all user-friendly error explanations
   */
  const getUserFriendlyErrors = useCallback((): string[] => {
    return validationState.errors.map(e => e.conversationalExplanation);
  }, [validationState.errors]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...validationState,
    validate,
    clearValidation,
    getStepErrors,
    hasStepErrors,
    getErrorMessages,
    getUserFriendlyErrors
  };
}
