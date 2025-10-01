// src/app/configureMyWorkflow/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  CircularProgress,
  Typography
} from '@mui/material';
import { WorkflowJSON } from '@/app/types/workflow';
import ResponsiveWorkflowConfigurator from '@/app/components/ResponsiveWorkflowConfigurator';
import { createDefaultWorkflow } from '@/app/utils/workflow-defaults';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ConfigureMyWorkflowPage({ params }: PageProps) {
  const [workflow, setWorkflow] = useState<WorkflowJSON | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        
        if (id === 'new') {
          // For new workflows, let WorkflowPageManager handle the default
          setWorkflow(null);
          setIsLoading(false);
        } else {
          // Load existing workflow
          await loadWorkflow(id);
        }
      } catch (err) {
        console.error('Error resolving params:', err);
        setError('Failed to load workflow');
        setIsLoading(false);
      }
    };
    
    resolveParams();
  }, [params]);

  const loadWorkflow = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Sample workflow demonstrating the conditional logic you requested
      const sampleWorkflow: WorkflowJSON = {
        schemaVersion: '1.0',
        metadata: {
          id,
          name: 'Event Approval Workflow',
          description: 'AI-generated workflow with conditional approval logic',
          version: '1.0.0',
          status: 'draft',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date(),
          tags: ['events', 'approval', 'ai-generated']
        },
        steps: {
          start: {
            name: 'MRF Submitted',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: { mrfID: 'dynamic' },
            nextSteps: ['checkApprovalNeeded']
          },
          checkApprovalNeeded: {
            name: 'Check Approval Requirements',
            type: 'condition',
            condition: {
              any: [
                {
                  fact: 'mrf.purpose',
                  operator: 'equal',
                  value: 'external'
                },
                {
                  fact: 'mrf.maxAttendees',
                  operator: 'greaterThan',
                  value: 100
                }
              ]
            },
            onSuccess: 'requestManagerApproval',
            onFailure: 'proceedDirectly'
          },
          requestManagerApproval: {
            name: 'Request Manager Approval',
            type: 'action',
            action: 'functions.requestApproval',
            params: {
              to: 'user.manager',
              subject: 'Event Approval Required',
              data: 'mrf'
            },
            onSuccess: 'createEvent',
            onFailure: 'notifyUser'
          },
          proceedDirectly: {
            name: 'Proceed Without Approval',
            type: 'action',
            action: 'functions.proceedDirectly',
            params: { reason: 'No approval required' },
            nextSteps: ['createEvent']
          },
          createEvent: {
            name: 'Create Event',
            type: 'action',
            action: 'functions.createEvent',
            params: { mrfID: 'dynamic' },
            nextSteps: ['end']
          },
          end: {
            name: 'Workflow Complete',
            type: 'end',
            result: 'success'
          }
        }
      };
      
      setWorkflow(sampleWorkflow);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading workflow:', error);
      setError('Failed to load workflow');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Loading workflow...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden' }}>
      <ResponsiveWorkflowConfigurator
        workflow={workflow || createDefaultWorkflow()}
        onWorkflowChange={(updatedWorkflow: WorkflowJSON) => {
          console.log('Workflow updated:', updatedWorkflow);
          setWorkflow(updatedWorkflow); // Actually update the state!
        }}
        validationResult={null}
        isNewWorkflow={workflow === null}
      />
    </Box>
  );
}