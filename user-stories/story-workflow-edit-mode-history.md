# User Story: Workflow Edit Mode and History Management

**As a** workflow creator  
**I want** to edit existing workflows and see our previous conversation history  
**So that** I can refine workflows and understand the context of past decisions

## Summary
Implement edit mode functionality with conversation history storage, retrieval, and incremental workflow updates.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- **Edit Mode Detection:** Clear visual indicators when aime AI detects workflow modification requests
- **Draft/Published States:** Visual distinction between draft versions and published workflows
- **Conversation Continuity:** Seamless display of all workflow-related conversation history with timestamps
- **Responsive History Navigation:** History panel adapts to dual-pane layout from Story 9
- **Streaming Integration:** Real-time validation feedback during edits using streaming validation from Story 8
- **Large History Handling:** Efficient virtualized scrolling for extensive conversation histories
- **Publication Workflow:** Clear publish button with confirmation for finalizing draft changes
- **Edit Context Awareness:** Visual cues when AI recognizes edit mode and references previous context
- **Material-UI Integration:** Use MUI v7 Timeline, Stepper, and Accordion components for history navigation
- **Loading States:** Skeleton loading for conversation history retrieval and version comparisons

## Acceptance Criteria
- [ ] **Draft/Published Version Management:**
  - [ ] Save all workflow modifications as draft versions automatically
  - [ ] Implement explicit publish action to finalize draft changes
  - [ ] Show clear visual distinction between draft and published states
  - [ ] Allow multiple draft iterations before publishing
- [ ] **AI Edit Mode Awareness:**
  - [ ] AI automatically detects when user requests workflow modifications
  - [ ] AI references complete conversation history context in edit mode
  - [ ] AI provides edit-specific prompts and suggestions
  - [ ] AI maintains awareness of draft vs published state
- [ ] **Conversation History Management:**
  - [ ] Store and display all workflow-related conversations (no branching)
  - [ ] Implement efficient pagination for large conversation histories
  - [ ] Support 5-year conversation retention policy
  - [ ] Include conversation search with semantic AI-powered search
- [ ] **Streaming Validation Integration:**
  - [ ] Integrate edit mode with streaming validation system from Story 8
  - [ ] Real-time validation feedback during workflow modifications
  - [ ] Conversational error recovery in edit mode
  - [ ] Validation caching for unchanged workflow segments
- [ ] **Responsive Edit Interface:**
  - [ ] Edit mode works seamlessly in dual-pane layout from Story 9
  - [ ] Conversation continuity preserved during responsive transitions
  - [ ] History navigation adapts to mobile/tablet layouts
- [ ] **Performance and Storage:**
  - [ ] Efficient loading of large conversation histories (virtualization)
  - [ ] Database optimization for 5-year retention requirements
  - [ ] Fast workflow version comparison and diff visualization
- [ ] **Testing Requirements:**
  - [ ] Comprehensive tests for draft/published workflow lifecycle (90%+ coverage)
  - [ ] Integration tests with streaming validation system
  - [ ] Performance tests for large conversation histories
  - [ ] User journey tests for edit mode workflows

## Developer Notes

### Draft/Published Workflow Architecture
```typescript
interface WorkflowVersionSystem {
  workflowId: string;
  publishedVersion?: WorkflowVersion;
  currentDraft?: WorkflowVersion;
  draftHistory: WorkflowVersion[];
  conversationHistory: ConversationSession[];
  metadata: WorkflowMetadata;
}

interface WorkflowVersion {
  versionId: string;
  workflowJSON: WorkflowJSON;
  timestamp: Date;
  status: 'draft' | 'published';
  changeDescription: string;
  conversationContext: string;
  validationState: ValidationResult;
}

// Auto-save draft on every AI modification
class DraftManager {
  async saveAsDraft(
    workflowId: string,
    updatedWorkflow: WorkflowJSON,
    conversationContext: string
  ): Promise<WorkflowVersion> {
    const draftVersion: WorkflowVersion = {
      versionId: generateVersionId(),
      workflowJSON: updatedWorkflow,
      timestamp: new Date(),
      status: 'draft',
      changeDescription: await this.generateChangeDescription(updatedWorkflow),
      conversationContext,
      validationState: await this.streamingValidation.validate(updatedWorkflow)
    };
    
    await this.storage.saveDraftVersion(workflowId, draftVersion);
    await this.notifyUI('draft_saved', draftVersion);
    
    return draftVersion;
  }
  
  async publishDraft(
    workflowId: string,
    draftVersionId: string
  ): Promise<WorkflowVersion> {
    const draft = await this.storage.getDraftVersion(workflowId, draftVersionId);
    
    // Final validation before publishing
    const finalValidation = await this.streamingValidation.validate(draft.workflowJSON);
    
    if (finalValidation.hasErrors) {
      throw new PublishValidationError('Cannot publish draft with validation errors', finalValidation);
    }
    
    const publishedVersion = {
      ...draft,
      status: 'published' as const,
      timestamp: new Date()
    };
    
    await this.storage.publishVersion(workflowId, publishedVersion);
    await this.notifyUI('workflow_published', publishedVersion);
    
    return publishedVersion;
  }
}
```

