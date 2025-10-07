// src/app/components/WorkflowTemplateSelector.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { useAccount, useOrganization } from '@/app/contexts/UnifiedUserContext';
import { useRouter } from 'next/navigation';

interface WorkflowTemplate {
  _id?: string; // MongoDB ObjectId
  id: string; // 10-char short-id (composite key identifier)
  account: string; // Composite key
  organization?: string; // Composite key (nullable)
  version: string; // Semantic version
  metadata: {
    name: string; // Actual template name
    status: string; // draft, published, deprecated, archived
    description?: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
  };
  workflowDefinition: { steps: unknown[] };
}

interface WorkflowTemplateSelectorProps {
  currentTemplateId: string; // 10-char composite key identifier (not name)
  currentTemplateName?: string; // Current template name (for newly created templates not yet in fetched list)
  onTemplateChange?: (templateId: string, templateName: string) => void;
  refreshTrigger?: number; // When this changes, refetch templates
}

export default function WorkflowTemplateSelector({
  currentTemplateId,
  currentTemplateName,
  onTemplateChange,
  refreshTrigger
}: WorkflowTemplateSelectorProps) {
  const { account } = useAccount();
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('🔵 WorkflowTemplateSelector render:', {
    currentTemplateId,
    currentTemplateName,
    templatesCount: templates.length,
    accountId: account?.id,
    organizationId: currentOrganization?.id
  });

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!account) {
        console.log('⚠️ WorkflowTemplateSelector: No account available, skipping fetch');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          account: account.id,
          page: '1',
          pageSize: '100'
          // No status filter - backend returns latest version per template (draft/published preferred)
        });

        if (currentOrganization) {
          params.append('organization', currentOrganization.id);
        }

        const url = `/api/workflow-templates?${params}`;
        console.log('🌐 Fetching templates from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('❌ Failed to fetch templates:', response.status, response.statusText);
          throw new Error('Failed to fetch workflow templates');
        }

        const result = await response.json();
        console.log('✅ Fetch result:', result);
        const fetchedTemplates = result.data?.templates || result.templates || [];
        console.log('📋 Fetched templates:', fetchedTemplates.length, 'unique templates');
        console.log('📄 Template details:', fetchedTemplates.map((t: WorkflowTemplate) => ({
          id: t.id,
          name: t.metadata.name,
          version: t.version,
          status: t.metadata.status
        })));
        
        // Backend already returns only latest version per template ID
        setTemplates(fetchedTemplates);
      } catch (err) {
        console.error('❌ Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setIsLoading(false);
      }
    };

    console.log('🔄 useEffect triggered - fetching templates');
    fetchTemplates();
  }, [account, currentOrganization, refreshTrigger])

  // Calculate display state before early returns (React hooks must be at top level)
  const isNewTemplate = currentTemplateId === 'new' || currentTemplateId === 'create';
  const currentTemplate = templates.find(t => t.id === currentTemplateId);
  const displayName = isNewTemplate 
    ? 'New Template (Unnamed)' 
    : (currentTemplate?.metadata.name || currentTemplateName || currentTemplateId);

  // If current template is not in the fetched list, add it temporarily
  // This handles the case where template was just created and hasn't been refetched yet
  const displayTemplates = useMemo(() => {
    if (isNewTemplate || !currentTemplateId || currentTemplate) {
      // No need to add - either new template, no current template, or already in list
      return templates;
    }
    
    // Current template not found in list - create a temporary entry
    console.log('⚠️ Current template not in fetched list, adding temporary entry:', currentTemplateId);
    const tempTemplate: WorkflowTemplate = {
      id: currentTemplateId,
      account: account?.id || 'unknown',
      organization: currentOrganization?.id,
      version: '1.0.0',
      metadata: {
        name: currentTemplateName || 'Loading...',
        status: 'draft',
        author: 'unknown',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      workflowDefinition: { steps: [] }
    };
    
    return [tempTemplate, ...templates];
  }, [templates, currentTemplateId, currentTemplate, currentTemplateName, isNewTemplate, account?.id, currentOrganization?.id]);

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'new') {
      router.push('/workflows/configure/new');
    } else {
      const selectedTemplate = displayTemplates.find(t => t.id === templateId);
      if (onTemplateChange && selectedTemplate) {
        onTemplateChange(templateId, selectedTemplate.metadata.name);
      } else if (selectedTemplate) {
        router.push(`/workflows/configure/${templateId}`);
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading templates...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error}
      </Typography>
    );
  }

  console.log('🎨 Display state:', {
    isNewTemplate,
    currentTemplateId,
    currentTemplate: currentTemplate ? `${currentTemplate.id} - ${currentTemplate.metadata.name}` : 'not found',
    displayName,
    usingFallbackName: !currentTemplate && !isNewTemplate,
    fetchedTemplatesCount: templates.length,
    displayTemplatesCount: displayTemplates.length,
    addedTemporary: displayTemplates.length > templates.length
  });

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250, maxWidth: 400 }}>
      <FormControl size="small" fullWidth>
        <Select
          value={isNewTemplate ? '' : currentTemplateId}
          onChange={(e) => handleTemplateChange(e.target.value)}
          displayEmpty
          sx={{ 
            minWidth: 200,
            maxWidth: 400,
            '& .MuiSelect-select': {
              py: 1
            }
          }}
        >
          {isNewTemplate && (
            <MenuItem value="" disabled>
              <Typography color="text.secondary" fontStyle="italic">
                {displayName}
              </Typography>
            </MenuItem>
          )}
          
          {displayTemplates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              <Tooltip title={template.metadata.name} placement="top" arrow>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 1 }}>
                  <Typography 
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0
                    }}
                  >
                    {template.metadata.name}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    v{template.version} • {template.metadata.status}
                  </Typography>
                </Box>
              </Tooltip>
            </MenuItem>
          ))}
          
          <MenuItem value="new">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
              <AddIcon fontSize="small" />
              <Typography>Create New Template</Typography>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
