import { isWorkflowTemplateReadyForPublish } from '@/app/utils/WorkflowStepUtils';
import { tool } from '@openai/agents';
import { z } from 'zod';
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
    if (!workflowDefinition || typeof workflowDefinition !== 'object') {
        throw new Error('workflowDefinition is required and must be an object');
    }

    // Let us first validate that the received workflowDefinition conforms to the schema    
    const parsedInput = WorkflowDefinitionSchema.parse(workflowDefinition);
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

    const validationResult = await isWorkflowTemplateReadyForPublish(passedWorkflowTemplate);

    if (validationResult.valid) {
        return 'The workflow definition is ready for publish.';
    } else {
        return `The workflow definition is NOT ready for publish. Issues:\n- ${(validationResult).errors.join('\n- ')}`;
    }
};

const isWorkflowDefinitionReadyForPublishSchema = z.object({
    workflowDefinition: z.object({}).describe('The workflow template object to validate for publish readiness (required)'),
});

const isWorkflowDefinitionReadyForPublishToolFunc = async (input: unknown) => { 
    try {
        const parsed = isWorkflowDefinitionReadyForPublishSchema.parse(input);
        return await isWorkflowDefinitionReadyForPublishTool(parsed as IsWorkflowDefinitionReadyForPublishInput);
    }       
    catch (err) {       
        if (err && typeof err === 'object' && 'issues' in err) {        
            // eslint-disable-next-line @typescript-eslint/no-explicit-any        
            const zerr: any = err;        
            const details = zerr.issues ? JSON.stringify(zerr.issues) : String(err);        
            throw new Error(`isWorkflowDefinitionReadyForPublish: invalid input - ${zerr.message || String(err)}; validationIssues=${details}`);        
        }        
        throw err;        
    }       
};

export const IsWorkflowDefinitionReadyForPublishTool = tool({
    name: 'isWorkflowDefinitionReadyForPublish',
    // A clear description for LLMs: explain inputs, behaviour, and output schema.
    description:
        'Validates whether a given workflow definition is ready to be published. IMPORTANT: this tool expects an OBJECT input (not a raw string) and returns a STRING indicating readiness and any issues.\n' +
        'Input (OBJECT): { workflowDefinition: the workflow definition object to validate for publish readiness (required) }\n' +
        'Output (STRING): A message indicating if the workflow is ready for publish or listing issues preventing publish.\n' +
        'Error behaviour: If the input is invalid the tool will throw a validation error. The error message will include "isWorkflowDefinitionReadyForPublish: invalid input" and a validationIssues field describing what failed.',
    parameters: isWorkflowDefinitionReadyForPublishSchema,
    execute: isWorkflowDefinitionReadyForPublishToolFunc,
    strict: true,
}); 