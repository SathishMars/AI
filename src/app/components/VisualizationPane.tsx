// src/app/components/VisualizationPane.tsx
'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material';
import WorkflowStepTree from '@/app/components/WorkflowStepTree';
import { WorkflowStep, WorkflowDefinition, WorkflowTemplate } from '../types/workflowTemplate';
import MermaidChart from './MermaidChart';



interface VisualizationPaneProps {
  workflowTemplate: WorkflowTemplate;
  regenerateMermaidDiagram: () => Promise<void>;
  onWorkflowDefinitionChange: (workflowDefinition: WorkflowDefinition) => void;
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
  workflowTemplate,
  regenerateMermaidDiagram,
  onWorkflowDefinitionChange,
  fullScreen = false
}: VisualizationPaneProps) {
  const [tabValue, setTabValue] = useState(0);
  // const llmFunctionDefinitions = React.useMemo(() => getLLMContext(), []);
  // const functionDefinitionLookup = React.useMemo(
  //   () => buildFunctionDefinitionLookup(llmFunctionDefinitions),
  //   [llmFunctionDefinitions]
  // );

  // Initialize Mermaid generation hook
  // const mermaidGeneration = useMermaidGeneration(workflow, onWorkflowChange, {
  //   autoGenerate: true,
  //   debounceMs: 2000
  // });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStepSave = (updatedStep: WorkflowStep) => {
    // Update the step in the workflow definition
    const updateStepsRecursively = (steps: Array<WorkflowStep | string>): Array<WorkflowStep | string> => {
      return steps.map(step => {
        if (typeof step === 'string') {
          return step;
        }
        if (step.id === updatedStep.id) {
          // Since the edit form only allows the user to edit label, type, stepFunction, and functionParams we do not want the children steps to be overwritten
          // we will allow the children steps that are references to other steps (string ids) to be modified though
          return {
            ...step,
            ...{ label: updatedStep.label, type: updatedStep.type, stepFunction: updatedStep.stepFunction, functionParams: updatedStep.functionParams }
          };
        } else if (step.next && step.next.length > 0) {
          return { ...step, next: updateStepsRecursively(step.next) };
        } else if (step.onConditionPass && typeof step.onConditionPass === 'object') {
          return { ...step, onConditionPass: updateStepsRecursively([step.onConditionPass])[0] };
        } else if (step.onConditionFail && typeof step.onConditionFail === 'object') {
          return { ...step, onConditionFail: updateStepsRecursively([step.onConditionFail])[0] };
        } else if (step.onError && typeof step.onError === 'object') {
          return { ...step, onError: updateStepsRecursively([step.onError])[0] };
        } else if (step.onTimeout && typeof step.onTimeout === 'object') {
          return { ...step, onTimeout: updateStepsRecursively([step.onTimeout])[0] };
        } else {
          return step;
        }
      });
    }
    const updatedWorkflowDefinition = {
      ...workflowTemplate.workflowDefinition,
      steps: updateStepsRecursively(workflowTemplate.workflowDefinition.steps) as WorkflowStep[]
    };
  onWorkflowDefinitionChange(updatedWorkflowDefinition);
  }


  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      p: fullScreen ? 3 : 2
    }}>
      {/* Tabs with title integrated */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
          <WorkflowIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 500 }}>
            Workflow Visualization
          </Typography>
        </Box>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="workflow visualization tabs" sx={{ ml: 2 }}>
          <Tab label="Step Tree" {...a11yProps(0)} />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Diagram
                {/* {mermaidGeneration.isGenerating && (
                  <CircularProgress size={12} />
                )} */}
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
          {workflowTemplate.workflowDefinition.steps.length >= 0 ? (
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
                workflowSteps={workflowTemplate.workflowDefinition.steps}
                onStepSave={handleStepSave}
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
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <MermaidChart
              mermaidDiagram={workflowTemplate.mermaidDiagram || ''}
              regenerateMermaidDiagram={regenerateMermaidDiagram}
              onError={(error) => {
                console.error('Mermaid chart error:', error);
              }}
            />
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
}