import { z } from 'zod';


export type ToolType = 'task' | 'decision' | 'approval'| 'trigger' | 'branch' | 'merge' | 'workflow' | 'terminate';



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
    type: 'result' | 'pass' | 'fail' | 'error' | 'timeout' | 'condition';     // Output type
    label?: string;                                              // Human-readable output label
    required: boolean;                                          // Is the output required
    value?: string|number|boolean;                                             // Optional value to be returned
    next?: string;                                              // Optional next step ID
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



// ToolType enum
export const ToolTypeSchema = z.enum([
    'task',
    'decision',
    'trigger',
    'branch',
    'merge',
    'workflow',
    'terminate',
]);

// LLMInstructions schema
export const LLMInstructionsSchema = z.object({
    usageInstruction: z.string(),
});

// api schema
export const apiSchema = z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    headers: z.record(z.string()).optional(),
    params: z.record(z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.object({}).passthrough(),
    ])).optional(),
    responseMapping: z.record(z.string()).optional(),
});

// FunctionParam schema
export const FunctionParamSchema = z.object({
    name: z.string(),
    label: z.string(),
    required: z.boolean(),
    description: z.string().optional(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'select', 'list', 'api']),
    options: z.array(
        z.union([
            z.object({
                value: z.union([
                    z.string(),
                    z.number(),
                    z.boolean(),
                    z.object({}).passthrough(),
                ]),
                label: z.string(),
            }),
            apiSchema,
        ])
    ).optional(),
    value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.object({}).passthrough(),
        apiSchema,
    ]).optional(),
    defaultValue: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.object({}).passthrough(),
        apiSchema,
    ]).optional(),
});

// FunctionOutput schema
export const FunctionOutputSchema = z.object({
    type: z.enum(['result', 'pass', 'fail', 'error', 'timeout']),
    label: z.string(),
    required: z.boolean(),
});

// WorkflowStepFunction schema
export const WorkflowStepFunctionSchema = z.object({
    id: z.string(),
    label: z.string(),
    name: z.string(),
    type: ToolTypeSchema,
    description: z.string().optional(),
    params: z.array(FunctionParamSchema).optional(),
    outputs: z.array(FunctionOutputSchema),
    llmInstructions: LLMInstructionsSchema,
});