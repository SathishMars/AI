// src/app/api/langchain/generate-workflow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createLangChainWorkflowGenerator } from '@/app/utils/langchain/langchain-workflow-generator';
import { getLLMFactory } from '@/app/utils/langchain/providers/llm-factory';
import type { 
  LangChainWorkflowConfig, 
  WorkflowGenerationContext, 
  LangChainWorkflowResult 
} from '@/app/utils/langchain/langchain-workflow-generator';
import { WorkflowJSON } from '@/app/types/workflow';

interface WorkflowGenerationRequest {
  userInput: string;
  context: WorkflowGenerationContext;
  config: LangChainWorkflowConfig;
  currentWorkflow?: Partial<WorkflowJSON>;
}

/**
 * LangChain-powered workflow generation API endpoint
 * Replaces the direct LLM integration with sophisticated LangChain orchestration
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 LangChain workflow generation API called');

    const body: WorkflowGenerationRequest = await request.json();
    const { userInput, context, config, currentWorkflow } = body;

    // Validate required fields
    if (!userInput || !context || !config) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: userInput, context, and config are required',
          success: false 
        },
        { status: 400 }
      );
    }

    // Validate config
    if (!config.sessionId || !config.workflowId) {
      return NextResponse.json(
        { 
          error: 'Config must include sessionId and workflowId',
          success: false 
        },
        { status: 400 }
      );
    }

    console.log(`🎯 Generating workflow for session: ${config.sessionId}`);

    // Get current LLM factory to detect provider information
    const llmFactory = getLLMFactory();
    const availableProviders = llmFactory.getAvailableProviders();
    const currentProvider = config.provider || llmFactory.getDefaultProvider();

    console.log(`🤖 Using LLM provider: ${currentProvider}`);
    if (currentProvider === 'lmstudio') {
      console.log(`🏠 LM Studio endpoint: ${process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1'}`);
      console.log(`🎯 LM Studio model: ${process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct'}`);
    }

    // Create LangChain workflow generator (factory function handles initialization)
    const generator = await createLangChainWorkflowGenerator(config);

    // Generate workflow using LangChain
    const result: LangChainWorkflowResult = await generator.generateWorkflow(
      userInput,
      context,
      currentWorkflow
    );

    // Enhanced response with additional metadata
    const response = {
      success: true,
      result: {
        ...result,
        metadata: {
          sessionId: config.sessionId,
          workflowId: config.workflowId,
          provider: currentProvider,
          availableProviders: availableProviders,
          conversationalMode: config.conversationalMode || false,
          generatedAt: new Date().toISOString(),
          availableTools: generator.getAvailableTools().length,
          // LM Studio specific metadata
          ...(currentProvider === 'lmstudio' && {
            lmstudio: {
              endpoint: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
              model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
              enabled: process.env.LMSTUDIO_ENABLED === 'true'
            }
          })
        }
      }
    };

    // Cleanup generator resources
    await generator.cleanup();

    console.log('✅ LangChain workflow generation completed successfully');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in LangChain workflow generation:', error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      fallback: {
        workflow: {},
        conversationalResponse: 'I apologize, but I encountered an error while generating your workflow. Please try again with a simpler request.',
        followUpQuestions: [
          'Would you like to start with a basic workflow template?',
          'Can you describe your workflow in simpler terms?'
        ],
        parameterCollectionNeeded: true
      }
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET endpoint for testing and health checks
 */
export async function GET() {
  try {
    // Quick health check of LangChain components
    const testConfig: LangChainWorkflowConfig = {
      sessionId: 'health-check',
      workflowId: 'test-workflow',
      conversationalMode: false
    };

    const generator = await createLangChainWorkflowGenerator(testConfig);
    const availableTools = generator.getAvailableTools();
    
    // Get provider information
    const llmFactory = getLLMFactory();
    const availableProviders = llmFactory.getAvailableProviders();
    const defaultProvider = llmFactory.getDefaultProvider();

    const healthStatus = {
      status: 'healthy',
      langchain: {
        available: true,
        toolsLoaded: availableTools.length,
        providers: {
          available: availableProviders,
          default: defaultProvider,
          configured: {
            openai: !!process.env.OPENAI_API_KEY,
            anthropic: !!process.env.ANTHROPIC_API_KEY,
            lmstudio: process.env.LMSTUDIO_ENABLED === 'true' || !!process.env.LMSTUDIO_BASE_URL
          }
        },
        memoryEnabled: true,
        ...(availableProviders.includes('lmstudio') && {
          lmstudio: {
            endpoint: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
            model: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
            enabled: process.env.LMSTUDIO_ENABLED === 'true'
          }
        })
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(healthStatus);

  } catch (error) {
    console.error('❌ LangChain health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}