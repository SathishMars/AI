// src/app/hooks/useMermaidGeneration.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { WorkflowJSON } from '@/app/types/workflow';
import { generateMermaidDiagram, createFallbackDiagram } from '@/app/utils/mermaid-service';

export interface MermaidGenerationState {
  isGenerating: boolean;
  error: string | null;
  lastGenerated: Date | null;
}

interface UseMermaidGenerationOptions {
  autoGenerate?: boolean;
  debounceMs?: number;
}

export function useMermaidGeneration(
  workflow: WorkflowJSON,
  onWorkflowChange: (workflow: WorkflowJSON) => void,
  options: UseMermaidGenerationOptions = {}
) {
  const { autoGenerate = true, debounceMs = 2000 } = options;
  
  const [state, setState] = useState<MermaidGenerationState>({
    isGenerating: false,
    error: null,
    lastGenerated: null
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastWorkflowRef = useRef<string>('');
  
  const generateDiagram = useCallback(async (force = false) => {
    // Check if workflow actually changed
    const currentWorkflowString = JSON.stringify(workflow.steps);
    if (!force && currentWorkflowString === lastWorkflowRef.current) {
      return;
    }
    
    lastWorkflowRef.current = currentWorkflowString;
    
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const mermaidDiagram = await generateMermaidDiagram(workflow);
      
      const updatedWorkflow = {
        ...workflow,
        mermaidDiagram
      };
      
      onWorkflowChange(updatedWorkflow);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        lastGenerated: new Date()
      }));
      
    } catch (error) {
      console.error('Failed to generate Mermaid diagram:', error);
      
      // Use fallback diagram
      const fallbackDiagram = createFallbackDiagram(workflow);
      
      const updatedWorkflow = {
        ...workflow,
        mermaidDiagram: fallbackDiagram
      };
      
      onWorkflowChange(updatedWorkflow);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate diagram'
      }));
    }
  }, [workflow, onWorkflowChange]);
  
  // Auto-generate with debouncing
  useEffect(() => {
    if (!autoGenerate) return;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for debounced generation
    timeoutRef.current = setTimeout(() => {
      generateDiagram();
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [workflow.steps, generateDiagram, autoGenerate, debounceMs]);
  
  // Manual generation function
  const regenerateDiagram = useCallback(() => {
    generateDiagram(true);
  }, [generateDiagram]);
  
  return {
    ...state,
    regenerateDiagram
  };
}