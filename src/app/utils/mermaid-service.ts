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

// Fallback diagram for when generation fails
export function createFallbackDiagram(workflow: WorkflowJSON): string {
  const steps = Object.entries(workflow.steps);
  
  let diagram = 'flowchart TD\n';
  
  // Add nodes
  steps.forEach(([stepId, step]) => {
    const sanitizedId = stepId.replace(/[^a-zA-Z0-9]/g, '_');
    let nodeShape = '';
    
    switch (step.type) {
      case 'trigger':
        nodeShape = `${sanitizedId}(["${step.name}"])`;
        break;
      case 'condition':
        nodeShape = `${sanitizedId}{"${step.name}"}`;
        break;
      case 'action':
        nodeShape = `${sanitizedId}["${step.name}"]`;
        break;
      case 'end':
        nodeShape = `${sanitizedId}(("${step.name}"))`;
        break;
      default:
        nodeShape = `${sanitizedId}["${step.name}"]`;
    }
    
    diagram += `    ${nodeShape}\n`;
  });
  
  // Add connections
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
      diagram += `    ${sanitizedId} -->|Success| ${sanitizedNext}\n`;
    }
    
    if (step.onFailure) {
      const sanitizedNext = step.onFailure.replace(/[^a-zA-Z0-9]/g, '_');
      diagram += `    ${sanitizedId} -->|Failure| ${sanitizedNext}\n`;
    }
  });
  
  return diagram;
}