// src/app/utils/llm/openai-provider.ts
import OpenAI from 'openai';
import {
  LLMProvider,
  LLMConfig,
  WorkflowContext,
  AITaskType,
  LLMStreamChunk,
  ResponseType,
  HealthStatus,
  createTaskId,
  estimateTokenCount,
  ValidationError as LLMValidationError
} from '@/app/types/llm';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;
  private client: OpenAI;
  private requestCount: Map<AITaskType, number> = new Map();
  private lastRequestTime: Map<AITaskType, number> = new Map();

  constructor(public readonly config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000
    });
  }

  async* generateWorkflow(
    prompt: string, 
    context: WorkflowContext
  ): AsyncGenerator<LLMStreamChunk, WorkflowJSON> {
    const taskId = createTaskId();
    const taskType: AITaskType = 'workflow_build';
    
    if (!(await this.checkRateLimit(taskType))) {
      throw new Error('Rate limit exceeded for workflow generation');
    }

    const enrichedPrompt = await this.enrichPromptWithContext(prompt, context);
    const model = this.getTaskModel(taskType);
    
    const systemPrompt = this.buildSystemPrompt(taskType);
    
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enrichedPrompt }
        ],
        temperature: this.config.models[taskType].temperature,
        max_tokens: this.config.models[taskType].maxTokens,
        stream: true
      });

      let accumulatedContent = '';
      const startTime = Date.now();
      
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || '';
        accumulatedContent += deltaContent;
        
        const streamChunk: LLMStreamChunk = {
          id: `${taskId}_${Date.now()}`,
          content: deltaContent,
          timestamp: new Date(),
          chunkIndex: 0,
          isComplete: false,
          taskId,
          taskType,
          provider: this.name,
          model,
          metadata: {
            tokensUsed: estimateTokenCount(accumulatedContent),
            responseTime: Date.now() - startTime,
            cacheHit: false,
            modelVersion: model
          }
        };
        
        yield streamChunk;
      }

      // Parse and validate the final workflow
      const workflowJSON = await this.parseWorkflowFromResponse(accumulatedContent, context);
      
      // Final chunk indicating completion
      yield {
        id: `${taskId}_final`,
        content: '',
        timestamp: new Date(),
        chunkIndex: -1,
        isComplete: true,
        taskId,
        taskType,
        provider: this.name,
        model,
        metadata: {
          tokensUsed: estimateTokenCount(accumulatedContent),
          responseTime: Date.now() - startTime,
          cacheHit: false,
          modelVersion: model
        }
      };
      
      return workflowJSON;
      
    } catch (error) {
      throw this.handleError(error, taskType);
    }
  }

  async* editWorkflow(
    workflow: WorkflowJSON,
    editPrompt: string,
    context: WorkflowContext
  ): AsyncGenerator<LLMStreamChunk, WorkflowJSON> {
    const taskId = createTaskId();
    const taskType: AITaskType = 'workflow_edit';
    
    if (!(await this.checkRateLimit(taskType))) {
      throw new Error('Rate limit exceeded for workflow editing');
    }

    const enrichedPrompt = await this.enrichPromptWithContext(
      `Edit the following workflow:\n\n${JSON.stringify(workflow, null, 2)}\n\nEdit request: ${editPrompt}`,
      context
    );
    
    const model = this.getTaskModel(taskType);
    const systemPrompt = this.buildSystemPrompt(taskType);
    
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enrichedPrompt }
        ],
        temperature: this.config.models[taskType].temperature,
        max_tokens: this.config.models[taskType].maxTokens,
        stream: true
      });

      let accumulatedContent = '';
      const startTime = Date.now();
      
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || '';
        accumulatedContent += deltaContent;
        
        yield {
          id: `${taskId}_${Date.now()}`,
          content: deltaContent,
          timestamp: new Date(),
          chunkIndex: 0,
          isComplete: false,
          taskId,
          taskType,
          provider: this.name,
          model,
          metadata: {
            tokensUsed: estimateTokenCount(accumulatedContent),
            responseTime: Date.now() - startTime,
            cacheHit: false,
            modelVersion: model
          }
        };
      }

      const editedWorkflow = await this.parseWorkflowFromResponse(accumulatedContent, context);
      return editedWorkflow;
      
    } catch (error) {
      throw this.handleError(error, taskType);
    }
  }

  async* generateMermaid(
    workflow: WorkflowJSON,
    context: WorkflowContext // Required by interface, used for context enrichment
  ): AsyncGenerator<LLMStreamChunk, string> {
    const taskId = createTaskId();
    const taskType: AITaskType = 'mermaid_generate';
    
    const prompt = `Generate a Mermaid flowchart diagram for this workflow:\n\n${JSON.stringify(workflow, null, 2)}\n\nWorkflow created by: ${context.userContext.name}`;
    const model = this.getTaskModel(taskType);
    const systemPrompt = `You are an expert at creating Mermaid flowchart diagrams. Create a clear, readable flowchart that represents the workflow structure, conditions, and flow paths. Use appropriate Mermaid syntax and include all workflow steps.`;
    
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: this.config.models[taskType].temperature,
        max_tokens: this.config.models[taskType].maxTokens,
        stream: true
      });

      let accumulatedContent = '';
      const startTime = Date.now();
      
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || '';
        accumulatedContent += deltaContent;
        
        yield {
          id: `${taskId}_${Date.now()}`,
          content: deltaContent,
          timestamp: new Date(),
          chunkIndex: 0,
          isComplete: false,
          taskId,
          taskType,
          provider: this.name,
          model,
          metadata: {
            tokensUsed: estimateTokenCount(accumulatedContent),
            responseTime: Date.now() - startTime,
            cacheHit: false,
            modelVersion: model
          }
        };
      }

      return this.extractMermaidFromResponse(accumulatedContent);
      
    } catch (error) {
      throw this.handleError(error, taskType);
    }
  }

  async* handleMRFChat(
    message: string,
    context: WorkflowContext
  ): AsyncGenerator<LLMStreamChunk, string> {
    const taskId = createTaskId();
    const taskType: AITaskType = 'mrf_chat';
    
    const enrichedPrompt = await this.enrichPromptWithContext(message, context);
    const model = this.getTaskModel(taskType);
    const systemPrompt = this.buildSystemPrompt(taskType);
    
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enrichedPrompt }
        ],
        temperature: this.config.models[taskType].temperature,
        max_tokens: this.config.models[taskType].maxTokens,
        stream: true
      });

      let accumulatedContent = '';
      const startTime = Date.now();
      
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || '';
        accumulatedContent += deltaContent;
        
        yield {
          id: `${taskId}_${Date.now()}`,
          content: deltaContent,
          timestamp: new Date(),
          chunkIndex: 0,
          isComplete: false,
          taskId,
          taskType,
          provider: this.name,
          model,
          metadata: {
            tokensUsed: estimateTokenCount(accumulatedContent),
            responseTime: Date.now() - startTime,
            cacheHit: false,
            modelVersion: model
          }
        };
      }

      return accumulatedContent.trim();
      
    } catch (error) {
      throw this.handleError(error, taskType);
    }
  }

  async* explainValidationErrors(
    errors: LLMValidationError[],
    context: WorkflowContext // Required by interface but not used in current implementation
  ): AsyncGenerator<LLMStreamChunk, string> {
    const taskId = createTaskId();
    const taskType: AITaskType = 'validation_explain';
    
    const errorsText = errors.map(e => `- ${e.field}: ${e.message} (${e.severity})`).join('\n');
    const prompt = `User ${context.userContext.name} has these workflow validation errors. Please explain them and provide suggestions for fixing them:\n\n${errorsText}`;
    
    const model = this.getTaskModel(taskType);
    const systemPrompt = this.buildSystemPrompt(taskType);
    
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: this.config.models[taskType].temperature,
        max_tokens: this.config.models[taskType].maxTokens,
        stream: true
      });

      let accumulatedContent = '';
      const startTime = Date.now();
      
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || '';
        accumulatedContent += deltaContent;
        
        yield {
          id: `${taskId}_${Date.now()}`,
          content: deltaContent,
          timestamp: new Date(),
          chunkIndex: 0,
          isComplete: false,
          taskId,
          taskType,
          provider: this.name,
          model,
          metadata: {
            tokensUsed: estimateTokenCount(accumulatedContent),
            responseTime: Date.now() - startTime,
            cacheHit: false,
            modelVersion: model
          }
        };
      }

      return accumulatedContent.trim();
      
    } catch (error) {
      throw this.handleError(error, taskType);
    }
  }

  validateResponse(response: string, expectedType: ResponseType): ValidationResult {
    try {
      switch (expectedType) {
        case 'workflow':
          const workflow = JSON.parse(response);
          if (workflow.steps) {
            return { 
              isValid: true, 
              errors: [], 
              warnings: [],
              info: [{
                id: 'workflow_valid',
                severity: 'info',
                technicalMessage: 'Valid workflow JSON with steps property',
                conversationalExplanation: 'The workflow is properly structured and contains all required steps.'
              }]
            };
          } else {
            return { 
              isValid: false, 
              errors: [{
                id: 'missing_steps',
                severity: 'error',
                technicalMessage: 'Workflow JSON missing required steps property',
                conversationalExplanation: 'The workflow needs to have a "steps" section that defines what actions to take.'
              }], 
              warnings: [],
              info: []
            };
          }
        case 'mermaid':
          const hasMermaid = response.includes('flowchart') || response.includes('graph');
          return { 
            isValid: hasMermaid, 
            errors: hasMermaid ? [] : [{
              id: 'invalid_mermaid',
              severity: 'error',
              technicalMessage: 'Response does not contain valid Mermaid diagram syntax',
              conversationalExplanation: 'The diagram should start with "flowchart" or "graph" to be a valid Mermaid diagram.'
            }], 
            warnings: [],
            info: hasMermaid ? [{
              id: 'mermaid_detected',
              severity: 'info',
              technicalMessage: 'Valid Mermaid diagram syntax detected',
              conversationalExplanation: 'The diagram appears to be properly formatted for visualization.'
            }] : []
          };
        case 'text':
          const hasContent = response.length > 0;
          return { 
            isValid: hasContent, 
            errors: hasContent ? [] : [{
              id: 'empty_response',
              severity: 'error',
              technicalMessage: 'Response is empty',
              conversationalExplanation: 'No content was generated in the response.'
            }], 
            warnings: [],
            info: hasContent ? [{
              id: 'text_response',
              severity: 'info',
              technicalMessage: `Text response with ${response.length} characters`,
              conversationalExplanation: 'Response generated successfully.'
            }] : []
          };
        default:
          return { 
            isValid: true, 
            errors: [], 
            warnings: [],
            info: [{
              id: 'response_accepted',
              severity: 'info',
              technicalMessage: 'Response accepted without specific validation',
              conversationalExplanation: 'The response was processed successfully.'
            }]
          };
      }
    } catch (error) {
      return { 
        isValid: false, 
        errors: [{
          id: 'validation_parse_error',
          severity: 'error',
          technicalMessage: `Response validation failed: ${error}`,
          conversationalExplanation: 'There was an error processing the response. The format might be incorrect.'
        }], 
        warnings: [],
        info: []
      };
    }
  }

  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Simple health check with a minimal request
      await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5
      });
      
      return {
        provider: this.name,
        status: 'healthy',
        responseTime: Date.now() - startTime,
        errorRate: 0,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        provider: this.name,
        status: 'unavailable',
        responseTime: Date.now() - startTime,
        errorRate: 1,
        lastCheck: new Date(),
        details: { error: String(error) }
      };
    }
  }

  getTaskModel(taskType: AITaskType): string {
    return this.config.models[taskType].model;
  }

  estimateTokens(text: string): number {
    return estimateTokenCount(text);
  }

  async enrichPromptWithContext(prompt: string, context: WorkflowContext): Promise<string> {
    const contextParts = [];
    
    // Add user context
    contextParts.push(`User: ${context.userContext.name} (${context.userContext.role} in ${context.userContext.department})`);
    
    // Add MRF context if available
    if (context.mrfData) {
      contextParts.push(`Meeting Request: "${context.mrfData.title}" - ${context.mrfData.attendees} attendees, ${context.mrfData.type} event`);
    }
    
    // Add functions library context
    if (context.functionsLibrary && Object.keys(context.functionsLibrary).length > 0) {
      const functionNames = Object.keys(context.functionsLibrary);
      contextParts.push(`Available functions: ${functionNames.join(', ')}`);
    }
    
    // Add conversation history context (last few messages)
    if (context.conversationHistory.length > 0) {
      const recentMessages = context.conversationHistory.slice(-3);
      const historyText = recentMessages.map(m => `${m.sender}: ${m.content}`).join('\n');
      contextParts.push(`Recent conversation:\n${historyText}`);
    }
    
    const enrichedContext = contextParts.join('\n\n');
    return `${enrichedContext}\n\nUser Request: ${prompt}`;
  }

  truncateContextIfNeeded(context: WorkflowContext, maxTokens: number): WorkflowContext {
    const contextCopy = { ...context };
    let estimatedTokens = this.estimateContextTokens(context);
    
    // If context is too large, truncate conversation history
    while (estimatedTokens > maxTokens && contextCopy.conversationHistory.length > 1) {
      contextCopy.conversationHistory = contextCopy.conversationHistory.slice(1);
      estimatedTokens = this.estimateContextTokens(contextCopy);
    }
    
    return contextCopy;
  }

  async checkRateLimit(taskType: AITaskType): Promise<boolean> {
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(taskType) || 0;
    const requestCount = this.requestCount.get(taskType) || 0;
    
    // Simple rate limiting: max 60 requests per minute per task type
    if (now - lastRequest < 60000) {
      if (requestCount >= 60) {
        return false;
      }
    } else {
      // Reset counter for new minute
      this.requestCount.set(taskType, 0);
    }
    
    this.requestCount.set(taskType, (this.requestCount.get(taskType) || 0) + 1);
    this.lastRequestTime.set(taskType, now);
    
    return true;
  }

  async getCachedResponse(): Promise<string | null> {
    // Simple in-memory cache implementation
    // In production, use Redis or similar
    return null;
  }

  async setCachedResponse(): Promise<void> {
    // Cache implementation
    console.log('Caching not implemented yet');
  }

  // Private helper methods
  private buildSystemPrompt(taskType: AITaskType): string {
    const basePrompt = "You are aime, an AI assistant specializing in event planning workflows.";
    
    switch (taskType) {
      case 'workflow_build':
        return `${basePrompt} Create comprehensive, valid workflow JSON using json-rules-engine format. Include proper conditions, actions, and error handling. Consider user permissions and organizational policies.`;
      
      case 'workflow_edit':
        return `${basePrompt} Edit the workflow JSON carefully, maintaining schema compliance and existing workflow logic. Make minimal changes that achieve the requested modification.`;
      
      case 'mrf_chat':
        return `${basePrompt} Provide helpful, conversational responses about meeting planning and workflow creation. Be friendly and informative.`;
      
      case 'validation_explain':
        return `${basePrompt} Explain workflow validation errors clearly and provide actionable suggestions for fixing them. Be specific and helpful.`;
      
      case 'mermaid_generate':
        return `${basePrompt} Generate clear, well-structured Mermaid flowchart diagrams that accurately represent workflow logic and flow paths.`;
      
      default:
        return basePrompt;
    }
  }

  private async parseWorkflowFromResponse(response: string, context: WorkflowContext): Promise<WorkflowJSON> {
    // Extract JSON from response (handle cases where AI includes extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    try {
      const workflow = JSON.parse(jsonMatch[0]);
      
      // Basic validation
      if (!workflow.steps) {
        throw new Error('Workflow must contain steps');
      }
      
      // Add metadata if missing
      if (!workflow.metadata) {
        workflow.metadata = {
          id: context.workflowId || `workflow_${Date.now()}`,
          name: 'Generated Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      return workflow;
    } catch (error) {
      throw new Error(`Failed to parse workflow JSON: ${error}`);
    }
  }

  private extractMermaidFromResponse(response: string): string {
    // Extract Mermaid diagram from response
    const mermaidMatch = response.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
    if (mermaidMatch) {
      return mermaidMatch[1].trim();
    }
    
    // If no code block, assume the entire response is the diagram
    return response.trim();
  }

  private estimateContextTokens(context: WorkflowContext): number {
    const contextStr = JSON.stringify({
      userContext: context.userContext,
      mrfData: context.mrfData,
      functionsLibrary: Object.keys(context.functionsLibrary || {}),
      conversationHistory: context.conversationHistory.map(m => m.content).join(' ')
    });
    
    return estimateTokenCount(contextStr);
  }

  private handleError(error: unknown, taskType: AITaskType): Error {
    if (error instanceof Error) {
      console.error(`OpenAI ${taskType} error:`, error.message);
      return new Error(`OpenAI ${taskType} failed: ${error.message}`);
    }
    
    console.error(`Unknown OpenAI ${taskType} error:`, error);
    return new Error(`OpenAI ${taskType} failed with unknown error`);
  }
}