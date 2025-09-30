# User Story: Workflow Validation and Error Handling

**As a** workflow creator  
**I want** intelligent validation that works seamlessly with aime to guide me through error resolution  
**So that** I can fix problems conversationally and ensure my workflow will execute correctly without interrupting my creation flow

## Summary
Implement post-update validation system with conversational error recovery, streaming-aware validation, and intelligent error prevention integrated with the aime chat interface.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- Conversational error explanations delivered through aime chat interface with full conversation persistence
- Critical error handling that waits for user input before proceeding
- Post-update validation with intelligent caching for unchanged workflow segments
- Visual indicators showing all errors at once but guided resolution one by one
- Validation-enhanced autocomplete with proactive error prevention
- Direct UI modification awareness - AI informed when users edit workflow parameters directly
- Error conversation history persistence for reference and learning
- Progress indicators showing validation caching status and performance benefits
- Contextual error recovery suggestions with priority-based resolution flow
- Multi-conversation error context management with cross-workflow learning

## Acceptance Criteria
- [ ] Implement post-update validation system:
  - [ ] Automatic validation trigger after every workflow modification
  - [ ] Streaming-aware validation that doesn't interrupt AI generation
  - [ ] Efficient validation caching for unchanged workflow portions
  - [ ] Smart validation queuing during rapid updates
- [ ] Create comprehensive validation rule set with dynamic function integration:
  - [ ] Schema compliance validation against versioned schemas
  - [ ] Step connectivity validation (no orphaned steps)
  - [ ] Circular reference detection with path visualization
  - [ ] Dynamic function parameter validation using functions library
  - [ ] Condition logic validation with json-rules-engine compliance
  - [ ] Required field validation with context-aware requirements
  - [ ] Workflow completeness checks based on structured creation phases
  - [ ] Cross-step dependency validation
- [ ] Implement conversational error recovery system:
  - [ ] AI-generated error explanations in natural language
  - [ ] Guided error resolution through aime chat interface
  - [ ] Interactive error fixing with conversation-driven solutions
  - [ ] Error context preservation in conversation history
  - [ ] Multi-step error resolution workflows
- [ ] Add intelligent error priority and display management:
  - [ ] Critical errors shown immediately with conversation interruption
  - [ ] Warnings queued for appropriate conversation moments
  - [ ] Error severity levels (critical, error, warning, suggestion)
  - [ ] Priority-based error resolution guidance
  - [ ] Batch error resolution for multiple related issues
- [ ] Create validation-enhanced autocomplete and error prevention:
  - [ ] Autocomplete filtering based on validation rules
  - [ ] Proactive error prevention suggestions during typing
  - [ ] Function parameter validation in autocomplete
  - [ ] Context-aware validation during smart suggestions
- [ ] Implement advanced error visualization and reporting:
  - [ ] Workflow diagram error highlighting with detailed tooltips
  - [ ] Error path visualization for circular dependencies
  - [ ] Validation report generation with improvement suggestions
  - [ ] Workflow health scoring with trend analysis
  - [ ] Error pattern recognition and learning
- [ ] Add proactive optimization and improvement suggestions:
  - [ ] Best practice recommendations for valid workflows
  - [ ] Performance optimization suggestions
  - [ ] Security and compliance improvement recommendations
  - [ ] Workflow pattern optimization based on successful examples
- [ ] Create validation persistence and learning system:
  - [ ] Error history tracking for pattern recognition
  - [ ] Validation rule effectiveness monitoring
  - [ ] User error resolution pattern learning
  - [ ] Validation improvement suggestions based on usage
- [ ] Implement comprehensive testing for all validation scenarios:
  - [ ] Unit tests for each validation rule with edge cases (90%+ coverage)
  - [ ] Integration tests with conversational error recovery
  - [ ] Performance tests for post-update validation at scale
  - [ ] User experience tests for error resolution effectiveness
  - [ ] Streaming validation testing with concurrent updates
- [ ] Document validation system and error resolution procedures

## Developer Notes

### Post-Update Validation Architecture
```typescript
interface PostUpdateValidationSystem {
  validateAfterUpdate(workflow: WorkflowJSON, updateContext: UpdateContext): Promise<ValidationResult>;
  handleStreamingValidation(stream: WorkflowUpdateStream): AsyncGenerator<ValidationUpdate>;
  initiateConversationalRecovery(errors: ValidationError[], context: ConversationContext): Promise<void>;
  cacheValidationResults(workflowId: string, results: ValidationResult): void;
  optimizeValidationPerformance(workflow: WorkflowJSON, changes: WorkflowChange[]): ValidationStrategy;
}

interface UpdateContext {
  triggerType: 'ai_update' | 'user_edit' | 'autocomplete' | 'streaming_chunk';
  changes: WorkflowChange[];
  conversationId: string;
  sessionId: string;
  previousValidationState?: ValidationResult;
}

interface ValidationStrategy {
  fullValidation: boolean;
  incrementalValidation: boolean;
  cacheablePortions: string[];
  priorityRules: ValidationRule[];
  streamingCompatible: boolean;
}
```

