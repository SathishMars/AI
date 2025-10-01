// src/app/utils/mermaid-service.ts
import { WorkflowJSON } from '@/app/types/workflow';

// Simple cache to avoid regenerating diagrams for unchanged workflows
const diagramCache = new Map<string, string>();

function generateWorkflowHash(workflow: WorkflowJSON): string {
  // Create a hash based on workflow steps and metadata
  const hashData = {
    steps: workflow.steps,
    name: workflow.metadata.name,
    version: workflow.metadata.version
  };
  return btoa(JSON.stringify(hashData));
}

export async function generateMermaidDiagram(workflow: WorkflowJSON): Promise<string> {
  try {
    // Check cache first
    const workflowHash = generateWorkflowHash(workflow);
    const cachedDiagram = diagramCache.get(workflowHash);
    
    if (cachedDiagram) {
      console.log('Using cached Mermaid diagram');
      return cachedDiagram;
    }

    console.log('Generating new Mermaid diagram via API');
    
    const response = await fetch('/api/generate-mermaid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workflow })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate diagram');
    }

    const { mermaidDiagram } = await response.json();
    
    // Cache the result
    diagramCache.set(workflowHash, mermaidDiagram);
    
    return mermaidDiagram;
    
  } catch (error) {
    console.error('Error in generateMermaidDiagram:', error);
    throw error;
  }
}

export function clearMermaidCache(): void {
  diagramCache.clear();
}

// Enhanced fallback diagram for when generation fails
export function createFallbackDiagram(workflow: WorkflowJSON): string {
  const steps = Object.entries(workflow.steps);
  
  let diagram = 'flowchart TD\n';
  
  // Add nodes with enhanced styling and emojis
  steps.forEach(([stepId, step]) => {
    const sanitizedId = stepId.replace(/[^a-zA-Z0-9]/g, '_');
    let nodeShape = '';
    
    switch (step.type) {
      case 'trigger':
        nodeShape = `${sanitizedId}(["🚀 ${step.name}"])`;
        break;
      case 'condition':
        nodeShape = `${sanitizedId}{"❓ ${step.name}"}`;
        break;
      case 'action':
        const actionLabel = step.action ? `⚡ ${step.name}<br/>📋 ${step.action}` : `⚡ ${step.name}`;
        nodeShape = `${sanitizedId}["${actionLabel}"]`;
        break;
      case 'end':
        nodeShape = `${sanitizedId}(("🏁 ${step.name}"))`;
        break;
      default:
        nodeShape = `${sanitizedId}["📄 ${step.name}"]`;
    }
    
    diagram += `    ${nodeShape}\n`;
  });
  
  diagram += '\n';
  
  // Add connections with enhanced labels
  steps.forEach(([stepId, step]) => {
    const sanitizedId = stepId.replace(/[^a-zA-Z0-9]/g, '_');
    
    if (step.nextSteps) {
      step.nextSteps.forEach(nextStep => {
        const sanitizedNext = nextStep.replace(/[^a-zA-Z0-9]/g, '_');
        diagram += `    ${sanitizedId} --> ${sanitizedNext}\n`;
      });
    }
    
    if (step.onSuccess) {
      const sanitizedNext = step.onSuccess.replace(/[^a-zA-Z0-9]/g, '_');
      diagram += `    ${sanitizedId} -->|✅ Success| ${sanitizedNext}\n`;
    }
    
    if (step.onFailure) {
      const sanitizedNext = step.onFailure.replace(/[^a-zA-Z0-9]/g, '_');
      diagram += `    ${sanitizedId} -->|❌ Failure| ${sanitizedNext}\n`;
    }
  });
  
  // Add professional styling classes
  diagram += '\n    %% Enhanced styling for professional workflows\n';
  diagram += '    classDef triggerClass fill:#e1f5fe,stroke:#4caf50,stroke-width:2px,color:#000\n';
  diagram += '    classDef conditionClass fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000\n';
  diagram += '    classDef actionClass fill:#e3f2fd,stroke:#2196f3,stroke-width:2px,color:#000\n';
  diagram += '    classDef endClass fill:#ffebee,stroke:#f44336,stroke-width:2px,color:#000\n\n';
  
  // Apply classes to nodes based on step type
  steps.forEach(([stepId, step]) => {
    const sanitizedId = stepId.replace(/[^a-zA-Z0-9]/g, '_');
    let className = '';
    
    switch (step.type) {
      case 'trigger':
        className = 'triggerClass';
        break;
      case 'condition':
        className = 'conditionClass';
        break;
      case 'action':
        className = 'actionClass';
        break;
      case 'end':
        className = 'endClass';
        break;
      default:
        className = 'actionClass';
    }
    
    diagram += `    class ${sanitizedId} ${className}\n`;
  });
  
  return diagram;
}