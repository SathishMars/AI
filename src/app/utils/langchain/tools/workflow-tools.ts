// src/app/utils/langchain/tools/workflow-tools.ts
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { functionsLibraryManager } from "@/app/utils/functions-library";
import { FunctionDefinition, FunctionParameter } from "@/app/types/workflow";

/**
 * Tool registry that converts existing function library to LangChain tools
 */
export class WorkflowToolRegistry {
  private static instance: WorkflowToolRegistry;
  private tools: Map<string, DynamicStructuredTool> = new Map();

  private constructor() {
    this.initializeTools();
  }

  public static getInstance(): WorkflowToolRegistry {
    if (!WorkflowToolRegistry.instance) {
      WorkflowToolRegistry.instance = new WorkflowToolRegistry();
    }
    return WorkflowToolRegistry.instance;
  }

  /**
   * Initialize all tools from the functions library
   */
  private initializeTools(): void {
    const library = functionsLibraryManager.getLibrary();
    
    Object.values(library.functions).forEach((functionDef: FunctionDefinition) => {
      const tool = this.createToolFromFunction(functionDef);
      this.tools.set(functionDef.name, tool);
    });

    console.log(`🔧 Initialized ${this.tools.size} LangChain tools from functions library`);
  }

  /**
   * Create a LangChain tool from a function definition
   */
  private createToolFromFunction(functionDef: FunctionDefinition): DynamicStructuredTool {
    // Convert function parameters to Zod schema
    const schema = this.createZodSchema(functionDef.parameters);
    
    return new DynamicStructuredTool({
      name: functionDef.name,
      description: this.createToolDescription(functionDef),
      schema,
      func: async (args: Record<string, unknown>) => {
        return await this.executeFunction(functionDef, args);
      }
    });
  }

  /**
   * Create enhanced tool description with context for LLM
   */
  private createToolDescription(functionDef: FunctionDefinition): string {
    let description = functionDef.description;
    
    // Add category and tags for better context
    if (functionDef.category) {
      description += ` [Category: ${functionDef.category}]`;
    }
    
    if (functionDef.tags && functionDef.tags.length > 0) {
      description += ` [Tags: ${functionDef.tags.join(', ')}]`;
    }

    // Add AI prompt hints if available
    if (functionDef.documentation?.aiPromptHints?.length > 0) {
      description += ` Usage hints: ${functionDef.documentation.aiPromptHints.join('. ')}.`;
    }

    // Add common use cases
    if (functionDef.documentation?.commonUseCases?.length > 0) {
      description += ` Common use cases: ${functionDef.documentation.commonUseCases.join(', ')}.`;
    }

    return description;
  }

  /**
   * Create Zod schema from function parameters
   */
  private createZodSchema(parameters: Record<string, FunctionParameter>): z.ZodType {
    const schemaObject: Record<string, z.ZodType> = {};
    
    Object.entries(parameters).forEach(([paramName, paramDef]) => {
      let paramSchema = this.getZodTypeForParameter(paramDef);
      
      // Add description
      paramSchema = paramSchema.describe(paramDef.description);
      
      // Handle optional parameters
      if (!paramDef.required) {
        if (paramDef.default !== undefined) {
          paramSchema = paramSchema.default(paramDef.default);
        } else {
          paramSchema = paramSchema.optional();
        }
      }
      
      schemaObject[paramName] = paramSchema;
    });
    
    return z.object(schemaObject);
  }

