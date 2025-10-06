// src/app/components/WorkflowTemplateSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { useAccount, useOrganization } from '@/app/contexts/UnifiedUserContext';
import { useRouter } from 'next/navigation';

interface WorkflowTemplate {
  name: string;
  version: string;
  status: string;
}

interface WorkflowTemplateSelectorProps {
  currentTemplateName: string;
  onTemplateChange?: (templateName: string) => void;
  refreshTrigger?: number; // When this changes, refetch templates
}

export default function WorkflowTemplateSelector({
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

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!account) {
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
        });

        if (currentOrganization) {
          params.append('organization', currentOrganization.id);
        }

        const response = await fetch(`/api/workflow-templates?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch workflow templates');
        }

        const data = await response.json();
        setTemplates(data.templates || []);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [account, currentOrganization, refreshTrigger]); // Add refreshTrigger to dependencies

  const handleTemplateChange = (templateName: string) => {
    if (templateName === 'new') {
      router.push('/configureMyWorkflow/new');
    } else if (onTemplateChange) {
      onTemplateChange(templateName);
    } else {
      router.push(`/configureMyWorkflow/${templateName}`);
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

  const isNewTemplate = currentTemplateName === 'new' || currentTemplateName === 'create';
  const displayName = isNewTemplate ? 'New Template (Unnamed)' : currentTemplateName;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250 }}>
      <FormControl size="small" fullWidth>
        <Select
          value={isNewTemplate ? '' : currentTemplateName}
          onChange={(e) => handleTemplateChange(e.target.value)}
          displayEmpty
          sx={{ 
            minWidth: 200,
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
          
          {templates.map((template) => (
            <MenuItem key={template.name} value={template.name}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Typography>{template.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  v{template.version} • {template.status}
                </Typography>
              </Box>
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
