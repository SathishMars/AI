// src/test/app/utils/prompt-engineering/prompt-engine.test.ts
import { PromptEngineeringEngine } from '@/app/utils/prompt-engineering/prompt-engine';
import { PromptLibraryManager } from '@/app/utils/prompt-engineering/prompt-library';
import { PromptOptimizer } from '@/app/utils/prompt-engineering/prompt-optimizer';
import { createWorkflowContext } from '@/app/types/llm';
import { DEFAULT_WORKFLOW_GENERATION_TEMPLATE } from '@/app/types/prompt-engineering';

describe('PromptEngineeringEngine', () => {
  let promptEngine: PromptEngineeringEngine;

  beforeEach(() => {
    promptEngine = new PromptEngineeringEngine();
  });

  describe('Template Management', () => {
    it('should create a new prompt template', async () => {
      const template = await promptEngine.createTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: 'workflow_generation',
        complexity: 'simple',
        taskType: 'workflow_build',
        provider: 'openai',
        template: 'Create a workflow for {{task}}',
        variables: [
          {
            name: 'task',
            type: 'string',
            description: 'The task to create a workflow for',
            required: true
          }
        ],
        examples: [],
        metadata: {
          author: 'test-user',
          tags: ['test'],
          performance: {
            averageResponseTime: 1000,
            tokenUsage: { input: 100, output: 200, total: 300 },
            costPerRequest: 0.01,
            throughput: 60
          },
          usage: {
            totalInvocations: 0,
            successfulInvocations: 0,
            failedInvocations: 0,
            lastUsed: new Date(),
            popularityScore: 1.0
          },
          effectiveness: {
            accuracyScore: 0.85,
            qualityScore: 0.80,
            userSatisfactionScore: 0.75,
            consistencyScore: 0.82,
            overallEffectiveness: 0.805
          },
          lastTested: new Date()
        },
        version: '1.0.0',
        isActive: true
      });

      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.variables).toHaveLength(1);
    });

    it('should list templates with filters', async () => {
      const templates = await promptEngine.listTemplates({
        category: 'workflow_generation',
        taskType: 'workflow_build',
        isActive: true
      });

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      // Should include the default template
      const defaultTemplate = templates.find(t => t.id === DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id);
      expect(defaultTemplate).toBeDefined();
    });

    it('should get optimal template for task', async () => {
      const mockContext = createWorkflowContext(
        [],
        {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
          department: 'IT',
          permissions: ['workflow:create'],
          timezone: 'UTC'
        }
      );

      const template = await promptEngine.getOptimalTemplate(
        'workflow_build',
        mockContext,
        'openai'
      );

      expect(template).toBeDefined();
      expect(template.taskType).toBe('workflow_build');
    });
  });

  describe('Contextual Prompt Generation', () => {
    it('should generate contextual prompt with variable extraction', async () => {
      const mockContext = createWorkflowContext(
        [{ 
          id: 'msg-1', 
          sender: 'user' as const,
          content: 'Create a workflow for event approval', 
          timestamp: new Date(),
          status: 'complete' as const,
          type: 'text' as const
        }],
        {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'manager',
          department: 'Events',
          permissions: ['workflow:create'],
          timezone: 'UTC'
        },
        {
          id: 'mrf-1',
          title: 'Company Conference',
          attendees: 150,
          type: 'conference',
          requester: 'events-team',
          priority: 'high'
        }
      );

      const contextualPrompt = await promptEngine.generateContextualPrompt(
        DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id,
        mockContext,
        { 
          userRequest: 'Create a workflow for event approval',
          additionalContext: 'high priority event' 
        }
      );

      expect(contextualPrompt).toBeDefined();
      expect(contextualPrompt.finalPrompt).toContain('Create a workflow for event approval');
      expect(contextualPrompt.confidence).toBeGreaterThan(0);
      expect(contextualPrompt.reasoning).toBeDefined();
    });

    it('should adapt template based on user role', async () => {
      const adminContext = createWorkflowContext(
        [{
          id: 'admin-msg',
          sender: 'user' as const,
          content: 'Create a workflow with admin privileges',
          timestamp: new Date(),
          status: 'complete' as const,
          type: 'text' as const
        }],
        {
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          department: 'IT',
          permissions: ['workflow:create', 'system:admin'],
          timezone: 'UTC'
        }
      );

      const contextualPrompt = await promptEngine.generateContextualPrompt(
        DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id,
        adminContext
      );

      expect(contextualPrompt.finalPrompt).toContain('admin privileges');
    });
  });

  describe('Prompt Analytics', () => {
    it('should provide prompt analytics', async () => {
      const analytics = await promptEngine.getPromptAnalytics(
        DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id
      );

      expect(analytics).toBeDefined();
      expect(analytics.usage).toBeDefined();
      expect(analytics.performance).toBeDefined();
      expect(analytics.feedback).toBeDefined();
    });
  });
});

