// src/app/utils/langchain/langchain-workflow-generator.ts
import { getLLMFactory, type LLMProvider } from './providers/llm-factory';

import { WorkflowDefinition, WorkflowDefinitionSchema } from '@/app/types/workflowTemplate';
import { WorkflowMessage, WorkflowMessageSchema } from '@/app/types/aimeWorkflowMessages';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from 'langchain/memory';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { workflowFunctionInstructions } from '@/app/data/workflow-tool-defintions';
import { workflowVariableLLMInstructions } from '@/app/data/workflow-variable-definitions';
import  { zodToJsonSchema } from 'zod-to-json-schema';
import ShortUniqueId from 'short-unique-id';
import { sampleWorkflowDefinitionJSONForLlm } from '@/app/data/sampleWorkflowDefinitionJSONForLlm';
// 10-char alphanumeric short id generator (reusable instance)
const uid = new ShortUniqueId({ length: 10, dictionary: 'alphanum' });

// Helper to produce an id string
function generateShortId(): string {
    // use rnd() to generate id string with this package version
    // (instance is not directly callable in typings)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return uid.rnd();
}

/**
 * Types exported for route usage
 */
export type LangChainWorkflowConfig = {
  sessionId: string;
  templateId?: string;
  provider?: LLMProvider;
  userId?: string;
  account?: string;
  organization?: string;
  conversationalMode?: boolean;
};



const WORKFLOW_DEFINITION_SCHEMA = JSON.stringify(zodToJsonSchema(WorkflowDefinitionSchema), null, 2);
const WORKFLOW_MESSAGE_SCHEMA = JSON.stringify(zodToJsonSchema(WorkflowMessageSchema), null, 2);
const STEP_FUNCTION_INSTRUCTIONS = `A step function is a reusable function that can be called from multiple workflow steps. 
It has a unique id, a name, and a definition that describes its behavior. The definition follows the same schema as a workflow definition. 
Step functions can be used to encapsulate common logic or actions that can be shared across different workflows. 
When defining a step function, ensure that its id is unique within the workflow and that it does not conflict with any step ids. 
Step functions can be referenced in workflow steps by their id.
When creating or modifying step functions, ensure that:
- Each step function has a unique id that does not conflict with step ids.
- The definition of the step function adheres to the workflow definition schema.
- Step functions are used to encapsulate common logic or actions that can be reused across different workflows.
- When referencing a step function in a workflow step, use its id to ensure clarity and consistency.

Available step functions are as follows:
${workflowFunctionInstructions.join('\n')}
`;


const RESPONSE_INSTRUCTIONS = `Respond with a JSON object that matches the following schema:
\`\`\`json
${WORKFLOW_MESSAGE_SCHEMA}
\`\`\`
IMPORTANT: 
1. The text property should have your conversational response.
2. The sender should be "aime"
3. If there is a workflowDefinition, it should be in the workflowDefinition field.
4. If you are asking follow-up questions, include them in the followUpQuestions array. Do not assume any values unless specified by the user sometime during the conversation.
5. If you are providing follow-up options, include them in the followUpOptions field as a map of question to array of options.
6. The userId and userName fields don't make sense for you. so ignore them.

Validation rules for the LLM output:
- Step ids must be short, alphanumeric with dashes or underscores and unique within the workflow.IMPORTANT: They should be 10 characters long.
- Generate human readable labels for each step describing the action to be taken.
- If steps need to refer to other steps that are not directly included in the next, onConditionPass, onConditionFail, onError, or onTimeout fields to reference them by id.
- Even if the response is general conversational and not workflow-related, always respond with a valid JSON object that conforms to the schema above.
CRITICAL: Please note that the response will be parsed and validated against this schema.
If you cannot provide a valid JSON response, return an object with an "error" field explaining the issue.
`;

