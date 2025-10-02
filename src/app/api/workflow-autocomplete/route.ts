// src/app/api/workflow-autocomplete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { workflowConversationAutocomplete, getLLMContext } from '@/app/data/workflow-conversation-autocomplete';

import { WorkflowAutocompleteItem } from '@/app/types/workflow-conversation-autocomplete';

interface ApiResponse {
  success: boolean;
  data: {
    autocompleteItems?: (WorkflowAutocompleteItem | Partial<WorkflowAutocompleteItem>)[];
    llmContext?: unknown;
    categories?: string[];
    triggers?: string[];
    metadata?: {
      total: number;
      category?: string;
      trigger?: string;
    };
  };
  timestamp: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const trigger = searchParams.get('trigger');
    const includeMetadata = searchParams.get('includeMetadata') !== 'false';
    const format = searchParams.get('format') || 'autocomplete'; // 'autocomplete' | 'llm' | 'both'

    let filteredItems = workflowConversationAutocomplete;

    // Filter by category if specified
    if (category) {
      filteredItems = filteredItems.filter(item => item.category === category);
    }

    // Filter by trigger if specified
    if (trigger) {
      filteredItems = filteredItems.filter(item => item.trigger === trigger);
    }

    // Strip metadata if not requested (for smaller payloads)
    let processedItems: (WorkflowAutocompleteItem | Partial<WorkflowAutocompleteItem>)[] = filteredItems;
    if (!includeMetadata) {
      processedItems = filteredItems.map(item => ({
        ...item,
        llmInstructions: undefined,
        examples: item.examples.slice(0, 1), // Keep only first example
        parameters: item.parameters?.map(p => ({
          name: p.name,
          type: p.type,
          required: p.required,
          description: p.description
        }))
      }));
    }

    // Get unique categories and triggers
    const categories = [...new Set(workflowConversationAutocomplete.map(item => item.category))];
    const triggers = [...new Set(workflowConversationAutocomplete.map(item => item.trigger))];

    const responseData: Partial<ApiResponse['data']> = {
      categories,
      triggers
    };

    // Include data based on format
    if (format === 'autocomplete' || format === 'both') {
      responseData.autocompleteItems = includeMetadata ? filteredItems : processedItems;
    }

    if (format === 'llm' || format === 'both') {
      responseData.llmContext = getLLMContext();
    }

    const response: ApiResponse = {
      success: true,
      data: responseData as ApiResponse['data'],
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching workflow autocomplete data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch workflow autocomplete data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for specific categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categories, triggers, includeParameters = true } = body;

    let filteredItems = workflowConversationAutocomplete;

    // Filter by multiple categories
    if (categories && Array.isArray(categories)) {
      filteredItems = filteredItems.filter(item => categories.includes(item.category));
    }

    // Filter by multiple triggers
    if (triggers && Array.isArray(triggers)) {
      filteredItems = filteredItems.filter(item => triggers.includes(item.trigger));
    }

    // Optionally exclude parameters for lighter payloads
    if (!includeParameters) {
      filteredItems = filteredItems.map(item => ({
        ...item,
        parameters: undefined
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        autocompleteItems: filteredItems,
        count: filteredItems.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing autocomplete filter request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process autocomplete request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}