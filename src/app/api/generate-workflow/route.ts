// src/app/api/generate-workflow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LLMWorkflowGenerator } from '@/app/utils/llm-workflow-generator';

/**
 * Server-side API route for LLM workflow generation
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
      availableFunctions: ['functions.requestApproval', 'functions.createEvent', 'functions.sendNotification'],
      currentDate: new Date().toISOString()
    };

    // Merge provided context with defaults
    const fullContext = {
      ...defaultContext,
      ...context,
      user: { ...defaultContext.user, ...(context?.user || {}) },
      mrf: { ...defaultContext.mrf, ...(context?.mrf || {}) }
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
        }
      };

      return NextResponse.json({
        workflow: simulatedWorkflow,
        source: 'simulation',
        message: 'Generated using simulation mode (no API key configured)'
      });
    }

    // Initialize LLM generator with conversational mode enabled
    const generator = new LLMWorkflowGenerator({
      provider,
      apiKey,
      model: provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229',
      conversationalMode: true // Enable conversational mode for parameter collection
    });

    // Handle backend-only processing with conversational responses
    const result = await generator.generateWorkflow(userInput, fullContext, currentWorkflow);
    
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