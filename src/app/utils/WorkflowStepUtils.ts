import { validateWorkflowTemplate, WorkflowStep, WorkflowTemplate } from "../types/workflowTemplate";

// This function generated a record that maps the sped ids to their labels
export function getStepsLabelsMap(steps: Array<WorkflowStep | string>): Record<string, string> {
    const map: Record<string, string> = {};
    if (!Array.isArray(steps) || steps.length === 0) {
        return map;
    }
    steps.forEach(step => {
        if (typeof step === "string") return;

        map[step.id] = step.label;
        if (step.next && step.next.length > 0) {
            const childMap = getStepsLabelsMap(step.next);
            Object.assign(map, childMap);
        }
        if (step.onConditionPass && typeof step.onConditionPass === "object") {
            const childMap = getStepsLabelsMap([step.onConditionPass]);
            Object.assign(map, childMap);
        }
        if (step.onConditionFail && typeof step.onConditionFail === "object") {
            const childMap = getStepsLabelsMap([step.onConditionFail]);
            Object.assign(map, childMap);
        }
        if (step.onError && typeof step.onError === "object") {
            const childMap = getStepsLabelsMap([step.onError]);
            Object.assign(map, childMap);
        }
        if (step.onTimeout && typeof step.onTimeout === "object") {
            const childMap = getStepsLabelsMap([step.onTimeout]);
            Object.assign(map, childMap);
        }
    });
    return map;
}

//.This function returns all embedded steps (steps that are objects) recursively
export function getEmbeddedChildren(steps: Array<WorkflowStep | string>): WorkflowStep[] {
    let embedded: WorkflowStep[] = [];
    steps.forEach(step => {
        if (typeof step === "string") return;
        if (step.next && step.next.length > 0) {
            // we need to check add only the steps that are objects, not strings
            embedded = embedded.concat(step.next.filter((s): s is WorkflowStep => typeof s === "object"));
            const childEmbedded = getEmbeddedChildren(step.next);
            embedded = embedded.concat(childEmbedded);
        }
        if (step.onConditionPass && typeof step.onConditionPass === "object") {
            embedded.push(step.onConditionPass as WorkflowStep);
            const childEmbedded = getEmbeddedChildren([step.onConditionPass]);
            embedded = embedded.concat(childEmbedded);
        }
        if (step.onConditionFail && typeof step.onConditionFail === "object") {
            embedded.push(step.onConditionFail as WorkflowStep);
            const childEmbedded = getEmbeddedChildren([step.onConditionFail]);
            embedded = embedded.concat(childEmbedded);
        }
        if (step.onError && typeof step.onError === "object") {
            embedded.push(step.onError as WorkflowStep);
            const childEmbedded = getEmbeddedChildren([step.onError]);
            embedded = embedded.concat(childEmbedded);
        }
        if (step.onTimeout && typeof step.onTimeout === "object") {
            embedded.push(step.onTimeout as WorkflowStep);
            const childEmbedded = getEmbeddedChildren([step.onTimeout]);
            embedded = embedded.concat(childEmbedded);
        }
    });
    return embedded;
}

//This function returns all referred steps (steps that are strings)
export function getReferredSteps(steps: Array<WorkflowStep | string>): string[] {
    // return steps filtered by the typeof string
    return steps.filter((step): step is string => typeof step === "string");
}


