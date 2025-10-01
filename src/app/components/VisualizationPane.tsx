// src/app/components/VisualizationPane.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  Fab,
  Tooltip
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';
import { WorkflowJSON, ValidationResult, WorkflowCondition } from '@/app/types/workflow';
import { 
  VisualizationConfig,
  DraftState,
  ZoomPanState,
  MinimapState,
  MermaidVisualizationConfig,
  VisualWorkflowTheme,
  ParameterEditResult,
  SearchHighlight
} from '@/app/types/advanced-visualization';
import MermaidRenderer from './visualization/MermaidRenderer';
import VisualizationControls from './visualization/VisualizationControls';
import ParameterEditor from './visualization/ParameterEditor';

interface VisualizationPaneProps {
  workflow: WorkflowJSON;
  validationResult: ValidationResult | null;
  onWorkflowChange: (workflow: WorkflowJSON) => void;
  fullScreen?: boolean;
  draftState?: DraftState;
  onDraftStateChange?: (draftState: DraftState) => void;
}

// Default theme configuration
const DEFAULT_THEME: VisualWorkflowTheme = {
  draft: {
    stepBorder: '#ff9800',
    stepBackground: '#fff3e0',
    modifiedIndicator: '#f57c00',
    opacity: 1.0
  },
  published: {
    stepBorder: '#4caf50',
    stepBackground: '#e8f5e9',
    opacity: 0.8
  },
  validation: {
    errorBorder: '#f44336',
    errorBackground: '#ffebee',
    warningBorder: '#ff9800',
    warningBackground: '#fff3e0'
  }
};