### AI Edit Mode Awareness System
```typescript
class EditModeAIContext {
  async detectEditModeRequest(
    userMessage: string,
    currentWorkflow: WorkflowJSON,
    conversationHistory: ConversationMessage[]
  ): Promise<EditModeContext> {
    const editIndicators = [
      'modify', 'change', 'update', 'edit', 'adjust', 'fix', 'improve',
      'add step', 'remove step', 'change condition', 'update parameter'
    ];
    
    const isEditRequest = editIndicators.some(indicator => 
      userMessage.toLowerCase().includes(indicator)
    );
    
    if (isEditRequest) {
      return {
        mode: 'edit',
        targetWorkflow: currentWorkflow,
        conversationContext: this.extractRelevantContext(conversationHistory),
        editIntent: await this.classifyEditIntent(userMessage),
        isDraftMode: currentWorkflow.metadata?.status === 'draft'
      };
    }
    
    return { mode: 'continue', conversationContext: conversationHistory };
  }
  
  private async classifyEditIntent(userMessage: string): Promise<EditIntent> {
    // Use AI to classify the type of edit being requested
    const classification = await this.aiProvider.classify({
      text: userMessage,
      categories: [
        'step_modification', 'condition_change', 'parameter_update',
        'workflow_structure', 'function_replacement', 'validation_fix'
      ]
    });
    
    return {
      category: classification.category,
      confidence: classification.confidence,
      suggestedActions: classification.suggestedActions
    };
  }
}
```

### Conversation History with 5-Year Retention
```typescript
class ConversationHistoryManager {
  private readonly RETENTION_YEARS = 5;
  private readonly MAX_MESSAGES_PER_LOAD = 50;
  
  async loadConversationHistory(
    workflowId: string,
    pagination: PaginationOptions = { page: 1, limit: this.MAX_MESSAGES_PER_LOAD }
  ): Promise<ConversationHistoryResponse> {
    // Load with efficient pagination for large histories
    const history = await this.storage.getConversationHistory(workflowId, {
      ...pagination,
      orderBy: 'timestamp',
      direction: 'desc'
    });
    
    // Virtual scrolling support for large datasets
    return {
      messages: history.messages,
      totalCount: history.totalCount,
      hasMore: history.hasMore,
      virtualScrollMetadata: this.generateVirtualScrollMetadata(history)
    };
  }
  
  async saveConversationMessage(
    workflowId: string,
    message: ConversationMessage,
    workflowContext: WorkflowJSON
  ): Promise<void> {
    const enrichedMessage = {
      ...message,
      workflowId,
      timestamp: new Date(),
      workflowSnapshot: workflowContext,
      retentionDate: this.calculateRetentionDate(),
      searchableContent: await this.generateSearchableContent(message)
    };
    
    await this.storage.saveConversationMessage(enrichedMessage);
    
    // Update search index for semantic search
    await this.searchIndex.indexMessage(enrichedMessage);
  }
  
  private calculateRetentionDate(): Date {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + this.RETENTION_YEARS);
    return retentionDate;
  }
  
  // Semantic search using AI embeddings
  async searchConversationHistory(
    workflowId: string,
    query: string
  ): Promise<ConversationSearchResult[]> {
    const queryEmbedding = await this.aiProvider.generateEmbedding(query);
    
    return await this.storage.semanticSearch({
      workflowId,
      queryEmbedding,
      similarity_threshold: 0.7,
      limit: 20
    });
  }
}
```

### Streaming Validation Integration in Edit Mode
```typescript
class EditModeStreamingValidation {
  async validateWorkflowEdit(
    workflowId: string,
    updatedWorkflow: WorkflowJSON,
    conversationContext: ConversationMessage[]
  ): Promise<StreamingValidationResult> {
    // Integrate with Story 8's streaming validation system
    const streamingValidator = new StreamingWorkflowValidator();
    
    return await streamingValidator.validateWithConversationalRecovery({
      workflow: updatedWorkflow,
      conversationContext,
      editMode: true,
      previousVersion: await this.getPreviousVersion(workflowId),
      onValidationError: async (error) => {
        // In edit mode, provide context-aware error messages
        const editContextualError = await this.enrichErrorWithEditContext(
          error,
          conversationContext
        );
        
        await this.conversationInterface.sendEditModeErrorRecovery({
          error: editContextualError,
          workflowId,
          conversationId: this.getCurrentConversationId()
        });
      },
      onValidationSuccess: async (result) => {
        // Auto-save as draft on successful validation
        await this.draftManager.saveAsDraft(
          workflowId,
          updatedWorkflow,
          this.extractConversationContext(conversationContext)
        );
      }
    });
  }
  
  private async enrichErrorWithEditContext(
    error: ValidationError,
    conversationContext: ConversationMessage[]
  ): Promise<EnrichedValidationError> {
    return {
      ...error,
      editContext: {
        relatedConversations: await this.findRelatedConversations(error, conversationContext),
        previousWorkingVersion: await this.findLastWorkingVersion(error),
        suggestedFixes: await this.generateEditModeFixes(error, conversationContext)
      }
    };
  }
}
```

### Storage Strategy with 5-Year Retention
- **Conversation Storage:** Partitioned by year with automatic archiving
- **Draft Versions:** Efficient storage with delta compression
- **Search Indexing:** AI-powered semantic search with vector embeddings
- **Retention Management:** Automated cleanup after 5-year retention period
- **Performance Optimization:** Database indexing for large conversation datasets

### Testing Requirements
- Unit tests for history management (90%+ coverage)
- Integration tests for conversation persistence
- Performance tests for large conversation histories
- Data consistency tests for version tracking
- User experience tests for edit mode workflows

### Security Notes
- Encrypt conversation history at rest
- Implement access controls for workflow editing
- Audit log all workflow modifications
- Secure conversation data transmission
- Implement data retention policies