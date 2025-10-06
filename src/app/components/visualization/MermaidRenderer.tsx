// src/app/components/visualization/MermaidRenderer.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import mermaid from 'mermaid';
import { WorkflowJSON, WorkflowStep } from '@/app/types/workflow';
import { 
  MermaidVisualizationConfig, 
  DraftState,
  ViewportBounds 
} from '@/app/types/advanced-visualization';

interface MermaidRendererProps {
  workflow: WorkflowJSON;
  config: MermaidVisualizationConfig;
  draftState?: DraftState;
  onStepClick?: (stepId: string) => void;
  onStepHover?: (stepId: string, isHovering: boolean) => void;
  enableInteractions?: boolean;
  preserveViewport?: boolean;
  animationDuration?: number;
}

export default function MermaidRenderer({
  workflow,
  config,
  draftState,
  onStepClick,
  onStepHover,
  enableInteractions = true,
  preserveViewport = false,
  animationDuration = 300
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentViewport] = useState<ViewportBounds & { panX: number; panY: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    zoom: 1,
    panX: 0,
    panY: 0
  });

  // Initialize Mermaid with enhanced configuration
  useEffect(() => {
    const initializeMermaid = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            padding: 20,
            nodeSpacing: 50,
            rankSpacing: 50
          },
          themeVariables: {
            primaryColor: config.theme.published.stepBackground,
            primaryTextColor: '#000000',
            primaryBorderColor: config.theme.published.stepBorder,
            lineColor: '#666666',
            secondaryColor: config.theme.draft.stepBackground,
            tertiaryColor: '#ffffff',
            background: '#ffffff',
            mainBkg: '#ffffff',
            secondBkg: config.theme.draft.stepBackground,
            tertiaryBkg: '#ffffff'
          }
        });
      } catch (err) {
        console.error('Failed to initialize Mermaid:', err);
        setError('Failed to initialize diagram renderer');
      }
    };

    initializeMermaid();
  }, [config.theme]);

  // Generate Mermaid diagram syntax from workflow
  const generateMermaidSyntax = useCallback((workflow: WorkflowJSON): string => {
    const lines = ['flowchart TD'];
    
    // Define steps with custom styling
    Object.entries(workflow.steps).forEach(([stepId, stepData]) => {
      // Type guard to ensure step is a WorkflowStep
      const step = stepData as WorkflowStep;
      
      const stepStyle = config.stepStyles.get(stepId);
      const isDraft = draftState?.modifiedSteps.has(stepId);
      const indicator = config.indicators.get(stepId);
      
      // Create step label with proper escaping
      const stepLabel = step.name.replace(/[\\\"]/g, '\\$&');
      let stepDefinition = `    ${stepId}["${stepLabel}"]`;
      
      // Add step type icon
      const stepIcon = getStepIcon(step.type);
      if (stepIcon) {
        stepDefinition = `    ${stepId}["${stepIcon} ${stepLabel}"]`;
      }
      
      lines.push(stepDefinition);
      
      // Add custom styling if present
      if (stepStyle) {
        const styleClass = `step_${stepId}`;
        lines.push(`    classDef ${styleClass} fill:${stepStyle.background},stroke:${stepStyle.border},stroke-width:2px,opacity:${stepStyle.opacity}`);
        lines.push(`    class ${stepId} ${styleClass}`);
      }
      
      // Add draft indicators
      if (isDraft && indicator) {
        lines.push(`    ${stepId} --> ${stepId}_indicator["${indicator.icon}"]`);
        lines.push(`    classDef draft_indicator fill:${indicator.color},stroke:none,color:#ffffff`);
        lines.push(`    class ${stepId}_indicator draft_indicator`);
      }
    });
    
    // Define connections between steps
    Object.entries(workflow.steps).forEach(([stepId, stepData]) => {
      // Type assertion for legacy workflow structure
      const step = stepData as Record<string, unknown>;
      
      if (step.nextSteps && Array.isArray(step.nextSteps)) {
        step.nextSteps.forEach((nextStep: string) => {
          lines.push(`    ${stepId} --> ${nextStep}`);
        });
      }
      
      if (step.onSuccess) {
        lines.push(`    ${stepId} -->|Success| ${step.onSuccess}`);
      }
      
      if (step.onFailure) {
        lines.push(`    ${stepId} -->|Failure| ${step.onFailure}`);
      }
    });
    
    return lines.join('\n');
  }, [config, draftState]);

  // Get step icon based on type
  const getStepIcon = (type: string): string => {
    switch (type) {
      case 'trigger': return '🚀';
      case 'condition': return '❓';
      case 'action': return '⚙️';
      case 'end': return '🏁';
      default: return '📄';
    }
  };

  // Add event listeners for step interactions
  const addInteractionListeners = useCallback(() => {
    if (!containerRef.current) return;
    
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    // Find all step nodes and add click/hover listeners
    Object.keys(workflow.steps).forEach(stepId => {
      const stepElement = svgElement.querySelector(`#${stepId}`);
      if (stepElement) {
        // Click handler
        stepElement.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (onStepClick) {
            onStepClick(stepId);
          }
        });
        
        // Hover handlers
        stepElement.addEventListener('mouseenter', () => {
          if (onStepHover) {
            onStepHover(stepId, true);
          }
          (stepElement as HTMLElement).style.cursor = 'pointer';
        });
        
        stepElement.addEventListener('mouseleave', () => {
          if (onStepHover) {
            onStepHover(stepId, false);
          }
        });
      }
    });
  }, [workflow.steps, onStepClick, onStepHover]);

  // Render the Mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!containerRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const mermaidSyntax = generateMermaidSyntax(workflow);
      console.log('🎨 Generated Mermaid syntax:', mermaidSyntax);
      
      // Clear previous content
      containerRef.current.innerHTML = '';
      
      // Create unique ID for this diagram
      const diagramId = `workflow-diagram-${Date.now()}`;
      
      // Render the diagram
      const { svg } = await mermaid.render(diagramId, mermaidSyntax);
      
      // Insert SVG into container
      containerRef.current.innerHTML = svg;
      
      // Add event listeners for interactions if enabled
      if (enableInteractions) {
        addInteractionListeners();
      }
      
      // Apply animation if this is an update
      if (animationDuration > 0) {
        containerRef.current.style.opacity = '0';
        containerRef.current.style.transition = `opacity ${animationDuration}ms ease-in-out`;
        
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.style.opacity = '1';
          }
        }, 50);
      }
      
    } catch (err) {
      console.error('❌ Failed to render Mermaid diagram:', err);
      setError(`Failed to render workflow diagram: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [workflow, generateMermaidSyntax, enableInteractions, animationDuration, addInteractionListeners]);

  // Re-render when workflow or config changes
  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // Preserve viewport position if requested
  useEffect(() => {
    if (preserveViewport && containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = `translate(${currentViewport.panX}px, ${currentViewport.panY}px) scale(${currentViewport.zoom})`;
      }
    }
  }, [preserveViewport, currentViewport]);

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        overflow: 'hidden',
        '& svg': {
          width: '100%',
          height: '100%',
          transition: preserveViewport ? 'none' : `all ${animationDuration}ms ease-in-out`
        },
        '& .node': {
          cursor: enableInteractions ? 'pointer' : 'default'
        }
      }}
    >
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}