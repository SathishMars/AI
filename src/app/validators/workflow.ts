// src/app/validators/workflow.ts
import {
  WorkflowJSONSchema,
  WorkflowJSON,
  WorkflowStep,
  ValidationError,
  ValidationResult,
  FunctionsLibrary,
  CURRENT_SCHEMA_VERSION,
  COMPATIBLE_VERSIONS
} from '@/app/types/workflow';

// Import new nested array validation utilities
import {
  validateStepIds,
  validateStepReferences,
  validateWorkflowStructure,
  detectCircularReferences as detectCircularReferencesNested
} from '@/app/utils/workflow-validation';
import { traverseWorkflow } from '@/app/utils/workflow-navigation';

// Generate unique error ID
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Schema version validation
export function validateSchemaVersion(version: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!COMPATIBLE_VERSIONS.includes(version)) {
    errors.push({
      id: generateErrorId(),
      severity: 'error',
      technicalMessage: `Unsupported schema version: ${version}`,
      conversationalExplanation: `I'm sorry, but this workflow uses schema version ${version} which is not compatible with the current system. The workflow needs to be updated to use a supported version.`,
      suggestedFix: `Update the workflow to use schema version ${CURRENT_SCHEMA_VERSION}`,
      documentationLink: '/docs/schema-migration'
    });
  }
  
  return errors;
}