  /**
   * Get appropriate Zod type for parameter
   */
  private getZodTypeForParameter(paramDef: FunctionParameter): z.ZodType {
    // Use existing validation schema if available
    if (paramDef.validation) {
      return paramDef.validation as z.ZodType;
    }

    // Create schema based on type
    switch (paramDef.type.toLowerCase()) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'array':
        return z.array(z.any());
      case 'object':
        return z.record(z.string(), z.any());
      case 'date':
        return z.date();
      case 'email':
        return z.string().email();
      case 'url':
        return z.string().url();
      default:
        return z.any();
    }
  }

  /**
   * Execute function (placeholder implementation)
   * In a real implementation, this would call the actual function
   */
  private async executeFunction(
    functionDef: FunctionDefinition, 
    args: Record<string, unknown>
  ): Promise<string> {
    // For now, return a success message with function details
    // In production, this would execute the actual function
    
    console.log(`🔄 Executing function: ${functionDef.name}`, args);
    
    // Validate required parameters
    const requiredParams = Object.entries(functionDef.parameters)
      .filter(([_, param]) => param.required)
      .map(([name, _]) => name);
    
    const missingParams = requiredParams.filter(param => !(param in args));
    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    // Simulate function execution
    return `Function ${functionDef.name} executed successfully with parameters: ${JSON.stringify(args)}`;
  }

  /**
   * Get a specific tool by function name
   */
  public getTool(functionName: string): DynamicStructuredTool | undefined {
    return this.tools.get(functionName);
  }

  /**
   * Get all tools
   */
  public getAllTools(): DynamicStructuredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): DynamicStructuredTool[] {
    const library = functionsLibraryManager.getLibrary();
    return Object.values(library.functions)
      .filter((func: FunctionDefinition) => func.category === category)
      .map((func: FunctionDefinition) => this.tools.get(func.name))
      .filter(Boolean) as DynamicStructuredTool[];
  }

  /**
   * Get tool names for LLM context
   */
  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool summaries for LLM context
   */
  public getToolSummaries(): Array<{
    name: string;
    description: string;
    category: string;
    parameters: string[];
  }> {
    const library = functionsLibraryManager.getLibrary();
    
    return Object.values(library.functions).map((func: FunctionDefinition) => ({
      name: func.name,
      description: func.description,
      category: func.category,
      parameters: Object.keys(func.parameters)
    }));
  }

  /**
   * Search tools by description or tags
   */
  public searchTools(query: string): DynamicStructuredTool[] {
    const library = functionsLibraryManager.getLibrary();
    const queryLower = query.toLowerCase();
    
    const matchingFunctions = Object.values(library.functions).filter((func: FunctionDefinition) => {
      return (
        func.name.toLowerCase().includes(queryLower) ||
        func.description.toLowerCase().includes(queryLower) ||
        func.tags.some((tag: string) => tag.toLowerCase().includes(queryLower)) ||
        func.documentation?.commonUseCases?.some((useCase: string) => 
          useCase.toLowerCase().includes(queryLower)
        )
      );
    });

    return matchingFunctions
      .map((func: FunctionDefinition) => this.tools.get(func.name))
      .filter(Boolean) as DynamicStructuredTool[];
  }

  /**
   * Validate tool execution parameters
   */
  public validateToolParameters(
    functionName: string, 
    parameters: Record<string, unknown>
  ): { isValid: boolean; errors: string[] } {
    const tool = this.tools.get(functionName);
    if (!tool) {
      return { isValid: false, errors: [`Tool ${functionName} not found`] };
    }

    try {
      // Get the underlying Zod schema from our stored tool definitions
      const library = functionsLibraryManager.getLibrary();
      const functionDef = library.functions[functionName];
      if (!functionDef) {
        return { isValid: false, errors: [`Function definition ${functionName} not found`] };
      }

      const schema = this.createZodSchema(functionDef.parameters);
      schema.parse(parameters);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err: z.ZodIssue) => 
          `${err.path.join('.')}: ${err.message}`
        );
        return { isValid: false, errors };
      }
      return { isValid: false, errors: [error instanceof Error ? error.message : 'Unknown validation error'] };
    }
  }

  /**
   * Get tool documentation for LLM context
   */
  public getToolDocumentation(functionName: string): string | null {
    const library = functionsLibraryManager.getLibrary();
    const func = library.functions[functionName];
    
    if (!func) return null;

    let doc = `**${func.name}** (${func.category})\n`;
    doc += `${func.description}\n\n`;
    
    if (Object.keys(func.parameters).length > 0) {
      doc += `**Parameters:**\n`;
      Object.entries(func.parameters).forEach(([name, param]: [string, FunctionParameter]) => {
        const required = param.required ? '(required)' : '(optional)';
        doc += `- ${name} ${required}: ${param.description}\n`;
        if (param.examples && param.examples.length > 0) {
          doc += `  Examples: ${param.examples.map(ex => JSON.stringify(ex)).join(', ')}\n`;
        }
      });
    }

    if (func.examples && func.examples.length > 0) {
      doc += `\n**Usage Examples:**\n`;
      func.examples.forEach(example => {
        doc += `- ${example.name}: ${example.description}\n`;
      });
    }

    return doc;
  }
}

/**
 * Convenience functions for quick access
 */

/**
 * Get the default tool registry instance
 */
export function getWorkflowToolRegistry(): WorkflowToolRegistry {
  return WorkflowToolRegistry.getInstance();
}

/**
 * Get a specific workflow tool
 */
export function getWorkflowTool(functionName: string): DynamicStructuredTool | undefined {
  return getWorkflowToolRegistry().getTool(functionName);
}

/**
 * Get all workflow tools
 */
export function getAllWorkflowTools(): DynamicStructuredTool[] {
  return getWorkflowToolRegistry().getAllTools();
}

/**
 * Get tools by category
 */
export function getWorkflowToolsByCategory(category: string): DynamicStructuredTool[] {
  return getWorkflowToolRegistry().getToolsByCategory(category);
}

/**
 * Search workflow tools
 */
export function searchWorkflowTools(query: string): DynamicStructuredTool[] {
  return getWorkflowToolRegistry().searchTools(query);
}