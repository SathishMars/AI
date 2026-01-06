// src/app/components/WorkflowTemplateSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Plus } from "lucide-react";
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
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Loading templates...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <span className="text-sm text-destructive">
        {error}
      </span>
    );
  }


  return (
    <div className="flex items-center min-w-[250px] max-w-[400px]">
      <Select
        value={selectedTemplateId}
        onValueChange={handleTemplateChange}
      >
        <SelectTrigger className="min-w-[200px] max-w-[400px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-between w-full items-center gap-2">
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                        {template.label}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                        v{template.version} • {template.status}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{template.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SelectItem>
          ))}

          <SelectItem value="new">
            <div className="flex items-center gap-2 text-primary">
              <Plus className="h-4 w-4" />
              <span>Create New Template</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
