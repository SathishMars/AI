// src/app/utils/prompt-engineering/prompt-library.ts
import {
  PromptTemplate,
  PromptLibrary,
  PromptStrategy,
  LibraryCategory,
  PromptCategory,
  PromptComplexity,
  createPromptId,
  DEFAULT_WORKFLOW_GENERATION_TEMPLATE
} from '@/app/types/prompt-engineering';
import { AITaskType, LLMProviderType } from '@/app/types/llm';

export class PromptLibraryManager {
  private libraries: Map<string, PromptLibrary> = new Map();
  private templates: Map<string, PromptTemplate> = new Map();
  private strategies: Map<string, PromptStrategy> = new Map();

  constructor() {
    this.initializeDefaultLibrary();
  }

  // Library Management
  async createLibrary(
    name: string,
    description: string,
    organization: string
  ): Promise<PromptLibrary> {
    const library: PromptLibrary = {
      id: createPromptId(),
      name,
      description,
      organization,
      templates: [],
      strategies: [],
      categories: this.getDefaultCategories(),
      permissions: {
        readers: [],
        writers: [],
        admins: [organization],
        public: false,
        shareLevel: 'organization'
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date(),
        totalTemplates: 0,
        mostUsedTemplates: [],
        trending: [],
        featured: [],
        stats: {
          totalUsage: 0,
          averageRating: 0,
          totalContributors: 1,
          growthRate: 0,
          popularCategories: []
        }
      }
    };

    this.libraries.set(library.id, library);
    return library;
  }

  async getLibrary(id: string): Promise<PromptLibrary | null> {
    return this.libraries.get(id) || null;
  }

  async listLibraries(organizationFilter?: string): Promise<PromptLibrary[]> {
    const libraries = Array.from(this.libraries.values());
    
    if (organizationFilter) {
      return libraries.filter(lib => 
        lib.organization === organizationFilter || 
        lib.permissions.public
      );
    }
    
    return libraries;
  }

  // Template Management
  async addTemplateToLibrary(
    libraryId: string,
    template: PromptTemplate
  ): Promise<boolean> {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error(`Library ${libraryId} not found`);
    }

    library.templates.push(template);
    library.metadata.totalTemplates = library.templates.length;
    library.metadata.lastUpdated = new Date();

    this.templates.set(template.id, template);
    this.libraries.set(libraryId, library);

