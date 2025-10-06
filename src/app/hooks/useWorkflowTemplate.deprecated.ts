// src/app/hooks/useWorkflowTemplate.deprecated.ts
//
// ⚠️ DEPRECATED ⚠️
// This hook is deprecated and will be removed in a future version.
// Please use useWorkflowTemplateV2 instead.
//
// Migration Guide:
// 1. Replace import: useWorkflowTemplateV2 from '@/app/hooks/useWorkflowTemplateV2'
// 2. Hook now returns workflowJSON property instead of workflow
// 3. Auto-save is immediate (no 2-second delay by default)
// 4. Use updateWorkflowDefinition() instead of updateWorkflow()
// 5. Use updateTemplateName() for name changes
//
// See: ai-implementation-summaries/phase2-component-integration-complete.md
//
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  WorkflowTemplate, 
  CreateWorkflowTemplateInput,
  UpdateWorkflowTemplateInput,
  TemplateResolutionResult 
} from '@/app/types/workflow-template';
import { WorkflowJSON } from '@/app/types/workflow';
import { WorkflowTemplateService } from '@/app/services/workflow-template-service';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';
import { validateForAutoSave } from '@/app/utils/workflow-validation';
import { WorkflowStep } from '@/app/types/workflow';

interface UseWorkflowTemplateOptions {
  templateName?: string;
  autoLoad?: boolean;
  autoSave?: boolean; // Enable auto-save to database
  autoSaveDelay?: number; // Delay in ms before auto-saving
}

interface UseWorkflowTemplateReturn {
  // Current template data
  template: WorkflowTemplate | null;
  templateResult: TemplateResolutionResult | null;
  workflow: WorkflowJSON | null;
  currentTemplateName: string | null; // Current template name (generated or provided)
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  isAutoSaving: boolean;
  
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
  saveWorkflowNow: () => Promise<void>; // Force immediate save
  
  // Utility
  clearError: () => void;
}

