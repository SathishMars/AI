# User Story: AI Prompt Engineering and Context Management

**As a** workflow system and AI assistant  
**I want** intelligent, learning-enabled prompt engineering that adapts and improves over time  
**So that** users get increasingly better workflow generation through personable yet universally accessible AI interactions

## Summary
Design and implement adaptive AI prompt engineering with context prioritization, error recovery, learning capabilities, and task-specific optimization for json-rules-engine compatible workflows.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- AI responses should feel personable and friendly while remaining professional
- Context awareness should be invisible to users but evident in response quality
- Error recovery prompts should guide users with specific, actionable suggestions
- Learning improvements should be transparent ("I've learned from similar requests...")
- Progressive prompt refinement based on user interaction success
- Function-focused suggestions prioritized in AI responses
- Streaming-optimized prompts that provide value in early response chunks
- Graceful handling of context window limitations with smart prioritization

## Acceptance Criteria
- [ ] Design task-specific prompt templates with personable yet universal tone:
  - [ ] Workflow building prompts (comprehensive context)
  - [ ] Workflow editing prompts (incremental changes)
  - [ ] MRF chat prompts (conversational assistance)
  - [ ] Validation error recovery prompts (specific guidance)
- [ ] Implement function-prioritized context injection system:
  - [ ] Dynamic functions library with usage examples
  - [ ] Function categories and relationships
  - [ ] User roles and permissions for function access
  - [ ] Sample MRF structure with function mappings
  - [ ] Company policies related to function usage
- [ ] Create intelligent context prioritization algorithm:
  - [ ] Function-related context gets highest priority
  - [ ] Recent conversation history (sliding window)
  - [ ] User-specific successful patterns
  - [ ] Workflow complexity-based context selection
- [ ] Implement specialized error recovery prompt system:
  - [ ] Schema validation error prompts
  - [ ] Function parameter error prompts
  - [ ] Workflow logic error prompts
  - [ ] Circular dependency error prompts
- [ ] Add learning and adaptation capabilities:
  - [ ] Success/failure tracking for prompt effectiveness
  - [ ] User interaction pattern analysis
  - [ ] Prompt optimization based on outcomes
  - [ ] A/B testing framework for prompt variations
- [ ] Create streaming-optimized prompt engineering:
  - [ ] Front-loaded important context for early streaming chunks
  - [ ] Progressive prompt refinement during streaming
  - [ ] Interruption-safe prompt design
- [ ] Implement prompt versioning and management system
- [ ] Add comprehensive context window management
- [ ] Create prompt performance analytics and optimization
- [ ] Add comprehensive unit tests for all prompt templates
- [ ] Include integration tests with learning system evaluation
- [ ] Add prompt effectiveness regression testing
- [ ] Document prompt engineering guidelines and learning algorithms

## Developer Notes

### Task-Specific Prompt Architecture
```typescript
interface PromptTemplate {
  id: string;
  taskType: AITaskType;
  version: string;
  baseTemplate: string;
  contextSlots: ContextSlot[];
  learningMetrics: LearningMetrics;
  effectivenessScore: number;
  language: string; // 'en' initially, expandable
}

interface PromptContext {
  functions: PrioritizedFunctionContext;
  user: UserContext;
  workflow?: WorkflowContext;
  conversation: ConversationHistory;
  mrf?: MRFContext;
  errorContext?: ErrorRecoveryContext;
}

interface PrioritizedFunctionContext {
  relevantFunctions: FunctionDefinition[]; // highest priority
  categoryContext: FunctionCategoryInfo[];
  usagePatterns: FunctionUsagePattern[];
  examples: FunctionExampleSet[];
}
```

### Enhanced MRF Structure for Function Mapping
```json
{
  "meetingRequest": {
    "id": "mrf_12345",
    "title": "Q4 Planning Session",
    "requester": {
      "name": "John Doe",
      "email": "john.doe@company.com",
      "department": "Engineering",
      "role": "Senior Manager"
    },
    "details": {
      "numberOfAttendees": 25,
      "duration": 120,
      "preferredDate": "2025-10-15",
      "budget": 5000,
      "meetingType": "Planning",
      "requiresApproval": true,
      "cateringRequired": true,
      "externalAttendees": false
    },
    "resources": {
      "roomType": "Conference Room",
      "avRequirements": ["Projector", "Microphone"],
      "cateringType": "Lunch"
    },
    "suggestedFunctions": {
      "validation": ["validateRequestAgainstPolicy"],
      "approval": ["requestApproval"],
      "eventCreation": ["createAnEvent"],
      "feedback": ["surveyForFeedback"]
    }
  }
}
```

### Function-Prioritized Context Strategy
```typescript
class ContextPrioritizer {
  prioritizeContext(userInput: string, availableContext: PromptContext): PrioritizedContext {
    // 1. Function-related context (highest priority)
    const relevantFunctions = this.extractRelevantFunctions(userInput, availableContext.functions);
    
    // 2. Recent successful patterns
    const successPatterns = this.getSuccessfulPatterns(userInput, availableContext.conversation);
    
    // 3. User context and permissions
    const userContext = this.filterByPermissions(availableContext.user);
    
    // 4. Workflow-specific context
    const workflowContext = this.getWorkflowSpecificContext(availableContext.workflow);
    
    return this.assembleContext(relevantFunctions, successPatterns, userContext, workflowContext);
  }
}
```

