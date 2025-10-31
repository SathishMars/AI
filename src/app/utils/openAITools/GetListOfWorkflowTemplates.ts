// Tool: getListOfWorkflowTemplates

import { tool } from '@openai/agents';
import { z } from 'zod';
import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import type { WorkflowTemplate } from '@/app/types/workflowTemplate';

export interface ListOfWorkflowTemplatesInput {
    account: string;
    // organization is optional; when present it may be `null` or a non-empty string
    organization?: string | null;
}

export interface WorkflowTemplateSummary {
    id: string;
    version: string;
    label: string;
    description?: string | null;
}

export interface ListOfWorkflowTemplatesOutput {
    templates: WorkflowTemplateSummary[];
}

export const getListOfWorkflowTemplates = async (
    input: ListOfWorkflowTemplatesInput
): Promise<ListOfWorkflowTemplatesOutput> => {
    const { account, organization } = input;
    console.log('[GetListOfWorkflowTemplates] Fetching workflow templates for account:', account, 'organization:', organization);
    // Defensive: ensure account present
    if (!account || typeof account !== 'string') {
        throw new Error('account is required and must be a string');
    }

    const listResult = await WorkflowTemplateDbUtil.list(account, { organization, status: 'published' }, 1, 1000);

    const templates: WorkflowTemplateSummary[] = (listResult.templates || []).map(
        (template: WorkflowTemplate) => {
            const idVal = template.id ?? '';
            const versionVal = template.version ?? '1.0.0';
            const metadata = template.metadata;
            const labelVal = metadata?.label ?? 'Untitled';
            const descVal = metadata?.description ?? null;

            return {
                id: idVal,
                version: versionVal,
                label: labelVal,
                description: descVal === undefined ? null : descVal,
            };
        }
    );
    console.log('[GetListOfWorkflowTemplates] returning the list of workflow templates.', templates.length);
    return { templates };
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfWorkflowTemplatesSchema = z.object({
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
        const parsedInput = getListOfWorkflowTemplatesSchema.parse(input);
        return await getListOfWorkflowTemplates(parsedInput as ListOfWorkflowTemplatesInput);
    } catch (err) {
        // Zod throws a ZodError with `issues` array; normalize into a readable message
        if (err && typeof err === 'object' && 'issues' in err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const zerr: any = err;
            const details = zerr.issues ? JSON.stringify(zerr.issues) : String(err);
            throw new Error(`getListOfWorkflowTemplates: invalid input - ${zerr.message || String(err)}; validationIssues=${details}`);
        }
        throw err;
    }
};

export const GetListOfWorkflowTemplatesTool = tool({
    name: 'getListOfWorkflowTemplates',
    // A clear description for LLMs: explain inputs, behaviour, and output schema.
    description:
        'Returns a structured object containing published workflow templates for a given account and optional organization. IMPORTANT: this tool expects an OBJECT input (not a raw string) and returns an OBJECT (not a JSON-string).\n' +
        'Input (OBJECT): { account: string, organization?: string | null }\n' +
        'Output (OBJECT): { templates: [{ id: string, version: string, label: string, description?: string | null }] }\n' +
        'Error behaviour: If the input is invalid the tool will throw a validation error. The error message will include "getListOfWorkflowTemplates: invalid input" and a validationIssues field describing what failed.\n' +
        'Notes: organization is optional; when provided it filters templates to that organization. Use this tool to discover available templates for a user/account before taking template-specific actions.',

    parameters: getListOfWorkflowTemplatesSchema,
    execute: listToolFunc,
    strict: true
});
