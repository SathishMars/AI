// src/app/components/VisualizationPane.tsx
'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { WorkflowJSON, ValidationResult, WorkflowStep } from '@/app/types/workflow';

interface VisualizationPaneProps {
  workflow: WorkflowJSON;
  validationResult: ValidationResult | null;
  onWorkflowChange: (workflow: WorkflowJSON) => void;
  fullScreen?: boolean;
}

export default function VisualizationPane({
  workflow,
  validationResult,
  onWorkflowChange,
  fullScreen = false
}: VisualizationPaneProps) {
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
      </Box>
      
      {/* Visualization Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Paper sx={{ p: 3, height: '100%', bgcolor: 'grey.50' }}>
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            📊 Mermaid Diagram Visualization
          </Typography>
          
          {/* Workflow Steps Overview */}
          <Typography variant="h6" gutterBottom>Workflow Steps</Typography>
          <List dense>
            {Object.entries(workflow.steps).map(([stepId, step]) => {
              const stepErrors = getStepErrors(stepId);
              const hasErrors = stepErrors.length > 0;
              
              return (
                <ListItem key={stepId} sx={{ 
                  border: 1, 
                  borderColor: hasErrors ? 'error.main' : 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: hasErrors ? 'error.light' : 'background.paper'
                }}>
                  <ListItemText
                    primary={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{getStepIcon(step)}</span>
                        <Typography variant="subtitle2" component="span">{step.name}</Typography>
                        <Chip label={step.type} size="small" variant="outlined" />
                        {hasErrors && <ErrorIcon color="error" fontSize="small" />}
                        {!hasErrors && <SuccessIcon color="success" fontSize="small" />}
                      </span>
                    }
                    secondary={
                      <>
                        {step.action && (
                          <Typography variant="caption" display="block">
                            Action: {step.action}
                          </Typography>
                        )}
                        {step.condition && (
                          <Typography variant="caption" display="block">
                            Has conditions
                          </Typography>
                        )}
                        {stepErrors.map(error => (
                          <Alert key={error.id} severity="error" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              {error.conversationalExplanation}
                            </Typography>
                          </Alert>
                        ))}
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
          
          <Typography variant="body2" sx={{ mt: 3, fontStyle: 'italic', color: 'text.secondary' }}>
            💡 This is a placeholder for the full Mermaid visualization. In the complete implementation, this will feature:
            <br />• Interactive Mermaid flowchart diagrams
            <br />• Real-time updates during AI conversations
            <br />• Zoom and pan controls
            <br />• Click-to-edit step parameters
            <br />• Visual error highlighting
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}