// src/app/workflows/configure/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Container,
  Button
} from '@mui/material';
import {WorkflowTemplate } from '@/app/types/workflowTemplate';
import ResponsiveWorkflowConfigurator from '@/app/components/ResponsiveWorkflowConfigurator';
import { useWorkflowTemplate } from '@/app/hooks/useWorkflowTemplate';
import { useAimeWorkflow } from '@/app/hooks/useAimeWorkflow';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowConfigurePage({ params }: PageProps) {

  // Callback when template is saved (trigger selector refresh)
  const handleTemplateSaved = useCallback((savedTemplate: WorkflowTemplate) => {
    console.log('[Page] Template saved, ID:', savedTemplate.id);
  }, []);


  const handleTemplateLoad = useCallback((loadedTemplate: WorkflowTemplate) => {
    console.log('🔄 [Page] Template loaded, updating selector:', loadedTemplate.id);
  }, []);

  // Use workflow template hook with immediate auto-save
  const {
  template, isLoading, isContextLoading,
  error, isSaving,
    loadTemplate, 
    updateWorkflowDefinition, updateTemplateLabel,
    clearError
  } = useWorkflowTemplate({ 
    onTemplateSaved: handleTemplateSaved,
    onTemplateLoad: handleTemplateLoad
  });

  const {
    messages,  
    sendMessage  
  } = useAimeWorkflow({
    workflowTemplateId: template?.id || '',
    workflowDefinition: template?.workflowDefinition || { steps: [] },
    onMessage: (message: string) => {
      console.log('[Page] AIme message:', message);
    },
    onWorkflowDefinitionChange: updateWorkflowDefinition
  });
  
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        console.log('🛠️ [Page] Resolved params:', resolvedParams);
        
        // Wait for user context to finish loading before loading/creating template
        if (!isContextLoading && !initialized) {
          setInitialized(true);
          await loadTemplate(id);
        }
      } catch (err) {
        console.error('Error resolving params:', err);
      }
    };    
    resolveParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, isContextLoading, initialized]);

  
  // Show loading state (wait for both context and template)
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
  console.log('📄 Page render - Template state:', template);
  if (!(template && template.metadata)) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            No Workflow Loaded
          </Typography>
          <Typography color="text.secondary">
            Loading workflow template...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Main workflow configurator
  return (
    <Container sx={{ m: 0, p: 0, py: 2, height: 'calc(100% - 64px)', width: '100%' }}>
      {isSaving && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Saving workflow to database...
        </Alert>
      )}
      
      <ResponsiveWorkflowConfigurator
        workflowTemplate={template}
        messages={messages}
        sendMessage={sendMessage}
        onWorkflowDefinitionChange={updateWorkflowDefinition}
        onTemplateLabelChange={updateTemplateLabel}
      />
    </Container>
  );
}
