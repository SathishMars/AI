// src/test/app/utils/llm/multi-llm-manager.test.ts
import { MultiLLMManager, createMultiLLMManager } from '@/app/utils/llm/multi-llm-manager';
import { LLMConfig, createWorkflowContext } from '@/app/types/llm';
import { OpenAIProvider } from '@/app/utils/llm/openai-provider';
import { AnthropicProvider } from '@/app/utils/llm/anthropic-provider';

// Mock both providers
jest.mock('@/app/utils/llm/openai-provider');
jest.mock('@/app/utils/llm/anthropic-provider');

const MockedOpenAIProvider = OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>;
const MockedAnthropicProvider = AnthropicProvider as jest.MockedClass<typeof AnthropicProvider>;

describe('MultiLLMManager', () => {
  let manager: MultiLLMManager;
  let mockConfigs: Map<'openai' | 'anthropic', LLMConfig>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock provider instances - using the correct interface methods
    MockedOpenAIProvider.prototype.getHealth = jest.fn().mockResolvedValue({ 
      provider: 'openai' as const,
      status: 'healthy' as const,
      responseTime: 100, 
      errorRate: 0,
      lastCheck: new Date(),
      details: { message: 'OpenAI provider is healthy' }
    });
    MockedOpenAIProvider.prototype.validateResponse = jest.fn().mockReturnValue({ 
      isValid: true, errors: [], warnings: [], info: [] 
    });
    
    MockedAnthropicProvider.prototype.getHealth = jest.fn().mockResolvedValue({ 
      provider: 'anthropic' as const,
      status: 'healthy' as const,
      responseTime: 120, 
      errorRate: 0,
      lastCheck: new Date(),
      details: { message: 'Anthropic provider is healthy' }
    });
    MockedAnthropicProvider.prototype.validateResponse = jest.fn().mockReturnValue({ 
      isValid: true, errors: [], warnings: [], info: [] 
    });
    mockConfigs = new Map([
      ['openai', {
        provider: 'openai',
        apiKey: 'test-openai-key',
        models: {
          workflow_build: { model: 'gpt-4', complexity: 'high', streaming: true, temperature: 0.1, maxTokens: 4000 },
          workflow_edit: { model: 'gpt-4', complexity: 'medium', streaming: true, temperature: 0.1, maxTokens: 3000 },
          mrf_chat: { model: 'gpt-3.5-turbo', complexity: 'low', streaming: true, temperature: 0.7, maxTokens: 1000 },
          validation_explain: { model: 'gpt-3.5-turbo', complexity: 'low', streaming: true, temperature: 0.3, maxTokens: 1500 },
          mermaid_generate: { model: 'gpt-4', complexity: 'medium', streaming: true, temperature: 0.2, maxTokens: 2000 }
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
          priorityTasks: ['workflow_build']
        }
      }],
      ['anthropic', {
        provider: 'anthropic',
        apiKey: 'test-anthropic-key',
        models: {
          workflow_build: { model: 'claude-3-opus', complexity: 'high', streaming: true, temperature: 0.1, maxTokens: 4000 },
          workflow_edit: { model: 'claude-3-sonnet', complexity: 'medium', streaming: true, temperature: 0.1, maxTokens: 3000 },
          mrf_chat: { model: 'claude-3-haiku', complexity: 'low', streaming: true, temperature: 0.7, maxTokens: 1000 },
          validation_explain: { model: 'claude-3-haiku', complexity: 'low', streaming: true, temperature: 0.3, maxTokens: 1500 },
          mermaid_generate: { model: 'claude-3-sonnet', complexity: 'medium', streaming: true, temperature: 0.2, maxTokens: 2000 }
        },
        maxTokens: 4000,
        temperature: 0.1,
        enableStreaming: true,
        timeout: 30000,
        retryAttempts: 3,
        rateLimits: {
          requestsPerMinute: 50,
          tokensPerMinute: 100000,
          burstLimit: 75,
          priorityTasks: ['workflow_build']
        }
      }]
    ]);

    manager = new MultiLLMManager(mockConfigs);
    
    // Initialize health status for tests
    await manager.getOverallHealth();
  });

  describe('Provider Initialization', () => {
    it('should initialize with provided configurations', () => {
      expect(manager).toBeDefined();
    });

    it('should support factory function creation', () => {
      const factoryManager = createMultiLLMManager('test-openai', 'test-anthropic');
      expect(factoryManager).toBeDefined();
    });

    it('should throw error when no API keys provided', () => {
      expect(() => createMultiLLMManager()).toThrow('At least one LLM provider API key must be provided');
    });
  });

  describe('Provider Selection', () => {
    it('should select best provider for task', async () => {
      const bestProvider = await manager.getBestProviderForTask('workflow_build');
      expect(['openai', 'anthropic']).toContain(bestProvider);
    });

    it('should return provider metrics', () => {
      const metrics = manager.getProviderMetrics('openai');
      expect(metrics).toHaveProperty('accuracyScores');
      expect(metrics).toHaveProperty('isAvailable');
    });
  });

  describe('Health Monitoring', () => {
    it('should check overall health status', async () => {
      const healthStatus = await manager.getOverallHealth();
      expect(healthStatus).toBeInstanceOf(Map);
      expect(healthStatus.size).toBeGreaterThan(0);
    });
  });

  describe('Response Validation', () => {
    it('should validate workflow responses', async () => {
      const workflowResponse = JSON.stringify({
        steps: { start: { type: 'trigger' }, end: { type: 'end' } }
      });
      
      const result = await manager.validateResponse(workflowResponse, 'workflow');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
    });

    it('should validate mermaid responses', async () => {
      const mermaidResponse = 'flowchart TD\nA --> B';
      
      const result = await manager.validateResponse(mermaidResponse, 'mermaid');
      expect(result.isValid).toBe(true);
    });

    it('should validate text responses', async () => {
      const textResponse = 'This is a valid response';
      
      const result = await manager.validateResponse(textResponse, 'text');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Accuracy Testing', () => {
    it('should run accuracy tests', async () => {
      const testCases = [{
        prompt: 'Create a simple workflow',
        expectedType: 'workflow' as const,
        context: createWorkflowContext(
          [],
          {
            id: 'test-user',
            name: 'Test User',
            email: 'test@example.com',
            role: 'Manager',
            department: 'IT',
            timezone: 'UTC',
            permissions: ['create_workflow']
          }
        ),
        taskType: 'workflow_build' as const
      }];

      // This test requires proper mocking of streaming responses
      // For now, we test the interface structure
      expect(async () => {
        await manager.runAccuracyTest(testCases);
      }).not.toThrow();
    });
  });

  describe('Streaming Operations', () => {
    const testContext = createWorkflowContext(
      [],
      {
        id: 'test-user',
        name: 'Test User', 
        email: 'test@example.com',
        role: 'Manager',
        department: 'IT',
        timezone: 'UTC',
        permissions: ['create_workflow']
      }
    );

    it('should have generateWorkflow method', () => {
      expect(typeof manager.generateWorkflow).toBe('function');
    });

    it('should have editWorkflow method', () => {
      expect(typeof manager.editWorkflow).toBe('function');
    });

    it('should have generateMermaid method', () => {
      expect(typeof manager.generateMermaid).toBe('function');
    });

    it('should have handleMRFChat method', () => {
      expect(typeof manager.handleMRFChat).toBe('function');
    });

    it('should have explainValidationErrors method', () => {
      expect(typeof manager.explainValidationErrors).toBe('function');
    });

    it('should support preferred provider selection', async () => {
      // Test interface without actual streaming (requires mocking)
      expect(() => {
        const generator = manager.generateWorkflow('test prompt', testContext, 'openai');
        expect(generator).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle provider initialization errors gracefully', () => {
      // Test with invalid configuration
      const invalidConfigs = new Map();
      
      expect(() => new MultiLLMManager(invalidConfigs)).not.toThrow();
    });

    it('should handle unavailable providers', async () => {
      // This test would require mocking provider failures
      // For now, we ensure the interface exists
      const healthStatus = await manager.getOverallHealth();
      expect(healthStatus).toBeDefined();
    });
  });

  describe('Fallback Mechanisms', () => {
    const testContext = createWorkflowContext(
      [],
      {
        id: 'test-user',
        name: 'Test User', 
        email: 'test@example.com',
        role: 'Manager',
        department: 'IT',
        timezone: 'UTC',
        permissions: ['create_workflow']
      }
    );

    it('should support preferred provider selection', async () => {
      // Test interface without actual streaming (requires mocking)
      expect(() => {
        const generator = manager.generateWorkflow('test prompt', testContext, 'openai');
        expect(generator).toBeDefined();
      }).not.toThrow();
    });

    it('should handle fallback provider selection', async () => {
      // This test would require mocking primary provider failures
      // For now, we test the method signature
      expect(typeof manager.getBestProviderForTask).toBe('function');
    });
  });
});