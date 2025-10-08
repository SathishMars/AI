// src/app/types/workflow-conversation-autocomplete-v2.ts

export interface apiCallType {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean>;
  bodyParams?: Record<string, unknown>;
  responseMapping?: {
    valueField: string; // field name to extract value from API response
    labelField: string; // field name to extract label from API response
  };
}

export interface ParameterDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'api' | 'automatic';
  description: string;
  required: boolean;
  defaultValue?: string | number | boolean | object;
  // For select/multiselect types
  options?: Array<{
    value: string | number;
    label: string;
    description?: string;
  }| apiCallType>| apiCallType;
  
  // For API-based parameters
  api?: apiCallType;
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

// Combined type for previous `category` values and workflow step types
export type PredefinedFUnctionType =
  | 'userContext'
  | 'dateFunction'
  | 'stepReference'
  | 'fieldReference'
  | 'variable'
  | 'trigger'
  | 'action'
  | 'condition'
  | 'split'
  | 'merge'
  | 'conditionalSplit'
  | 'workflowReference'
  | 'end';

export interface WorkflowAutocompleteItem {
  id: string;
  // merged field -- previously `category`
  type: PredefinedFUnctionType;
  trigger: string; // What user types to trigger (e.g., '@', 'user.', '#')
  name: string;
  label: string;
  description?: string;
  examples: string[];
  outputs: { // The boolean depicts if it is mandatory or not. the properties depict that at least one of these needs to be there.
    nextSteps?: boolean,  
    onConditionPass?: boolean,
    onConditionFail?: boolean,
    onTimeout?: boolean,
    end?: boolean
  }; 
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
  tags?: string[];
  // New flags (required)
  isAutocomplete: boolean;
  isWorkflowDefinition: boolean;
}

export type WorkflowConversationAutocomplete = WorkflowAutocompleteItem[];