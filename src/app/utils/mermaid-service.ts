// src/app/utils/mermaid-service.ts
import { WorkflowJSON, WorkflowStep } from '@/app/types/workflow';

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
  // Workflow steps are always in nested array format
  const steps = workflow.steps as WorkflowStep[];
  
  let diagram = 'flowchart TD\n';
  
  // Recursive function to add all steps including nested ones
  const processedSteps = new Set<string>();
  
  const addStep = (step: WorkflowStep): void => {
    if (processedSteps.has(step.id)) return;
    processedSteps.add(step.id);
    
    const sanitizedId = step.id.replace(/[^a-zA-Z0-9]/g, '_');
    let nodeShape = '';
    
    switch (step.type) {
      case 'trigger':
        nodeShape = `${sanitizedId}(["${step.name}"])`;
        break;
      case 'condition':
        // Add condition details if available
        let conditionLabel = step.name;
        if (step.condition && step.condition.all) {
          const firstCondition = step.condition.all[0];
          if (firstCondition && firstCondition.fact && firstCondition.operator && firstCondition.value !== undefined) {
            conditionLabel += `<br/>${firstCondition.fact} ${firstCondition.operator} ${firstCondition.value}`;
          }
        } else if (step.condition && step.condition.any) {
          conditionLabel += `<br/>OR condition`;
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
    
    // Process nested children
    if (step.children && Array.isArray(step.children)) {
      step.children.forEach((child) => addStep(child));
    }
    
    // Process inline onSuccess/onFailure branches
    if (step.onSuccess && typeof step.onSuccess === 'object') {
      addStep(step.onSuccess);
    }
    if (step.onFailure && typeof step.onFailure === 'object') {
      addStep(step.onFailure);
    }
  };
  
  // Add all steps
  steps.forEach((step) => addStep(step));
  
  diagram += '\n';
  
  // Add connections
  const addConnections = (step: WorkflowStep): void => {
    const sanitizedId = step.id.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Handle children connections
    if (step.children && Array.isArray(step.children) && step.children.length > 0) {
      const firstChild = step.children[0];
      const sanitizedChild = firstChild.id.replace(/[^a-zA-Z0-9]/g, '_');
      diagram += `    ${sanitizedId} --> ${sanitizedChild}\n`;
      
      // Process children recursively
      step.children.forEach((child) => addConnections(child));
    }
    
    // Handle inline branches
    if (step.onSuccess) {
      if (typeof step.onSuccess === 'object' && step.onSuccess !== null && 'id' in step.onSuccess) {
        const sanitizedNext = (step.onSuccess.id as string).replace(/[^a-zA-Z0-9]/g, '_');
        diagram += `    ${sanitizedId} -->|Success| ${sanitizedNext}\n`;
        addConnections(step.onSuccess as WorkflowStep);
      }
    }
    
    if (step.onFailure) {
      if (typeof step.onFailure === 'object' && step.onFailure !== null && 'id' in step.onFailure) {
        const sanitizedNext = (step.onFailure.id as string).replace(/[^a-zA-Z0-9]/g, '_');
        diagram += `    ${sanitizedId} -->|Failure| ${sanitizedNext}\n`;
        addConnections(step.onFailure as WorkflowStep);
      }
    }
    
    // Handle onSuccessGoTo/onFailureGoTo references
    if (step.onSuccessGoTo) {
      const sanitizedNext = step.onSuccessGoTo.replace(/[^a-zA-Z0-9]/g, '_');
      diagram += `    ${sanitizedId} -->|Success| ${sanitizedNext}\n`;
    }
    if (step.onFailureGoTo) {
      const sanitizedNext = step.onFailureGoTo.replace(/[^a-zA-Z0-9]/g, '_');
      diagram += `    ${sanitizedId} -->|Failure| ${sanitizedNext}\n`;
    }
  };
  
  steps.forEach((step) => addConnections(step));
  
  // Add professional styling classes with accessibility compliance
  diagram += '\n    %% Professional styling with detailed content focus\n';
  diagram += '    classDef triggerClass fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#1B5E20\n';
  diagram += '    classDef conditionClass fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#E65100\n';
  diagram += '    classDef actionClass fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1\n';
  diagram += '    classDef endClass fill:#FFEBEE,stroke:#B71C1C,stroke-width:2px,color:#B71C1C\n\n';
  
  // Apply classes to all processed steps
  processedSteps.forEach(stepId => {
    const sanitizedId = stepId.replace(/[^a-zA-Z0-9]/g, '_');
    // Find the step to get its type
    const findStep = (steps: WorkflowStep[]): WorkflowStep | null => {
      for (const step of steps) {
        if (step.id === stepId) return step;
        if (step.children) {
          const found = findStep(step.children);
          if (found) return found;
        }
        if (step.onSuccess && typeof step.onSuccess === 'object' && step.onSuccess.id === stepId) {
          return step.onSuccess;
        }
        if (step.onFailure && typeof step.onFailure === 'object' && step.onFailure.id === stepId) {
          return step.onFailure;
        }
      }
      return null;
    };
    
    const step = findStep(steps);
    if (!step) return;
    
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