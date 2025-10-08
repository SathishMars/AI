// src/app/utils/workflow-navigation.ts
/**
 * Workflow Navigation Utilities
 * 
 * Utilities for navigating and manipulating nested array workflow structures
 * with human-readable step IDs.
 * 
 * Architecture: Nested Arrays with Human-Readable IDs
 * - Steps stored as nested arrays (not numbered object keys)
 * - Each step has a human-readable ID (e.g., "checkBudget", "sendEmail")
 * - UI numbering (1, 1.1, 1.1.1) generated dynamically from array indices
 */

import { WorkflowStep } from '@/app/types/workflow';

/**
 * Result of finding a step by ID
 */
export interface StepSearchResult {
  step: WorkflowStep;
  path: number[]; // Array indices path to the step
}

/**
 * Find a step by its ID within a workflow
 * 
 * @param steps - Array of workflow steps to search
 * @param targetId - Human-readable step ID to find
 * @param currentPath - Current path in the tree (for recursion)
 * @returns Step and its path, or null if not found
 * 
 * @example
 * const result = findStepById(workflow.steps, "checkBudget");
 * if (result) {
 *   console.log(`Found step at path: ${result.path.join('.')}`);
 *   console.log(`Display number: ${generateStepNumber(result.path)}`);
 * }
 */
