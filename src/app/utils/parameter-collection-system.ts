// src/app/utils/parameter-collection-system.ts
import { 
  FunctionDefinition, 
  FunctionParameter
} from '@/app/types/workflow';
import { ConversationStateManager } from './conversation-manager';
import { enhancedFunctionsLibrary } from './functions-library';

export interface ParameterCollectionContext {
  conversationId: string;
  workflowId: string;
  stepId: string;
  functionName: string;
  stepType: 'trigger' | 'action';
  currentValues?: Record<string, unknown>;
}

export interface ParameterCollectionResult {
  success: boolean;
  parameters: Record<string, unknown>;
  missingParameters: string[];
  validationErrors: string[];
}

export interface ParameterChoice {
  value: unknown;
  display: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface MRFFormOption {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  lastModified: Date;
  fields: string[];
}

/**
 * System for collecting parameters from users when configuring triggers and actions
 * Integrates with aime chat to provide conversational parameter collection
 */
export class ParameterCollectionSystem {
  private pendingCollections: Map<string, ParameterCollectionContext> = new Map();

  constructor() {
    console.log('📋 ParameterCollectionSystem initialized');
  }

  /**
   * Start parameter collection for a function (trigger or action)
   */
  async startParameterCollection(
    context: ParameterCollectionContext,
    conversationManager: ConversationStateManager
  ): Promise<ParameterCollectionResult> {
    console.log('🔍 Starting parameter collection for:', context.functionName, context.stepType);

    const functionDef = this.getFunctionDefinition(context.functionName);
    if (!functionDef) {
      const errorMsg = `Function "${context.functionName}" not found in library`;
      conversationManager.addAimeMessage(errorMsg, 'error_recovery');
      return {
        success: false,
        parameters: {},
        missingParameters: [],
        validationErrors: [errorMsg]
      };
    }

    // Store context for multi-turn collection
    const collectionId = `${context.conversationId}_${context.stepId}`;
    this.pendingCollections.set(collectionId, context);

    // Start interactive parameter collection
    await this.initiateParameterDialog(functionDef, context, conversationManager);

    return {
      success: true,
      parameters: context.currentValues || {},
      missingParameters: this.getMissingRequiredParameters(functionDef, context.currentValues || {}),
      validationErrors: []
    };
  }

  /**
   * Handle user response for parameter collection
   */
  async handleParameterResponse(
    collectionId: string,
    parameterName: string,
    value: unknown,
    conversationManager: ConversationStateManager
  ): Promise<ParameterCollectionResult> {
    const context = this.pendingCollections.get(collectionId);
    if (!context) {
      return {
        success: false,
        parameters: {},
        missingParameters: [],
        validationErrors: ['Collection context not found']
      };
    }

    const functionDef = this.getFunctionDefinition(context.functionName);
    if (!functionDef) {
      return {
        success: false,
        parameters: {},
        missingParameters: [],
        validationErrors: [`Function "${context.functionName}" not found`]
      };
    }

    // Update parameter value
    context.currentValues = context.currentValues || {};
    context.currentValues[parameterName] = value;

    // Validate the parameter
    const validation = this.validateParameter(parameterName, value, functionDef.parameters[parameterName]);
    if (!validation.isValid) {
      conversationManager.addAimeMessage(
        `I noticed an issue with that value: ${validation.error}. Let me help you fix it.`,
        'error_recovery'
      );
      await this.askForParameter(parameterName, functionDef.parameters[parameterName], conversationManager);
      
      return {
        success: false,
        parameters: context.currentValues,
        missingParameters: this.getMissingRequiredParameters(functionDef, context.currentValues),
        validationErrors: validation.error ? [validation.error] : []
      };
    }

    // Check if we have all required parameters
    const missingParams = this.getMissingRequiredParameters(functionDef, context.currentValues);
    if (missingParams.length === 0) {
      // Collection complete
      conversationManager.addAimeMessage(
        `Perfect! I have all the parameters needed for ${context.functionName}. The ${context.stepType} is now configured.`,
'text'
      );
      
      this.pendingCollections.delete(collectionId);
      return {
        success: true,
        parameters: context.currentValues,
        missingParameters: [],
        validationErrors: []
      };
    } else {
      // Continue collecting remaining parameters
      const nextParam = missingParams[0];
      await this.askForParameter(nextParam, functionDef.parameters[nextParam], conversationManager);
      
      return {
        success: false,
        parameters: context.currentValues,
        missingParameters: missingParams,
        validationErrors: []
      };
    }
  }

