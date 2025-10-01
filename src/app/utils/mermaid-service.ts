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
  
  // Add nodes with detailed information but clean styling
  steps.forEach(([stepId, step]) => {
    const sanitizedId = stepId.replace(/[^a-zA-Z0-9]/g, '_');
    let nodeShape = '';
    
    switch (step.type) {
      case 'trigger':
        nodeShape = `${sanitizedId}(["${step.name}"])`;
        break;
      case 'condition':
        // Add condition details if available
        let conditionLabel = step.name;
        if (step.condition && step.condition.fact && step.condition.operator && step.condition.value !== undefined) {
          conditionLabel += `<br/>${step.condition.fact} ${step.condition.operator} ${step.condition.value}`;
        }
        nodeShape = `${sanitizedId}{"${conditionLabel}"}`;
        break;
      case 'action':
        // Include action details and function information
        let actionLabel = step.name;
        if (step.action) {
          actionLabel += `<br/>${step.action}`;
        }
        if (step.params && Object.keys(step.params).length > 0) {
          const paramSummary = Object.entries(step.params)
            .slice(0, 2) // Show first 2 params to avoid clutter
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          actionLabel += `<br/>${paramSummary}`;
        }
        nodeShape = `${sanitizedId}["${actionLabel}"]`;
        break;
      case 'end':
        let endLabel = step.name;
        if (step.result) {
          endLabel += `<br/>Result: ${step.result}`;
        }
        nodeShape = `${sanitizedId}(("${endLabel}"))`;
        break;
      default:
        nodeShape = `${sanitizedId}["${step.name}"]`;
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
      diagram += `    ${sanitizedId} -->|Success| ${sanitizedNext}\n`;
    }
    
    if (step.onFailure) {
      const sanitizedNext = step.onFailure.replace(/[^a-zA-Z0-9]/g, '_');
      diagram += `    ${sanitizedId} -->|Failure| ${sanitizedNext}\n`;
    }
  });
  
  // Add professional styling classes with accessibility compliance
  diagram += '\n    %% Professional styling with detailed content focus\n';
  diagram += '    classDef triggerClass fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#1B5E20\n';
  diagram += '    classDef conditionClass fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#E65100\n';
  diagram += '    classDef actionClass fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1\n';
  diagram += '    classDef endClass fill:#FFEBEE,stroke:#B71C1C,stroke-width:2px,color:#B71C1C\n\n';
  
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