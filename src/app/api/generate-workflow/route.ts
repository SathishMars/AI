// src/app/api/generate-workflow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LangChainWorkflowGenerator } from '@/app/utils/langchain/langchain-workflow-generator';
import { getTriggerFunctionAutocomplete, getActionFunctionAutocomplete } from '@/app/data/workflow-conversation-autocomplete';

/**
 * Server-side API route for LLM workflow generation using LangChain
 * This prevents API keys from being exposed in the browser
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, context, currentWorkflow } = body;

    // Validate required fields
    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json(
        { error: 'userInput is required and must be a string' },
        { status: 400 }
      );
    }

    // Get available functions from autocomplete system
    const triggerFunctions = getTriggerFunctionAutocomplete();
    const actionFunctions = getActionFunctionAutocomplete();
    
    // Create a default context if none provided or incomplete
    const defaultContext = {
      user: {
        id: 'user-123',
        name: 'Current User',
        email: 'user@company.com',
        role: 'employee',
        department: 'general',
        manager: 'manager@company.com'
      },
      mrf: {
        id: 'mrf-123',
        title: 'New Event Request',
        purpose: 'general',
        maxAttendees: 50,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: 'TBD',
        budget: 1000
      },
      // Enhanced function context from autocomplete system
      availableFunctions: [...triggerFunctions.map(f => f.name), ...actionFunctions.map(f => f.name)],
      triggerFunctions: triggerFunctions.map(f => ({
        name: f.name,
        description: f.description,
        parameters: f.parameters || [],
        examples: f.examples,
        llmInstructions: f.llmInstructions
      })),
      actionFunctions: actionFunctions.map(f => ({
        name: f.name,
        description: f.description,
        parameters: f.parameters || [],
        examples: f.examples,
        llmInstructions: f.llmInstructions
      })),
      currentDate: new Date().toISOString()
    };

    // Merge with default context, preserving enhanced fields
    const fullContext = {
      ...defaultContext,
      user: { ...defaultContext.user, ...(context?.user || {}) },
      mrf: { ...defaultContext.mrf, ...(context?.mrf || {}) },
      // Preserve enhanced context fields
      functionSchemas: context?.functionSchemas || [],
      conversationHistory: context?.conversationHistory || [],
      referenceData: context?.referenceData || undefined
    };

    // Get API configuration from environment variables
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    const provider = (process.env.LLM_PROVIDER as 'openai' | 'anthropic') || 'openai';

    if (!apiKey) {
      console.log('⚠️  No API key found, using fallback simulation');
      // Return a simulated workflow for testing
      const simulatedWorkflow = {
        schemaVersion: '1.0',
        metadata: {
          id: `workflow-${Date.now()}`,
          name: 'AI Generated Workflow',
          description: `Workflow generated from: ${userInput}`,
          version: '1.0.0',
          status: 'draft',
          createdAt: new Date().toISOString(),
          tags: ['ai-generated', 'simulated']
        },
        steps: {
          start: {
            name: 'MRF Submitted',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: { mrfID: 'dynamic' },
            nextSteps: ['checkApprovalNeeded']
          },
          checkApprovalNeeded: {
            name: 'Check Approval Requirements',
            type: 'condition',
            condition: {
              any: [
                {
                  fact: 'mrf.purpose',
                  operator: 'equal',
                  value: 'external'
                },
                {
                  fact: 'mrf.maxAttendees',
                  operator: 'greaterThan',
                  value: 100
                }
              ]
            },
            onSuccess: 'requestManagerApproval',
            onFailure: 'proceedDirectly'
          },
          requestManagerApproval: {
            name: 'Request Manager Approval',
            type: 'action',
            action: 'functions.requestApproval',
            params: {
              to: 'user.manager',
              subject: 'Event Approval Required',
              data: 'mrf'
            },
            onSuccess: 'createEvent',
            onFailure: 'notifyUser'
          },
          proceedDirectly: {
            name: 'Proceed Without Approval',
            type: 'action',
            action: 'functions.proceedDirectly',
            params: { reason: 'No approval required' },
            nextSteps: ['createEvent']
          },
          createEvent: {
            name: 'Create Event',
            type: 'action',
            action: 'functions.createEvent',
            params: { mrfID: 'dynamic' },
            nextSteps: ['end']
          },
          end: {
            name: 'Workflow Complete',
            type: 'end',
            result: 'success'
          }
        },
        mermaidDiagram: `\`\`\`mermaid
flowchart TD
    start[("🚀 MRF Submitted")] --> checkApprovalNeeded{"❓ Check Approval Requirements"}
    checkApprovalNeeded -->|"✅ Needs Approval"| requestManagerApproval["👤 Request Manager Approval"]
    checkApprovalNeeded -->|"❌ No Approval Needed"| proceedDirectly["⚡ Proceed Without Approval"]
    requestManagerApproval -->|"✅ Approved"| createEvent["📅 Create Event"]
    requestManagerApproval -->|"❌ Rejected"| notifyUser["📧 Notify User"]
    proceedDirectly --> createEvent
    createEvent --> end(["🏁 Workflow Complete"])
\`\`\``,
      };

      return NextResponse.json({
        workflow: simulatedWorkflow,
        source: 'simulation',
        message: 'Generated using simulation mode (no API key configured)'
      });
    }

    // Initialize LangChain generator with conversational mode enabled
    const generator = new LangChainWorkflowGenerator({
      provider: provider === 'openai' ? 'openai' : provider === 'anthropic' ? 'anthropic' : 'lmstudio',
      sessionId: `workflow-gen-${Date.now()}`,
      workflowId: currentWorkflow?.metadata?.id || `new-workflow-${Date.now()}`,
      userId: fullContext.user?.id,
      organization: fullContext.user?.department,
      conversationalMode: true // Enable conversational mode for parameter collection
    });

    // Initialize memory for the session
    generator.initializeMemory();

    // Map fullContext to LangChain's WorkflowGenerationContext
    const functionDefs = [...(fullContext.triggerFunctions || []), ...(fullContext.actionFunctions || [])].map(f => ({
      name: f.name,
      description: f.description,
      usage: f.llmInstructions?.usage || f.description,
      parameters: (f.parameters || []).map(p => {
        let options: string[] | undefined = undefined;
        if (p.options && Array.isArray(p.options)) {
          if (p.options.length > 0 && typeof p.options[0] === 'object') {
            options = (p.options as Array<{value: string | number}>).map(o => String(o.value));
          } else {
            options = p.options.map(o => String(o));
          }
        }
        return {
          name: p.name,
          type: String(p.type),
          description: p.description,
          required: p.required,
          options
        };
      }),
      example: (f.llmInstructions?.jsonExample || (f.examples && f.examples[0]) || {}) as Record<string, unknown>
    }));

    const langchainContext = {
      userRole: fullContext.user?.role || 'employee',
      userDepartment: fullContext.user?.department || 'general',
      workflowId: currentWorkflow?.metadata?.id,
      workflowName: currentWorkflow?.metadata?.name,
      conversationGoal: 'create' as const,
      currentWorkflowSteps: currentWorkflow?.steps ? Object.keys(currentWorkflow.steps) : [],
      availableFunctions: fullContext.availableFunctions || [],
      functionDefinitions: functionDefs,
      conversationHistory: fullContext.conversationHistory || [],
      user: fullContext.user,
      mrf: fullContext.mrf,
      referenceData: fullContext.referenceData,
      currentDate: fullContext.currentDate
    };

    // Handle backend-only processing with conversational responses
    const result = await generator.generateWorkflow(userInput, langchainContext, currentWorkflow);
    
    return NextResponse.json({
      workflow: result.workflow,
      conversationalResponse: result.conversationalResponse,
      followUpQuestions: result.followUpQuestions,
      parameterCollectionNeeded: result.parameterCollectionNeeded,
      source: 'llm',
      provider,
      message: result.conversationalResponse || `Workflow updated successfully based on your request: "${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}"`
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}