  /**
   * Initiate parameter collection dialog
   */
  private async initiateParameterDialog(
    functionDef: FunctionDefinition,
    context: ParameterCollectionContext,
    conversationManager: ConversationStateManager
  ): Promise<void> {
    const stepTypeText = context.stepType === 'trigger' ? 'trigger' : 'action';
    
    conversationManager.addAimeMessage(
      `Great choice! Let's configure the "${functionDef.name}" ${stepTypeText}. I'll need some information to set this up properly.`,
      'text'
    );

    conversationManager.addAimeMessage(
      `📋 **${functionDef.name}**: ${functionDef.description}`,
      'text'
    );

    // Start with first required parameter
    const requiredParams = Object.entries(functionDef.parameters)
      .filter(([, def]) => def.required)
      .map(([name]) => name);

    if (requiredParams.length > 0) {
      const firstParam = requiredParams[0];
      await this.askForParameter(firstParam, functionDef.parameters[firstParam], conversationManager);
    } else {
      // No required parameters, just optional ones
      conversationManager.addAimeMessage(
        'This function doesn\'t require any mandatory parameters. Would you like to configure any optional parameters, or shall we proceed with the defaults?',
        'text'
      );
    }
  }

  /**
   * Ask user for a specific parameter value
   */
  private async askForParameter(
    parameterName: string,
    parameterDef: FunctionParameter,
    conversationManager: ConversationStateManager
  ): Promise<void> {
    const requiredText = parameterDef.required ? '(Required)' : '(Optional)';
    
    conversationManager.addAimeMessage(
      `🔧 **${parameterName}** ${requiredText}: ${parameterDef.description}`,
      'text'
    );

    // Provide choices if this is a parameter with predefined options
    const choices = await this.getParameterChoices(parameterName, parameterDef);
    if (choices.length > 0) {
      await this.presentParameterChoices(parameterName, choices, conversationManager);
    } else {
      // Provide examples and ask for input
      if (parameterDef.examples && parameterDef.examples.length > 0) {
        const exampleText = Array.isArray(parameterDef.examples[0]) 
          ? JSON.stringify(parameterDef.examples[0])
          : String(parameterDef.examples[0]);
        
        conversationManager.addAimeMessage(
          `💡 Example: \`${exampleText}\``,
          'text'
        );
      }

      conversationManager.addAimeMessage(
        'Please provide a value for this parameter, or type "skip" to use the default value.',
        'text'
      );
    }
  }

  /**
   * Present parameter choices to the user
   */
  private async presentParameterChoices(
    parameterName: string,
    choices: ParameterChoice[],
    conversationManager: ConversationStateManager
  ): Promise<void> {
    if (choices.length <= 5) {
      // Show all choices inline
      let choicesText = `Please choose one of the following options for **${parameterName}**:\n\n`;
      choices.forEach((choice, index) => {
        choicesText += `${index + 1}. **${choice.display}**`;
        if (choice.description) {
          choicesText += ` - ${choice.description}`;
        }
        choicesText += '\n';
      });
      choicesText += '\nYou can respond with the number or the name of your choice.';
      
      conversationManager.addAimeMessage(choicesText, 'text');
    } else {
      // Too many choices, provide search interface
      conversationManager.addAimeMessage(
        `There are ${choices.length} available options for **${parameterName}**. You can either:
        
1. Type part of the name to search
2. Type "list all" to see all options
3. Type "help" for more information

What would you like to do?`,
        'text'
      );
    }
  }

  /**
   * Get parameter choices for specific parameters
   */
  private async getParameterChoices(
    parameterName: string,
    parameterDef: FunctionParameter
  ): Promise<ParameterChoice[]> {
    // Special handling for MRF-related parameters
    if (parameterName.toLowerCase().includes('mrf') || parameterName === 'mrfID') {
      return await this.getMRFFormOptions();
    }

    // Email parameters - get from user context
    if (parameterDef.type === 'string' && parameterName.toLowerCase().includes('email')) {
      return await this.getEmailOptions();
    }

    // Role-based parameters
    if (parameterName.toLowerCase().includes('role') || parameterName.toLowerCase().includes('approver')) {
      return await this.getRoleOptions();
    }

    // Location parameters
    if (parameterName.toLowerCase().includes('location') || parameterName.toLowerCase().includes('venue')) {
      return await this.getLocationOptions();
    }

    // Return empty array if no specific choices available
    return [];
  }

  /**
   * Get available MRF forms from backend
   */
  private async getMRFFormOptions(): Promise<ParameterChoice[]> {
    try {
      // For now, return sample MRF forms - in production this would call the backend
      const sampleMRFs: MRFFormOption[] = [
        {
          id: 'MRF_2024_001',
          title: 'Q1 Team Building Event',
          description: 'Quarterly team building activity for Sales team',
          status: 'active',
          lastModified: new Date('2024-12-15'),
          fields: ['attendees', 'budget', 'location', 'date']
        },
        {
          id: 'MRF_2024_002',
          title: 'Product Launch Meeting',
          description: 'New product announcement and training session',
          status: 'active',
          lastModified: new Date('2024-12-20'),
          fields: ['attendees', 'budget', 'location', 'resources']
        },
        {
          id: 'MRF_2024_003',
          title: 'Board Meeting Preparation',
          description: 'Monthly board meeting with external stakeholders',
          status: 'draft',
          lastModified: new Date('2024-12-18'),
          fields: ['attendees', 'budget', 'location', 'security']
        },
        {
          id: 'MRF_2024_004',
          title: 'Customer Training Workshop',
          description: 'Technical training for key customers',
          status: 'active',
          lastModified: new Date('2024-12-22'),
          fields: ['attendees', 'budget', 'location', 'equipment']
        },
        {
          id: 'MRF_2024_005',
          title: 'Holiday Party Planning',
          description: 'End of year celebration for all employees',
          status: 'active',
          lastModified: new Date('2024-12-10'),
          fields: ['attendees', 'budget', 'catering', 'entertainment']
        }
      ];

      return sampleMRFs
        .filter(mrf => mrf.status === 'active' || mrf.status === 'draft')
        .map(mrf => ({
          value: mrf.id,
          display: mrf.title,
          description: `${mrf.description} (${mrf.status})`,
          metadata: {
            status: mrf.status,
            lastModified: mrf.lastModified,
            fields: mrf.fields
          }
        }));
    } catch (error) {
      console.error('Error fetching MRF options:', error);
      return [];
    }
  }

