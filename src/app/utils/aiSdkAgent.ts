import { anthropic } from '@ai-sdk/anthropic';
import { Experimental_Agent as Agent, stepCountIs } from 'ai';
import { WorkflowMessage } from '../types/aimeWorkflowMessages';
import { WorkflowDefinition, WorkflowDefinitionSchema } from '../types/workflowTemplate';
import aimeInstructions from '@/app/utils/aiInstructions/aimeWorkflowGeneralInstructions.md';
import { sampleWorkflowDefinitionJSONForLlm } from '../data/sampleWorkflowDefinitionJSONForLlm';
import { workflowFunctionInstructions } from '@/app/data/workflow-step-definitions';
import { workflowVariableLLMInstructions } from '../data/workflow-variable-definitions';
import { shortUUIDTool } from './aiSdkTools/ShortUUID';
import { getListOfWorkflowTemplatesTool } from './aiSdkTools/GetListOfWorkflowTemplates';
import { workflowDefinitionValidatorTool } from './aiSdkTools/WorkflowValidator';
import { getListOfMrfTemplatesTool } from './aiSdkTools/GetListOfMRFTemplates';
import { getListOfRequestTemplatesTool } from './aiSdkTools/GetListOfRequestTemplates';
import { getListOfNotificationTemplatesTool } from './aiSdkTools/GetListOfNotificationTemplates';
import { getListOfApprovalTemplatesTool } from './aiSdkTools/GetListOfApprovalTemplates';
import { getMrfFactsTool } from './aiSdkTools/GetMRFFacts';
import { getRequestFactsTool } from './aiSdkTools/GetRequestFacts';
import { isWorkflowDefinitionReadyForPublishToolExport } from './aiSdkTools/IsWorkflowDefinitionReadyForPublish';
import { env } from '@/app/lib/env';

const loadMarkdownInstructionsFromFile = (content: string, replace?: Record<string, string>): string => {
    try {
        if (replace) {
            content = content.replace(/\${(\w+)}/g, (match, key) => {
                return replace[key] ?? '';
            });
        }
        return content;
    } catch (err) {
        console.error(`Error loading instructions from content:`, err);
        return '';
    }
};

/**
 * Parses the AI agent's text response to extract WorkflowMessage content.
 * Handles multiple scenarios:
 * 1. Pure JSON response (ideal)
 * 2. Markdown-wrapped JSON (```json ... ```)
 * 3. Text before JSON (extracts JSON after finding first `{`)
 * 4. Plain text fallback
 * 
 * @param responseText - The raw text response from the agent
 * @param existingWorkflow - The existing workflow to use as fallback
 * @returns Parsed WorkflowMessage content
 */
const parseAgentResponse = (responseText: string, existingWorkflow: WorkflowDefinition | null): WorkflowMessage['content'] => {
    if (!responseText || responseText.trim().length === 0) {
        return {
            text: 'I apologize, but I encountered an issue generating a response. Please try again.',
            workflowDefinition: existingWorkflow || undefined,
        };
    }

    // Step 1: Try to extract JSON from markdown code fences
    const markdownJsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    let jsonString = markdownJsonMatch ? markdownJsonMatch[1].trim() : responseText.trim();

    // Step 2: Handle case where LLM adds text before JSON object
    // Find the first occurrence of `{` and extract everything from there
    const firstBraceIndex = jsonString.indexOf('{');
    if (firstBraceIndex > 0) {
        console.warn('[aiSdkAgent] Detected text before JSON, extracting JSON only');
        jsonString = jsonString.substring(firstBraceIndex);
    }

    // Step 3: Try to parse as JSON
    try {
        const parsed = JSON.parse(jsonString);
        
        // Check if this is a complete WorkflowMessage content object
        if (parsed && typeof parsed === 'object') {
            // If it has the expected structure of content object, return it
            if ('text' in parsed || 'workflowDefinition' in parsed) {
                return {
                    text: parsed.text || '',
                    workflowDefinition: parsed.workflowDefinition || existingWorkflow || undefined,
                    actions: parsed.actions || [],
                    followUpQuestions: parsed.followUpQuestions || [],
                    followUpOptions: parsed.followUpOptions || {},
                };
            }
            
            // If it's a full message object (with id, sender, content), extract content
            if ('content' in parsed && typeof parsed.content === 'object') {
                return {
                    text: parsed.content.text || '',
                    workflowDefinition: parsed.content.workflowDefinition || existingWorkflow || undefined,
                    actions: parsed.content.actions || [],
                    followUpQuestions: parsed.content.followUpQuestions || [],
                    followUpOptions: parsed.content.followUpOptions || {},
                };
            }
        }
        
        // If we can't determine the structure, treat as plain text to avoid displaying raw JSON
        console.warn('[aiSdkAgent] Could not determine response structure, treating as plain text');
        return {
            text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2),
            workflowDefinition: existingWorkflow || undefined,
        };
    } catch (parseError) {
        // Step 4: If JSON parsing fails, treat as plain text response
        console.warn('[aiSdkAgent] Failed to parse response as JSON, treating as plain text:', parseError);
        
        // Remove markdown code fences if present
        const cleanText = responseText
            .replace(/```(?:json)?\s*\n?/g, '')
            .replace(/\n?```/g, '')
            .trim();
        
        return {
            text: cleanText,
            workflowDefinition: existingWorkflow || undefined,
        };
    }
};

