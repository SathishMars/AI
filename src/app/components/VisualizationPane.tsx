// src/app/components/VisualizationPane.tsx
'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  Fullscreen as FullscreenIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material';
import { WorkflowJSON, ValidationResult, WorkflowStep } from '@/app/types/workflow';
import { useMermaidGeneration } from '@/app/hooks/useMermaidGeneration';
import MermaidChart from '@/app/components/MermaidChart';
import WorkflowStepTree from '@/app/components/WorkflowStepTree';
import { ensureNestedArrayFormat } from '@/app/utils/workflow-format-adapter';



interface VisualizationPaneProps {
  workflow: WorkflowJSON;
  validationResult: ValidationResult | null;
  onWorkflowChange: (workflow: WorkflowJSON) => void;
  fullScreen?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visualization-tabpanel-${index}`}
      aria-labelledby={`visualization-tab-${index}`}
      {...other}
      style={{ height: '100%', display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
    >
      {value === index && children}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `visualization-tab-${index}`,
    'aria-controls': `visualization-tabpanel-${index}`,
  };
}

export default function VisualizationPane({
  workflow,
  onWorkflowChange,
  fullScreen = false
}: VisualizationPaneProps) {
  const [tabValue, setTabValue] = useState(0);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Initialize Mermaid generation hook
  const mermaidGeneration = useMermaidGeneration(workflow, onWorkflowChange, {
    autoGenerate: true,
    debounceMs: 2000
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Convert workflow to nested array format (handles both array and object storage)
  const workflowSteps = React.useMemo(() => {
    if (!workflow) return [];
    return ensureNestedArrayFormat(workflow);
  }, [workflow]);

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingStep(null);
  };

  const handleSaveEditedStep = () => {
    if (!editingStep) return;
    
    // Recursive function to update step in nested structure
    const updateStepInTree = (steps: WorkflowStep[]): WorkflowStep[] => {
      return steps.map(step => {
        if (step.id === editingStep.id) {
          return editingStep;
        }
        
        // Check children
        if (step.children && step.children.length > 0) {
          return {
            ...step,
            children: updateStepInTree(step.children)
          };
        }
        
        // Check inline branches
        if (step.onSuccess && typeof step.onSuccess === 'object' && 'id' in step.onSuccess) {
          if (step.onSuccess.id === editingStep.id) {
            return {
              ...step,
              onSuccess: editingStep
            };
          }
          // Recurse into onSuccess branch
          const updatedSuccess = updateStepInTree([step.onSuccess as WorkflowStep])[0];
          if (updatedSuccess !== step.onSuccess) {
            return {
              ...step,
              onSuccess: updatedSuccess
            };
          }
        }
        
        if (step.onFailure && typeof step.onFailure === 'object' && 'id' in step.onFailure) {
          if (step.onFailure.id === editingStep.id) {
            return {
              ...step,
              onFailure: editingStep
            };
          }
          // Recurse into onFailure branch
          const updatedFailure = updateStepInTree([step.onFailure as WorkflowStep])[0];
          if (updatedFailure !== step.onFailure) {
            return {
              ...step,
              onFailure: updatedFailure
            };
          }
        }
        
        return step;
      });
    };

    const updatedSteps = updateStepInTree(workflowSteps);
    const updatedWorkflow = {
      ...workflow,
      steps: updatedSteps
    };
    
    onWorkflowChange(updatedWorkflow);
    handleCloseEditDialog();
  };

  const renderMermaidDiagram = () => {
    // Check if workflow has steps (nested array format only)
    const hasSteps = workflowSteps.length > 0;
    
    if (!hasSteps) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>
              No Workflow Steps
            </Typography>
            <Typography variant="body2">
              Create workflow steps to generate a visual diagram. The diagram will be automatically generated using AI when you add or modify workflow steps.
            </Typography>
          </Alert>
        </Box>
      );
    }
    
    if (mermaidGeneration.isGenerating) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Generating Workflow Diagram
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI is creating a visual representation of your workflow...
            </Typography>
          </Box>
        </Box>
      );
    }
    
    if (mermaidGeneration.error && !workflow.mermaidDiagram) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Alert 
            severity="warning"
            action={
              <Button
                startIcon={<RefreshIcon />}
                onClick={mermaidGeneration.regenerateDiagram}
                size="small"
              >
                Retry
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              Diagram Generation Failed
            </Typography>
            <Typography variant="body2">
              {mermaidGeneration.error}
            </Typography>
          </Alert>
        </Box>
      );
    }

    if (!workflow.mermaidDiagram) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Alert 
            severity="info"
            action={
              <Button
                startIcon={<AIIcon />}
                onClick={mermaidGeneration.regenerateDiagram}
                variant="outlined"
                size="small"
              >
                Generate Diagram
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              Diagram Not Generated
            </Typography>
            <Typography variant="body2">
              Click &ldquo;Generate Diagram&rdquo; to create an AI-powered visual representation of your workflow.
            </Typography>
          </Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Diagram Controls */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {mermaidGeneration.lastGenerated && (
              `Last generated: ${mermaidGeneration.lastGenerated.toLocaleTimeString()}`
            )}
          </Typography>
          
          {mermaidGeneration.error && (
            <Chip 
              label="Generation Error" 
              color="warning" 
              size="small" 
              icon={<ErrorIcon />}
            />
          )}
          
          <Button
            startIcon={<RefreshIcon />}
            onClick={mermaidGeneration.regenerateDiagram}
            size="small"
            disabled={mermaidGeneration.isGenerating}
          >
            Regenerate
          </Button>
        </Box>
        
        {/* Mermaid Viewer */}
        <Box sx={{ p: 2 }}>
          <MermaidChart
            chart={workflow.mermaidDiagram || ''}
            id="workflow-diagram"
            onError={(error) => {
              console.error('Mermaid chart error:', error);
            }}
          />
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      p: fullScreen ? 3 : 2 
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <WorkflowIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Workflow Visualization
        </Typography>
        {fullScreen && (
          <Chip label="Full Screen" size="small" sx={{ ml: 'auto' }} />
        )}
        {!fullScreen && (
          <IconButton sx={{ ml: 'auto' }} size="small">
            <FullscreenIcon />
          </IconButton>
        )}
      </Box>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="workflow visualization tabs">
          <Tab label="Step Tree" {...a11yProps(0)} />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Diagram
                {mermaidGeneration.isGenerating && (
                  <CircularProgress size={12} />
                )}
                <AIIcon fontSize="small" color="primary" />
              </Box>
            } 
            {...a11yProps(1)} 
          />
        </Tabs>
      </Box>
      
      {/* Tab Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          {workflowSteps.length > 0 ? (
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6">
                    Workflow Step Tree
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tree view showing complete workflow structure with all nested steps
                  </Typography>
                </Box>
              </Box>
              <WorkflowStepTree 
                steps={workflowSteps}
                onStepEdit={handleEditStep}
              />
            </Box>
          ) : (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Alert severity="info">
                <Typography variant="h6" gutterBottom>
                  No Workflow Steps
                </Typography>
                <Typography variant="body2">
                  Start a conversation with aime to create workflow steps.
                </Typography>
              </Alert>
            </Box>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {renderMermaidDiagram()}
        </TabPanel>
      </Box>

      {/* Step Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Workflow Step</DialogTitle>
        <DialogContent>
          {editingStep && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Step Name"
                value={editingStep.name}
                onChange={(e) => setEditingStep({ ...editingStep, name: e.target.value })}
                fullWidth
              />
              
              <TextField
                label="Step ID"
                value={editingStep.id}
                onChange={(e) => setEditingStep({ ...editingStep, id: e.target.value })}
                fullWidth
                helperText="Unique identifier for this step"
              />

              <Chip label={editingStep.type} size="small" sx={{ width: 'fit-content' }} />
              
              {editingStep.action && (
                <TextField
                  label="Action"
                  value={editingStep.action}
                  onChange={(e) => setEditingStep({ ...editingStep, action: e.target.value })}
                  fullWidth
                />
              )}
              
              {editingStep.params && (
                <TextField
                  label="Parameters (JSON)"
                  value={JSON.stringify(editingStep.params, null, 2)}
                  onChange={(e) => {
                    try {
                      const params = JSON.parse(e.target.value);
                      setEditingStep({ ...editingStep, params });
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  multiline
                  rows={4}
                  fullWidth
                />
              )}
              
              {editingStep.condition && (
                <TextField
                  label="Condition (JSON)"
                  value={JSON.stringify(editingStep.condition, null, 2)}
                  onChange={(e) => {
                    try {
                      const condition = JSON.parse(e.target.value);
                      setEditingStep({ ...editingStep, condition });
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  multiline
                  rows={6}
                  fullWidth
                />
              )}
              
              {(editingStep.onSuccessGoTo || editingStep.onFailureGoTo) && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {editingStep.onSuccessGoTo && (
                    <TextField
                      label="On Success Go To"
                      value={editingStep.onSuccessGoTo}
                      onChange={(e) => setEditingStep({ ...editingStep, onSuccessGoTo: e.target.value })}
                      fullWidth
                    />
                  )}
                  {editingStep.onFailureGoTo && (
                    <TextField
                      label="On Failure Go To"
                      value={editingStep.onFailureGoTo}
                      onChange={(e) => setEditingStep({ ...editingStep, onFailureGoTo: e.target.value })}
                      fullWidth
                    />
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSaveEditedStep} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}