// Circular dependency detection (supports both old and new structure)
export function detectCircularDependencies(workflow: WorkflowJSON): ValidationError[] {
  // Check if workflow uses new nested array structure
  if (Array.isArray(workflow.steps)) {
    return detectCircularReferencesNested(workflow.steps as WorkflowStep[]);
  }
  
  // Legacy support for old object structure
  const errors: ValidationError[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function hasCircularDependency(stepId: string, path: string[] = []): boolean {
    if (recursionStack.has(stepId)) {
      const circularPath = [...path, stepId];
      errors.push({
        id: generateErrorId(),
        severity: 'error',
        stepId,
        technicalMessage: `Circular dependency detected: ${circularPath.join(' → ')}`,
        conversationalExplanation: `I found a circular reference in your workflow where steps reference each other in a loop: ${circularPath.join(' → ')}. This would cause the workflow to run indefinitely.`,
        suggestedFix: 'Remove the circular reference by changing one of the step connections',
        fieldPath: 'nextSteps'
      });
      return true;
    }
    
    if (visited.has(stepId)) {
      return false;
    }
    
    visited.add(stepId);
    recursionStack.add(stepId);
    
    const stepsRecord = workflow.steps as unknown as Record<string, WorkflowStep>;
    const step = stepsRecord[stepId];
    if (step) {
      const nextSteps: string[] = [];
      if (step.onSuccessGoTo) nextSteps.push(step.onSuccessGoTo);
      if (step.onFailureGoTo) nextSteps.push(step.onFailureGoTo);
      
      for (const nextStepId of nextSteps) {
        if (hasCircularDependency(nextStepId, [...path, stepId])) {
          return true;
        }
      }
    }
    
    recursionStack.delete(stepId);
    return false;
  }
  
  // Check all steps
  const stepsRecord = workflow.steps as unknown as Record<string, WorkflowStep>;
  Object.keys(stepsRecord).forEach(stepId => {
    if (!visited.has(stepId)) {
      hasCircularDependency(stepId);
    }
  });
  
  return errors;
}

// Function reference validation (supports both old and new structure)
export async function validateFunctionReferences(
  workflow: WorkflowJSON,
  functionsLibrary: FunctionsLibrary
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  // Handle new nested array structure
  if (Array.isArray(workflow.steps)) {
    traverseWorkflow(workflow.steps as WorkflowStep[], (step) => {
      validateStepFunctionReferences(step, functionsLibrary, errors);
    });
    return errors;
  }
  
  // Handle legacy object structure
  const stepsRecord = workflow.steps as unknown as Record<string, WorkflowStep>;
  Object.values(stepsRecord).forEach((step) => {
    validateStepFunctionReferences(step, functionsLibrary, errors);
  });
  
  return errors;
}

// Helper function to validate function references for a single step
function validateStepFunctionReferences(
  step: WorkflowStep,
  functionsLibrary: FunctionsLibrary,
  errors: ValidationError[]
): void {
  if (step.type === 'action' && step.action) {
    // Check if action references a function
    if (step.action.startsWith('functions.')) {
      const functionName = step.action.replace('functions.', '');
      const functionDef = functionsLibrary.functions[functionName];
      
      if (!functionDef) {
        errors.push({
          id: generateErrorId(),
          severity: 'error',
          stepId: step.id,
          fieldPath: 'action',
          technicalMessage: `Function not found: ${functionName}`,
          conversationalExplanation: `The function "${functionName}" used in step "${step.name}" is not available in the current functions library. This step won't be able to execute.`,
          suggestedFix: `Choose from available functions or check if the function name is spelled correctly`,
          documentationLink: '/docs/functions-library'
        });
      } else {
        // Validate function parameters if available
        if (step.params && functionDef.parameters) {
          const requiredParams = Object.keys(functionDef.parameters).filter(
            key => functionDef.parameters[key].required
          );
          
          for (const requiredParam of requiredParams) {
            if (!(requiredParam in step.params)) {
              errors.push({
                id: generateErrorId(),
                severity: 'error',
                stepId: step.id,
                fieldPath: `params.${requiredParam}`,
                technicalMessage: `Missing required parameter: ${requiredParam}`,
                conversationalExplanation: `The function "${functionName}" requires a parameter called "${requiredParam}" but it's missing from step "${step.name}".`,
                suggestedFix: `Add the required parameter "${requiredParam}" to the step parameters`,
                documentationLink: `/docs/functions/${functionName}`
              });
            }
          }
        }
      }
    }
  }
}

// Main workflow validation function
export async function validateWorkflow(
  workflow: unknown,
  functionsLibrary: FunctionsLibrary
): Promise<ValidationResult> {
  const allErrors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];
  
  try {
    // Schema validation
    const parseResult = WorkflowJSONSchema.safeParse(workflow);
    
    if (!parseResult.success) {
      parseResult.error.issues.forEach(zodError => {
        allErrors.push({
          id: generateErrorId(),
          severity: 'error',
          fieldPath: zodError.path.join('.'),
          technicalMessage: zodError.message,
          conversationalExplanation: `There's an issue with the workflow structure: ${zodError.message}. This needs to be fixed before the workflow can be saved.`,
          suggestedFix: 'Check the workflow structure and ensure all required fields are provided'
        });
      });
      
      return {
        isValid: false,
        errors: allErrors,
        warnings,
        info
      };
    }
    
    const validatedWorkflow = parseResult.data;
    
    // Schema version validation
    allErrors.push(...validateSchemaVersion(validatedWorkflow.schemaVersion));
    
    // Circular dependency detection
    allErrors.push(...detectCircularDependencies(validatedWorkflow));
    
    // Function reference validation
    allErrors.push(...await validateFunctionReferences(validatedWorkflow, functionsLibrary));
    
    // New nested array structure validations (if applicable)
    if (Array.isArray(validatedWorkflow.steps)) {
      const steps = validatedWorkflow.steps as WorkflowStep[];
      
      // Validate step IDs
      allErrors.push(...validateStepIds(steps));
      
      // Validate step references
      allErrors.push(...validateStepReferences(steps));
      
      // Validate workflow structure
      allErrors.push(...validateWorkflowStructure(steps));
    }
    
    // Additional validations can be added here
    
    // Categorize errors by severity
    allErrors.forEach(error => {
      if (error.severity === 'warning') {
        warnings.push(error);
      } else if (error.severity === 'info') {
        info.push(error);
      }
    });
    
    const errors = allErrors.filter(error => error.severity === 'error');
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
    
  } catch (error) {
    allErrors.push({
      id: generateErrorId(),
      severity: 'error',
      technicalMessage: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      conversationalExplanation: 'Something went wrong while validating your workflow. Please try again or contact support if the issue persists.',
      suggestedFix: 'Check the workflow format and try saving again'
    });
    
    return {
      isValid: false,
      errors: allErrors,
      warnings,
      info
    };
  }
}