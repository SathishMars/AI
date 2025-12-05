// Tool: getListOfRequestTemplates
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';
import { serverApiFetch } from '@/app/utils/server-api';

export interface ListOfRequestTemplatesInput {
  account: string;
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

  if (!account || typeof account !== 'string') {
      throw new Error('account is required and must be a string');
  }

  try {
      const response = await serverApiFetch('/api/request-templates', {
        method: 'GET',
        headers: {
          'x-account': account,
          'x-organization': organization || ''
        }
      });

      if (!response.ok) {
          return { templates: [] };
      }

      const data = await response.json();  
      const templates: RequestTemplateSummary[] = data.requests?.map((req: any) => ({
          id: req.internal_key || req.requestId,
          version: req.version || '1.0.0',
          label: req.name,
          description: null,
      })) || [];

      return { templates };
      
  } catch (error) {
      return { templates: [] };
  }
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfRequestTemplatesSchema = z.object({
  account: z.string().min(1).describe('Account identifier (required)'),
  organization: nonEmptyStringOrNull.optional().nullable().describe('Organization identifier (optional)'),
});

/**
 * AI SDK tool for retrieving request templates
 * Compatible with Vercel AI SDK (ai package v5.x)
 * 
 * Tool definition using the `tool` function from the 'ai' package.
 * Can be used with Agent class or directly with generateText, streamText, etc.
 * 
 * Usage example with Agent:
 * ```typescript
 * import { Experimental_Agent as Agent } from 'ai';
 * import { getListOfRequestTemplatesTool } from './aiSdkTools/GetListOfRequestTemplates';
 * 
 * const myAgent = new Agent({
 *   model: 'openai/gpt-4o',
 *   tools: { getListOfRequestTemplates: getListOfRequestTemplatesTool }
 * });
 * 
 * const result = await myAgent.generate({
 *   prompt: 'Get request templates for account xyz'
 * });
 * ```
 */
export const getListOfRequestTemplatesTool = tool({
  description:
      'Returns a structured object containing published request templates for a given account and optional organization. ' +
      'This tool expects an object input with account (required) and organization (optional). ' +
      'Returns an object with a templates array containing request template details. ' +
      'Use this tool to discover available request templates for an account before taking template-specific actions. ' +
      'IMPORTANT: When displaying templates to users in content.text or followUpOptions, show only the label (e.g., "Budget Request", "Travel Request") - NEVER display the ID. ' +
      'The ID is for internal reference only and should be stored in the value field of followUpOptions, but users will only see the label. ' +
      'CRITICAL: When presenting these templates as followUpOptions, you MUST include category: "template_request" in each option object. ' +
      'Example format: {"label": "Digital Sign-In Request", "value": "req123", "category": "template_request", "metadata": {"templateId": "req123", "version": "1.0.0"}}. ' +
      'NEVER display HTTP error statuses or technical error messages to users. If no templates are available, simply state that no templates were found.',
  
  inputSchema: getListOfRequestTemplatesSchema,
  
  execute: async ({ account, organization }) => {
      try {
          const result = await getListOfRequestTemplates({ account, organization });
          return result;
      } catch (err) {
          // Never expose errors to the AI - return empty array instead - This prevents HTTP status codes and technical errors from being displayed to the user
          return { templates: [] };
      }
  },
});
