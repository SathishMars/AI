# User Story: Dual-Pane Layout and Responsive Design

**As a** workflow creator using any device  
**I want** a well-designed interface that works on desktop, tablet, and mobile  
**So that** I can create and edit workflows regardless of my device or screen size

## Summary
Implement the wireframe-specified dual-pane layout with responsive breakpoints for all device types and embedded contexts.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- **Wireframe Implementation:** Follow the dual-pane layout specified in `workflow-UI-specifications.png`
- **Desktop Layout:** Conversation pane (left) maintains minimum width ~300px, visualization pane (right) fills remaining space
- **Pane Interaction:** Resizable divider with minimum/maximum bounds, optional full-view button for visualization
- **Mobile Adaptation:** Single-pane with tab navigation, seamless conversation state transfer
- **Conversation Continuity:** **CRITICAL** - Active conversation, input state, and chat history must persist during responsive transitions
- **Responsive Transitions:** Smooth layout changes using modern CSS transforms and MUI transitions
- **Standard Gestures:** Leverage MUI's built-in touch gestures (swipe, tap) without custom gesture implementation
- **Embedded Context:** Proper iframe viewport handling with minimum dimensions (320px width minimum)
- **Loading States:** Skeleton loading for panes during responsive transitions
- **Material-UI Integration:** Use MUI v7 responsive components (Grid, Container, AppBar) with Tailwind spacing

## Acceptance Criteria
- [ ] **Wireframe Compliance:** Implement dual-pane layout exactly matching `workflow-UI-specifications.png`
- [ ] **Responsive Breakpoints:**
  - [ ] Desktop (≥1200px) - Dual-pane with resizable divider (300px min conversation width)
  - [ ] Tablet (768px-1199px) - Adaptive dual-pane with fixed minimum widths
  - [ ] Mobile (≤767px) - Single-pane with tab navigation
- [ ] **Pane Management:**
  - [ ] Resizable divider with 300px-50% bounds for conversation pane
  - [ ] Full-view button to expand visualization to full screen
  - [ ] Minimum width enforcement prevents pane collapse
- [ ] **Conversation Continuity (CRITICAL):**
  - [ ] Active conversation state transfers seamlessly across breakpoints
  - [ ] Chat input content preserved during responsive transitions
  - [ ] Conversation history maintains scroll position and context
  - [ ] AI streaming responses continue uninterrupted during layout changes
- [ ] **Performance Standards:**
  - [ ] Responsive transitions complete within 300ms (modern web standard)
  - [ ] 60fps animations using CSS transforms and GPU acceleration
  - [ ] Layout shifts minimize to <0.1 CLS (Cumulative Layout Shift)
  - [ ] First meaningful paint within 1.5s on 3G connections
- [ ] **Material-UI Integration:**
  - [ ] Use MUI v7 responsive Grid and Container components
  - [ ] Standard MUI touch gestures (no custom gesture implementation)
  - [ ] MUI theme breakpoints aligned with responsive design
- [ ] **Embedded Context:**
  - [ ] Proper viewport meta tags for iframe embedding
  - [ ] Minimum 320px width graceful degradation
  - [ ] Parent page style isolation using CSS containment
- [ ] **Testing Requirements:**
  - [ ] Responsive design tests across all breakpoints (90%+ coverage)
  - [ ] Conversation continuity tests during layout transitions
  - [ ] Performance tests meeting modern web standards
  - [ ] Accessibility tests for keyboard navigation
  - [ ] Embedded iframe testing in constrained containers

## Developer Notes

### Responsive Architecture with MUI v7 Integration
```typescript
// Use MUI breakpoints aligned with wireframe specifications
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,      // Mobile
      sm: 768,    // Tablet
      md: 1200,   // Desktop
      lg: 1400,   // Large Desktop
      xl: 1920    // Extra Large
    }
  }
});

// Responsive layout component
const WorkflowConfigurator = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  return (
    <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
      {isDesktop ? (
        <DualPaneLayout />
      ) : (
        <SinglePaneWithTabs />
      )}
    </Container>
  );
};
```

