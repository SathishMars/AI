// src/app/api/generate-mermaid/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { WorkflowJSON } from '@/app/types/workflow';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { workflow }: { workflow: WorkflowJSON } = await request.json();
    
    if (!workflow || !workflow.steps) {
      return NextResponse.json(
        { error: 'Invalid workflow data' },
        { status: 400 }
      );
    }

    const prompt = createMermaidPrompt(workflow);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating Mermaid flowchart diagrams. Generate clean, readable Mermaid flowchart syntax that accurately represents workflow logic. Always use proper Mermaid syntax and include decision nodes for conditions.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const mermaidDiagram = completion.choices[0]?.message?.content?.trim();
    
    if (!mermaidDiagram) {
      return NextResponse.json(
        { error: 'Failed to generate diagram' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mermaidDiagram });
    
  } catch (error) {
    console.error('Error generating Mermaid diagram:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function createMermaidPrompt(workflow: WorkflowJSON): string {
  const stepsJson = JSON.stringify(workflow.steps, null, 2);
  
  return `Create a Mermaid flowchart diagram for this workflow. The workflow has the following structure:

Workflow Name: ${workflow.metadata.name}
Description: ${workflow.metadata.description || 'No description'}

Steps:
${stepsJson}

Requirements:
1. Use Mermaid flowchart syntax starting with \`flowchart TD\`
2. Create nodes for each step with meaningful labels
3. Use decision diamond shapes for condition-type steps
4. Use process rectangles for action-type steps  
5. Use rounded rectangles for trigger and end steps
6. Show all connections between steps (nextSteps, onSuccess, onFailure)
7. Use different colors or styling to distinguish step types
8. Make the diagram flow top-to-bottom logically
9. Include proper Mermaid syntax for styling and colors
10. Ensure all step IDs are referenced correctly

Generate ONLY the Mermaid diagram code, no explanations or additional text.`;
}