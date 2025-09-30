# User Story: Workflow Creation Flow

**As a** meeting planner  
**I want** an intelligent, guided workflow creation experience with real-time streaming and smart assistance  
**So that** I can efficiently build complex event planning workflows through natural conversation with immediate visual feedback

## Summary
Implement an advanced end-to-end workflow creation process with streaming AI generation, real-time visualization updates, smart autocomplete integration, proactive AI guidance, and seamless multi-conversation support.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- Seamless streaming integration with real-time workflow diagram updates as AI generates JSON
- Smart autocomplete suggestions during creation conversations (@functions, #steps, user., mrf.)
- Structured AI guidance leading users through trigger → conditions → actions → end process
- Visual progress indicators showing creation phases and streaming status
- Multi-conversation support with workflow creation in dedicated conversation tabs
- Auto-save triggered immediately when AI updates workflow with clear status indicators
- Real-time validation feedback after every workflow update with conversational error recovery
- Visual highlights showing recent changes and AI-suggested improvements
- AI-suggested naming for steps and workflows when names are missing
- Responsive design supporting creation flows on all device sizes

## Acceptance Criteria
- [ ] Implement guided workflow creation initiation:
  - [ ] Blank workflow creation with structured AI guidance
  - [ ] Clone and modify existing workflow option
  - [ ] MRF data analysis for workflow initialization
  - [ ] Structured creation process (trigger → conditions → actions → end)
- [ ] Integrate streaming AI conversation with real-time JSON generation:
  - [ ] Chunk-by-chunk workflow building with live visualization updates
  - [ ] Progressive workflow enhancement during streaming
  - [ ] Stream interruption handling with partial workflow preservation
  - [ ] Smart context switching during creation conversations
- [ ] Add smart autocomplete integration throughout creation process:
  - [ ] Function suggestions (@) during workflow description
  - [ ] Step references (#) for workflow dependencies
  - [ ] Context variables (user., mrf.) for dynamic workflows
  - [ ] Proactive autocomplete based on current creation context
- [ ] Implement structured AI guidance through creation process:
  - [ ] Guided creation flow (trigger → conditions → actions → end)
  - [ ] Step-by-step assistance with clear progression indicators
  - [ ] Intelligent function recommendations based on workflow phase
  - [ ] Best practice suggestions during structured creation
- [ ] Create automatic workflow saving on AI updates:
  - [ ] Immediate auto-save when AI modifies workflow JSON
  - [ ] Clear visual indicators for auto-save status
  - [ ] Draft recovery with complete conversation history
  - [ ] Version tracking for all AI-driven workflow changes
- [ ] Implement validation after every workflow update:
  - [ ] Automatic validation trigger on any workflow modification
  - [ ] Real-time validation feedback without interrupting creation flow
  - [ ] Conversational error recovery with specific guidance for each update
  - [ ] Validation state preservation during streaming updates
- [ ] Add AI-powered naming and metadata suggestions:
  - [ ] Automatic name suggestions for unnamed workflow steps
  - [ ] AI-generated workflow names based on conversation analysis
  - [ ] Smart naming only when steps/workflows lack existing names
  - [ ] Description generation from creation conversation context
- [ ] Create advanced workflow refinement through enhanced conversation:
  - [ ] Natural language workflow modification requests
  - [ ] Visual click-to-edit integration with conversational updates
  - [ ] Iterative refinement with structured guidance maintenance
  - [ ] Conversation history preservation with workflow state correlation
- [ ] Implement real-time validation during creation:
  - [ ] Continuous validation feedback without interrupting flow
  - [ ] Conversational error recovery with specific guidance
  - [ ] Validation warnings and suggestions for improvements
  - [ ] Pre-save validation with comprehensive error reporting
- [ ] Add intelligent workflow naming and metadata management:
  - [ ] AI-suggested workflow names based on conversation analysis
  - [ ] Automatic description generation from creation conversation
  - [ ] Tag suggestions based on workflow content and purpose
  - [ ] Workflow categorization and organization
- [ ] Create advanced draft management and auto-save:
  - [ ] Intelligent auto-save at conversation milestones
  - [ ] Draft recovery with conversation history restoration
  - [ ] Multiple draft versions with comparison capabilities
  - [ ] Collaborative draft sharing and version control
- [ ] Implement workflow creation confirmation and review:
  - [ ] Interactive workflow preview with test execution simulation
  - [ ] Comprehensive creation summary with change highlights
  - [ ] User confirmation with modification options before final save
  - [ ] Creation success feedback with next steps guidance
- [ ] Add advanced workflow testing and validation preview:
  - [ ] Test workflow execution with sample MRF data
  - [ ] Validation preview with detailed error analysis
  - [ ] Performance estimation and optimization suggestions
  - [ ] Integration testing with external systems preview
- [ ] Implement comprehensive undo/redo functionality:
  - [ ] Conversation-level undo/redo with workflow state restoration
  - [ ] Step-by-step creation history with selective rollback
  - [ ] Visual diff display for workflow changes
  - [ ] Bulk operation undo with conversation context preservation
- [ ] Create workflow creation analytics and learning:
  - [ ] Creation time and efficiency metrics
  - [ ] Common creation patterns and template optimization
  - [ ] User success indicators and improvement suggestions
  - [ ] AI assistant effectiveness tracking for creation flows
- [ ] Add comprehensive testing for all creation scenarios:
  - [ ] Unit tests for streaming creation flow (90%+ coverage)
  - [ ] Integration tests with multi-conversation workflow creation
  - [ ] End-to-end tests for complete creation journeys with templates
  - [ ] Performance tests for large workflow creation with streaming
  - [ ] User experience tests for creation flow efficiency
- [ ] Document enhanced creation processes and best practices

## Developer Notes

### Enhanced Creation Flow Architecture
```typescript
interface WorkflowCreationFlow {
  initiateCreation(mrfData?: MRFData): Promise<CreationSession>;
  handleStreamingGeneration(stream: AsyncGenerator<WorkflowChunk>): Promise<WorkflowJSON>;
  processUserRefinement(request: string, context: CreationContext): Promise<WorkflowUpdate>;
  validateAfterUpdate(workflow: WorkflowJSON): ValidationResult;
  autoSaveOnAIUpdate(workflow: WorkflowJSON): Promise<void>;
  guideStructuredCreation(phase: CreationPhase): StructuredGuidance;
}

interface CreationSession {
  sessionId: string;
  workflowId: string;
  conversationId: string;
  currentPhase: CreationPhase;
  context: CreationContext;
  draft: WorkflowDraft;
  history: CreationHistory[];
  autoSaveOnAIUpdate: boolean; // Always true
  structuredGuidance: StructuredGuidance;
}

type CreationPhase = 
  | 'trigger_definition'
  | 'condition_setup' 
  | 'action_configuration'
  | 'end_state_definition'
  | 'refinement'
  | 'validation'
  | 'completion';

interface StructuredGuidance {
  currentPhase: CreationPhase;
  nextPhase?: CreationPhase;
  phaseInstructions: string;
  suggestedFunctions: string[];
  requiredElements: string[];
  completionCriteria: string[];
}
```

### Streaming Workflow Generation
```typescript
class StreamingWorkflowGenerator {
  async *generateWorkflow(
    userDescription: string,
    context: CreationContext
  ): AsyncGenerator<WorkflowGenerationChunk> {
    const enrichedPrompt = await this.enrichCreationPrompt(userDescription, context);
    
    // Stream the AI response
    const aiStream = await this.llmProvider.generateWorkflowStream(enrichedPrompt, context);
    
    let accumulatedWorkflow: Partial<WorkflowJSON> = {};
    
    for await (const chunk of aiStream) {
      // Parse incremental workflow updates
      const workflowUpdate = await this.parseWorkflowChunk(chunk.content);
      
      if (workflowUpdate) {
        accumulatedWorkflow = this.mergeWorkflowUpdate(accumulatedWorkflow, workflowUpdate);
        
        // Validate continuously
        const validation = this.validateWorkflowDraft(accumulatedWorkflow);
        
        yield {
          type: 'workflow_update',
          content: chunk.content,
          workflowDelta: workflowUpdate,
          currentWorkflow: accumulatedWorkflow,
          validation,
          suggestions: await this.generateProactiveSuggestions(accumulatedWorkflow, context)
        };
        
        // Update visualization in real-time
        this.updateVisualization(accumulatedWorkflow);
      } else {
        // Pure conversational content
        yield {
          type: 'conversation',
          content: chunk.content,
          currentWorkflow: accumulatedWorkflow
        };
      }
    }
  }
}
```

### Structured Creation Guidance System
```typescript
class StructuredCreationGuide {
  initiateGuidedCreation(mrfData?: MRFData): StructuredGuidance {
    return {
      currentPhase: 'trigger_definition',
      nextPhase: 'condition_setup',
      phaseInstructions: 'Let\'s start by defining what triggers this workflow. What event should start the process?',
      suggestedFunctions: ['onMRFSubmit', 'onScheduledEvent', 'onAPICall'],
      requiredElements: ['trigger type', 'trigger parameters'],
      completionCriteria: ['Valid trigger defined', 'Trigger parameters specified']
    };
  }
  
  progressToNextPhase(currentPhase: CreationPhase, workflow: Partial<WorkflowJSON>): StructuredGuidance {
    switch (currentPhase) {
      case 'trigger_definition':
        return this.setupConditionsPhase(workflow);
      case 'condition_setup':
        return this.configureActionsPhase(workflow);
      case 'action_configuration':
        return this.defineEndStatesPhase(workflow);
      default:
        return this.refinementPhase(workflow);
    }
  }
  
  private setupConditionsPhase(workflow: Partial<WorkflowJSON>): StructuredGuidance {
    return {
      currentPhase: 'condition_setup',
      nextPhase: 'action_configuration',
      phaseInstructions: 'Now let\'s add any conditions or decision points. What criteria should determine the workflow path?',
      suggestedFunctions: ['validateRequestAgainstPolicy', 'checkApprovalRequired'],
      requiredElements: ['decision logic', 'success/failure paths'],
      completionCriteria: ['Conditions defined', 'Branching logic complete']
    };
  }
}
```

### Auto-Save on AI Updates System
```typescript
class AIUpdateAutoSave {
  private autoSaveQueue: Map<string, WorkflowUpdate> = new Map();
  
  async handleAIWorkflowUpdate(
    sessionId: string,
    workflowUpdate: WorkflowUpdate,
    conversationMessage: ConversationMessage
  ): Promise<void> {
    // Immediate auto-save when AI updates workflow
    await this.saveWorkflowUpdate(sessionId, workflowUpdate);
    
    // Update visualization in real-time
    await this.updateVisualization(sessionId, workflowUpdate.workflow);
    
    // Trigger validation after update
    const validation = await this.validateAfterUpdate(workflowUpdate.workflow);
    
    // Store conversation context with workflow state
    await this.correlateConversationWithWorkflow(sessionId, conversationMessage, workflowUpdate);
    
    // Generate names if missing
    await this.suggestNamesIfMissing(workflowUpdate.workflow);
  }
  
  private async saveWorkflowUpdate(sessionId: string, update: WorkflowUpdate): Promise<void> {
    const draft = await this.getDraft(sessionId);
    draft.workflowData = update.workflow;
    draft.lastModified = new Date();
    draft.version++;
    draft.autoSavedByAI = true;
    
    await this.persistDraft(draft);
    
    // Show auto-save indicator to user
    this.showAutoSaveStatus(sessionId, 'saved');
  }
}
```

### AI Naming Suggestion System
```typescript
class AINameSuggestionEngine {
  async suggestNamesIfMissing(workflow: WorkflowJSON): Promise<NamingSuggestions> {
    const suggestions: NamingSuggestions = {
      workflowNames: [],
      stepNames: new Map()
    };
    
    // Suggest workflow name if missing
    if (!workflow.metadata?.name || workflow.metadata.name === '') {
      suggestions.workflowNames = await this.generateWorkflowNames(workflow);
    }
    
    // Suggest step names if missing
    for (const [stepId, step] of Object.entries(workflow.steps)) {
      if (!step.name || step.name === '') {
        const stepNameSuggestions = await this.generateStepNames(step, workflow);
        suggestions.stepNames.set(stepId, stepNameSuggestions);
      }
    }
    
    return suggestions;
  }
  
  private async generateWorkflowNames(workflow: WorkflowJSON): Promise<string[]> {
    const functions = this.extractFunctionNames(workflow);
    const triggerType = this.extractTriggerType(workflow);
    
    return [
      `${triggerType} Workflow`,
      `Event ${functions[0]} Process`,
      `${functions.join(' & ')} Flow`,
      `Automated ${triggerType} Handler`
    ].filter(name => name.length < 50 && name.length > 5);
  }
  
  private async generateStepNames(step: WorkflowStep, workflow: WorkflowJSON): Promise<string[]> {
    const stepType = step.type;
    const functionName = step.action;
    
    switch (stepType) {
      case 'trigger':
        return ['Start Process', 'Initiate Workflow', 'Begin'];
      case 'condition':
        return ['Check Requirements', 'Validate Conditions', 'Decision Point'];
      case 'action':
        return [functionName ? `Execute ${functionName}` : 'Perform Action', 'Process Step'];
      case 'end':
        return ['Complete', 'Finish Process', 'End Workflow'];
      default:
        return ['Workflow Step', 'Process Step'];
    }
  }
}
```

### Validation After Every Update
```typescript
class PostUpdateValidator {
  async validateAfterUpdate(
    workflow: WorkflowJSON,
    updateContext: UpdateContext
  ): Promise<PostUpdateValidationResult> {
    const validationResult: PostUpdateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      updateSpecificIssues: [],
      validationTriggeredBy: updateContext.triggerType
    };
    
    // Immediate schema validation
    const schemaValidation = await this.validateSchema(workflow);
    validationResult.errors.push(...schemaValidation.errors);
    
    // Update-specific validation
    if (updateContext.triggerType === 'ai_update') {
      const aiUpdateValidation = await this.validateAIUpdate(workflow, updateContext.changes);
      validationResult.updateSpecificIssues.push(...aiUpdateValidation.issues);
    }
    
    // Business logic validation
    const businessValidation = await this.validateBusinessLogic(workflow);
    validationResult.warnings.push(...businessValidation.warnings);
    
    // Function existence validation
    const functionValidation = await this.validateFunctions(workflow);
    validationResult.errors.push(...functionValidation.errors);
    
    validationResult.isValid = validationResult.errors.length === 0;
    
    // Trigger conversational error recovery if needed
    if (!validationResult.isValid) {
      await this.initiateConversationalRecovery(validationResult, updateContext);
    }
    
    return validationResult;
  }
  
  private async initiateConversationalRecovery(
    validation: PostUpdateValidationResult,
    context: UpdateContext
  ): Promise<void> {
    const errorExplanation = await this.generateConversationalErrorExplanation(validation.errors);
    const recoveryPrompt = await this.generateRecoveryPrompt(validation, context);
    
    // Send to conversation interface for user guidance
    await this.sendToConversation({
      type: 'validation_error_recovery',
      explanation: errorExplanation,
      recoveryPrompt: recoveryPrompt,
      errors: validation.errors
    });
  }
}
```

### Integration Points
- **Streaming AI Backend**: Real-time workflow generation with visualization updates
- **Smart Autocomplete**: Function and context suggestions during creation conversations
- **Multi-Conversation**: Creation sessions within conversation management framework
- **Validation System**: Continuous validation with conversational error recovery
- **Functions Library**: Dynamic function suggestions and integration
- **Visualization Engine**: Real-time diagram updates during streaming generation

### Testing Requirements
- Unit tests for streaming creation flow with all phases (90%+ coverage)
- Integration tests for AI streaming with real-time visualization updates
- End-to-end tests for complete creation journeys using templates
- Multi-conversation creation testing with context switching
- Performance tests for large workflow creation with streaming
- User experience tests for creation flow efficiency and satisfaction
- Template effectiveness testing and optimization
- Auto-save and draft recovery testing
- Proactive assistance accuracy and timing testing

### Security Notes
- Validate all streaming AI-generated workflow content
- Sanitize user inputs before AI processing and template application
- Implement workflow complexity limits to prevent abuse
- Audit log all creation activities with privacy controls
- Secure draft workflow storage with encryption
- Validate template usage against user permissions
- Implement rate limiting for creation requests
- Protect conversation data during creation sessions