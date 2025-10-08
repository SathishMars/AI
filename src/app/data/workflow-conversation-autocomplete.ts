// src/app/data/workflow-conversation-autocomplete.ts

import { WorkflowConversationAutocomplete } from '@/app/types/workflow-conversation-autocomplete';

export const workflowConversationAutocomplete: WorkflowConversationAutocomplete = [
  // TRIGGER FUNCTIONS
  {
    id: 'trigger_on_request',
    category: 'function',
    trigger: '@',
    name: 'onRequest',
    displayName: 'On Request Trigger',
    description: 'Trigger workflow when a request is submitted',
    examples: ['@onRequest for any request type', '@onRequest for budget requests'],
    parameters: [
      {
        name: 'requestType',
        type: 'select',
        description: 'Type of request to trigger on (optional - defaults to all)',
        required: false,
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All Request Types', description: 'Trigger on any request submission' },
          { value: 'budget', label: 'Budget Request', description: 'Trigger only on budget requests' },
          { value: 'approval', label: 'Approval Request', description: 'Trigger only on approval requests' },
          { value: 'resource', label: 'Resource Request', description: 'Trigger only on resource requests' },
          { value: 'access', label: 'Access Request', description: 'Trigger only on access requests' },
          { value: 'support', label: 'Support Request', description: 'Trigger only on support requests' }
        ]
      }
    ],
    llmInstructions: {
      usage: 'Use as workflow trigger step when workflow should start on request submission. CRITICAL: This must be used as type "trigger" step only',
      jsonExample: {
        type: 'trigger',
        action: 'onRequest',
        params: {
          requestType: 'budget'
        },
        nextSteps: ['validateRequest']
      },
      contextDescription: 'Workflow entry point that activates when a request is submitted. Use requestType parameter to filter specific request types or leave as "all" for any request'
    },
    icon: '🔔',
    color: '#2196f3',
    tags: ['trigger', 'request', 'workflow-start']
  },

  {
    id: 'trigger_on_mrf',
    category: 'function',
    trigger: '@',
    name: 'onMRF',
    displayName: 'On MRF Submission Trigger',
    description: 'Trigger workflow when an MRF (Meeting Request Form) is submitted',
    examples: ['@onMRF for any MRF template', '@onMRF for conference templates'],
    parameters: [
      {
        name: 'mrfTemplateName',
        type: 'select',
        description: 'Specific MRF template to trigger on (optional - defaults to all)',
        required: false,
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All MRF Templates', description: 'Trigger on any MRF submission' },
          { value: 'conference', label: 'Conference Event', description: 'Trigger only on conference MRF submissions' },
          { value: 'meeting', label: 'Regular Meeting', description: 'Trigger only on meeting MRF submissions' },
          { value: 'training', label: 'Training Event', description: 'Trigger only on training MRF submissions' },
          { value: 'social', label: 'Social Event', description: 'Trigger only on social event MRF submissions' },
          { value: 'external', label: 'External Event', description: 'Trigger only on external event MRF submissions' }
        ]
      }
    ],
    llmInstructions: {
      usage: 'Use as workflow trigger step when workflow should start on MRF submission. CRITICAL: This must be used as type "trigger" step only',
      jsonExample: {
        type: 'trigger',
        action: 'onMRF',
        params: {
          mrfTemplateName: 'conference'
        },
        nextSteps: ['checkEventRequirements']
      },
      contextDescription: 'Workflow entry point that activates when an MRF is submitted. Use mrfTemplateName parameter to filter specific MRF templates or leave as "all" for any MRF submission'
    },
    icon: '📋',
    color: '#4caf50',
    tags: ['trigger', 'mrf', 'workflow-start', 'event']
  },

  // ACTION FUNCTIONS
  {
    id: 'sendEmail',
    category: 'function',
    trigger: '@',
    name: 'sendEmail',
    displayName: 'Send Email',
    description: 'Send an email notification to specified recipients',
    examples: ['@sendEmail to manager when approval needed', '@sendEmail notification to team'],
    parameters: [
      {
        name: 'to',
        type: 'email',
        description: 'Primary recipient email address',
        required: true,
        placeholder: 'recipient@company.com',
        validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' }
      },
      {
        name: 'cc',
        type: 'email',
        description: 'CC recipients (optional)',
        required: false,
        placeholder: 'cc@company.com'
      },
      {
        name: 'subject',
        type: 'text',
        description: 'Email subject line',
        required: true,
        placeholder: 'Workflow Notification',
        validation: { maxLength: 200 }
      },
      {
        name: 'template',
        type: 'select',
        description: 'Email template to use',
        required: true,
        options: [
          { value: 'approval_request', label: 'Approval Request', description: 'Request approval from manager' },
          { value: 'notification', label: 'General Notification', description: 'General workflow notification' },
          { value: 'completion', label: 'Completion Notice', description: 'Workflow completion notification' },
          { value: 'failure', label: 'Failure Alert', description: 'Workflow failure alert' }
        ]
      }
    ],
    llmInstructions: {
      usage: 'Use in workflow action steps to send email notifications',
      jsonExample: {
        type: 'action',
        action: 'fnSendEmail',
        params: {
          to: 'manager@company.com',
          subject: 'Approval Required',
          template: 'approval_request'
        }
      },
      contextDescription: 'Sends email notifications to specified recipients using predefined templates'
    },
    icon: '📧',
    color: '#1976d2',
    tags: ['communication', 'notification']
  },

  {
    id: 'fn_request_approval',
    category: 'function',
    trigger: '@',
    name: 'requestApproval',
    displayName: 'Request Approval',
    description: 'Request approval from designated approvers',
    examples: ['@requestApproval from manager for budget', '@requestApproval from team lead'],
    parameters: [
      {
        name: 'approver',
        type: 'api',
        description: 'Select approver from directory',
        required: true,
        apiEndpoint: '/api/users/approvers',
        apiValueField: 'id',
        apiLabelField: 'displayName'
      },
      {
        name: 'reason',
        type: 'text',
        description: 'Reason for approval request',
        required: true,
        placeholder: 'Budget exceeds threshold',
        validation: { maxLength: 500 }
      },
      {
        name: 'urgency',
        type: 'select',
        description: 'Approval urgency level',
        required: true,
        defaultValue: 'normal',
        options: [
          { value: 'low', label: 'Low Priority', description: '5+ business days' },
          { value: 'normal', label: 'Normal Priority', description: '2-3 business days' },
          { value: 'high', label: 'High Priority', description: 'Within 24 hours' },
          { value: 'urgent', label: 'Urgent', description: 'Within 4 hours' }
        ]
      }
    ],
    llmInstructions: {
      usage: 'Use in workflow condition steps to request approvals from designated users. Supports enhanced condition outputs: onApproval/onYes and onReject/onNo',
      jsonExample: {
        type: 'condition',
        action: 'fnRequestApproval',
        params: {
          approver: 'user_123',
          reason: 'Budget exceeds department threshold',
          urgency: 'normal'
        },
        onApproval: '#createEvent',
        onReject: '#notifyRejection',
      },
      contextDescription: 'Initiates approval workflow with designated approvers and tracks approval status. Supports multiple output paths: onSuccess/onFailure (standard), onApproval/onYes (approved), onReject/onNo (rejected)'
    },
    icon: '✅',
    color: '#4caf50',
    tags: ['approval', 'workflow', 'governance']
  },

  {
    id: 'fn_branch_workflow',
    category: 'function', 
    trigger: '@',
    name: 'branchWorkflow',
    displayName: 'Branch/Split Workflow',
    description: 'Split workflow into multiple parallel execution paths',
    examples: ['@branchWorkflow to parallel approval and notification', '@branchWorkflow for concurrent processing'],
    parameters: [
      {
        name: 'branches',
        type: 'text',
        description: 'Comma-separated list of step names to execute in parallel',
        required: true,
        placeholder: 'approvalStep,notificationStep,auditStep'
      },
      {
        name: 'waitForAll',
        type: 'select',
        description: 'Wait for all branches or continue on first completion',
        required: true,
        defaultValue: 'true',
        options: [
          { value: 'true', label: 'Wait for All', description: 'Wait for all parallel branches to complete' },
          { value: 'false', label: 'First Completion', description: 'Continue when first branch completes' }
        ]
      },
      {
        name: 'mergeStep',
        type: 'text',
        description: 'Step to execute after branches complete',
        required: false,
        placeholder: 'mergeResults'
      }
    ],
    llmInstructions: {
      usage: 'Use to create parallel execution paths in workflows. Can branch to multiple steps simultaneously',
      jsonExample: {
        type: 'action',
        action: 'branchWorkflow',
        params: {
          waitForAll: true,
          mergeStep: 'consolidateResults'
        },
        nextSteps: ['approvalStep', 'notificationStep', 'auditStep']
      },
      contextDescription: 'Splits workflow execution into parallel branches. Use when multiple independent processes need to run simultaneously'
    },
    icon: '🌟',
    color: '#9c27b0',
    tags: ['branching', 'parallel', 'workflow', 'split']
  },

  {
    id: 'fn_merge_workflow',
    category: 'function',
    trigger: '@',
    name: 'mergeWorkflow', 
    displayName: 'Merge/Join Workflow',
    description: 'Wait for multiple workflow steps to complete before proceeding',
    examples: ['@mergeWorkflow wait for approvals', '@mergeWorkflow join parallel processes'],
    parameters: [
      {
        name: 'waitForSteps',
        type: 'text',
        description: 'Comma-separated list of step names to wait for completion',
        required: true,
        placeholder: 'approvalStep,validationStep,securityReview'
      },
      {
        name: 'requireAllSuccess',
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
        type: 'number',
        description: 'Maximum wait time in minutes',
        required: false,
        placeholder: '60',
        validation: { min: 1, max: 1440 }
      }
    ],
    llmInstructions: {
      usage: 'Use to synchronize multiple parallel workflow branches. Waits for specified steps to complete before proceeding',
      jsonExample: {
        type: 'action', 
        action: 'mergeWorkflow',
        params: {
          waitForSteps: ['managerApproval', 'budgetValidation', 'securityReview'],
          requireAllSuccess: true,
          timeout: 120
        },
        nextSteps: ['proceedWithProcess']
      },
      contextDescription: 'Merges parallel workflow branches by waiting for multiple steps to complete. Essential for synchronization in complex workflows'
    },
    icon: '🔄',
    color: '#4caf50',
    tags: ['merging', 'synchronization', 'workflow', 'join']
  },

  {
    id: 'fn_create_event',
    category: 'function',
    trigger: '@',
    name: 'createEvent',
    displayName: 'Create Event',
    description: 'Create a calendar event or meeting',
    examples: ['@createEvent for team meeting', '@createEvent reminder for deadline'],
    parameters: [],
    llmInstructions: {
      usage: 'Use in workflow action steps to create calendar events and schedule meetings',
      jsonExample: {
        type: 'action',
        action: 'fnCreateEvent',
        params: {},
        nextSteps: ['sendInvites']
      },
      contextDescription: 'Creates calendar events and sends meeting invitations to specified attendees'
    },
    icon: '📅',
    color: '#ff9800',
    tags: ['calendar', 'meeting', 'scheduling']
  },

  // USER CONTEXT VARIABLES
  {
    id: 'user_first_name',
    category: 'userContext',
    trigger: 'user.',
    name: 'firstName',
    displayName: 'First Name',
    description: 'User first name',
    examples: ['user.firstName in email greeting', 'if user.firstName equals "John"'],
    dataType: 'string',
    llmInstructions: {
      usage: 'Reference user first name in conditions, actions, or templates',
      jsonExample: {
        fact: 'user.firstName',
        operator: 'equal',
        value: 'John'
      },
      contextDescription: 'Current user first name for personalization and conditional logic'
    },
    icon: '👤',
    color: '#2196f3',
    tags: ['user', 'personal', 'identity']
  },

  {
    id: 'user_email',
    category: 'userContext',
    trigger: 'user.',
    name: 'email',
    displayName: 'Email Address',
    description: 'User primary email address',
    examples: ['user.email for notifications', 'send to user.email'],
    dataType: 'string',
    llmInstructions: {
      usage: 'Use user email for notifications, conditions, or recipient targeting',
      jsonExample: {
        fact: 'user.email',
        operator: 'contains',
        value: '@company.com'
      },
      contextDescription: 'Current user primary email address for communication and filtering'
    },
    icon: '📧',
    color: '#2196f3',
    tags: ['user', 'contact', 'communication']
  },

  {
    id: 'user_department',
    category: 'userContext',
    trigger: 'user.',
    name: 'department',
    displayName: 'Department',
    description: 'User department or division',
    examples: ['user.department for routing', 'if user.department is Engineering'],
    dataType: 'string',
    llmInstructions: {
      usage: 'Use department for conditional routing and approval workflows',
      jsonExample: {
        fact: 'user.department',
        operator: 'equal',
        value: 'Engineering'
      },
      contextDescription: 'Current user department for organizational routing and permissions'
    },
    icon: '🏢',
    color: '#2196f3',
    tags: ['user', 'organization', 'routing']
  },
  {
    id: 'user_role',
    category: 'userContext',
    trigger: 'user.',
    name: 'role',
    displayName: 'Role/Title',
    description: 'User job role or title',
    examples: ['user.role for permissions', 'if user.role is Manager'],
    dataType: 'string',
    llmInstructions: {
      usage: 'Use role for permission checks and workflow routing',
      jsonExample: {
        fact: 'user.role',
        operator: 'in',
        value: ['Manager', 'Director', 'VP']
      },
      contextDescription: 'Current user role for permission-based workflow decisions'
    },
    icon: '👔',
    color: '#2196f3',
    tags: ['user', 'permissions', 'authorization']
  },
  {
    id: 'user_manager',
    category: 'userContext',
    trigger: 'user.',
    name: 'manager',
    displayName: 'Manager',
    description: 'User manager or supervisor',
    examples: ['user.manager for approval', 'if user.manager is John'],
    dataType: 'string',
    llmInstructions: {
      usage: 'Use manager for approval checks and workflow routing',
      jsonExample: {
        fact: 'user.manager',
        operator: 'in',
        value: ['Manager', 'Director', 'VP']
      },
      contextDescription: 'Current user manager for approval-based workflow decisions'
    },
    icon: '👔',
    color: '#2196f3',
    tags: ['user', 'permissions', 'authorization']
  },
  // DATE FUNCTIONS
  {
    id: 'date_now',
    category: 'dateFunction',
    trigger: 'date.',
    name: 'now',
    displayName: 'Current Date/Time',
    description: 'Current date and time',
    examples: ['date.now for timestamps', 'if date.now is after deadline'],
    dataType: 'date',
    llmInstructions: {
      usage: 'Use for timestamp comparisons and current date references',
      jsonExample: {
        fact: 'date.now',
        operator: 'greaterThan',
        value: 'form.deadline'
      },
      contextDescription: 'Current system date and time for temporal logic and comparisons'
    },
    icon: '🕐',
    color: '#9c27b0',
    tags: ['date', 'time', 'current']
  },

  {
    id: 'date_today',
    category: 'dateFunction',
    trigger: 'date.',
    name: 'today',
    displayName: 'Today (Date Only)',
    description: 'Today date without time component',
    examples: ['date.today for date comparisons', 'if date.today is weekend'],
    dataType: 'date',
    llmInstructions: {
      usage: 'Use for date-only comparisons without time component',
      jsonExample: {
        fact: 'date.today',
        operator: 'equal',
        value: 'form.eventDate'
      },
      contextDescription: 'Current date without time for date-based workflow logic'
    },
    icon: '📅',
    color: '#9c27b0',
    tags: ['date', 'current', 'comparison']
  },

  {
    id: 'date_add_days',
    category: 'dateFunction',
    trigger: 'date.',
    name: 'addDays',
    displayName: 'Add Days',
    description: 'Add specified number of days to a date',
    examples: ['date.addDays(7) for next week', 'date.addDays(form.days)'],
    dataType: 'date',
    parameters: [
      {
        name: 'days',
        type: 'number',
        description: 'Number of days to add',
        required: true,
        validation: { min: 0, max: 365 }
      },
      {
        name: 'fromDate',
        type: 'date',
        description: 'Starting date (defaults to when the action runs)',
        required: false
      }
    ],
    llmInstructions: {
      usage: 'Calculate future dates by adding days',
      jsonExample: {
        fact: 'date.addDays',
        params: { days: 7, fromDate: 'date.actionDate' },
        operator: 'lessThan',
        value: 'form.deadline'
      },
      contextDescription: 'Date arithmetic for calculating deadlines and future dates'
    },
    icon: '➕',
    color: '#9c27b0',
    tags: ['date', 'calculation', 'future']
  },

  // FORM FIELD REFERENCES
  {
    id: 'form_field',
    category: 'formField',
    trigger: 'form.',
    name: 'formField',
    displayName: 'Form Field',
    description: 'Reference to form field values',
    examples: ['form.eventType for routing', 'form.budget for approval'],
    dataType: 'string',
    llmInstructions: {
      usage: 'Reference form field values in workflow conditions and actions',
      jsonExample: {
        fact: 'form.eventType',
        operator: 'equal',
        value: 'Conference'
      },
      contextDescription: 'Form field values submitted by user for workflow processing'
    },
    icon: '📝',
    color: '#4caf50',
    tags: ['form', 'input', 'data']
  },

  {
    id: 'fn_enhanced_condition',
    category: 'function',
    trigger: '@',
    name: 'enhancedCondition',
    displayName: 'Enhanced Decision Point',
    description: 'Advanced condition with multiple output paths for complex decision making',
    examples: ['@enhancedCondition for approval workflow', '@enhancedCondition for multi-path routing'],
    parameters: [
      {
        name: 'condition',
        type: 'text',
        description: 'json-rules-engine condition as JSON string',
        required: true,
        placeholder: '{ "fact": "user.role", "operator": "equal", "value": "manager" }'
      },
      {
        name: 'outputs',
        type: 'text',
        description: 'Multiple output paths as JSON (onSuccess, onFailure, onApproval, onYes, onReject, onNo)',
        required: true,
        placeholder: '{ "onSuccess": "successStep", "onFailure": "failureStep" }'
      }
    ],
    llmInstructions: {
      usage: 'Use for complex decision points that need multiple output paths beyond simple success/failure',
      jsonExample: {
        type: 'condition',
        action: 'fnEnhancedCondition',
        condition: {
          any:[
            { fact: 'user.age', operator: 'greaterThan', value: 18 },
            {  all: [
              { fact: 'mrf.budget', operator: 'greaterThan', value: 1000 },
              { fact: 'user.role', operator: 'notEqual', value: 'manager' }
            ]}
          ]
        },
        onSuccess: 'createEvent',
        onFailure: 'notifyUser',
      },
      contextDescription: 'Advanced condition step supporting multiple output paths for nuanced workflow control. Use when simple success/failure is not sufficient'
    },
    icon: '🎯',
    color: '#ff5722',
    tags: ['condition', 'decision', 'advanced', 'routing']
  },
];

