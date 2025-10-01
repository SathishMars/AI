# User Story: Advanced Workflow Visualization

**As a** workflow creator  
**I want** professional Mermaid workflow diagrams with clean rendering  
**So that** I can clearly visualize complex workflows with proper formatting and styling

## Summary
Implement direct Mermaid rendering with enhanced AI-generated diagrams, replacing react-md-editor for better performance and visual quality.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- **Direct Mermaid Rendering:** Replace react-md-editor with native Mermaid library for better performance
- **Professional Styling:** WCAG AA compliant color schemes with business-ready appearance  
- **Clean Syntax Processing:** Automatic cleanup of LLM-generated markdown code blocks
- **Responsive Design:** Diagrams scale properly across phone, tablet, and desktop viewports
- **Loading States:** Smooth transitions with proper spinner states during diagram generation
- **Error Handling:** Graceful fallbacks with detailed error information
- **Material-UI Integration:** MUI v7 components for loading indicators and error displays
- **React Compatibility:** Proper virtual DOM integration to avoid rendering conflicts
- **Enhanced AI Prompts:** Detailed business logic visualization with accessibility compliance
- **Performance Optimization:** Efficient rendering for complex workflows with 50+ steps

## Acceptance Criteria
- [x] **Direct Mermaid Rendering Implementation:**
  - [x] Replace react-md-editor with direct Mermaid v11.12.0 integration
  - [x] Implement MermaidChart component with proper React lifecycle management
  - [x] Use dynamic imports to ensure proper client-side loading
  - [x] Resolve DOM element timing issues with callback ref pattern
- [x] **Enhanced AI-Generated Diagrams:**
  - [x] Professional business-ready diagram generation via OpenAI GPT-4o-mini
  - [x] WCAG AA compliant color schemes and contrast ratios
  - [x] Detailed step information including action parameters and conditions
  - [x] Proper node shapes for different step types (triggers, conditions, actions, ends)
  - [x] Clean Mermaid syntax without markdown code block wrappers
- [x] **LLM Response Processing:**
  - [x] Automatic cleanup of markdown code blocks (```mermaid...```) from API responses
  - [x] Enhanced system prompts for clean Mermaid syntax generation
  - [x] Fallback diagram generation for API failures
  - [x] Improved error handling with detailed logging
- [x] **React Virtual DOM Compatibility:**
  - [x] Use React state management instead of innerHTML manipulation
  - [x] Implement dangerouslySetInnerHTML for safe SVG rendering
  - [x] Resolve React DOM conflicts that caused removeChild errors
  - [x] Proper component cleanup and lifecycle management
- [x] **Performance and User Experience:**
  - [x] Smooth loading states with Material-UI CircularProgress
  - [x] Proper error states with detailed user feedback
  - [x] Responsive SVG scaling for all device types
  - [x] Efficient caching of generated diagrams
- [x] **Testing and Quality:**
  - [x] Remove debugging console.log statements for production
  - [x] Comprehensive error handling for all failure scenarios
  - [x] Clean code structure with proper TypeScript typing

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