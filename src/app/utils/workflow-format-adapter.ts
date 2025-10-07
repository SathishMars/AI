// src/app/utils/workflow-format-adapter.ts
/**
 * Workflow Format Adapter
 * 
 * Temporary utility to convert between old and new workflow formats.
 * This allows the new UI to work with existing data without requiring
 * immediate database migration.
 * 
 * OLD FORMAT (Numbered Object Keys):
 * {
 *   steps: {
 *     "1": { name: "Start", nextSteps: ["1.1"] },
 *     "1.1": { name: "Check", onSuccess: "1.1.1" }
 *   }
 * }
 * 
 * NEW FORMAT (Nested Arrays with Human-Readable IDs):
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
 */

import { WorkflowStep, WorkflowJSON } from '@/app/types/workflow';

/**
 * Legacy workflow step format (old numbered object key structure)
 */
interface LegacyWorkflowStep {
  name: string;
  type: 'trigger' | 'condition' | 'action' | 'end' | 'branch' | 'merge' | 'workflow';
  action?: string;
  params?: Record<string, unknown>;
  condition?: unknown;
  nextSteps?: string[];
  onSuccess?: string;
  onFailure?: string;
  onApproval?: string;
  onReject?: string;
  onYes?: string;
  onNo?: string;
  result?: 'success' | 'failure' | 'cancelled' | 'timeout';
}

interface LegacyWorkflowFormat {
  steps: Record<string, LegacyWorkflowStep>;
  [key: string]: unknown;
}

/**
 * Check if workflow uses old numbered object key format
 */
export function isLegacyFormat(workflow: unknown): boolean {
  if (!workflow || typeof workflow !== 'object') {
    return false;
  }

  const w = workflow as Record<string, unknown>;
  
  // Check if steps is an object (not array) with numbered keys
  if (w.steps && typeof w.steps === 'object' && !Array.isArray(w.steps)) {
    const keys = Object.keys(w.steps);
    // If any key is a number or dotted number (1, 1.1, 1.1.1), it's legacy format
    return keys.some(key => /^[0-9]+(\.[0-9]+)*$/.test(key));
  }

  return false;
}

/**
 * Generate a human-readable step ID from step data
 * 
 * Pattern: {verb}{Object} in camelCase
 * Examples: "startWorkflow", "checkBudget", "sendEmail"
 */
function generateStepId(
  step: LegacyWorkflowStep,
  stepKey: string,
  existingIds: Set<string>
): string {
  // Extract action verb and object from step name
  const name = step.name || '';
  
  // Try to extract from name pattern "Action: Do Something"
  const match = name.match(/^(Start|Check|Action|End|Branch|Merge):\s*(.+)$/i);
  
  let baseId = '';
  
  if (match) {
    const verb = match[1].toLowerCase();
    const object = match[2]
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
      .split(/\s+/)
      .map((word, index) => 
        index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
    
    baseId = verb + object.charAt(0).toUpperCase() + object.slice(1);
  } else {
    // Fallback: use name directly
    baseId = name
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word, index) => 
        index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }
  
  // If baseId is empty or invalid, use step type
  if (!baseId || baseId.length < 3) {
    baseId = `${step.type}Step${stepKey.replace(/\./g, '_')}`;
  }
  
  // Ensure uniqueness
  let finalId = baseId;
  let counter = 1;
  while (existingIds.has(finalId)) {
    finalId = `${baseId}${counter}`;
    counter++;
  }
  
  existingIds.add(finalId);
  return finalId;
}

/**
 * Convert legacy workflow format to nested array format
 * 
 * @param legacyWorkflow - Workflow in old numbered object key format
 * @returns Workflow in new nested array format
 */
