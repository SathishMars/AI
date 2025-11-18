'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkflowDefinition, WorkflowTemplate } from '@/app/types/workflowTemplate';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';
import { apiFetch } from '@/app/utils/api';




interface UseWorkflowTemplateOptions {
  templateId?: string;      // 10-char short-id
  onTemplateSaved?: (template: WorkflowTemplate) => void; // Callback after successful save
  onTemplateLoad?: (template: WorkflowTemplate) => void; // Callback after successful load
}

interface UseWorkflowTemplateReturn {
  // Current template data
  template: WorkflowTemplate | null;
  workflow: WorkflowDefinition | null;

  // Loading and error states
  isLoading: boolean;
  isContextLoading: boolean;  // True while user context is loading
  error: string | null;
  isSaving: boolean;
  isPublishReady: boolean;

  // Template state info
  isNewTemplate: boolean;

  // Operations
  loadTemplate: (id: string) => Promise<void>;
  saveTemplate: () => Promise<void>;
  updateWorkflowDefinition: (definition: WorkflowDefinition) => Promise<void>;
  updateTemplateLabel: (label: string) => Promise<void>;
  // Utility
  clearError: () => void;
  undo: () => void;
  reset: () => void;
}

export function useWorkflowTemplate(options: UseWorkflowTemplateOptions = {}): UseWorkflowTemplateReturn {
  const {
    templateId,
    onTemplateSaved,
    onTemplateLoad
  } = options;

  const { user, account, currentOrganization, isLoading: contextLoading } = useUnifiedUserContext();
  const accountId = account?.id;
  const organizationId = currentOrganization?.id || null;
  const userId = user?.id || null;

  // State
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [originalTemplate, setOriginalTemplate] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublishReady, setIsPublishReady] = useState<boolean>(false);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const templateRef = useRef<WorkflowTemplate | null>(null);
  const prevTemplatesRef = useRef<Array<WorkflowTemplate>>([]);

  // Computed state
  const workflow = template?.workflowDefinition || null;


  /**
   * Load template by ID from API
   */
  const loadTemplate = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Wait for context to load
      if (contextLoading) {
        throw new Error('User context is still loading. Please wait.');
      }

      if (!accountId || !userId) {
        throw new Error('Please ensure you are logged in.');
      }

      if (!id || (id.length !== 10 && id !== 'new')) {
        throw new Error('Invalid template ID');
      }
      if (id === 'new' || id === 'create') {
        setIsNewTemplate(true);
      }

      // Call API to get template
      const response = await apiFetch(`/api/workflow-templates/${id}`, {
        headers: {
          'x-account': accountId,
          'x-organization': organizationId || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }

      const data = await response.json();

      const receivedWorkflowTemplate: WorkflowTemplate = data.data || data;
      templateRef.current = JSON.parse(JSON.stringify(receivedWorkflowTemplate));
      setTemplate(receivedWorkflowTemplate);
      setOriginalTemplate(JSON.parse(JSON.stringify(receivedWorkflowTemplate)));
      onTemplateLoad?.(receivedWorkflowTemplate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load template';
      setError(errorMessage);
      console.error('Load template error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contextLoading, accountId, userId, organizationId, onTemplateLoad]);


  /**
 * Save template immediately (manual save)
 */
  const saveTemplate = useCallback(async () => {
    const currentTemplate = templateRef.current;

    console.log('[Frontend] saveTemplate called', currentTemplate);
    if (!currentTemplate) {
      throw new Error('No template to save');
    }

    const shouldSave = currentTemplate && currentTemplate.id && currentTemplate.version && currentTemplate.workflowDefinition.steps && currentTemplate.workflowDefinition.steps.length > 0;

    if (shouldSave) {
      console.log('[Frontend] Save triggered');
      console.log('  - Template has id:', !!currentTemplate.id);
      console.log('  - Template has version:', currentTemplate.version);
      console.log('  - Account:', accountId);
      console.log('  - Organization:', organizationId);
      console.log('  - Mermaid available:', typeof currentTemplate.mermaidDiagram === 'string' && currentTemplate.mermaidDiagram.length > 0);

      try {
        setIsSaving(true);
        setError(null);

        console.log('  - Is new workflow template:', isNewTemplate);

        if (isNewTemplate) {

          console.log('[Frontend] Sending POST to create template:');
          console.log('  - composite id:', { id: currentTemplate.id, account: currentTemplate.account, organization: currentTemplate.organization, version: currentTemplate.version });
          console.log('  - workflow template:', currentTemplate);

          const response = await apiFetch(`/api/workflow-templates/${currentTemplate.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-account': accountId || '',
              'x-organization': organizationId || ''
            },
            body: JSON.stringify(currentTemplate)
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ [Frontend] Failed to create template:', errorData);
            throw new Error(`Failed to create template: ${errorData.error || response.statusText}`);
          }

          const result = await response.json();
          const savedTemplate: WorkflowTemplate = result.data || result;

          console.log('✅ [Frontend] Template created successfully:');
          console.log('  - ID:', { id: savedTemplate.id, account: savedTemplate.account, organization: savedTemplate.organization, version: savedTemplate.version });

          templateRef.current = savedTemplate;
          setTemplate(savedTemplate);
          setIsNewTemplate(false);

          // Notify parent that template was saved (trigger selector refresh)
          if (onTemplateSaved) {
            console.log('🔔 [Frontend] Calling onTemplateSaved callback');
            onTemplateSaved(savedTemplate);
          }
        } else {
          // Update existing template with PUT
          const response = await apiFetch(`/api/workflow-templates/${currentTemplate.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-account': accountId || '',
              'x-organization': organizationId || ''
            },
            body: JSON.stringify(currentTemplate)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to save template: ${errorData.error || response.statusText}`);
          }

          const result = await response.json();
          const savedTemplate: WorkflowTemplate = result.data || result;
          templateRef.current = savedTemplate;
          setTemplate(savedTemplate);
          prevTemplatesRef.current.push(savedTemplate);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
        setError(errorMessage);
        console.error('Auto-save error:', err);
      } finally {
        setIsSaving(false);
      }
    }
  }, [accountId, organizationId, isNewTemplate, onTemplateSaved]);



  const updateWorkflowDefinition = useCallback(async (definition: WorkflowDefinition, mermaidDiagram?: string) => {
    const currentTemplate = templateRef.current;
    if (!currentTemplate) {
      throw new Error('No template loaded');
    }

    /*
     * We need to modify the following line to detect what steps were modified or added and update just those sections
     */

    // Update local state immediately
    const updatedTemplate: WorkflowTemplate = {
      ...currentTemplate,
      workflowDefinition: definition,
      mermaidDiagram: mermaidDiagram || currentTemplate.mermaidDiagram,
      metadata: {
        ...currentTemplate.metadata,
        updatedAt: new Date().toISOString(),
        updatedBy: userId || 'system'
      }
    };

    templateRef.current = updatedTemplate;
    console.log('[Frontend] Workflow definition updated locally the template is now:', updatedTemplate);
    setTemplate(updatedTemplate);

    // End of modification block. remove these comments once the incremental update logic is in place.
    await saveTemplate();

  }, [userId, saveTemplate]);

 

  /**
   * Update template name
   * For new unsaved templates, just updates in-memory state
   * For existing saved templates, calls API to update
   */
  const updateTemplateLabel = useCallback(async (label: string) => {
    const currentTemplate = templateRef.current;
    if (!currentTemplate) {
      throw new Error('No template loaded');
    }

    try {
      console.log('📝 Updating label', label);
      const updatedTemplate: WorkflowTemplate = {
        ...currentTemplate,
        metadata: {
          ...currentTemplate.metadata,
          label,
          updatedAt: new Date().toISOString(),
          updatedBy: userId || 'system'
        }
      };

      templateRef.current = updatedTemplate;
      setTemplate(updatedTemplate);
      await saveTemplate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template label';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [userId, saveTemplate]);


  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    if (originalTemplate) {
      templateRef.current = JSON.parse(JSON.stringify(originalTemplate));
      setTemplate(JSON.parse(JSON.stringify(originalTemplate)));
    }
  }, [originalTemplate]);

  const undo = useCallback(() => {
    if (prevTemplatesRef.current.length > 1) {
      prevTemplatesRef.current.pop();
      const previousTemplate: WorkflowTemplate = JSON.parse(JSON.stringify(prevTemplatesRef.current[prevTemplatesRef.current.length - 1]));
      templateRef.current = previousTemplate;
      setTemplate(previousTemplate);
    }
  }, [prevTemplatesRef]);


  const checkPublishReadiness = useCallback(async () => { 
    const currentTemplate = templateRef.current;
    if (!currentTemplate) {
      setIsPublishReady(false);
      return;
    }

    try {
      const response = await apiFetch('/api/workflow-templates/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-account': accountId || '',
          'x-organization': organizationId || ''
        },
        body: JSON.stringify(currentTemplate)
      });

      if (!response.ok) {
        throw new Error(`Failed to validate template: ${response.statusText}`);
      }

      const result = await response.json();
      setIsPublishReady(result.valid);
    } catch (err) {
      console.error('Publish readiness check error:', err);
      setIsPublishReady(false);
    }
  }, [accountId, organizationId]);

  // Check publish readiness whenever the template changes
  useEffect(() => {
    checkPublishReadiness();
  }, [template, checkPublishReadiness]);

  /**
   * Auto-load template on mount if specified
   */
  useEffect(() => {
    if (templateId && accountId && !contextLoading) {
      loadTemplate(templateId);
    }
  }, [templateId, accountId, contextLoading, loadTemplate]);

  return {
    // Current template data
    template,
    workflow,

    // Loading and error states
    isLoading,
    isContextLoading: contextLoading,
    error,
    isSaving,
    isPublishReady,

    // Template state info
    isNewTemplate,

    // Operations
    loadTemplate,
    saveTemplate,
    updateWorkflowDefinition,
    updateTemplateLabel,

    // Utility
    clearError,
    undo,
    reset
  };
}
