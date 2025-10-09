
export type ToolType = 'task' | 'decision' | 'trigger' | 'branch' | 'merge' | 'workflow';

export interface LLMInstructions {
    usageInstruction: string;                                   // Instruction to the LLM on how to use the tool
}

export interface api {
    endpoint: string;                                           // API endpoint URL
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';        // HTTP method
    headers?: Record<string, string>;                           // Optional headers
    params?: Record<string, string|number|boolean|object>;      // Optional query parameters
    responseMapping?: Record<string, string>;                   // Optional response mapping
}

export interface FunctionParam {
    name: string;                                               // Parameter name to be passed to the tool
    label: string;                                              // Human-readable parameter label
    required: boolean;                                          // Is the parameter required
    description?: string;                                       // Optional description
    type: 'string' | 'number' | 'boolean' | 'object' | 'select' | 'list' | 'api'; // Parameter type
    options?: Array<{ value: string|number|boolean|object; label: string; } | api>; // Options for 'select' type or API to fetch options
    value?: string|number|boolean|object|api;                       // Optional value
    defaultValue?: string|number|boolean|object|api;                // Optional default value
}

export interface FunctionOutput {
    type: 'result' | 'pass' | 'fail' | 'error' | 'timeout';     // Output type
    label: string;                                              // Human-readable output label
    required: boolean;                                          // Is the output required
}


export interface WorkflowStepFunction {
    id: string;                                                 // Unique tool ID
    label: string;                                              // Human-readable tool name
    name: string;                                               // Tool name (to be used in the workflow)
    type: ToolType;                                             // Tool type (e.g., task, decision)
    description?: string;                                       // Optional tool description
    params?: Array<FunctionParam>;                                  // Optional parameters for the tool
    outputs: Array<FunctionOutput>;                                 // Possible outputs from the tool
    llmInstructions: LLMInstructions;                           // Instructions for LLM on how to use the tool
}