export function convertLegacyToNestedArray(legacyWorkflow: LegacyWorkflowFormat): WorkflowStep[] {
  const legacySteps = legacyWorkflow.steps;
  const existingIds = new Set<string>();
  
  // Map old keys to new IDs
  const keyToIdMap = new Map<string, string>();
  
  // First pass: Generate IDs for all steps
  Object.entries(legacySteps).forEach(([key, step]) => {
    const id = generateStepId(step, key, existingIds);
    keyToIdMap.set(key, id);
  });
  
  // Find root steps (steps not referenced by any other step)
  const referencedKeys = new Set<string>();
  
  Object.entries(legacySteps).forEach(([, step]) => {
    if (step.nextSteps) {
      step.nextSteps.forEach(nextKey => referencedKeys.add(nextKey));
    }
    if (step.onSuccess) referencedKeys.add(step.onSuccess);
    if (step.onFailure) referencedKeys.add(step.onFailure);
    if (step.onApproval) referencedKeys.add(step.onApproval);
    if (step.onReject) referencedKeys.add(step.onReject);
    if (step.onYes) referencedKeys.add(step.onYes);
    if (step.onNo) referencedKeys.add(step.onNo);
  });
  
  const rootKeys = Object.keys(legacySteps)
    .filter(key => !referencedKeys.has(key))
    .sort((a, b) => {
      // Sort by number (1, 2, 3, etc.)
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      return aNum - bNum;
    });
  
  // Track processed steps to avoid infinite loops
  const processedKeys = new Set<string>();
  
  /**
   * Recursively convert a legacy step to new format
   */
  function convertStep(key: string): WorkflowStep | null {
    // Avoid infinite loops
    if (processedKeys.has(key)) {
      return null;
    }
    processedKeys.add(key);
    
    const legacyStep = legacySteps[key];
    if (!legacyStep) {
      return null;
    }
    
    const newStep: WorkflowStep = {
      id: keyToIdMap.get(key) || key,
      name: legacyStep.name,
      type: legacyStep.type,
    };
    
    // Add optional fields
    if (legacyStep.action) newStep.action = legacyStep.action;
    if (legacyStep.params) newStep.params = legacyStep.params;
    if (legacyStep.condition) newStep.condition = legacyStep.condition as WorkflowStep['condition'];
    if (legacyStep.result) newStep.result = legacyStep.result;
    
    // Convert children (nextSteps array)
    if (legacyStep.nextSteps && legacyStep.nextSteps.length > 0) {
      const children: WorkflowStep[] = [];
      
      legacyStep.nextSteps.forEach(nextKey => {
        const child = convertStep(nextKey);
        if (child) {
          children.push(child);
        }
      });
      
      if (children.length > 0) {
        newStep.children = children;
      }
    }
    
    // Convert conditional paths to references (not inline steps)
    // Use onSuccessGoTo/onFailureGoTo for references
    if (legacyStep.onSuccess && !processedKeys.has(legacyStep.onSuccess)) {
      const successId = keyToIdMap.get(legacyStep.onSuccess);
      if (successId) {
        newStep.onSuccessGoTo = successId;
      }
    }
    
    if (legacyStep.onFailure && !processedKeys.has(legacyStep.onFailure)) {
      const failureId = keyToIdMap.get(legacyStep.onFailure);
      if (failureId) {
        newStep.onFailureGoTo = failureId;
      }
    }
    
    // Handle other conditional paths (approval workflow paths)
    if (legacyStep.onApproval && !processedKeys.has(legacyStep.onApproval)) {
      const approvalId = keyToIdMap.get(legacyStep.onApproval);
      if (approvalId) {
        // Store as success path for now
        newStep.onSuccessGoTo = approvalId;
      }
    }
    
    if (legacyStep.onReject && !processedKeys.has(legacyStep.onReject)) {
      const rejectId = keyToIdMap.get(legacyStep.onReject);
      if (rejectId) {
        // Store as failure path for now
        newStep.onFailureGoTo = rejectId;
      }
    }
    
    return newStep;
  }
  
  // Convert all root steps
  const newSteps: WorkflowStep[] = [];
  
  rootKeys.forEach(rootKey => {
    const step = convertStep(rootKey);
    if (step) {
      newSteps.push(step);
    }
  });
  
  // If no root steps found (shouldn't happen), convert all steps
  if (newSteps.length === 0) {
    Object.keys(legacySteps).forEach(key => {
      if (!processedKeys.has(key)) {
        const step = convertStep(key);
        if (step) {
          newSteps.push(step);
        }
      }
    });
  }
  
  return newSteps;
}

/**
 * Flatten nested array back to numbered object keys (for backward compatibility)
 * 
 * NOTE: This is for backward compatibility only. New workflows should use nested arrays.
 * 
 * @param steps - Workflow steps in nested array format
 * @returns Workflow in old numbered object key format
 */
export function convertNestedArrayToLegacy(steps: WorkflowStep[]): Record<string, LegacyWorkflowStep> {
  const legacySteps: Record<string, LegacyWorkflowStep> = {};
  let counter = 1;
  
  // Map step IDs to numbered keys
  const idToKeyMap = new Map<string, string>();
  
  /**
   * Recursively convert steps to legacy format
   */
  function convertToLegacy(step: WorkflowStep, parentKey?: string, childIndex?: number): string {
    // Generate numbered key
    let key: string;
    if (parentKey && childIndex !== undefined) {
      key = `${parentKey}.${childIndex + 1}`;
    } else {
      key = `${counter}`;
      counter++;
    }
    
    idToKeyMap.set(step.id, key);
    
    const legacyStep: LegacyWorkflowStep = {
      name: step.name,
      type: step.type,
    };
    
    // Add optional fields
    if (step.action) legacyStep.action = step.action;
    if (step.params) legacyStep.params = step.params;
    if (step.condition) legacyStep.condition = step.condition;
    if (step.result) legacyStep.result = step.result;
    
    // Convert children
    if (step.children && step.children.length > 0) {
      legacyStep.nextSteps = [];
      step.children.forEach((child, index) => {
        const childKey = convertToLegacy(child, key, index);
        legacyStep.nextSteps!.push(childKey);
      });
    }
    
    // Store step
    legacySteps[key] = legacyStep;
    
    return key;
  }
  
  // Convert all root steps
  steps.forEach(step => {
    convertToLegacy(step);
  });
  
  // Second pass: Convert step references
  steps.forEach(step => {
    const key = idToKeyMap.get(step.id);
    if (key && legacySteps[key]) {
      if (step.onSuccessGoTo) {
        const successKey = idToKeyMap.get(step.onSuccessGoTo);
        if (successKey) {
          legacySteps[key].onSuccess = successKey;
        }
      }
      if (step.onFailureGoTo) {
        const failureKey = idToKeyMap.get(step.onFailureGoTo);
        if (failureKey) {
          legacySteps[key].onFailure = failureKey;
        }
      }
    }
  });
  
  return legacySteps;
}

/**
 * Detect and convert workflow to new format if needed
 * 
 * @param workflow - Workflow in any format
 * @returns Workflow steps in nested array format
 */
export function ensureNestedArrayFormat(workflow: WorkflowJSON | LegacyWorkflowFormat): WorkflowStep[] {
  // If already in nested array format, return as-is
  if (Array.isArray((workflow as WorkflowJSON).steps)) {
    return (workflow as WorkflowJSON).steps as WorkflowStep[];
  }
  
  // If in legacy format, convert
  if (isLegacyFormat(workflow)) {
    return convertLegacyToNestedArray(workflow as LegacyWorkflowFormat);
  }
  
  // Fallback: empty array
  console.warn('Unknown workflow format, returning empty array');
  return [];
}