const GENERATION_INSTRUCTIONS = loadMarkdownInstructionsFromFile(aimeInstructions, {
    WORKFLOW_DEFINITION_SCHEMA: JSON.stringify(WorkflowDefinitionSchema),
    SAMPLE_WORKFLOW_DEFINITION: JSON.stringify(sampleWorkflowDefinitionJSONForLlm),
});

const JSON_RULES_ENGINE_INSTRUCTIONS = `In the decision step, the condition field should contain a rules engine JSON object that defines the conditions for branching.
This follows the syntax used by the "json-rules-engine" library.
Here is an example of a rules engine JSON object:
\`\`\`json
{
    "all": [
    {
        "fact": "age",
        "operator": "greaterThanInclusive",
        "value": 18
    },
    {
        "fact": "age",
        "operator": "lessThanInclusive",
        "value": 25
    },
    {
        "any": [
        {
            "fact": "state",
            "params": {
            "country": "us"
            },
            "operator": "equal",
            "value": "colorado"
        },
        {
            "fact": "state",
            "params": {
            "country": "us"
            },
            "operator": "equal",
            "value": "utah"
        }
        ]
    }
    ]
}
\`\`\`
`;

/**
 * Human-readable instructions that guide the LLM to produce workflow JSON
 * Keep this strict and explicit so downstream parsing is easier.
 */
const INSTRUCTIONS = `${GENERATION_INSTRUCTIONS}

---
  
${workflowFunctionInstructions}
  
${JSON_RULES_ENGINE_INSTRUCTIONS}
  
---
 
${workflowVariableLLMInstructions}

---
`;

export async function runAgentToGenerateWorkflow(
    incomingMessages: WorkflowMessage[],
    existingWorkflow: WorkflowDefinition | null,
    sessionId: string,
    templateId: string,
    accountId: string,
    organizationId?: string,
    userId?: string,
): Promise<{
    messages: WorkflowMessage[];
    modifiedStepIds: string[];
}> {
    if (!incomingMessages || !Array.isArray(incomingMessages) || incomingMessages.length === 0) {
        throw new Error('No messages provided to generator');
    }
    if (!sessionId || !templateId) {
        throw new Error('Missing required config parameters');
    }

    try {
        // Step 1: Create system instructions
        const systemInstructions = INSTRUCTIONS + (existingWorkflow ? `
## Current workflow definition (\`content.workflowDefinition\`) is: 
\`\`\`json
${JSON.stringify(existingWorkflow, null, 2)} 
\`\`\`
` : '\nNo existing workflow provided.\n') + `
## Other important information that you may need for response or generation or for tool calls
- Current Account ID: ${accountId}
- Current Organization ID: ${organizationId ?? 'N/A'}
- Current User ID: ${userId ?? 'N/A'}
- Current Time in ISOformat: ${new Date().toISOString()}
`;

        // Step 2: Set up Anthropic API key (via environment variable ANTHROPIC_API_KEY)
        // The anthropic provider will automatically use the ANTHROPIC_API_KEY env var
        if (!env.anthropicApiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is not set');
        }

        // Step 3: Determine model to use
        const modelName = env.anthropicModel;

        // Step 4: Create AI SDK Agent with Anthropic provider
        const agent = new Agent({
            model: anthropic(modelName),
            system: systemInstructions,
            tools: {
                shortUUID: shortUUIDTool,
                getListOfWorkflowTemplates: getListOfWorkflowTemplatesTool,
                workflowDefinitionValidator: workflowDefinitionValidatorTool,
                getListOfMRFTemplates: getListOfMrfTemplatesTool,
                getListOfRequestTemplates: getListOfRequestTemplatesTool,
                getListOfNotificationTemplates: getListOfNotificationTemplatesTool,
                getListOfApprovalTemplates: getListOfApprovalTemplatesTool,
                getMRFFacts: getMrfFactsTool,
                getRequestFacts: getRequestFactsTool,
                isWorkflowDefinitionReadyForPublish: isWorkflowDefinitionReadyForPublishToolExport,
            },
            // Allow multi-step tool calling - agent will continue until it has a complete response
            // or reaches the step limit (15 steps matching OpenAI agent's maxTurns)
            stopWhen: stepCountIs(15),
        });

        // Step 5: Convert incoming messages to AI SDK format
        const conversationMessages = incomingMessages.map((m) => {
            if (m.sender === 'aime') {
                return {
                    role: 'assistant' as const,
                    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                };
            } else {
                return {
                    role: 'user' as const,
                    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                };
            }
        });

        // Step 6: Run the agent
        console.log('[aiSdkAgent] Running agent with', conversationMessages.length, 'messages');
        const result = await agent.generate({
            messages: conversationMessages,
        });

        // Log token usage
        if (result.usage) {
            console.log('[aiSdkAgent] Token Usage:', {
                inputTokens: result.usage.inputTokens,
                outputTokens: result.usage.outputTokens,
                totalTokens: result.usage.totalTokens,
                reasoningTokens: result.usage.reasoningTokens,
            });
        }

        console.log('[aiSdkAgent] Agent run result:', result.text);

        // Step 7: Parse the response using the robust parser
        const parsedContent = parseAgentResponse(result.text, existingWorkflow);

        const returnMessages: WorkflowMessage[] = [
            {
                id: `msg-${Date.now()}`,
                sender: 'aime',
                content: parsedContent,
                timestamp: new Date().toISOString(),
            }
        ];

        const modifiedStepIds: string[] = [];

        return { messages: returnMessages, modifiedStepIds };
    } catch (error) {
        console.error('Error in runAgentToGenerateWorkflow:', error);
        throw error;
    }
}
