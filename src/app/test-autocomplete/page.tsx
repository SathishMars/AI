// src/app/test-autocomplete/page.tsx
'use client';

import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import WorkflowCreationPane from '@/app/components/WorkflowCreationPane';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';

const sampleWorkflow: WorkflowJSON = {
  schemaVersion: '1.0.0',
  metadata: {
    id: 'test-workflow',
    name: 'Test Autocomplete Workflow',
    description: 'Testing autocomplete functionality',
    version: '1.0.0',
    status: 'draft',
    tags: ['test', 'autocomplete'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  steps: {
    start: {
      name: 'Start Step',
      type: 'trigger',
      action: 'onFormSubmit',
      params: {},
      nextSteps: ['end']
    },
    end: {
      name: 'End Step', 
      type: 'end',
      result: 'success'
    }
  }
};

const sampleValidation: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  info: []
};

export default function TestAutocompletePage() {
  const [workflow, setWorkflow] = useState<WorkflowJSON>(sampleWorkflow);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Autocomplete Test Page
      </Typography>
      
      <Typography variant="body1" gutterBottom>
        Test typing @ to see function suggestions and # for workflow steps.
      </Typography>
      
      <Typography variant="body2" color="info.main" sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
        ℹ️ This page now uses WorkflowCreationPane - the modern conversation interface with enhanced autocomplete features.
      </Typography>
      
      <Paper sx={{ mt: 2, height: '500px' }}>
        <WorkflowCreationPane
          workflow={workflow}
          onWorkflowChange={setWorkflow}
          validationResult={sampleValidation}
          isNewWorkflow={false}
        />
      </Paper>
    </Box>
  );
}