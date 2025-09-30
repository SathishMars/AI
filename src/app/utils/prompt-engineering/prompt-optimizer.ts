// src/app/utils/prompt-engineering/prompt-optimizer.ts
import {
  PromptTemplate,
  PromptOptimization,
  OptimizationStrategy,
  OptimizationTestResult,
  TestResult,
  ABTest,
  ABVariant,
  ABTestResults,
  createPromptId
} from '@/app/types/prompt-engineering';
import { LLMProviderType, WorkflowContext } from '@/app/types/llm';

export class PromptOptimizer {
  private optimizations: Map<string, PromptOptimization> = new Map();
  private abTests: Map<string, ABTest> = new Map();
  private testResults: Map<string, TestResult[]> = new Map();

  // A/B Testing
  async createABTest(config: {
    name: string;
    description: string;
    variants: Array<{
      name: string;
      template: PromptTemplate;
      trafficPercentage: number;
    }>;
    durationDays: number;
    successMetric: 'accuracy' | 'speed' | 'cost' | 'satisfaction';
    minimumSampleSize: number;
  }): Promise<ABTest> {
    // Validate traffic percentages sum to 100
    const totalTraffic = config.variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Traffic percentages must sum to 100%');
    }

    const abTest: ABTest = {
      id: createPromptId(),
      name: config.name,
      description: config.description,
      variants: config.variants.map(variant => ({
        id: createPromptId(),
        name: variant.name,
        template: variant.template,
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
      trafficSplit: config.variants.reduce((acc, variant) => {
        acc[variant.name] = variant.trafficPercentage;
        return acc;
      }, {} as Record<string, number>),
      startDate: new Date(),
      endDate: new Date(Date.now() + config.durationDays * 24 * 60 * 60 * 1000),
      status: 'running',
      significance: 0
    };

    this.abTests.set(abTest.id, abTest);
    return abTest;
  }

  async selectVariantForUser(testId: string, userId: string): Promise<PromptTemplate> {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') {
      throw new Error('Test not found or not running');
    }

    // Use deterministic selection based on user ID for consistency
    const hash = this.hashUserId(userId);
    const selector = hash % 100;

    let cumulative = 0;
    for (const variant of test.variants) {
      cumulative += variant.trafficPercentage;
      if (selector < cumulative) {
        // Record impression
        variant.metrics.impressions++;
        return variant.template;
      }
    }

    // Fallback to first variant
    return test.variants[0].template;
  }

  async recordABTestResult(
    testId: string,
    variantId: string,
    result: {
      success: boolean;
      responseTime: number;
      accuracy: number;
      cost: number;
      userSatisfaction?: number;
    }
  ): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) {
      throw new Error('Variant not found');
    }

    // Update variant metrics
    if (result.success) {
      variant.metrics.conversions++;
    }
    
    variant.metrics.conversionRate = variant.metrics.conversions / variant.metrics.impressions;
    variant.metrics.averageResponseTime = this.updateAverage(
      variant.metrics.averageResponseTime,
      result.responseTime,
      variant.metrics.impressions
    );
    variant.metrics.averageAccuracy = this.updateAverage(
      variant.metrics.averageAccuracy,
      result.accuracy,
      variant.metrics.impressions
    );
    variant.metrics.costPerConversion = variant.metrics.conversions > 0 
      ? (variant.metrics.costPerConversion * (variant.metrics.conversions - 1) + result.cost) / variant.metrics.conversions
      : result.cost;
    
    if (result.userSatisfaction !== undefined) {
      variant.metrics.userSatisfaction = this.updateAverage(
        variant.metrics.userSatisfaction,
        result.userSatisfaction,
        variant.metrics.impressions
      );
    }

