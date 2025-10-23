// Tool: getRequestFacts

import { tool } from '@openai/agents';
import { z } from 'zod';

export interface ListOfRequestFactsInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
    requestTemplateId: string;
}

export interface RequestFactsSummary {
    id: string;
    label: string;
    description?: string | null;
}

export interface ListOfRequestFactsOutput {
    facts: RequestFactsSummary[];
}

export const getListOfRequestFacts = async (
    input: ListOfRequestFactsInput
): Promise<ListOfRequestFactsOutput> => {
    const { account, organization, requestTemplateId } = input;

    // Defensive: ensure account present
    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }
    // Defensive: ensure requestTemplateId present
    if (!requestTemplateId || typeof requestTemplateId !== 'string') {
        throw new Error('requestTemplateId is required and must be a string');
    }

    // This is a placeholder and needs to be modified to use a helper that fetches notification templates from the DB
    const facts: RequestFactsSummary[] = [
        { id: 'label001', label: 'Request form Name', description: 'Name of this Request template' },
        { id: 'numTravelBookings', label: 'Number of Travel Bookings', description: 'The number of travel bookings required for the event' },
        { id: 'estimatedBudget', label: 'Estimated Budget', description: 'The estimated budget for the event' },
        { id: 'startDate', label: 'Start Date', description: 'The starting date of the event' },
        { id: 'endDate', label: 'End Date', description: 'The ending date of the event' },
        { id: 'locationCity', label: 'Event City', description: 'The city where the event will be held' },
        { id: 'locationCountry', label: 'Event Country', description: 'The country of the event location' },
        { id: 'requestorUserId', label: 'Requestor User ID', description: 'The user ID of the person requesting the MRF' },
        { id: 'isUrgent', label: 'Urgent', description: 'If this is an expedited request' },
    ];

    return { facts };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfRequestFactsSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional)'),
});

const listToolFunc = async (input: unknown) => {
    // The tool expects a JSON object (not a raw string or array) with the shape:
    // { account: string, organization?: string | null, requestTemplateId: string }
    // We validate using Zod and re-throw a normalized error message so callers (and the LLM)
    // can clearly see what was wrong with the input.
    try {
        const parsedInput = getListOfRequestFactsSchema.parse(input);
        return await getListOfRequestFacts(parsedInput as ListOfRequestFactsInput);
    } catch (err) {
        // Zod throws a ZodError with `issues` array; normalize into a readable message
        if (err && typeof err === 'object' && 'issues' in err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const zerr: any = err;
            const details = zerr.issues ? JSON.stringify(zerr.issues) : String(err);
            throw new Error(`getListOfRequestFacts: invalid input - ${zerr.message || String(err)}; validationIssues=${details}`);
        }
        throw err;
    }
};

export const GetRequestFactsTool = tool({
    name: 'getRequestFacts',
    // A clear description for LLMs: explain inputs, behaviour, and output schema.
    description:
        'Returns a structured object containing published request facts for a given account and optional organization. IMPORTANT: this tool expects an OBJECT input (not a raw string) and returns an OBJECT (not a JSON-string).\n' +
        'Input (OBJECT): { account: string, organization?: string | null, requestTemplateId: string }\n' +
        'Output (OBJECT): { facts: [{ id: string, label: string, description?: string | null }] }\n' +
        'Error behaviour: If the input is invalid the tool will throw a validation error. The error message will include "getListOfRequestFacts: invalid input" and a validationIssues field describing what failed.\n' +
        'Notes: Use this tool to discover available facts available in the selected request template.',

    parameters: getListOfRequestFactsSchema,
    execute: listToolFunc,
    strict: true
});
