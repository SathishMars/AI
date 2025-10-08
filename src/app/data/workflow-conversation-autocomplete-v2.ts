// src/app/data/workflow-conversation-autocomplete.ts

import { WorkflowConversationAutocomplete } from '@/app/types/workflow-conversation-autocomplete-v2';

export const workflowConversationAutocomplete: WorkflowConversationAutocomplete = [
  // TRIGGER FUNCTIONS
  {
    id: 'trigger_on_request',
    type: 'trigger',
    trigger: '@',
    name: 'onRequest',
    label: 'On receiving the request',
    description: 'Trigger workflow when a request is submitted',
    examples: ['@onRequest for any request type', '@onRequest for budget', "@onRequest for exception"],
    isAutocomplete: true,
    isWorkflowDefinition: true,
    parameters: [
      {
        name: 'requestType',
        label: 'Type of request',
        type: 'select',
        description: 'Type of request to trigger on (optional - defaults to all)',
        required: false,
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All Requests', description: 'Trigger on any request submission' },
          { endpoint: '/api/request-types', method: 'GET', responseMapping: { valueField: 'id', labelField: 'name' } },
        ]
      }
    ],
    outputs: {
      nextSteps: true
    },
    llmInstructions: {
      usage: 'Use as workflow trigger step when workflow should start on request submission. CRITICAL: This must be used as type "trigger" step only',
      jsonExample: {
        label: 'On receiving the request',
        params: {
          requestType: 'travel'
        },
        nextSteps: ['validateRequest']
      },
      contextDescription: 'Workflow entry point that activates when a request is submitted. Use requestType parameter to filter specific request (use the api definition to get the values) types or leave as "all" for any request'
    },

    tags: ['trigger', 'request', 'workflow-start']
  },

  {
    id: 'trigger_on_mrf',
    type: 'trigger',
    trigger: '@',
    name: 'onMRF',
    label: 'On receiving a meeting request form (MRF)',
    description: 'Trigger workflow when an MRF (Meeting Request Form) is submitted',
    examples: ['@onMRF for MRF template'],
    isAutocomplete: true,
    isWorkflowDefinition: true,
    parameters: [
      {
        name: 'mrfTemplateName',
        label: 'MRF Template Name',
        type: 'select',
        description: 'Specific MRF template to trigger on (optional - defaults to all)',
        required: false,
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All MRF Templates', description: 'Trigger on any MRF submission' },
          { endpoint: '/api/mrf-templates', method: 'GET', responseMapping: { valueField: 'id', labelField: 'name' } },
        ]
      }
    ],
    outputs: { nextSteps: true },
    llmInstructions: {
      usage: 'Use as workflow trigger step when workflow should start on MRF submission. CRITICAL: This must be used as type "trigger" step only',
      jsonExample: {
        params: {
          mrfTemplateName: 'conference'
        },
        nextSteps: ['requestApproval']
      },
      contextDescription: 'Workflow entry point that activates when an MRF is submitted. Use mrfTemplateName parameter to filter specific MRF templates or leave as "all" for any MRF submission'
    },

    tags: ['trigger', 'mrf', 'workflow-start', 'event']
  },

  // ACTION FUNCTIONS
  {
    id: 'sendEmail',
    type: 'action',
    trigger: '@',
    name: 'sendEmail',
    label: 'Send Email',
    description: 'Send an email notification to specified recipients',
    examples: ['@sendEmail to manager', '@sendEmail notification to team'],
    isAutocomplete: true,
    isWorkflowDefinition: true,
    parameters: [
      {
        name: 'to',
        label: 'To',
        type: 'string',
        description: 'Primary recipient email address',
        required: true,
        placeholder: 'recipient@company.com',
        validation: { pattern: '^[^@]+@[^@]+\.[^@]+$' }
      },
      {
        name: 'cc',
        label: 'CC',
        type: 'string',
        description: 'CC recipients (optional)',
        required: false,
        placeholder: 'cc@company.com'
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'string',
        description: 'Email subject line',
        required: true,
        placeholder: 'Workflow Notification',
        validation: { maxLength: 200 }
      },
      {
        name: 'templateName',
        label: 'Template Name',
        type: 'select',
        description: 'Email template to use',
        required: true,
        options: { endpoint: '/api/email-templates', method: 'GET', responseMapping: { valueField: 'id', labelField: 'name' } }
      }
    ],
    outputs: { nextSteps: false, end: false },
    llmInstructions: {
      usage: 'Use in workflow action steps to send email notifications',
      jsonExample: {
        params: {
          to: 'manager@company.com',
          subject: 'Request for approval for exceptional case',
          template: 'approval_request'
        },
        outputs: { end: true }
      },
      contextDescription: 'Sends email notifications to specified recipients using predefined templates'
    },
    tags: ['communication', 'notification']
  },

  {
    id: 'fn_request_approval',
    type: 'condition',
    trigger: '@',
    name: 'requestApproval',
    label: 'Request for approval',
    description: 'Request approval from designated approvers',
    examples: ['@requestApproval from manager for budget', '@requestApproval from team lead'],
    isAutocomplete: true,
    isWorkflowDefinition: true,
    parameters: [
      {
        name: 'approver',
        label: 'Approver',
        type: 'api',
        description: 'Select approver from directory',
        required: true,
        api: {
          endpoint: '/api/users/approvers',
          method: 'GET',
          responseMapping: { valueField: 'id', labelField: 'displayName' }
        }
      },
      {
        name: 'reason',
        label: 'Reason',
        type: 'string',
        description: 'Reason for approval request',
        required: true,
        placeholder: 'Budget exceeds threshold',
        validation: { maxLength: 500 }
      }
    ],
    outputs: { onConditionPass: true, onConditionFail: true, onTimeout: false },
    llmInstructions: {
      usage: 'Use in workflow condition steps to request approvals from designated users. Supports enhanced condition outputs: onApproval/onYes and onReject/onNo',
      jsonExample: {
        params: {
          approver: '${manager}',
          reason: 'Budget exceeds department threshold'
        },
        onConditionPass: '#createEvent',
        onConditionFail: '#notifyRejection',
      },
      contextDescription: 'Initiates approval workflow with designated approvers and tracks approval status. Supports multiple output paths: onSuccess/onFailure (standard), onApproval/onYes (approved), onReject/onNo (rejected)'
    },
    tags: ['approval', 'workflow', 'governance']
  },

  {
    id: 'fn_branch_workflow',
    type: 'split',
    trigger: '@',
    name: 'branch',
    label: 'Branch/Split Workflow',
    description: 'Split workflow into multiple parallel execution paths',
    examples: ['@branchWorkflow to parallel approval and notification', '@branchWorkflow for concurrent processing'],
    isAutocomplete: true,
    isWorkflowDefinition: true,
    parameters: [],
    outputs: { nextSteps: true },
    llmInstructions: {
      usage: 'Use to create parallel execution paths in workflows. Can branch to multiple steps simultaneously',
      jsonExample: {
        params: {},
        nextSteps: ['approvalStep', 'notificationStep', 'auditStep']
      },
      contextDescription: 'Splits workflow execution into parallel branches. Use when multiple independent processes need to run simultaneously'
    },
    tags: ['branching', 'parallel', 'workflow', 'split']
  },

  {
    id: 'fn_merge_workflow',
    type: 'merge',
    trigger: '@',
    name: 'mergeWorkflow',
    label: 'Merge/Join Workflow',
    description: 'Wait for multiple workflow steps to complete before proceeding',
    examples: ['@mergeWorkflow wait for approvals', '@mergeWorkflow join parallel processes'],
    isAutocomplete: true,
    isWorkflowDefinition: true,
    parameters: [
      {
        name: 'waitForSteps',
        label: 'Wait For Steps',
        type: 'string',
        description: 'Comma-separated list of step names to wait for completion',
        required: true,
        placeholder: 'approvalStep,validationStep,securityReview'
      },
      {
        name: 'waitForAll',
        label: 'Require all to complete',
        type: 'select',
        description: 'Require all steps to succeed or accept partial success',
        required: true,
        defaultValue: 'true',
        options: [
          { value: 'true', label: 'All Must Succeed', description: 'All waited steps must complete successfully' },
          { value: 'false', label: 'Partial Success OK', description: 'Proceed if any step succeeds' }
        ]
      },
      {
        name: 'timeout',
        label: 'Timeout',
        type: 'number',
        description: 'Maximum wait time in minutes',
        required: false,
        placeholder: '60',
        validation: { min: 1, max: 1440 }
      }
    ],
    outputs: { nextSteps: true },
    llmInstructions: {
      usage: 'Use to synchronize multiple parallel workflow branches. Waits for specified steps to complete before proceeding',
      jsonExample: {
        params: {
          waitForSteps: ['managerApproval', 'budgetValidation', 'securityReview'],
          waitForAll: true,
          timeout: 120
        },
        nextSteps: ['proceedWithProcess']
      },
      contextDescription: 'Merges parallel workflow branches by waiting for multiple steps to complete. Essential for synchronization in complex workflows'
    },
    tags: ['merging', 'synchronization', 'workflow', 'join']
  },

  {
    id: 'fn_create_event',
    type: 'action',
    trigger: '@',
    name: 'createEvent',
    label: 'Create event',
    description: 'Create an event for a meeting',
    examples: ['@createEvent for team meeting', '@createEvent for board meeting'],
    isAutocomplete: true,
    isWorkflowDefinition: true,
    parameters: [],
    outputs: { nextSteps: false, end: false },
    llmInstructions: {
      usage: 'Use in workflow action steps to create calendar events and schedule meetings',
      jsonExample: {
        params: {},
        nextSteps: ['sendEmail']
      },
      contextDescription: 'Creates calendar events and sends meeting invitations to specified attendees'
    },
    tags: ['calendar', 'meeting', 'scheduling']
  },
  // Conditions
  {
    id: 'fn_condition',
    type: 'condition',
    trigger: '@',
    name: 'condition',
    label: 'Decision Point',
    description: 'Advanced condition with multiple output paths for complex decision making',
    examples: [],
    isAutocomplete: false,
    isWorkflowDefinition: true,
    parameters: [
      {
        name: 'condition',
        label: 'Condition',
        type: 'string',
        description: 'json-rules-engine condition as JSON string',
        required: true,
        placeholder: '{ "fact": "user.role", "operator": "equal", "value": "manager" }'
      },
    ],
    outputs: { onConditionPass: true, onConditionFail: true },
    llmInstructions: {
      usage: 'Use for simple if then else conditions definitions',
      jsonExample: {
        params: {
          condition: {
            any: [
              { fact: '${age}', operator: 'greaterThan', value: 18 },
              {
                all: [
                  { fact: '${budget}', operator: 'greaterThan', value: 1000 },
                  { fact: '${role}', operator: 'notEqual', value: 'manager' }
                ]
              }
            ]
          }
        },
        onConditionPass: 'createEvent',
        onConditionFail: 'notifyUser',
      },
      contextDescription: 'Condition step depicting a typical if then else condition. Use for simple success failure situations'
    },
    tags: ['condition', 'decision', 'advanced', 'routing']
  },
  // {
  //   id: 'fn_enhanced_condition',
  //   type: 'conditionalSplit',
  //   trigger: '@',
  //   name: 'enhancedCondition',
  //   label: 'Enhanced Decision Point',
  //   description: 'Advanced condition with multiple output paths for based on a value',
  //   examples: ['@enhancedCondition based off departement'],
  //   isAutocomplete: false,
  //   isWorkflowDefinition: true,
  //   parameters: [
  //     {
  //       name: 'condition',
  //       label: 'Condition',
  //       type: 'string',
  //       description: 'json-rules-engine condition as JSON string',
  //       required: true,
  //       placeholder: '{ "fact": "user.role", "operator": "equal", "value": "manager" }'
  //     },
  //     {
  //       name: 'outputs',
  //       label: 'Outputs',
  //       type: 'string',
  //       description: 'Multiple output paths as JSON',
  //       required: true,
  //       placeholder: '{ "onConditionPass": "successStep", "onConditionFail": "failureStep" }'
  //     }
  //   ],
  //   outputs: { },
  //   llmInstructions: {
  //     usage: 'Use for complex decision points that need multiple output paths beyond simple success/failure',
  //     jsonExample: {
  //       action: 'fnEnhancedCondition',
  //       condition: {
  //         any: [
  //           { fact: 'user.age', operator: 'greaterThan', value: 18 },
  //           {
  //             all: [
  //               { fact: 'mrf.budget', operator: 'greaterThan', value: 1000 },
  //               { fact: 'user.role', operator: 'notEqual', value: 'manager' }
  //             ]
  //           }
  //         ]
  //       },
  //       onSuccess: 'createEvent',
  //       onFailure: 'notifyUser',
  //     },
  //     contextDescription: 'Advanced condition step supporting multiple output paths for nuanced workflow control. Use when simple success/failure is not sufficient'
  //   },
  //   tags: ['condition', 'decision', 'advanced', 'routing']
  // },
  // USER CONTEXT VARIABLES
  {
    id: 'user_first_name',
    type: 'variable',
    trigger: '@',
    name: '${firstName}',
    label: 'First Name',
    description: 'User first name',
    examples: ['@firstName in email greeting', 'if @firstName equals "John"'],
    dataType: 'string',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Reference users first name in conditions, actions, parameter values or templates',
      jsonExample: {},
      contextDescription: 'Current user first name for personalization and conditional logic, or parameter values'
    },
    tags: ['user', 'personal', 'identity']
  },
  {
    id: 'user_last_name',
    type: 'variable',
    trigger: '@',
    name: '${lastName}',
    label: 'Last Name',
    description: 'User last name',
    examples: ['@lastName in email greeting', 'if @lastName equals "Doe"'],
    dataType: 'string',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Reference users last name in conditions, actions, parameter values or templates',
      jsonExample: {},
      contextDescription: 'Current user last name for personalization and conditional logic, or parameter values'
    },
    tags: ['user', 'personal', 'identity']
  },
  {
    id: 'user_name',
    type: 'variable',
    trigger: '@',
    name: '${name}',
    label: 'Name',
    description: 'User name',
    examples: ['@name in email greeting', 'if @name equals "Doe"'],
    dataType: 'string',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Reference users name in conditions, actions, parameter values or templates',
      jsonExample: {},
      contextDescription: 'Current user name for personalization and conditional logic, or parameter values'
    },
    tags: ['user', 'personal', 'identity']
  },
  {
    id: 'user_email',
    type: 'variable',
    trigger: '@',
    name: '${email}',
    label: 'Email Address',
    description: 'User primary email address',
    examples: ['@email for notifications', 'send to @email'],
    dataType: 'string',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Use user email for notifications, conditions, or recipient targeting',
      jsonExample: {},
      contextDescription: 'Current user primary email address for communication and filtering or parameter values'
    },
    tags: ['user', 'contact', 'communication']
  },

  {
    id: 'user_department',
    type: 'variable',
    trigger: '@',
    name: '${department}',
    label: 'Department',
    description: 'User department or division',
    examples: ['@department for routing', 'if @department is Engineering'],
    dataType: 'string',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Use department for conditional routing and approval workflows',
      jsonExample: {},
      contextDescription: 'Current user department for organizational routing and permissions or parameter values'
    },
    tags: ['user', 'organization', 'routing']
  },
  {
    id: 'user_role',
    type: 'variable',
    trigger: '@',
    name: '${role}',
    label: 'Role/Title',
    description: 'User job role or title',
    examples: ['@role for permissions', 'if @role is Manager'],
    dataType: 'string',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Use role for permission checks and workflow routing',
      jsonExample: {},
      contextDescription: 'Current user role for permission-based workflow decisions or parameter values'
    },
    tags: ['user', 'permissions', 'authorization']
  },
  {
    id: 'user_manager',
    type: 'variable',
    trigger: '@',
    name: '${manager}',
    label: 'Manager',
    description: 'User manager or supervisor',
    examples: ['@manager for approval', 'if @manager is John'],
    dataType: 'string',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Use manager for approval checks and workflow routing',
      jsonExample: {},
      contextDescription: 'Current user manager for approval-based workflow decisions or parameter values'
    },
    tags: ['user', 'permissions', 'authorization']
  },
  // DATE FUNCTIONS
  {
    id: 'date_now',
    type: 'variable',
    trigger: '@',
    name: '$now',
    label: 'Current Date/Time',
    description: 'Current date and time',
    examples: ['@now for timestamps', 'if @now is after deadline'],
    dataType: 'date',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Use for timestamp comparisons and current date references',
      jsonExample: {},
      contextDescription: 'Current system date and time for temporal logic and comparisons or parameter values'
    },
    tags: ['date', 'time', 'current']
  },

  {
    id: 'date_today',
    type: 'variable',
    trigger: '@',
    name: '$today',
    label: 'Today (Date Only)',
    description: 'Today date without time component',
    examples: ['@today for date comparisons', 'if @today is weekend'],
    dataType: 'date',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Use for date-only comparisons without time component',
      jsonExample: {},
      contextDescription: 'Current date without time for date-based workflow logic or parameter values'
    },
    tags: ['date', 'current', 'comparison']
  },
  // FORM FIELD REFERENCES
  {
    id: 'form_field',
    type: 'variable',
    trigger: '@',
    name: 'formField',
    label: 'Form Field',
    description: 'Reference to form field values',
    examples: ['@eventType for routing', '@budget for approval'],
    dataType: 'string',
    isAutocomplete: true,
    isWorkflowDefinition: true,
    outputs: {},
    llmInstructions: {
      usage: 'Reference form field values in workflow conditions and actions',
      jsonExample: {},
      contextDescription: 'Form field values submitted by user for workflow processing or parameter values'
    },
    tags: ['form', 'input', 'data']
  },

];

