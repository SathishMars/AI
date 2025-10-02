// src/app/api/trigger-functions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTriggerFunctionAutocomplete } from '@/app/data/workflow-conversation-autocomplete';

/**
 * API endpoint to serve available trigger functions for workflow creation
 * This ensures LLM only uses predefined trigger functions with their parameters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeParameters = searchParams.get('includeParameters') === 'true';

    // Get all available trigger functions from autocomplete system
    const triggerFunctions = getTriggerFunctionAutocomplete();

    // Format for different use cases
    if (includeParameters) {
      // Full details for parameter collection and LLM context
      const detailedFunctions = triggerFunctions.map(func => ({
        id: func.id,
        name: func.name,
        displayName: func.displayName,
        description: func.description,
        parameters: func.parameters || [],
        examples: func.examples,
        llmInstructions: func.llmInstructions,
        tags: func.tags
      }));

      return NextResponse.json({
        success: true,
        functions: detailedFunctions,
        count: detailedFunctions.length,
        message: 'Trigger functions retrieved with parameter details'
      });
    } else {
      // Simple list for quick reference
      const simpleFunctions = triggerFunctions.map(func => ({
        name: func.name,
        description: func.description,
        hasParameters: (func.parameters && func.parameters.length > 0)
      }));

      return NextResponse.json({
        success: true,
        functions: simpleFunctions,
        count: simpleFunctions.length,
        message: 'Trigger functions retrieved'
      });
    }

  } catch (error) {
    console.error('Error fetching trigger functions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch trigger functions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get specific trigger function details by name
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { functionName } = body;

    if (!functionName) {
      return NextResponse.json(
        { success: false, error: 'functionName is required' },
        { status: 400 }
      );
    }

    const triggerFunctions = getTriggerFunctionAutocomplete();
    const targetFunction = triggerFunctions.find(func => func.name === functionName);

    if (!targetFunction) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Trigger function '${functionName}' not found`,
          availableFunctions: triggerFunctions.map(f => f.name)
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      function: {
        id: targetFunction.id,
        name: targetFunction.name,
        displayName: targetFunction.displayName,
        description: targetFunction.description,
        parameters: targetFunction.parameters || [],
        examples: targetFunction.examples,
        llmInstructions: targetFunction.llmInstructions,
        tags: targetFunction.tags
      },
      message: `Trigger function '${functionName}' details retrieved`
    });

  } catch (error) {
    console.error('Error fetching specific trigger function:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch trigger function details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}