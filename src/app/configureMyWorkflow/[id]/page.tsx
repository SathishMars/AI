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
import { WorkflowJSON } from '@/app/types/workflow';
import ResponsiveWorkflowConfigurator from '@/app/components/ResponsiveWorkflowConfigurator';
import { useWorkflowTemplate } from '@/app/hooks/useWorkflowTemplate';
import { createDefaultWorkflow } from '@/app/utils/workflow-defaults';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ConfigureMyWorkflowPage({ params }: PageProps) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  
  const {
    workflow,
    isLoading,
    error,
    isAutoSaving,
    isNewTemplate,
    hasUnsavedChanges,
    loadTemplate,
    updateWorkflow,
    clearError
  } = useWorkflowTemplate({
    templateName: templateId || undefined,
    autoLoad: false,
    autoSave: true, // Enable auto-save to database
    autoSaveDelay: 2000 // Auto-save 2 seconds after changes
  });

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        
        setTemplateId(id);
        
        if (id === 'new' || id === 'create') {
          // Create a blank new workflow
          const defaultWorkflow = createDefaultWorkflow();
          updateWorkflow(defaultWorkflow);
        } else {
          // Load existing workflow template
          await loadTemplate(id);
        }
      } catch (err) {
        console.error('Error resolving params:', err);
      }
    };
    
    
    resolveParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]); // Remove function dependencies to prevent infinite loops

  const handleSaveTemplate = async (workflowData: WorkflowJSON) => {
    try {
      updateWorkflow(workflowData);
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };
  
  const handleTemplateNameChange = async (newName: string) => {
    try {
      // Update the template name in the workflow metadata
      if (workflow) {
        const updatedWorkflow: WorkflowJSON = {
          ...workflow,
          metadata: {
            ...workflow.metadata,
            name: newName
          }
        };
        await updateWorkflow(updatedWorkflow);
      }
      
      // Update the local template ID state to reflect the new name
      setTemplateId(newName);
      
      // Note: No page redirect - stay on current page with updated name
    } catch (err) {
      console.error('Failed to change template name:', err);
      throw err;
    }
  };  // Show loading state
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
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
  if (!workflow) {
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
      
      {isAutoSaving && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Auto-saving workflow to database...
        </Alert>
      )}
      
      <ResponsiveWorkflowConfigurator
        workflow={workflow}
        onWorkflowChange={handleSaveTemplate}
        validationResult={null}
        isNewWorkflow={isNewTemplate}
        currentTemplateName={templateId || 'new'}
        onTemplateNameChange={handleTemplateNameChange}
      />
    </Container>
  );
}