export default function VisualizationPane({
  workflow,
  validationResult,
  onWorkflowChange,
  fullScreen = false,
  draftState,
  onDraftStateChange
}: VisualizationPaneProps) {
  // Visualization state
  const [config, setConfig] = useState<VisualizationConfig>({
    theme: 'light',
    enableInteractions: true,
    showMinimap: false,
    enableZoom: true,
    enablePan: true,
    maxZoom: 3.0,
    minZoom: 0.2,
    animationDuration: 300
  });

  const [zoomPanState, setZoomPanState] = useState<ZoomPanState>({
    zoom: 1.0,
    panX: 0,
    panY: 0,
    centerX: 0,
    centerY: 0
  });

  const [minimapState, setMinimapState] = useState<MinimapState>({
    visible: false,
    position: 'bottom-right',
    size: { width: 200, height: 150 },
    opacity: 0.8
  });

  // Parameter editing state
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [parameterEditorOpen, setParameterEditorOpen] = useState(false);

  // Search state
  const [, setSearchHighlights] = useState<SearchHighlight[]>([]);

  // Generate Mermaid visualization configuration
  const mermaidConfig = useMemo((): MermaidVisualizationConfig => {
    const stepStyles = new Map();
    const connectionStyles = new Map();
    const indicators = new Map();

    Object.entries(workflow.steps).forEach(([stepId]) => {
      const isDraft = draftState?.modifiedSteps.has(stepId) || false;
      const hasErrors = validationResult?.errors.some(error => error.stepId === stepId) || false;
      const hasWarnings = validationResult?.warnings?.some(warning => warning.stepId === stepId) || false;

      // Determine step styling based on state
      let stepStyle;
      if (hasErrors) {
        stepStyle = {
          border: DEFAULT_THEME.validation.errorBorder,
          background: DEFAULT_THEME.validation.errorBackground,
          opacity: 1.0,
          textColor: '#d32f2f'
        };
      } else if (hasWarnings) {
        stepStyle = {
          border: DEFAULT_THEME.validation.warningBorder,
          background: DEFAULT_THEME.validation.warningBackground,
          opacity: 1.0,
          textColor: '#f57c00'
        };
      } else if (isDraft) {
        stepStyle = {
          border: DEFAULT_THEME.draft.stepBorder,
          background: DEFAULT_THEME.draft.stepBackground,
          opacity: DEFAULT_THEME.draft.opacity,
          textColor: '#e65100'
        };
      } else {
        stepStyle = {
          border: DEFAULT_THEME.published.stepBorder,
          background: DEFAULT_THEME.published.stepBackground,
          opacity: DEFAULT_THEME.published.opacity,
          textColor: '#2e7d32'
        };
      }

      stepStyles.set(stepId, stepStyle);

      // Add indicators for special states
      if (isDraft) {
        indicators.set(stepId, {
          type: 'draft_modification',
          icon: '✏️',
          color: DEFAULT_THEME.draft.modifiedIndicator,
          tooltip: 'This step has been modified in the current draft',
          position: 'top-right'
        });
      }

      if (hasErrors) {
        indicators.set(`${stepId}_error`, {
          type: 'validation_error',
          icon: '❌',
          color: DEFAULT_THEME.validation.errorBorder,
          tooltip: 'This step has validation errors',
          position: 'top-left'
        });
      }
    });

    return {
      stepStyles,
      connectionStyles,
      indicators,
      theme: DEFAULT_THEME
    };
  }, [workflow, draftState, validationResult]);

  // Handle step interactions
  const handleStepClick = useCallback((stepId: string) => {
    if (config.enableInteractions) {
      setSelectedStepId(stepId);
      setParameterEditorOpen(true);
    }
  }, [config.enableInteractions]);

  const handleStepHover = useCallback((stepId: string, isHovering: boolean) => {
    if (config.enableInteractions) {
      // Could add hover effects here
      console.log(`Step ${stepId} ${isHovering ? 'hovered' : 'unhovered'}`);
    }
  }, [config.enableInteractions]);

  // Handle parameter editing
  const handleParameterEdit = useCallback(async (
    stepId: string,
    parameterName: string,
    oldValue: string | number | boolean | object,
    newValue: string | number | boolean | object
  ): Promise<ParameterEditResult> => {
    try {
      // Create updated workflow
      const updatedWorkflow = { ...workflow };
      const step = { ...updatedWorkflow.steps[stepId] };

      // Update the parameter
      if (parameterName === 'name') {
        step.name = String(newValue);
      } else if (parameterName === 'action') {
        step.action = String(newValue);
      } else if (parameterName.startsWith('params.')) {
        const paramKey = parameterName.substring(7);
        step.params = { ...step.params, [paramKey]: newValue };
      } else if (parameterName === 'condition') {
        step.condition = newValue as WorkflowCondition;
      } else if (parameterName === 'onSuccess') {
        step.onSuccess = String(newValue);
      } else if (parameterName === 'onFailure') {
        step.onFailure = String(newValue);
      } else if (parameterName === 'nextSteps') {
        step.nextSteps = Array.isArray(newValue) ? newValue as string[] : [String(newValue)];
      }

      updatedWorkflow.steps[stepId] = step;

      // Update draft state
      const newDraftState: DraftState = {
        ...draftState,
        isDraft: true,
        workflowId: workflow.metadata?.id || 'new-workflow',
        draftVersion: updatedWorkflow,
        modifiedSteps: new Set([...(draftState?.modifiedSteps || []), stepId]),
        lastModified: new Date(),
        autoSave: true
      };

      // Apply changes
      onWorkflowChange(updatedWorkflow);
      if (onDraftStateChange) {
        onDraftStateChange(newDraftState);
      }

      // Simulate AI context notification (in real implementation, this would call an API)
      console.log('🤖 AI Context Notification:', {
        stepId,
        parameterName,
        oldValue,
        newValue,
        workflowContext: updatedWorkflow
      });

      return {
        success: true,
        updatedWorkflow,
        validationErrors: [],
        draftState: newDraftState,
        aiContextNotified: true
      };

    } catch (error) {
      console.error('Failed to edit parameter:', error);
      return {
        success: false,
        updatedWorkflow: workflow,
        validationErrors: [{
          id: 'parameter-edit-error',
          stepId,
          severity: 'error',
          conversationalExplanation: `Failed to update ${parameterName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          technicalMessage: error instanceof Error ? error.message : 'Unknown error'
        }],
        draftState: draftState || {
          isDraft: false,
          workflowId: workflow.metadata?.id || 'new-workflow',
          modifiedSteps: new Set(),
          lastModified: new Date(),
          autoSave: false
        },
        aiContextNotified: false
      };
    }
  }, [workflow, draftState, onWorkflowChange, onDraftStateChange]);

  // Handle visualization controls
  const handleFullscreenToggle = useCallback(() => {
    // This would be handled by parent component
    console.log('Fullscreen toggle requested');
  }, []);

  const handleCenterView = useCallback(() => {
    setZoomPanState({
      zoom: 1.0,
      panX: 0,
      panY: 0,
      centerX: 0,
      centerY: 0
    });
  }, []);

  const handleSearch = useCallback((term: string) => {
    const highlights: SearchHighlight[] = [];
    
    Object.entries(workflow.steps).forEach(([stepId, step]) => {
      if (step.name.toLowerCase().includes(term.toLowerCase())) {
        highlights.push({
          stepId,
          searchTerm: term,
          matchType: 'name',
          isActive: true
        });
      }
      if (step.action?.toLowerCase().includes(term.toLowerCase())) {
        highlights.push({
          stepId,
          searchTerm: term,
          matchType: 'action',
          isActive: true
        });
      }
    });

    setSearchHighlights(highlights);
  }, [workflow.steps]);

  const handleSaveDraft = useCallback(() => {
    if (draftState?.isDraft) {
      console.log('💾 Saving draft workflow...');
      // In real implementation, this would save to backend
    }
  }, [draftState]);

  const handleViewHistory = useCallback(() => {
    console.log('📜 Viewing workflow history...');
    // In real implementation, this would open history view
  }, []);

  // Get selected step for parameter editor
  const selectedStep = selectedStepId ? workflow.steps[selectedStepId] : null;

  if (!workflow.steps || Object.keys(workflow.steps).length === 0) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        p: fullScreen ? 3 : 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WorkflowIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h3">
            Workflow Visualization
          </Typography>
          {fullScreen && (
            <Chip label="Full Screen" size="small" sx={{ ml: 'auto' }} />
          )}
        </Box>
        
        <Paper sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50' 
        }}>
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>
              No Workflow Steps
            </Typography>
            <Typography variant="body2">
              Start a conversation with aime to create workflow steps, and they will appear here as an interactive diagram.
            </Typography>
          </Alert>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      p: fullScreen ? 3 : 2,
      position: 'relative'
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <WorkflowIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Advanced Workflow Visualization
        </Typography>
        {fullScreen && (
          <Chip label="Full Screen" size="small" sx={{ ml: 'auto' }} />
        )}
        {!fullScreen && (
          <Tooltip title="Enter Fullscreen">
            <Fab 
              size="small" 
              sx={{ ml: 'auto' }}
              onClick={handleFullscreenToggle}
            >
              <FullscreenIcon />
            </Fab>
          </Tooltip>
        )}
      </Box>
      
      {/* Visualization Area */}
      <Box sx={{ 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider'
      }}>
        <MermaidRenderer
          workflow={workflow}
          config={mermaidConfig}
          draftState={draftState}
          onStepClick={handleStepClick}
          onStepHover={handleStepHover}
          enableInteractions={config.enableInteractions}
          preserveViewport={true}
          animationDuration={config.animationDuration}
        />

        {/* Visualization Controls */}
        <VisualizationControls
          zoomPanState={zoomPanState}
          onZoomPanChange={setZoomPanState}
          minimapState={minimapState}
          onMinimapToggle={(visible) => setMinimapState(prev => ({ ...prev, visible }))}
          config={config}
          onConfigChange={(newConfig) => setConfig(prev => ({ ...prev, ...newConfig }))}
          draftState={draftState}
          isFullscreen={fullScreen}
          onFullscreenToggle={handleFullscreenToggle}
          onCenterView={handleCenterView}
          onSearch={handleSearch}
          onSaveDraft={handleSaveDraft}
          onViewHistory={handleViewHistory}
        />
      </Box>

      {/* Parameter Editor */}
      <ParameterEditor
        open={parameterEditorOpen}
        onClose={() => {
          setParameterEditorOpen(false);
          setSelectedStepId(null);
        }}
        step={selectedStep}
        stepId={selectedStepId}
        onParameterEdit={handleParameterEdit}
        availableFunctions={[
          'onMRFSubmit',
          'requestApproval',
          'createEvent',
          'sendNotification',
          'onScheduledEvent',
          'onApprovalReceived',
          'updateMRFStatus'
        ]}
        validationErrors={validationResult?.errors || []}
      />
    </Box>
  );
}