// src/app/utils/langchain/langchain-workflow-generator.ts
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { BufferMemory } from "langchain/memory";
import { createWorkflowBuildModel, createConversationModel } from "./providers/llm-factory";
import { getWorkflowToolRegistry, WorkflowToolRegistry } from "./tools/workflow-tools";
import { WorkflowJSON, ValidationResult } from "@/app/types/workflow";
import { getLLMFactory, LLMProvider } from "./providers/llm-factory";

export interface LangChainWorkflowConfig {
  provider?: 'openai' | 'anthropic' | 'lmstudio';
  sessionId: string;
  workflowId: string;
  userId?: string;
  organization?: string;
  conversationalMode?: boolean;
}

export interface WorkflowGenerationContext {
  userRole: string;
  userDepartment: string;
  workflowId?: string;
  workflowName?: string;
  conversationGoal?: 'create' | 'edit';
  currentWorkflowSteps?: string[];
  availableFunctions?: string[];
  mrfData?: {
    id: string;
    title: string;
    purpose: string;
    maxAttendees: number;
    startDate: string;
    endDate: string;
    location: string;
    budget: number;
  };
  functionDefinitions?: Array<{
    name: string;
    description: string;
    usage: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
      options?: string[];
    }>;
    example: Record<string, unknown>;
  }>;
  // Enhanced conversation features from original system
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    manager: string;
  };
  mrf?: {
    id: string;
    title: string;
    purpose: string;
    maxAttendees: number;
    startDate: string;
    endDate: string;
    location: string;
    budget: number;
  };
  referenceData?: {
    mrfTemplates?: Array<{ id: string; name: string; category: string; }>;
    users?: Array<{ id: string; name: string; email: string; role: string; }>;
    approvalWorkflows?: Array<{ id: string; name: string; approvers: string[]; }>;
  };
  currentDate?: string;
}

export interface LangChainWorkflowResult {
  workflow: Partial<WorkflowJSON>;
  conversationalResponse?: string;
  followUpQuestions?: string[];
  parameterCollectionNeeded?: boolean;
  validation?: ValidationResult;
}

/**
 * LangChain-powered workflow generator replacing direct LLM usage
 */
export class LangChainWorkflowGenerator {
  private llm: BaseChatModel;
  private conversationModel: BaseChatModel;
  private toolRegistry: WorkflowToolRegistry;
  private memory?: BufferMemory;
  private config: LangChainWorkflowConfig;
  private currentProvider: LLMProvider;

  constructor(config: LangChainWorkflowConfig) {
    this.config = config;
    const factory = getLLMFactory();
    this.currentProvider = factory.getDefaultProvider();
    this.llm = createWorkflowBuildModel(config.provider);
    this.conversationModel = createConversationModel(config.provider);
    this.toolRegistry = getWorkflowToolRegistry();
    
    console.log(`🚀 LangChain Workflow Generator initialized with ${config.provider || 'default'} provider`);
  }

  /**
   * Format messages for LM Studio compatibility
   * LM Studio with certain models only supports 'user' and 'assistant' roles
   */
  private formatMessagesForLMStudio(messages: BaseMessage[]): BaseMessage[] {
    if (this.currentProvider !== 'lmstudio') {
      return messages;
    }

    const formattedMessages: BaseMessage[] = [];
    
    for (const message of messages) {
      if (message instanceof SystemMessage) {
        // Convert system message to user message with clear instruction formatting
        const systemContent = `SYSTEM INSTRUCTIONS: ${message.content}\n\nPlease follow these instructions when responding.`;
        formattedMessages.push(new HumanMessage(systemContent));
      } else {
        formattedMessages.push(message);
      }
    }
    
    return formattedMessages;
  }

  /**
   * Initialize in-memory buffer for the current session
   * Conversation history is passed explicitly via context, not persisted to MongoDB
   */
  public initializeMemory(): void {
    // Use simple in-memory BufferMemory (not persisted)
    // Conversation history comes from context.conversationHistory
    this.memory = new BufferMemory({
      memoryKey: "chat_history",
      returnMessages: true
    });
    
    console.log(`🧠 In-memory buffer initialized for session: ${this.config.sessionId}`);
  }

