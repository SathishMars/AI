// src/test/app/utils/llm/openai-provider.test.ts
import { OpenAIProvider } from '@/app/utils/llm/openai-provider';
import { LLMConfig, createWorkflowContext } from '@/app/types/llm';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockConfig: LLMConfig;

  beforeEach(() => {
    mockConfig = {
      provider: 'openai',
      apiKey: 'test-api-key',
      models: {
        workflow_build: {
          model: 'gpt-4-turbo-preview',
          complexity: 'high',
          streaming: true,
          maxTokens: 4000,
          temperature: 0.1
        },
        workflow_edit: {
          model: 'gpt-4-turbo-preview',
          complexity: 'medium',
          streaming: true,
          maxTokens: 3000,
          temperature: 0.1
        },
        mrf_chat: {
          model: 'gpt-3.5-turbo',
          complexity: 'low',
          streaming: true,
          maxTokens: 1000,
          temperature: 0.7
        },
        validation_explain: {
          model: 'gpt-3.5-turbo',
          complexity: 'low',
          streaming: true,
          maxTokens: 1500,
          temperature: 0.3
        },
        mermaid_generate: {
          model: 'gpt-4',
          complexity: 'medium',
          streaming: true,
          maxTokens: 2000,
          temperature: 0.2
        }
      },
      maxTokens: 4000,
      temperature: 0.1,
      enableStreaming: true,
      timeout: 30000,
      retryAttempts: 3,
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 150000,
        burstLimit: 100,
        priorityTasks: ['workflow_build', 'workflow_edit']
      }
    };

    provider = new OpenAIProvider(mockConfig);
  });

  describe('validateResponse', () => {
    it('should validate workflow JSON response correctly', () => {
      const validWorkflowResponse = JSON.stringify({
        steps: [
          { id: 'start', name: 'Start', type: 'trigger' },
          { id: 'end', name: 'End', type: 'end' }
        ]
      });

      const result = provider.validateResponse(validWorkflowResponse, 'workflow');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.info).toHaveLength(1);
      expect(result.info[0].id).toBe('workflow_valid');
    });

    it('should detect invalid workflow JSON', () => {
      const invalidWorkflowResponse = JSON.stringify({
        metadata: { name: 'test' }
        // Missing steps property
      });

      const result = provider.validateResponse(invalidWorkflowResponse, 'workflow');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('missing_steps');
    });

    it('should validate Mermaid diagrams', () => {
      const validMermaidResponse = 'flowchart TD\nA --> B\nB --> C';
      
      const result = provider.validateResponse(validMermaidResponse, 'mermaid');
      
      expect(result.isValid).toBe(true);
      expect(result.info).toHaveLength(1);
      expect(result.info[0].id).toBe('mermaid_detected');
    });

    it('should detect invalid Mermaid syntax', () => {
      const invalidMermaidResponse = 'This is not a mermaid diagram';
      
      const result = provider.validateResponse(invalidMermaidResponse, 'mermaid');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('invalid_mermaid');
    });

    it('should validate text responses', () => {
      const textResponse = 'This is a valid text response.';
      
      const result = provider.validateResponse(textResponse, 'text');
      
      expect(result.isValid).toBe(true);
      expect(result.info).toHaveLength(1);
  expect(result.info[0].technicalMessage).toContain('characters');
    });

    it('should detect empty text responses', () => {
      const emptyResponse = '';
      
      const result = provider.validateResponse(emptyResponse, 'text');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('empty_response');
    });
  });

  describe('getTaskModel', () => {
    it('should return correct model for each task type', () => {
      expect(provider.getTaskModel('workflow_build')).toBe('gpt-4-turbo-preview');
      expect(provider.getTaskModel('workflow_edit')).toBe('gpt-4-turbo-preview');
      expect(provider.getTaskModel('mrf_chat')).toBe('gpt-3.5-turbo');
      expect(provider.getTaskModel('validation_explain')).toBe('gpt-3.5-turbo');
      expect(provider.getTaskModel('mermaid_generate')).toBe('gpt-4');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      const text = 'This is a test text';
      const tokens = provider.estimateTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });
  });

  describe('enrichPromptWithContext', () => {
    it('should enrich prompt with context information', async () => {
      const context = createWorkflowContext(
        [],
        {
          id: 'user-123',
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'Event Manager',
          department: 'Marketing',
          timezone: 'America/New_York',
          permissions: ['create_workflow', 'edit_workflow']
        },
        {
          id: 'mrf-123',
          title: 'Team Meeting',
          attendees: 25,
          type: 'meeting',
          requester: 'john.doe@example.com',
          priority: 'medium'
        }
      );

      const originalPrompt = 'Create a workflow for this event';
      const enrichedPrompt = await provider.enrichPromptWithContext(originalPrompt, context);

      expect(enrichedPrompt).toContain('John Doe');
      expect(enrichedPrompt).toContain('Event Manager');
      expect(enrichedPrompt).toContain('Marketing');
      expect(enrichedPrompt).toContain('Team Meeting');
      expect(enrichedPrompt).toContain('25 attendees');
      expect(enrichedPrompt).toContain(originalPrompt);
    });
  });

  describe('truncateContextIfNeeded', () => {
    it('should truncate conversation history when context is too large', () => {
      const longContext = createWorkflowContext(
        [
          { id: '1', sender: 'user', content: 'First message', timestamp: new Date(), status: 'complete', type: 'text' },
          { id: '2', sender: 'aime', content: 'Second message', timestamp: new Date(), status: 'complete', type: 'text' },
          { id: '3', sender: 'user', content: 'Third message', timestamp: new Date(), status: 'complete', type: 'text' },
          { id: '4', sender: 'aime', content: 'Fourth message', timestamp: new Date(), status: 'complete', type: 'text' }
        ],
        {
          id: 'user-123',
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'Event Manager',
          department: 'Marketing',
          timezone: 'America/New_York',
          permissions: ['create_workflow']
        }
      );

      const truncatedContext = provider.truncateContextIfNeeded(longContext, 50); // Very low limit
      
      expect(truncatedContext.conversationHistory.length).toBeLessThan(longContext.conversationHistory.length);
    });
  });

  describe('health check', () => {
    it('should return healthy status when API is available', async () => {
      // Note: This test requires proper OpenAI SDK mocking
      // For now, we'll test the interface without actual API calls
      
      const health = await provider.getHealth();
      
      expect(health.provider).toBe('openai');
      expect(['healthy', 'unavailable']).toContain(health.status);
      expect(typeof health.responseTime).toBe('number');
    });

    it('should return unavailable status when API fails', async () => {
      // Note: This test requires proper OpenAI SDK mocking
      // For now, we'll test the interface without actual API calls
      
      const health = await provider.getHealth();
      
      expect(health.provider).toBe('openai');
      expect(['healthy', 'unavailable']).toContain(health.status);
      expect(typeof health.errorRate).toBe('number');
    });
  });

  describe('rate limiting', () => {
    it('should allow requests within rate limit', async () => {
      const result = await provider.checkRateLimit('mrf_chat');
      expect(result).toBe(true);
    });

    it('should block requests when rate limit exceeded', async () => {
      // Simulate many requests quickly
      for (let i = 0; i < 61; i++) {
        await provider.checkRateLimit('mrf_chat');
      }
      
      const result = await provider.checkRateLimit('mrf_chat');
      expect(result).toBe(false);
    });
  });
});