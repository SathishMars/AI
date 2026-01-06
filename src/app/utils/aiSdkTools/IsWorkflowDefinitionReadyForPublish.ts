// Tool: isWorkflowDefinitionReadyForPublish
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';
import { isWorkflowTemplateReadyForPublish } from '@/app/utils/WorkflowStepUtils';
import { WorkflowDefinitionSchema, type WorkflowDefinition, type WorkflowTemplate } from '@/app/types/workflowTemplate';

interface IsWorkflowDefinitionReadyForPublishInput {
    account: string;
    organization?: string | null;
    workflowDefinition: WorkflowDefinition;
}

const isWorkflowDefinitionReadyForPublishTool = async (
    input: IsWorkflowDefinitionReadyForPublishInput
): Promise<string> => {
    const { workflowDefinition, account, organization } = input;
    const startTime = Date.now();
    console.log('[isWorkflowDefinitionReadyForPublishTool] called with account:', account, 'organization:', organization);
    
    // Normalize input: accept either an object or a JSON string
    let wd: unknown = workflowDefinition;
    if (typeof wd === 'string') {
        try {
            wd = JSON.parse(wd);
        } catch {
            throw new Error('workflowDefinition string could not be parsed as JSON.');
        }
    }
    
    if (!wd || typeof wd !== 'object') {
        throw new Error('workflowDefinition is required and must be an object or valid JSON string');
    }

    // Let us first validate that the received workflowDefinition conforms to the schema    
    const parsedInput = WorkflowDefinitionSchema.parse(wd);
    const passedWorkflowTemplate: WorkflowTemplate = {
        id: 'temp-id-for-validation',
        version: '1.0.0',
        workflowDefinition: parsedInput,
        account,
        organization: organization ?? undefined,
        metadata: {
            status: 'draft',
            label: 'Temporary Workflow Template for Validation',
            createdAt: new Date().toISOString(),
            createdBy: 'system',    
            updatedAt: new Date().toISOString(),
            updatedBy: 'system',
        },
    };
    const endTime = Date.now();
    const validationResult = await isWorkflowTemplateReadyForPublish(passedWorkflowTemplate);
    console.log('[isWorkflowDefinitionReadyForPublishTool] validation result:', validationResult);
    console.log('[isWorkflowDefinitionReadyForPublishTool] execution time:', (endTime - startTime), 'ms');
    
    return JSON.stringify(validationResult, null, 2);

};

// To avoid generating complex nested JSON Schemas (which the OpenAI function
// registration enforces strictly), accept a JSON string for the tool parameter.
// The runtime validator will still accept objects when called directly, but
// the tool registration uses a simple string schema which is compatible with the API.
const isWorkflowDefinitionReadyForPublishSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    organization: z.string().optional().nullable().describe('Organization identifier (optional)'),
    workflowDefinition: z.string().describe('The workflow definition as a JSON string to validate for publish readiness (required)'),
});

/**
 * AI SDK tool for validating workflow definitions for publish readiness
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { isWorkflowDefinitionReadyForPublishTool } from './aiSdkTools/IsWorkflowDefinitionReadyForPublish';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { isWorkflowDefinitionReadyForPublish: isWorkflowDefinitionReadyForPublishTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Check if this workflow is ready for publish'
 * });
 * ```
 */
export const isWorkflowDefinitionReadyForPublishToolExport = tool({
    description:
        'Validates whether a given workflow definition is ready to be published. ' +
        'This tool expects an object input with account (required), workflowDefinition as a JSON string (required), and organization (optional). ' +
        'Returns an object with 2 properties. `valid` indicating if the workflow is ready for publish and an array of `errors` listing issues preventing publish.',
    
    inputSchema: isWorkflowDefinitionReadyForPublishSchema,
    
    execute: async ({ account, organization, workflowDefinition }) => {
        try {
            const result = await isWorkflowDefinitionReadyForPublishTool({ 
                account, 
                organization, 
                workflowDefinition: workflowDefinition as unknown as WorkflowDefinition
            });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`isWorkflowDefinitionReadyForPublish: ${err.message}`);
            }
            throw new Error(`isWorkflowDefinitionReadyForPublish: unexpected error - ${String(err)}`);
        }
    },
});
