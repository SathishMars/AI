/**
 * LLM-based Workflow Generator - SERVER-SIDE ONLY
 * This should only be used in server-side contexts (API routes)
 * For client-side usage, call the /api/generate-workflow endpoint
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { WorkflowJSON } from '../types/workflow';

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
  currentDate: string;
}

interface LLMWorkflowGeneratorConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
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
  ): Promise<Partial<WorkflowJSON>> {
    const systemPrompt = this.buildSystemPrompt(context, currentWorkflow);
    const userPrompt = this.buildUserPrompt(userInput, context, currentWorkflow);

    if (this.config.provider === 'openai') {
      return this.generateWithOpenAI(systemPrompt, userPrompt);
    } else if (this.config.provider === 'anthropic') {
      return this.generateWithAnthropic(systemPrompt, userPrompt);
    }

    throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
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
    currentDate: new Date().toISOString()
  };
}