    return true;
  }

  async getTemplatesFromLibrary(
    libraryId: string,
    filters?: {
      category?: PromptCategory;
      complexity?: PromptComplexity;
      taskType?: AITaskType;
      provider?: LLMProviderType | 'universal';
      tags?: string[];
    }
  ): Promise<PromptTemplate[]> {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error(`Library ${libraryId} not found`);
    }

    let templates = library.templates;

    if (filters) {
      templates = templates.filter(template => {
        if (filters.category && template.category !== filters.category) return false;
        if (filters.complexity && template.complexity !== filters.complexity) return false;
        if (filters.taskType && template.taskType !== filters.taskType) return false;
        if (filters.provider && template.provider !== filters.provider) return false;
        if (filters.tags && !filters.tags.every(tag => 
          template.metadata.tags.includes(tag)
        )) return false;
        return true;
      });
    }

    return templates.sort((a, b) => 
      b.metadata.usage.popularityScore - a.metadata.usage.popularityScore
    );
  }

  // Search and Discovery
  async searchTemplates(
    query: string,
    libraryIds?: string[]
  ): Promise<{
    templates: PromptTemplate[];
    suggestions: string[];
    facets: {
      categories: string[];
      complexities: string[];
      providers: string[];
      tags: string[];
    };
  }> {
    const searchLibraries = libraryIds 
      ? libraryIds.map(id => this.libraries.get(id)).filter(Boolean) as PromptLibrary[]
      : Array.from(this.libraries.values());

    const allTemplates = searchLibraries.flatMap(lib => lib.templates);
    
    // Simple text search - in production would use proper search engine
    const queryLower = query.toLowerCase();
    const matchingTemplates = allTemplates.filter(template => 
      template.name.toLowerCase().includes(queryLower) ||
      template.description.toLowerCase().includes(queryLower) ||
      template.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );

    // Generate facets
    const categories = [...new Set(allTemplates.map(t => t.category))];
    const complexities = [...new Set(allTemplates.map(t => t.complexity))];
    const providers = [...new Set(allTemplates.map(t => t.provider))];
    const tags = [...new Set(allTemplates.flatMap(t => t.metadata.tags))];

    // Generate suggestions
    const suggestions = this.generateSearchSuggestions(query, allTemplates);

    return {
      templates: matchingTemplates,
      suggestions,
      facets: {
        categories,
        complexities,
        providers,
        tags
      }
    };
  }

  // Template Recommendation
  async getRecommendedTemplates(
    userId: string,
    context: {
      recentTaskTypes: AITaskType[];
      preferredProvider: LLMProviderType;
      userRole: string;
      department: string;
    },
    limit: number = 5
  ): Promise<PromptTemplate[]> {
    const allTemplates = Array.from(this.templates.values());
    
    // Score templates based on context
    const scoredTemplates = allTemplates.map(template => ({
      template,
      score: this.calculateRecommendationScore(template, context)
    }));

    // Sort by score and return top recommendations
    return scoredTemplates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.template);
  }

  // Analytics and Insights
  async getLibraryAnalytics(libraryId: string): Promise<{
    usage: {
      totalTemplateUsage: number;
      mostUsedTemplates: Array<{ template: PromptTemplate; usage: number }>;
      usageByCategory: Record<string, number>;
      usageByComplexity: Record<string, number>;
      usageTrends: Array<{ date: Date; usage: number }>;
    };
    performance: {
      averageEffectiveness: number;
      topPerformingTemplates: PromptTemplate[];
      performanceByCategory: Record<string, number>;
      improvementOpportunities: string[];
    };
    collaboration: {
      totalContributors: number;
      recentContributions: Array<{ author: string; template: PromptTemplate; date: Date }>;
      communityRating: number;
      feedback: Array<{ rating: number; comment: string; template: string }>;
    };
  }> {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error(`Library ${libraryId} not found`);
    }

    // Calculate usage metrics
    const totalTemplateUsage = library.templates.reduce(
      (sum, template) => sum + template.metadata.usage.totalInvocations, 0
    );

    const mostUsedTemplates = library.templates
      .map(template => ({ 
        template, 
        usage: template.metadata.usage.totalInvocations 
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    const usageByCategory = library.templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + template.metadata.usage.totalInvocations;
      return acc;
    }, {} as Record<string, number>);

    const usageByComplexity = library.templates.reduce((acc, template) => {
      acc[template.complexity] = (acc[template.complexity] || 0) + template.metadata.usage.totalInvocations;
      return acc;
    }, {} as Record<string, number>);

    // Calculate performance metrics
    const averageEffectiveness = library.templates.reduce(
      (sum, template) => sum + template.metadata.effectiveness.overallEffectiveness, 0
    ) / library.templates.length;

    const topPerformingTemplates = library.templates
      .sort((a, b) => b.metadata.effectiveness.overallEffectiveness - a.metadata.effectiveness.overallEffectiveness)
      .slice(0, 5);

    return {
      usage: {
        totalTemplateUsage,
        mostUsedTemplates,
        usageByCategory,
        usageByComplexity,
        usageTrends: [] // Would be populated from historical data
      },
      performance: {
        averageEffectiveness,
        topPerformingTemplates,
        performanceByCategory: {}, // Would calculate category averages
        improvementOpportunities: this.identifyImprovementOpportunities(library.templates)
      },
      collaboration: {
        totalContributors: library.metadata.stats.totalContributors,
        recentContributions: [], // Would track recent changes
        communityRating: library.metadata.stats.averageRating,
        feedback: [] // Would collect user feedback
      }
    };
  }

  // Import/Export
  async exportLibrary(libraryId: string): Promise<string> {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error(`Library ${libraryId} not found`);
    }

    return JSON.stringify(library, null, 2);
  }

  async importLibrary(libraryData: string): Promise<PromptLibrary> {
    const library = JSON.parse(libraryData) as PromptLibrary;
    
    // Validate and sanitize imported data
    library.id = createPromptId(); // Generate new ID to avoid conflicts
    library.metadata.lastUpdated = new Date();

    // Add templates to internal storage
    library.templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    this.libraries.set(library.id, library);
    return library;
  }

  // Private helper methods
  private initializeDefaultLibrary(): void {
    const defaultLibrary: PromptLibrary = {
      id: 'default-library',
      name: 'Default Prompt Library',
      description: 'Built-in prompt templates for workflow generation',
      organization: 'system',
      templates: [DEFAULT_WORKFLOW_GENERATION_TEMPLATE],
      strategies: [],
      categories: this.getDefaultCategories(),
      permissions: {
        readers: ['*'],
        writers: ['admin'],
        admins: ['system'],
        public: true,
        shareLevel: 'organization'
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date(),
        totalTemplates: 1,
        mostUsedTemplates: [DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id],
        trending: [DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id],
        featured: [DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id],
        stats: {
          totalUsage: 0,
          averageRating: 4.5,
          totalContributors: 1,
          growthRate: 0,
          popularCategories: ['workflow_generation']
        }
      }
    };

    this.libraries.set(defaultLibrary.id, defaultLibrary);
    this.templates.set(DEFAULT_WORKFLOW_GENERATION_TEMPLATE.id, DEFAULT_WORKFLOW_GENERATION_TEMPLATE);
  }

  private getDefaultCategories(): LibraryCategory[] {
    return [
      {
        id: 'workflow-generation',
        name: 'Workflow Generation',
        description: 'Templates for creating new workflows',
        templateIds: [],
        color: '#4CAF50',
        icon: 'add_circle'
      },
      {
        id: 'workflow-editing',
        name: 'Workflow Editing',
        description: 'Templates for modifying existing workflows',
        templateIds: [],
        color: '#2196F3',
        icon: 'edit'
      },
      {
        id: 'validation',
        name: 'Validation',
        description: 'Templates for workflow validation and error explanation',
        templateIds: [],
        color: '#FF9800',
        icon: 'check_circle'
      },
      {
        id: 'optimization',
        name: 'Optimization',
        description: 'Templates for workflow optimization and improvement',
        templateIds: [],
        color: '#9C27B0',
        icon: 'trending_up'
      }
    ];
  }

  private generateSearchSuggestions(query: string, templates: PromptTemplate[]): string[] {
    // Simple suggestion generation based on template names and tags
    const allTerms = templates.flatMap(template => [
      template.name.toLowerCase(),
      ...template.metadata.tags.map(tag => tag.toLowerCase()),
      template.category.toLowerCase(),
      template.complexity.toLowerCase()
    ]);

    const uniqueTerms = [...new Set(allTerms)];
    const queryLower = query.toLowerCase();
    
    return uniqueTerms
      .filter(term => term.includes(queryLower) && term !== queryLower)
      .slice(0, 5);
  }

  private calculateRecommendationScore(
    template: PromptTemplate,
    context: {
      recentTaskTypes: AITaskType[];
      preferredProvider: LLMProviderType;
      userRole: string;
      department: string;
    }
  ): number {
    let score = 0;

    // Task type relevance
    if (context.recentTaskTypes.includes(template.taskType)) {
      score += 0.4;
    }

    // Provider preference
    if (template.provider === context.preferredProvider || template.provider === 'universal') {
      score += 0.2;
    }

    // Role/department relevance
    if (template.metadata.tags.includes(context.userRole.toLowerCase()) ||
        template.metadata.tags.includes(context.department.toLowerCase())) {
      score += 0.2;
    }

    // Template effectiveness
    score += template.metadata.effectiveness.overallEffectiveness * 0.2;

    return score;
  }

  private identifyImprovementOpportunities(templates: PromptTemplate[]): string[] {
    const opportunities: string[] = [];

    // Check for low-performing templates
    const lowPerformingTemplates = templates.filter(
      template => template.metadata.effectiveness.overallEffectiveness < 0.7
    );
    
    if (lowPerformingTemplates.length > 0) {
      opportunities.push(`${lowPerformingTemplates.length} templates have effectiveness below 70%`);
    }

    // Check for unused templates
    const unusedTemplates = templates.filter(
      template => template.metadata.usage.totalInvocations === 0
    );
    
    if (unusedTemplates.length > 0) {
      opportunities.push(`${unusedTemplates.length} templates have never been used`);
    }

    // Check for inconsistent performance
    const inconsistentTemplates = templates.filter(
      template => template.metadata.effectiveness.consistencyScore < 0.6
    );
    
    if (inconsistentTemplates.length > 0) {
      opportunities.push(`${inconsistentTemplates.length} templates show inconsistent results`);
    }

    return opportunities;
  }
}