// Tool: getMRFFacts
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';

export interface ListOfMRFFactsInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
    mrfTemplateId: string;
}

export interface MRFFactsSummary {
    id: string;
    label: string;
    description?: string | null;
}

export interface ListOfMRFFactsOutput {
    facts: MRFFactsSummary[];
}

export const getListOfMRFFacts = async (
    input: ListOfMRFFactsInput
): Promise<ListOfMRFFactsOutput> => {
    const { account, organization, mrfTemplateId } = input;
    console.log('[GetMRFFacts] Fetching MRF facts for account:', account, 'organization:', organization, 'mrfTemplateId:', mrfTemplateId);
    
    // Defensive: ensure account present
    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }
    // Defensive: ensure mrfTemplateId present
    if (!mrfTemplateId || typeof mrfTemplateId !== 'string') {
        throw new Error('mrfTemplateId is required and must be a string');
    }

    // This is a placeholder and needs to be modified to use a helper that fetches notification templates from the DB
    const facts: MRFFactsSummary[] = [
        { id: 'label001', label: 'Meeting Request Form', description: 'Name of this MRF template' },
        { id: 'numAttendees', label: 'Number of Attendees', description: 'The number of attendees expected for the event' },
        { id: 'numSleepingRooms', label: 'Number of Sleeping Rooms', description: 'The number of sleeping rooms required for the event' },
        { id: 'numTravelBookings', label: 'Number of Travel Bookings', description: 'The number of travel bookings required for the event' },
        { id: 'estimatedBudget', label: 'Estimated Budget', description: 'The estimated budget for the event' },
        { id: 'cateringRequired', label: 'Catering Required', description: 'Indicates if catering services are required for the event' },
        { id: 'avRequirements', label: 'AV Requirements', description: 'Audio-Visual equipment and support needed for the event' },
        { id: 'startDate', label: 'Start Date', description: 'The starting date of the event' },
        { id: 'endDate', label: 'End Date', description: 'The ending date of the event' },
        { id: 'locationCity', label: 'Event City', description: 'The city where the event will be held' },
        { id: 'locationCountry', label: 'Event Country', description: 'The country of the event location' },
        { id: 'requestorUserId', label: 'Requestor User ID', description: 'The user ID of the person requesting the MRF' },
        { id: 'isUrgent', label: 'Urgent', description: 'If this is an expedited request' },
    ];
    
    console.log('[GetMRFFacts] returning the list of MRF facts.', facts.length);
    return { facts };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfMRFFactsSchema = z.object({
    account: z.string().min(1).describe('Account identifier (required)'),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional)'),
    mrfTemplateId: z.string().min(1).describe('MRF template identifier (required)'),
});

/**
 * AI SDK tool for retrieving MRF facts
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { getMrfFactsTool } from './aiSdkTools/GetMRFFacts';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { getMRFFacts: getMrfFactsTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Get MRF facts for account xyz and template abc'
 * });
 * ```
 */
export const getMrfFactsTool = tool({
    description:
        'Returns a structured object containing published MRF facts for a given account and optional organization. ' +
        'This tool expects an object input with account (required), mrfTemplateId (required), and organization (optional). ' +
        'Returns an object with a facts array containing MRF fact details. ' +
        'Use this tool to discover available facts in the selected MRF template.',
    
    inputSchema: getListOfMRFFactsSchema,
    
    execute: async ({ account, organization, mrfTemplateId }) => {
        try {
            const result = await getListOfMRFFacts({ account, organization, mrfTemplateId });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`getListOfMRFFacts: ${err.message}`);
            }
            throw new Error(`getListOfMRFFacts: unexpected error - ${String(err)}`);
        }
    },
});
