// src/app/test-autocomplete/page.tsx
'use client';

import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ConversationPane from '@/app/components/ConversationPane';
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
      
      <Paper sx={{ mt: 2, height: '400px' }}>
        <ConversationPane
          workflow={workflow}
          onWorkflowChange={setWorkflow}
          validationResult={sampleValidation}
          isNewWorkflow={false}
        />
      </Paper>
    </Box>
  );
}