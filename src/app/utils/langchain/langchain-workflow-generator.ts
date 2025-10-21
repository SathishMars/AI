// src/app/utils/langchain/langchain-workflow-generator.ts
import { getLLMFactory, type LLMProvider } from './providers/llm-factory';
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { WorkflowDefinition, WorkflowDefinitionSchema } from '@/app/types/workflowTemplate';
import { WorkflowMessage, WorkflowMessageContent, WorkflowMessageSchema } from '@/app/types/aimeWorkflowMessages';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatMessageHistory } from 'langchain/memory';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { workflowFunctionInstructions } from '@/app/data/workflow-tool-defintions';
import { workflowVariableLLMInstructions } from '@/app/data/workflow-variable-definitions';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { sampleWorkflowDefinitionJSONForLlm } from '@/app/data/sampleWorkflowDefinitionJSONForLlm';
import { shortUUIDTool } from './tools/ShortUUID';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { workflowDefinitionValidatorTool } from './tools/WorkflowValidator';
import { GetListOfWorkflowTemplatesTool } from './tools/GetListOfWorkflowTemplates';
import { GetListOfMRFTemplatesTool } from './tools/GetListOfMRFTemplates';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import ShortUniqueId from 'short-unique-id';
import { sanitizeAimeMessage } from './sanitizeResponse';
import aimeInstructions from './instructions/aimeWorkflowGeneralInstructions.md';
import aimeToolInstructions from './instructions/aimeWorkflowToolUsageInstructions.md';

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


// Control whether LangChain internals should print verbose chain logs.
// Set LANGCHAIN_VERBOSE=true to enable; otherwise defaults to false.
const LANGCHAIN_VERBOSE = (process.env.LANGCHAIN_VERBOSE ?? 'false') === 'true' || (process.env.LLM_LOGGING === 'true') || (process.env.LLM_DETAILED_LOGGING === 'true');
// Enable per-iteration logging (each agent action / iteration). Set to 'true' to enable.
const LANGCHAIN_ITERATION_LOGS = (process.env.LANGCHAIN_ITERATION_LOGS ?? 'false') === 'true';


/**
 * Types exported for route usage
 */
export type LangChainWorkflowConfig = {
  sessionId: string;
  templateId?: string;
  provider?: LLMProvider;
  userId?: string;
  account: string;
  organization?: string;
  conversationalMode?: boolean;
};




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
  WORKFLOW_MESSAGE_SCHEMA: JSON.stringify(WorkflowMessageSchema) || ''});

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

${TOOL_USAGE_INSTRUCTIONS}

---

${workflowVariableLLMInstructions}

---
`;




export async function runLangChainGenerator(
  messages: WorkflowMessage[],
  existingWorkflow: WorkflowDefinition | null,
  config: LangChainWorkflowConfig
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






    // Step 2: Create the system instructions
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
- Current Account ID: ${config.account}
- Current Organization ID: ${config.organization ?? 'N/A'}
- Current User ID: ${config.userId ?? 'N/A'}
- Current Time in ISOformat: ${new Date().toISOString()}
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

    writeFileSync('/tmp/systemInstructions.txt', systemInstructions);


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
    // const tools: StructuredTool[] = [workflowDefinitionValidatorTool, shortUUIDTool, GetListOfWorkflowTemplatesTool, GetListOfMRFTemplatesTool];
    const tools: StructuredTool[] = [workflowDefinitionValidatorTool, shortUUIDTool, GetListOfMRFTemplatesTool];



    const agent = await createToolCallingAgent({
      llm: chatModel, // Use your BaseChatModel instance here
      tools,
      prompt: prompt,
    });


    // If iteration logging is enabled, also force the agent executor to be
    // verbose so langchain internals print useful server-side logs.
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: LANGCHAIN_VERBOSE || LANGCHAIN_ITERATION_LOGS,
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
    // Defensive serialization: ensure we only add string message content to
    // the ChatMessageHistory. If the message content is missing or not a
    // string, fallback to JSON.stringify of the content object.
    messageHistory.addMessages(historyMessages.map((m: WorkflowMessage) => {
      return m.sender === 'aime' ? new AIMessage(JSON.stringify(m)) : new HumanMessage(JSON.stringify(m));
    }));
    if (process.env.LLM_LOGGING === 'true' || process.env.LLM_DETAILED_LOGGING === 'true') {
      console.log(`[langchain] Populated message history with ${messages.length} messages`);
    }

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


    const response = await conversationalChain.invoke(invokeInput, {
      configurable: {
        sessionId: config.sessionId
      },
    });
    
    console.info('[langchain] conversationalChain invoke completed', response.output);

    const sanitizedMessage = sanitizeAimeMessage(response.output);

    // Strip the ``````json` and ``` fences
    // if the model added them around the JSON
    const jsonString = typeof sanitizedMessage === 'string' ? sanitizedMessage : JSON.stringify(sanitizedMessage);
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


    // Parse the JSON and return it
    const parsed: WorkflowMessage = JSON.parse(jsonString);
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