const GENERATION_INSTRUCTIONS = `The user will input a message describing the workflow they want to create or modify. 
The original workflow (if any) will be provided as JSON and will follow the following schema: 
\`\`\`json
${WORKFLOW_DEFINITION_SCHEMA}
\`\`\`
Your task is to generate a new or modified workflow definition that meets the user's requirements.
When given conversation history, use it to decide whether to ask clarifying questions or to modify the workflow. When provided with an existing workflow, prefer editing or annotating that workflow rather than creating an entirely new one unless explicitly requested.
**CRITICAL SYSTEM GUIDELINES — Follow exactly as written**
1. If the user message is a request to create or modify a workflow, respond with a JSON object containing the updated workflowDefinition field.
2. If the user message is ambiguous or seems to require clarification, respond with a JSON object with the followup questions populated. If a partial workflow can be generated from the conversation history, include it in the response.
3. If the user message is purely conversational and does not relate to workflow creation or modification, you do not need to respond with a workflowDefinition, just respond to the conversation.
4. Do not include sensitive tokens or environment variables in the output.
5. Ensure a workflow always begins with a trigger step and ends with an terminate step.
6. Step Reuse Rule  
- Do **not** create new step objects that duplicate existing functionality.  
- Reuse existing steps by **referencing their step IDs**.  
- Only create new step objects when:  
  - They perform a **different function**, or  
  - They are used in **parallel branches**.
7. Workflow Readability Rule  
- Wherever possible, **nest** step objects using these fields:  
  - \`next\`, \`onConditionPass\`, or \`onConditionFail\`.  
- Use **ID references** (instead of nested steps) **only when necessary** for clarity or structure.

EXAMPLE: An example of a good step definition is as follows. This does the nesting properly and uses references only when needed.It does not duplicate steps unnecessarily.:
\`\`\`json
${JSON.stringify(sampleWorkflowDefinitionJSONForLlm, null, 2)}
\`\`\`
`;

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
const INSTRUCTIONS = `You are "aime" an assistant that generates and edits workflow JSON structures.
${RESPONSE_INSTRUCTIONS}

${GENERATION_INSTRUCTIONS}

Guidance on the step functions to be used to generate the steps:
${STEP_FUNCTION_INSTRUCTIONS}

${JSON_RULES_ENGINE_INSTRUCTIONS}

${workflowVariableLLMInstructions}
`;




