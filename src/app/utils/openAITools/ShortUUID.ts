import { tool } from '@openai/agents';
import ShortUniqueId from "short-unique-id";
import { z } from "zod";


type ShortUUIDArgs = {
    length?: number|null; // length of each id (default 10)
    count?: number|null; // number of ids to generate (default 1)
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

export const shortUUIDTool = tool({
    name: 'shortUUID',
    description: 'Generates one or more short unique identifiers. Call with {"count":40} to get 40 comma-separated ids.',
    parameters: shortUUIDSchema,
    execute: generateShortUUID,
});