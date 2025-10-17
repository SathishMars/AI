// src/app/utils/langchain/langchain-workflow-generator.ts
import { getLLMFactory, type LLMProvider } from './providers/llm-factory';
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { WorkflowDefinition, WorkflowDefinitionSchema } from '@/app/types/workflowTemplate';
import { WorkflowMessage, WorkflowMessageSchema } from '@/app/types/aimeWorkflowMessages';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatMessageHistory } from 'langchain/memory';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { workflowFunctionInstructions } from '@/app/data/workflow-tool-defintions';
import { workflowVariableLLMInstructions } from '@/app/data/workflow-variable-definitions';
import { zodToJsonSchema } from 'zod-to-json-schema';
import ShortUniqueId from 'short-unique-id';
import { sampleWorkflowDefinitionJSONForLlm } from '@/app/data/sampleWorkflowDefinitionJSONForLlm';
import MrfTemplateDBUtil from '../mrfTemplateDBUtil';
import { shortUUIDTool } from './tools/ShortUUID';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { workflowDefinitionValidatorTool } from './tools/WorkflowValidator';
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

const listOfShortUUIDs = Array.from({ length: 40 }, () => generateShortId()).join(', ');

const RESPONSE_INSTRUCTIONS = `##Response Instructions
Respond with a JSON object that matches the following schema:
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

const TOOL_USAGE_INSTRUCTIONS = `##Tool Usage Instructions
When generating or editing workflows you MUST use the following tools to ensure id uniqueness and schema validation:

- workflowDefinitionValidator: Call this tool with the full workflowDefinition JSON string as its single argument. The tool will return a JSON-stringified validation result. Example call syntax (emit an agent action that the LangChain agent will execute):

  workflowDefinitionValidator('{"steps": [...]}')

  After the tool returns, parse the returned string as JSON, fix any reported validation errors, and then re-run validation until there are no errors.

- shortUUID: Call this tool with an optional {"count": N} argument to generate N short ids in one call. When count > 1 the tool returns a comma-separated list (CSV) of ids. Example:

  idsCsv = shortUUID({"count":40})

  // idsCsv will be a string like: "aB3k9ZpQ1x, bC4l8YtR2z, ..."

Agent behavior requirements:
- Before returning any workflowDefinition, call workflowDefinitionValidator and fix all reported errors.
- When creating or replacing step ids, obtain ids by calling shortUUID() or shortUUID({"count":N}); do not fabricate ids.
- Do not return workflow JSON that has not been validated by workflowDefinitionValidator.
`;

const GENERATION_INSTRUCTIONS = `##Workflow Generation Instructions
The user will input a message describing the workflow they want to create or modify. 
**System rule (hard requirement)**
- ID Uniqueness: Every step object in the workflow must have an id that is globally unique within the entire workflowDefinition.
- No Reuse for Different Objects: An id that has already been used for one step object must never be used again for a different step object.
- Reference vs. Definition:
- When defining a step (an object with type, properties, etc.), you must assign a new, unique id (unless you’re editing that same object).
- When reusing an existing step, do not redefine it—reference it by its existing id (e.g., in next, onConditionPass, onConditionFail).
- Use the workflowDefinitionValidator to validate the workflow before returning it. Fix any issues found by workflowDefinitionValidator. You can use the shortUUID tool to generate new IDs as needed.

Any workflowDefinition (passed by the user or generated by you) will be provided as JSON and will follow the following schema: 
\`\`\`json
${WORKFLOW_DEFINITION_SCHEMA}
\`\`\`
Your task is to generate a new or modified workflow definition that meets the user's requirements.
When given conversation history, use it to decide whether to ask clarifying questions or to modify the workflow. When provided with an existing workflow, prefer editing or annotating that workflow rather than creating an entirely new one unless explicitly requested.
**CRITICAL SYSTEM GUIDELINES — Follow exactly as written**
1. **id is unique shortUUID of length 10**. Use from the supplied list of UUIDs. CRITICAL! **Do not make up your own IDs.**
2. **CRITICAL NO 2 IDs CAN BE THE SAME. Every ID is distinct.DO NOT REUSE IDs**
3. CHECK YOUR WORKFLOW FOR DUPLICATE IDS. IF YOU FIND ANY, FIX THEM BY CREATING NEW ONES USING THE shortUUID TOOL.
4. If the user message is a request to create or modify a workflow, respond with a JSON object containing the updated workflowDefinition field.
5. If the user message is ambiguous or seems to require clarification, respond with a JSON object with the followup questions populated. If a partial workflow can be generated from the conversation history, include it in the response.
6. If the user message is purely conversational and does not relate to workflow creation or modification, you do not need to respond with a workflowDefinition, just respond to the conversation.
7. Do not include sensitive tokens or environment variables in the output.
8. Ensure a workflow always begins with a trigger step and ends with a terminate step.
9. Step Reuse Rule
- Do **not** create new step objects that duplicate existing functionality.
- Reuse existing steps by **referencing their step IDs**.
- Only create new step objects when:
  - They perform a **different function**, or
  - They are used in **parallel branches**.
9. Workflow Readability Rule  
- Wherever possible, **embed** step objects using these fields:  
  - \`next\`, \`onConditionPass\`, or \`onConditionFail\`.  
- Use **ID references** (instead of nested steps) **only when necessary** for clarity or structure.

### list of short UUIDs (length 10) to use for step ids:
${listOfShortUUIDs}

### Example
An example of a good step definition is as follows. This does the nesting properly and uses references only when needed.It does not duplicate steps unnecessarily.:
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
const INSTRUCTIONS = `##INSTRUCTIONS
You are "aime" an assistant that generates and edits workflow JSON structures. You are helpful, precise, and concise. You do not make up information.
${RESPONSE_INSTRUCTIONS}

