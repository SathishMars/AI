// src/app/components/WorkflowConfigurator.tsx
'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Publish as PublishIcon,
  Fullscreen as FullscreenIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import ConversationPane from './ConversationPane';
import VisualizationPane from './VisualizationPane';

interface WorkflowConfiguratorProps {
  workflow: WorkflowJSON;
  onWorkflowChange: (workflow: WorkflowJSON) => void;
  validationResult: ValidationResult | null;
  isNewWorkflow: boolean;
}

export default function WorkflowConfigurator({
  workflow,
  onWorkflowChange,
  validationResult,
  isNewWorkflow
}: WorkflowConfiguratorProps) {
  const [showFullVisualization, setShowFullVisualization] = useState(false);
  const [showRawJSON, setShowRawJSON] = useState(false);
  
  const handleSave = () => {
    // Update metadata
    const updatedWorkflow = {
      ...workflow,
      metadata: {
        ...workflow.metadata,
        updatedAt: new Date()
      }
    };
    onWorkflowChange(updatedWorkflow);
  };
  
  const handlePublish = () => {
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
  };
  
  return (
    <Box sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Workflow Configurator
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<SaveIcon />}
              variant="outlined"
              size="small"
              onClick={handleSave}
            >
              Save Draft
            </Button>
            
            <Button
              startIcon={<PublishIcon />}
              variant="contained"
              size="small"
              onClick={handlePublish}
              disabled={!validationResult?.isValid}
            >
              Publish
            </Button>
            
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
      
      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {showFullVisualization ? (
          // Full screen visualization
          <VisualizationPane
            workflow={workflow}
            validationResult={validationResult}
            onWorkflowChange={onWorkflowChange}
            fullScreen
          />
        ) : showRawJSON ? (
          // Raw JSON view
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Raw Workflow JSON</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(workflow, null, 2)}
              </pre>
            </Paper>
          </Box>
        ) : (
          // Dual pane layout using flex
          <Box sx={{ display: 'flex', height: '100%' }}>
            <Box 
              sx={{ 
                width: { xs: '100%', md: '50%' },
                borderRight: { md: 1 }, 
                borderColor: 'divider',
                minWidth: '300px'
              }}
            >
              <ConversationPane
                workflow={workflow}
                onWorkflowChange={onWorkflowChange}
                validationResult={validationResult}
                isNewWorkflow={isNewWorkflow}
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', md: '50%' }, display: { xs: 'none', md: 'block' } }}>
              <VisualizationPane
                workflow={workflow}
                validationResult={validationResult}
                onWorkflowChange={onWorkflowChange}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}