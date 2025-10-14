import { WorkflowStepFunction } from "@/app/types/workflowStepFunction";

interface WorkflowFunctionTypeConfig {
  color: string;
  label: string;
  icon: string;
}

export const workflowFunctionTypeConfig: Record<string, WorkflowFunctionTypeConfig> = {
  trigger: {
    color: '#2E7D32',
    label: 'Trigger',
    icon: 'start' // Material UI stylesheet icon name
  },
  decision: {
    color: '#F57C00',
    label: 'Decision',
    icon: 'help_center' // Material UI stylesheet icon name
  },
  task: {
    color: '#1976D2',
    label: 'Task',
    icon: 'task_alt' // Material UI stylesheet icon name
  },
  terminate: {
    color: '#B71C1C',
    label: 'End',
    icon: 'stop_circle' // Material UI stylesheet icon name
  },
  branch: {
    color: '#FFA000',
    label: 'Branch',
    icon: 'graph_2' // Material UI stylesheet icon name
  },
  merge: {
    color: '#0288D1',
    label: 'Merge',
    icon: 'family_history' // Material UI stylesheet icon name
  },
  workflow: {
    color: '#7B1FA2',
    label: 'Workflow',
    icon: 'flowchart' // Material UI stylesheet icon name
  }
}

export const workflowFunctionDefinitions: Array<WorkflowStepFunction> = [
    // TRIGGER FUNCTIONS
    {
        id: 'trigger_on_request',
        label: 'On receiving the request',
        type: 'trigger',
        name: 'onRequest',
        description: 'Trigger workflow when a request is submitted',
        params: [
            {
                name: 'requestType',
                label: 'Type of request',
                type: 'select',
                description: 'Type of request to trigger on (optional - defaults to all)',
                required: true,
                defaultValue: 'all',
                options: [
                    { value: 'all', label: 'All Requests' },
                    { endpoint: '/api/request-types', method: 'GET', responseMapping: { valueField: 'id', labelField: 'name' } },
                ]
            }
        ],
        outputs: [{
            type: 'result', label: 'The request form information', required: true
        }],
        llmInstructions: {
            usageInstruction: `This is a STEP. Workflow entry point that activates when a request is submitted. Use requestType parameter to filter specific request (use the api definition to get the values) types or leave as "all" for any request
            Example usage:
      \`\`\` json
        {
            id: 'ght223nmop',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps
            label: 'On receiving the request', // human readable name for the step based on context of what the step does
            type: 'trigger',
            stepFunction: 'onRequest',
            functionParams: {
                requestType: 'all' // if provided by the user in their description, match to the available request types from the api or use 'all' for any request. 
            },
            next: ['7hhs67klm9'] // next step ID to execute after this step
        }
      \`\`\`      
    `
        },
    },
    {
        id: 'trigger_on_mrf',
        label: 'On receiving a meeting request form (MRF)',
        type: 'trigger',
        name: 'onMRF',
        description: 'Trigger workflow when an MRF (Meeting Request Form) is submitted',
        params: [
            {
                name: 'mrfTemplateName',
                label: 'MRF Template Name',
                type: 'select',
                description: 'Specific MRF template to trigger on (optional - defaults to all)',
                required: false,
                defaultValue: 'all',
                options: [
                    { value: 'all', label: 'All MRF Templates' },
                    { endpoint: '/api/mrf-templates', method: 'GET', responseMapping: { valueField: 'id', labelField: 'name' } },
                ]
            }
        ],
        outputs: [{
            type: 'result', label: 'The request form information', required: true
        }],
        llmInstructions: {
            usageInstruction: `This is a STEP. Workflow entry point that activates when an MRF is submitted. Use mrfTemplateName parameter to filter specific MRF templates or leave as "all" for any MRF submission.
            Example usage:
      \`\`\` json
        {
            id: 'ght223nmop',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps
            label: 'On receiving the MRF', // human readable name for the step based on context of what the step does
            type: 'trigger',
            stepFunction: 'onMRF',
            functionParams: {
                mrfTemplateName: 'all' // if provided by the user in their description, match to the available MRF types from the api or use 'all' for any MRF. 
            },
            next: ['7hhs67klm9'] // next step ID to execute after this step
        },
      \`\`\`      
    `
        },
    },
    // TASK FUNCTIONS
    {
        id: 'notify',
        label: 'Notify',
        type: 'task',
        name: 'notify',
        description: 'Send notification based on user settings',
        params: [
            {
                name: 'to',
                label: 'To',
                type: 'string',
                description: 'Primary recipient',
                required: true,
            },
            {
                name: 'cc',
                label: 'CC',
                type: 'string',
                description: 'CC recipients (optional)',
                required: false,
            },
            {
                name: 'subject',
                label: 'Subject',
                type: 'string',
                description: 'Notification subject line',
                required: true,
            },
            {
                name: 'notificationTemplateName',
                label: 'Notification template Name',
                type: 'select',
                description: 'Notification template to use',
                required: true,
                options: [{ endpoint: '/api/notification-templates', method: 'GET', responseMapping: { valueField: 'id', labelField: 'name' } }]
            }
        ],
        outputs: [{ type: 'result', label: 'The request form information', required: false }],
        llmInstructions: {
            usageInstruction: `This is a STEP. this step will execute a task to notify one or more users. Use the to, cc, subject, and notificationTemplateName parameters to customize the notification.
            Example usage:
      \`\`\` json
        {
            id: '7hhs67klm9',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps
            label: 'Notify the manager', // human readable name for the step based on context of what the step does
            type: 'task',
            stepFunction: 'notify',
            functionParams: {
                to: '\${userId: "jdoe@company.com", name: "John Doe"}', // use the userId as per the org format
                cc: '\${userId: "finance-team@company.com", name: "Finance Team"}', // use the userId as per the org format
                subject: 'A new meeting request from John Doe was submitted',
                notificationTemplateName: 'notification-template-1' // if provided by the user in their description, match to the available notification templates from the api.
            },
            next: ['7hhs67klm9'] // next step ID to execute after this step. could be the terminate step or another task step
        }
      \`\`\`      
    `
        },
    },
    {
        id: 'fn_create_event',
        label: 'Create event',
        type: 'task',
        name: 'createEvent',
        description: 'Create an event for a meeting',
        params: [],
        outputs: [{ type: 'result', label: 'The event that was created', required: false }],
        llmInstructions: {
            usageInstruction: `This is a STEP. this step will execute a task to create a meeting event. Use the event details parameters to customize the event.
            Example usage:
      \`\`\` json
        {
            id: '3klmop4567',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps   
            label: 'Create calendar event', // human readable name for the step based on context of what the step does
            type: 'task',
            stepFunction: 'createEvent',
            functionParams: { },
            next: ['87snjhsw76'] // next step ID to execute after this step. could be the terminate step or another task step. 
        }
      \`\`\`      
    `
        },
    },
    // DECISION FUNCTIONS
    {
        id: 'fn_request_approval',
        label: 'Request for approval',
        type: 'decision',
        name: 'requestApproval',
        description: 'Request approval from designated approvers',
        params: [
            {
                name: 'approver',
                label: 'Approver',
                type: 'api',
                description: 'Select approver from directory',
                required: true,
                options: [{ endpoint: '/api/users/approvers', method: 'GET', responseMapping: { valueField: 'id', labelField: 'displayName' } }]
            },
            {
                name: 'reason',
                label: 'Reason',
                type: 'string',
                description: 'Reason for approval request',
                required: false,
                defaultValue: 'Please review and approve'
            }
        ],
        outputs: [{
            type: 'pass', label: 'Approved', required: true
        }, {
            type: 'fail', label: 'Rejected', required: true
        }, {
            type: 'timeout', label: 'No response', required: false
        }],
        llmInstructions: {
            usageInstruction: `This is a STEP. Sends an approval request to the specified approver. Use the approver parameter to select the approver from the directory and optionally provide a reason for the request.
            Example usage:
      \`\`\` json
        {
            id: '3klmop4567',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps
            label: 'Request approval from manager', // human readable name for the step based on context of what the step does
            type: 'decision',
            stepFunction: 'requestApproval',
            functionParams: {
                approver: '\${manager}', // use the userId as per the org format or use workflow variables like \${manager} to dynamically set the approver based on the request context
                reason: 'Budget exceeds department threshold' // optional reason for the approval request
            },
            onConditionPass: '7c8aScds7e', // next step ID to execute if approved. could be the terminate step or another task step
            onConditionFail: '87snjhsw76', // next step ID to execute if rejected. could be the terminate step or another task step
            onTimeout: 'jds7bbsq7n', // next step ID to execute if no response within timeout period. could be the terminate step or another task step
            timeout: 86400, // optional timeout in seconds (e.g., 86400 seconds = 24 hours)
            retryCount: 2, // optional retry count on failure
            retryDelay: 3600 // optional delay between retries in seconds (e.g., 3600 seconds = 1 hour)
        },
        
      \`\`\`      
        Note: This step supports enhanced condition outputs:
        onConditionPass can also be referenced as on Approval or on Yes
        onConditionFail can also be referenced as on Reject or on No
    `
        },
    },
    {
        id: 'fn_condition',
        label: 'Decision Point',
        type: 'decision',
        name: 'checkCondition',
        description: 'Evaluate a condition to determine workflow path',
        params: [
            {
                name: 'evaluate',
                label: 'Condition',
                type: 'string',
                description: 'json-rules-engine condition as JSON string',
                required: true,
            },
        ],
        outputs: [{
            type: 'pass', label: 'Approved', required: true
        }, {
            type: 'fail', label: 'Rejected', required: true
        }],
        llmInstructions: {
            usageInstruction: `This is a STEP. Evaluates a condition to determine the workflow path. Use the evaluate parameter to specify the condition to check.
            Example usage:
      \`\`\` json
        {
            id: '3klmop4567',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps   
            label: 'Check if age > 18 and budget > 1000', // human readable name for the step based on context of what the step does
            type: 'decision',
            stepFunction: 'checkCondition',
            functionParams: {
                condition: {. //json-rules-engine compatible condition object
                    any: [
                        { fact: '\${age}', operator: 'greaterThan', value: 18 },
                        {
                            all: [
                                { fact: '\${budget}', operator: 'greaterThan', value: 1000 },
                                { fact: '\${role}', operator: 'notEqual', value: 'manager' }
                            ]
                        }
                    ]
                }
            },
            onConditionPass: 'ds6ksd7xnm', // next step ID to execute if condition passes. could be the terminate step or another task step
            onConditionFail: 'basx6vwqn8', // next step ID to execute if condition fails. could be the terminate step or another task step
        }
      \`\`\`      
        Note: This step supports enhanced condition outputs:
        onConditionPass can also be referenced as on Yes
        onConditionFail can also be referenced as on No
    `
        },
    },
    // Branch / Merge functions
    {
        id: 'fn_branch_workflow',
        label: 'Branch/Split Workflow',
        type: 'branch',
        name: 'branch',
        description: 'Branch workflow into multiple parallel execution paths',
        params: [],
        outputs: [],
        llmInstructions: {
            usageInstruction: `This is a STEP. Splits workflow execution into parallel branches. Use when multiple independent processes need to run simultaneously
            Example usage:
      \`\`\` json
        {
            id: 'branch12345',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps  
            label: 'Branch the workflow into parallel paths', // human readable name for the step based on context of what the step does
            type: 'branch',
            stepFunction: 'branch',
            functionParams: {
                // no parameters for branch step
            },
            next: ['889gfhhy65', '7hhs67klm9', 'vvs6ojhwtF'] // array of next step IDs to execute in parallel
        },
      \`\`\`
    `
        },
    },
    {
        id: 'fn_merge_workflow',
        label: 'Merge/Join Workflow',
        type: 'merge',
        name: 'merge',
        description: 'Wait for multiple workflow steps to complete before proceeding',
        params: [
            {
                name: 'waitForSteps',
                label: 'Wait For Steps',
                type: 'list',
                description: 'Comma-separated list of step names to wait for completion',
                required: true,
            },
            {
                name: 'waitForAll',
                label: 'Require all to complete',
                type: 'select',
                description: 'Require all steps to succeed or accept partial success',
                required: true,
                defaultValue: 'true',
                options: [
                    { value: 'true', label: 'All Must Succeed' },
                    { value: 'false', label: 'Partial Success OK' }
                ]
            },
            {
                name: 'timeout',
                label: 'Timeout',
                type: 'string',  // will be a number followed by either m (minutes) or h (hours) or d (days)
                description: 'Maximum wait time before proceeding (e.g., 30m, 2h, 1d)',
                required: true,
                defaultValue: "48h" // default to 48 hours
            }
        ],
        outputs: [{
            type: 'result', label: 'the set of task that successfully completed', required: true
        }],
        llmInstructions: {
            usageInstruction: `This is a STEP. Merges parallel workflow branches by waiting for multiple specified steps to complete. Use waitForSteps to list the step IDs to wait for, waitForAll to specify if all must succeed or partial success is acceptable, and timeout to set a maximum wait time.
            Example usage:
      \`\`\` json
        {
            id: '3klmop4567',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps   
            label: 'Merge parallel workflow branches', // human readable name for the step based on context of what the step does
            type: 'merge',
            stepFunction: 'merge',
            functionParams: {
                waitForSteps: ['889gfhhy65', '7hhs67klm9'], // array of step IDs to wait for completion
                waitForAll: true, // set to true if all steps must succeed, false if partial success is acceptable
                timeout: 120 // maximum wait time in seconds before proceeding (e.g., 120 seconds = 2 minutes)
            },
            next: ['proceedWithProcess'] // next step ID to execute after merging
        }
      \`\`\`      
    `
        },
    },
    // TERMINATE FUNCTION
    {
        id: 'fn_terminate',
        label: 'Terminate',
        type: 'terminate',
        name: 'terminate',
        description: 'Terminate the workflow',
        params: [],
        outputs: [],
        llmInstructions: {
            usageInstruction: `This is a STEP. this step will terminate the workflow.
            Example usage:
      \`\`\` json
        {
            id: '3klmop4567',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps
            label: 'Terminate workflow', // human readable name for the step based on context of what the step does
            type: 'terminate',
            stepFunction: 'terminate',
            functionParams: { },
            next: [] // no next step after termination
        }
      \`\`\`
    `
        },
    },
]

export const workflowFunctionInstructions = workflowFunctionDefinitions.map(def => {
    // Create a shallow copy and remove llmInstructions
    const { llmInstructions, ...defWithoutInstructions } = def;
    return ` Function: - ${def.name}- ${def.description}:
${llmInstructions.usageInstruction}
The function definition is as follows:
\`\`\`json
${JSON.stringify(defWithoutInstructions, null, 2)}
\`\`\`
`;
});
