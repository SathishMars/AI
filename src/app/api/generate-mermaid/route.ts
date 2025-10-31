import { generateMermaidFromWorkflow } from "@/app/utils/MermaidGenerator";
import { NextRequest, NextResponse } from "next/server";



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, workflowDefinition } = body;

    console.log('Received request to generate mermaid diagram:', { sessionId, workflowDefinition });

    // Basic validation
    if (!sessionId || !workflowDefinition) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: sessionId and workflowDefinition'
        },
        { status: 400 }
      );
    }

    // Simulate mermaid diagram generation (replace with actual logic)
    const mermaidDiagram = generateMermaidFromWorkflow(workflowDefinition);

    console.log('Generated mermaid diagram:', mermaidDiagram);

    return NextResponse.json({
      success: true,
      mermaidDiagram: mermaidDiagram.trim(),
      workflowDefinition, // Echo back the workflow definition
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating mermaid diagram:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate mermaid diagram',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}