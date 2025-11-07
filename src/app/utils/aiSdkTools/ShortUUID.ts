// Tool: shortUUID
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';
import ShortUniqueId from 'short-unique-id';

type ShortUUIDArgs = {
    length?: number | null; // length of each id (default 10)
    count?: number | null; // number of ids to generate (default 1)
};

const generateShortUUID = async ({ length = 10, count = 1 }: ShortUUIDArgs): Promise<string> => {
    const uid = new ShortUniqueId({ length: length ?? 10, dictionary: 'alphanum' });
    if (!count || count <= 1) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore -- uid.rnd exists on this version
        return uid.rnd();
    }
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ids.push(uid.rnd());
    }
    console.log(`Generated ${count} shortUUIDs:`, ids);
    return ids.join(', ');
};

const shortUUIDSchema = z.object({
    length: z.number().min(8).optional().nullable().describe('The length of each UUID. Minimum size is 8'),
    count: z.number().min(1).optional().nullable().describe('Number of UUIDs to generate. When >1 returns a comma-separated list'),
});

/**
 * AI SDK tool for generating short UUIDs
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { shortUUIDTool } from './aiSdkTools/ShortUUID';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { shortUUID: shortUUIDTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Generate 5 short UUIDs'
 * });
 * ```
 */
export const shortUUIDTool = tool({
    description:
        'Generates one or more short unique identifiers. ' +
        'Call with {"count":40} to get 40 comma-separated ids. ' +
        'Always ask for double what you think you may need.',
    
    inputSchema: shortUUIDSchema,
    
    execute: async ({ length, count }) => {
        try {
            const result = await generateShortUUID({ length, count });
            return result;
        } catch (err) {
            // Provide clear error messages for debugging
            if (err instanceof Error) {
                throw new Error(`shortUUID: ${err.message}`);
            }
            throw new Error(`shortUUID: unexpected error - ${String(err)}`);
        }
    },
});
