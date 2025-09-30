/**
 * Client-side Workflow Generation Service
 * Calls the server-side API for LLM workflow generation
 */

import { WorkflowJSON } from '../types/workflow';

export interface ClientWorkflowContext {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    manager: string;
  };
  mrf?: {
    id: string;
    title: string;
    purpose: string;
    maxAttendees: number;
    startDate: string;
    endDate: string;
    location: string;
    budget: number;
  };
  currentWorkflow?: Partial<WorkflowJSON>;
}

export interface WorkflowGenerationResponse {
  workflow: Partial<WorkflowJSON>;
  source: 'llm' | 'simulation';
  provider?: string;
  message: string;
}

export interface StreamChunk {
  chunk: string;
  workflow?: Partial<WorkflowJSON>;
  error?: string;
}

/**
 * Generate workflow using server-side LLM API
 */
export async function generateWorkflow(
  userInput: string,
  context: ClientWorkflowContext = {}
): Promise<WorkflowGenerationResponse> {
  try {
    const response = await fetch('/api/generate-workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput,
        context: {
          user: context.user || {
            id: 'user123',
            name: 'Demo User',
            email: 'demo@example.com',
            role: 'Event Coordinator',
            department: 'Events',
            manager: 'manager@example.com'
          },
          mrf: context.mrf || {
            id: 'mrf456',
            title: 'Demo Event',
            purpose: 'internal',
            maxAttendees: 50,
            startDate: '2025-10-15',
            endDate: '2025-10-15',
            location: 'Conference Room',
            budget: 10000
          },
          availableFunctions: [
            'functions.requestApproval',
            'functions.sendEmail',
            'functions.createEvent',
            'functions.sendNotification',
            'functions.logError',
            'functions.updateMRF',
            'onMRFSubmit',
            'onEventApproved'
          ],
          currentDate: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate workflow');
    }

    return await response.json();
  } catch (error) {
    console.error('Workflow generation error:', error);
    throw error;
  }
}

/**
 * Stream workflow generation with real-time updates
 */
export async function* streamWorkflowGeneration(
  userInput: string,
  context: ClientWorkflowContext = {}
): AsyncGenerator<StreamChunk> {
  try {
    const response = await fetch('/api/generate-workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput,
        currentWorkflow: context.currentWorkflow,
        context: {
          user: context.user || {
            id: 'user123',
            name: 'Demo User',
            email: 'demo@example.com',
            role: 'Event Coordinator',
            department: 'Events',
            manager: 'manager@example.com'
          },
          mrf: context.mrf || {
            id: 'mrf456',
            title: 'Demo Event',
            purpose: 'internal',
            maxAttendees: 50,
            startDate: '2025-10-15',
            endDate: '2025-10-15',
            location: 'Conference Room',
            budget: 10000
          },
          availableFunctions: [
            'functions.requestApproval',
            'functions.sendEmail',
            'functions.createEvent',
            'functions.sendNotification',
            'functions.logError',
            'functions.updateMRF',
            'onMRFSubmit',
            'onEventApproved'
          ],
          currentDate: new Date().toISOString()
        },
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to stream workflow generation');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete chunks
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
  } catch (error) {
    console.error('Streaming error:', error);
    yield { 
      chunk: '', 
      error: error instanceof Error ? error.message : 'Unknown streaming error' 
    };
  }
}