export async function runLangChainGenerator(
  messages: WorkflowMessage[],
  existingWorkflow: WorkflowDefinition | null,
  config: LangChainWorkflowConfig,
): Promise<{
  messages: WorkflowMessage[];
  modifiedStepIds: string[];
}> {
  console.info('[langchain] runLangChainGenerator called', {
    sessionId: config?.sessionId,
    templateId: config?.templateId,
    provider: config?.provider,
    messagesCount: Array.isArray(messages) ? messages.length : 0,
  });

  try {
    // Safe stringify helper to avoid crashes on circular structures
    const safeStringify = (obj: unknown, maxChars = 10000) => {
      try {
        const cache = new Set<unknown>();
        const str = JSON.stringify(obj, function (_key, value) {
          if (value && typeof value === 'object') {
            if (cache.has(value)) return '[Circular]';
            cache.add(value);
          }
          return value;
        });
        return typeof str === 'string' && str.length > maxChars ? str.slice(0, maxChars) + '...<truncated>' : str;
      } catch (e) {
        return String(e instanceof Error ? e.message : e);
      }
    };
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('No messages provided to generator');
    }
    if (!config || !config.sessionId || !config.templateId) {
      throw new Error('Missing required config parameters');
    }

    // Create chat model - wrap to capture any provider/model creation errors
    let chatModel;
    try {
      chatModel = getLLMFactory().createWorkflowEditModel(config.provider);
      console.info('[langchain] Initialized chat model ');
    } catch (createErr: unknown) {
      console.error('[langchain] Failed to create chat model', {
        error: createErr instanceof Error ? { message: createErr.message, stack: createErr.stack } : String(createErr),
        provider: config.provider,
      });
      throw createErr;
    }
    const shortUniqueIds: string[] = [];
    for (let i=0; i<20; i++) {
      shortUniqueIds.push(generateShortId());
    }


    const systemInstructions = INSTRUCTIONS + (existingWorkflow ? `\nThe existing workflow is: 
\`\`\`json
${JSON.stringify(existingWorkflow, null, 2)} 
\`\`\`

use the following short unique ids for any new steps or step functions you create and the messageid.
${shortUniqueIds.join(', ')}
` : '\nNo existing workflow provided.');




    // console.info('[langchain] Created system instructions',systemInstructions);

    // Step 1: Set up the stateless components
    // NOTE: JsonOutputParser was originally created but not used; remove to avoid unused-var warnings.
    // LangChain prompt templates parse f-strings and will error on unmatched braces.
    // Escape literal braces in systemInstructions but preserve the special placeholders we use below.
    const escapeTemplateBraces = (tpl: string, preserve: string[]) => {
      let out = tpl.replaceAll('{', '{{').replaceAll('}', '}}');
      for (const p of preserve) {
        out = out.replaceAll(`{{${p}}}`, `{${p}}`);
      }
      return out;
    };

    console.log('[langchain] system instructions', );

    const escapedSystemInstructions = escapeTemplateBraces(systemInstructions, ['chat_history', 'input']);
    console.debug('[langchain] systemInstructions length', systemInstructions.length, 'escaped length', escapedSystemInstructions.length);

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", escapedSystemInstructions],
      ["placeholder", "{chat_history}"], //placeholder for chat history
      ["human", "{input}"],
    ]);

    console.log('[langchain] Created prompt template');

    // Step 2: Build the conversational chain with memory
    const chain = prompt.pipe(chatModel);

    console.log('[langchain] Created conversational chain');

    // Step 3: Set up the memory with existing messages
    const messageHistory = new ChatMessageHistory();

    messageHistory.addMessages(messages.map((m: WorkflowMessage) => {
      if (m.sender === 'aime') {
        return new AIMessage(m.content.text);
      } else {
        return new HumanMessage(m.content.text);
      }
    }));

    console.log('[langchain] Populated message history with', messages.length, 'messages');

    // Create the conversational chain with the pre-populated history
    const conversationalChain = new RunnableWithMessageHistory({
      runnable: chain,
      // sessionId is unused because we always return the prefilled history; reference it to avoid lint warnings
      getMessageHistory: (sessionId) => {
        void sessionId;
        return messageHistory;
      },
      inputMessagesKey: "input",
      historyMessagesKey: "chat_history",
    });

    console.log('[langchain] Created conversational chain with message history');

    // Invoke the chain with the new message.
    // The history from the previous steps will be included in the prompt.
    // Avoid mutating the incoming messages array (don't use reverse()). Use the last element directly.
    const lastMsg = messages[messages.length - 1];
    const invokeInput = { input: lastMsg.content.text, workflowDefinition: existingWorkflow ? JSON.stringify(existingWorkflow) : 'None' };


    console.info('[langchain] invoking conversationalChain', {
      sessionId: config.sessionId,
      templateId: config.templateId,
      provider: config.provider,
      conversationalMode: config.conversationalMode ?? false,
      messagesCount: messages.length,
      lastMessagePreview: typeof lastMsg.content.text === 'string' ? lastMsg.content.text.slice(0, 300) : undefined,
    });

    try {
      const response = await conversationalChain.invoke(invokeInput, { configurable: {
          response_format: { type: 'json_object' },
          output_parser: new JsonOutputParser(),
          sessionId: config.sessionId,
      }});
      console.info('[langchain] conversationalChain invoke completed', response.content);

      // Strip the ``````json` and ``` fences
      // if the model added them around the JSON
      const jsonString = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      // if the content is of type string and does not have the ```json` or ``` fences, we will read this as the text and construct a valid JSON response with just the text field
      if (typeof response.content === 'string' && !response.content.trim().startsWith('\`\`\`json') && !response.content.trim().startsWith('{')) {
        const textResponse: WorkflowMessage = {
          id: generateShortId(),
          sender: 'aime',
          content: {
            text: response.content,
          },
          timestamp: new Date().toISOString(),
        };
        return { messages: [textResponse], modifiedStepIds: [] };
      }

      const strippedJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
      console.log('[langchain] LLM response (stripped):', strippedJson);

      // Parse the JSON and return it
      const parsed: WorkflowMessage = JSON.parse(strippedJson);
      parsed.timestamp = new Date().toISOString();
      parsed.id = generateShortId();
      return { messages: [parsed], modifiedStepIds: [] };

    } catch (err: unknown) {
      // Ensure we always log the full error and context for upstream handlers
      console.error('[langchain] Error invoking conversationalChain', {
        error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
        invokeInputPreview: { input: typeof invokeInput.input === 'string' ? invokeInput.input.slice(0, 2000) : undefined },
        sessionId: config.sessionId,
        templateId: config.templateId,
        provider: config.provider,
      });
      // Re-throw after logging so upstream API handler can still return 500, but now we have logs.
      throw err;
    }
  } catch (topErr: unknown) {
    console.error('[langchain] runLangChainGenerator unexpected error', {
      error: topErr instanceof Error ? { message: topErr.message, stack: topErr.stack } : String(topErr),
      sessionId: config?.sessionId,
      templateId: config?.templateId,
      provider: config?.provider,
      messagesCount: Array.isArray(messages) ? messages.length : 0,
    });
    throw topErr;
  }
}



