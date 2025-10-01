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
          content: `You are an expert workflow visualization specialist who creates professional Mermaid flowchart diagrams. You have deep knowledge of Mermaid syntax v11+ and workflow design patterns.

CRITICAL WORKFLOW CONTEXT: You are generating a business process workflow diagram that shows how tasks flow through a system with conditional logic, approvals, and automated actions.

MERMAID SYNTAX REQUIREMENTS:
- Use flowchart TD (Top Down) orientation for workflows
- Apply rich styling with CSS classes and colors
- Use semantic node shapes: rectangles for actions, diamonds for decisions, circles for start/end
- Include proper subgraphs for logical groupings
- Add descriptive labels and meaningful connections
- Use proper Mermaid v11 syntax and features

WORKFLOW-SPECIFIC BEST PRACTICES:
- Show clear start and end points
- Highlight decision points with diamond shapes
- Use different colors for different step types (triggers=green, conditions=yellow, actions=blue, end=red)
- Include action descriptions and parameters when relevant
- Show approval flows and conditional branches clearly
- Add swimlanes or subgraphs for different actors/systems
- Use proper arrow labels for Success/Failure paths

Generate production-quality diagrams that business users can easily understand and follow.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
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
  
  return `Create a professional, business-ready Mermaid flowchart diagram for this workflow process.

WORKFLOW DETAILS:
Name: ${workflow.metadata.name}
Description: ${workflow.metadata.description || 'Business process workflow'}
Type: Business Process Workflow

WORKFLOW STEPS DATA:
${stepsJson}

DETAILED REQUIREMENTS:

1. STRUCTURE & SYNTAX:
   - Start with: flowchart TD
   - Use Mermaid v11+ syntax with proper node IDs
   - Ensure all connections are valid and referenced correctly

2. NODE SHAPES & SEMANTICS:
   - trigger steps: Use rounded rectangles ([\"Label\"])  
   - condition steps: Use diamonds {\"Decision Label\"}
   - action steps: Use rectangles [\"Action Label\"]
   - end steps: Use circles ((\"End Label\"))

3. STYLING & COLORS (use classDef and class):
   - Triggers: Green background (#e1f5fe → #4caf50)
   - Conditions: Yellow/Orange background (#fff3e0 → #ff9800) 
   - Actions: Blue background (#e3f2fd → #2196f3)
   - End nodes: Red/Gray background (#ffebee → #f44336)

4. LABELS & DESCRIPTIONS:
   - Include action names and brief descriptions
   - Show parameter details for important actions
   - Use meaningful connection labels (Success/Failure/Approved/Rejected)
   - Add step numbers or sequence indicators where helpful

5. WORKFLOW-SPECIFIC FEATURES:
   - Group related steps in subgraphs if logical
   - Show approval chains clearly
   - Highlight critical decision points
   - Use proper arrow styles (-->|label|) for conditional flows

6. BUSINESS CLARITY:
   - Make the diagram readable by non-technical users
   - Show the complete process flow from start to finish
   - Ensure decision outcomes are clear
   - Include timeout or error handling paths if present

7. ADVANCED MERMAID FEATURES:
   - Use classDef for consistent styling
   - Apply click events if beneficial
   - Add linkStyle for emphasis on critical paths
   - Include %% comments for complex logic explanation

EXAMPLE STRUCTURE:
\`\`\`
flowchart TD
    Start([\"Process Started\"]) --> Decision{\"Check Condition\"}
    Decision -->|Yes| Action1[\"Execute Action\"]
    Decision -->|No| Action2[\"Alternative Path\"]
    
    classDef triggerClass fill:#e1f5fe,stroke:#4caf50,stroke-width:2px
    classDef conditionClass fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    classDef actionClass fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    classDef endClass fill:#ffebee,stroke:#f44336,stroke-width:2px
    
    class Start triggerClass
    class Decision conditionClass
    class Action1,Action2 actionClass
\`\`\`

Generate ONLY the complete Mermaid diagram code with styling. Do not include explanations, markdown blocks, or additional text.`;
}