const OUTPUT_KEYS = [
  'nextSteps',
  'onConditionPass',
  'onConditionFail',
  'onTimeout',
] as const;

workflowConversationAutocomplete.forEach((item) => {
  // Normalize the llm json example to reflect the canonical item definition
  const example = item.llmInstructions?.jsonExample as Record<string, unknown> | undefined;
  if (example) {
    // Ensure the example type matches the item.type
    if (typeof item.type === 'string') {
      example['type'] = item.type;
    }

    // Ensure the example action matches the item.name
    if (typeof item.name === 'string') {
      example['action'] = item.name;
    }

  }

  if (!item.outputs) {
    if (example) {
      const derivedOutputs = OUTPUT_KEYS.reduce<Record<string, unknown>>((acc, key) => {
        if (key in example) {
          acc[key] = example[key];
        }
        return acc;
      }, {});

      if (Object.keys(derivedOutputs).length > 0) {
        item.outputs = derivedOutputs;
      }
    }
  }
});

// Helper functions for categorized access
export const getFunctionAutocomplete = () =>
  workflowConversationAutocomplete.filter(item => ['trigger', 'action', 'condition', 'split', 'merge', 'conditionalSplit', 'workflowReference'].includes(item.type));

export const getTriggerFunctionAutocomplete = () =>
  workflowConversationAutocomplete.filter(item =>
    item.type === 'trigger' &&
    (item.name === 'onRequest' || item.name === 'onMRF' || item.tags?.includes('trigger')));

