# User Story: Multi-LLM Backend Configuration

**As a** system administrator and workflow creator  
**I want** intelligent multi-LLM backend with task-based model selection and streaming responses  
**So that** the system provides optimal AI performance for different workflow tasks with excellent user experience

## Summary
Implement intelligent LLM backend supporting OpenAI/Anthropic with task-based model selection, response streaming, context management, and automated AI accuracy testing.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- Real-time streaming responses in aime chat interface with typing indicators
- Task-specific loading states ("Building workflow...", "Editing step...", "Analyzing MRF...")
- Progressive response display as AI generates content
- Clear error messages with suggested fallback actions
- Context loading indicators when workflow context is being prepared
- AI accuracy metrics display for administrators
- Fallback behavior notifications when switching between providers
- Stream interruption and cancellation capabilities

## Acceptance Criteria
- [ ] Implement OpenAI SDK v5 integration with streaming support
- [ ] Implement Anthropic SDK v0.63.0 integration with streaming support
- [ ] Create task-based model selection system:
  - [ ] Workflow building tasks (complex reasoning)
  - [ ] Workflow editing tasks (incremental changes)
  - [ ] MRF chat interactions (conversational)
  - [ ] Validation error explanations (diagnostic)
- [ ] Implement streaming response handling with real-time UI updates
- [ ] Create workflow-based context management system
- [ ] Add dynamic functions library context injection
- [ ] Implement comprehensive prompt management for different task types
- [ ] Add unified LLM interface abstracting provider differences
- [ ] Create intelligent fallback system between providers
- [ ] Implement rate limiting and quota management per task type
- [ ] Add comprehensive error handling with graceful degradation
- [ ] Create LLM response validation against schema versions
- [ ] Implement response caching with context-aware invalidation
- [ ] Add automated AI accuracy testing framework
- [ ] Create AI performance metrics and monitoring
- [ ] Implement request/response logging with privacy controls
- [ ] Add comprehensive unit tests for all LLM integrations
- [ ] Include integration tests with streaming and context management
- [ ] Add AI accuracy regression testing
- [ ] Document LLM configuration, task routing, and optimization guidelines

## Developer Notes

### Enhanced Environment Configuration
```bash
# LLM Provider Selection
LLM_PRIMARY_PROVIDER=openai # or 'anthropic'
LLM_FALLBACK_PROVIDER=anthropic # automatic fallback

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_WORKFLOW_MODEL=gpt-4 # for workflow building
OPENAI_CHAT_MODEL=gpt-3.5-turbo # for MRF chat
OPENAI_EDIT_MODEL=gpt-4 # for workflow editing
OPENAI_MAX_TOKENS=4000
OPENAI_ENABLE_STREAMING=true

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_WORKFLOW_MODEL=claude-3-opus-20240229 # for workflow building
ANTHROPIC_CHAT_MODEL=claude-3-sonnet-20240229 # for MRF chat
ANTHROPIC_EDIT_MODEL=claude-3-sonnet-20240229 # for workflow editing
ANTHROPIC_MAX_TOKENS=4000
ANTHROPIC_ENABLE_STREAMING=true
```

### Enhanced LLM Architecture
```typescript
interface LLMProvider {
  generateWorkflow(prompt: string, context: WorkflowContext): AsyncGenerator<string, WorkflowJSON>;
  editWorkflow(workflow: WorkflowJSON, editPrompt: string, context: WorkflowContext): AsyncGenerator<string, WorkflowJSON>;
  generateMermaid(workflow: WorkflowJSON): AsyncGenerator<string, string>;
  handleMRFChat(message: string, context: MRFContext): AsyncGenerator<string, string>;
  explainValidationErrors(errors: ValidationError[], context: WorkflowContext): AsyncGenerator<string, string>;
  validateResponse(response: string, expectedType: ResponseType): ValidationResult;
  getHealth(): Promise<HealthStatus>;
  getTaskModel(taskType: AITaskType): string;
}

interface WorkflowContext {
  workflowId?: string;
  conversationHistory: ConversationMessage[];
  functionsLibrary: FunctionsLibrary;
  userContext: UserContext;
  mrfData?: MRFData;
  schemaVersion: string;
  previousWorkflowVersions?: WorkflowVersion[];
}

type AITaskType = 'workflow_build' | 'workflow_edit' | 'mrf_chat' | 'validation_explain' | 'mermaid_generate';

interface StreamingResponse {
  taskId: string;
  taskType: AITaskType;
  provider: string;
  model: string;
  chunks: AsyncGenerator<string>;
  metadata: ResponseMetadata;
}
```

