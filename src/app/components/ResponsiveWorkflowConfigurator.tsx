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
  Button,
  Tooltip
} from '@mui/material';
import {
  Publish as PublishIcon,
  Fullscreen as FullscreenIcon,
  Code as CodeIcon,
  Chat as ChatIcon,
  AccountTree as VisualizationIcon,
  DragIndicator as DragIcon,
  History as HistoryIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { WorkflowDefinition, WorkflowTemplate } from '@/app/types/workflowTemplate';
import VisualizationPane from './VisualizationPane';
import WorkflowTemplateSelector, {workflowTemplateSelectorMenuItem} from './WorkflowTemplateSelector';
import WorkflowTemplateNameDialog from './WorkflowTemplateNameDialog';
import AimeWorkflowPane from './AimeWorkflowPane';
import { WorkflowMessage } from '../types/aimeWorkflowMessages';

/**
 * Format a date as relative time (e.g., "2 minutes ago", "3 hours ago")
 * Handles both Date objects and ISO date strings
 */
function formatRelativeTime(date: Date | string): string {
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'recently';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHour === 1) return '1 hour ago';
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  // For older dates, show formatted date
  return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}


interface ResponsiveWorkflowConfiguratorProps {
  workflowTemplate?: WorkflowTemplate;
  messages?: WorkflowMessage[];
  sendMessage?: (message: string) => Promise<void>;
  regenerateMermaidDiagram?: () => Promise<void>;
  onWorkflowDefinitionChange: (workflowDefinition: WorkflowDefinition, mermaidDiagram?: string) => void;
  onTemplateLabelChange?: (name: string) => Promise<void>;
}