//List of all stepfunction validators
export const stepFunctionValidators: Record<string, (step: WorkflowStep) => string | null> = {
    'onMRF': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'onMRF') {
            return `Wrong step function for onMRF step: ${step.stepFunction}`;
        }
        const params = step.functionParams as Record<string, unknown>;
        if (!params.templateId || typeof params.templateId !== 'string') {
            // Ideally, you want to check if the templateId matches a published MRF template in the database.
            return `onMRF step "${step.id}" must have a valid templateId parameter.`;
        }
        if (!step.next || (Array.isArray(step.next) && step.next.length === 0))
            return `onMRF step "${step.id}" must have a next step defined.`;
        if (step.onConditionPass || step.onConditionFail) {
            return `onMRF step "${step.id}" should not have condition steps defined.`;
        }

        return null;
    },
    'onRequest': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'onRequest') {
            return `Wrong step function for onRequest step: ${step.stepFunction}`;
        }
        const params = step.functionParams as Record<string, unknown>;
        if (!params.requestType || typeof params.requestType !== 'string') {
            return `onRequest step "${step.id}" must have a valid requestType parameter.`;
        }
        if (!step.next || (Array.isArray(step.next) && step.next.length === 0))
            return `onRequest step "${step.id}" must have a next step defined.`;
        if (step.onConditionPass || step.onConditionFail) {
            return `onRequest step "${step.id}" should not have condition steps defined.`;
        }
        return null;
    },
    'terminate': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'terminate') {
            return `Wrong step function for terminate step: ${step.stepFunction}`;
        }
        // Terminate steps should not have next steps
        if (step.next && Array.isArray(step.next) && step.next.length > 0 ) {
            return `Terminate step "${step.id}" should not have any next steps defined.`;
        }
        if (step.onConditionPass || step.onConditionFail) {
            return `Terminate step "${step.id}" should not have condition steps defined.`;
        }
        return null;
    },
    'notify': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'notify') {
            return `Wrong step function for notify step: ${step.stepFunction}`;
        }
        const params = step.functionParams as Record<string, unknown>;
        if (!params.to || typeof params.to !== 'string') {
            return `notify step "${step.id}" must have a valid recipient parameter.`;
        }
        if (!params.subject || typeof params.subject !== 'string') {
            return `notify step "${step.id}" must have a valid subject parameter.`;
        }
        if (!params.notificationTemplateId || typeof params.notificationTemplateId !== 'string') {
            return `notify step "${step.id}" must have a valid notificationTemplateId parameter.`;
        }
        if (!step.next || (Array.isArray(step.next) && step.next.length === 0))
            return `notify step "${step.id}" must have a next step defined.`;        
        if (step.onConditionPass || step.onConditionFail) {
            return `notify step "${step.id}" should not have condition steps defined.`;
        }
        return null;    
    },
    'createEvent': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'createEvent') {
            return `Wrong step function for createEvent step: ${step.stepFunction}`;
        }
        if (!step.next || (Array.isArray(step.next) && step.next.length === 0))
            return `createEvent step "${step.id}" must have a next step defined.`;        
        if (step.onConditionPass || step.onConditionFail) {
            return `createEvent step "${step.id}" should not have condition steps defined.`;
        }
        return null;
    },
    'requestApproval': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'requestApproval') {
            return `Wrong step function for requestApproval step: ${step.stepFunction}`;
        }           
        const params = step.functionParams as Record<string, unknown>;  
        if (!params.approver || typeof params.approver !== 'string') {
            return `requestApproval step "${step.id}" must have a valid approver parameter.`;
        }     
        if (step.next  && step.next.length > 0)
            return `requestApproval step "${step.id}" cannot have a next step defined.`;        
        if (!step.onConditionPass || !step.onConditionFail) {
            return `requestApproval step "${step.id}" should have both onConditionPass and onConditionFail steps defined.`;
        }
        return null;
    },
    'checkCondition': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'checkCondition') {
            return `Wrong step function for checkCondition step: ${step.stepFunction}`;
        }           
        const params = step.functionParams as Record<string, unknown>;  
        if (!params.evaluate || typeof params.evaluate !== 'string') {
            return `checkCondition step "${step.id}" must have a valid evaluate parameter.`;
        }     
        //TODO: we should validate the evaluate parameter is a valid json-rules-engine rule

        if (step.next  && step.next.length > 0)
            return `checkCondition step "${step.id}" cannot have a next step defined.`;        
        if (!step.onConditionPass || !step.onConditionFail) {
            return `checkCondition step "${step.id}" should have both onConditionPass and onConditionFail steps defined.`;
        }
        return null;
    },
    'multiCheckCondition': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'multiCheckCondition') {
            return `Wrong step function for multiCheckCondition step: ${step.stepFunction}`;
        }           
        const params = step.functionParams as Record<string, unknown>;  
        if (!params.evaluate) {
            return `multiCheckCondition step "${step.id}" must have a valid evaluate parameter.`;
        }       
        if (!params.conditions || (Array.isArray(params.conditions) && Object.keys(params.conditions).length === 0)) {
            return `multiCheckCondition step "${step.id}" must have a valid conditions parameter.`;
        }
        (params.conditions as Array<{value:string, next:string}>).map((condition: {value:string, next:string}) => {
            if (!condition.value || typeof condition.value !== 'string') {
                return `multiCheckCondition step "${step.id}" has a condition with invalid value parameter.`;
            }
            if (!condition.next || typeof condition.next !== 'string') {
                return `multiCheckCondition step "${step.id}" has a condition with invalid next parameter.`;
            }   
        });
        return null;
    },  
    'branch': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'branch') {
            return `Wrong step function for branch step: ${step.stepFunction}`;
        }          
        if (!step.next || (Array.isArray(step.next) && step.next.length === 0))
            return `branch step "${step.id}" must have at least one next step defined.`;        
        if (step.onConditionPass || step.onConditionFail) {
            return `branch step "${step.id}" should not have condition steps defined.`;
        }
        return null;
    },
    'merge': (step: WorkflowStep): string | null => {
        if ( step.stepFunction !== 'merge') {
            return `Wrong step function for merge step: ${step.stepFunction}`;
        }          
        const params = step.functionParams as Record<string, unknown>;  
        if (params.waitForAll === undefined || typeof params.waitForAll !== 'boolean') {
            return `merge step "${step.id}" must have a valid waitForAll parameter.`;
        }
        if (!params.timeout || typeof params.timeout !== 'string') {
            return `merge step "${step.id}" must have a valid timeout parameter.`;
        }
        if (!step.next || (Array.isArray(step.next) && step.next.length === 0))
            return `merge step "${step.id}" must have a next step defined.`;        
        if (step.onConditionPass || step.onConditionFail) {
            return `merge step "${step.id}" should not have condition steps defined.`;
        }
        return null;
    },
};