### Enhanced Validation Categories
1. **Streaming-Aware Structural Validation**
   - Schema compliance validation against versioned schemas
   - Required fields presence with streaming tolerance
   - Data type correctness with partial workflow support
   - JSON structure integrity during incremental updates

2. **Dynamic Logical Validation**
   - Step connectivity and flow analysis
   - Circular reference detection with path visualization
   - Unreachable step identification
   - Workflow completeness assessment based on creation phases
   - Cross-step dependency validation

3. **Function Library Integration Validation**
   - Dynamic function existence validation
   - Function parameter validation using live functions library
   - Function version compatibility checking
   - Function permission validation based on user context
   - Function category and usage pattern validation

4. **Enhanced Business Rule Validation**
   - Company policy compliance with dynamic policy updates
   - Resource availability checks with real-time data
   - User permission and role validation
   - MRF data consistency validation
   - Workflow execution feasibility assessment

### Critical Error Handling and User Input Management
```typescript
class CriticalErrorHandler {
  async handleCriticalErrors(
    errors: ValidationError[],
    context: ConversationContext
  ): Promise<CriticalErrorSession> {
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    
    if (criticalErrors.length > 0) {
      // Show all critical errors but handle one by one
      await this.displayAllCriticalErrors(criticalErrors, context);
      
      // Wait for user input before proceeding
      const session = await this.createCriticalErrorSession(criticalErrors, context);
      
      // Block further workflow progression
      await this.blockWorkflowProgression(context.workflowId);
      
      // Guide through resolution one by one
      return await this.guideOneByOneResolution(session);
    }
    
    return null;
  }
  
  private async guideOneByOneResolution(
    session: CriticalErrorSession
  ): Promise<CriticalErrorSession> {
    for (const error of session.criticalErrors) {
      await this.focusOnSingleError(error, session);
      
      // Wait for user response before moving to next error
      const userResponse = await this.waitForUserInput(session.conversationId);
      
      // Process user response and update workflow
      await this.processErrorResolution(error, userResponse, session);
      
      // Re-validate to check if error is resolved
      const revalidation = await this.revalidateAfterFix(session.workflow);
      
      if (!revalidation.hasError(error.id)) {
        await this.confirmErrorResolution(error, session);
      }
    }
    
    return session;
  }
}
```

### UI Modification Awareness System
```typescript
class UIModificationTracker {
  private modificationObserver: MutationObserver;
  private aiNotificationQueue: UIModification[] = [];
  
  initializeUITracking(workflowUIContainer: HTMLElement): void {
    this.modificationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (this.isWorkflowParameterChange(mutation)) {
          this.handleUIModification(mutation);
        }
      });
    });
    
    this.modificationObserver.observe(workflowUIContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'data-parameter']
    });
  }
  
  private async handleUIModification(mutation: MutationRecord): Promise<void> {
    const modification: UIModification = {
      id: generateId(),
      timestamp: new Date(),
      type: this.determineModificationType(mutation),
      stepId: this.extractStepId(mutation.target),
      parameterName: this.extractParameterName(mutation.target),
      oldValue: mutation.oldValue,
      newValue: this.extractNewValue(mutation.target),
      userInitiated: true
    };
    
    // Add to notification queue
    this.aiNotificationQueue.push(modification);
    
    // Trigger validation after UI modification
    await this.triggerValidationAfterUIChange(modification);
    
    // Notify AI of the change
    await this.notifyAIOfUIModification(modification);
  }
  
  private async notifyAIOfUIModification(modification: UIModification): Promise<void> {
    const contextUpdate: AIContextUpdate = {
      type: 'ui_modification',
      modification,
      message: `User directly modified ${modification.parameterName} in ${modification.stepId} from "${modification.oldValue}" to "${modification.newValue}"`,
      requiresAcknowledgment: true
    };
    
    // Send to conversation interface
    await this.sendToConversation({
      type: 'ai_context_update',
      update: contextUpdate,
      conversationId: this.getCurrentConversationId()
    });
  }
}

interface UIModification {
  id: string;
  timestamp: Date;
  type: 'parameter_change' | 'step_addition' | 'step_deletion' | 'connection_change';
  stepId: string;
  parameterName?: string;
  oldValue: any;
  newValue: any;
  userInitiated: boolean;
}
```

