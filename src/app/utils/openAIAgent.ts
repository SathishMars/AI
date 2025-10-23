import { Agent, AgentInputItem, run, setDefaultOpenAIKey } from '@openai/agents';
import z from 'zod';
import { WorkflowMessage, WorkflowMessageSchema } from '../types/aimeWorkflowMessages';
import { WorkflowDefinition, WorkflowDefinitionSchema } from '../types/workflowTemplate';
import aimeInstructions from '@/app/utils/aiInstructions/aimeWorkflowGeneralInstructions.md';
import aimeToolInstructions from '@/app/utils/aiInstructions/aimeWorkflowToolUsageInstructions.md';
import { sampleWorkflowDefinitionJSONForLlm } from '../data/sampleWorkflowDefinitionJSONForLlm';
import { workflowFunctionInstructions } from '@/app/data/workflow-step-definitions';
import { workflowVariableLLMInstructions } from '../data/workflow-variable-definitions';
import { shortUUIDTool } from './openAITools/ShortUUID';
import { GetListOfWorkflowTemplatesTool } from './openAITools/GetListOfWorkflowTemplates';
import { workflowDefinitionValidatorTool } from './openAITools/WorkflowValidator';
import { GetListOfMRFTemplatesTool } from './openAITools/GetListOfMRFTemplates';
import { GetListOfRequestTemplatesTool } from './openAITools/GetListOfRequestTemplates';
import { GetListOfNotificationTemplatesTool } from './openAITools/GetListOfNotificationTemplates';
import { GetListOfApprovalTemplatesTool } from './openAITools/GetListOfApprovalTemplates';
import { GetMRFFactsTool } from './openAITools/GetMRFFacts';
import { GetRequestFactsTool } from './openAITools/GetRequestFacts';
import { IsWorkflowDefinitionReadyForPublishTool } from './openAITools/IsWorkflowDefinitionReadyForPublish';



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



const TOOL_USAGE_INSTRUCTIONS = loadMarkdownInstructionsFromFile(aimeToolInstructions) || '';

const GENERATION_INSTRUCTIONS = loadMarkdownInstructionsFromFile(aimeInstructions, {
    WORKFLOW_DEFINITION_SCHEMA: JSON.stringify(WorkflowDefinitionSchema),
    SAMPLE_WORKFLOW_DEFINITION: JSON.stringify(sampleWorkflowDefinitionJSONForLlm),
    WORKFLOW_MESSAGE_SCHEMA: JSON.stringify(WorkflowMessageSchema) || ''
});

const JSON_RULES_ENGINE_INSTRUCTIONS = `in the decison step, the condition field should contain a rules engine JSON object that defines the conditions for branching.
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
  `

/**
 * Human-readable instructions that guide the LLM to produce workflow JSON
 * Keep this strict and explicit so downstream parsing is easier.
 */
const INSTRUCTIONS = `# 🧩 Condensed System Instructions for “aime” (with Step Function Catalog)
  
  ## Role
  You are **"aime"**, an assistant that creates, edits, and validates **workflow definition JSON structures**.  
  Be **precise**, **concise**, and **deterministic**. Never fabricate data.
  
  ---
  
  ${GENERATION_INSTRUCTIONS}
  
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


    // Safe stringify helper intentionally omitted to avoid unused-var warnings; use JSON.stringify directly where needed.
    if (!incomingMessages || !Array.isArray(incomingMessages) || incomingMessages.length === 0) {
        throw new Error('No messages provided to generator');
    }
    if (!sessionId || !templateId) {
        throw new Error('Missing required config parameters');
    }

    try {

        // Step 1: Create system instructions
        const systemInstructions = INSTRUCTIONS + (existingWorkflow ? `\n
## Current workflow definition (\`content.workflowDefinition\`) is: 
\`\`\`json
{ 
  "id": "87dhas76bgt"
  "sender": "aime"
  "content": {
    "text": "/* aime respponse here */"
    "workflowDefinition": $${JSON.stringify(existingWorkflow, null, 2)} 
  } 
  "timestamp": "2025-10-17T00:00:00Z"
}
\`\`\`
` : '\nNo existing workflow provided.\n') + `
## Other important information that you may need for response or generation or for tool calls
- Current Account ID: ${accountId}
- Current Organization ID: ${organizationId ?? 'N/A'}
- Current User ID: ${userId ?? 'N/A'}
- Current Time in ISOformat: ${new Date().toISOString()}
`;

        setDefaultOpenAIKey(process.env.OPENAI_API_KEY!);
        const agent = new Agent({
            name: 'aime',
            instructions: systemInstructions,
            model: process.env.OPENAI_MODEL_WORKFLOW || 'gpt-4o-mini',
            tools: [
                shortUUIDTool, 
                GetListOfWorkflowTemplatesTool, 
                workflowDefinitionValidatorTool, 
                GetListOfMRFTemplatesTool, 
                GetListOfRequestTemplatesTool, 
                GetListOfNotificationTemplatesTool,
                GetListOfApprovalTemplatesTool,
                GetMRFFactsTool,
                GetRequestFactsTool,
                IsWorkflowDefinitionReadyForPublishTool,
            ], // Tools would be added here as needed
            outputType: WorkflowMessageSchema,
        });


        const conversationMessages: AgentInputItem[] = incomingMessages.map((m) => {
            if (m.sender === 'aime') {
                // Assistant message: must include status, type, and content array
                return {
                    role: 'assistant',
                    status: 'completed',
                    type: 'message',
                    content: [
                        {
                            type: 'output_text',
                            text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                        }
                    ],
                };
            } else {
                // User message: must include type and content string
                return {
                    role: 'user',
                    type: 'message',
                    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                };
            }
        });


        const result = await run(agent, conversationMessages, { stream: false, maxTurns: 15 });

        console.log('[openAIAgent] Agent run result:', result.finalOutput);


        const returnMessages: WorkflowMessage[] = [result.finalOutput as WorkflowMessage];
        const modifiedStepIds: string[] = [];
        return Promise.resolve({ messages: returnMessages, modifiedStepIds });
    } catch (error) {
        console.error('Error in runAgentToGenerateWorkflow:', error);
        throw error;
    }

}
