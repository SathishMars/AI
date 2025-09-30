/**
 * LLM-based Workflow Generator
 * SERVER-SIDE ONLY
 * This should only be used in server-side contexts (API routes)
 * For client-side usage, call the /api/generate-workflow endpoint
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { WorkflowJSON } from '../types/workflow';

export interface LLMConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  conversationalMode?: boolean; // NEW: Enable conversational responses
}

export interface WorkflowGenerationResult {
  workflow: Partial<WorkflowJSON>;
  conversationalResponse?: string; // NEW: Conversational response when in conversational mode
  followUpQuestions?: string[]; // NEW: Follow-up questions for parameter collection
  parameterCollectionNeeded?: boolean; // NEW: Indicates if parameter collection is needed
}

export interface ConversationHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface FunctionSchema {
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required: boolean;
      options?: string[];
    };
  };
  examples?: {
    [key: string]: unknown;
  };
}

export interface WorkflowGenerationContext {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    manager: string;
  };
  mrf: {
    id: string;
    title: string;
    purpose: string;
    maxAttendees: number;
    startDate: string;
    endDate: string;
    location: string;
    budget: number;
  };
  availableFunctions: string[];
  functionSchemas?: FunctionSchema[]; // NEW: Detailed function definitions
  conversationHistory?: ConversationHistoryMessage[]; // NEW: Last 10 message pairs
  referenceData?: {
    mrfTemplates?: Array<{ id: string; name: string; category: string; }>;
    users?: Array<{ id: string; name: string; email: string; role: string; }>;
    approvalWorkflows?: Array<{ id: string; name: string; approvers: string[]; }>;
  }; // NEW: Available reference data for intelligent suggestions
  currentDate: string;
}

interface LLMWorkflowGeneratorConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  conversationalMode?: boolean;
}

export class LLMWorkflowGenerator {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private config: LLMWorkflowGeneratorConfig;

  constructor(config: LLMWorkflowGeneratorConfig) {
    // Prevent usage in browser environment
    if (typeof window !== 'undefined') {
      throw new Error(
        'LLMWorkflowGenerator cannot be used in browser environment. ' +
        'Use the /api/generate-workflow endpoint instead for client-side calls.'
      );
    }

    this.config = config;
    
    if (config.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
      });
    } else if (config.provider === 'anthropic') {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey,
      });
    }
  }

  /**
   * Generate workflow JSON from user input using LLM
   */
  async generateWorkflow(
    userInput: string,
    context: WorkflowGenerationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Promise<WorkflowGenerationResult> {
    console.log('🎯 Generating workflow with LLM:', { provider: this.config.provider, model: this.config.model, conversationalMode: this.config.conversationalMode });
    
    if (this.config.conversationalMode) {
      // Conversational mode: Generate workflow AND conversational response with parameter collection
      return await this.generateConversationalResponse(userInput, context, currentWorkflow);
    } else {
      // Traditional mode: JSON only
      const systemPrompt = this.buildSystemPrompt(context, currentWorkflow);
      const userPrompt = this.buildUserPrompt(userInput, context, currentWorkflow);
      
      const workflow = await this.generateWorkflowJSON(systemPrompt, userPrompt);
      return { workflow };
    }
  }

  /**
   * Generate workflow JSON only (traditional mode)
   */
  private async generateWorkflowJSON(systemPrompt: string, userPrompt: string): Promise<Partial<WorkflowJSON>> {
    if (this.config.provider === 'openai') {
      return await this.generateWithOpenAI(systemPrompt, userPrompt);
    } else if (this.config.provider === 'anthropic') {
      return await this.generateWithAnthropic(systemPrompt, userPrompt);
    } else {
      throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * Generate conversational response with workflow and follow-up questions
   */
  private async generateConversationalResponse(
    userInput: string,
    context: WorkflowGenerationContext,
    currentWorkflow?: Partial<WorkflowJSON>
  ): Promise<WorkflowGenerationResult> {
    console.log('🗣️ Generating conversational workflow response');
    
    // Build conversational prompts that encourage parameter collection
    const systemPrompt = this.buildConversationalSystemPrompt(context, currentWorkflow);
    const userPrompt = this.buildConversationalUserPrompt(userInput);
    
    if (this.config.provider === 'openai') {
      return await this.generateConversationalWithOpenAI(systemPrompt, userPrompt);
    } else if (this.config.provider === 'anthropic') {
      return await this.generateConversationalWithAnthropic(systemPrompt, userPrompt);
    } else {
      throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * Build system prompt with workflow generation guidelines
   */
  private buildSystemPrompt(context: WorkflowGenerationContext, currentWorkflow?: Partial<WorkflowJSON>): string {
    return `You are an expert workflow designer. Generate valid JSON workflows based on user requirements using the json-rules-engine format.

WORKFLOW SCHEMA:
{
  "schemaVersion": "1.0",
  "metadata": {
    "id": "string",
    "name": "string", 
    "description": "string",
    "version": "1.0.0",
    "status": "draft",
    "createdAt": "ISO string",
    "tags": ["array of strings"]
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
      "params": {}, // parameters for actions
      "nextSteps": ["array"], // for linear flow
      "onSuccess": "stepName", // for conditional flow
      "onFailure": "stepName"  // for conditional flow
    }
  }
}

AVAILABLE FUNCTIONS:
${context.availableFunctions.map(fn => `- ${fn}`).join('\n')}

JSON-RULES-ENGINE OPERATORS:
- equal, notEqual
- lessThan, lessThanInclusive  
- greaterThan, greaterThanInclusive
- in, notIn, contains, doesNotContain
- startsWith, endsWith

FACT PATTERNS:
- user.{property} - User context: ${context.user ? Object.keys(context.user).join(', ') : 'id, name, email, role, department, manager'}
- mrf.{property} - MRF context: ${context.mrf ? Object.keys(context.mrf).join(', ') : 'id, title, purpose, maxAttendees, startDate, endDate, location, budget'}
- system.currentDate - Current date/time

RULES:
1. ALWAYS return valid JSON only - no explanations
2. Use json-rules-engine condition format exactly
3. Reference available functions only
4. Use provided fact patterns
5. If currentWorkflow is provided, MODIFY and EXTEND it rather than creating from scratch
6. Maintain existing step connections and references when modifying workflows
7. Build upon existing workflow structure intelligently

${currentWorkflow ? `
CURRENT WORKFLOW TO MODIFY:
${JSON.stringify(currentWorkflow, null, 2)}

IMPORTANT: The above workflow already exists. Your task is to modify/extend it based on the user request, not create a completely new workflow.
` : ''}
5. Create logical step flow with proper success/failure paths
6. Generate meaningful step names and descriptions`;
  }

  /**
   * Build user prompt with current context and requirements
   */
  private buildUserPrompt(userInput: string, context: WorkflowGenerationContext, currentWorkflow?: Partial<WorkflowJSON>): string {
    return `Generate a workflow for: "${userInput}"

User Request: ${userInput}

${currentWorkflow ? `
Context: You are modifying an existing workflow. Please understand the current structure and modify/extend it appropriately:

Existing Workflow Steps: ${Object.keys(currentWorkflow.steps || {}).join(', ')}

Modify the workflow to incorporate the user's request while maintaining the existing structure and connections.
` : 'Create a new workflow based on the user request above.'}

CURRENT CONTEXT:
User: ${context.user?.name || 'Unknown'} (${context.user?.role || 'user'}) - Manager: ${context.user?.manager || 'manager@company.com'}
MRF: ${context.mrf?.title || 'New Event'} - Purpose: ${context.mrf?.purpose || 'general'}, Attendees: ${context.mrf?.maxAttendees || 50}
Date: ${context.currentDate || new Date().toISOString()}

Return ONLY the JSON workflow - no other text.`;
  }

  /**
   * Extract JSON from LLM response that might contain extra text
   */
  private extractJSON(content: string): string {
    // First try to find JSON block markers
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }

    // Look for object boundaries
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // If no clear JSON boundaries, try the whole content
    return content.trim();
  }

  /**
   * Generate workflow using OpenAI
   */
  private async generateWithOpenAI(systemPrompt: string, userPrompt: string): Promise<Partial<WorkflowJSON>> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Enhanced system prompt to ensure JSON output
    const enhancedSystemPrompt = systemPrompt + '\n\nIMPORTANT: You MUST respond with valid JSON only. Do not include any explanatory text before or after the JSON.';
    const enhancedUserPrompt = userPrompt + '\n\nRemember: Return ONLY valid JSON workflow format.';

    // Check if model supports json_object format (be conservative)
    const model = this.config.model || 'gpt-4';
    const modelSupportsJsonObject = [
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview', 
      'gpt-4-0125-preview',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-0125'
    ].includes(model);
    
    console.log(`🔍 Current model: ${model}, supports json_object: ${modelSupportsJsonObject}`);
    
    // For generic model names, be conservative and avoid json_object
    if (model === 'gpt-4' || model === 'gpt-3.5-turbo') {
      console.log('⚠️  Using generic model name, avoiding json_object format for compatibility');
    }

    const requestOptions: {
      model: string;
      temperature: number;
      max_tokens: number;
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
      response_format?: { type: 'json_object' };
    } = {
      model,
      messages: [
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: enhancedUserPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    };

    // Only add response_format for supported models
    if (modelSupportsJsonObject) {
      requestOptions.response_format = { type: 'json_object' };
    }

    console.log('🤖 Calling OpenAI with model:', model, 'JSON format:', modelSupportsJsonObject);

    const response = await this.openai.chat.completions.create(requestOptions);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('📝 Raw OpenAI response:', content.substring(0, 200) + '...');

    try {
      // Try to extract JSON from the response
      const jsonString = this.extractJSON(content);
      const parsed = JSON.parse(jsonString);
      console.log('✅ Successfully parsed OpenAI JSON response');
      return parsed;
    } catch (error) {
      console.error('❌ Failed to parse OpenAI response as JSON:', error);
      console.error('Raw content:', content);
      throw new Error(`Invalid JSON response from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate workflow using Anthropic Claude
   */
  private async generateWithAnthropic(systemPrompt: string, userPrompt: string): Promise<Partial<WorkflowJSON>> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    // Enhanced prompts for better JSON output
    const enhancedSystemPrompt = systemPrompt + '\n\nIMPORTANT: You MUST respond with valid JSON only. Do not include any explanatory text before or after the JSON.';
    const enhancedUserPrompt = userPrompt + '\n\nRemember: Return ONLY valid JSON workflow format.';

    console.log('🤖 Calling Anthropic Claude...');

    const response = await this.anthropic.messages.create({
      model: this.config.model || 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.1,
      system: enhancedSystemPrompt,
      messages: [
        { role: 'user', content: enhancedUserPrompt }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Non-text response from Anthropic');
    }

    console.log('📝 Raw Anthropic response:', content.text.substring(0, 200) + '...');

    try {
      // Extract JSON from the response
      const jsonString = this.extractJSON(content.text);
      const parsed = JSON.parse(jsonString);
      console.log('✅ Successfully parsed Anthropic JSON response');
      return parsed;
    } catch (error) {
      console.error('❌ Failed to parse Anthropic response as JSON:', error);
      console.error('Raw content:', content.text);
      throw new Error(`Invalid JSON response from Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream workflow generation for real-time updates
   */
  async *streamWorkflow(
    userInput: string,
    context: WorkflowGenerationContext
  ): AsyncGenerator<{ chunk: string; workflow?: Partial<WorkflowJSON> }> {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(userInput, context);

    if (this.config.provider === 'openai') {
      yield* this.streamWithOpenAI(systemPrompt, userPrompt);
    } else if (this.config.provider === 'anthropic') {
      yield* this.streamWithAnthropic(systemPrompt, userPrompt);
    } else {
      throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }

  /**
   * Stream workflow generation with OpenAI
   */
  private async *streamWithOpenAI(
    systemPrompt: string,
    userPrompt: string
  ): AsyncGenerator<{ chunk: string; workflow?: Partial<WorkflowJSON> }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Enhanced prompts for better JSON output
    const enhancedSystemPrompt = systemPrompt + '\n\nIMPORTANT: You MUST respond with valid JSON only. Do not include any explanatory text before or after the JSON.';
    const enhancedUserPrompt = userPrompt + '\n\nRemember: Return ONLY valid JSON workflow format.';

    // Check if model supports structured output (be conservative)
    const currentModel = this.config.model || 'gpt-4';
    const modelSupportsJsonObject = [
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview',
      'gpt-4-0125-preview', 
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-0125'
    ].includes(currentModel);
    
    console.log(`🔍 Streaming model: ${currentModel}, supports json_object: ${modelSupportsJsonObject}`);
    
    // For generic model names, be conservative and avoid json_object
    if (currentModel === 'gpt-4' || currentModel === 'gpt-3.5-turbo') {
      console.log('⚠️  Using generic model name, avoiding json_object format for streaming compatibility');
    }
    
    const requestOptions: {
      model: string;
      temperature: number;
      max_tokens: number;
      stream: true;
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
      response_format?: { type: 'json_object' };
    } = {
      model: currentModel,
      messages: [
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: enhancedUserPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      stream: true
    };

    // Only add response_format for models that support it
    if (modelSupportsJsonObject) {
      requestOptions.response_format = { type: 'json_object' };
      console.log('🔧 Using json_object response format for streaming');
    } else {
      console.log('🔧 Using text response format for streaming (model limitation)');
    }

    const stream = await this.openai.chat.completions.create(requestOptions);

    let accumulatedContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        accumulatedContent += delta;
        
        // Try to parse partial JSON using our helper method
        let workflow: Partial<WorkflowJSON> | undefined;
        try {
          // Attempt to parse if we have what looks like complete JSON
          if (accumulatedContent.includes('}') && accumulatedContent.includes('{')) {
            const parsed = this.extractJSON(accumulatedContent);
            workflow = parsed as Partial<WorkflowJSON>;
          }
        } catch {
          // Ignore parsing errors during streaming
        }

        yield { chunk: delta, workflow };
      }
    }
  }

  /**
   * Stream workflow generation with Anthropic
   */
  private async *streamWithAnthropic(
    systemPrompt: string,
    userPrompt: string
  ): AsyncGenerator<{ chunk: string; workflow?: Partial<WorkflowJSON> }> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const stream = await this.anthropic.messages.create({
      model: this.config.model || 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true
    });

    let accumulatedContent = '';

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const delta = chunk.delta.text;
        accumulatedContent += delta;

        // Try to parse partial JSON
        let workflow: Partial<WorkflowJSON> | undefined;
        try {
          // Attempt to parse if we have what looks like complete JSON
          const jsonMatch = accumulatedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            workflow = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Ignore parsing errors during streaming
        }

        yield { chunk: delta, workflow };
      }
    }
  }

  /**
   * Build conversational system prompt that encourages parameter collection
   */
  private buildConversationalSystemPrompt(context: WorkflowGenerationContext, currentWorkflow?: Partial<WorkflowJSON>): string {
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
  "schemaVersion": "1.0",
  "metadata": {
    "id": "workflow-{timestamp}",
    "name": "string", 
    "description": "string",
    "version": "1.0.0",
    "status": "draft",
    "createdAt": "${context.currentDate}",
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

AVAILABLE FUNCTIONS:
${context.availableFunctions.map(fn => `- ${fn}`).join('\n')}

${context.functionSchemas && context.functionSchemas.length > 0 ? `
DETAILED FUNCTION SCHEMAS:
${context.functionSchemas.map(schema => `
Function: ${schema.name}
Description: ${schema.description}
Parameters:
${Object.entries(schema.parameters).map(([param, info]) => `  - ${param} (${info.type}): ${info.description}${info.required ? ' [REQUIRED]' : ' [OPTIONAL]'}${info.options ? ` - Options: ${info.options.join(', ')}` : ''}`).join('\n')}
${schema.examples ? `Examples: ${JSON.stringify(schema.examples, null, 2)}` : ''}
`).join('\n')}
` : `
FUNCTIONS REQUIRING PARAMETER COLLECTION:
- onMRFSubmit: requires mrfID (specific MRF form to monitor)
- requestApproval: requires to (who should approve)
- createEvent: requires mrfID (which MRF to use for event creation) 
- sendNotification: requires to, subject (recipient and message)
- onScheduledEvent: requires schedule (when to run)
`}

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
8. For onMRFSubmit triggers with empty params, ask ONLY: "Which MRF form should trigger this workflow?" (suggest available templates if provided)
9. For requestApproval actions with empty params, ask ONLY: "Who should receive the approval request?" (suggest available users/workflows if provided)
10. For createEvent actions with empty params, ask ONLY: "Which MRF should be used for event creation?" (suggest available MRF IDs if provided)
11. For sendNotification actions with empty params, ask ONLY: "Who should receive the notification?" and "What should the subject line be?"
12. For onScheduledEvent triggers with empty params, ask ONLY: "What schedule should trigger this workflow?" (suggest available schedule options if provided)
13. Set parameterCollectionNeeded: true ONLY when required parameters are missing from function schemas
14. Keep responses professional and avoid excessive emojis or icons
15. Focus ONLY on collecting missing required parameters - do not suggest workflow improvements or alternatives
16. If all required parameters are present, set parameterCollectionNeeded: false and do not ask follow-up questions

PARAMETER COLLECTION RULES:
- REQUIRED parameters MUST be collected before workflow can execute
- OPTIONAL parameters should be left empty unless specifically provided by user
- Only ask for parameters that are marked as "required: true" in function schemas
- Do not ask about workflow structure, naming, or design decisions
- Do not ask about business logic or approval thresholds unless they are required parameters
- Stick strictly to the parameter requirements defined in function schemas

VALID FOLLOW-UP QUESTIONS (Examples):
✅ "Which MRF form should trigger this workflow?" (for onMRFSubmit.mrfID parameter)
✅ "Who should receive the approval request?" (for requestApproval.to parameter)
✅ "What should the notification subject be?" (for sendNotification.subject parameter)
✅ "What schedule should trigger this workflow?" (for onScheduledEvent.schedule parameter)

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
- User: ${context.user.name} (${context.user.role} in ${context.user.department})
- Manager: ${context.user.manager}

MRF CONTEXT:
- Current MRF: ${context.mrf.title}
- Max Attendees: ${context.mrf.maxAttendees}
- Location: ${context.mrf.location}
- Purpose: ${context.mrf.purpose}

${currentWorkflow ? `
CURRENT WORKFLOW TO MODIFY:
${JSON.stringify(currentWorkflow, null, 2)}

IMPORTANT: Modify and extend the existing workflow, don't create from scratch.
` : ''}

Remember: Create workflows with empty params for functions that need configuration, then ask conversational questions to collect those parameters!`;
  }

  /**
   * Build conversational user prompt that requests both workflow and questions
   */
  private buildConversationalUserPrompt(userInput: string): string {
    return `User request: "${userInput}"

Please generate:
1. A workflow with appropriate steps (use empty params {} for functions that need configuration)
2. A conversational response explaining what you created
3. Follow-up questions ONLY for missing REQUIRED parameters from function schemas
4. Set parameterCollectionNeeded: true ONLY if required parameters are missing

CRITICAL: Only ask follow-up questions for parameters that are:
- Marked as "required: true" in the function schemas
- Missing from the workflow step params
- Necessary for the function to execute

DO NOT ask questions about:
- Workflow design preferences
- Optional enhancements or features
- Business logic decisions
- Naming conventions
- Additional functionality

Focus exclusively on collecting the minimum required parameters needed for workflow execution.

Respond with the JSON structure specified in the system prompt.`;
  }

  /**
   * Generate conversational response using OpenAI
   */
  private async generateConversationalWithOpenAI(systemPrompt: string, userPrompt: string): Promise<WorkflowGenerationResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const model = this.config.model || 'gpt-4';
    console.log(`🤖 Generating conversational response with OpenAI model: ${model}`);
    
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 3000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('🔍 OpenAI conversational response preview:', content.substring(0, 200) + '...');
    
    try {
      const result = JSON.parse(content);
      
      // Validate the response structure
      if (!result.workflow) {
        throw new Error('Response missing workflow property');
      }
      
      return {
        workflow: result.workflow,
        conversationalResponse: result.conversationalResponse || 'Workflow generated successfully.',
        followUpQuestions: result.followUpQuestions || [],
        parameterCollectionNeeded: result.parameterCollectionNeeded || false
      };
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI conversational response:', parseError);
      console.error('Raw response:', content);
      throw new Error(`Invalid JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
  }

  /**
   * Generate conversational response using Anthropic
   */
  private async generateConversationalWithAnthropic(systemPrompt: string, userPrompt: string): Promise<WorkflowGenerationResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const model = this.config.model || 'claude-3-sonnet-20240229';
    console.log(`🤖 Generating conversational response with Anthropic model: ${model}`);
    
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: 3000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text' || !content.text) {
      throw new Error('No text content from Anthropic');
    }

    console.log('🔍 Anthropic conversational response preview:', content.text.substring(0, 200) + '...');
    
    try {
      const result = JSON.parse(content.text);
      
      // Validate the response structure
      if (!result.workflow) {
        throw new Error('Response missing workflow property');
      }
      
      return {
        workflow: result.workflow,
        conversationalResponse: result.conversationalResponse || 'Workflow generated successfully.',
        followUpQuestions: result.followUpQuestions || [],
        parameterCollectionNeeded: result.parameterCollectionNeeded || false
      };
    } catch (parseError) {
      console.error('❌ Failed to parse Anthropic conversational response:', parseError);
      console.error('Raw response:', content.text);
      throw new Error(`Invalid JSON response from Anthropic: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
  }
}

/**
 * Default function library for workflows
 */
export const DEFAULT_WORKFLOW_FUNCTIONS = [
  'functions.requestApproval',
  'functions.sendEmail',
  'functions.createEvent',
  'functions.sendNotification',
  'functions.logError',
  'functions.updateMRF',
  'functions.checkAvailability',
  'functions.bookVenue',
  'functions.processPayment',
  'functions.generateReport',
  'functions.scheduleFollowup',
  'onMRFSubmit',
  'onEventApproved',
  'onEventRejected',
  'onPaymentReceived'
];

/**
 * Create default context for testing
 */
export function createDefaultContext(): WorkflowGenerationContext {
  return {
    user: {
      id: 'user123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Event Coordinator',
      department: 'Events',
      manager: 'jane.smith@example.com'
    },
    mrf: {
      id: 'mrf456',
      title: 'Annual Company Retreat',
      purpose: 'internal',
      maxAttendees: 150,
      startDate: '2025-10-15',
      endDate: '2025-10-17',
      location: 'Conference Center',
      budget: 50000
    },
    availableFunctions: DEFAULT_WORKFLOW_FUNCTIONS,
    functionSchemas: [], // Will be populated with actual schemas when provided
    conversationHistory: [], // Will be populated with conversation history when provided
    referenceData: undefined, // Will be populated with reference data when provided
    currentDate: new Date().toISOString()
  };
}