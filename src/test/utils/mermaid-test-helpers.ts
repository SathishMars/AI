// src/test/utils/mermaid-test-helpers.ts
import { generateMermaidDiagram } from '@/app/utils/mermaid-service';
import { WorkflowJSON } from '@/app/types/workflow';

/**
 * Test utilities for Mermaid diagram generation and validation
 */

export interface MermaidTestResult {
  diagram: string;
  isValid: boolean;
  errors?: string[];
  nodeCount?: number;
  edgeCount?: number;
}

/**
 * Test Mermaid diagram generation for a workflow
 */
export async function testMermaidGeneration(workflow: WorkflowJSON): Promise<MermaidTestResult> {
  try {
    const diagram = await generateMermaidDiagram(workflow);
    
    // Basic validation
    const isValid = diagram.length > 0 && diagram.includes('flowchart');
    const nodeCount = (diagram.match(/\[.*?\]/g) || []).length;
    const edgeCount = (diagram.match(/-->/g) || []).length;
    
    return {
      diagram,
      isValid,
      nodeCount,
      edgeCount
    };
  } catch (error) {
    return {
      diagram: '',
      isValid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Validate Mermaid syntax
 */
export function validateMermaidSyntax(diagram: string): boolean {
  // Basic syntax validation
  const requiredElements = [
    /^flowchart\s+(TD|TB|BT|RL|LR)/m, // Valid flowchart direction
    /\[.*?\]/, // At least one node
    /-->/ // At least one connection
  ];
  
  return requiredElements.every(regex => regex.test(diagram));
}

/**
 * Count diagram elements for testing
 */
export function analyzeMermaidDiagram(diagram: string) {
  return {
    nodes: (diagram.match(/\[.*?\]/g) || []).length,
    edges: (diagram.match(/-->/g) || []).length,
    decisions: (diagram.match(/\{.*?\}/g) || []).length,
    hasSubgraphs: diagram.includes('subgraph'),
    hasStyles: diagram.includes('classDef') || diagram.includes('class ')
  };
}