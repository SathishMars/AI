// Tool: getListOfRequestTemplates

import { tool } from '@openai/agents';
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


    return { templates };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfRequestTemplatesSchema = z.object({
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
        const parsedInput = getListOfRequestTemplatesSchema.parse(input);
        return await getListOfRequestTemplates(parsedInput as ListOfRequestTemplatesInput);
    } catch (err) {
        // Zod throws a ZodError with `issues` array; normalize into a readable message
        if (err && typeof err === 'object' && 'issues' in err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const zerr: any = err;
            const details = zerr.issues ? JSON.stringify(zerr.issues) : String(err);
            throw new Error(`getListOfRequestTemplates: invalid input - ${zerr.message || String(err)}; validationIssues=${details}`);
        }
        throw err;
    }
};

export const GetListOfRequestTemplatesTool = tool({
    name: 'getListOfRequestTemplates',
    // A clear description for LLMs: explain inputs, behaviour, and output schema.
    description:
        'Returns a structured object containing published request templates for a given account and optional organization. IMPORTANT: this tool expects an OBJECT input (not a raw string) and returns an OBJECT (not a JSON-string).\n' +
        'Input (OBJECT): { account: string, organization?: string | null }\n' +
        'Output (OBJECT): { templates: [{ id: string, version: string, label: string, description?: string | null }] }\n' +
        'Error behaviour: If the input is invalid the tool will throw a validation error. The error message will include "getListOfRequestTemplates: invalid input" and a validationIssues field describing what failed.\n' +
        'Notes: organization is optional; when provided it filters templates to that organization. Use this tool to discover available templates for a user/account before taking template-specific actions.',

    parameters: getListOfRequestTemplatesSchema,
    execute: listToolFunc,
    strict: true
});
