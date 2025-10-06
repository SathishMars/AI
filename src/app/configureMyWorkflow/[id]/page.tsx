// src/app/configureMyWorkflow/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Container,
  Button
} from '@mui/material';
import { WorkflowJSON, WorkflowStep } from '@/app/types/workflow';
import ResponsiveWorkflowConfigurator from '@/app/components/ResponsiveWorkflowConfigurator';
import { useWorkflowTemplateV2 } from '@/app/hooks/useWorkflowTemplateV2';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ConfigureMyWorkflowPage({ params }: PageProps) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  
  // Use NEW workflow template hook with immediate auto-save
  const {
    template,
    workflowJSON,
    isLoading,
    isContextLoading,
    error,
    isNewTemplate,
    hasUnsavedChanges,
    isSaving,
    canAutoSave,
    loadTemplate,
    initializeNewTemplate,
    updateWorkflowDefinition,
    updateTemplateName,
    saveTemplate,
    clearError
  } = useWorkflowTemplateV2({
    autoSave: true  // Immediate save (no delay)
  });
  
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        
        setTemplateId(id);
        
        // Wait for user context to finish loading before creating/loading templates
        if (!isContextLoading && !initialized) {
          setInitialized(true);
          
          if (id === 'new' || id === 'create') {
            // Initialize a new workflow in memory (no API call)
            // Will be saved to database when user starts editing
            initializeNewTemplate(
              'New Workflow',
              'Created from workflow builder'
            );
          } else {
            // Load existing template
            await loadTemplate(id);
          }
        }
      } catch (err) {
        console.error('Error resolving params:', err);
      }
    };    
    resolveParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, isContextLoading, initialized]); // Wait for context loading to complete

    const handleSaveTemplate = async (updatedWorkflow: WorkflowJSON) => {
    try {
      // Convert WorkflowJSON to WorkflowDefinition (just extract steps)
      await updateWorkflowDefinition({
        steps: updatedWorkflow.steps as WorkflowStep[]
      });
    } catch (err) {
      console.error('Failed to save workflow:', err);
    }
  };
  
    const handleTemplateNameChange = async (name: string) => {
    if (!template) return;
    
    // Update template name directly (no metadata duplication)
    await updateTemplateName(name);
  };  // Show loading state (wait for both context and template)
  if (isContextLoading || isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            {isContextLoading ? 'Loading user context...' : 'Loading workflow...'}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={clearError}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  // Show empty state if no workflow loaded
  if (!workflowJSON) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            No Workflow Loaded
          </Typography>
          <Typography color="text.secondary" paragraph>
            Loading workflow template...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Main workflow configurator
  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {hasUnsavedChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes. Make sure to save your work.
        </Alert>
      )}
      
      {isSaving && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Saving workflow to database...
        </Alert>
      )}
      
      {!canAutoSave && template && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Auto-save disabled: Please add at least one workflow step and provide a valid template name.
        </Alert>
      )}
      
      <ResponsiveWorkflowConfigurator
        workflow={workflowJSON}
        onWorkflowChange={handleSaveTemplate}
        validationResult={null}
        isNewWorkflow={isNewTemplate}
        currentTemplateName={template?.name || templateId || 'new'}
        onTemplateNameChange={handleTemplateNameChange}
      />
    </Container>
  );
}