  /**
   * Get email options from user context
   */
  private async getEmailOptions(): Promise<ParameterChoice[]> {
    // Sample email options - in production this would come from user context/directory
    return [
      {
        value: 'manager@groupize.com',
        display: 'Manager',
        description: 'Direct manager approval'
      },
      {
        value: 'hr@groupize.com',
        display: 'HR Department',
        description: 'Human Resources team'
      },
      {
        value: 'admin@groupize.com',
        display: 'Admin',
        description: 'System administrator'
      },
      {
        value: 'finance@groupize.com',
        display: 'Finance Team',
        description: 'Financial approval team'
      }
    ];
  }

  /**
   * Get role-based options
   */
  private async getRoleOptions(): Promise<ParameterChoice[]> {
    return [
      {
        value: 'manager',
        display: 'Manager',
        description: 'Direct line manager'
      },
      {
        value: 'department_head',
        display: 'Department Head',
        description: 'Head of department'
      },
      {
        value: 'admin',
        display: 'Administrator',
        description: 'System administrator'
      },
      {
        value: 'finance_approver',
        display: 'Finance Approver',
        description: 'Financial approval authority'
      }
    ];
  }

  /**
   * Get location options
   */
  private async getLocationOptions(): Promise<ParameterChoice[]> {
    return [
      {
        value: 'conference_room_a',
        display: 'Conference Room A',
        description: 'Main conference room (20 people)'
      },
      {
        value: 'conference_room_b',
        display: 'Conference Room B',
        description: 'Small meeting room (8 people)'
      },
      {
        value: 'board_room',
        display: 'Board Room',
        description: 'Executive board room (12 people)'
      },
      {
        value: 'virtual',
        display: 'Virtual Meeting',
        description: 'Online video conference'
      },
      {
        value: 'external',
        display: 'External Venue',
        description: 'Off-site location (to be specified)'
      }
    ];
  }

  /**
   * Validate parameter value
   */
  private validateParameter(
    parameterName: string,
    value: unknown,
    parameterDef: FunctionParameter
  ): { isValid: boolean; error?: string } {
    // Required parameter check
    if (parameterDef.required && (value === undefined || value === null || value === '')) {
      return { isValid: false, error: 'This parameter is required' };
    }

    // Type validation
    switch (parameterDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { isValid: false, error: 'Value must be a string' };
        }
        break;
      case 'number':
        if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
          return { isValid: false, error: 'Value must be a number' };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return { isValid: false, error: 'Value must be true or false' };
        }
        break;
      case 'array':
        if (!Array.isArray(value) && typeof value === 'string') {
          // Try to parse as JSON array
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              return { isValid: false, error: 'Value must be an array' };
            }
          } catch {
            return { isValid: false, error: 'Value must be a valid array' };
          }
        }
        break;
    }

    // Custom validation using Zod schemas if available
    if (parameterDef.validation) {
      try {
        parameterDef.validation.parse(value);
      } catch (error) {
        return { isValid: false, error: 'Value does not meet validation requirements' };
      }
    }

    return { isValid: true };
  }

  /**
   * Get missing required parameters
   */
  private getMissingRequiredParameters(
    functionDef: FunctionDefinition,
    currentValues: Record<string, unknown>
  ): string[] {
    return Object.entries(functionDef.parameters)
      .filter(([name, def]) => def.required && !currentValues[name])
      .map(([name, _def]) => name);
  }

  /**
   * Get function definition from library
   */
  private getFunctionDefinition(functionName: string): FunctionDefinition | null {
    // Remove 'functions.' prefix if present
    const cleanName = functionName.replace(/^functions\./, '');
    return enhancedFunctionsLibrary.functions[cleanName] || null;
  }

  /**
   * Get active collections for a conversation
   */
  getActiveCollections(conversationId: string): ParameterCollectionContext[] {
    return Array.from(this.pendingCollections.values())
      .filter(context => context.conversationId === conversationId);
  }

  /**
   * Cancel parameter collection
   */
  cancelCollection(collectionId: string): boolean {
    return this.pendingCollections.delete(collectionId);
  }
}