describe('PromptLibraryManager', () => {
  let libraryManager: PromptLibraryManager;

  beforeEach(() => {
    libraryManager = new PromptLibraryManager();
  });

  describe('Library Management', () => {
    it('should create a new library', async () => {
      const library = await libraryManager.createLibrary(
        'Test Library',
        'A library for testing',
        'test-org'
      );

      expect(library).toBeDefined();
      expect(library.name).toBe('Test Library');
      expect(library.organization).toBe('test-org');
      expect(library.categories).toHaveLength(4); // Default categories
    });

    it('should list libraries', async () => {
      const libraries = await libraryManager.listLibraries();
      
      expect(Array.isArray(libraries)).toBe(true);
      expect(libraries.length).toBeGreaterThan(0);
      
      // Should include default library
      const defaultLibrary = libraries.find(lib => lib.id === 'default-library');
      expect(defaultLibrary).toBeDefined();
    });

    it('should add template to library', async () => {
      const libraries = await libraryManager.listLibraries();
      const defaultLibrary = libraries[0];

      const success = await libraryManager.addTemplateToLibrary(
        defaultLibrary.id,
        DEFAULT_WORKFLOW_GENERATION_TEMPLATE
      );

      expect(success).toBe(true);
    });
  });

  describe('Search and Discovery', () => {
    it('should search templates', async () => {
      const searchResults = await libraryManager.searchTemplates('workflow');

      expect(searchResults.templates).toBeDefined();
      expect(searchResults.suggestions).toBeDefined();
      expect(searchResults.facets).toBeDefined();
      expect(searchResults.facets.categories).toContain('workflow_generation');
    });

    it('should provide recommendations', async () => {
      const recommendations = await libraryManager.getRecommendedTemplates(
        'user-1',
        {
          recentTaskTypes: ['workflow_build'],
          preferredProvider: 'openai',
          userRole: 'admin',
          department: 'IT'
        },
        3
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Analytics', () => {
    it('should provide library analytics', async () => {
      const analytics = await libraryManager.getLibraryAnalytics('default-library');

      expect(analytics.usage).toBeDefined();
      expect(analytics.performance).toBeDefined();
      expect(analytics.collaboration).toBeDefined();
      expect(analytics.usage.totalTemplateUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Import/Export', () => {
    it('should export library', async () => {
      const exportData = await libraryManager.exportLibrary('default-library');
      
      expect(typeof exportData).toBe('string');
      
      const parsed = JSON.parse(exportData);
      expect(parsed.id).toBe('default-library');
      expect(parsed.templates).toBeDefined();
    });

    it('should import library', async () => {
      const exportData = await libraryManager.exportLibrary('default-library');
      const importedLibrary = await libraryManager.importLibrary(exportData);
      
      expect(importedLibrary).toBeDefined();
      expect(importedLibrary.name).toBe('Default Prompt Library');
      expect(importedLibrary.id).not.toBe('default-library'); // Should get new ID
    });
  });
});

describe('PromptOptimizer', () => {
  let optimizer: PromptOptimizer;

  beforeEach(() => {
    optimizer = new PromptOptimizer();
  });

  describe('A/B Testing', () => {
    it('should create A/B test', async () => {
      const abTest = await optimizer.createABTest({
        name: 'Template Comparison',
        description: 'Compare two workflow generation templates',
        variants: [
          {
            name: 'Control',
            template: DEFAULT_WORKFLOW_GENERATION_TEMPLATE,
            trafficPercentage: 50
          },
          {
            name: 'Test',
            template: {
              ...DEFAULT_WORKFLOW_GENERATION_TEMPLATE,
              id: 'test-template',
              template: DEFAULT_WORKFLOW_GENERATION_TEMPLATE.template + '\\n\\nEnsure high quality output.'
            },
            trafficPercentage: 50
          }
        ],
        durationDays: 14,
        successMetric: 'accuracy',
        minimumSampleSize: 100
      });

      expect(abTest).toBeDefined();
      expect(abTest.variants).toHaveLength(2);
      expect(abTest.status).toBe('running');
    });

    it('should select variant for user', async () => {
      const abTest = await optimizer.createABTest({
        name: 'Test',
        description: 'Test',
        variants: [
          {
            name: 'A',
            template: DEFAULT_WORKFLOW_GENERATION_TEMPLATE,
            trafficPercentage: 50
          },
          {
            name: 'B',
            template: DEFAULT_WORKFLOW_GENERATION_TEMPLATE,
            trafficPercentage: 50
          }
        ],
        durationDays: 1,
        successMetric: 'accuracy',
        minimumSampleSize: 10
      });

      const selectedTemplate = await optimizer.selectVariantForUser(abTest.id, 'user-123');
      expect(selectedTemplate).toBeDefined();
      expect(selectedTemplate.id).toBe(DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id);
    });

    it('should record A/B test results', async () => {
      const abTest = await optimizer.createABTest({
        name: 'Test',
        description: 'Test',
        variants: [
          {
            name: 'A',
            template: DEFAULT_WORKFLOW_GENERATION_TEMPLATE,
            trafficPercentage: 100
          }
        ],
        durationDays: 1,
        successMetric: 'accuracy',
        minimumSampleSize: 10
      });

      // First select a variant to get an impression
      await optimizer.selectVariantForUser(abTest.id, 'user-123');

      await optimizer.recordABTestResult(abTest.id, abTest.variants[0].id, {
        success: true,
        responseTime: 1500,
        accuracy: 0.9,
        cost: 0.02,
        userSatisfaction: 4.5
      });

      // Test should update metrics
      expect(abTest.variants[0].metrics.conversions).toBe(1);
      expect(abTest.variants[0].metrics.conversionRate).toBe(1);
    });
  });

  describe('Prompt Testing', () => {
    it('should run prompt tests', async () => {
      const mockContext = createWorkflowContext(
        [],
        {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
          department: 'IT',
          permissions: ['workflow:create'],
          timezone: 'UTC'
        }
      );

      const testResults = await optimizer.runPromptTest(
        DEFAULT_WORKFLOW_GENERATION_TEMPLATE,
        [
          {
            name: 'Basic workflow creation',
            input: { 
              userRequest: 'Create a simple approval workflow',
              userContext: mockContext.userContext
            },
            expectedOutput: 'workflow with approval steps',
            context: mockContext
          }
        ],
        'openai'
      );

      expect(testResults).toHaveLength(1);
      expect(testResults[0].testId).toBeDefined();
      expect(testResults[0].passed).toBeDefined();
      expect(testResults[0].accuracy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Genetic Optimization', () => {
    it('should optimize prompt using genetic algorithm', async () => {
      const optimization = await optimizer.optimizePromptGenetic(
        DEFAULT_WORKFLOW_GENERATION_TEMPLATE,
        {
          targetAccuracy: 0.9,
          targetSpeed: 2000,
          maxIterations: 5,
          populationSize: 10
        }
      );

      expect(optimization).toBeDefined();
      expect(optimization.originalTemplate).toBe(DEFAULT_WORKFLOW_GENERATION_TEMPLATE);
      expect(optimization.optimizedTemplate).toBeDefined();
      expect(optimization.improvementMetrics).toBeDefined();
      expect(optimization.confidence).toBeGreaterThan(0);
    });
  });
});

describe('Integration Tests', () => {
  let promptEngine: PromptEngineeringEngine;
  let libraryManager: PromptLibraryManager;
  let optimizer: PromptOptimizer;

  beforeEach(() => {
    promptEngine = new PromptEngineeringEngine();
    libraryManager = new PromptLibraryManager();
    optimizer = new PromptOptimizer();
  });

  it('should provide end-to-end prompt engineering workflow', async () => {
    // 1. Create a custom template
    const customTemplate = await promptEngine.createTemplate({
      name: 'Custom Workflow Template',
      description: 'Specialized template for event workflows',
      category: 'workflow_generation',
      complexity: 'medium',
      taskType: 'workflow_build',
      provider: 'openai',
      template: 'Create an event workflow for {{eventType}} with {{attendees}} attendees. Consider {{requirements}}.',
      variables: [
        {
          name: 'eventType',
          type: 'string',
          description: 'Type of event',
          required: true
        },
        {
          name: 'attendees',
          type: 'number',
          description: 'Number of attendees',
          required: true
        },
        {
          name: 'requirements',
          type: 'string',
          description: 'Special requirements',
          required: false,
          defaultValue: 'standard requirements'
        }
      ],
      examples: [],
      metadata: {
        author: 'test-user',
        tags: ['events', 'custom'],
        performance: {
          averageResponseTime: 1200,
          tokenUsage: { input: 150, output: 250, total: 400 },
          costPerRequest: 0.015,
          throughput: 50
        },
        usage: {
          totalInvocations: 0,
          successfulInvocations: 0,
          failedInvocations: 0,
          lastUsed: new Date(),
          popularityScore: 1.0
        },
        effectiveness: {
          accuracyScore: 0.88,
          qualityScore: 0.85,
          userSatisfactionScore: 0.80,
          consistencyScore: 0.85,
          overallEffectiveness: 0.845
        },
        lastTested: new Date()
      },
      version: '1.0.0',
      isActive: true
    });

    // 2. Add to library
    const library = await libraryManager.createLibrary(
      'Event Templates',
      'Templates for event-related workflows',
      'events-team'
    );

    await libraryManager.addTemplateToLibrary(library.id, customTemplate);

    // 3. Test the template
    const mockContext = createWorkflowContext(
      [],
      {
        id: 'event-manager',
        name: 'Event Manager',
        email: 'em@example.com',
        role: 'manager',
        department: 'Events',
        permissions: ['workflow:create', 'events:manage'],
        timezone: 'UTC'
      }
    );

    const testResults = await optimizer.runPromptTest(
      customTemplate,
      [
        {
          name: 'Conference workflow',
          input: {
            eventType: 'conference',
            attendees: 200,
            requirements: 'AV equipment, catering, registration'
          },
          expectedOutput: 'conference workflow with AV and catering steps',
          context: mockContext
        }
      ],
      'openai'
    );

    // 4. Generate contextual prompt
    const contextualPrompt = await promptEngine.generateContextualPrompt(
      customTemplate.id,
      mockContext,
      {
        eventType: 'conference',
        attendees: 200,
        requirements: 'AV equipment, catering, registration'
      }
    );

    // 5. Get analytics
    const templateAnalytics = await promptEngine.getPromptAnalytics(customTemplate.id);
    const libraryAnalytics = await libraryManager.getLibraryAnalytics(library.id);

    // Verify the workflow
    expect(customTemplate).toBeDefined();
    expect(library.templates).toContain(customTemplate);
    expect(testResults).toHaveLength(1);
    expect(contextualPrompt.finalPrompt).toContain('conference');
    expect(contextualPrompt.finalPrompt).toContain('200');
    expect(templateAnalytics).toBeDefined();
    expect(libraryAnalytics).toBeDefined();
  });
});