### Intelligent Validation Caching System
```typescript
class ValidationCacheManager {
  private cache: Map<string, CachedValidationResult> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  
  async validateWithCaching(
    workflow: WorkflowJSON,
    changes: WorkflowChange[]
  ): Promise<ValidationResult> {
    // Identify unchanged segments
    const unchangedSegments = this.identifyUnchangedSegments(workflow, changes);
    
    // Get cached results for unchanged segments
    const cachedResults = await this.getCachedResults(unchangedSegments);
    
    // Identify segments that need revalidation due to dependencies
    const dependentSegments = this.findDependentSegments(changes);
    
    // Validate only changed segments and their dependencies
    const segmentsToValidate = this.combineSegments(
      this.extractChangedSegments(changes),
      dependentSegments
    );
    
    const newValidationResults = await this.validateSegments(
      workflow,
      segmentsToValidate
    );
    
    // Cache new results
    await this.cacheValidationResults(segmentsToValidate, newValidationResults);
    
    // Merge cached and new results
    return this.mergeValidationResults(cachedResults, newValidationResults);
  }
  
  private identifyUnchangedSegments(
    workflow: WorkflowJSON,
    changes: WorkflowChange[]
  ): WorkflowSegment[] {
    const changedStepIds = new Set(changes.map(c => c.stepId));
    const allStepIds = Object.keys(workflow.steps);
    
    return allStepIds
      .filter(stepId => !changedStepIds.has(stepId))
      .map(stepId => ({
        type: 'step',
        id: stepId,
        hash: this.calculateStepHash(workflow.steps[stepId])
      }));
  }
  
  private findDependentSegments(changes: WorkflowChange[]): WorkflowSegment[] {
    const dependentSegments: WorkflowSegment[] = [];
    
    for (const change of changes) {
      const dependencies = this.dependencyGraph.get(change.stepId) || [];
      dependencies.forEach(depId => {
        dependentSegments.push({
          type: 'step',
          id: depId,
          reason: `Dependent on changed step ${change.stepId}`
        });
      });
    }
    
    return dependentSegments;
  }
}

interface CachedValidationResult {
  segmentId: string;
  segmentHash: string;
  validationResult: Partial<ValidationResult>;
  timestamp: Date;
  dependencies: string[];
  expiresAt: Date;
}
```

### Intelligent Validation Caching System
```typescript
class ValidationCacheManager {
  private cache: Map<string, CachedValidationResult> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  
  async validateWithCaching(
    workflow: WorkflowJSON,
    changes: WorkflowChange[]
  ): Promise<ValidationResult> {
    // Identify unchanged segments
    const unchangedSegments = this.identifyUnchangedSegments(workflow, changes);
    
    // Get cached results for unchanged segments
    const cachedResults = await this.getCachedResults(unchangedSegments);
    
    // Identify segments that need revalidation due to dependencies
    const dependentSegments = this.findDependentSegments(changes);
    
    // Validate only changed segments and their dependencies
    const segmentsToValidate = this.combineSegments(
      this.extractChangedSegments(changes),
      dependentSegments
    );
    
    const newValidationResults = await this.validateSegments(
      workflow,
      segmentsToValidate
    );
    
    // Cache new results
    await this.cacheValidationResults(segmentsToValidate, newValidationResults);
    
    // Merge cached and new results
    return this.mergeValidationResults(cachedResults, newValidationResults);
  }
  
  private identifyUnchangedSegments(
    workflow: WorkflowJSON,
    changes: WorkflowChange[]
  ): WorkflowSegment[] {
    const changedStepIds = new Set(changes.map(c => c.stepId));
    const allStepIds = Object.keys(workflow.steps);
    
    return allStepIds
      .filter(stepId => !changedStepIds.has(stepId))
      .map(stepId => ({
        type: 'step',
        id: stepId,
        hash: this.calculateStepHash(workflow.steps[stepId])
      }));
  }
  
  private findDependentSegments(changes: WorkflowChange[]): WorkflowSegment[] {
    const dependentSegments: WorkflowSegment[] = [];
    
    for (const change of changes) {
      const dependencies = this.dependencyGraph.get(change.stepId) || [];
      dependencies.forEach(depId => {
        dependentSegments.push({
          type: 'step',
          id: depId,
          reason: `Dependent on changed step ${change.stepId}`
        });
      });
    }
    
    return dependentSegments;
  }
}

interface CachedValidationResult {
  segmentId: string;
  segmentHash: string;
  validationResult: Partial<ValidationResult>;
  timestamp: Date;
  dependencies: string[];
  expiresAt: Date;
}
```