### Task-Based Model Selection
```typescript
interface TaskModelConfig {
  workflow_build: {
    openai: 'gpt-4';
    anthropic: 'claude-3-opus-20240229';
    complexity: 'high';
    streaming: true;
  };
  workflow_edit: {
    openai: 'gpt-4';
    anthropic: 'claude-3-sonnet-20240229';
    complexity: 'medium';
    streaming: true;
  };
  mrf_chat: {
    openai: 'gpt-3.5-turbo';
    anthropic: 'claude-3-sonnet-20240229';
    complexity: 'low';
    streaming: true;
  };
  validation_explain: {
    openai: 'gpt-4';
    anthropic: 'claude-3-sonnet-20240229';
    complexity: 'medium';
    streaming: true;
  };
}
```

### Context Management System
- **Workflow-Scoped Context**: Each workflow maintains its own conversation history and context
- **Functions Library Integration**: Dynamic injection of available functions and their metadata
- **User Context**: Role, permissions, and organization data for personalized responses
- **MRF Integration**: Meeting request form data available for all workflow-related tasks
- **Version Awareness**: Context includes schema versions for compatibility

### Streaming Implementation
```typescript
class StreamingLLMService {
  async *generateWorkflowStream(
    prompt: string, 
    context: WorkflowContext
  ): AsyncGenerator<StreamChunk, WorkflowJSON> {
    const enrichedPrompt = await this.enrichPromptWithContext(prompt, context);
    const stream = await this.provider.createChatCompletionStream({
      messages: [{ role: 'user', content: enrichedPrompt }],
      model: this.getTaskModel('workflow_build'),
      stream: true
    });
    
    let accumulatedResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      accumulatedResponse += content;
      yield { type: 'chunk', content, accumulated: accumulatedResponse };
    }
    
    const workflowJSON = await this.parseAndValidateWorkflow(accumulatedResponse, context);
    return workflowJSON;
  }
}
```

### AI Accuracy Testing Framework
```typescript
interface AIAccuracyTest {
  testId: string;
  taskType: AITaskType;
  inputPrompt: string;
  expectedOutput: any;
  context: WorkflowContext;
  validationCriteria: ValidationCriteria[];
}

interface AccuracyMetrics {
  workflowGenerationAccuracy: number; // % of valid workflows generated
  schemaComplianceRate: number; // % of responses matching schema
  functionUsageAccuracy: number; // % of correct function selections
  editingAccuracy: number; // % of successful workflow edits
  responseTime: number; // average response time
  streamingQuality: number; // % of successful streams
}

class AIAccuracyTester {
  async runAccuracyTests(testSuite: AIAccuracyTest[]): Promise<AccuracyMetrics>;
  async validateWorkflowGeneration(prompt: string, expectedCriteria: string[]): Promise<boolean>;
  async benchmarkProviders(taskType: AITaskType): Promise<ProviderComparison>;
}
```

### Performance Optimizations
- **Context Caching**: Cache enriched contexts to reduce prompt preparation time
- **Response Streaming**: Real-time UI updates during AI generation
- **Intelligent Fallback**: Automatic provider switching on failures
- **Task-Specific Models**: Optimize cost and performance per task type
- **Context Window Management**: Automatic context truncation for large conversations

### Testing Requirements
- Unit tests for each LLM provider implementation with streaming (90%+ coverage)
- Integration tests with streaming response handling
- Context management and injection testing
- AI accuracy regression testing with automated benchmarks
- Performance tests for streaming responses
- Fallback and error recovery testing
- Task-based model selection testing
- Context window management testing

### Security Notes
- Secure API key storage and automatic rotation
- Implement request/response encryption for sensitive data
- Add comprehensive audit logging for all LLM interactions
- Validate and sanitize all LLM responses against injection attacks
- Implement rate limiting and abuse prevention per user/task type
- Context data privacy controls and PII filtering
- Secure streaming connection management
- Function library access controls based on user permissions