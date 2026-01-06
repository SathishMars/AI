// Tool: workflowDefinitionValidator
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';

interface WorkflowValidatorInput {
    // The workflowDefinition may be passed as a JS object or a JSON string by different tool-call paths
    workflowDefinition?: Record<string, unknown> | string; // The workflow definition to validate (optional from tool wrapper)
}

interface ValidationResult {
    isValid: boolean;
    errors?: string[];
}

const validateWorkflowDefinition = async ({ workflowDefinition }: WorkflowValidatorInput): Promise<string> => {
    const errors: string[] = [];

    // Early guard: workflowDefinition must be provided (object or JSON string)
    console.log('[WorkflowValidator] Validating workflowDefinition:', workflowDefinition);
    if (workflowDefinition === undefined || workflowDefinition === null) {
        const result = { isValid: false, errors: ['workflowDefinition parameter is required'] };
        return JSON.stringify(result);
    }

    // Normalize input: accept either an object or a JSON string
    let wd: unknown = workflowDefinition;
    if (typeof wd === 'string') {
        try {
            wd = JSON.parse(wd as string);
        } catch {
            errors.push('workflowDefinition string could not be parsed as JSON.');
            const result: ValidationResult = { isValid: false, errors };
            return JSON.stringify(result);
        }
    }

    // Some callers may wrap the payload as { workflowDefinition: { ... } }
    if (wd && typeof wd === 'object') {
        const wdObj = wd as Record<string, unknown>;
        if (wdObj.workflowDefinition && typeof wdObj.workflowDefinition === 'object') {
            wd = wdObj.workflowDefinition as unknown;
        } else {
            wd = wdObj;
        }
    }

    const stepIds = new Set<string>();
    // First pass: flatten all step objects into an array so we can detect duplicates regardless of order
    const allSteps: Record<string, unknown>[] = [];
    const collectSteps = (node: unknown) => {
        if (node == null) return;
        if (Array.isArray(node)) {
            for (const el of node) collectSteps(el);
            return;
        }
        if (typeof node === 'object') {
            const obj = node as Record<string, unknown>;
            // If this object looks like a step (has type or id), treat it as a step
            if ('id' in obj || 'type' in obj || 'label' in obj) {
                allSteps.push(obj);
            }
            // Recurse into common nested containers
            for (const key of ['steps', 'next', 'onConditionPass', 'onConditionFail']) {
                const child = obj[key];
                if (child) collectSteps(child);
            }
        }
    };

    collectSteps((wd as Record<string, unknown>).steps ?? (wd as Record<string, unknown>));

    // Build id set and detect duplicates
    for (const step of allSteps) {
        const idVal = step.id;
        if (!idVal) {
            errors.push("Step missing 'id' field.");
            continue;
        }
        const sid = String(idVal);
        if (stepIds.has(sid)) {
            errors.push(`Duplicate step id found: ${sid}`);
        } else {
            stepIds.add(sid);
        }
    }

    // Validate id format and check references now that we've collected all ids
    const idFormat = /^[A-Za-z0-9_-]{10}$/;
    for (const step of allSteps) {
        const sidRaw = step.id;
        const sid = sidRaw ? String(sidRaw) : '';
        if (!sid) {
            // already reported missing id in collection pass
            continue;
        }
        if (sid.length !== 10) {
            errors.push(`Step id must be 10 characters long: ${sid}`);
        }
        if (!idFormat.test(sid)) {
            errors.push(`Step id has invalid characters (allowed A-Z a-z 0-9 _ -): ${sid}`);
        }

        // Helper to check references (string or array)
        const checkRef = (refVal: unknown) => {
            if (!refVal) return;
            if (typeof refVal === 'string') {
                if (!stepIds.has(refVal)) {
                    errors.push(`Step ${sid} has a reference to unknown step id: ${refVal}`);
                }
            } else if (Array.isArray(refVal)) {
                for (const el of refVal) {
                    if (typeof el === 'string' && !stepIds.has(el)) {
                        errors.push(`Step ${sid} has a reference to unknown step id: ${el}`);
                    }
                }
            }
        };

        checkRef(step.next);
        checkRef(step.onConditionPass);
        checkRef(step.onConditionFail);
    }

    if (wd && typeof wd === 'object') {
        const wdObj = wd as Record<string, unknown>;
        if (Array.isArray(wdObj.steps) || wdObj.steps) {
            // collectSteps will handle arrays or nested objects
            collectSteps(wdObj.steps ?? wdObj);
        } else {
            errors.push("Workflow definition must have a 'steps' array.");
        }
    } else {
        errors.push("Workflow definition must have a 'steps' array.");
    }

    // Return JSON string instead of object to avoid OpenAI API content format issues
    const result: ValidationResult = {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
    };
    console.log('[WorkflowValidator] After Validating the supplied workflowDefinition the result:', result);
    return JSON.stringify(result);
};

// To avoid generating complex nested JSON Schemas (which the OpenAI function
// registration enforces strictly), accept a JSON string for the tool parameter.
// The runtime validator will still accept objects when called directly, but
// the tool registration uses a simple string schema which is compatible with the API.
const workflowValidatorSchema = z.object({
    workflowDefinition: z.string().describe('The workflow definition as a JSON string to validate'),
});

/**
 * AI SDK tool for validating workflow definitions
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { workflowDefinitionValidatorTool } from './aiSdkTools/WorkflowValidator';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { workflowDefinitionValidator: workflowDefinitionValidatorTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Validate this workflow definition: {...}'
 * });
 * ```
 */
export const workflowDefinitionValidatorTool = tool({
    description:
        'Validates a workflow definition JSON to ensure all step ids are unique and all references are valid. ' +
        'The response is a JSON Object with an isValid flag and an errors array if any. ' +
        'Accepts workflow definition as a JSON string.',
    
    inputSchema: workflowValidatorSchema,
    
    execute: async ({ workflowDefinition }) => {
        try {
            const result = await validateWorkflowDefinition({ workflowDefinition });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`workflowDefinitionValidator: ${err.message}`);
            }
            throw new Error(`workflowDefinitionValidator: unexpected error - ${String(err)}`);
        }
    },
});
