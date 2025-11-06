// Tool: getListOfWorkflowTemplates
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';
import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import type { WorkflowTemplate } from '@/app/types/workflowTemplate';

export interface ListOfWorkflowTemplatesInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
}

export interface WorkflowTemplateSummary {
    id: string;
    version: string;
    label: string;
    description?: string | null;
}

export interface ListOfWorkflowTemplatesOutput {
    templates: WorkflowTemplateSummary[];
}

export const getListOfWorkflowTemplates = async (
    input: ListOfWorkflowTemplatesInput
): Promise<ListOfWorkflowTemplatesOutput> => {
    const { account, organization } = input;
    console.log('[GetListOfWorkflowTemplates] Fetching workflow templates for account:', account, 'organization:', organization);
    
    // Defensive: ensure account present
    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }

    const listResult = await WorkflowTemplateDbUtil.list(account, { organization, status: 'published' }, 1, 1000);

    const templates: WorkflowTemplateSummary[] = (listResult.templates || []).map(
        (template: WorkflowTemplate) => {
            const idVal = template.id ?? '';
            const versionVal = template.version ?? '1.0.0';
            const metadata = template.metadata;
            const labelVal = metadata?.label ?? 'Untitled';
            const descVal = metadata?.description ?? null;

            return {
                id: idVal,
                version: versionVal,
                label: labelVal,
                description: descVal === undefined ? null : descVal,
            };
        }
    );
    
    console.log('[GetListOfWorkflowTemplates] returning the list of workflow templates.', templates.length);
    return { templates };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfWorkflowTemplatesSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional)'),
});

/**
 * AI SDK tool for retrieving workflow templates
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { getListOfWorkflowTemplatesTool } from './aiSdkTools/GetListOfWorkflowTemplates';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { getListOfWorkflowTemplates: getListOfWorkflowTemplatesTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Get workflow templates for account xyz'
 * });
 * ```
 */
export const getListOfWorkflowTemplatesTool = tool({
    description:
        'Returns a structured object containing published workflow templates for a given account and optional organization. ' +
        'This tool expects an object input with account (required) and organization (optional). ' +
        'Returns an object with a templates array containing workflow template details. ' +
        'Use this tool to discover available workflow templates for an account before taking template-specific actions.',
    
    inputSchema: getListOfWorkflowTemplatesSchema,
    
    execute: async ({ account, organization }) => {
        try {
            const result = await getListOfWorkflowTemplates({ account, organization });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`getListOfWorkflowTemplates: ${err.message}`);
            }
            throw new Error(`getListOfWorkflowTemplates: unexpected error - ${String(err)}`);
        }
    },
});