    // Check if test should be concluded
    await this.checkTestCompletion(testId);
  }

  async analyzeABTestResults(testId: string): Promise<ABTestResults> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    // Calculate statistical significance
    const controlVariant = test.variants[0];
    const testVariants = test.variants.slice(1);

    let winner = controlVariant.id;
    let maxImprovement = 0;
    let confidence = 0;

    for (const variant of testVariants) {
      const improvement = this.calculateImprovement(controlVariant, variant, 'accuracy');
      const significance = this.calculateStatisticalSignificance(controlVariant, variant);
      
      if (improvement > maxImprovement && significance > 0.95) {
        winner = variant.id;
        maxImprovement = improvement;
        confidence = significance;
      }
    }

    const winnerVariant = test.variants.find(v => v.id === winner)!;
    
    const results: ABTestResults = {
      winner: winnerVariant.name,
      confidence,
      statisticalSignificance: confidence,
      effectSize: maxImprovement,
      recommendations: this.generateABTestRecommendations(test, winnerVariant),
      detailedMetrics: test.variants.reduce((acc, variant) => {
        acc[variant.name] = variant.metrics;
        return acc;
      }, {} as Record<string, ABVariant['metrics']>)
    };

    test.results = results;
    test.winningVariant = winner;
    
    return results;
  }

  // Genetic Algorithm Optimization
  async optimizePromptGenetic(
    baseTemplate: PromptTemplate,
    objectives: {
      targetAccuracy?: number;
      targetSpeed?: number;
      targetCost?: number;
      maxIterations?: number;
      populationSize?: number;
    }
  ): Promise<PromptOptimization> {
    const strategy: OptimizationStrategy = {
      type: 'genetic',
      parameters: objectives,
      iterations: objectives.maxIterations || 50,
      convergenceCriteria: {
        minImprovement: 0.01,
        maxIterations: objectives.maxIterations || 50,
        stabilityWindow: 5,
        successThreshold: objectives.targetAccuracy || 0.9
      }
    };

    // Initialize population
    let population = this.initializePopulation(baseTemplate, objectives.populationSize || 20);
    let bestTemplate = baseTemplate;
    let bestFitness = 0;
    let generationsSinceImprovement = 0;

    const testResults: OptimizationTestResult[] = [];

    for (let generation = 0; generation < strategy.iterations; generation++) {
      // Evaluate fitness for each individual
      const fitnessScores = await Promise.all(
        population.map(template => this.evaluateTemplateFitness(template, objectives))
      );

      // Find best in generation
      const bestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
      const generationBest = population[bestIndex];
      const generationBestFitness = fitnessScores[bestIndex];

      // Track improvements
      if (generationBestFitness > bestFitness) {
        bestFitness = generationBestFitness;
        bestTemplate = generationBest;
        generationsSinceImprovement = 0;
      } else {
        generationsSinceImprovement++;
      }

      testResults.push({
        iteration: generation,
        template: generationBest.template,
        performance: generationBest.metadata.performance,
        effectiveness: generationBest.metadata.effectiveness,
        testCases: [],
        improvement: generationBestFitness
      });

      // Check convergence
      if (generationsSinceImprovement >= strategy.convergenceCriteria.stabilityWindow ||
          generationBestFitness >= strategy.convergenceCriteria.successThreshold) {
        break;
      }

      // Create next generation
      population = this.createNextGeneration(population, fitnessScores);
    }

    const optimization: PromptOptimization = {
      originalTemplate: baseTemplate,
      optimizedTemplate: bestTemplate,
      optimizationStrategy: strategy,
      improvementMetrics: {
        accuracyImprovement: bestTemplate.metadata.effectiveness.accuracyScore - 
                           baseTemplate.metadata.effectiveness.accuracyScore,
        speedImprovement: (baseTemplate.metadata.performance.averageResponseTime - 
                          bestTemplate.metadata.performance.averageResponseTime) / 
                         baseTemplate.metadata.performance.averageResponseTime,
        costReduction: (baseTemplate.metadata.performance.costPerRequest - 
                       bestTemplate.metadata.performance.costPerRequest) / 
                      baseTemplate.metadata.performance.costPerRequest,
        qualityImprovement: bestTemplate.metadata.effectiveness.qualityScore - 
                           baseTemplate.metadata.effectiveness.qualityScore,
        consistencyImprovement: bestTemplate.metadata.effectiveness.consistencyScore - 
                               baseTemplate.metadata.effectiveness.consistencyScore
      },
      testResults,
      confidence: bestFitness
    };

    this.optimizations.set(createPromptId(), optimization);
    return optimization;
  }

  // Prompt Testing
  async runPromptTest(
    template: PromptTemplate,
    testCases: Array<{
      name: string;
      input: Record<string, unknown>;
      expectedOutput: string;
      context: WorkflowContext;
    }>,
    provider: LLMProviderType
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      const testId = createPromptId();
      const startTime = Date.now();

      try {
        // In a real implementation, this would call the actual LLM
        const actualOutput = await this.simulatePromptExecution(template, testCase.input, provider);
        
        const responseTime = Date.now() - startTime;
        const accuracy = this.calculateAccuracy(testCase.expectedOutput, actualOutput);
        const passed = accuracy >= 0.8; // 80% threshold for passing

        const result: TestResult = {
          testId,
          timestamp: new Date(),
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput,
          passed,
          accuracy,
          responseTime,
          tokenUsage: this.estimateTokenUsage(template.template + JSON.stringify(testCase.input)),
          feedback: passed ? 'Test passed' : 'Output did not meet accuracy threshold'
        };

        results.push(result);
      } catch (error) {
        const result: TestResult = {
          testId,
          timestamp: new Date(),
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          accuracy: 0,
          responseTime: Date.now() - startTime,
          tokenUsage: 0,
          feedback: `Test failed with error: ${String(error)}`
        };

        results.push(result);
      }
    }

    // Store results
    this.testResults.set(template.id, results);
    
    // Update template metrics
    this.updateTemplateMetricsFromTests(template, results);

    return results;
  }

  // Private helper methods
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  private async checkTestCompletion(testId: string): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) return;

    // Check if test duration has passed
    if (test.endDate && new Date() > test.endDate) {
      test.status = 'completed';
      await this.analyzeABTestResults(testId);
    }

    // Check if we have sufficient sample size
    const totalImpressions = test.variants.reduce((sum, v) => sum + v.metrics.impressions, 0);
    if (totalImpressions >= 1000) { // Minimum sample size threshold
      const results = await this.analyzeABTestResults(testId);
      if (results.confidence > 0.95) {
        test.status = 'completed';
      }
    }
  }

  private calculateImprovement(control: ABVariant, test: ABVariant, metric: string): number {
    switch (metric) {
      case 'accuracy':
        return (test.metrics.averageAccuracy - control.metrics.averageAccuracy) / control.metrics.averageAccuracy;
      case 'speed':
        return (control.metrics.averageResponseTime - test.metrics.averageResponseTime) / control.metrics.averageResponseTime;
      case 'cost':
        return (control.metrics.costPerConversion - test.metrics.costPerConversion) / control.metrics.costPerConversion;
      default:
        return 0;
    }
  }

  private calculateStatisticalSignificance(control: ABVariant, test: ABVariant): number {
    // Simplified statistical significance calculation
    // In production, would use proper statistical tests (t-test, chi-square, etc.)
    const controlRate = control.metrics.conversionRate;
    const testRate = test.metrics.conversionRate;
    const controlSize = control.metrics.impressions;
    const testSize = test.metrics.impressions;

    if (controlSize < 30 || testSize < 30) return 0; // Insufficient sample size

    // Mock confidence calculation
    const pooledRate = (control.metrics.conversions + test.metrics.conversions) / (controlSize + testSize);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlSize + 1/testSize));
    const zScore = Math.abs(testRate - controlRate) / standardError;
    
    // Convert z-score to confidence (simplified)
    return Math.min(0.99, Math.max(0.5, (zScore - 1.96) / 4 + 0.95));
  }

  private generateABTestRecommendations(test: ABTest, winner: ABVariant): string[] {
    const recommendations: string[] = [];
    
    recommendations.push(`Winner: ${winner.name} with ${(winner.metrics.conversionRate * 100).toFixed(1)}% conversion rate`);
    
    if (winner.metrics.averageAccuracy > 0.9) {
      recommendations.push('High accuracy achieved - consider making this the default template');
    }
    
    if (winner.metrics.averageResponseTime < 2000) {
      recommendations.push('Excellent response time - template is well optimized');
    }
    
    if (winner.metrics.userSatisfaction > 4.0) {
      recommendations.push('High user satisfaction - template provides good user experience');
    }

    recommendations.push('Run follow-up tests to validate results with larger sample size');
    
    return recommendations;
  }

  private initializePopulation(baseTemplate: PromptTemplate, size: number): PromptTemplate[] {
    const population: PromptTemplate[] = [baseTemplate];
    
    // Create variations of the base template
    for (let i = 1; i < size; i++) {
      const variation = this.createTemplateVariation(baseTemplate);
      population.push(variation);
    }
    
    return population;
  }

  private createTemplateVariation(template: PromptTemplate): PromptTemplate {
    const variations = [
      template.template + '\n\nPlease provide a detailed explanation.',
      template.template + '\n\nEnsure the output is accurate and well-structured.',
      template.template.replace('Create', 'Generate'),
      template.template.replace('workflow', 'business process'),
      template.template + '\n\nConsider edge cases and error handling.'
    ];
    
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    
    return {
      ...template,
      id: createPromptId(),
      template: randomVariation,
      version: `${template.version}-var-${Date.now()}`
    };
  }

  private async evaluateTemplateFitness(
    template: PromptTemplate, 
    _objectives: {
      targetAccuracy?: number;
      targetSpeed?: number;
      targetCost?: number;
      maxIterations?: number;
      populationSize?: number;
    }
  ): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unused = _objectives;
    // Simplified fitness evaluation
    // In production, would run actual tests
    let fitness = 0;
    
    fitness += template.metadata.effectiveness.accuracyScore * 0.4;
    fitness += template.metadata.effectiveness.qualityScore * 0.3;
    fitness += template.metadata.effectiveness.consistencyScore * 0.2;
    fitness += (1 - template.metadata.performance.averageResponseTime / 5000) * 0.1; // Normalize response time
    
    return fitness;
  }

  private createNextGeneration(population: PromptTemplate[], fitnessScores: number[]): PromptTemplate[] {
    const nextGeneration: PromptTemplate[] = [];
    const sortedIndices = fitnessScores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index);
    
    // Keep top performers (elitism)
    const eliteCount = Math.floor(population.length * 0.2);
    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push(population[sortedIndices[i]]);
    }
    
    // Generate offspring through crossover and mutation
    while (nextGeneration.length < population.length) {
      const parent1 = this.selectParent(population, fitnessScores);
      const parent2 = this.selectParent(population, fitnessScores);
      const offspring = this.crossover(parent1, parent2);
      const mutated = this.mutate(offspring);
      nextGeneration.push(mutated);
    }
    
    return nextGeneration;
  }

  private selectParent(population: PromptTemplate[], fitnessScores: number[]): PromptTemplate {
    // Tournament selection
    const tournamentSize = 3;
    let bestIndex = Math.floor(Math.random() * population.length);
    let bestFitness = fitnessScores[bestIndex];
    
    for (let i = 1; i < tournamentSize; i++) {
      const candidateIndex = Math.floor(Math.random() * population.length);
      if (fitnessScores[candidateIndex] > bestFitness) {
        bestIndex = candidateIndex;
        bestFitness = fitnessScores[candidateIndex];
      }
    }
    
    return population[bestIndex];
  }

  private crossover(parent1: PromptTemplate, parent2: PromptTemplate): PromptTemplate {
    // Simple template crossover - combine parts of both templates
    const template1Parts = parent1.template.split('\n');
    const template2Parts = parent2.template.split('\n');
    
    const crossoverPoint = Math.floor(Math.random() * Math.min(template1Parts.length, template2Parts.length));
    const newTemplate = [
      ...template1Parts.slice(0, crossoverPoint),
      ...template2Parts.slice(crossoverPoint)
    ].join('\n');
    
    return {
      ...parent1,
      id: createPromptId(),
      template: newTemplate,
      version: `${parent1.version}-cross-${Date.now()}`
    };
  }

  private mutate(template: PromptTemplate): PromptTemplate {
    const mutations = [
      'Add more specific instructions',
      'Include examples',
      'Emphasize accuracy requirements',
      'Add error handling guidance',
      'Specify output format requirements'
    ];
    
    if (Math.random() < 0.1) { // 10% mutation rate
      const mutation = mutations[Math.floor(Math.random() * mutations.length)];
      return {
        ...template,
        template: template.template + `\n\n${mutation}.`,
        version: `${template.version}-mut-${Date.now()}`
      };
    }
    
    return template;
  }

  private async simulatePromptExecution(
    template: PromptTemplate,
    input: Record<string, unknown>,
    provider: LLMProviderType
  ): Promise<string> {
    // Simulate LLM execution with mock response
    // In production, this would call the actual LLM
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    return `Mock response for ${template.name} using ${provider} with input: ${JSON.stringify(input)}`;
  }

  private calculateAccuracy(expected: string, actual: string): number {
    // Simple string similarity calculation
    // In production, would use more sophisticated metrics
    const expectedWords = expected.toLowerCase().split(/\s+/);
    const actualWords = actual.toLowerCase().split(/\s+/);
    
    const intersection = expectedWords.filter(word => actualWords.includes(word));
    const union = [...new Set([...expectedWords, ...actualWords])];
    
    return intersection.length / union.length;
  }

  private estimateTokenUsage(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private updateTemplateMetricsFromTests(template: PromptTemplate, results: TestResult[]): void {
    const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    template.metadata.effectiveness.accuracyScore = avgAccuracy;
    template.metadata.performance.averageResponseTime = avgResponseTime;
    template.metadata.usage.successfulInvocations = results.filter(r => r.passed).length;
    template.metadata.usage.totalInvocations = results.length;
    template.metadata.lastTested = new Date();
    template.metadata.testResults = results;
  }
}