### Error Recovery Prompt System
```typescript
interface ErrorRecoveryPrompt {
  errorType: ValidationErrorType;
  template: string;
  examples: ErrorExample[];
  suggestedFixes: string[];
  relatedFunctions: string[];
}

const errorRecoveryPrompts = {
  SCHEMA_VIOLATION: {
    template: "I notice there's an issue with the workflow structure. Let me help you fix this step by step...\n\nThe problem: {errorDescription}\n\nHere's what we can do: {suggestedFixes}\n\nWould you like me to: {actionOptions}",
    examples: ["Missing required step connections", "Invalid condition format"],
    suggestedFixes: ["Add missing step connections", "Fix condition syntax", "Validate step dependencies"]
  },
  FUNCTION_PARAMETER_ERROR: {
    template: "The function '{functionName}' needs some adjustments to work properly...\n\nThe issue: {parameterError}\n\nExpected format: {expectedFormat}\n\nShall I help you correct this?",
    examples: ["Missing required parameter", "Invalid parameter type"],
    suggestedFixes: ["Add missing parameters", "Fix parameter types", "Provide parameter examples"]
  },
  CIRCULAR_DEPENDENCY: {
    template: "I found a circular reference in your workflow that could cause issues...\n\nThe loop: {dependencyChain}\n\nLet's redesign this section to create a clear flow. Here are some options: {restructureOptions}",
    examples: ["Step A → Step B → Step A", "Condition loops back to itself"],
    suggestedFixes: ["Break the loop with end condition", "Add intermediate steps", "Redesign flow logic"]
  }
};
```

### Learning and Adaptation System
```typescript
interface LearningMetrics {
  promptId: string;
  successRate: number; // % of successful workflow generations
  userSatisfaction: number; // from user feedback
  iterationsToSuccess: number; // avg attempts needed
  commonFailureReasons: string[];
  improvementSuggestions: string[];
}

class PromptLearningSystem {
  trackInteraction(promptId: string, userInput: string, outcome: InteractionOutcome): void;
  analyzePatterns(): PromptOptimization[];
  suggestImprovements(promptId: string): PromptImprovement[];
  evolvePrompts(): UpdatedPromptTemplate[];
}

interface InteractionOutcome {
  success: boolean;
  workflowValid: boolean;
  userContinued: boolean;
  validationErrors: ValidationError[];
  timeToCompletion: number;
  userFeedback?: string;
}
```

### Streaming-Optimized Prompt Design
```typescript
interface StreamingPromptStrategy {
  frontLoadContext: boolean; // Important context first
  progressiveRefinement: boolean; // Refine as more context streams
  chunkOptimization: boolean; // Optimize for meaningful chunks
  interruptionSafe: boolean; // Handle mid-stream interruptions
}

const workflowBuildingPrompt = `
# Context (Front-loaded for streaming)
Available functions: {prioritizedFunctions}
User role: {userRole}
MRF data: {mrfSummary}

# Task
Create a workflow for: {userRequest}

# Guidelines (Stream-friendly)
1. Start with the trigger step
2. Add conditions based on MRF data
3. Use appropriate functions from the library
4. Ensure proper error handling

# Expected Output (Progressive)
I'll build this step by step:
1. First, the trigger...
2. Then, any conditions...
3. Finally, the actions...
`;
```

### Context Window Management
```typescript
class ContextWindowManager {
  private maxTokens: number = 4000;
  private reservedTokens: number = 500; // for response
  
  optimizeContext(context: PromptContext): OptimizedContext {
    const prioritized = this.prioritizeContext(context);
    const fitted = this.fitToWindow(prioritized);
    return this.validateContext(fitted);
  }
  
  private prioritizeContext(context: PromptContext): PrioritizedContext {
    return {
      essential: context.functions, // Always include
      important: context.workflow?.currentStep,
      optional: context.conversation?.history.slice(-5), // Recent history
      expandable: context.user?.preferences
    };
  }
}
```

### Multi-language Preparation
```typescript
interface LocalizedPrompt {
  language: string;
  template: string;
  culturalAdaptations: string[];
  functionNameTranslations: Record<string, string>;
}

// Initial structure for future expansion
const promptLocalization = {
  'en': { /* English prompts */ },
  // Future: 'es', 'fr', 'de', etc.
};
```

### Testing Requirements
- Unit tests for all prompt templates and learning algorithms (90%+ coverage)
- Integration tests with actual LLM responses and learning outcomes
- A/B testing framework for prompt effectiveness comparison
- Error recovery prompt testing with various validation scenarios
- Context prioritization accuracy testing
- Learning system regression testing
- Performance tests for context window management
- Streaming prompt optimization testing

### Security Notes
- Sanitize all user inputs before prompt injection
- Validate LLM responses for malicious content and prompt injection attacks
- Implement content filtering for inappropriate outputs
- Audit log all AI interactions with learning data for compliance
- Secure storage of learning metrics and user interaction patterns
- Privacy controls for user data in learning system
- Function access validation based on user permissions in prompts