export function findStepById(
  steps: WorkflowStep[],
  targetId: string,
  currentPath: number[] = []
): StepSearchResult | null {
  // Defensive check: ensure steps is an array before iterating
  if (!Array.isArray(steps)) {
    console.warn('findStepById: steps is not an array, received:', typeof steps, steps);
    return null;
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const path = [...currentPath, i];

    // Check if this is the target step
    if (step.id === targetId) {
      return { step, path };
    }

    // Search in children
    if (step.children && Array.isArray(step.children) && step.children.length > 0) {
      const found = findStepById(step.children, targetId, path);
      if (found) return found;
    }

    // Search in conditional inline steps
    if (step.onSuccess && typeof step.onSuccess === 'object') {
      const found = findStepById([step.onSuccess], targetId, path);
      if (found) return found;
    }

    if (step.onFailure && typeof step.onFailure === 'object') {
      const found = findStepById([step.onFailure], targetId, path);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Generate display number from array path
 * 
 * Converts array indices to tree-based numbering for UI display.
 * This numbering is NOT stored in the database.
 * 
 * @param path - Array of indices representing the path to a step
 * @returns Display number string (e.g., "1", "1.3", "2.1.4")
 * 
 * @example
 * generateStepNumber([0]); // "1"
 * generateStepNumber([0, 2]); // "1.3"
 * generateStepNumber([1, 0, 3]); // "2.1.4"
 */
export function generateStepNumber(path: number[]): string {
  return path.map(i => i + 1).join('.');
}

/**
 * Traverse all steps in workflow with callback
 * 
 * Visits every step in the workflow tree and calls the callback function.
 * Useful for validation, transformation, or collecting information.
 * 
 * @param steps - Array of workflow steps
 * @param callback - Function to call for each step
 * @param currentPath - Current path in the tree (for recursion)
 * 
 * @example
 * // Collect all step IDs
 * const stepIds: string[] = [];
 * traverseWorkflow(workflow.steps, (step) => {
 *   stepIds.push(step.id);
 * });
 * 
 * @example
 * // Find all condition steps
 * const conditions: WorkflowStep[] = [];
 * traverseWorkflow(workflow.steps, (step) => {
 *   if (step.type === 'condition') {
 *     conditions.push(step);
 *   }
 * });
 */
export function traverseWorkflow(
  steps: WorkflowStep[],
  callback: (step: WorkflowStep, path: number[]) => void,
  currentPath: number[] = []
): void {
  // Defensive check: ensure steps is an array before iterating
  if (!Array.isArray(steps)) {
    console.warn('traverseWorkflow: steps is not an array, received:', typeof steps, steps);
    return;
  }

  steps.forEach((step, index) => {
    const path = [...currentPath, index];
    callback(step, path);

    // Traverse children
    if (step.children && Array.isArray(step.children) && step.children.length > 0) {
      traverseWorkflow(step.children, callback, path);
    }

    // Traverse conditional inline steps
    if (step.onSuccess && typeof step.onSuccess === 'object') {
      traverseWorkflow([step.onSuccess], callback, path);
    }

    if (step.onFailure && typeof step.onFailure === 'object') {
      traverseWorkflow([step.onFailure], callback, path);
    }
  });
}

/**
 * Get all step IDs in a workflow
 * 
 * @param steps - Array of workflow steps
 * @returns Set of all step IDs
 */
export function getAllStepIds(steps: WorkflowStep[]): Set<string> {
  const stepIds = new Set<string>();
  traverseWorkflow(steps, (step) => {
    stepIds.add(step.id);
  });
  return stepIds;
}

/**
 * Get all step references (onSuccessGoTo/onFailureGoTo) in a workflow
 * 
 * @param steps - Array of workflow steps
 * @returns Set of all referenced step IDs
 */
export function getAllStepReferences(steps: WorkflowStep[]): Set<string> {
  const references = new Set<string>();
  traverseWorkflow(steps, (step) => {
    if (step.onSuccessGoTo) {
      references.add(step.onSuccessGoTo);
    }
    if (step.onFailureGoTo) {
      references.add(step.onFailureGoTo);
    }
    if (step.onApproval) {
      references.add(step.onApproval);
    }
    if (step.onReject) {
      references.add(step.onReject);
    }
    if (step.onYes) {
      references.add(step.onYes);
    }
    if (step.onNo) {
      references.add(step.onNo);
    }
  });
  return references;
}

/**
 * Get the parent step of a given step
 * 
 * @param steps - Array of workflow steps
 * @param targetId - Step ID to find parent for
 * @returns Parent step and path, or null if not found or is root
 */
export function getParentStep(
  steps: WorkflowStep[],
  targetId: string
): StepSearchResult | null {
  let parentResult: StepSearchResult | null = null;

  traverseWorkflow(steps, (step, path) => {
    // Check if targetId is in children
    if (step.children) {
      const childIndex = step.children.findIndex(child => child.id === targetId);
      if (childIndex >= 0) {
        parentResult = { step, path };
      }
    }

    // Check if targetId is in conditional steps
    if (step.onSuccess && typeof step.onSuccess === 'object' && step.onSuccess.id === targetId) {
      parentResult = { step, path };
    }

    if (step.onFailure && typeof step.onFailure === 'object' && step.onFailure.id === targetId) {
      parentResult = { step, path };
    }
  });

  return parentResult;
}

/**
 * Get the depth level of a step in the workflow tree
 * 
 * @param steps - Array of workflow steps
 * @param targetId - Step ID to get depth for
 * @returns Depth level (0 for root, 1 for first child, etc.) or -1 if not found
 */
export function getStepDepth(steps: WorkflowStep[], targetId: string): number {
  const result = findStepById(steps, targetId);
  return result ? result.path.length - 1 : -1;
}

/**
 * Check if a step is a leaf node (has no children)
 * 
 * @param step - Step to check
 * @returns True if step has no children, false otherwise
 */
export function isLeafNode(step: WorkflowStep): boolean {
  return (
    (!step.children || step.children.length === 0) &&
    !step.onSuccess &&
    !step.onFailure
  );
}

/**
 * Get all leaf nodes in a workflow
 * 
 * @param steps - Array of workflow steps
 * @returns Array of leaf steps with their paths
 */
export function getLeafNodes(steps: WorkflowStep[]): StepSearchResult[] {
  const leafNodes: StepSearchResult[] = [];
  traverseWorkflow(steps, (step, path) => {
    if (isLeafNode(step)) {
      leafNodes.push({ step, path });
    }
  });
  return leafNodes;
}

/**
 * Count total number of steps in a workflow
 * 
 * @param steps - Array of workflow steps
 * @returns Total number of steps
 */
export function countSteps(steps: WorkflowStep[]): number {
  let count = 0;
  traverseWorkflow(steps, () => {
    count++;
  });
  return count;
}

/**
 * Get all steps of a specific type
 * 
 * @param steps - Array of workflow steps
 * @param type - Step type to filter by
 * @returns Array of steps matching the type with their paths
 */
export function getStepsByType(
  steps: WorkflowStep[],
  type: WorkflowStep['type']
): StepSearchResult[] {
  const matchingSteps: StepSearchResult[] = [];
  traverseWorkflow(steps, (step, path) => {
    if (step.type === type) {
      matchingSteps.push({ step, path });
    }
  });
  return matchingSteps;
}

/**
 * Check if workflow has any "real" steps (not just trigger and end)
 * 
 * Used for auto-save validation
 * 
 * @param steps - Array of workflow steps
 * @returns True if workflow has at least one real step
 */
export function hasRealSteps(steps: WorkflowStep[]): boolean {
  let hasReal = false;
  traverseWorkflow(steps, (step) => {
    if (step.type !== 'trigger' && step.type !== 'end') {
      hasReal = true;
    }
  });
  return hasReal;
}
