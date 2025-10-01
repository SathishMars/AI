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

ACCESSIBILITY & COLOR GUIDELINES (CRITICAL):
- ALWAYS ensure high contrast between text and background colors
- Use dark text (#000000 or #333333) on light backgrounds
- Use light text (#FFFFFF or #F5F5F5) on dark backgrounds
- Test readability: text must be clearly visible against background
- Maintain WCAG AA contrast ratios (4.5:1 minimum)

CONSISTENT COLOR SCHEME (MANDATORY):
- Triggers/Start: Light green backgrounds (#E8F5E8, #C8E6C9) with dark text (#1B5E20, #2E7D32)
- Conditions/Decisions: Light orange/yellow (#FFF3E0, #FFE0B2) with dark text (#E65100, #F57C00)
- Actions/Processes: Light blue backgrounds (#E3F2FD, #BBDEFB) with dark text (#0D47A1, #1976D2)
- End/Complete: Light gray/red backgrounds (#FFEBEE, #F3E5F5) with dark text (#B71C1C, #4A148C)

WORKFLOW-SPECIFIC BEST PRACTICES:
- Show clear start and end points
- Highlight decision points with diamond shapes
- Use consistent colors for same step types across the entire diagram
- Include action descriptions and parameters when relevant
- Show approval flows and conditional branches clearly
- Add swimlanes or subgraphs for different actors/systems
- Use proper arrow labels for Success/Failure paths
- Ensure all text is readable and high-contrast

Generate production-quality diagrams that business users can easily read and follow with excellent visual accessibility.`
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

5. DETAILED CONTENT REQUIREMENTS:
   - Include step names AND action details (e.g., "Request Approval<br/>📋 functions.requestApproval")
   - Show condition logic descriptions (e.g., "Check Attendees > 100")
   - Display parameter information when relevant
   - Add meaningful descriptions for business context
   - Include step sequences or IDs for reference
   - Show timeout or error handling information if present

6. CLEAN VISUAL DESIGN:
   - NO emojis in node labels - keep text clean and professional
   - Use descriptive text labels without visual clutter
   - Focus on information hierarchy and clarity
   - Let colors provide visual distinction, not icons
   - Ensure business users can easily read and understand content

7. ADVANCED MERMAID FEATURES:
   - Use classDef for consistent styling across all nodes of the same type
   - Apply click events if beneficial
   - Add linkStyle for emphasis on critical paths
   - Include %% comments for complex logic explanation
   - Add subgraphs for logical groupings when helpful

8. COLOR ACCESSIBILITY EXAMPLES:
   \`\`\`
   classDef triggerClass fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
   classDef conditionClass fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#E65100
   classDef actionClass fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
   classDef endClass fill:#FFEBEE,stroke:#B71C1C,stroke-width:2px,color:#B71C1C
   \`\`\`

EXAMPLE STRUCTURE:
\`\`\`
flowchart TD
    Start([\"Process Started\"]) --> Decision{\"Check Event Size<br/>Attendees > 100?\"}
    Decision -->|✅ Yes| Approval[\"Request Manager Approval<br/>functions.requestApproval<br/>Notify: user.manager\"]
    Decision -->|❌ No| AutoApprove[\"Auto Approve Event<br/>functions.autoApprove<br/>Update status to approved\"]
    Approval --> ApprovalCheck{\"Approval Received?\"}
    ApprovalCheck -->|✅ Approved| CreateEvent[\"Create Event<br/>functions.createEvent<br/>Send confirmations\"]
    ApprovalCheck -->|❌ Rejected| NotifyRejection[\"Notify Rejection<br/>functions.sendNotification<br/>Update status\"]
    AutoApprove --> CreateEvent
    CreateEvent --> End((\"Process Complete\"))
    NotifyRejection --> End
    
    classDef triggerClass fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    classDef conditionClass fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#E65100
    classDef actionClass fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    classDef endClass fill:#FFEBEE,stroke:#B71C1C,stroke-width:2px,color:#B71C1C
    
    class Start triggerClass
    class Decision,ApprovalCheck conditionClass
    class Approval,AutoApprove,CreateEvent,NotifyRejection actionClass
    class End endClass
\`\`\`

CRITICAL REQUIREMENTS:
- ALWAYS include classDef statements for consistent coloring
- ALWAYS apply classes to ensure same step types have identical colors
- ALWAYS verify text contrast meets accessibility standards
- ALWAYS use the specified color palette for consistency
- ALWAYS include detailed action descriptions and function names
- NEVER use emojis in node labels - keep text clean and professional
- ALWAYS show business logic and parameter details where relevant

Generate ONLY the complete Mermaid diagram code with accessibility-compliant styling and detailed content. Do not include explanations, markdown blocks, or additional text.`;
}