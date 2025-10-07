// src/app/utils/workflow-format-adapter.ts
/**
 * Workflow Format Utilities
 * 
 * Utilities for working with workflow nested array format.
 * 
 * WORKFLOW FORMAT (Nested Arrays with Human-Readable IDs):
 * {
 *   steps: [
 *     {
 *       id: "startWorkflow",
 *       name: "Start",
 *       children: [
 *         { id: "checkCondition", name: "Check", onSuccessGoTo: "executeAction" }
 *       ]
 *     }
 *   ]
 * }
 * 
 * See: ai-implementation-summaries/workflow-template-architecture-complete.md
 */

import { WorkflowStep, WorkflowJSON } from '@/app/types/workflow';

/**
 * Validate that workflow is in correct nested array format
 */
export function isValidNestedFormat(workflow: unknown): boolean {
  if (!workflow || typeof workflow !== 'object') {
    return false;
  }

  const w = workflow as Record<string, unknown>;
  
  // Must have steps as an array
  return !!(w.steps && Array.isArray(w.steps));
}

/**
 * Ensure workflow steps are in nested array format
 * 
 * @param workflow - Workflow with steps as array
 * @returns Workflow steps in nested array format
 */
export function ensureNestedArrayFormat(workflow: WorkflowJSON): WorkflowStep[] {
  // Workflow steps must be an array
  if (!Array.isArray(workflow.steps)) {
    console.error('Invalid workflow format: steps must be an array', workflow);
    return [];
  }
  
  return workflow.steps as WorkflowStep[];
}

/**
 * Validate workflow structure
 * 
 * @param workflow - Workflow to validate
 * @returns True if valid, false otherwise
 */
export function validateWorkflowStructure(workflow: WorkflowJSON): boolean {
  // Check steps is an array
  if (!Array.isArray(workflow.steps)) {
    console.error('Invalid workflow: steps must be an array');
    return false;
  }
  
  // Check each step has required fields
  const validateStep = (step: WorkflowStep): boolean => {
    if (!step.id || !step.name || !step.type) {
      console.error('Invalid step: missing required fields (id, name, type)', step);
      return false;
    }
    
    // Validate ID format (camelCase)
    if (!/^[a-z][a-zA-Z0-9]*$/.test(step.id)) {
      console.error(`Invalid step ID format: "${step.id}" (must be camelCase)`, step);
      return false;
    }
    
    // Recursively validate children
    if (step.children) {
      if (!Array.isArray(step.children)) {
        console.error('Invalid step: children must be an array', step);
        return false;
      }
      for (const child of step.children) {
        if (!validateStep(child)) {
          return false;
        }
      }
    }
    
    // Validate inline branches
    if (step.onSuccess && typeof step.onSuccess === 'object') {
      if (!validateStep(step.onSuccess)) {
        return false;
      }
    }
    
    if (step.onFailure && typeof step.onFailure === 'object') {
      if (!validateStep(step.onFailure)) {
        return false;
      }
    }
    
    return true;
  };
  
  // Validate all root steps
  for (const step of workflow.steps) {
    if (!validateStep(step)) {
      return false;
    }
  }
  
  return true;
}

/*
 * NOTE: All legacy format conversion functions have been removed.
 * Workflows must now be stored and used in nested array format only.
 * See: ai-implementation-summaries/workflow-template-architecture-complete.md
 */