export function useWorkflowTemplate(options: UseWorkflowTemplateOptions = {}): UseWorkflowTemplateReturn {
  const { 
    templateName, 
    autoLoad = true, 
    autoSave = true, 
    autoSaveDelay = 3000 
  } = options;
  const { account, currentOrganization, isLoading: contextLoading } = useUnifiedUserContext();
  const accountId = account?.id;
  const organizationId = currentOrganization?.id || null;
  
  // Create service instance with current context
  const [templateService] = useState(() => new WorkflowTemplateService());
  
  // State
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [templateResult, setTemplateResult] = useState<TemplateResolutionResult | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowJSON | null>(null);
  const [originalWorkflow, setOriginalWorkflow] = useState<WorkflowJSON | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTemplateName, setCurrentTemplateName] = useState<string | null>(templateName || null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Set account and organization on service
  useEffect(() => {
    if (accountId) {
      templateService.setAccount(accountId);
    }
    if (organizationId !== undefined) {
      templateService.setOrganization(organizationId);
    }
  }, [accountId, organizationId, templateService]);
  
  // Computed state
  const isNewTemplate = !template;
  const hasUnsavedChanges = !!(workflow && originalWorkflow && 
    JSON.stringify(workflow) !== JSON.stringify(originalWorkflow));
  const suggestCreateDraft = templateResult?.suggestCreateDraft || false;
  
  // Load template by name
  const loadTemplate = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await templateService.getTemplate(id);
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
  }, [templateService]);
  
      // Auto-load template on mount if specified
  useEffect(() => {
    if (autoLoad && templateName && accountId && !contextLoading) {
      loadTemplate(templateName);
    }
  }, [autoLoad, templateName, accountId, contextLoading, loadTemplate]);
  
  // Create new template
  const createTemplate = useCallback(async (input: Omit<CreateWorkflowTemplateInput, 'account' | 'organization'>) => {
    if (!accountId) {
      throw new Error('No account context available');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const fullInput: CreateWorkflowTemplateInput = {
        ...input,
        account: accountId,
        organization: organizationId || undefined // Convert null to undefined for optional field
      };
      
      const newTemplate = await templateService.createTemplate(fullInput);
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
  }, [accountId, organizationId, templateService, loadTemplate]);
  
  // Update existing template
  const updateTemplate = useCallback(async (updates: UpdateWorkflowTemplateInput) => {
    if (!template) {
      throw new Error('No template loaded to update');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedTemplate = await templateService.updateTemplate(
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
  }, [template, templateService]);
  
  // Publish template
  const publishTemplate = useCallback(async () => {
    if (!template) {
      throw new Error('No template loaded to publish');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const publishedTemplate = await templateService.publishTemplate(
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
  }, [template, loadTemplate, templateService]);
  
  // Create draft from published
  const createDraft = useCallback(async (author: string) => {
    if (!template) {
      throw new Error('No template loaded to create draft from');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const draftTemplate = await templateService.createDraftFromPublished(
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
  }, [template, loadTemplate, templateService]);
  
  // Delete template
  const deleteTemplate = useCallback(async () => {
    if (!template) {
      throw new Error('No template loaded to delete');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await templateService.deleteTemplate(
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
  }, [template, templateService]);
  
  // Save workflow to database immediately
  const saveWorkflowToDatabase = useCallback(async () => {
    if (!workflow || !accountId || isAutoSaving) return;
    
    // CRITICAL: Don't save if template name is not set (new/create)
    if (!currentTemplateName || currentTemplateName === 'new' || currentTemplateName === 'create') {
      console.log('Skipping auto-save: workflow not named yet');
      return;
    }
    
    // CRITICAL: Use validateForAutoSave to check if workflow has real steps
    // This validates the workflow structure is ready for saving
    const autoSaveValidation = validateForAutoSave(workflow.steps as WorkflowStep[]);
    if (!autoSaveValidation.shouldSave) {
      console.log('Skipping auto-save:', autoSaveValidation.reasons.join(', '));
      return;
    }
    
    try {
      setIsAutoSaving(true);
      
      const templateInput: CreateWorkflowTemplateInput = {
        account: accountId,
        organization: organizationId || undefined,
        name: currentTemplateName,
        workflowDefinition: workflow,
        category: 'ai-generated',
        tags: ['auto-generated'],
        author: account?.name || 'AI Assistant',
        description: 'Workflow created through AI conversation'
      };
      
      if (template) {
        // Update existing template
        const updates: UpdateWorkflowTemplateInput = {
          workflowDefinition: workflow
        };
        await templateService.updateTemplate(currentTemplateName, template.version, updates);
      } else {
        // Create new template
        const newTemplate = await templateService.createTemplate(templateInput);
        setTemplate(newTemplate);
        setOriginalWorkflow(workflow);
      }
      
      console.log('Workflow auto-saved to database:', currentTemplateName);
    } catch (err) {
      console.warn('Auto-save failed, workflow preserved in memory:', err);
      // Don't set error state for auto-save failures to avoid disrupting user
    } finally {
      setIsAutoSaving(false);
    }
  }, [workflow, accountId, organizationId, isAutoSaving, currentTemplateName, template, templateService, account]);
  
  // Auto-save workflow to database
  const scheduleAutoSave = useCallback(() => {
    if (!autoSave || !workflow || !accountId) return;
    
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    // Schedule new auto-save
    const timeout = setTimeout(async () => {
      await saveWorkflowToDatabase();
    }, autoSaveDelay);
    
    setAutoSaveTimeout(timeout);
  }, [autoSave, workflow, accountId, autoSaveTimeout, autoSaveDelay, saveWorkflowToDatabase, setAutoSaveTimeout]);
  
  // Force immediate save
  const saveWorkflowNow = useCallback(async () => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }
    await saveWorkflowToDatabase();
  }, [autoSaveTimeout, saveWorkflowToDatabase, setAutoSaveTimeout]);
  
  // Update workflow in memory and schedule auto-save
  const updateWorkflow = useCallback((newWorkflow: WorkflowJSON) => {
    setWorkflow(newWorkflow);
    
    // Sync template name from workflow metadata if it has changed
    if (newWorkflow.metadata?.name && newWorkflow.metadata.name !== currentTemplateName) {
      setCurrentTemplateName(newWorkflow.metadata.name);
    }
    
    scheduleAutoSave();
  }, [scheduleAutoSave, currentTemplateName]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);
  
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
    currentTemplateName,
    
    // State
    isLoading: isLoading || contextLoading,
    error,
    isAutoSaving,
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
    saveWorkflowNow,
    
    // Utility
    clearError,
  };
}