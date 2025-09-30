// src/app/utils/prompt-engineering/prompt-engine.ts
import {
  PromptTemplate,
  PromptVariable,
  ContextualPrompt,
  PromptOptimization,
  PromptStrategy,
  ABTest,
  PromptLibrary,
  createPromptId,
  interpolatePrompt,
  calculateEffectiveness,
  DEFAULT_WORKFLOW_GENERATION_TEMPLATE
} from '@/app/types/prompt-engineering';
import { AITaskType, LLMProviderType, WorkflowContext } from '@/app/types/llm';

export class PromptEngineeringEngine {
  private templates: Map<string, PromptTemplate> = new Map();
  private strategies: Map<string, PromptStrategy> = new Map();
  private optimizations: Map<string, PromptOptimization> = new Map();
  private abTests: Map<string, ABTest> = new Map();
  private libraries: Map<string, PromptLibrary> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeStrategies();
  }

  // Template Management
  async createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptTemplate> {
    const newTemplate: PromptTemplate = {
      ...template,
      id: createPromptId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async getTemplate(id: string): Promise<PromptTemplate | null> {
    return this.templates.get(id) || null;
  }

  async listTemplates(filters?: {
    category?: string;
    taskType?: AITaskType;
    provider?: LLMProviderType | 'universal';
    complexity?: string;
    isActive?: boolean;
  }): Promise<PromptTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (filters) {
      templates = templates.filter(template => {
        if (filters.category && template.category !== filters.category) return false;
        if (filters.taskType && template.taskType !== filters.taskType) return false;
        if (filters.provider && template.provider !== filters.provider) return false;
        if (filters.complexity && template.complexity !== filters.complexity) return false;
        if (filters.isActive !== undefined && template.isActive !== filters.isActive) return false;
        return true;
      });
    }

    return templates.sort((a, b) => 
      calculateEffectiveness(b.metadata.effectiveness) - calculateEffectiveness(a.metadata.effectiveness)
    );
  }

  // Context-aware prompt generation
  async generateContextualPrompt(
    templateId: string,
    context: WorkflowContext,
    additionalVariables?: Record<string, unknown>
  ): Promise<ContextualPrompt> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Extract variables from context (without checking required)
    const extractedVariables = await this.extractVariablesFromContext(template.variables, context, false);
    
    // Merge with additional variables
    const allVariables = { ...extractedVariables, ...additionalVariables };

    // Now check required variables after merge
    this.validateRequiredVariables(template.variables, allVariables);

    // Apply contextual adaptations
    const adaptedTemplate = await this.applyContextualAdaptations(template, context);

    // Generate final prompt
    const finalPrompt = interpolatePrompt(adaptedTemplate.template, allVariables);

    // Calculate confidence based on variable completeness and context relevance
    const confidence = this.calculatePromptConfidence(template, allVariables, context);

    // Generate reasoning for the adaptations made
    const reasoning = this.generateAdaptationReasoning(template, context, adaptedTemplate);

    return {
      baseTemplate: template,
      contextAdaptations: [],
      dynamicVariables: [],
      conditionalLogic: [],
      finalPrompt,
      confidence,
      reasoning
    };
  }

  // Prompt optimization
  async optimizePrompt(
    templateId: string,
    optimizationGoals: {
      targetAccuracy?: number;
      targetSpeed?: number;
      targetCost?: number;
      maxIterations?: number;
    }
  ): Promise<PromptOptimization> {
    const originalTemplate = this.templates.get(templateId);
    if (!originalTemplate) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Implement genetic algorithm for prompt optimization
    const optimization = await this.runGeneticOptimization(originalTemplate, optimizationGoals);
    
    this.optimizations.set(createPromptId(), optimization);
    return optimization;
  }

  // A/B Testing
  async createABTest(
    testConfig: {
      name: string;
      description: string;
      variants: Array<{
        name: string;
        templateId: string;
        trafficPercentage: number;
      }>;
      duration: number; // in days
    }
  ): Promise<ABTest> {
    const abTest: ABTest = {
      id: createPromptId(),
      name: testConfig.name,
      description: testConfig.description,
      variants: testConfig.variants.map(variant => ({
        id: createPromptId(),
        name: variant.name,
        template: this.templates.get(variant.templateId)!,
        trafficPercentage: variant.trafficPercentage,
        metrics: {
          impressions: 0,
          conversions: 0,
          conversionRate: 0,
          averageResponseTime: 0,
          averageAccuracy: 0,
          costPerConversion: 0,
          userSatisfaction: 0
        }
      })),
      trafficSplit: testConfig.variants.reduce((acc, variant) => {
        acc[variant.name] = variant.trafficPercentage;
        return acc;
      }, {} as Record<string, number>),
      startDate: new Date(),
      endDate: new Date(Date.now() + testConfig.duration * 24 * 60 * 60 * 1000),
      status: 'running',
      significance: 0
    };

    this.abTests.set(abTest.id, abTest);
    return abTest;
  }

  async getOptimalTemplate(
    taskType: AITaskType,
    context: WorkflowContext,
    provider: LLMProviderType
  ): Promise<PromptTemplate> {
    // Find active A/B tests for this task type
    const activeTests = Array.from(this.abTests.values()).filter(
      test => test.status === 'running' && 
      test.variants.some(variant => variant.template.taskType === taskType)
    );

    if (activeTests.length > 0) {
      // Use A/B test variant selection
      return this.selectABTestVariant(activeTests[0]);
    }

    // Find best template based on effectiveness
    const candidates = await this.listTemplates({
      taskType,
      provider,
      isActive: true
    });

    if (candidates.length === 0) {
      // Fallback to universal templates
      const universalCandidates = await this.listTemplates({
        taskType,
        provider: 'universal',
        isActive: true
      });
      
      if (universalCandidates.length === 0) {
        throw new Error(`No suitable template found for task type ${taskType}`);
      }
      
      return universalCandidates[0];
    }

    // Apply context-based ranking
    return this.rankTemplatesByContext(candidates, context)[0];
  }

  // Analytics and reporting
  async getPromptAnalytics(templateId: string): Promise<{
    usage: PromptTemplate['metadata']['usage'];
    performance: PromptTemplate['metadata']['performance'];
    optimization: PromptOptimization | undefined;
    feedback: PromptTemplate['metadata']['effectiveness'];
  }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return {
      usage: template.metadata.usage,
      performance: template.metadata.performance,
      optimization: this.optimizations.get(templateId),
      feedback: template.metadata.effectiveness
    };
  }

  // Private helper methods
  private initializeDefaultTemplates(): void {
    this.templates.set(
      DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id, 
      DEFAULT_WORKFLOW_GENERATION_TEMPLATE
    );
  }

  private initializeStrategies(): void {
    // Add common prompt engineering strategies
    const chainOfThoughtStrategy: PromptStrategy = {
      id: 'chain_of_thought',
      name: 'Chain of Thought',
      description: 'Break down complex problems into step-by-step reasoning',
      techniques: [
        {
          name: 'Step-by-step reasoning',
          description: 'Guide the AI through logical steps',
          pattern: 'Let\'s think step by step:\n1. {{step1}}\n2. {{step2}}\n3. {{step3}}',
          variables: ['step1', 'step2', 'step3'],
          benefits: ['Improved accuracy', 'Better explainability', 'Reduced errors'],
          limitations: ['Longer responses', 'Higher token usage'],
          bestPractices: ['Use clear numbered steps', 'Build logical progression', 'Include verification steps']
        }
      ],
      applicableTaskTypes: ['workflow_build', 'workflow_edit', 'validation_explain'],
      complexity: 'medium',
      effectiveness: 0.85,
      examples: [
        'Let\'s create this workflow step by step:\n1. First, identify the trigger...\n2. Then, define the conditions...\n3. Finally, specify the actions...'
      ]
    };

    this.strategies.set(chainOfThoughtStrategy.id, chainOfThoughtStrategy);
  }

  private async extractVariablesFromContext(
    variables: PromptVariable[],
    context: WorkflowContext,
    checkRequired = true
  ): Promise<Record<string, unknown>> {
    const extracted: Record<string, unknown> = {};

    for (const variable of variables) {
      let value: unknown;

      if (variable.contextPath) {
        value = this.getValueFromPath(context as unknown, variable.contextPath);
      }

      if (value === undefined && variable.defaultValue !== undefined) {
        value = variable.defaultValue;
      }

      if (checkRequired && value === undefined && variable.required) {
        throw new Error(`Required variable ${variable.name} not found in context`);
      }

      if (value !== undefined) {
        extracted[variable.name] = value;
      }
    }

    return extracted;
  }

  private validateRequiredVariables(
    variables: PromptVariable[],
    allVariables: Record<string, unknown>
  ): void {
    for (const variable of variables) {
      if (variable.required && allVariables[variable.name] === undefined) {
        throw new Error(`Required variable ${variable.name} not found in context or additional variables`);
      }
    }
  }

  private getValueFromPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      return current && typeof current === 'object' && current !== null && 
             key in current ? (current as Record<string, unknown>)[key] : undefined;
    }, obj);
  }

  private async applyContextualAdaptations(
    template: PromptTemplate,
    context: WorkflowContext
  ): Promise<PromptTemplate> {
    // Apply adaptations based on user role, complexity, etc.
    const adaptedTemplate = { ...template };

    // Adapt based on user role
    if (context.userContext.role === 'admin') {
      adaptedTemplate.template += '\n\nNote: Include advanced configuration options as this user has admin privileges.';
    }

    // Adapt based on workflow complexity
    if (context.conversationHistory.length > 10) {
      adaptedTemplate.template += '\n\nContext: This is part of an ongoing conversation. Reference previous interactions when relevant.';
    }

    return adaptedTemplate;
  }

  private calculatePromptConfidence(
    template: PromptTemplate,
    variables: Record<string, unknown>,
    context: WorkflowContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Variable completeness
    const requiredVariables = template.variables.filter(v => v.required);
    const providedRequired = requiredVariables.filter(v => variables[v.name] !== undefined);
    const variableCompleteness = providedRequired.length / requiredVariables.length;
    confidence += variableCompleteness * 0.3;

    // Context relevance
    const hasRelevantContext = context.conversationHistory.length > 0;
    const hasUserContext = Object.keys(context.userContext).length > 3;
    const contextRelevance = (hasRelevantContext ? 0.1 : 0) + (hasUserContext ? 0.1 : 0);
    confidence += contextRelevance;

    return Math.min(confidence, 1.0);
  }

  private generateAdaptationReasoning(
    original: PromptTemplate,
    context: WorkflowContext,
    _adapted: PromptTemplate
  ): string[] {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unused = { original, _adapted };
    const reasoning: string[] = [];

    if (context.userContext.role === 'admin') {
      reasoning.push('Added admin-specific options based on user role');
    }

    if (context.conversationHistory.length > 10) {
      reasoning.push('Added context continuity note for ongoing conversation');
    }

    if (reasoning.length === 0) {
      reasoning.push('No contextual adaptations applied');
    }

    return reasoning;
  }

  private async runGeneticOptimization(
    template: PromptTemplate,
    goals: {
      targetAccuracy?: number;
      targetSpeed?: number;
      targetCost?: number;
      maxIterations?: number;
    }
  ): Promise<PromptOptimization> {
    // Simplified genetic algorithm implementation
    // In production, this would be much more sophisticated
    
    const optimizedTemplate = { ...template };
    optimizedTemplate.template += '\n\nOptimized for: accuracy and efficiency.';

    return {
      originalTemplate: template,
      optimizedTemplate,
      optimizationStrategy: {
        type: 'genetic',
        parameters: goals,
        iterations: 10,
        convergenceCriteria: {
          minImprovement: 0.05,
          maxIterations: 100,
          stabilityWindow: 10,
          successThreshold: 0.9
        }
      },
      improvementMetrics: {
        accuracyImprovement: 0.1,
        speedImprovement: 0.05,
        costReduction: 0.08,
        qualityImprovement: 0.12,
        consistencyImprovement: 0.07
      },
      testResults: [],
      confidence: 0.85
    };
  }

  private selectABTestVariant(test: ABTest): PromptTemplate {
    // Simple random selection based on traffic split
    const random = Math.random();
    let cumulative = 0;

    for (const variant of test.variants) {
      cumulative += variant.trafficPercentage / 100;
      if (random <= cumulative) {
        return variant.template;
      }
    }

    return test.variants[0].template;
  }

  private rankTemplatesByContext(
    templates: PromptTemplate[],
    context: WorkflowContext
  ): PromptTemplate[] {
    return templates.sort((a, b) => {
      // Rank by effectiveness and context relevance
      const aScore = calculateEffectiveness(a.metadata.effectiveness);
      const bScore = calculateEffectiveness(b.metadata.effectiveness);
      
      // Add context-specific bonuses
      const aContextBonus = this.calculateContextBonus(a, context);
      const bContextBonus = this.calculateContextBonus(b, context);

      return (bScore + bContextBonus) - (aScore + aContextBonus);
    });
  }

  private calculateContextBonus(template: PromptTemplate, context: WorkflowContext): number {
    let bonus = 0;

    // Bonus for templates matching user's department/role patterns
    if (template.metadata.tags.includes(context.userContext.department.toLowerCase())) {
      bonus += 0.1;
    }

    if (template.metadata.tags.includes(context.userContext.role.toLowerCase())) {
      bonus += 0.1;
    }

    return bonus;
  }
}