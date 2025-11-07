// Tool: getListOfRequestTemplates
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';

export interface ListOfRequestTemplatesInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
}

export interface RequestTemplateSummary {
    id: string;
    version: string;
    label: string;
    description?: string | null;
}

export interface ListOfRequestTemplatesOutput {
    templates: RequestTemplateSummary[];
}

export const getListOfRequestTemplates = async (
    input: ListOfRequestTemplatesInput
): Promise<ListOfRequestTemplatesOutput> => {
    const { account, organization } = input;
    console.log('[GetListOfRequestTemplates] Fetching request templates for account:', account, 'organization:', organization);
    
    // Defensive: ensure account present
    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }

    // This is a placeholder and needs to be modified to use a helper that fetches request templates from the DB
    const templates: RequestTemplateSummary[] = [
        { id: 'req1001', version: '1.0.0', label: 'Budget Request', description: 'Request for budget approval' },
        { id: 'req1002', version: '1.0.0', label: 'Travel Request', description: 'Request for travel approval' },
        { id: 'req1003', version: '1.0.0', label: 'Hotel Request', description: 'Request for hotel approval' }
    ];

    console.log('[GetListOfRequestTemplates] returning the list of request templates.', templates.length);
    return { templates };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfRequestTemplatesSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional)'),
});

/**
 * AI SDK tool for retrieving request templates
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { getListOfRequestTemplatesTool } from './aiSdkTools/GetListOfRequestTemplates';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { getListOfRequestTemplates: getListOfRequestTemplatesTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Get request templates for account xyz'
 * });
 * ```
 */
export const getListOfRequestTemplatesTool = tool({
    description:
        'Returns a structured object containing published request templates for a given account and optional organization. ' +
        'This tool expects an object input with account (required) and organization (optional). ' +
        'Returns an object with a templates array containing request template details. ' +
        'Use this tool to discover available request templates for an account before taking template-specific actions.',
    
    inputSchema: getListOfRequestTemplatesSchema,
    
    execute: async ({ account, organization }) => {
        try {
            const result = await getListOfRequestTemplates({ account, organization });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`getListOfRequestTemplates: ${err.message}`);
            }
            throw new Error(`getListOfRequestTemplates: unexpected error - ${String(err)}`);
        }
    },
});