${GENERATION_INSTRUCTIONS}

Guidance on the step functions to be used to generate the steps:
${STEP_FUNCTION_INSTRUCTIONS}

${JSON_RULES_ENGINE_INSTRUCTIONS}
${TOOL_USAGE_INSTRUCTIONS}

${workflowVariableLLMInstructions}
`;




export async function runLangChainGenerator(
  messages: WorkflowMessage[],
  existingWorkflow: WorkflowDefinition | null,
  config: LangChainWorkflowConfig,
  accountId?: string,
  organizationId?: string,
  userId?: string
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
    // Safe stringify helper intentionally omitted to avoid unused-var warnings; use JSON.stringify directly where needed.
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('No messages provided to generator');
    }
    if (!config || !config.sessionId || !config.templateId) {
      throw new Error('Missing required config parameters');
    }

    // Step1: Create chat model - wrap to capture any provider/model creation errors
    const chatModel = getLLMFactory().createWorkflowEditModel();
    if (!chatModel) {
      throw new Error('Failed to create chat model: chatModel is undefined');
    }
    console.info('[langchain] Initialized chat model ');




    const availableMRFTemplates = accountId ? await MrfTemplateDBUtil.getTemplatesForAccount(accountId, organizationId, userId) : [];


    // Step 2: Create the system instructions
    const systemInstructions = INSTRUCTIONS + (existingWorkflow ? `\nThe existing workflow is: 
