// src/app/utils/functions-library.ts
import { z } from 'zod';
import { 
  FunctionsLibrary, 
  FunctionDefinition, 
  FunctionExample,
  FunctionCategory,
  LibraryMetadata,
  AIFunctionContext,
  FunctionSummary,
  ParameterSummary,
  UsagePattern
} from '@/app/types/workflow';

// Zod schemas for parameter validation
const EmailSchema = z.string().email();
const UrlSchema = z.string().url();
const ArraySchema = z.array(z.any());
const ObjectSchema = z.record(z.string(), z.any());

// Enhanced event planning functions with full metadata
const EVENT_PLANNING_FUNCTIONS: Record<string, FunctionDefinition> = {
  // Trigger Functions
  onMRFSubmit: {
    id: 'trigger_mrf_submit',
    name: 'onMRFSubmit',
    description: 'Trigger workflow when a Meeting Request Form (MRF) is submitted for approval',
    version: '1.0.0',
    namespace: 'functions',
    category: 'trigger',
    tags: ['trigger', 'mrf', 'submission', 'workflow-start'],
    parameters: {
      mrfID: {
        type: 'string',
        required: true,
        description: 'Meeting Request Form ID to monitor for submission',
        examples: ['MRF_2024_001', 'MRF_2024_002', 'mrf_abc123']
      },
      formType: {
        type: 'string',
        required: false,
        description: 'Type of MRF form to trigger on (all types if not specified)',
        examples: ['event-request', 'meeting-request', 'resource-booking'],
        default: 'all'
      },
      priority: {
        type: 'string',
        required: false,
        description: 'Minimum priority level to trigger workflow',
        examples: ['low', 'medium', 'high'],
        default: 'low'
      }
    },
    returnType: 'void',
    examples: [
      {
        id: 'mrf_trigger_example_1',
        name: 'Standard Event Request Trigger',
        description: 'Trigger on any MRF submission',
        parameters: {
          mrfID: 'dynamic'
        },
        context: 'Standard workflow trigger for event planning'
      },
      {
        id: 'mrf_trigger_example_2',
        name: 'High Priority Event Trigger',
        description: 'Trigger only on high priority event requests',
        parameters: {
          mrfID: 'dynamic',
          priority: 'high'
        },
        context: 'Executive or urgent event requests requiring immediate attention'
      }
    ],
    documentation: {
      description: 'Automatically start workflow when MRF forms are submitted',
      usage: 'Used as the first step in event planning workflows to trigger on form submission',
      aiPromptHints: [
        'Use this to start workflows when users submit meeting requests',
        'Perfect for automated event approval processes',
        'Can filter by MRF type or priority level'
      ],
      commonUseCases: [
        'Event approval workflows',
        'Meeting planning automation',
        'Resource booking requests'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },

  onWorkflowTriggered: {
    id: 'trigger_on_workflow_triggered',
    name: 'onWorkflowTriggered',
    description: 'Trigger workflow when another workflow calls it (workflow entry point for workflow chaining)',
    version: '1.0.0',
    namespace: 'functions',
    category: 'trigger',
    tags: ['trigger', 'workflow-start', 'workflow-chain', 'inter-workflow'],
    parameters: {
      expectedParams: {
        type: 'object',
        required: false,
        description: 'Expected parameters from calling workflow (JSON object with parameter names and types)',
        examples: [
          { requestId: 'string', amount: 'number' },
          { eventId: 'string', attendeeCount: 'number', priority: 'string' }
        ]
      },
      validateParams: {
        type: 'boolean',
        required: false,
        description: 'Validate incoming parameters match expected schema',
        default: true,
        examples: [true, false]
      }
    },
    returnType: 'void',
    examples: [
      {
        id: 'workflow_trigger_example_1',
        name: 'Multi-Level Approval Entry Point',
        description: 'Trigger point for approval workflow called by other workflows',
        parameters: {
          expectedParams: {
            requestId: 'string',
            amount: 'number',
            requestType: 'string'
          },
          validateParams: true
        },
        context: 'Use as entry point for workflows that are triggered by other workflows'
      }
    ],
    documentation: {
      description: 'Workflow entry point that activates when another workflow triggers it using type "workflow" step',
      usage: 'Use as the first step (trigger) in workflows designed to be called by other workflows',
      aiPromptHints: [
        'Use when this workflow is meant to be triggered by another workflow',
        'Perfect for reusable approval or notification workflows',
        'Receives parameters from calling workflow via workflowParams'
      ],
      commonUseCases: [
        'Multi-level approval workflows',
        'Reusable notification workflows',
        'Shared business logic workflows',
        'Workflow orchestration patterns'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },

  onScheduledEvent: {
    id: 'trigger_scheduled_event',
    name: 'onScheduledEvent',
    description: 'Trigger workflow at specific times or on recurring schedules',
    version: '1.0.0',
    namespace: 'functions',
    category: 'trigger',
    tags: ['trigger', 'schedule', 'time', 'recurring'],
    parameters: {
      schedule: {
        type: 'string',
        required: true,
        description: 'Cron expression or schedule specification',
        examples: ['0 9 * * 1', '0 0 1 * *', 'daily', 'weekly', 'monthly']
      },
      timezone: {
        type: 'string',
        required: false,
        description: 'Timezone for schedule execution',
        examples: ['UTC', 'America/New_York', 'Europe/London'],
        default: 'UTC'
      },
      description: {
        type: 'string',
        required: false,
        description: 'Human-readable description of the schedule',
        examples: ['Weekly team meeting reminder', 'Monthly budget review']
      }
    },
    returnType: 'void',
    examples: [
      {
        id: 'scheduled_trigger_example_1',
        name: 'Weekly Team Meeting',
        description: 'Trigger every Monday at 9 AM',
        parameters: {
          schedule: '0 9 * * 1',
          timezone: 'America/New_York',
          description: 'Weekly team meeting reminder'
        },
        context: 'Recurring meeting workflows'
      }
    ],
    documentation: {
      description: 'Schedule workflows to run at specific times or intervals',
      usage: 'Use for recurring workflows or time-based triggers',
      aiPromptHints: [
        'Use this for recurring meeting reminders',
        'Perfect for scheduled review processes',
        'Can trigger daily, weekly, monthly workflows'
      ],
      commonUseCases: [
        'Meeting reminders',
        'Periodic reviews',
        'Scheduled notifications'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },

  // Action Functions
  requestApproval: {
    id: 'func_request_approval',
    name: 'requestApproval',
    description: 'Send approval requests to managers/stakeholders with configurable timeout and escalation',
    version: '1.2.0',
    namespace: 'functions',
    category: 'approval',
    tags: ['approval', 'workflow', 'notification', 'management'],
    parameters: {
      to: { 
        type: 'string', 
        required: true, 
        description: 'Email address of approver',
        examples: ['manager@company.com', 'supervisor@company.com'],
        validation: EmailSchema
      },
      cc: { 
        type: 'string', 
        required: false, 
        description: 'CC email addresses (comma-separated)',
        examples: ['team@company.com', 'hr@company.com,admin@company.com']
      },
      subject: { 
        type: 'string', 
        required: false, 
        description: 'Approval request subject line',
        examples: ['Event Approval Required: Team Building Event', 'Budget Approval Needed']
      },
      message: { 
        type: 'string', 
        required: false, 
        description: 'Custom message body for the approval request',
        examples: ['Please review and approve this event request', 'Urgent approval needed for upcoming event']
      },
      timeout: { 
        type: 'number', 
        required: false, 
        description: 'Timeout in hours before escalation', 
        default: 24,
        examples: [24, 48, 72]
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'approval_example_1',
        name: 'Basic Manager Approval',
        description: 'Request approval from direct manager',
        parameters: {
          to: 'manager@company.com',
          subject: 'Event Approval Required',
          timeout: 24
        },
        expectedOutput: { approved: true, approvalId: 'apr_123', timestamp: '2024-01-01T10:00:00Z' },
        context: 'Use when event requires manager approval within standard timeframe'
      }
    ],
    documentation: {
      description: 'Sends approval requests to designated approvers with configurable timeout and escalation options',
      usage: 'Use this function when workflow steps require human approval before proceeding',
      aiPromptHints: [
        'Use when user mentions needing approval',
        'Trigger for budget approvals, manager sign-offs',
        'Include timeout for urgent approvals',
        'Consider CC for transparency'
      ],
      commonUseCases: [
        'Manager approval for team events',
        'Budget approval for large events',
        'Executive approval for company-wide events',
        'HR approval for training sessions'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0', '1.1.0', '1.2.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },

  notifyUsers: {
    id: 'func_notify_users',
    name: 'notifyUsers',
    description: 'Send in-app notifications to users or groups (separate from email) with priority levels',
    version: '1.0.0',
    namespace: 'functions',
    category: 'notification',
    tags: ['notification', 'communication', 'in-app', 'user-notification'],
    parameters: {
      recipients: {
        type: 'array',
        required: true,
        description: 'User IDs or group IDs to notify',
        examples: [['user123', 'user456'], ['group_managers', 'group_admins']],
        validation: ArraySchema
      },
      title: {
        type: 'string',
        required: true,
        description: 'Notification title (max 100 characters)',
        examples: ['Workflow Update', 'Approval Required', 'Event Created Successfully']
      },
      message: {
        type: 'string',
        required: true,
        description: 'Notification message (max 500 characters)',
        examples: ['Your approval is required for the upcoming team event', 'Event has been successfully created']
      },
      priority: {
        type: 'string',
        required: false,
        description: 'Notification priority level',
        examples: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
      },
      actionUrl: {
        type: 'string',
        required: false,
        description: 'Optional action URL when notification is clicked',
        examples: ['/workflows/123/review', '/events/456/details'],
        validation: UrlSchema
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'notify_example_1',
        name: 'High Priority Manager Notification',
        description: 'Notify manager of urgent approval request',
        parameters: {
          recipients: ['manager123'],
          title: 'Urgent Approval Required',
          message: 'A high-value request requires your immediate approval',
          priority: 'high',
          actionUrl: '/workflows/789/approve'
        },
        expectedOutput: {
          notificationId: 'notif_123',
          sentAt: '2024-01-15T10:00:00Z',
          recipientCount: 1,
          deliveryStatus: 'sent'
        },
        context: 'Use for urgent notifications requiring immediate user attention'
      }
    ],
    documentation: {
      description: 'Sends in-app notifications to users or groups with configurable priority levels',
      usage: 'Use in workflow action steps to send in-app notifications. This is separate from email notifications.',
      aiPromptHints: [
        'Use when users need in-app notifications',
        'Perfect for approval reminders and status updates',
        'Can target individual users or entire groups',
        'Set priority based on urgency'
      ],
      commonUseCases: [
        'Approval request notifications',
        'Workflow status updates',
        'Task assignment notifications',
        'Event creation confirmations',
        'Deadline reminders'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },

  collectFormInformation: {
    id: 'func_collect_form_info',
    name: 'collectFormInformation',
    description: 'Pause workflow to collect additional information from user via dynamic form',
    version: '1.0.0',
    namespace: 'functions',
    category: 'data-collection',
    tags: ['form', 'data-collection', 'user-input', 'workflow-pause'],
    parameters: {
      formTitle: {
        type: 'string',
        required: true,
        description: 'Title of the form to display',
        examples: ['Additional Information Required', 'Budget Justification Form', 'Event Details']
      },
      fields: {
        type: 'array',
        required: true,
        description: 'Form field definitions (JSON array of field objects)',
        examples: [
          [
            { name: 'budget', type: 'number', label: 'Budget Amount', required: true },
            { name: 'justification', type: 'textarea', label: 'Justification', required: true }
          ]
        ],
        validation: ArraySchema
      },
      assignedTo: {
        type: 'string',
        required: true,
        description: 'User ID to assign form to',
        examples: ['user123', 'requester456']
      },
      dueDate: {
        type: 'string',
        required: false,
        description: 'Due date for form submission (ISO format)',
        examples: ['2024-12-31T23:59:59Z', '2024-06-15T12:00:00Z']
      },
      saveToContext: {
        type: 'boolean',
        required: false,
        description: 'Save collected data to workflow context for later steps',
        default: true,
        examples: [true, false]
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'collect_form_example_1',
        name: 'Budget Justification Collection',
        description: 'Collect budget details from requester',
        parameters: {
          formTitle: 'Budget Justification Required',
          fields: [
            {
              name: 'justification',
              type: 'textarea',
              label: 'Budget Justification',
              required: true
            },
            {
              name: 'costCenter',
              type: 'select',
              label: 'Cost Center',
              required: true,
              options: ['Marketing', 'Sales', 'Operations', 'IT']
            }
          ],
          assignedTo: 'requester123',
          saveToContext: true
        },
        expectedOutput: {
          formId: 'form_789',
          submittedAt: '2024-01-16T14:30:00Z',
          collectedData: {
            justification: 'Required for Q1 team building initiative',
            costCenter: 'Marketing'
          }
        },
        context: 'Use when additional information is needed mid-workflow'
      }
    ],
    documentation: {
      description: 'Pauses workflow to collect additional information from users via dynamic forms',
      usage: 'Use in workflow action steps to pause and collect additional information',
      aiPromptHints: [
        'Use when workflow needs additional user input',
        'Perfect for collecting missing information',
        'Define form fields based on what data is needed',
        'Collected data is saved to workflow context for later use'
      ],
      commonUseCases: [
        'Budget justification collection',
        'Additional event details gathering',
        'Approval reason documentation',
        'Post-event feedback collection'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },

  triggerWorkflow: {
    id: 'func_trigger_workflow',
    name: 'triggerWorkflow',
    description: 'Trigger another workflow within the same account and optionally wait for completion',
    version: '2.0.0',
    namespace: 'functions',
    category: 'workflow-control',
    tags: ['workflow', 'orchestration', 'workflow-chain', 'inter-workflow'],
    parameters: {
      workflowId: {
        type: 'string',
        required: true,
        description: 'ID of workflow to trigger (must be in same account)',
        examples: ['wf_approval_123', 'wf_notification_456']
      },
      params: {
        type: 'object',
        required: false,
        description: 'Parameters to pass to triggered workflow (JSON object)',
        examples: [
          { requestId: '{{context.requestId}}', amount: 5000 },
          { eventId: '{{context.eventId}}', attendeeCount: 150 }
        ],
        validation: ObjectSchema
      },
      waitForCompletion: {
        type: 'boolean',
        required: false,
        description: 'Wait for triggered workflow to complete before continuing',
        default: true,
        examples: [true, false]
      },
      timeout: {
        type: 'number',
        required: false,
        description: 'Timeout in minutes for workflow completion',
        default: 30,
        examples: [15, 30, 60, 120]
      },
      onSuccessGoTo: {
        type: 'string',
        required: false,
        description: 'Step ID to jump to on successful completion',
        examples: ['createEventAction', 'sendConfirmationEmail']
      },
      onFailureGoTo: {
        type: 'string',
        required: false,
        description: 'Step ID to jump to on failure',
        examples: ['handleError', 'notifyFailure', 'workflowEnd']
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'trigger_workflow_example_1',
        name: 'Trigger Multi-Level Approval',
        description: 'Trigger approval workflow for high-value requests',
        parameters: {
          workflowId: 'wf_multilevel_approval',
          params: {
            requestId: '{{context.requestId}}',
            amount: 10000
          },
          waitForCompletion: true,
          timeout: 60
        },
        expectedOutput: {
          triggeredWorkflowId: 'exec_789',
          result: 'success',
          returnData: { approved: true }
        },
        context: 'Use for complex approval workflows'
      }
    ],
    documentation: {
      description: 'Triggers another workflow within the same account with parameter passing',
      usage: 'Use to create workflow chains and orchestration patterns',
      aiPromptHints: [
        'Use when workflow needs to trigger another workflow',
        'Perfect for multi-level approval patterns',
        'Can pass context data between workflows',
        'SECURITY: Only workflows in same account can be triggered'
      ],
      commonUseCases: [
        'Multi-level approval workflows',
        'Notification orchestration',
        'Complex event planning workflows',
        'Workflow composition patterns'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0', '2.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },

  collectMeetingInformation: {
    id: 'func_collect_meeting_info',
    name: 'collectMeetingInformation',
    description: 'Gather additional details from requesters with customizable form fields',
    version: '1.1.0',
    namespace: 'functions',
    category: 'data-collection',
    tags: ['data-collection', 'forms', 'information-gathering', 'automation'],
    parameters: {
      fields: { 
        type: 'array', 
        required: true, 
        description: 'List of fields to collect with types and validation',
        examples: [
          ['attendeeCount', 'eventDate', 'budget'],
          ['dietaryRestrictions', 'accessibilityNeeds', 'specialRequirements']
        ],
        validation: ArraySchema
      },
      requester: { 
        type: 'string', 
        required: true, 
        description: 'Email of person to contact for information',
        examples: ['requester@company.com', 'eventowner@company.com'],
        validation: EmailSchema
      },
      deadline: { 
        type: 'string', 
        required: false, 
        description: 'Response deadline (ISO date format)',
        examples: ['2024-12-31T23:59:59Z', '2024-01-15T17:00:00Z']
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'collect_example_1',
        name: 'Basic Event Details',
        description: 'Collect standard event information',
        parameters: {
          fields: ['attendeeCount', 'eventDate', 'budget', 'location'],
          requester: 'organizer@company.com',
          deadline: '2024-01-15T17:00:00Z'
        },
        expectedOutput: { formId: 'form_123', status: 'sent', responseUrl: 'https://forms.company.com/123' },
        context: 'Use when basic event details are missing from initial request'
      }
    ],
    documentation: {
      description: 'Creates and sends dynamic forms to collect missing information from event requesters',
      usage: 'Use when the initial request lacks required details for processing',
      aiPromptHints: [
        'Use when information is missing or incomplete',
        'Customize fields based on event type',
        'Set appropriate deadlines for responses',
        'Consider using templates for common scenarios'
      ],
      commonUseCases: [
        'Collect catering preferences',
        'Gather attendee lists',
        'Obtain budget information',
        'Request accessibility requirements'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0', '1.1.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-10')
  },

  splitUpToExecuteParallelActivities: {
    id: 'func_split_parallel',
    name: 'splitUpToExecuteParallelActivities',
    description: 'Create parallel workflow branches for concurrent task execution',
    version: '1.0.0',
    namespace: 'functions',
    category: 'workflow-control',
    tags: ['workflow', 'parallel', 'branching', 'concurrency'],
    parameters: {
      branches: { 
        type: 'array', 
        required: true, 
        description: 'List of parallel branch definitions with steps',
        examples: [
          [
            { name: 'catering', steps: ['bookCatering', 'confirmMenu'] },
            { name: 'venue', steps: ['bookVenue', 'setupAV'] }
          ]
        ],
        validation: ArraySchema
      },
      syncPoint: { 
        type: 'string', 
        required: true, 
        description: 'Step ID where branches merge back together',
        examples: ['finalConfirmation', 'eventExecution', 'completionCheck']
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'parallel_example_1',
        name: 'Event Preparation Tasks',
        description: 'Run catering and venue booking in parallel',
        parameters: {
          branches: [
            { name: 'catering', steps: ['requestQuote', 'confirmCatering'] },
            { name: 'venue', steps: ['checkAvailability', 'bookVenue'] }
          ],
          syncPoint: 'finalConfirmation'
        },
        expectedOutput: { branchIds: ['branch_1', 'branch_2'], syncPointId: 'sync_123' },
        context: 'Use when multiple independent tasks can be executed simultaneously'
      }
    ],
    documentation: {
      description: 'Splits workflow execution into parallel branches for concurrent processing of independent tasks',
      usage: 'Use when multiple tasks can be performed simultaneously to reduce total execution time',
      aiPromptHints: [
        'Use for independent tasks that can run concurrently',
        'Identify tasks with no dependencies between them',
        'Ensure proper sync point definition'
      ],
      commonUseCases: [
        'Parallel vendor negotiations',
        'Simultaneous venue and catering booking',
        'Concurrent approval requests',
        'Multi-team task coordination'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  waitForParallelActivitiesToComplete: {
    id: 'func_wait_parallel',
    name: 'waitForParallelActivitiesToComplete',
    description: 'Synchronization point for parallel flows with timeout handling',
    version: '1.0.0',
    namespace: 'functions',
    category: 'workflow-control',
    tags: ['workflow', 'synchronization', 'parallel', 'coordination'],
    parameters: {
      branchIds: { 
        type: 'array', 
        required: true, 
        description: 'IDs of branches to wait for completion',
        examples: [['branch_1', 'branch_2'], ['catering_branch', 'venue_branch']],
        validation: ArraySchema
      },
      timeout: { 
        type: 'number', 
        required: false, 
        description: 'Timeout in minutes before proceeding with partial completion', 
        default: 60,
        examples: [30, 60, 120]
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'sync_example_1',
        name: 'Event Preparation Sync',
        description: 'Wait for all event preparation tasks',
        parameters: {
          branchIds: ['catering_branch', 'venue_branch'],
          timeout: 90
        },
        expectedOutput: { 
          completedBranches: ['catering_branch', 'venue_branch'], 
          timedOutBranches: [],
          canProceed: true 
        },
        context: 'Use at synchronization points where parallel tasks need to complete before proceeding'
      }
    ],
    documentation: {
      description: 'Waits for parallel workflow branches to complete with configurable timeout handling',
      usage: 'Use as synchronization points where workflow must wait for parallel tasks to complete',
      aiPromptHints: [
        'Use after parallel branch creation',
        'Set appropriate timeouts for task completion',
        'Handle partial completion scenarios'
      ],
      commonUseCases: [
        'Wait for all vendor confirmations',
        'Synchronize multi-team approvals',
        'Coordinate parallel booking processes'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  callAnAPI: {
    id: 'func_call_api',
    name: 'callAnAPI',
    description: 'External system integration with comprehensive error handling',
    version: '1.3.0',
    namespace: 'functions',
    category: 'integration',
    tags: ['api', 'integration', 'external-systems', 'http'],
    parameters: {
      url: { 
        type: 'string', 
        required: true, 
        description: 'API endpoint URL',
        examples: [
          'https://api.company.com/events',
          'https://calendar.google.com/api/v3/calendars'
        ],
        validation: UrlSchema
      },
      method: { 
        type: 'string', 
        required: true, 
        description: 'HTTP method (GET, POST, PUT, DELETE)',
        examples: ['GET', 'POST', 'PUT', 'DELETE']
      },
      headers: { 
        type: 'object', 
        required: false, 
        description: 'HTTP headers including authentication',
        examples: [
          { 'Authorization': 'Bearer token123', 'Content-Type': 'application/json' }
        ],
        validation: ObjectSchema
      },
      body: { 
        type: 'object', 
        required: false, 
        description: 'Request body for POST/PUT requests',
        examples: [
          { title: 'Team Meeting', date: '2024-01-15', attendees: 10 }
        ],
        validation: ObjectSchema
      },
      timeout: { 
        type: 'number', 
        required: false, 
        description: 'Timeout in seconds', 
        default: 30,
        examples: [10, 30, 60]
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'api_example_1',
        name: 'Create Calendar Event',
        description: 'Create event in external calendar system',
        parameters: {
          url: 'https://calendar.company.com/api/events',
          method: 'POST',
          headers: { 'Authorization': 'Bearer token123', 'Content-Type': 'application/json' },
          body: { title: 'Team Meeting', date: '2024-01-15T10:00:00Z', duration: 60 }
        },
        expectedOutput: { eventId: 'cal_123', status: 'created', url: 'https://calendar.company.com/events/cal_123' },
        context: 'Use for integrating with external calendar or booking systems'
      }
    ],
    documentation: {
      description: 'Makes HTTP requests to external APIs with comprehensive error handling and authentication',
      usage: 'Use for integrating with external systems like calendars, booking platforms, or notification services',
      aiPromptHints: [
        'Use for external system integration',
        'Include proper authentication headers',
        'Set appropriate timeouts for external calls'
      ],
      commonUseCases: [
        'Calendar system integration',
        'Booking platform API calls',
        'Payment system integration',
        'Notification service calls'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0', '1.1.0', '1.2.0', '1.3.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },

  createAnEvent: {
    id: 'func_create_event',
    name: 'createAnEvent',
    description: 'Generate calendar events and bookings with resource management',
    version: '1.2.0',
    namespace: 'functions',
    category: 'event-management',
    tags: ['event-creation', 'calendar', 'booking', 'resource-management'],
    parameters: {
      mrfID: { 
        type: 'string', 
        required: true, 
        description: 'Meeting Request Form ID for tracking',
        examples: ['MRF_2024_001', 'mrf_abc123']
      },
      title: { 
        type: 'string', 
        required: false, 
        description: 'Event title (auto-generated if not provided)',
        examples: ['Team Building Workshop', 'Q1 Strategy Meeting']
      },
      location: { 
        type: 'string', 
        required: false, 
        description: 'Event location or virtual meeting details',
        examples: ['Conference Room A', 'https://zoom.us/j/123456789']
      },
      attendees: { 
        type: 'array', 
        required: false, 
        description: 'List of attendee emails',
        examples: [
          ['john@company.com', 'jane@company.com'],
          ['team@company.com']
        ],
        validation: ArraySchema
      },
      resources: { 
        type: 'array', 
        required: false, 
        description: 'Required resources (rooms, equipment, catering)',
        examples: [
          ['projector', 'whiteboard', 'coffee'],
          ['conference_room_a', 'av_equipment']
        ],
        validation: ArraySchema
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'event_example_1',
        name: 'Team Meeting Creation',
        description: 'Create a standard team meeting',
        parameters: {
          mrfID: 'MRF_2024_001',
          title: 'Weekly Team Sync',
          location: 'Conference Room A',
          attendees: ['team@company.com'],
          resources: ['projector', 'coffee']
        },
        expectedOutput: { 
          eventId: 'evt_123', 
          calendarUrl: 'https://calendar.company.com/events/evt_123',
          resources: { confirmed: ['projector', 'coffee'], pending: [] }
        },
        context: 'Use for creating standard business meetings with resource booking'
      }
    ],
    documentation: {
      description: 'Creates calendar events with comprehensive resource booking and attendee management',
      usage: 'Use as the final step in event workflows to create actual calendar entries and book resources',
      aiPromptHints: [
        'Use when ready to create the actual event',
        'Ensure all approvals are complete',
        'Include all required resources',
        'Verify attendee availability'
      ],
      commonUseCases: [
        'Business meeting creation',
        'Training session booking',
        'Conference room reservation',
        'Virtual meeting setup'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0', '1.1.0', '1.2.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-12')
  },

  terminateWorkflow: {
    id: 'func_terminate',
    name: 'terminateWorkflow',
    description: 'End workflow with success/failure status and reporting',
    version: '1.1.0',
    namespace: 'functions',
    category: 'workflow-control',
    tags: ['workflow', 'termination', 'completion', 'reporting'],
    parameters: {
      status: { 
        type: 'string', 
        required: true, 
        description: 'Workflow completion status',
        examples: ['success', 'failure', 'cancelled', 'timeout']
      },
      message: { 
        type: 'string', 
        required: false, 
        description: 'Detailed termination message',
        examples: ['Event successfully created', 'Approval timeout - workflow cancelled']
      },
      notifyUsers: { 
        type: 'boolean', 
        required: false, 
        description: 'Send completion notifications', 
        default: true,
        examples: [true, false]
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'terminate_example_1',
        name: 'Successful Event Creation',
        description: 'Complete workflow after successful event creation',
        parameters: {
          status: 'success',
          message: 'Event successfully created and all resources booked',
          notifyUsers: true
        },
        expectedOutput: { 
          workflowId: 'wf_123', 
          completedAt: '2024-01-15T12:00:00Z', 
          notificationsSent: 5 
        },
        context: 'Use when workflow completes successfully'
      }
    ],
    documentation: {
      description: 'Terminates workflow execution with proper cleanup, notifications, and reporting',
      usage: 'Use at the end of workflow paths to properly close and report workflow completion',
      aiPromptHints: [
        'Use at workflow completion points',
        'Include meaningful completion messages',
        'Consider notification requirements'
      ],
      commonUseCases: [
        'Successful event creation completion',
        'Workflow failure handling',
        'Timeout-based termination',
        'User-requested cancellation'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0', '1.1.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-08')
  },

  surveyForFeedback: {
    id: 'func_survey_feedback',
    name: 'surveyForFeedback',
    description: 'Post-event feedback collection with analytics',
    version: '1.0.0',
    namespace: 'functions',
    category: 'feedback',
    tags: ['feedback', 'survey', 'analytics', 'post-event'],
    parameters: {
      eventId: { 
        type: 'string', 
        required: true, 
        description: 'Event ID for feedback tracking',
        examples: ['evt_123', 'event_2024_001']
      },
      surveyTemplate: { 
        type: 'string', 
        required: false, 
        description: 'Survey template ID or type',
        examples: ['standard_event_feedback', 'training_evaluation']
      },
      recipients: { 
        type: 'array', 
        required: true, 
        description: 'Survey recipients (attendees, organizers, stakeholders)',
        examples: [
          ['attendee1@company.com', 'attendee2@company.com'],
          ['organizer@company.com']
        ],
        validation: ArraySchema
      },
      deadline: { 
        type: 'string', 
        required: false, 
        description: 'Survey response deadline (ISO format)',
        examples: ['2024-01-20T23:59:59Z', '2024-01-25T17:00:00Z']
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'survey_example_1',
        name: 'Post-Training Feedback',
        description: 'Collect feedback after training session',
        parameters: {
          eventId: 'evt_training_123',
          surveyTemplate: 'training_evaluation',
          recipients: ['trainee1@company.com', 'trainee2@company.com'],
          deadline: '2024-01-20T23:59:59Z'
        },
        expectedOutput: { 
          surveyId: 'srv_123', 
          recipientCount: 2, 
          surveyUrl: 'https://surveys.company.com/srv_123' 
        },
        context: 'Use after events to collect feedback for continuous improvement'
      }
    ],
    documentation: {
      description: 'Creates and distributes feedback surveys to collect post-event insights',
      usage: 'Use after event completion to gather feedback from participants and stakeholders',
      aiPromptHints: [
        'Use after successful event completion',
        'Choose appropriate survey templates',
        'Include all relevant participants',
        'Set reasonable response deadlines'
      ],
      commonUseCases: [
        'Training session evaluation',
        'Conference feedback collection',
        'Meeting effectiveness surveys',
        'Venue and catering feedback'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  validateRequestAgainstPolicy: {
    id: 'func_validate_request_policy',
    name: 'validateRequestAgainstPolicy',
    description: 'Policy compliance checking with detailed violation reporting',
    version: '1.1.0',
    namespace: 'functions',
    category: 'validation',
    tags: ['validation', 'policy', 'compliance', 'governance'],
    parameters: {
      mrfID: { 
        type: 'string', 
        required: true, 
        description: 'Meeting Request Form ID to validate',
        examples: ['MRF_2024_001', 'mrf_abc123']
      },
      policies: { 
        type: 'array', 
        required: false, 
        description: 'Specific policies to check (all if not specified)',
        examples: [
          ['budget_policy', 'venue_policy'],
          ['catering_policy', 'accessibility_policy']
        ],
        validation: ArraySchema
      },
      strict: { 
        type: 'boolean', 
        required: false, 
        description: 'Strict validation mode (fail on warnings)', 
        default: false,
        examples: [true, false]
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'validate_example_1',
        name: 'Budget Policy Validation',
        description: 'Check event request against budget policies',
        parameters: {
          mrfID: 'MRF_2024_001',
          policies: ['budget_policy', 'approval_policy'],
          strict: false
        },
        expectedOutput: { 
          isValid: false, 
          violations: [
            { policy: 'budget_policy', severity: 'warning', message: 'Exceeds department budget' }
          ],
          score: 85
        },
        context: 'Use early in workflow to validate requests against organizational policies'
      }
    ],
    documentation: {
      description: 'Validates event requests against organizational policies with detailed reporting',
      usage: 'Use early in workflows to ensure requests comply with organizational policies before processing',
      aiPromptHints: [
        'Use at workflow start for policy validation',
        'Enable strict mode for critical policies',
        'Review all policy categories'
      ],
      commonUseCases: [
        'Budget compliance checking',
        'Venue policy validation',
        'Catering policy compliance',
        'Accessibility requirement verification'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0', '1.1.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-05')
  },

  validatePlanAgainstPolicy: {
    id: 'func_validate_plan_policy',
    name: 'validatePlanAgainstPolicy',
    description: 'Final plan validation with comprehensive compliance reporting',
    version: '1.0.0',
    namespace: 'functions',
    category: 'validation',
    tags: ['validation', 'policy', 'final-check', 'compliance'],
    parameters: {
      planId: { 
        type: 'string', 
        required: true, 
        description: 'Event plan ID to validate',
        examples: ['plan_123', 'event_plan_2024_001']
      },
      policies: { 
        type: 'array', 
        required: false, 
        description: 'Specific policies to check against',
        examples: [
          ['final_budget_policy', 'safety_policy'],
          ['resource_policy', 'timing_policy']
        ],
        validation: ArraySchema
      },
      autoFix: { 
        type: 'boolean', 
        required: false, 
        description: 'Automatically fix minor violations', 
        default: false,
        examples: [true, false]
      }
    },
    returnType: 'object',
    examples: [
      {
        id: 'plan_validate_example_1',
        name: 'Final Plan Compliance Check',
        description: 'Validate complete event plan before execution',
        parameters: {
          planId: 'plan_event_123',
          policies: ['safety_policy', 'budget_policy', 'resource_policy'],
          autoFix: true
        },
        expectedOutput: { 
          isCompliant: true, 
          violations: [], 
          autoFixesApplied: 2,
          score: 98
        },
        context: 'Use as final validation before event execution to ensure full compliance'
      }
    ],
    documentation: {
      description: 'Performs final comprehensive validation of event plans against all applicable policies',
      usage: 'Use as final step before event execution to ensure complete policy compliance',
      aiPromptHints: [
        'Use before final event execution',
        'Include all relevant policy checks',
        'Enable auto-fix for efficiency'
      ],
      commonUseCases: [
        'Pre-execution compliance verification',
        'Audit trail generation',
        'Final safety and policy checks',
        'Regulatory compliance validation'
      ]
    },
    lifecycle: 'active',
    compatibleVersions: ['1.0.0'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
};

// Function categories with AI-optimized descriptions
const FUNCTION_CATEGORIES: FunctionCategory[] = [
  {
    id: 'approval',
    name: 'Approval',
    description: 'Functions for requesting and managing approvals',
    aiDescription: 'Use these functions when workflows require human approval or sign-off from managers, executives, or stakeholders',
    functionCount: 1
  },
  {
    id: 'data-collection',
    name: 'Data Collection',
    description: 'Functions for gathering additional information',
    aiDescription: 'Use these functions when you need to collect missing information or details from users through forms or surveys',
    functionCount: 1
  },
  {
    id: 'workflow-control',
    name: 'Workflow Control',
    description: 'Functions for controlling workflow execution flow',
    aiDescription: 'Use these functions to manage workflow branching, parallel execution, synchronization, and termination',
    functionCount: 3
  },
  {
    id: 'integration',
    name: 'Integration',
    description: 'Functions for external system integration',
    aiDescription: 'Use these functions to integrate with external APIs, services, and systems like calendars, booking platforms, or payment systems',
    functionCount: 1
  },
  {
    id: 'event-management',
    name: 'Event Management',
    description: 'Functions for creating and managing events',
    aiDescription: 'Use these functions for actual event creation, calendar booking, resource management, and event lifecycle operations',
    functionCount: 1
  },
  {
    id: 'feedback',
    name: 'Feedback',
    description: 'Functions for collecting feedback and surveys',
    aiDescription: 'Use these functions after events to collect feedback, conduct surveys, and gather insights for improvement',
    functionCount: 1
  },
  {
    id: 'validation',
    name: 'Validation',
    description: 'Functions for policy and compliance validation',
    aiDescription: 'Use these functions to validate requests and plans against organizational policies, budgets, and compliance requirements',
    functionCount: 2
  }
];

// Library metadata
const LIBRARY_METADATA: LibraryMetadata = {
  version: '2.0.0',
  name: 'Event Planning Functions Library',
  description: 'Comprehensive functions library for event planning and management workflows',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-20'),
  totalFunctions: Object.keys(EVENT_PLANNING_FUNCTIONS).length,
  categories: FUNCTION_CATEGORIES
};

// Enhanced functions library
export const enhancedFunctionsLibrary: FunctionsLibrary = {
  version: '2.0.0',
  metadata: LIBRARY_METADATA,
  functions: EVENT_PLANNING_FUNCTIONS,
  categories: FUNCTION_CATEGORIES
};

// Enhanced Functions library management with AI integration
export class EnhancedFunctionsLibraryManager {
  private library: FunctionsLibrary;
  
  constructor(library: FunctionsLibrary = enhancedFunctionsLibrary) {
    this.library = library;
  }
  
  getLibrary(): FunctionsLibrary {
    return this.library;
  }
  
  getFunction(name: string): FunctionDefinition | undefined {
    return this.library.functions[name];
  }
  
  getFunctionById(id: string): FunctionDefinition | undefined {
    return Object.values(this.library.functions).find(func => func.id === id);
  }
  
  getFunctionsByCategory(category: string): FunctionDefinition[] {
    return Object.values(this.library.functions).filter(func => func.category === category);
  }
  
  getFunctionsByTag(tag: string): FunctionDefinition[] {
    return Object.values(this.library.functions).filter(func => func.tags.includes(tag));
  }
  
  getFunctionsByLifecycle(lifecycle: 'active' | 'deprecated' | 'experimental'): FunctionDefinition[] {
    return Object.values(this.library.functions).filter(func => func.lifecycle === lifecycle);
  }
  
  getAllFunctions(): FunctionDefinition[] {
    return Object.values(this.library.functions);
  }
  
  getCategories(): FunctionCategory[] {
    return this.library.categories;
  }
  
  // AI-optimized function discovery
  getAIFunctionContext(): AIFunctionContext {
    const availableFunctions: FunctionSummary[] = this.getAllFunctions().map(func => ({
      id: func.id,
      name: func.name,
      description: func.description,
      category: func.category,
      parameters: Object.entries(func.parameters).map(([name, param]) => ({
        name,
        type: param.type,
        required: param.required,
        description: param.description,
        examples: param.examples || []
      })),
      exampleUsage: func.examples[0]?.description || func.documentation.usage,
      aiPromptHints: func.documentation.aiPromptHints
    }));

    const categoryDescriptions = this.library.categories.reduce((acc, cat) => {
      acc[cat.id] = cat.aiDescription;
      return acc;
    }, {} as Record<string, string>);

    const usagePatterns: UsagePattern[] = [
      {
        id: 'approval_workflow',
        name: 'Approval Workflow',
        description: 'Standard approval process for events requiring manager sign-off',
        functions: ['validateRequestAgainstPolicy', 'requestApproval', 'createAnEvent'],
        workflow: 'validate → request approval → create event'
      },
      {
        id: 'parallel_booking',
        name: 'Parallel Booking',
        description: 'Concurrent booking of multiple event resources',
        functions: ['splitUpToExecuteParallelActivities', 'waitForParallelActivitiesToComplete'],
        workflow: 'split parallel tasks → wait for completion → proceed'
      },
      {
        id: 'information_gathering',
        name: 'Information Gathering',
        description: 'Collect missing details before processing',
        functions: ['collectMeetingInformation', 'validateRequestAgainstPolicy'],
        workflow: 'collect information → validate → proceed'
      }
    ];

    return {
      availableFunctions,
      categoryDescriptions,
      usagePatterns,
      exampleWorkflows: [
        'Simple Event: validateRequestAgainstPolicy → createAnEvent → surveyForFeedback',
        'Complex Event: collectMeetingInformation → requestApproval → splitUpToExecuteParallelActivities → waitForParallelActivitiesToComplete → createAnEvent',
        'Policy-Heavy Event: validateRequestAgainstPolicy → requestApproval → validatePlanAgainstPolicy → createAnEvent'
      ]
    };
  }
  
  // Enhanced validation with Zod schemas
  validateFunction(name: string, params: Record<string, unknown>): { isValid: boolean; errors: string[] } {
    const func = this.getFunction(name);
    if (!func) {
      return { isValid: false, errors: [`Function '${name}' not found`] };
    }
    
    const errors: string[] = [];
    
    // Check required parameters
    Object.entries(func.parameters).forEach(([paramName, paramDef]) => {
      if (paramDef.required && !(paramName in params)) {
        errors.push(`Missing required parameter: ${paramName}`);
      }
      
      // Validate with Zod schema if available
      if (paramName in params && paramDef.validation) {
        try {
          paramDef.validation.parse(params[paramName]);
        } catch (zodError) {
          errors.push(`Invalid parameter '${paramName}': ${zodError}`);
        }
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }
  
  // Function discovery by use case
  discoverFunctions(query: string): FunctionDefinition[] {
    // If no query or empty string, return all functions (useful for autocomplete)
    if (!query || query.trim() === '') {
      return this.getAllFunctions();
    }
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return this.getAllFunctions().filter(func => {
      const searchableText = [
        func.name,
        func.description,
        func.category,
        ...func.tags,
        ...func.documentation.aiPromptHints,
        ...func.documentation.commonUseCases
      ].join(' ').toLowerCase();
      
      return searchTerms.some(term => searchableText.includes(term));
    });
  }
  
  // Dynamic loading support (for future enhancement)
  async loadFunction(id: string): Promise<FunctionDefinition | null> {
    // This would load from external source in real implementation
    return this.getFunctionById(id) || null;
  }
  
  // Version compatibility check
  isVersionCompatible(functionName: string, requiredVersion: string): boolean {
    const func = this.getFunction(functionName);
    if (!func) return false;
    
    return func.compatibleVersions.includes(requiredVersion);
  }
  
  // Get function usage statistics (placeholder for future analytics)
  getFunctionUsageStats(): Record<string, { callCount: number; successRate: number }> {
    // This would return real analytics in a full implementation
    return Object.keys(this.library.functions).reduce((stats, funcName) => {
      stats[funcName] = { callCount: 0, successRate: 100 };
      return stats;
    }, {} as Record<string, { callCount: number; successRate: number }>);
  }
}

// Export singleton instance
export const functionsLibraryManager = new EnhancedFunctionsLibraryManager();

// Backward compatibility export
export const defaultFunctionsLibrary = enhancedFunctionsLibrary;