const OUTPUT_KEYS = [
  'nextSteps',
  'onApproval',
  'onReject',
  'onSuccess',
  'onFailure',
  'onSuccessGoTo',
  'onFailureGoTo',
  'onYes',
  'onNo'
] as const;

workflowConversationAutocomplete.forEach((item) => {
  if (!item.workflowStepType) {
    const exampleType = (item.llmInstructions.jsonExample as Record<string, unknown> | undefined)?.['type'];
    if (
      typeof exampleType === 'string' &&
      ['trigger', 'action', 'condition', 'workflow', 'end'].includes(exampleType)
    ) {
      item.workflowStepType = exampleType as 'trigger' | 'action' | 'condition' | 'workflow' | 'end';
    }
  }

  if (!item.llmUsageInstructions) {
    item.llmUsageInstructions = item.llmInstructions.usage;
  }

  if (!item.llmJsonExample) {
    item.llmJsonExample = item.llmInstructions.jsonExample;
  }

  if (!item.outputs) {
    const example = item.llmInstructions.jsonExample as Record<string, unknown> | undefined;
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
  workflowConversationAutocomplete.filter(item => item.category === 'function');

export const getTriggerFunctionAutocomplete = () => 
  workflowConversationAutocomplete.filter(item => 
    item.category === 'function' && 
    (item.name === 'onRequest' || item.name === 'onMRF' || item.tags?.includes('trigger')));

export const getActionFunctionAutocomplete = () => 
  workflowConversationAutocomplete.filter(item => 
    item.category === 'function' && 
    !item.tags?.includes('trigger'));

export const getUserContextAutocomplete = () => 
  workflowConversationAutocomplete.filter(item => item.category === 'userContext');

export const getDateFunctionAutocomplete = () => 
  workflowConversationAutocomplete.filter(item => item.category === 'dateFunction');

export const getFormFieldAutocomplete = () => 
  workflowConversationAutocomplete.filter(item => item.category === 'formField');

export const getStepReferenceAutocomplete = () => 
  workflowConversationAutocomplete.filter(item => item.category === 'stepReference');

// Get autocomplete by trigger
export const getAutocompleteByTrigger = (trigger: string) =>
  workflowConversationAutocomplete.filter(item => item.trigger === trigger);

// Get all available for LLM context
export const getLLMContext = () => 
  workflowConversationAutocomplete.map(item => {
    const jsonExample = item.llmInstructions.jsonExample as Record<string, unknown>;
    const rawStepType = typeof jsonExample?.['type'] === 'string' ? jsonExample['type'] : undefined;

  const supportedOutputKeys = ['onSuccess', 'onFailure', 'onSuccessGoTo', 'onFailureGoTo', 'onApproval', 'onYes', 'onReject', 'onNo', 'nextSteps'];
    const supportedOutputs = supportedOutputKeys.filter(key => key in jsonExample);

    const outputs = supportedOutputs.reduce<Record<string, unknown>>((acc, key) => {
      if (key in jsonExample) {
        acc[key] = jsonExample[key];
      }
      return acc;
    }, {});

    return {
      name: item.name,
      category: item.category,
      description: item.description,
      usage: item.llmInstructions.usage,
      stepType: rawStepType as ('trigger' | 'action' | 'condition' | 'end') | undefined,
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