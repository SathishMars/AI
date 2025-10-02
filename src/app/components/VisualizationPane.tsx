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
  Card,
  CardContent,
  CardHeader,
  TextField,
  IconButton,
  Button,
  CircularProgress,
  MenuItem
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  Fullscreen as FullscreenIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material';
import { WorkflowJSON, ValidationResult, WorkflowStep } from '@/app/types/workflow';
import { useMermaidGeneration } from '@/app/hooks/useMermaidGeneration';
import MermaidChart from '@/app/components/MermaidChart';



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
  validationResult,
  onWorkflowChange,
  fullScreen = false
}: VisualizationPaneProps) {
  const [tabValue, setTabValue] = useState(0);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  
  // Initialize Mermaid generation hook
  const mermaidGeneration = useMermaidGeneration(workflow, onWorkflowChange, {
    autoGenerate: true,
    debounceMs: 2000
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditStep = (stepId: string, step: WorkflowStep) => {
    setEditingStepId(stepId);
    setEditingStep({ ...step });
  };

  const handleSaveStep = () => {
    if (editingStepId && editingStep) {
      const updatedWorkflow = {
        ...workflow,
        steps: {
          ...workflow.steps,
          [editingStepId]: editingStep
        }
      };
      onWorkflowChange(updatedWorkflow);
      setEditingStepId(null);
      setEditingStep(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingStepId(null);
    setEditingStep(null);
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.type) {
      case 'trigger': return '🚀';
      case 'condition': return '❓';
      case 'action': return '⚙️';
      case 'end': return '🏁';
      default: return '📄';
    }
  };

  const getStepErrors = (stepId: string) => {
    return validationResult?.errors.filter(error => error.stepId === stepId) || [];
  };

  const renderWorkflowForms = () => {
    if (!workflow.steps || Object.keys(workflow.steps).length === 0) {
      return (
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
              Start a conversation with aime to create workflow steps, and they will appear here as editable forms.
            </Typography>
          </Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Workflow Steps Configuration
        </Typography>
        
        {Object.entries(workflow.steps).map(([stepId, step]) => {
          const stepErrors = getStepErrors(stepId);
          const hasErrors = stepErrors.length > 0;
          const isEditing = editingStepId === stepId;
          const currentStep = isEditing ? editingStep! : step;

          return (
            <Card 
              key={stepId} 
              sx={{ 
                mb: 2, 
                border: hasErrors ? 2 : 1,
                borderColor: hasErrors ? 'error.main' : 'divider',
                backgroundColor: hasErrors ? 'error.light' : 'background.paper'
              }}
            >
              <CardHeader
                avatar={<span style={{ fontSize: '1.5rem' }}>{getStepIcon(step)}</span>}
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">{currentStep.name}</Typography>
                    <Chip label={currentStep.type} size="small" variant="outlined" />
                    {hasErrors && <ErrorIcon color="error" fontSize="small" />}
                    {!hasErrors && <SuccessIcon color="success" fontSize="small" />}
                  </Box>
                }
                action={
                  isEditing ? (
                    <Box>
                      <IconButton onClick={handleSaveStep} color="primary" size="small">
                        <SaveIcon />
                      </IconButton>
                      <IconButton onClick={handleCancelEdit} size="small">
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <IconButton onClick={() => handleEditStep(stepId, step)} size="small">
                      <EditIcon />
                    </IconButton>
                  )
                }
              />
              
              <CardContent>
                {isEditing ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Step Name"
                      value={currentStep.name}
                      onChange={(e) => setEditingStep(prev => prev ? { ...prev, name: e.target.value } : null)}
                      fullWidth
                      size="small"
                    />
                    
                    {currentStep.action && (
                      <TextField
                        label="Action"
                        value={currentStep.action}
                        onChange={(e) => setEditingStep(prev => prev ? { ...prev, action: e.target.value } : null)}
                        fullWidth
                        size="small"
                      />
                    )}
                    
                    {currentStep.condition && (
                      <TextField
                        label="Condition (JSON)"
                        value={JSON.stringify(currentStep.condition, null, 2)}
                        onChange={(e) => {
                          try {
                            const condition = JSON.parse(e.target.value);
                            setEditingStep(prev => prev ? { ...prev, condition } : null);
                          } catch {
                            // Invalid JSON, don't update
                          }
                        }}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                      />
                    )}
                    
                    {currentStep.params && (
                      <TextField
                        label="Parameters (JSON)"
                        value={JSON.stringify(currentStep.params, null, 2)}
                        onChange={(e) => {
                          try {
                            const params = JSON.parse(e.target.value);
                            setEditingStep(prev => prev ? { ...prev, params } : null);
                          } catch {
                            // Invalid JSON, don't update
                          }
                        }}
                        multiline
                        rows={3}
                        fullWidth
                        size="small"
                      />
                    )}
                    
                    {(currentStep.onSuccess || currentStep.onFailure || 
                      ('onApproval' in currentStep && currentStep.onApproval) ||
                      ('onYes' in currentStep && currentStep.onYes) ||
                      ('onReject' in currentStep && currentStep.onReject) ||
                      ('onNo' in currentStep && currentStep.onNo)) && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">Navigation Paths</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {currentStep.onSuccess && (
                            <TextField
                              label="On Success"
                              value={currentStep.onSuccess}
                              onChange={(e) => setEditingStep(prev => prev ? { ...prev, onSuccess: e.target.value } : null)}
                              size="small"
                              sx={{ flex: 1, minWidth: 120 }}
                            />
                          )}
                          {currentStep.onFailure && (
                            <TextField
                              label="On Failure"
                              value={currentStep.onFailure}
                              onChange={(e) => setEditingStep(prev => prev ? { ...prev, onFailure: e.target.value } : null)}
                              size="small"
                              sx={{ flex: 1, minWidth: 120 }}
                            />
                          )}
                          {'onApproval' in currentStep && currentStep.onApproval && (
                            <TextField
                              label="On Approval"
                              value={currentStep.onApproval}
                              onChange={(e) => setEditingStep(prev => prev ? { ...prev, onApproval: e.target.value } : null)}
                              size="small"
                              sx={{ flex: 1, minWidth: 120 }}
                            />
                          )}
                          {'onYes' in currentStep && currentStep.onYes && (
                            <TextField
                              label="On Yes"
                              value={currentStep.onYes}
                              onChange={(e) => setEditingStep(prev => prev ? { ...prev, onYes: e.target.value } : null)}
                              size="small"
                              sx={{ flex: 1, minWidth: 120 }}
                            />
                          )}
                          {'onReject' in currentStep && currentStep.onReject && (
                            <TextField
                              label="On Reject"
                              value={currentStep.onReject}
                              onChange={(e) => setEditingStep(prev => prev ? { ...prev, onReject: e.target.value } : null)}
                              size="small"
                              sx={{ flex: 1, minWidth: 120 }}
                            />
                          )}
                          {'onNo' in currentStep && currentStep.onNo && (
                            <TextField
                              label="On No"
                              value={currentStep.onNo}
                              onChange={(e) => setEditingStep(prev => prev ? { ...prev, onNo: e.target.value } : null)}
                              size="small"
                              sx={{ flex: 1, minWidth: 120 }}
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                    
                    {('branches' in currentStep && currentStep.branches) ||
                     ('waitForSteps' in currentStep && currentStep.waitForSteps) ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">Branching/Merging</Typography>
                        {'branches' in currentStep && currentStep.branches && (
                          <TextField
                            label="Branches"
                            value={currentStep.branches.join(', ')}
                            onChange={(e) => {
                              const branches = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                              setEditingStep(prev => prev ? { ...prev, branches } : null);
                            }}
                            fullWidth
                            size="small"
                            helperText="Comma-separated list of parallel branch step IDs"
                          />
                        )}
                        {'waitForSteps' in currentStep && currentStep.waitForSteps && (
                          <TextField
                            label="Wait For Steps"
                            value={currentStep.waitForSteps.join(', ')}
                            onChange={(e) => {
                              const waitForSteps = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                              setEditingStep(prev => prev ? { ...prev, waitForSteps } : null);
                            }}
                            fullWidth
                            size="small"
                            helperText="Comma-separated list of step IDs to wait for"
                          />
                        )}
                        {'requireAllSuccess' in currentStep && currentStep.requireAllSuccess !== undefined && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                              label="Require All Success"
                              value={currentStep.requireAllSuccess ? 'true' : 'false'}
                              onChange={(e) => {
                                const requireAllSuccess = e.target.value === 'true';
                                setEditingStep(prev => prev ? { ...prev, requireAllSuccess } : null);
                              }}
                              select
                              size="small"
                              sx={{ flex: 1 }}
                            >
                              <MenuItem value="true">All Must Succeed</MenuItem>
                              <MenuItem value="false">Partial Success OK</MenuItem>
                            </TextField>
                            {'timeout' in currentStep && currentStep.timeout && (
                              <TextField
                                label="Timeout (min)"
                                value={currentStep.timeout}
                                onChange={(e) => {
                                  const timeout = parseInt(e.target.value) || 0;
                                  setEditingStep(prev => prev ? { ...prev, timeout } : null);
                                }}
                                type="number"
                                size="small"
                                sx={{ width: 120 }}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    ) : null}
                    
                    {currentStep.nextSteps && (
                      <TextField
                        label="Next Steps"
                        value={currentStep.nextSteps.join(', ')}
                        onChange={(e) => {
                          const nextSteps = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                          setEditingStep(prev => prev ? { ...prev, nextSteps } : null);
                        }}
                        fullWidth
                        size="small"
                        helperText="Comma-separated list of next step IDs"
                      />
                    )}
                  </Box>
                ) : (
                  <Box>
                    {step.action && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Action:</strong> {step.action}
                      </Typography>
                    )}
                    
                    {step.condition && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Condition:</strong> Complex condition logic defined
                      </Typography>
                    )}
                    
                    {step.params && Object.keys(step.params).length > 0 && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Parameters:</strong> {Object.keys(step.params).join(', ')}
                      </Typography>
                    )}
                    
                    {(step.onSuccess || step.onFailure) && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {step.onSuccess && <><strong>On Success:</strong> {step.onSuccess}<br /></>}
                        {step.onFailure && <><strong>On Failure:</strong> {step.onFailure}</>}
                      </Typography>
                    )}
                    
                    {step.nextSteps && step.nextSteps.length > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Next Steps:</strong> {step.nextSteps.join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}
                
                {/* Show validation errors */}
                {stepErrors.map(error => (
                  <Alert key={error.id} severity="error" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      {error.conversationalExplanation}
                    </Typography>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  const renderMermaidDiagram = () => {
    const hasSteps = Object.keys(workflow.steps).length > 0;
    
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
          <Tab label="Workflow Forms" {...a11yProps(0)} />
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
          {renderWorkflowForms()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {renderMermaidDiagram()}
        </TabPanel>
      </Box>
    </Box>
  );
}