export default function ResponsiveWorkflowConfigurator({
  workflowTemplate,
  messages,
  sendMessage,
  regenerateMermaidDiagram,
  onWorkflowDefinitionChange,
  onTemplateLabelChange,
}: ResponsiveWorkflowConfiguratorProps) {

  // Ensure we have a workflow object
  if (!workflowTemplate) {
    throw new Error('ResponsiveWorkflowConfigurator requires a workflowTemplate');
  }
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
  const [isDragging, setIsDragging] = useState(false); // For resizable divider

  // Template naming state
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [isTemplateValid] = useState(false); // placeholder to prevent accidental publish; setter intentionally unused
  const [workflowTemplateSelectorItem, setWorkflowTemplateSelectorItem] = useState<workflowTemplateSelectorMenuItem | null>(null);


  const updateWorkflowTemplateSelectorItem = useCallback((loadedTemplate: WorkflowTemplate) => {
    setWorkflowTemplateSelectorItem({
      id: loadedTemplate.id,
      label: loadedTemplate.metadata.label,
      version: loadedTemplate.version,
      status: loadedTemplate.metadata.status
    });
  }, []);

  // Auto-show dialog for new templates that need naming (only once)
  useEffect(() => {
    if (workflowTemplate && workflowTemplate.metadata && !workflowTemplate.metadata.label) {
      setShowNameDialog(true);
    }
    updateWorkflowTemplateSelectorItem(workflowTemplate);
  }, [updateWorkflowTemplateSelectorItem, workflowTemplate, workflowTemplate?.metadata?.label]);


  // Resizable divider functionality
  const dividerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_CONVERSATION_WIDTH = 500;
  const MAX_CONVERSATION_WIDTH_PERCENT = 0.5; // 50% of container width


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
  const handlePublish = useCallback(() => {
    if (isTemplateValid) {
      // WorkflowJSON only has steps - status is handled at template level
      onWorkflowDefinitionChange(workflowTemplate.workflowDefinition);
    }
  }, [workflowTemplate, isTemplateValid, onWorkflowDefinitionChange]);

  // Mobile tab change handler
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Handle template naming
  const handleTemplateNameSubmit = useCallback(async (name: string) => {
    if (onTemplateLabelChange) {
      await onTemplateLabelChange(name);
      console.log('✏️ Updated template label:', name);
    }
    setShowNameDialog(false);
  }, [onTemplateLabelChange]);

  // Render toolbar
  const renderToolbar = () => (
    <Box sx={{
      p: 2,
      borderBottom: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper',
      width: '100%'
    }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 1 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkflowTemplateSelector
              currentTemplateMenuItem={workflowTemplateSelectorItem ? workflowTemplateSelectorItem : undefined}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Rename template">
                <IconButton
                  size="small"
                  onClick={() => setShowNameDialog(true)}
                  sx={{ color: 'text.secondary' }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Last Updated Timestamp */}
              {workflowTemplate?.metadata?.updatedAt && (
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  Updated {formatRelativeTime(workflowTemplate.metadata.updatedAt)}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(workflowTemplate.metadata.status === "draft") && (
            <Button
              startIcon={<PublishIcon />}
              variant="contained"
              size="small"
              onClick={handlePublish}
              disabled={!isTemplateValid}
              sx={{ minWidth: { xs: 'auto', sm: 'unset' } }}
            >
              Publish
            </Button>
          )}

          {/* will have to change this to a menu with the versions as a dropdown to select from */}
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
          label="aime"
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


  if (showFullVisualization) {
    return (
      <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
        {renderToolbar()}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {/* <VisualizationPane
            workflowTemplate={workflowTemplate}
            validationResult={validationResult}
            onWorkflowChange={onWorkflowChange}
            fullScreen
          /> */}
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
              {JSON.stringify(workflowTemplate, null, 2)}
            </pre>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Box
      className="responsive-workflow-container"
      sx={{p: 0, m:0, height: '100%', width: '100%'}}
    >
      {renderToolbar()}

      {/* Mobile Layout */}
      {isMobile && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderMobileTabs()}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 0 ? (
              <></>
              // <WorkflowCreationPane
              //   workflow={workflow}
              //   onWorkflowChange={onWorkflowChange}
              //   isNewWorkflow={isNewWorkflow}
              //   workflowTemplateId={currentTemplateId}
              //   workflowTemplateName={currentTemplateLabel}
              //   mrfData={undefined}
              // />
            ) : activeTab === 1 ? (
              <></>
              // <VisualizationPane
              //   workflowTemplate={workflowTemplate}
              //   validationResult={validationResult}
              //   onWorkflowChange={onWorkflowChange}
              // />
            ) : (
              <></>
              // <HistoryPanel
              //   workflowId={currentTemplateId || 'new'}
              //   isOpen={true}
              //   onToggle={() => setActiveTab(0)}
              // />
            )}
          </Box>
        </Box>
      )}

      {/* Desktop/Tablet Layout */}
      {(isDesktop || isTablet) && (
        <Box
          ref={containerRef}
          className="smooth-transform"
          sx={{
            display: 'flex',
            width: '100%',
            height: 'calc(100% - 72px)', // Adjust for toolbar height
            minHeight: 0, // Ensures flex container respects height
          }}
        >
          {/* Conversation Pane */}
          <Box
            sx={{
              width: isDesktop ? `${conversationPaneWidth}px` : '50%',
              minWidth: `${MIN_CONVERSATION_WIDTH}px`,
              borderRight: 1,
              borderColor: 'divider',
              height: '100%',
              minHeight: 0, // Ensures flex container respects height
            }}
          >
            <AimeWorkflowPane
              messages={messages || []}
              sendMessage={sendMessage ? sendMessage : async (msg: string) => { console.log('SendMessage not provided. Message:', msg); }}
              workflowDefinition={workflowTemplate.workflowDefinition}
              workflowTemplateId={workflowTemplate.id}
            />
          </Box>

          {/* Resizable Divider (Desktop only) */}
          {isDesktop && renderDivider()}

          {/* Visualization Pane */}
          <Box sx={{
            flex: 1,
            height: '100%',
            minWidth: 0, // Allows flex item to shrink below content size
            display: 'inline-flex',
            flexDirection: 'column'
          }}
          className="smooth-transform"
          >
            <VisualizationPane
              workflowTemplate={workflowTemplate}
              regenerateMermaidDiagram={regenerateMermaidDiagram ? regenerateMermaidDiagram : async () => { console.log('regenerateMermaidDiagram not provided.'); }}
              onWorkflowDefinitionChange={onWorkflowDefinitionChange}
            />
          </Box>
        </Box>
      )}

      {/* Template Name Dialog */}
      <WorkflowTemplateNameDialog
        open={showNameDialog}
        onClose={() => setShowNameDialog(false)}
        onSubmit={handleTemplateNameSubmit}
        currentName={workflowTemplate?.metadata?.label}
      />
    </Box>
  );
}