  /**
   * Generate workflow using LangChain with tools and memory
   */
  public async generateWorkflow(
    userInput: string,
    context: WorkflowGenerationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Promise<LangChainWorkflowResult> {
    // Ensure memory is initialized
    if (!this.memory) {
      this.initializeMemory();
    }

    // Default to conversational mode for better parameter collection
    const useConversationalMode = this.config.conversationalMode !== false;
    
    console.log(`🔄 Generating workflow in ${useConversationalMode ? 'conversational' : 'direct'} mode`);
    
    if (useConversationalMode) {
      return this.generateConversationalWorkflow(userInput, context, currentWorkflow);
    } else {
      return this.generateDirectWorkflow(userInput, context, currentWorkflow);
    }
  }

  /**
   * Generate workflow using conversational approach with memory
   */
  private async generateConversationalWorkflow(
    userInput: string,
    context: WorkflowGenerationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Promise<LangChainWorkflowResult> {
    const systemPrompt = this.buildConversationalSystemPrompt(context, currentWorkflow);
    
    const messages = [
      new SystemMessage(systemPrompt)
    ];

    // Add conversation history from context (last 10 messages)
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      console.log(`📚 Adding ${context.conversationHistory.length} conversation history messages`);
      
      // Take last 10 messages for context
      const recentHistory = context.conversationHistory.slice(-10);
      
      for (const historyMessage of recentHistory) {
        if (historyMessage.role === 'user') {
          messages.push(new HumanMessage(historyMessage.content));
        } else {
          messages.push(new AIMessage(historyMessage.content));
        }
      }
    }

    // Note: In-memory buffer history is automatically included by LangChain
    // No need to manually load it - it's added via saveContext() below
    
    // Add current user message
    messages.push(new HumanMessage(userInput));

    // Format messages for LM Studio compatibility
    const formattedMessages = this.formatMessagesForLMStudio(messages);

    try {
      const result = await this.conversationModel.invoke(formattedMessages);
      const response = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      
      // Save to memory
      if (this.memory) {
        await this.memory.saveContext(
          { input: userInput },
          { output: response }
        );
      }
      
      const parsedResult = this.parseConversationalResponse(response);
      
      console.log('✅ Conversational workflow generation completed');
      return parsedResult;
      
    } catch (error) {
      console.error('❌ Error in conversational workflow generation:', error);
      return {
        workflow: currentWorkflow || {},
        conversationalResponse: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        followUpQuestions: ["Would you like to try rephrasing your request?"],
        parameterCollectionNeeded: false
      };
    }
  }

  /**
   * Generate workflow directly with structured output
   */
  private async generateDirectWorkflow(
    userInput: string,
    context: WorkflowGenerationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Promise<LangChainWorkflowResult> {
    const systemPrompt = this.buildDirectSystemPrompt(context, currentWorkflow);
    
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userInput)
    ];

    try {
      const result = await this.llm.invoke(messages);
      const response = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      
      const workflow = JSON.parse(response);
      
      console.log('✅ Direct workflow generation completed');
      return {
        workflow,
        conversationalResponse: "Workflow generated successfully.",
        parameterCollectionNeeded: false
      };
      
    } catch (error) {
      console.error('❌ Error in direct workflow generation:', error);
      return {
        workflow: currentWorkflow || {},
        conversationalResponse: `Error generating workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        parameterCollectionNeeded: false
      };
    }
  }

  /**
   * Build system prompt for conversational workflow generation
   */
  private buildConversationalSystemPrompt(
    context: WorkflowGenerationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): string {
    // Use rich function definitions if available, otherwise fall back to tool summaries
    let functionDetails = '';
    if (context.functionDefinitions && context.functionDefinitions.length > 0) {
      functionDetails = context.functionDefinitions.map(func => {
        const params = func.parameters ? func.parameters.map(p => 
          `  - ${p.name} (${p.type}${p.required ? ', required' : ', optional'}): ${p.description}${p.options ? ` - Options: ${p.options.join(', ')}` : ''}`
        ).join('\n') : '';
        
        return `- ${func.name}: ${func.description}
  Usage: ${func.usage}
  Parameters:
${params}
  Example: ${JSON.stringify(func.example, null, 2)}`;
      }).join('\n\n');
    } else {
      const toolSummaries = this.toolRegistry.getToolSummaries();
      functionDetails = toolSummaries.map(tool => 
        `- ${tool.name}: ${tool.description}`
      ).join('\n');
    }

    return `You are Aime, an expert workflow designer assistant. You help users create workflows through conversation.

Your response should be a JSON object with this structure:
{
  "workflow": { /* workflow JSON */ },
  "conversationalResponse": "your explanation to the user",
  "followUpQuestions": ["question 1", "question 2"],
  "parameterCollectionNeeded": true/false
}

WORKFLOW SCHEMA:
{
  "schemaVersion": "1.0.0",
  "metadata": {
    "id": "workflow-{timestamp}",
    "name": "string", 
    "description": "string",
    "version": "1.0.0",
    "status": "draft",
    "createdAt": "${context.currentDate || new Date().toISOString()}",
    "tags": ["ai-generated"]
  },
  "steps": {
    "stepName": {
      "name": "Display Name",
      "type": "trigger|condition|action|end",
      "action": "function.name", // for trigger/action steps
      "condition": { // for condition steps - json-rules-engine format
        "all": [{"fact": "string", "operator": "string", "value": any}],
        "any": [{"fact": "string", "operator": "string", "value": any}]
      },
      "params": {}, // IMPORTANT: Leave empty for functions that need parameter collection
      "nextSteps": ["array"], // for linear flow
      "onSuccess": "stepName", // for conditional flow
      "onFailure": "stepName"  // for conditional flow
    }
  }
}

STEP NAME FORMAT RULES (CRITICAL - MUST FOLLOW):
All workflow step names MUST follow this professional format. This is enforced by validation and non-compliant workflows will be rejected.

PREFIX REQUIREMENTS BY STEP TYPE:
- trigger steps: MUST start with "Start:"
- condition steps: MUST start with "Check:"
- action steps: MUST start with "Action:"
- end steps: MUST start with "End:"

PROFESSIONAL FORMAT: "{Prefix}: {Clear Description}"

GOOD EXAMPLES (USE THESE PATTERNS):
✅ "Start: On MRF Submission"
✅ "Start: Daily at 9 AM"
✅ "Check: Attendees Over 100"
✅ "Check: Budget Exceeds Threshold"
✅ "Action: Request Manager Approval"
✅ "Action: Send Confirmation Email"
✅ "Action: Create Event in Calendar"
✅ "End: Workflow Complete"
✅ "End: Request Denied"

BAD EXAMPLES (DO NOT USE - WILL CAUSE VALIDATION ERRORS):
❌ "🎯 Start: On MRF Submission" (NO emojis - will be rejected)
❌ "✅ Check: Attendees Over 100" (NO emojis - will be rejected)
❌ "📧 Send Email" (NO emojis, missing "Action:" prefix)
❌ "Send Approval Request" (missing "Action:" prefix)
❌ "Check attendance count" (missing "Check:" prefix)
❌ "Workflow Complete" (missing "End:" prefix)
❌ "On Form Submit" (missing "Start:" prefix)

EMOJI PROHIBITION:
- NO emojis anywhere in step names
- NO decorative symbols or icons
- Use professional business language only
- Keep descriptions clear and concise

VALIDATION ENFORCEMENT:
- All step names are validated before saving
- Non-compliant names will cause workflow save to fail
- Validation checks both prefix requirements and emoji presence
- Always follow the format "{Prefix}: {Description}" exactly

AVAILABLE FUNCTIONS:
${functionDetails}

${context.conversationHistory && context.conversationHistory.length > 0 ? `
CONVERSATION HISTORY (Last ${context.conversationHistory.length} messages):
${context.conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}

IMPORTANT: Consider the conversation history when making decisions about parameter collection and workflow modifications.
` : ''}

${context.referenceData ? `
AVAILABLE REFERENCE DATA:
${context.referenceData.mrfTemplates ? `
MRF Templates: ${context.referenceData.mrfTemplates.map(t => `${t.name} (${t.category})`).join(', ')}` : ''}
${context.referenceData.users ? `
Available Users: ${context.referenceData.users.map(u => `${u.name} (${u.role})`).join(', ')}` : ''}
${context.referenceData.approvalWorkflows ? `
Approval Workflows: ${context.referenceData.approvalWorkflows.map(w => `${w.name} - Approvers: ${w.approvers.join(', ')}`).join(', ')}` : ''}
` : ''}

CONVERSATIONAL GUIDELINES:
1. Generate workflow with EMPTY params for functions that need parameter collection
2. Explain what you created in conversationalResponse
3. ONLY ask follow-up questions for parameters that are REQUIRED by the function schemas
4. DO NOT ask questions about optional parameters unless explicitly needed for workflow logic
5. DO NOT ask clarifying questions about workflow design preferences or general requirements
6. Use conversation history to avoid asking for information already provided
7. Reference available templates/users/workflows when suggesting parameters
8. For functions with empty params, ask ONLY for the required parameters from function schemas
9. Set parameterCollectionNeeded: true ONLY when required parameters are missing from function schemas
10. Keep responses professional and avoid excessive emojis or icons
11. Focus ONLY on collecting missing required parameters - do not suggest workflow improvements or alternatives
12. If all required parameters are present, set parameterCollectionNeeded: false and do not ask follow-up questions

PARAMETER COLLECTION RULES:
- REQUIRED parameters MUST be collected before workflow can execute
- OPTIONAL parameters should be left empty unless specifically provided by user
- Only ask for parameters that are marked as "required: true" in function schemas
- Do not ask about workflow structure, naming, or design decisions
- Do not ask about business logic or approval thresholds unless they are required parameters
- Stick strictly to the parameter requirements defined in function schemas

VALID FOLLOW-UP QUESTIONS (Examples):
✅ "Which MRF form should trigger this workflow?" (for required mrfID parameter)
✅ "Who should receive the approval request?" (for required 'to' parameter)
✅ "What should the notification subject be?" (for required 'subject' parameter)
✅ "What schedule should trigger this workflow?" (for required 'schedule' parameter)

INVALID FOLLOW-UP QUESTIONS (Do NOT ask):
❌ "Would you like to add error handling to this workflow?"
❌ "Should we add a delay between steps?"
❌ "Do you want to customize the workflow name?"
❌ "Would you like to add logging for this step?"
❌ "Should we include additional notification recipients?"
❌ "Do you want to set a different approval threshold?"
❌ "Would you like to add validation steps?"

Remember: Only collect parameters that are explicitly required by function schemas - nothing more!

USER CONTEXT:
- User: ${context.user?.name || context.userRole} (${context.user?.role || context.userRole} in ${context.user?.department || context.userDepartment})
- Manager: ${context.user?.manager || 'manager@company.com'}

MRF CONTEXT:
- Current MRF: ${context.mrf?.title || context.mrfData?.title || 'New Event'}
- Max Attendees: ${context.mrf?.maxAttendees || context.mrfData?.maxAttendees || 50}
- Location: ${context.mrf?.location || context.mrfData?.location || 'TBD'}
- Purpose: ${context.mrf?.purpose || context.mrfData?.purpose || 'general'}

${currentWorkflow ? `
CURRENT WORKFLOW TO MODIFY:
${JSON.stringify(currentWorkflow, null, 2)}

IMPORTANT: Modify and extend the existing workflow, don't create from scratch.
` : ''}

Remember: Create workflows with empty params for functions that need configuration, then ask conversational questions to collect those parameters!`;
  }

  /**
   * Build system prompt for direct workflow generation
   */
  private buildDirectSystemPrompt(
    context: WorkflowGenerationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): string {
    // Use rich function definitions if available
    let functionDetails = '';
    if (context.functionDefinitions && context.functionDefinitions.length > 0) {
      functionDetails = context.functionDefinitions.map(func => {
        const params = func.parameters ? func.parameters.map(p => 
          `  - ${p.name} (${p.type}${p.required ? ', required' : ', optional'}): ${p.description}`
        ).join('\n') : '';
        
        return `- ${func.name}: ${func.description}
  Usage: ${func.usage}
  Parameters:
${params}
  Example: ${JSON.stringify(func.example, null, 2)}`;
      }).join('\n\n');
    } else {
      const toolSummaries = this.toolRegistry.getToolSummaries();
      functionDetails = toolSummaries.map(tool => 
        `- ${tool.name}: ${tool.description}`
      ).join('\n');
    }

    return `You are a workflow generation AI. Generate valid workflow JSON based on user requirements.

AVAILABLE FUNCTIONS:
${functionDetails}

CONTEXT:
- User Role: ${context.userRole}
- Department: ${context.userDepartment}
- Existing Workflow: ${currentWorkflow ? 'Modify existing' : 'Create new'}

CRITICAL REQUIREMENTS:
1. Generate workflows in EXACT schema format below
2. Use only available functions listed above
3. Include proper step connections (nextSteps, onSuccess, onFailure)
4. Follow json-rules-engine format for conditions
5. Return ONLY valid JSON - no explanatory text

MANDATORY WORKFLOW SCHEMA:
{
  "schemaVersion": "1.0.0",
  "metadata": {
    "id": "workflow-id",
    "name": "Workflow Name",
    "description": "Brief description",
    "version": "1.0.0",
    "status": "draft"
  },
  "steps": {
    "stepName": {
      "name": "Human-readable step name",
      "type": "trigger|action|condition|end",
      "action": "functionName",
      "params": {},
      "nextSteps": ["nextStep"] | null,
      "onSuccess": "successStep" | null,
      "onFailure": "failureStep" | null
    }
  }
}

STEP TYPES:
- trigger: onMRF, onRequest
- action: sendEmail, requestApproval, createEvent
- condition: Decision points with json-rules-engine conditions
- end: Workflow termination

CONDITIONS (json-rules-engine format):
{
  "type": "condition",
  "params": {
    "conditions": {
      "any": [
        { "fact": "mrf.location", "operator": "equal", "value": "US" },
        { "fact": "mrf.maxAttendees", "operator": "greaterThan", "value": 100 }
      ]
    }
  },
  "onSuccess": "approvalStep",
  "onFailure": "nextStep"
}`;
  }

  /**
   * Parse conversational response and extract structured data
   */
  private parseConversationalResponse(response: string): LangChainWorkflowResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          workflow: parsed.workflow || {},
          conversationalResponse: parsed.conversationalResponse || "Workflow updated.",
          followUpQuestions: parsed.followUpQuestions || [],
          parameterCollectionNeeded: parsed.parameterCollectionNeeded || false
        };
      }

      // If no JSON block, try to parse the entire response
      const parsed = JSON.parse(response);
      return {
        workflow: parsed.workflow || {},
        conversationalResponse: parsed.conversationalResponse || "Workflow updated.",
        followUpQuestions: parsed.followUpQuestions || [],
        parameterCollectionNeeded: parsed.parameterCollectionNeeded || false
      };
    } catch (error) {
      console.warn('⚠️ Failed to parse conversational response:', error);
      return {
        workflow: {},
        conversationalResponse: response,
        followUpQuestions: [],
        parameterCollectionNeeded: false
      };
    }
  }

  /**
   * Get available tools for this generator
   */
  public getAvailableTools(): string[] {
    return this.toolRegistry.getToolSummaries().map(tool => tool.name);
  }

  /**
   * Get tool summaries for context
   */
  public getToolSummaries() {
    return this.toolRegistry.getToolSummaries();
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    // Cleanup any resources if needed
    console.log('🧹 Cleaning up LangChain workflow generator resources');
  }
}

/**
 * Factory function to create LangChain workflow generator
 */
export async function createLangChainWorkflowGenerator(
  config: LangChainWorkflowConfig
): Promise<LangChainWorkflowGenerator> {
  const generator = new LangChainWorkflowGenerator(config);
  await generator.initializeMemory();
  return generator;
}

/**
 * Conversation history message format for LangChain integration
 */
export interface ConversationHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}