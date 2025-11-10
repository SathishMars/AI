// Tool: getListOfNotificationTemplates
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';

export interface ListOfNotificationTemplatesInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
}

export interface NotificationTemplateSummary {
    id: string;
    version: string;
    label: string;
    description?: string | null;
}

export interface ListOfNotificationTemplatesOutput {
    templates: NotificationTemplateSummary[];
}

export const getListOfNotificationTemplates = async (
    input: ListOfNotificationTemplatesInput
): Promise<ListOfNotificationTemplatesOutput> => {
    const { account, organization } = input;
    console.log('[GetListOfNotificationTemplates] Fetching notification templates for account:', account, 'organization:', organization);
    
    // Defensive: ensure account present
    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }

    // This is a placeholder and needs to be modified to use a helper that fetches notification templates from the DB
    const templates: NotificationTemplateSummary[] = [
        { id: 'notify001', version: '1.0.0', label: 'Approval Notification', description: 'Template to notify approvers of a request' },
        { id: 'notify002', version: '1.0.0', label: 'Informational Notification', description: 'Template to notify users of general information' },
        { id: 'notify003', version: '1.0.0', label: 'Hotel Booking Notification', description: 'Template to notify users about hotel bookings' },
        { id: 'notify004', version: '1.0.0', label: 'Travel Booking Notification', description: 'Template to notify users about travel bookings' },
        { id: 'notify005', version: '1.0.0', label: 'Request Denial Notification', description: 'Template to notify users about request denials' }
    ];

    console.log('[GetListOfNotificationTemplates] returning the list of notification templates.', templates.length);
    return { templates };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfNotificationTemplatesSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional)'),
});

/**
 * AI SDK tool for retrieving notification templates
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { getListOfNotificationTemplatesTool } from './aiSdkTools/GetListOfNotificationTemplates';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { getListOfNotificationTemplates: getListOfNotificationTemplatesTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Get notification templates for account xyz'
 * });
 * ```
 */
export const getListOfNotificationTemplatesTool = tool({
    description:
        'Returns a structured object containing published notification templates for a given account and optional organization. ' +
        'This tool expects an object input with account (required) and organization (optional). ' +
        'Returns an object with a templates array containing notification template details. ' +
        'Use this tool to discover available notification templates for an account before taking template-specific actions.',
    
    inputSchema: getListOfNotificationTemplatesSchema,
    
    execute: async ({ account, organization }) => {
        try {
            const result = await getListOfNotificationTemplates({ account, organization });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`getListOfNotificationTemplates: ${err.message}`);
            }
            throw new Error(`getListOfNotificationTemplates: unexpected error - ${String(err)}`);
        }
    },
});
