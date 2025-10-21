// Tool: GetListOfMRFTemplates
// Purpose: Provide a LangChain-compatible tool that returns a concise list of MRF templates
// for a given account and optional organization.

import { tool } from '@openai/agents';
import { z } from "zod";
import MrfTemplateDBUtil from '@/app/utils/mrfTemplateDBUtil';

export interface ListOfMrfTemplatesInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
}



export const getListOfMrfTemplates = async ( input: ListOfMrfTemplatesInput): Promise<string> => {
    const { account, organization } = input;

    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }

    const results = await MrfTemplateDBUtil.getTemplatesForAccount(account, organization ?? undefined, undefined);
    console.info('Fetched MRF templates:', Array.isArray(results) ? results.length : typeof results);
    const templates: string[] = (results || []).map((t: { id: unknown; name: unknown; organization?: unknown }) => (`- id: ${String(t.id)},  name: ${String(t.name)}, organization: ${t.organization ?? null}`));

    return "# MRF templates available for the user: \n" + templates.join('\n');
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfMrfTemplatesSchema = z.object({
    account: z.string().min(1).describe("Account identifier (required)"),
    // organization may be omitted, null, or a non-empty string
    organization: nonEmptyStringOrNull.optional().nullable().describe("Organization identifier (optional; may be null)"),
});

const listToolFunc = async (input: unknown) => {
    try {
        const parsed = getListOfMrfTemplatesSchema.parse(input);
        return await getListOfMrfTemplates(parsed as ListOfMrfTemplatesInput);
    } catch (err) {
        if (err && typeof err === 'object' && 'issues' in err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const zerr: any = err;
            const details = zerr.issues ? JSON.stringify(zerr.issues) : String(err);
            throw new Error(`GetListOfMRFTemplates: invalid input - ${zerr.message || String(err)}; validationIssues=${details}`);
        }
        throw err;
    }
};

export const GetListOfMRFTemplatesTool = tool({
    name: 'GetListOfMRFTemplates',
    description:
        'Returns a list of available MRF templates for a given account and optional organization. IMPORTANT: this tool expects an OBJECT input (not a raw string) and returns an OBJECT (not a JSON-string).\n' +
        'Input (OBJECT): { account: string, organization?: string | null }\n' +
        'Output (STRING): id: string, name: string, organization?: string \n' +
        'Error behaviour: If the input is invalid the tool will throw a validation error. The error message will include "GetListOfMRFTemplates: invalid input" and a validationIssues field describing what failed.\n' +
        'Notes: organization is optional; when provided it filters templates to that organization.',
    parameters: getListOfMrfTemplatesSchema,
    execute: listToolFunc,
    strict: true
});