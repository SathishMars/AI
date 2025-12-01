// Tool: getRequestFacts
// AI SDK (Vercel) compatible tool definition

import { tool } from 'ai';
import { z } from 'zod';
import { serverApiFetch } from '../server-api';

export interface ListOfRequestFactsInput {
  account: string;
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
  
  if (!account || typeof account !== 'string') {
    throw new Error('account is required and must be a string');
  }
  if (!requestTemplateId || typeof requestTemplateId !== 'string') {
    throw new Error('requestTemplateId is required and must be a string');
  }

  try {
      const response = await serverApiFetch(`/api/request-templates/${encodeURIComponent(requestTemplateId)}`, {
          method: 'GET',
          headers: {
              'x-account': account,
              'x-organization': organization || ''
          }
      });

      if (!response.ok) {
          // Handle errors gracefully - don't expose HTTP status codes to the AI (Return empty array instead of throwing to allow workflow to continue)
          return { facts: [] };
      }

      const data = await response.json();
      const facts: RequestFactsSummary[] = [];
      
      if (data.name) {
          facts.push({
              id: 'requestFormName',
              label: 'Request form Name',
              description: 'Name of this Request template'
          });
      }
      
      // Extract questions from all sections
      if (data.sections && Array.isArray(data.sections)) {
          for (const section of data.sections) {
              if (section.questions && Array.isArray(section.questions)) {
                  for (const question of section.questions) {
                      // Skip if question is deleted
                      if (question.deletedAt) {
                          continue;
                      }
                      
                      // Use internalKey as id, or generate one if missing
                      const questionId = question.internalKey || `question_${question.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown'}`;
                      
                      facts.push({
                          id: questionId,
                          label: question.name || 'Unnamed Question',
                          description: question.description || question.fieldType || null
                      });
                      
                      // Also include sub-questions if present
                      if (question.sub_questions && Array.isArray(question.sub_questions)) {
                          for (const subQuestion of question.sub_questions) {
                              if (subQuestion.deletedAt) {
                                  continue;
                              }
                              
                              const subQuestionId = subQuestion.internalKey || `subquestion_${subQuestion.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown'}`;
                              
                              facts.push({
                                  id: subQuestionId,
                                  label: subQuestion.name || 'Unnamed Sub-Question',
                                  description: subQuestion.description || subQuestion.fieldType || null
                              });
                          }
                      }
                  }
              }
          }
      }
      
      console.log('[GetListOfRequestFacts] returning the list of request facts.', facts.length);
      return { facts };
      
  } catch (error) {
      console.error('[GetListOfRequestFacts] Error:', error);
      // If there's an error, return empty facts array rather than throwing - This allows the system to continue even if the request form has no questions
      console.log('[GetListOfRequestFacts] Error fetching facts, returning empty array');
      return { facts: [] };
  }
};

const nonEmptyStringOrNull = z.union([z.string().min(1), z.null()]);

const getListOfRequestFactsSchema = z.object({
  account: z.string().min(1).describe('Account identifier (required)'),
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
      'Use this tool to discover available facts in the selected request template. ' +
      'IMPORTANT: When displaying facts to users in content.text, show only the label (e.g., "Budget", "Start Date") - NEVER display the ID. ' +
      'The ID is for internal reference only when constructing workflow conditions. ' +
      'NEVER display HTTP error statuses or technical error messages to users. If no facts are available, simply state that no facts were found.',
  
  inputSchema: getListOfRequestFactsSchema,
  
  execute: async ({ account, organization, requestTemplateId }) => {
      try {
          const result = await getListOfRequestFacts({ account, organization, requestTemplateId });
          return result;
      } catch (err) {
          // Never expose errors to the AI - return empty array instead - This prevents HTTP status codes and technical errors from being displayed
          console.error('[getRequestFactsTool] Error in execute:', err);
          return { facts: [] };
      }
  },
});
