// src/app/hooks/useWorkflowTemplateV2.ts
/**
 * Workflow Template Hook V2
 * 
 * Updated hook using new WorkflowTemplate type system.
 * 
 * Key changes from V1:
 * - Uses WorkflowTemplate (not WorkflowJSON)
 * - Immediate save (no timer debounce)
 * - Uses shouldAutoSave() guard
 * - Backward compatible via migration utilities
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  WorkflowTemplate,
  WorkflowDefinition,
  CreateWorkflowTemplateInput,
  shouldAutoSave,
  TemplateStatus,
  TemplateMetadata
} from '@/app/types/workflow-template-v2';
import { 
  templateToWorkflowJSON,
  normalizeToTemplate 
} from '@/app/utils/workflow-template-migration';
import { WorkflowJSON } from '@/app/types/workflow';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';
import { generateShortId } from '@/app/utils/short-id-generator';

type DateLike = Date | string | number | undefined | null;

const coerceDate = (value: DateLike): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

const normalizeTemplateForState = (
  template: WorkflowTemplate,
  fallbackAuthor: string
): WorkflowTemplate => {
  const metadataSource = {
    ...(template.metadata || {})
  } as Partial<TemplateMetadata> & { createdAt?: DateLike; updatedAt?: DateLike };

  const resolvedName = metadataSource.name || template.name || 'New Workflow';
  const resolvedStatus = metadataSource.status || template.status || 'draft';
  const resolvedAuthor = metadataSource.author || fallbackAuthor;
  const resolvedCreatedAt = coerceDate(metadataSource.createdAt ?? new Date());
  const resolvedUpdatedAt = coerceDate(metadataSource.updatedAt ?? new Date());
  const resolvedTags = metadataSource.tags || [];

  const normalized: WorkflowTemplate = {
    ...template,
    name: resolvedName,
    status: resolvedStatus,
    metadata: {
      ...metadataSource,
      name: resolvedName,
      status: resolvedStatus,
      author: resolvedAuthor,
      createdAt: resolvedCreatedAt,
      updatedAt: resolvedUpdatedAt,
      tags: resolvedTags
    } as TemplateMetadata
  };

  return normalized;
};

interface UseWorkflowTemplateV2Options {
  templateId?: string;      // 10-char short-id
  autoLoad?: boolean;
  autoSave?: boolean;       // Enable immediate auto-save
  onTemplateSaved?: (template: WorkflowTemplate) => void; // Callback after successful save
}

interface UpdateWorkflowDefinitionOptions {
  mermaidDiagram?: string | null;
  skipAutoSave?: boolean;
}

interface UseWorkflowTemplateV2Return {
  // Current template data
  template: WorkflowTemplate | null;
  workflow: WorkflowDefinition | null;
  workflowJSON: WorkflowJSON | null;  // For backward compatibility
  
  // Loading and error states
  isLoading: boolean;
  isContextLoading: boolean;  // True while user context is loading
  error: string | null;
  isSaving: boolean;
  
  // Template state info
  isNewTemplate: boolean;
  hasUnsavedChanges: boolean;
  canAutoSave: boolean;  // True if template meets auto-save criteria
  
  // Operations
  loadTemplate: (id: string) => Promise<void>;
  createTemplate: (name: string, description?: string) => Promise<WorkflowTemplate>;
  initializeNewTemplate: (name: string, description?: string) => void;  // In-memory only, no API call
  updateWorkflowDefinition: (definition: WorkflowDefinition, options?: UpdateWorkflowDefinitionOptions) => Promise<void>;
  updateWorkflowDefinition: (definition: WorkflowDefinition, options?: UpdateWorkflowDefinitionOptions) => Promise<void>;
  updateTemplateName: (name: string) => Promise<void>;
  saveTemplate: () => Promise<void>;
  
  // Utility
  clearError: () => void;
  reset: () => void;
}

export function useWorkflowTemplateV2(
  options: UseWorkflowTemplateV2Options = {}
): UseWorkflowTemplateV2Return {
  const { 
    templateId,
    autoLoad = true,
    autoSave = true,
    onTemplateSaved
  } = options;
  
  const { account, currentOrganization, isLoading: contextLoading } = useUnifiedUserContext();
  const accountId = account?.id;
  const organizationId = currentOrganization?.id || null;
  
  // State
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [originalTemplate, setOriginalTemplate] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const templateRef = useRef<WorkflowTemplate | null>(null);
  const normalizeTemplate = useCallback(
    (templateData: WorkflowTemplate): WorkflowTemplate =>
      normalizeTemplateForState(templateData, account?.name || 'Unknown'),
    [account?.name]
  );
  
  // Computed state
  const workflow = template?.workflowDefinition || null;
  const workflowJSON = template ? templateToWorkflowJSON(template) : null;
  const isNewTemplate = !template || !template._id;
  const hasUnsavedChanges = !!(template && originalTemplate &&
    JSON.stringify(template) !== JSON.stringify(originalTemplate));
  const canAutoSave = template ? shouldAutoSave(template) : false;
  
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
      
      if (!accountId) {
        throw new Error('No account context available. Please ensure you are logged in.');
      }
      
      // Call API to get template
      const response = await fetch(`/api/workflow-templates/${id}`, {
        headers: {
          'x-account': accountId,
          'x-organization': organizationId || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Normalize to WorkflowTemplate format (handles legacy WorkflowJSON)
      const normalizedTemplate = normalizeTemplate(
        normalizeToTemplate(data, accountId || '', organizationId)
      );
  templateRef.current = normalizedTemplate;
      setTemplate(normalizedTemplate);
      setOriginalTemplate(JSON.parse(JSON.stringify(normalizedTemplate)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load template';
      setError(errorMessage);
      console.error('Load template error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, organizationId, contextLoading, normalizeTemplate]);
  
  /**
   * Create new template
   */
  const createTemplate = useCallback(async (
    name: string,
    description?: string
  ): Promise<WorkflowTemplate> => {
    // Wait for context to load
    if (contextLoading) {
      throw new Error('User context is still loading. Please wait.');
    }
    
    if (!accountId) {
      throw new Error('No account context available. Please ensure you are logged in.');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const input: CreateWorkflowTemplateInput = {
        account: accountId,
        organization: organizationId,
        name,
        workflowDefinition: {
          steps: []  // Start with empty steps
        },
        description,
        author: account?.name || 'Unknown'
      };
      
      // Call API to create template
      const response = await fetch('/api/workflow-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-account': accountId,
          'x-organization': organizationId || ''
        },
        body: JSON.stringify(input)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create template: ${response.statusText}`);
      }
      
  const newTemplate = await response.json();
  const normalizedTemplate = normalizeTemplate(newTemplate);
      
  templateRef.current = normalizedTemplate;
  setTemplate(normalizedTemplate);
  setOriginalTemplate(JSON.parse(JSON.stringify(normalizedTemplate)));
      
  return normalizedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [accountId, organizationId, account, contextLoading, normalizeTemplate]);
  
  /**
   * Initialize a new template in memory without saving to database
   * Use this for browsing/editing before user explicitly saves
   */
  const initializeNewTemplate = useCallback((
    name: string,
    description?: string
  ) => {
    if (!accountId) {
      throw new Error('No account context available. Please ensure you are logged in.');
    }
    
    const newTemplate: WorkflowTemplate = {
      id: generateShortId(),  // Generate proper 10-char short ID
      account: accountId,
      organization: organizationId || undefined,
      version: '1.0.0',
      workflowDefinition: {
        steps: []  // Start with empty steps
      },
      metadata: {
        name,  // Name goes in metadata
        status: 'draft' as TemplateStatus,  // Status goes in metadata
        description,
        author: account?.name || 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    const normalizedTemplate = normalizeTemplate(newTemplate);
    
    console.log('🆕 Initialized new template:', {
      id: normalizedTemplate.id,
      name: normalizedTemplate.metadata.name,
      account: normalizedTemplate.account,
      organization: normalizedTemplate.organization
    });
    
    templateRef.current = normalizedTemplate;
    setTemplate(normalizedTemplate);
    setOriginalTemplate(JSON.parse(JSON.stringify(normalizedTemplate)));
  }, [accountId, organizationId, account, normalizeTemplate]);
  
  /**
   * Update workflow definition (steps)
   * 
   * Saves immediately if auto-save enabled and criteria met.
   */
  const updateWorkflowDefinition = useCallback(async (
    definition: WorkflowDefinition,
    options: UpdateWorkflowDefinitionOptions = {}
  ) => {
    const { mermaidDiagram, skipAutoSave = false } = options;
    const currentTemplate = templateRef.current;
    if (!currentTemplate) {
      throw new Error('No template loaded');
    }
    const hasMermaidUpdate = Object.prototype.hasOwnProperty.call(options, 'mermaidDiagram');
    const trimmedMermaid = typeof mermaidDiagram === 'string' ? mermaidDiagram.trim() : undefined;
    const mermaidDiagramValue = hasMermaidUpdate
      ? (trimmedMermaid && trimmedMermaid.length > 0 ? trimmedMermaid : undefined)
      : undefined;
    
    // Update local state immediately
    const updatedTemplate: WorkflowTemplate = {
      ...currentTemplate,
      workflowDefinition: definition,
      mermaidDiagram: mermaidDiagramValue,
      metadata: {
        ...currentTemplate.metadata,
        updatedAt: new Date()
      }
    };
    const normalizedUpdatedTemplate = normalizeTemplate(updatedTemplate);
    
    templateRef.current = normalizedUpdatedTemplate;
    setTemplate(normalizedUpdatedTemplate);
    
    // Auto-save if enabled and criteria met
    if (autoSave && !skipAutoSave && shouldAutoSave(normalizedUpdatedTemplate)) {
      console.log('💾 [Frontend] Auto-save triggered');
      console.log('  - Template has _id:', !!currentTemplate._id);
      console.log('  - Template has version:', currentTemplate.version);
      console.log('  - Account:', accountId);
      console.log('  - Organization:', organizationId);
      console.log('  - Mermaid available:', typeof normalizedUpdatedTemplate.mermaidDiagram === 'string');
      
      try {
        setIsSaving(true);
        
        // For new workflows (no _id in database), create with POST; for existing, update with PUT
        const isNewWorkflow = !currentTemplate._id || !currentTemplate.version;
        console.log('  - Is new workflow:', isNewWorkflow);
        
        if (isNewWorkflow) {
          // Create new template with POST
          const requestBody = {
            account: accountId || 'groupize-demos',
            organization: organizationId || null,
            name: normalizedUpdatedTemplate.metadata.name || 'New Workflow',
            description: normalizedUpdatedTemplate.metadata.description,
            workflowDefinition: definition,
            mermaidDiagram: normalizedUpdatedTemplate.mermaidDiagram,
            author: normalizedUpdatedTemplate.metadata.author || 'system',
            tags: normalizedUpdatedTemplate.metadata.tags || []
          };
          
          console.log('📤 [Frontend] Sending POST to create template:');
          console.log('  - Account:', requestBody.account);
          console.log('  - Organization:', requestBody.organization);
          console.log('  - Name:', requestBody.name);
          console.log('  - Author:', requestBody.author);
          console.log('  - WorkflowDefinition.steps count:', definition.steps?.length || 0);
          console.log('  - Tags:', requestBody.tags);
          
          const response = await fetch('/api/workflow-templates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-account': accountId || '',
              'x-organization': organizationId || ''
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ [Frontend] Failed to create template:', errorData);
            throw new Error(`Failed to create template: ${errorData.error || response.statusText}`);
          }
          
          const result = await response.json();
          const savedTemplate = normalizeTemplate(result.data || result);
          
          console.log('✅ [Frontend] Template created successfully:');
          console.log('  - ID:', savedTemplate.id);
          console.log('  - Version:', savedTemplate.version);
          console.log('  - MongoDB _id:', savedTemplate._id);
          console.log('  - Status:', savedTemplate.metadata?.status);
          console.log('  - Name:', savedTemplate.metadata?.name);
          
          templateRef.current = savedTemplate;
          setTemplate(savedTemplate);
          setOriginalTemplate(JSON.parse(JSON.stringify(savedTemplate)));
          
          // Notify parent that template was saved (trigger selector refresh)
          if (onTemplateSaved) {
            console.log('🔔 [Frontend] Calling onTemplateSaved callback');
            onTemplateSaved(savedTemplate);
          }
        } else {
          // Update existing template with PUT
          const response = await fetch(`/api/workflow-templates/${currentTemplate.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-account': accountId || '',
              'x-organization': organizationId || ''
            },
            body: JSON.stringify({
              version: currentTemplate.version || '1.0.0',
              action: 'update',
              updates: {
                workflowDefinition: definition,
                mermaidDiagram: normalizedUpdatedTemplate.mermaidDiagram
              }
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to save template: ${errorData.error || response.statusText}`);
          }
          
          const result = await response.json();
          const savedTemplate = normalizeTemplate(result.data || result);
          templateRef.current = savedTemplate;
          setTemplate(savedTemplate);
          setOriginalTemplate(JSON.parse(JSON.stringify(savedTemplate)));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
        setError(errorMessage);
        console.error('Auto-save error:', err);
      } finally {
        setIsSaving(false);
      }
    }
  }, [autoSave, accountId, organizationId, onTemplateSaved, templateRef, normalizeTemplate]);
  
  /**
   * Update template name
   * For new unsaved templates, just updates in-memory state
   * For existing saved templates, calls API to update
   */
  const updateTemplateName = useCallback(async (name: string) => {
    const currentTemplate = templateRef.current;
    if (!currentTemplate) {
      throw new Error('No template loaded');
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Check if this is a new template that hasn't been saved yet
      // For in-memory new templates (created via initializeNewTemplate) we keep
      // name updates local so the generated short-id remains the template id
      const isUnsavedNew = !currentTemplate.workflowDefinition.steps ||
                           currentTemplate.workflowDefinition.steps.length === 0;

      if (isUnsavedNew) {
        // For new unsaved templates, just update in-memory state
        console.log('📝 Updating name for unsaved template (in-memory only):', name);
        const updatedTemplate: WorkflowTemplate = {
          ...currentTemplate,
          metadata: {
            ...currentTemplate.metadata,
            name,
            updatedAt: new Date()
          }
        };

        const normalizedUpdatedTemplate = normalizeTemplate(updatedTemplate);

        templateRef.current = normalizedUpdatedTemplate;
        setTemplate(normalizedUpdatedTemplate);
        setIsSaving(false);
        return;
      }
      
      // For existing saved templates, call API
      console.log('📝 Updating name for saved template (API call):', name);
      const response = await fetch(`/api/workflow-templates/${currentTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-account': accountId || '',
          'x-organization': organizationId || ''
        },
        body: JSON.stringify({ 
          version: currentTemplate.version || '1.0.0',
          action: 'update',
          updates: {
            name
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update template name: ${errorData.error || response.statusText}`);
      }
      
  const result = await response.json();
  const updatedTemplate = normalizeTemplate(result.data || result);
  templateRef.current = updatedTemplate;
  setTemplate(updatedTemplate);
  setOriginalTemplate(JSON.parse(JSON.stringify(updatedTemplate)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template name';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [accountId, organizationId, templateRef, normalizeTemplate]);
  
  /**
   * Save template immediately (manual save)
   */
  const saveTemplate = useCallback(async () => {
    const currentTemplate = templateRef.current;
    if (!currentTemplate) {
      throw new Error('No template to save');
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch(`/api/workflow-templates/${currentTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-account': accountId || '',
          'x-organization': organizationId || ''
        },
        body: JSON.stringify({
          workflowDefinition: currentTemplate.workflowDefinition,
          mermaidDiagram: currentTemplate.mermaidDiagram,
          name: currentTemplate.metadata.name
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save template: ${response.statusText}`);
      }
      
  const savedTemplate = normalizeTemplate(await response.json());
  templateRef.current = savedTemplate;
  setTemplate(savedTemplate);
  setOriginalTemplate(JSON.parse(JSON.stringify(savedTemplate)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [accountId, organizationId, templateRef, normalizeTemplate]);
  
  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * Reset to original state
   */
  const reset = useCallback(() => {
    if (originalTemplate) {
      const restored = JSON.parse(JSON.stringify(originalTemplate));
      const normalizedRestored = normalizeTemplate(restored as WorkflowTemplate);
      templateRef.current = normalizedRestored;
      setTemplate(normalizedRestored);
    }
  }, [normalizeTemplate, originalTemplate]);
  
  /**
   * Auto-load template on mount if specified
   */
  useEffect(() => {
    if (autoLoad && templateId && accountId && !contextLoading) {
      loadTemplate(templateId);
    }
  }, [autoLoad, templateId, accountId, contextLoading, loadTemplate]);
  
  return {
    // Current template data
    template,
    workflow,
    workflowJSON,
    
    // Loading and error states
    isLoading,
    isContextLoading: contextLoading,
    error,
    isSaving,
    
    // Template state info
    isNewTemplate,
    hasUnsavedChanges,
    canAutoSave,
    
    // Operations
    loadTemplate,
    createTemplate,
    initializeNewTemplate,
    updateWorkflowDefinition,
    updateTemplateName,
    saveTemplate,
    
    // Utility
    clearError,
    reset
  };
}
