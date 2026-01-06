// Tool: getListOfApprovalTemplates
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';

export interface ListOfApprovalTemplatesInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
}

export interface ApprovalTemplateSummary {
    id: string;
    version: string;
    label: string;
    description?: string | null;
}

export interface ListOfApprovalTemplatesOutput {
    templates: ApprovalTemplateSummary[];
}

export const getListOfApprovalTemplates = async (
    input: ListOfApprovalTemplatesInput
): Promise<ListOfApprovalTemplatesOutput> => {
    const { account, organization } = input;
    console.log('[GetListOfTemplates] Fetching approval templates for account:', account, 'organization:', organization);
    
    // Defensive: ensure account present
    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }

    // This is a placeholder and needs to be modified to use a helper that fetches approval templates from the DB
    const templates: ApprovalTemplateSummary[] = [
        { id: 'approve001', version: '1.0.0', label: 'Finance Approval Request', description: 'Template to notify Finance team for approval' },
        { id: 'approve002', version: '1.0.0', label: 'Meeting Planning Team Approval Request', description: 'Template to notify the meeting planning team for approval' },
        { id: 'approve003', version: '1.0.0', label: 'Executive Approval Request', description: 'Template to notify executive team for approval' },
        { id: 'approve004', version: '1.0.0', label: 'Manager Approval Request', description: 'Template to notify manager for approval' },
    ];
    
    console.log('[GetListOfTemplates] returning the list of approval templates.', templates.length);
    return { templates };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfApprovalTemplatesSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional)'),
});

/**
 * AI SDK tool for retrieving approval templates
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { getListOfApprovalTemplatesTool } from './aiSdkTools/GetListOfApprovalTemplates';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { getListOfApprovalTemplates: getListOfApprovalTemplatesTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Get approval templates for account xyz'
 * });
 * ```
 * 
 * Usage example with generateText:
 * ```typescript
 * import { generateText } from 'ai';
 * import { getListOfApprovalTemplatesTool } from './aiSdkTools/GetListOfApprovalTemplates';
 * 
 * const result = await generateText({
 *   model: yourModel,
 *   tools: { getListOfApprovalTemplates: getListOfApprovalTemplatesTool },
 *   toolChoice: 'required',
 *   prompt: 'Get approval templates for account xyz'
 * });
 * ```
 */
export const getListOfApprovalTemplatesTool = tool({
    description:
        'Returns a structured object containing published approval templates for a given account and optional organization. ' +
        'This tool expects an object input with account (required) and organization (optional). ' +
        'Returns an object with a templates array containing approval template details. ' +
        'Use this tool to discover available approval templates for an account before taking template-specific actions. ' +
        'IMPORTANT: When displaying templates to users in content.text or followUpOptions, show only the label (e.g., "Finance Approval", "Manager Approval") - NEVER display the ID. ' +
        'CRITICAL: When presenting these templates as followUpOptions, you MUST include category: "template_approval" in each option object. ' +
        'Example format: {"label": "Finance Approval Request", "value": "approve001", "category": "template_approval", "metadata": {"templateId": "approve001", "version": "1.0.0"}}. ' +
        'This category triggers immediate submission when the user selects the option. ' +
        'NEVER display HTTP error statuses or technical error messages to users.',
    
    inputSchema: getListOfApprovalTemplatesSchema,
    
    execute: async ({ account, organization }) => {
        try {
            const result = await getListOfApprovalTemplates({ account, organization });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`getListOfApprovalTemplates: ${err.message}`);
            }
            throw new Error(`getListOfApprovalTemplates: unexpected error - ${String(err)}`);
        }
    },
});