\`\`\`json
${JSON.stringify(existingWorkflow, null, 2)} 
\`\`\`
` : '\nNo existing workflow provided.\n') + `
**Use from one of the following** list of available MRF templates for onMRF trigger steps as the params when the user requests an MRF-based trigger.:
${availableMRFTemplates.map(t => `- label: ${t.name}, value: ${t.id}`).join('\n')}

`;




    // console.info('[langchain] Created system instructions',systemInstructions);

    // Step 1: Set up the stateless components
    // NOTE: JsonOutputParser was originally created but not used; remove to avoid unused-var warnings.
    // LangChain prompt templates parse f-strings and will error on unmatched braces.
    // Escape literal braces in systemInstructions but preserve the special placeholders we use below.
    const escapeTemplateBraces = (tpl: string) => {
      return tpl.replaceAll('{', '{{').replaceAll('}', '}}');
    };

    console.log('[langchain] system instructions', systemInstructions);

    const escapedSystemInstructions = escapeTemplateBraces(systemInstructions);
    console.debug('[langchain] systemInstructions length', systemInstructions.length, 'escaped length', escapedSystemInstructions.length);

    // Step 3: Create the prompt template
    // Note that we use {chat_history} and {input} as special placeholders that will be replaced by the memory and the input respectively.
    // Do not change these names unless you also change the keys used in RunnableWithMessageHistory below.
    // For use with tools, we also add an agent_scratchpad placeholder
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", escapedSystemInstructions],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    console.log('[langchain] created prompt with the right placeholders');


    // Step 4: Create the agent and the agent executor with tools
    const tools: StructuredTool[] = [workflowDefinitionValidatorTool, shortUUIDTool];
    const agent = await createToolCallingAgent({
      llm: chatModel, // Use your BaseChatModel instance here
      tools,
      prompt: prompt,
    });

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    });

    // Step 5: Set up the memory with existing messages
    const messageHistory = new ChatMessageHistory();
    //we need to get the last message only as that is the new user input
    const lastMessage = messages[messages.length - 1];

    // now let us add the other messages to the history
    const historyMessages = messages.slice(0, -1);

    // LangChain / OpenAI v5 expects message content to be properly formatted.
    // For @langchain/core 0.3.x, content can be a string OR an array of content objects.
    // However, when it's an array, each element must be a proper content object (not a nested array).
    messageHistory.addMessages(historyMessages.map((m: WorkflowMessage) => {
      if (m.sender === 'aime') {
        // const aimeMessage = m.content.text + (m.content.followUpQuestions ? `\n**Questions for user:** \n${m.content.followUpQuestions.join('\n')}` : '') + (m.content.followUpOptions ? `\n**Options for user:** \n${JSON.stringify(m.content.followUpOptions)}` : '');
        const aimeMessage = m.content.text + (m.content.followUpQuestions ? `\n**Questions for user:** \n${m.content.followUpQuestions.join('\n')}` : '');
        // Use plain string content - LangChain will convert it appropriately for the API
        return new AIMessage(aimeMessage);
      } else {
        // Use plain string content - LangChain will convert it appropriately for the API
        return new HumanMessage(m.content.text);
      }
    }));
    console.log(`[langchain] Populated message history with ${messages.length} messages`);

    // Step 6: Create the conversational chain with the pre-populated history
    // We will invoke the agentExecutor directly after preparing normalized inputs
    console.log('[langchain] Created agent executor with message history');


    const invokeInput = { input: lastMessage.content.text };

    // Replace your old chain with the agentExecutor
    const conversationalChain = new RunnableWithMessageHistory({
      runnable: agentExecutor,
      getMessageHistory: (sessionId) => {
        void sessionId;
        return messageHistory;
      },
      inputMessagesKey: "input",
      historyMessagesKey: "chat_history", // This matches the placeholder name in agentPrompt
    });

    console.info('[langchain] invoking conversationalChain', {
      sessionId: config.sessionId,
      templateId: config.templateId,
      provider: config.provider,
      conversationalMode: config.conversationalMode ?? true,
      messagesCount: messages.length,
      lastMessagePreview: typeof lastMessage.content.text === 'string' ? lastMessage.content.text.slice(0, 300) : undefined,
    });

    // DEBUG: Log the message history to see what's being sent
    const histMsgs = await messageHistory.getMessages();
    console.log('[langchain] Message history before invoke:', histMsgs.map((msg, idx) => ({
      index: idx,
      type: msg._getType(),
      contentType: typeof msg.content,
      contentIsArray: Array.isArray(msg.content),
      contentPreview: typeof msg.content === 'string' ? msg.content.slice(0, 100) : Array.isArray(msg.content) ? JSON.stringify(msg.content).slice(0, 200) : 'unknown'
    })));

    // agentExecutor.invoke expects ChainValues; the runtime shape is dynamic so bypass strict typing here
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const response = await conversationalChain.invoke(invokeInput, {
      configurable: {
        sessionId: config.sessionId,
        response_format: { type: 'json_object' },
        output_parser: new JsonOutputParser(),
      },
    });
    // console.info('[langchain] conversationalChain invoke completed', response.output);
    // Log all tool_calls and invalid_tool_calls across the chat history for easier debugging
    const allToolCalls = (response.chat_history || []).flatMap((h: unknown) => {
      if (h && typeof h === 'object') {
        const rec = h as Record<string, unknown>;
        return (rec.tool_calls as unknown[]) ?? [];
      }
      return [];
    });
    const allInvalidToolCalls = (response.chat_history || []).flatMap((h: unknown) => {
      if (h && typeof h === 'object') {
        const rec = h as Record<string, unknown>;
        return (rec.invalid_tool_calls as unknown[]) ?? [];
      }
      return [];
    });
    console.log('[langchain] conversationalChain tools used', JSON.stringify(allToolCalls, null, 2));
    console.log('[langchain] conversationalChain tools failed', JSON.stringify(allInvalidToolCalls, null, 2));

    // Strip the ``````json` and ``` fences
    // if the model added them around the JSON
    const jsonString = typeof response.output === 'string' ? response.output : JSON.stringify(response.output);
    // if the content is of type string and does not have the ```json` or ``` fences, we will read this as the text and construct a valid JSON response with just the text field
    if (typeof response.output === 'string' && !response.output.trim().startsWith('\`\`\`json') && !response.output.trim().startsWith('{')) {
      const textResponse: WorkflowMessage = {
        id: generateShortId(),
        sender: 'aime',
        content: {
          text: response.output,
        },
        timestamp: new Date().toISOString(),
      };
      return { messages: [textResponse], modifiedStepIds: [] };
    }

    const strippedJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    // console.log('[langchain] LLM response (stripped):', strippedJson);

    // Parse the JSON and return it
    const parsed: WorkflowMessage = JSON.parse(strippedJson);
    parsed.timestamp = new Date().toISOString();
    parsed.id = generateShortId();
    return { messages: [parsed], modifiedStepIds: [] };

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



