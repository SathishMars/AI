# User Story: Advanced Workflow Visualization

**As a** workflow creator  
**I want** interactive workflow diagrams with detailed information  
**So that** I can better understand complex workflows and navigate them efficiently

## Summary
Enhance the basic visualization with interactive elements, navigation controls, and detailed step information.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- **Real-time AI Integration:** Dynamic diagram updates when AI modifies workflow during conversation
- **Draft/Published State Visualization:** Clear visual distinction between draft modifications and published workflows
- **Direct Parameter Modification:** Interactive parameter editing within visualization pane triggers AI awareness
- **Dual-Pane Integration:** Full-view button integration with Story 9's responsive layout system
- **Validation Error Visualization:** Real-time error highlighting integrated with Story 8's streaming validation
- **Interactive Diagram Elements:** Hover states, zoom/pan controls, step detail panels without AI conversation triggers
- **Responsive Visualization:** Current approach maintained across devices, future mobile customization planned
- **Performance Optimization:** Smooth interactions maintained for large workflows (50+ steps)
- **Material-UI Integration:** MUI v7 components for interactive controls, overlays, and navigation elements
- **Loading States:** Smooth transitions during real-time workflow updates from AI modifications

## Acceptance Criteria
- [ ] **Real-time Workflow Updates:**
  - [ ] Dynamic Mermaid diagram updates when AI modifies workflow during conversation
  - [ ] Smooth visual transitions during workflow modifications
  - [ ] Real-time validation error highlighting integrated with Story 8
  - [ ] Performance optimization for frequent updates during AI conversations
- [ ] **Draft/Published State Visualization:**
  - [ ] Visual distinction between draft and published workflow elements
  - [ ] Clear indicators for modified vs original workflow steps
  - [ ] Draft state persistence across visualization interactions
  - [ ] Published workflow read-only visual indicators
- [ ] **Interactive Parameter Modification:**
  - [ ] Direct editing of step parameters within visualization pane
  - [ ] Parameter changes trigger AI awareness without conversation initiation
  - [ ] Inline validation feedback for parameter modifications
  - [ ] Auto-save draft functionality for direct parameter edits
- [ ] **Advanced Visualization Features:**
  - [ ] Interactive diagram elements with hover states and tooltips
  - [ ] Zoom and pan controls with smooth animations (mouse wheel, touch)
  - [ ] Step detail panels with comprehensive parameter information
  - [ ] Workflow minimap for navigation of large diagrams
  - [ ] Search and highlight functionality within diagrams
  - [ ] Full-screen visualization mode integrated with Story 9's dual-pane layout
- [ ] **Error and Validation Integration:**
  - [ ] Real-time validation error visualization from Story 8
  - [ ] Error indicators with detailed tooltips
  - [ ] Visual error highlighting without automatic AI conversation triggers
  - [ ] Critical error blocking with visual feedback
- [ ] **Performance and Responsiveness:**
  - [ ] Smooth performance for large workflows (50+ steps)
  - [ ] Responsive design maintaining current visualization approach
  - [ ] Efficient rendering during real-time AI updates
  - [ ] Memory optimization for extended visualization sessions
- [ ] **Testing Requirements:**
  - [ ] Comprehensive tests for real-time update functionality (90%+ coverage)
  - [ ] Performance tests for large workflow rendering and updates
  - [ ] User interaction tests for parameter modification
  - [ ] Visual regression tests for draft/published state differences

## Developer Notes

### Real-time Workflow Visualization Updates
```typescript
class RealTimeWorkflowVisualizer {
  private mermaidRenderer: MermaidRenderer;
  private updateQueue: WorkflowUpdate[] = [];
  private isUpdating: boolean = false;
  
  async handleAIWorkflowUpdate(
    workflowUpdate: WorkflowUpdate,
    conversationContext: ConversationMessage[]
  ): Promise<void> {
    // Queue updates to prevent rendering conflicts
    this.updateQueue.push(workflowUpdate);
    
    if (!this.isUpdating) {
      await this.processUpdateQueue();
    }
  }
  
  private async processUpdateQueue(): Promise<void> {
    this.isUpdating = true;
    
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift()!;
      
      // Calculate visual diff for smooth transitions
      const visualDiff = await this.calculateVisualDiff(
        this.currentWorkflow,
        update.updatedWorkflow
      );
      
      // Apply transition animations
      await this.animateWorkflowTransition(visualDiff);
      
      // Update Mermaid diagram
      await this.mermaidRenderer.updateDiagram(
        update.updatedWorkflow,
        {
          preserveViewport: true,
          highlightChanges: visualDiff.changedSteps,
          animationDuration: 300
        }
      );
      
      // Update draft state visualization
      await this.updateDraftStateIndicators(update.updatedWorkflow);
    }
    
    this.isUpdating = false;
  }
}
```

