// Tool: getListOfNotificationTemplates

import { tool } from '@openai/agents';
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

const listToolFunc = async (input: unknown) => {
    // The tool expects a JSON object (not a raw string or array) with the shape:
    // { account: string, organization?: string | null }
    // We validate using Zod and re-throw a normalized error message so callers (and the LLM)
    // can clearly see what was wrong with the input.
    try {
        const parsedInput = getListOfNotificationTemplatesSchema.parse(input);
        return await getListOfNotificationTemplates(parsedInput as ListOfNotificationTemplatesInput);
    } catch (err) {
        // Zod throws a ZodError with `issues` array; normalize into a readable message
        if (err && typeof err === 'object' && 'issues' in err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const zerr: any = err;
            const details = zerr.issues ? JSON.stringify(zerr.issues) : String(err);
            throw new Error(`getListOfNotificationTemplates: invalid input - ${zerr.message || String(err)}; validationIssues=${details}`);
        }
        throw err;
    }
};

export const GetListOfNotificationTemplatesTool = tool({
    name: 'getListOfNotificationTemplates',
    // A clear description for LLMs: explain inputs, behaviour, and output schema.
    description:
        'Returns a structured object containing published notification templates for a given account and optional organization. IMPORTANT: this tool expects an OBJECT input (not a raw string) and returns an OBJECT (not a JSON-string).\n' +
        'Input (OBJECT): { account: string, organization?: string | null }\n' +
        'Output (OBJECT): { templates: [{ id: string, version: string, label: string, description?: string | null }] }\n' +
        'Error behaviour: If the input is invalid the tool will throw a validation error. The error message will include "getListOfNotificationTemplates: invalid input" and a validationIssues field describing what failed.\n' +
        'Notes: organization is optional; when provided it filters templates to that organization. Use this tool to discover available templates for a user/account before taking template-specific actions.',

    parameters: getListOfNotificationTemplatesSchema,
    execute: listToolFunc,
    strict: true
});
