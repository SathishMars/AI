// src/app/types/workflow-conversation-autocomplete.ts

export type ParameterType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'email' | 'phone' | 'api';

export interface ParameterDefinition {
  name: string;
  type: ParameterType;
  description: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  
  // For select/multiselect types
  options?: Array<{
    value: string | number;
    label: string;
    description?: string;
  }>;
  
  // For API-based parameters
  apiEndpoint?: string;
  apiValueField?: string; // field name to extract value from API response
  apiLabelField?: string; // field name to extract label from API response
  
  // Validation
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  
  // UI hints
  placeholder?: string;
  helpText?: string;
}

export interface WorkflowAutocompleteItem {
  id: string;
  category: 'function' | 'userContext' | 'dateFunction' | 'stepReference' | 'formField';
  trigger: string; // What user types to trigger (e.g., '@', 'user.', '#')
  name: string;
  displayName: string;
  description: string;
  examples: string[];
  workflowStepType?: 'trigger' | 'action' | 'condition' | 'workflow' | 'end';
  llmUsageInstructions?: string;
  llmJsonExample?: Record<string, unknown>;
  outputs?: Partial<{
    nextSteps: unknown;
    onApproval: unknown;
    onReject: unknown;
    onSuccess: unknown;
    onFailure: unknown;
    onSuccessGoTo: unknown;
    onFailureGoTo: unknown;
    onYes: unknown;
    onNo: unknown;
  }>;
  
  // For functions that require parameters
  parameters?: ParameterDefinition[];
  
  // For user context variables
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  
  // LLM instructions
  llmInstructions: {
    usage: string; // How to use this in workflow JSON
    jsonExample: Record<string, unknown>; // Example JSON structure
    contextDescription: string; // What this provides to the workflow
  };
  
  // UI display
  icon?: string;
  color?: string;
  tags?: string[];
}

export type WorkflowConversationAutocomplete = WorkflowAutocompleteItem[];