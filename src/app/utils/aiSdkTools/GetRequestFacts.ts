// Tool: getRequestFacts
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
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
    console.log('[GetListOfRequestFacts] Fetching request facts for account:', account, 'organization:', organization, 'requestTemplateId:', requestTemplateId);
    
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
    
    console.log('[GetListOfRequestFacts] returning the list of request facts.', facts.length);
    return { facts };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfRequestFactsSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional)'),
    requestTemplateId: z.string().min(1).describe('Request template identifier (required)'),
});

/**
 * AI SDK tool for retrieving request facts
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { getRequestFactsTool } from './aiSdkTools/GetRequestFacts';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { getRequestFacts: getRequestFactsTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Get request facts for account xyz and template abc'
 * });
 * ```
 */
export const getRequestFactsTool = tool({
    description:
        'Returns a structured object containing published request facts for a given account and optional organization. ' +
        'This tool expects an object input with account (required), requestTemplateId (required), and organization (optional). ' +
        'Returns an object with a facts array containing request fact details. ' +
        'Use this tool to discover available facts in the selected request template.',
    
    inputSchema: getListOfRequestFactsSchema,
    
    execute: async ({ account, organization, requestTemplateId }) => {
        try {
            const result = await getListOfRequestFacts({ account, organization, requestTemplateId });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`getListOfRequestFacts: ${err.message}`);
            }
            throw new Error(`getListOfRequestFacts: unexpected error - ${String(err)}`);
        }
    },
});
