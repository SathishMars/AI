// src/app/configureMyWorkflow/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Skeleton,
  Chip
} from '@mui/material';
import { WorkflowJSON, ValidationResult } from '@/app/types/workflow';
import { validateWorkflow } from '@/app/validators/workflow';
import { functionsLibraryManager } from '@/app/utils/functions-library';
import WorkflowConfigurator from '@/app/components/WorkflowConfigurator';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ConfigureMyWorkflowPage({ params }: PageProps) {
  const [workflow, setWorkflow] = useState<WorkflowJSON | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewWorkflow, setIsNewWorkflow] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      
      if (id === 'new') {
        setIsNewWorkflow(true);
        // Create new workflow template
        const newWorkflow: WorkflowJSON = {
          schemaVersion: '1.0.0',
          metadata: {
            id: `workflow_${Date.now()}`,
            name: 'New Workflow',
            description: 'A new workflow created with aime',
            version: '1.0.0',
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: []
          },
          steps: {
            start: {
              name: 'Start',
              type: 'trigger',
              action: 'onMRFSubmit',
              params: {},
              nextSteps: ['end']
            },
            end: {
              name: 'End',
              type: 'end',
              result: 'success'
            }
          }
        };
        setWorkflow(newWorkflow);
        setIsLoading(false);
      } else {
        // Load existing workflow
        loadWorkflow(id);
      }
    };
    
    resolveParams();
  }, [params]);

  const loadWorkflow = async (id: string) => {
    try {
      setIsLoading(true);
      // In a real implementation, this would fetch from an API
      // For now, create a sample workflow for demonstration
      const sampleWorkflow: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id,
          name: 'Sample Event Approval Workflow',
          description: 'Workflow for approving large events',
          version: '1.0.0',
          status: 'draft',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date(),
          tags: ['events', 'approval']
        },
        steps: {
          start: {
            name: 'Start',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: { mrfID: 'abcd', 'MRF Name': 'New Event Request' },
            nextSteps: ['checkForApproval']
          },
          checkForApproval: {
            name: 'Check for Approval',
            type: 'condition',
            condition: {
              all: [
                { fact: 'form.numberOfAttendees', operator: 'greater than', value: 100 },
                {
                  any: [
                    { fact: 'user.role', operator: 'not equal', value: 'admin' },
                    { fact: 'user.department', operator: 'not equal', value: 'management' }
                  ]
                }
              ]
            },
            onSuccess: 'sendForApproval',
            onFailure: 'createEvent'
          },
          sendForApproval: {
            name: 'Send for Approval',
            type: 'action',
            action: 'functions.requestApproval',
            params: { to: 'manager@example.com', cc: 'team@example.com' },
            onSuccess: 'createEvent',
            onFailure: 'terminateWithFailure'
          },
          createEvent: {
            name: 'Create Event',
            type: 'action',
            action: 'functions.createAnEvent',
            params: { mrfID: 'abcd' },
            nextSteps: ['end']
          },
          terminateWithFailure: {
            name: 'Notify User of Failure',
            type: 'action',
            action: 'functions.sendFailureEmail',
            params: { emailTemplateID: 'workflow_failure', cc: 'team@example.com' },
            nextSteps: ['end']
          },
          end: {
            name: 'End',
            type: 'end',
            result: 'success'
          }
        }
      };
      
      setWorkflow(sampleWorkflow);
      
      // Validate the loaded workflow
      const validation = await validateWorkflow(sampleWorkflow, functionsLibraryManager.getLibrary());
      setValidationResult(validation);
    } catch (error) {
      console.error('Error loading workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowSave = async (updatedWorkflow: WorkflowJSON) => {
    try {
      // Validate workflow before saving
      const validation = await validateWorkflow(updatedWorkflow, functionsLibraryManager.getLibrary());
      setValidationResult(validation);
      
      if (validation.isValid) {
        // In a real implementation, this would save to an API
        setWorkflow(updatedWorkflow);
        console.log('Workflow saved successfully:', updatedWorkflow);
      } else {
        console.log('Workflow validation failed:', validation.errors);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rectangular" width="100%" height={600} sx={{ mt: 2 }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isNewWorkflow ? 'Create New Workflow' : workflow?.metadata.name}
        </Typography>
        
        {workflow && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
            <Chip 
              label={workflow.metadata.status} 
              color={workflow.metadata.status === 'published' ? 'success' : 'warning'}
              size="small"
            />
            <Chip 
              label={`Schema v${workflow.schemaVersion}`} 
              variant="outlined"
              size="small"
            />
            {workflow.metadata.tags.map(tag => (
              <Chip key={tag} label={tag} variant="outlined" size="small" />
            ))}
          </Box>
        )}
        
        {workflow?.metadata.description && (
          <Typography variant="body1" color="text.secondary">
            {workflow.metadata.description}
          </Typography>
        )}
      </Box>

      {/* Validation Status */}
      {validationResult && (
        <Box sx={{ mb: 3 }}>
          {validationResult.errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Validation Errors ({validationResult.errors.length})</Typography>
              {validationResult.errors.slice(0, 3).map(error => (
                <Typography key={error.id} variant="body2">
                  • {error.conversationalExplanation}
                </Typography>
              ))}
              {validationResult.errors.length > 3 && (
                <Typography variant="body2">
                  • ... and {validationResult.errors.length - 3} more errors
                </Typography>
              )}
            </Alert>
          )}
          
          {validationResult.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Warnings ({validationResult.warnings.length})</Typography>
              {validationResult.warnings.slice(0, 2).map(warning => (
                <Typography key={warning.id} variant="body2">
                  • {warning.conversationalExplanation}
                </Typography>
              ))}
            </Alert>
          )}
          
          {validationResult.isValid && (
            <Alert severity="success">
              Workflow is valid and ready to be published!
            </Alert>
          )}
        </Box>
      )}

      {/* Main Workflow Configurator */}
      {workflow && (
        <Paper elevation={1} sx={{ p: 0, borderRadius: 2 }}>
          <WorkflowConfigurator
            workflow={workflow}
            onWorkflowChange={handleWorkflowSave}
            validationResult={validationResult}
            isNewWorkflow={isNewWorkflow}
          />
        </Paper>
      )}
    </Container>
  );
}