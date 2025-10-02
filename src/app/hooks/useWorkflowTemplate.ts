// src/app/hooks/useWorkflowTemplate.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  WorkflowTemplate, 
  CreateWorkflowTemplateInput,
  UpdateWorkflowTemplateInput,
  TemplateResolutionResult 
} from '@/app/types/workflow-template';
import { WorkflowJSON } from '@/app/types/workflow';
import { workflowTemplateService } from '@/app/services/workflow-template-service';
import { useAccount } from '@/app/contexts/UnifiedUserContext';

interface UseWorkflowTemplateOptions {
  templateName?: string;
  autoLoad?: boolean;
}

interface UseWorkflowTemplateReturn {
  // Current template data
  template: WorkflowTemplate | null;
  templateResult: TemplateResolutionResult | null;
  workflow: WorkflowJSON | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Template state info
  isNewTemplate: boolean;
  hasUnsavedChanges: boolean;
  suggestCreateDraft: boolean;
  
  // Operations
  loadTemplate: (name: string) => Promise<void>;
  createTemplate: (input: Omit<CreateWorkflowTemplateInput, 'account'>) => Promise<WorkflowTemplate>;
  updateTemplate: (updates: UpdateWorkflowTemplateInput) => Promise<WorkflowTemplate>;
  publishTemplate: () => Promise<WorkflowTemplate>;
  createDraft: (author: string) => Promise<WorkflowTemplate>;
  deleteTemplate: () => Promise<boolean>;
  
  // Workflow operations
  updateWorkflow: (workflow: WorkflowJSON) => void;
  resetChanges: () => void;
  
  // Utility
  clearError: () => void;
}

export function useWorkflowTemplate(options: UseWorkflowTemplateOptions = {}): UseWorkflowTemplateReturn {
  const { templateName, autoLoad = true } = options;
  const { account, isLoading: accountLoading } = useAccount();
  const accountId = account?.id;
  
  // State
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [templateResult, setTemplateResult] = useState<TemplateResolutionResult | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowJSON | null>(null);
  const [originalWorkflow, setOriginalWorkflow] = useState<WorkflowJSON | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set account on service
  useEffect(() => {
    if (accountId) {
      workflowTemplateService.setAccount(accountId);
    }
  }, [accountId]);
  
  // Computed state
  const isNewTemplate = !template;
  const hasUnsavedChanges = !!(workflow && originalWorkflow && 
    JSON.stringify(workflow) !== JSON.stringify(originalWorkflow));
  const suggestCreateDraft = templateResult?.suggestCreateDraft || false;
  
  // Load template by name
  const loadTemplate = useCallback(async (name: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await workflowTemplateService.getTemplate(name);
      setTemplateResult(result);
      setTemplate(result.template);
      
      if (result.template) {
        setWorkflow(result.template.workflowDefinition);
        setOriginalWorkflow(result.template.workflowDefinition);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load template';
      setError(errorMessage);
      setTemplate(null);
      setTemplateResult(null);
      setWorkflow(null);
      setOriginalWorkflow(null);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
    // Auto-load template if specified (wait for account to be loaded)
  useEffect(() => {
    if (autoLoad && templateName && accountId && !accountLoading) {
      loadTemplate(templateName);
    }
  }, [autoLoad, templateName, accountId, accountLoading, loadTemplate]);
  
  // Create new template
  const createTemplate = useCallback(async (input: Omit<CreateWorkflowTemplateInput, 'account'>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newTemplate = await workflowTemplateService.createTemplate(input);
      setTemplate(newTemplate);
      setWorkflow(newTemplate.workflowDefinition);
      setOriginalWorkflow(newTemplate.workflowDefinition);
      
      // Reload to get full template result
      await loadTemplate(newTemplate.name);
      
      return newTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadTemplate]);
  
  // Update existing template
  const updateTemplate = useCallback(async (updates: UpdateWorkflowTemplateInput) => {
    if (!template) {
      throw new Error('No template loaded to update');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedTemplate = await workflowTemplateService.updateTemplate(
        template.name,
        template.version,
        updates
      );
      
      setTemplate(updatedTemplate);
      if (updatedTemplate.workflowDefinition) {
        setWorkflow(updatedTemplate.workflowDefinition);
        setOriginalWorkflow(updatedTemplate.workflowDefinition);
      }
      
      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [template]);
  
  // Publish template
  const publishTemplate = useCallback(async () => {
    if (!template) {
      throw new Error('No template loaded to publish');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const publishedTemplate = await workflowTemplateService.publishTemplate(
        template.name,
        template.version
      );
      
      setTemplate(publishedTemplate);
      
      // Reload to get updated template result
      await loadTemplate(template.name);
      
      return publishedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [template, loadTemplate]);
  
  // Create draft from published
  const createDraft = useCallback(async (author: string) => {
    if (!template) {
      throw new Error('No template loaded to create draft from');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const draftTemplate = await workflowTemplateService.createDraftFromPublished(
        template.name,
        template.version,
        author
      );
      
      setTemplate(draftTemplate);
      setWorkflow(draftTemplate.workflowDefinition);
      setOriginalWorkflow(draftTemplate.workflowDefinition);
      
      // Reload to get updated template result
      await loadTemplate(template.name);
      
      return draftTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create draft';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [template, loadTemplate]);
  
  // Delete template
  const deleteTemplate = useCallback(async () => {
    if (!template) {
      throw new Error('No template loaded to delete');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await workflowTemplateService.deleteTemplate(
        template.name,
        template.version
      );
      
      if (success) {
        setTemplate(null);
        setTemplateResult(null);
        setWorkflow(null);
        setOriginalWorkflow(null);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [template]);
  
  // Update workflow in memory
  const updateWorkflow = useCallback((newWorkflow: WorkflowJSON) => {
    setWorkflow(newWorkflow);
  }, []);
  
  // Reset changes to original
  const resetChanges = useCallback(() => {
    if (originalWorkflow) {
      setWorkflow(originalWorkflow);
    }
  }, [originalWorkflow]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    // Data
    template,
    templateResult,
    workflow,
    
    // State
    isLoading: isLoading || accountLoading,
    error,
    isNewTemplate,
    hasUnsavedChanges,
    suggestCreateDraft,
    
    // Operations
    loadTemplate,
    createTemplate,
    updateTemplate,
    publishTemplate,
    createDraft,
    deleteTemplate,
    
    // Workflow operations
    updateWorkflow,
    resetChanges,
    
    // Utility
    clearError,
  };
}