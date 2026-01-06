// Tool: getListOfMRFTemplates
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';
import MrfTemplateDBUtil from '@/app/utils/mrfTemplateDBUtil';

export interface ListOfMrfTemplatesInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
}

export const getListOfMrfTemplates = async (input: ListOfMrfTemplatesInput): Promise<string> => {
    const { account, organization } = input;

    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }
    
    const results = await MrfTemplateDBUtil.getTemplatesForAccount(account, organization ?? undefined, undefined);
    console.info('Fetched MRF templates:', Array.isArray(results) ? results.length : typeof results);
    const templates: string[] = (results || []).map((t: { id: unknown; name: unknown; organization?: unknown }) => 
        `- id: ${String(t.id)},  name: ${String(t.name)}, organization: ${t.organization ?? null}`
    );

    return "# MRF templates available for the user: \n" + templates.join('\n');
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfMrfTemplatesSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional; may be null)'),
});

/**
 * AI SDK tool for retrieving MRF templates
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { getListOfMrfTemplatesTool } from './aiSdkTools/GetListOfMRFTemplates';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { getListOfMRFTemplates: getListOfMrfTemplatesTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Get MRF templates for account xyz'
 * });
 * ```
 * 
 * Usage example with generateText:
 * ```typescript
 * import { generateText } from 'ai';
 * import { getListOfMrfTemplatesTool } from './aiSdkTools/GetListOfMRFTemplates';
 * 
 * const result = await generateText({
 *   model: yourModel,
 *   tools: { getListOfMRFTemplates: getListOfMrfTemplatesTool },
 *   toolChoice: 'required',
 *   prompt: 'Get MRF templates for account xyz'
 * });
 * ```
 */
export const getListOfMrfTemplatesTool = tool({
    description:
        'Returns a list of available MRF templates for a given account and optional organization. ' +
        'This tool expects an object input with account (required) and organization (optional). ' +
        'Returns a formatted string with template details (id, name, organization). ' +
        'Use this tool to discover available MRF templates for an account before taking template-specific actions.',
    
    inputSchema: getListOfMrfTemplatesSchema,
    
    execute: async ({ account, organization }) => {
        try {
            const result = await getListOfMrfTemplates({ account, organization });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`getListOfMRFTemplates: ${err.message}`);
            }
            throw new Error(`getListOfMRFTemplates: unexpected error - ${String(err)}`);
        }
    },
});
