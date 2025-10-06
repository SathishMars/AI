// src/app/components/ResponsiveWorkflowConfigurator.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  useMediaQuery,
  Tabs,
  Tab,
  AppBar,
  IconButton,
  Typography,
  Button
} from '@mui/material';
import {
  Save as SaveIcon,
  Publish as PublishIcon,
  Fullscreen as FullscreenIcon,
  Code as CodeIcon,
  Chat as ChatIcon,
  AccountTree as VisualizationIcon,
  DragIndicator as DragIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import WorkflowCreationPane from './WorkflowCreationPane';
import VisualizationPane from './VisualizationPane';
import HistoryPanel from './HistoryPanel';
import EditModeIndicator from './EditModeIndicator';
import WorkflowTemplateSelector from './WorkflowTemplateSelector';
import WorkflowTemplateNameDialog from './WorkflowTemplateNameDialog';

interface ConversationState {
  activeConversationId: string;
  inputContent: string;
  scrollPosition: number;
  streamingResponse?: {
    isActive: boolean;
    currentChunk: string;
  };
  chatHistory: {
    id: string;
    content: string;
    sender: 'user' | 'aime';
    timestamp: Date;
  }[];
  lastActiveTimestamp: Date;
}

interface ResponsiveWorkflowConfiguratorProps {
  workflow: WorkflowJSON;
  onWorkflowChange: (workflow: WorkflowJSON) => void;
  validationResult: ValidationResult | null;
  isNewWorkflow: boolean;
  currentTemplateName?: string;
  onTemplateNameChange?: (name: string) => Promise<void>;
}

export default function ResponsiveWorkflowConfigurator({
  workflow,
  onWorkflowChange,
  validationResult,
  isNewWorkflow,
  currentTemplateName = 'new',
  onTemplateNameChange
}: ResponsiveWorkflowConfiguratorProps) {
  // Custom breakpoints: Mobile ≤767px, Tablet 768px-1199px, Desktop ≥1200px
  const isDesktop = useMediaQuery('(min-width: 1200px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1199px)');
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  // Layout state
  const [showFullVisualization, setShowFullVisualization] = useState(false);
  const [showRawJSON, setShowRawJSON] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // For mobile tab navigation
  const [conversationPaneWidth, setConversationPaneWidth] = useState(400); // Default 400px
  const [isDragging, setIsDragging] = useState(false);
  
  // Template naming state
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Auto-show dialog for new templates
  useEffect(() => {
    if (isNewWorkflow && (currentTemplateName === 'new' || currentTemplateName === 'create')) {
      setShowNameDialog(true);
    }
  }, [isNewWorkflow, currentTemplateName]);
  
  // Conversation continuity state
  const conversationStateRef = useRef<ConversationState | null>(null);
  
  // Resizable divider functionality
  const dividerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const MIN_CONVERSATION_WIDTH = 300;
  const MAX_CONVERSATION_WIDTH_PERCENT = 0.6; // 60% of container width
  
  // Handle conversation state preservation during layout transitions
  const preserveConversationState = useCallback(() => {
    // This will be called by WorkflowCreationPane when state changes
    if (conversationStateRef.current) {
      // State is preserved in the ref for future conversation continuity features
      console.log('Conversation state preserved during layout transition');
    }
  }, []);
  
  // Handle layout transitions with conversation continuity
  useEffect(() => {
    const prevLayout = isDesktop ? 'dual-pane' : 'single-pane';
    const currentLayout = isDesktop ? 'dual-pane' : 'single-pane';
    
    if (prevLayout !== currentLayout) {
      // Layout transition detected - preserve conversation state
      preserveConversationState();
    }
  }, [isDesktop, preserveConversationState]);
  
  // Resizable divider logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const maxWidth = containerRect.width * MAX_CONVERSATION_WIDTH_PERCENT;
      
      const clampedWidth = Math.max(
        MIN_CONVERSATION_WIDTH,
        Math.min(newWidth, maxWidth)
      );
      
      setConversationPaneWidth(clampedWidth);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);
  
  // Workflow actions
  const handleSave = useCallback(() => {
    const updatedWorkflow = {
      ...workflow,
      metadata: {
        ...workflow.metadata,
        updatedAt: new Date()
      }
    };
    onWorkflowChange(updatedWorkflow);
  }, [workflow, onWorkflowChange]);
  
  const handlePublish = useCallback(() => {
    if (validationResult?.isValid) {
      const publishedWorkflow = {
        ...workflow,
        metadata: {
          ...workflow.metadata,
          status: 'published' as const,
          updatedAt: new Date()
        }
      };
      onWorkflowChange(publishedWorkflow);
    }
  }, [workflow, validationResult, onWorkflowChange]);
  
  // Mobile tab change handler
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);
  
  // Handle template naming
  const handleTemplateNameSubmit = useCallback(async (name: string) => {
    if (onTemplateNameChange) {
      await onTemplateNameChange(name);
    }
    setShowNameDialog(false);
    // Small delay to ensure database write completes, then trigger refresh
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 300);
  }, [onTemplateNameChange]);
  
  // Render toolbar
  const renderToolbar = () => (
    <Box sx={{ 
      p: 2, 
      borderBottom: 1, 
      borderColor: 'divider',
      bgcolor: 'background.paper'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 1 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <WorkflowTemplateSelector
            currentTemplateName={currentTemplateName}
            refreshTrigger={refreshTrigger}
          />
          
          <EditModeIndicator 
            workflow={workflow}
            hasUnsavedChanges={false} // TODO: Implement unsaved changes detection
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            startIcon={<SaveIcon />}
            variant="outlined"
            size="small"
            onClick={handleSave}
            sx={{ minWidth: { xs: 'auto', sm: 'unset' } }}
          >
            Save
          </Button>
          
          <Button
            startIcon={<PublishIcon />}
            variant="contained"
            size="small"
            onClick={handlePublish}
            disabled={!validationResult?.isValid}
            sx={{ minWidth: { xs: 'auto', sm: 'unset' } }}
          >
            Publish
          </Button>
          
          <IconButton
            size="small"
            onClick={() => setShowHistory(!showHistory)}
            title="View History"
          >
            <HistoryIcon />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={() => setShowFullVisualization(!showFullVisualization)}
            title="Toggle Full Screen Visualization"
          >
            <FullscreenIcon />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={() => setShowRawJSON(!showRawJSON)}
            title="Show Raw JSON"
          >
            <CodeIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
  
  // Render mobile tabs
  const renderMobileTabs = () => (
    <AppBar position="static" color="default" elevation={1} className="mobile-tabs-container">
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab 
          icon={<ChatIcon />} 
          label="Chat" 
          sx={{ minWidth: 0, fontSize: '0.875rem' }}
        />
        <Tab 
          icon={<VisualizationIcon />} 
          label="Workflow" 
          sx={{ minWidth: 0, fontSize: '0.875rem' }}
        />
        <Tab 
          icon={<HistoryIcon />} 
          label="History" 
          sx={{ minWidth: 0, fontSize: '0.875rem' }}
        />
      </Tabs>
    </AppBar>
  );
  
  // Render resizable divider
  const renderDivider = () => (
    <Box
      ref={dividerRef}
      className="resizable-divider"
      onMouseDown={handleMouseDown}
      sx={{
        width: '4px',
        bgcolor: isDragging ? 'primary.light' : 'divider',
        cursor: 'col-resize',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        transition: 'background-color 0.2s ease',
        '&:hover': {
          bgcolor: 'primary.light'
        }
      }}
    >
      <DragIcon sx={{ fontSize: '16px', color: 'text.secondary' }} />
    </Box>
  );
  
  // Main layout content
  if (showHistory) {
    return (
      <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
        {renderToolbar()}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <HistoryPanel
            workflowId={workflow.metadata.id}
            isOpen={true}
            onToggle={() => setShowHistory(false)}
          />
        </Box>
      </Container>
    );
  }
  
  if (showFullVisualization) {
    return (
      <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
        {renderToolbar()}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <VisualizationPane
            workflow={workflow}
            validationResult={validationResult}
            onWorkflowChange={onWorkflowChange}
            fullScreen
          />
        </Box>
      </Container>
    );
  }
  
  if (showRawJSON) {
    return (
      <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
        {renderToolbar()}
        <Box sx={{ p: 2, height: 'calc(100vh - 100px)', overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>Raw Workflow JSON</Typography>
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              border: 1,
              borderColor: 'divider'
            }}
          >
            <pre style={{ 
              margin: 0, 
              fontSize: '12px', 
              whiteSpace: 'pre-wrap',
              fontFamily: 'Monaco, Consolas, monospace'
            }}>
              {JSON.stringify(workflow, null, 2)}
            </pre>
          </Box>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container 
      maxWidth={false} 
      className="responsive-workflow-container"
      sx={{ height: '100vh', p: 0, display: 'flex', flexDirection: 'column' }}
    >
      {renderToolbar()}
      
      {/* Mobile Layout */}
      {isMobile && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderMobileTabs()}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 0 ? (
              <WorkflowCreationPane
                workflow={workflow}
                onWorkflowChange={onWorkflowChange}
                validationResult={validationResult}
                isNewWorkflow={isNewWorkflow}
                mrfData={undefined}
              />
            ) : activeTab === 1 ? (
              <VisualizationPane
                workflow={workflow}
                validationResult={validationResult}
                onWorkflowChange={onWorkflowChange}
              />
            ) : (
              <HistoryPanel
                workflowId={workflow.metadata.id}
                isOpen={true}
                onToggle={() => setActiveTab(0)}
              />
            )}
          </Box>
        </Box>
      )}
      
      {/* Desktop/Tablet Layout */}
      {(isDesktop || isTablet) && (
        <Box 
          ref={containerRef}
          sx={{ 
            flex: 1, 
            display: 'flex', 
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Conversation Pane */}
          <Box 
            sx={{ 
              width: isDesktop ? `${conversationPaneWidth}px` : '50%',
              minWidth: `${MIN_CONVERSATION_WIDTH}px`,
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <WorkflowCreationPane
              workflow={workflow}
              onWorkflowChange={onWorkflowChange}
              validationResult={validationResult}
              isNewWorkflow={isNewWorkflow}
              mrfData={undefined}
            />
          </Box>
          
          {/* Resizable Divider (Desktop only) */}
          {isDesktop && renderDivider()}
          
          {/* Visualization Pane */}
          <Box sx={{ 
            flex: 1, 
            minWidth: 0, // Allows flex item to shrink below content size
            display: 'flex',
            flexDirection: 'column'
          }}>
            <VisualizationPane
              workflow={workflow}
              validationResult={validationResult}
              onWorkflowChange={onWorkflowChange}
            />
          </Box>
        </Box>
      )}
      
      {/* Template Name Dialog */}
      <WorkflowTemplateNameDialog
        open={showNameDialog}
        onClose={() => setShowNameDialog(false)}
        onSubmit={handleTemplateNameSubmit}
        currentName={currentTemplateName === 'new' || currentTemplateName === 'create' ? '' : currentTemplateName}
        mode={isNewWorkflow ? 'create' : 'rename'}
      />
    </Container>
  );
}