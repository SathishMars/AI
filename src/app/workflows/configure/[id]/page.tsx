// src/app/workflows/configure/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { WorkflowTemplate } from '@/app/types/workflowTemplate';
import ResponsiveWorkflowConfigurator from '@/app/components/ResponsiveWorkflowConfigurator';
import { useWorkflowTemplate } from '@/app/hooks/useWorkflowTemplate';
import { useAimeWorkflow } from '@/app/hooks/useAimeWorkflow';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowConfigurePage({ params }: PageProps) {

  // Callback when template is saved (trigger selector refresh)
  const handleTemplateSaved = useCallback((savedTemplate: WorkflowTemplate) => {
    logger.info('[Page] Template saved, ID:', savedTemplate.id);
  }, []);


  const handleTemplateLoad = useCallback((loadedTemplate: WorkflowTemplate) => {
    console.log('🔄 [Page] Template loaded, updating selector:', loadedTemplate.id);
  }, []);

  // Use workflow template hook with immediate auto-save
  const {
  template, isLoading, isContextLoading,
  error, isSaving,isPublishReady,
    loadTemplate, 
    updateWorkflowDefinition, updateTemplateLabel,
    clearError
  } = useWorkflowTemplate({ 
    onTemplateSaved: handleTemplateSaved,
    onTemplateLoad: handleTemplateLoad
  });

  const {
    messages,
    sendMessage,
    regenerateMermaidDiagram
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
      <div className="container mx-auto py-4">
        <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">
            {isContextLoading ? 'Loading user context...' : 'Loading workflow...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto py-4">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show empty state if no workflow loaded
  console.log('📄 Page render - Template state:', template);
  if (!(template && template.metadata)) {
    return (
      <div className="container mx-auto max-w-2xl py-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">
            No Workflow Loaded
          </h2>
          <p className="text-muted-foreground">
            Loading workflow template...
          </p>
        </div>
      </div>
    );
  }

  // Main workflow configurator
  return (
    <div className="m-0 p-0 h-full w-full">
      {isSaving && (
        <Alert className="mb-4">
          <AlertDescription>
            Saving workflow to database...
          </AlertDescription>
        </Alert>
      )}
      
      <ResponsiveWorkflowConfigurator
        workflowTemplate={template}
        messages={messages}
        isPublishReady={isPublishReady}
        sendMessage={sendMessage}
        regenerateMermaidDiagram={regenerateMermaidDiagram}
        onWorkflowDefinitionChange={updateWorkflowDefinition}
        onTemplateLabelChange={updateTemplateLabel}
      />
    </div>
  );
}