### Draft/Published State Visual System
```typescript
interface VisualWorkflowState {
  workflowId: string;
  isDraft: boolean;
  publishedVersion?: WorkflowJSON;
  draftVersion?: WorkflowJSON;
  modifiedSteps: Set<string>;
  visualTheme: DraftPublishedTheme;
}

class DraftStateVisualizer {
  private readonly DRAFT_THEME = {
    stepBorder: '#ff9800',        // Orange border for draft steps
    stepBackground: '#fff3e0',    // Light orange background
    modifiedIndicator: '#f57c00', // Darker orange for modifications
    publishedStepBorder: '#4caf50', // Green border for published
    publishedBackground: '#e8f5e9'  // Light green background
  };
  
  async visualizeDraftState(
    workflow: WorkflowJSON,
    draftState: DraftState
  ): Promise<MermaidVisualizationConfig> {
    const visualConfig: MermaidVisualizationConfig = {
      stepStyles: new Map(),
      connectionStyles: new Map(),
      indicators: new Map()
    };
    
    Object.entries(workflow.steps).forEach(([stepId, step]) => {
      const isDraftStep = draftState.modifiedSteps.has(stepId);
      
      visualConfig.stepStyles.set(stepId, {
        border: isDraftStep ? this.DRAFT_THEME.stepBorder : this.DRAFT_THEME.publishedStepBorder,
        background: isDraftStep ? this.DRAFT_THEME.stepBackground : this.DRAFT_THEME.publishedBackground,
        opacity: draftState.isDraft ? (isDraftStep ? 1.0 : 0.7) : 1.0
      });
      
      if (isDraftStep) {
        visualConfig.indicators.set(stepId, {
          type: 'draft_modification',
          icon: 'edit',
          color: this.DRAFT_THEME.modifiedIndicator,
          tooltip: 'This step has been modified in the current draft'
        });
      }
    });
    
    return visualConfig;
  }
}
```

### Direct Parameter Modification System
```typescript
class ParameterModificationHandler {
  private aiContextManager: AIContextManager;
  private draftManager: DraftManager;
  
  async handleParameterEdit(
    stepId: string,
    parameterName: string,
    oldValue: any,
    newValue: any,
    workflowContext: WorkflowJSON
  ): Promise<ParameterEditResult> {
    // Create parameter modification event
    const modification: ParameterModification = {
      stepId,
      parameterName,
      oldValue,
      newValue,
      timestamp: new Date(),
      source: 'direct_edit'
    };
    
    // Update workflow
    const updatedWorkflow = this.applyParameterChange(
      workflowContext,
      modification
    );
    
    // Notify AI of direct modification (context only, no conversation)
    await this.aiContextManager.notifyParameterModification({
      modification,
      workflowContext: updatedWorkflow,
      requiresResponse: false  // No AI conversation triggered
    });
    
    // Save as draft
    await this.draftManager.saveAsDraft(
      updatedWorkflow,
      `Direct parameter edit: ${parameterName} in ${stepId}`
    );
    
    // Trigger real-time validation
    const validationResult = await this.streamingValidator.validateParameter(
      stepId,
      parameterName,
      newValue,
      updatedWorkflow
    );
    
    return {
      success: !validationResult.hasErrors,
      updatedWorkflow,
      validationErrors: validationResult.errors,
      draftState: await this.draftManager.getCurrentDraftState()
    };
  }
}
```

### Performance Optimization for Large Workflows
```typescript
class LargeWorkflowOptimizer {
  private readonly MAX_STEPS_FULL_RENDER = 100;
  private readonly VIRTUALIZATION_THRESHOLD = 50;
  
  async optimizeVisualization(
    workflow: WorkflowJSON,
    viewportBounds: Rectangle
  ): Promise<OptimizedVisualization> {
    const stepCount = Object.keys(workflow.steps).length;
    
    if (stepCount <= this.VIRTUALIZATION_THRESHOLD) {
      // Full rendering for smaller workflows
      return this.renderFullWorkflow(workflow);
    }
    
    // Viewport-based virtualization for large workflows
    const visibleSteps = this.calculateVisibleSteps(workflow, viewportBounds);
    const simplifiedConnections = this.simplifyConnectionsOutsideViewport(
      workflow,
      visibleSteps
    );
    
    return {
      visibleSteps,
      simplifiedConnections,
      totalStepCount: stepCount,
      renderingStrategy: 'virtualized'
    };
  }
  
  private calculateVisibleSteps(
    workflow: WorkflowJSON,
    viewport: Rectangle
  ): WorkflowStep[] {
    // Calculate which steps are in current viewport + buffer
    const buffer = 200; // 200px buffer around viewport
    const expandedViewport = {
      ...viewport,
      x: viewport.x - buffer,
      y: viewport.y - buffer,
      width: viewport.width + (2 * buffer),
      height: viewport.height + (2 * buffer)
    };
    
    return Object.entries(workflow.steps)
      .filter(([stepId, step]) => 
        this.isStepInViewport(step, expandedViewport)
      )
      .map(([stepId, step]) => ({ stepId, ...step }));
  }
}
```

### Integration with Existing Systems
- **Story 8 Integration:** Real-time validation error visualization during AI updates
- **Story 9 Integration:** Full-view button functionality with dual-pane layout
- **Story 10 Integration:** Draft state visualization and parameter edit history
- **Material-UI v7:** Interactive controls using Fab, Tooltip, Drawer components
- **Mermaid v11:** Enhanced diagram rendering with real-time update capabilities

### Testing Requirements
- **Real-time Update Tests:** Validate smooth transitions during AI workflow modifications (90%+ coverage)
- **Performance Tests:** Large workflow rendering and interaction benchmarks
- **Parameter Modification Tests:** Direct editing functionality and AI context notification
- **Draft State Tests:** Visual distinction and state persistence validation
- **Responsive Interaction Tests:** Touch and mouse interaction across device types
- **Memory Leak Tests:** Extended visualization sessions with frequent updates

### Security Notes
- Sanitize all displayed workflow data
- Validate user interactions with diagram elements
- Implement proper access controls for workflow viewing
- Audit log user interactions with sensitive workflows