### Conversation Continuity System
```typescript
interface ConversationState {
  activeConversationId: string;
  inputContent: string;
  scrollPosition: number;
  streamingResponse?: StreamingState;
  chatHistory: ConversationMessage[];
  lastActiveTimestamp: Date;
}

class ConversationContinuityManager {
  private state: ConversationState;
  private stateChangeListeners: ((state: ConversationState) => void)[] = [];
  
  // Preserve state during responsive transitions
  async handleLayoutTransition(
    fromLayout: 'dual-pane' | 'single-pane',
    toLayout: 'dual-pane' | 'single-pane'
  ): Promise<void> {
    // Capture current state
    const currentState = await this.captureCurrentState();
    
    // Pause streaming if active
    if (currentState.streamingResponse) {
      await this.pauseStreaming(currentState.streamingResponse);
    }
    
    // Store state during transition
    this.preserveStateForTransition(currentState);
    
    // Resume after layout stabilizes
    requestAnimationFrame(() => {
      this.restoreStateAfterTransition(currentState);
      
      // Resume streaming if was active
      if (currentState.streamingResponse) {
        this.resumeStreaming(currentState.streamingResponse);
      }
    });
  }
  
  private async captureCurrentState(): Promise<ConversationState> {
    return {
      activeConversationId: this.getCurrentConversationId(),
      inputContent: this.getChatInputContent(),
      scrollPosition: this.getChatScrollPosition(),
      streamingResponse: this.getActiveStreamingState(),
      chatHistory: this.getChatHistory(),
      lastActiveTimestamp: new Date()
    };
  }
}
```

### Layout Components with Minimum Width Enforcement
- `WorkflowConfigurator` - Main responsive container with MUI Container
- `ConversationPane` - Left pane with 300px minimum width, conversation continuity
- `VisualizationPane` - Right pane with full-view expansion capability
- `PaneResizer` - Draggable divider with 300px-50% bounds enforcement
- `MobileTabNavigation` - MUI Tab component with conversation state preservation
- `FullViewVisualization` - Modal/overlay for expanded Mermaid diagram view

### Performance Optimization (Modern Web Standards)
```typescript
// GPU-accelerated responsive transitions
const useResponsiveTransitions = () => {
  return {
    transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform',  // Hint browser for GPU acceleration
    transform: 'translateZ(0)'  // Force hardware acceleration
  };
};

// Minimize layout shifts during responsive changes
const PreserveLayoutDimensions = ({ children }: { children: React.ReactNode }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useLayoutEffect(() => {
    // Measure before layout change
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);
  
  return (
    <div 
      style={{
        minWidth: dimensions.width,
        minHeight: dimensions.height,
        transition: 'min-width 300ms, min-height 300ms'
      }}
    >
      {children}
    </div>
  );
};
```

### Mobile UX with MUI Standard Gestures
```typescript
// Use MUI's built-in SwipeableDrawer for mobile navigation
const MobileTabNavigation = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <>
      <Tabs 
        value={activeTab} 
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="fullWidth"
        sx={{ minHeight: 48 }}  // Touch-friendly height
      >
        <Tab label="Conversation" icon={<ChatIcon />} />
        <Tab label="Visualization" icon={<AccountTreeIcon />} />
      </Tabs>
      
      <SwipeableViews 
        index={activeTab} 
        onChangeIndex={setActiveTab}
        enableMouseEvents  // MUI standard gesture support
      >
        <ConversationPane />
        <VisualizationPane />
      </SwipeableViews>
    </>
  );
};
```

### Embedded Context with Minimum Dimensions
```typescript
// Graceful degradation for embedded contexts
const EmbeddedContextHandler = () => {
  const isEmbedded = window !== window.parent;
  const containerWidth = useContainerWidth();
  
  const getLayoutMode = () => {
    if (containerWidth < 320) return 'minimal';  // Absolute minimum
    if (containerWidth < 768) return 'mobile';
    if (containerWidth < 1200) return 'tablet';
    return 'desktop';
  };
  
  return (
    <div 
      style={{
        contain: isEmbedded ? 'layout style paint' : 'none',  // CSS containment
        minWidth: 320,  // Prevent breaking below 320px
        width: '100%',
        height: '100%'
      }}
    >
      {/* Layout based on container constraints */}
    </div>
  );
};
```

### Testing Requirements
- Unit tests for responsive component behavior (90%+ coverage)
- Visual regression tests across all breakpoints
- Touch interaction tests for mobile interfaces
- Accessibility tests for keyboard navigation
- Embedded iframe testing in various contexts
- Performance tests for responsive transitions

### Security Notes
- Implement Content Security Policy for embedded contexts
- Validate viewport constraints for iframe embedding
- Prevent clickjacking in embedded scenarios
- Secure handling of parent-child communication