// This function validates if a workflow template is ready for publish
export async function isWorkflowTemplateReadyForPublish(
    workflowTemplate: WorkflowTemplate
): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for required fields
    if (!workflowTemplate.account || typeof workflowTemplate.account !== 'string') {
        errors.push('Workflow template must have a valid account.');
    }
    if (workflowTemplate.organization && typeof workflowTemplate.organization !== 'string') {
        errors.push('Workflow template must have a valid organization.');
    }
    if (!workflowTemplate.metadata.status || typeof workflowTemplate.metadata.status !== 'string') {
        errors.push('Workflow template must have a valid status.');
    }
    if (!workflowTemplate.id || typeof workflowTemplate.id !== 'string') {
        errors.push('Workflow template must have a valid id.');
    }
    if (!workflowTemplate.version || typeof workflowTemplate.version !== 'string') {
        errors.push('Workflow template must have a valid version.');
    }
    if (validateWorkflowTemplate(workflowTemplate).valid === false) {
        errors.push('Workflow template structure is invalid.');
    }

    //check if there are any steps that do not have duplicate ids
    const stepIds: string[] = getEmbeddedChildren(workflowTemplate.workflowDefinition.steps).map(step => step.id);
    //now check for duplicates
    const uniqueStepIds = new Set(stepIds);
    if (uniqueStepIds.size !== stepIds.length) {
        errors.push('Workflow template contains steps with duplicate IDs.');
    }

    //check that all referred steps exist
    const referredStepIds: string[] = getReferredSteps(workflowTemplate.workflowDefinition.steps);
    referredStepIds.forEach(refId => {
        if (!uniqueStepIds.has(refId)) {
            errors.push(`Referred step ID "${refId}" does not exist in the workflow steps.`);
        }
    });

    // check that other than for terminate steps, all steps have at least one next step or both conditions or has the conditions
    const embeddedSteps: WorkflowStep[] = getEmbeddedChildren(workflowTemplate.workflowDefinition.steps);
    embeddedSteps.forEach(step => {
        if (!step.stepFunction) {
            errors.push(`Step ID "${step.id}" is missing a stepFunction.`);
            return;
        }
        // call stepFunctionValidators[step.stepFunction] if exists
        const validator = stepFunctionValidators[step.stepFunction];
        if (validator) {
            const errorMsg = validator(step);
            if (errorMsg) {
                errors.push(errorMsg);
            }
        } else {
            errors.push(`Unknown step function "${step.stepFunction}" for step ID "${step.id}".`);
        }   
    });

    // Additional validation rules can be added here
    return {
        valid: errors.length === 0,
        errors,
    };
}