### Critical Error Handling and User Input Management
```typescript
class CriticalErrorHandler {
  async handleCriticalErrors(
    errors: ValidationError[],
    context: ConversationContext
  ): Promise<CriticalErrorSession> {
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    
    if (criticalErrors.length > 0) {
      // Show all critical errors but handle one by one
      await this.displayAllCriticalErrors(criticalErrors, context);
      
      // Wait for user input before proceeding
      const session = await this.createCriticalErrorSession(criticalErrors, context);
      
      // Block further workflow progression
      await this.blockWorkflowProgression(context.workflowId);
      
      // Guide through resolution one by one
      return await this.guideOneByOneResolution(session);
    }
    
    return null;
  }
  
  private async guideOneByOneResolution(
    session: CriticalErrorSession
  ): Promise<CriticalErrorSession> {
    for (const error of session.criticalErrors) {
      await this.focusOnSingleError(error, session);
      
      // Wait for user response before moving to next error
      const userResponse = await this.waitForUserInput(session.conversationId);
      
      // Process user response and update workflow
      await this.processErrorResolution(error, userResponse, session);
      
      // Re-validate to check if error is resolved
      const revalidation = await this.revalidateAfterFix(session.workflow);
      
      if (!revalidation.hasError(error.id)) {
        await this.confirmErrorResolution(error, session);
      }
    }
    
    return session;
  }
}
```

### UI Modification Awareness System
```typescript
class UIModificationTracker {
  private modificationObserver: MutationObserver;
  private aiNotificationQueue: UIModification[] = [];
  
  initializeUITracking(workflowUIContainer: HTMLElement): void {
    this.modificationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (this.isWorkflowParameterChange(mutation)) {
          this.handleUIModification(mutation);
        }
      });
    });
    
    this.modificationObserver.observe(workflowUIContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'data-parameter']
    });
  }
  
  private async handleUIModification(mutation: MutationRecord): Promise<void> {
    const modification: UIModification = {
      id: generateId(),
      timestamp: new Date(),
      type: this.determineModificationType(mutation),
      stepId: this.extractStepId(mutation.target),
      parameterName: this.extractParameterName(mutation.target),
      oldValue: mutation.oldValue,
      newValue: this.extractNewValue(mutation.target),
      userInitiated: true
    };
    
    // Add to notification queue
    this.aiNotificationQueue.push(modification);
    
    // Trigger validation after UI modification
    await this.triggerValidationAfterUIChange(modification);
    
    // Notify AI of the change
    await this.notifyAIOfUIModification(modification);
  }
  
  private async notifyAIOfUIModification(modification: UIModification): Promise<void> {
    const contextUpdate: AIContextUpdate = {
      type: 'ui_modification',
      modification,
      message: `User directly modified ${modification.parameterName} in ${modification.stepId} from "${modification.oldValue}" to "${modification.newValue}"`,
      requiresAcknowledgment: true
    };
    
    // Send to conversation interface
    await this.sendToConversation({
      type: 'ai_context_update',
      update: contextUpdate,
      conversationId: this.getCurrentConversationId()
    });
  }
}

interface UIModification {
  id: string;
  timestamp: Date;
  type: 'parameter_change' | 'step_addition' | 'step_deletion' | 'connection_change';
  stepId: string;
  parameterName?: string;
  oldValue: any;
  newValue: any;
  userInitiated: boolean;
}
```

### Enhanced Error Message Framework
```typescript
interface ConversationalValidationError extends ValidationError {
  conversationalExplanation: string;
  recoverySteps: RecoveryStep[];
  interactionRequired: boolean;
  relatedErrors: string[]; // IDs of related errors
  resolutionPriority: number;
  estimatedFixTime: number; // seconds
}

interface RecoveryStep {
  stepNumber: number;
  description: string;
  action: 'user_input' | 'ai_suggestion' | 'automatic_fix';
  expectedOutcome: string;
  alternativeOptions?: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: ConversationalValidationError[];
  warnings: ConversationalValidationError[];
  suggestions: ConversationalValidationError[];
  healthScore: number; // 0-100
  completenessScore: number; // 0-100
  performanceScore: number; // 0-100
  validationTimestamp: Date;
  cacheableResults: CacheableValidationResults;
}
```

### Integration Points
- **Story 1**: Uses versioned schema validation and dynamic functions library
- **Story 4**: Leverages AI for conversational error explanations
- **Story 5**: Uses enhanced prompts for error recovery conversations
- **Story 6**: Integrates with streaming conversation interface
- **Story 7**: Implements post-update validation from creation flow

### Testing Requirements
- Unit tests for all validation rules with streaming scenarios (90%+ coverage)
- Integration tests for conversational error recovery workflows
- Performance tests for post-update validation with large workflows
- User experience tests for error resolution effectiveness
- Streaming validation testing with concurrent updates
- Validation caching accuracy and performance testing
- Error priority management and display timing testing

### Security Notes
- Validate all user inputs before processing during error recovery
- Prevent validation bypass through malformed data or conversation manipulation
- Audit log all validation failures and recovery attempts for security monitoring
- Implement rate limiting for validation requests to prevent abuse
- Secure error message content to prevent information disclosure
- Validate function library integrity before validation execution
- Implement conversation context validation to prevent prompt injection