export const getActionFunctionAutocomplete = () =>
  workflowConversationAutocomplete.filter(item =>
    item.type === 'action' &&
    !item.tags?.includes('trigger'));

export const getUserContextAutocomplete = () =>
  workflowConversationAutocomplete.filter(item => item.type === 'userContext');

export const getDateFunctionAutocomplete = () =>
  workflowConversationAutocomplete.filter(item => item.type === 'dateFunction');

export const getFormFieldAutocomplete = () =>
  workflowConversationAutocomplete.filter(item => item.type === 'fieldReference');

export const getStepReferenceAutocomplete = () =>
  workflowConversationAutocomplete.filter(item => item.type === 'stepReference');

// Get autocomplete by trigger
export const getAutocompleteByTrigger = (trigger: string) =>
  workflowConversationAutocomplete.filter(item => item.trigger === trigger);

// Get all available for LLM context
export const getLLMContext = () =>
  workflowConversationAutocomplete.map(item => {
    const jsonExample = item.llmInstructions.jsonExample as Record<string, unknown>;

    // Merge declared outputs from the item definition (booleans indicating required/optional)
    // with any outputs present in the example. Build the outputs map from the union of
    // keys present in either the definition or the example.
    const definitionOutputs = (item.outputs ?? {}) as Record<string, unknown>;
    const exampleKeys = jsonExample ? Object.keys(jsonExample) : [];
    const defKeys = Object.keys(definitionOutputs);
    const allKeys = Array.from(new Set([...defKeys, ...exampleKeys]));

    const outputs = allKeys.reduce<Record<string, { required: boolean; example?: unknown }>>((acc, key) => {
      const hasExample = key in jsonExample;
      const exampleValue = hasExample ? jsonExample[key] : undefined;
      const defValue = key in definitionOutputs ? Boolean(definitionOutputs[key]) : undefined;

      if (hasExample || defValue !== undefined) {
        acc[key] = {
          required: Boolean(defValue),
        };

        if (hasExample) {
          acc[key].example = exampleValue;
        }
      }

      return acc;
    }, {});

    const supportedOutputs = Object.keys(outputs);

    return {
      name: item.name,
      type: item.type,
      description: item.description,
      usage: item.llmInstructions.usage,
      supportedOutputs: supportedOutputs.length > 0 ? supportedOutputs : undefined,
      contextDescription: item.llmInstructions.contextDescription,
      example: item.llmInstructions.jsonExample,
      outputs: Object.keys(outputs).length > 0 ? outputs : undefined,
      parameters: item.parameters?.map(p => ({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
        options: p.options,
        validation: p.validation
      }))
    };
  });