// src/app/components/WorkflowTemplateSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'next/navigation';
import { WorkflowTemplate } from '@/app/types/workflowTemplate';
import { apiFetch } from '@/app/utils/api';



export interface workflowTemplateSelectorMenuItem {
  id: string;
  label: string;
  version: string;
  status: string;
}

interface WorkflowTemplateSelectorProps {
  currentTemplateMenuItem?: workflowTemplateSelectorMenuItem;
  onTemplateChange?: (templateId: string, templateName: string) => void;
}

export default function WorkflowTemplateSelector({
  currentTemplateMenuItem
}: WorkflowTemplateSelectorProps) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(currentTemplateMenuItem?.id);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<workflowTemplateSelectorMenuItem>>([]);
  const currentTemplatesListRef = React.useRef<Array<workflowTemplateSelectorMenuItem>>([]);


  useEffect(() => {
    const fetchTemplates = async () => {

      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: '1',
          pageSize: '100',
          status: 'draft,published'
          // No status filter - backend returns latest version per template (draft/published preferred)
        });

        const url = `/api/workflow-templates?${params}`;
        console.log('🌐 Fetching templates from:', url);

        const response = await apiFetch(url);

        if (!response.ok) {
          console.error('❌ Failed to fetch templates:', response.status, response.statusText);
          throw new Error('Failed to fetch workflow templates');
        }

        const result = await response.json();
        console.log('✅ Fetch result:', result);
        const fetchedTemplates = result.data?.templates || result.templates || [];
        console.log(`📋 Fetched templates: ${fetchedTemplates.length} unique templates`, fetchedTemplates);
        const templatesList: Array<workflowTemplateSelectorMenuItem> = fetchedTemplates.map((t: WorkflowTemplate) => ({
          id: t.id,
          label: t.metadata.label,
          version: t.version,
          status: t.metadata.status
        }));
        console.log('📄 Template details:', templatesList);
        //check if the selected template is in the list, if not add it
        if (currentTemplateMenuItem && !templatesList.find(t => t.id === currentTemplateMenuItem.id)) {
          templatesList.push(currentTemplateMenuItem);
          console.log('➕ Added current template to list:', currentTemplateMenuItem.id, currentTemplateMenuItem.label);
        }
        // Sort templates alphabetically by label
        templatesList.sort((a, b) => a.label.localeCompare(b.label));
        setTemplates([...templatesList]);
        currentTemplatesListRef.current = templatesList;
      } catch (err) {
        console.error('❌ Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setIsLoading(false);
      }
    };
    console.log('🔄 useEffect triggered - fetching templates');
    fetchTemplates();
  }, [currentTemplateMenuItem]);

  useEffect(() => {
    if (!currentTemplateMenuItem) return;
    setIsLoading(true);
    console.log('🔄 useEffect - currentTemplateMenuItem changed:', currentTemplateMenuItem);
    if (!currentTemplatesListRef.current.find(t => t?.id === currentTemplateMenuItem.id)) {
      const updatedTemplatesList: Array<workflowTemplateSelectorMenuItem> = [...currentTemplatesListRef.current, JSON.parse(JSON.stringify(currentTemplateMenuItem))];
      setTemplates(updatedTemplatesList);
      currentTemplatesListRef.current = updatedTemplatesList;
      console.log('➕ Added current template to list:', currentTemplateMenuItem.id, currentTemplateMenuItem.label);
    } else if (currentTemplatesListRef.current.find(t => t?.id === currentTemplateMenuItem.id)) {
      console.log(`ℹ️ Current template already in list Updating the name for ${currentTemplateMenuItem.id} with ${currentTemplateMenuItem.label}`);
      const updatedTemplatesList: Array<workflowTemplateSelectorMenuItem> = currentTemplatesListRef.current.map(t => t?.id === currentTemplateMenuItem.id ? { ...t, label: currentTemplateMenuItem.label } : t);
      setTemplates(updatedTemplatesList);
      currentTemplatesListRef.current = updatedTemplatesList;
    }
    setSelectedTemplateId(currentTemplateMenuItem.id);
    setIsLoading(false);
    console.log('📄 Template details:', currentTemplatesListRef.current);
  }, [currentTemplateMenuItem]);


  const handleTemplateChange = (templateId: string) => {
    router.push(`/workflows/configure/${templateId}`);
  };

  if (isLoading || !selectedTemplateId) {
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


  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250, maxWidth: 400 }}>
      <FormControl size="small" fullWidth>
        <Select
          value={selectedTemplateId}
          onChange={(e) => handleTemplateChange(e.target.value)}
          sx={{
            minWidth: 200,
            maxWidth: 400,
            '& .MuiSelect-select': {
              py: 1
            }
          }}
        >

          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              <Tooltip title={template.label} placement="top" arrow>
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
                    {template.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    v{template.version} • {template.status}
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
