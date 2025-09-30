// src/app/utils/function-schemas.ts
import { FunctionSchema } from './llm-workflow-generator';

/**
 * Predefined function schemas for workflow actions and triggers
 * These define the parameters required for each function and help the LLM understand
 * what information needs to be collected through conversation
 */
export const WORKFLOW_FUNCTION_SCHEMAS: FunctionSchema[] = [
  {
    name: 'onMRFSubmit',
    description: 'Trigger that activates when a specific MRF form is submitted',
    parameters: {
      mrfID: {
        type: 'string',
        description: 'The unique identifier of the MRF form to monitor for submissions',
        required: true,
        options: [] // Will be populated with available MRF templates
      },
      mrfName: {
        type: 'string',
        description: 'Human-readable name of the MRF form (for display purposes)',
        required: false
      }
    },
    examples: {
      mrfID: 'event-request-form-v2',
      mrfName: 'Event Request Form'
    }
  },
  {
    name: 'requestApproval',
    description: 'Action that sends an approval request to specified users',
    parameters: {
      to: {
        type: 'string',
        description: 'Email address or user ID of the person who should approve the request',
        required: true,
        options: [] // Will be populated with available users
      },
      cc: {
        type: 'string',
        description: 'Additional email addresses to copy on the approval request (comma-separated)',
        required: false
      },
      subject: {
        type: 'string',
        description: 'Subject line for the approval request email',
        required: false
      },
      approvalWorkflowID: {
        type: 'string',
        description: 'ID of predefined approval workflow to use',
        required: false,
        options: [] // Will be populated with available approval workflows
      }
    },
    examples: {
      to: 'manager@company.com',
      cc: 'hr@company.com',
      subject: 'Event Approval Required',
      approvalWorkflowID: 'standard-event-approval'
    }
  },
  {
    name: 'createEvent',
    description: 'Action that creates an event using MRF data',
    parameters: {
      mrfID: {
        type: 'string',
        description: 'The MRF form ID containing the event details to create the event from',
        required: true,
        options: [] // Will be populated with available MRF templates
      },
      eventName: {
        type: 'string',
        description: 'Override name for the event (uses MRF title if not provided)',
        required: false
      },
      calendarID: {
        type: 'string',
        description: 'Calendar ID where the event should be created',
        required: false
      }
    },
    examples: {
      mrfID: 'event-request-form-v2',
      eventName: 'Team Building Workshop',
      calendarID: 'company-events'
    }
  },
  {
    name: 'sendNotification',
    description: 'Action that sends a notification email to specified recipients',
    parameters: {
      to: {
        type: 'string',
        description: 'Email addresses of notification recipients (comma-separated)',
        required: true
      },
      subject: {
        type: 'string',
        description: 'Subject line for the notification email',
        required: true
      },
      message: {
        type: 'string',
        description: 'Body content of the notification email',
        required: false
      },
      emailTemplateID: {
        type: 'string',
        description: 'ID of predefined email template to use',
        required: false,
        options: ['workflow_success', 'workflow_failure', 'approval_pending', 'event_created']
      }
    },
    examples: {
      to: 'requester@company.com',
      subject: 'Your event request has been processed',
      emailTemplateID: 'workflow_success'
    }
  },
  {
    name: 'onScheduledEvent',
    description: 'Trigger that activates at specified times or intervals',
    parameters: {
      schedule: {
        type: 'string',
        description: 'Cron expression or human-readable schedule (e.g., "daily at 9am", "every monday")',
        required: true,
        options: ['daily at 9am', 'weekly on monday', 'monthly on 1st', 'every 15 minutes']
      },
      timezone: {
        type: 'string',
        description: 'Timezone for the schedule (defaults to UTC)',
        required: false,
        options: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London']
      }
    },
    examples: {
      schedule: 'daily at 9am',
      timezone: 'America/New_York'
    }
  },
  {
    name: 'onApprovalReceived',
    description: 'Trigger that activates when an approval is received for a specific request',
    parameters: {
      approvalRequestID: {
        type: 'string',
        description: 'ID of the approval request to monitor',
        required: true
      },
      approvalStatus: {
        type: 'string',
        description: 'Status to trigger on (approved, rejected, or any)',
        required: false,
        options: ['approved', 'rejected', 'any']
      }
    },
    examples: {
      approvalRequestID: 'event-approval-123',
      approvalStatus: 'approved'
    }
  },
  {
    name: 'updateMRFStatus',
    description: 'Action that updates the status of an MRF form',
    parameters: {
      mrfID: {
        type: 'string',
        description: 'The MRF form ID to update',
        required: true
      },
      status: {
        type: 'string',
        description: 'New status for the MRF form',
        required: true,
        options: ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled']
      },
      statusReason: {
        type: 'string',
        description: 'Optional reason for the status change',
        required: false
      }
    },
    examples: {
      mrfID: 'event-request-123',
      status: 'approved',
      statusReason: 'All requirements met'
    }
  }
];

/**
 * Default reference data for function parameter suggestions
 * In a real application, this would be fetched from APIs
 */
export const DEFAULT_REFERENCE_DATA = {
  mrfTemplates: [
    { id: 'event-request-form-v2', name: 'Event Request Form', category: 'Events' },
    { id: 'equipment-request-form', name: 'Equipment Request Form', category: 'Resources' },
    { id: 'meeting-room-booking', name: 'Meeting Room Booking', category: 'Facilities' },
    { id: 'training-request-form', name: 'Training Request Form', category: 'HR' },
    { id: 'expense-reimbursement', name: 'Expense Reimbursement', category: 'Finance' }
  ],
  users: [
    { id: 'manager1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'Manager' },
    { id: 'admin1', name: 'Mike Chen', email: 'mike.chen@company.com', role: 'Admin' },
    { id: 'hr1', name: 'Lisa Rodriguez', email: 'lisa.rodriguez@company.com', role: 'HR' },
    { id: 'finance1', name: 'David Kim', email: 'david.kim@company.com', role: 'Finance' }
  ],
  approvalWorkflows: [
    { id: 'standard-event-approval', name: 'Standard Event Approval', approvers: ['sarah.johnson@company.com'] },
    { id: 'large-event-approval', name: 'Large Event Approval (>100 people)', approvers: ['sarah.johnson@company.com', 'mike.chen@company.com'] },
    { id: 'budget-approval', name: 'Budget Approval (>$1000)', approvers: ['david.kim@company.com'] },
    { id: 'hr-approval', name: 'HR Approval Required', approvers: ['lisa.rodriguez@company.com'] }
  ]
};

/**
 * Validate function schemas to ensure proper parameter requirements
 */
export function validateFunctionSchemas(schemas: FunctionSchema[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const schema of schemas) {
    // Check that at least one parameter is marked as required
    const hasRequiredParams = Object.values(schema.parameters).some(param => param.required);
    if (!hasRequiredParams) {
      errors.push(`Function ${schema.name} has no required parameters - at least one should be required for parameter collection`);
    }
    
    // Check for proper parameter descriptions
    for (const [paramName, paramInfo] of Object.entries(schema.parameters)) {
      if (!paramInfo.description || paramInfo.description.length < 10) {
        errors.push(`Parameter ${paramName} in function ${schema.name} needs a more descriptive description`);
      }
      
      if (paramInfo.required && paramInfo.options && paramInfo.options.length === 0) {
        errors.push(`Required parameter ${paramName} in function ${schema.name} has empty options array - should have available values`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get only required parameters from function schemas for focused questioning
 */
export function getRequiredParameters(functionName: string, schemas: FunctionSchema[]): string[] {
  const schema = schemas.find(s => s.name === functionName);
  if (!schema) return [];
  
  return Object.entries(schema.parameters)
    .filter(([, paramInfo]) => paramInfo.required)
    .map(([paramName]) => paramName);
}

/**
 * Check if a workflow step has all required parameters
 */
export function hasAllRequiredParameters(
  stepAction: string, 
  stepParams: Record<string, unknown>, 
  schemas: FunctionSchema[]
): boolean {
  const requiredParams = getRequiredParameters(stepAction, schemas);
  return requiredParams.every(param => 
    stepParams[param] !== undefined && 
    stepParams[param] !== null && 
    stepParams[param] !== ''
  );
}
/**
 * Populate function schemas with reference data options
 */
export function populateFunctionSchemas(referenceData = DEFAULT_REFERENCE_DATA): FunctionSchema[] {
  return WORKFLOW_FUNCTION_SCHEMAS.map(schema => ({
    ...schema,
    parameters: {
      ...schema.parameters,
      // Populate mrfID options
      ...(schema.parameters.mrfID && {
        mrfID: {
          ...schema.parameters.mrfID,
          options: referenceData.mrfTemplates.map(t => t.id)
        }
      }),
      // Populate user options for 'to' parameter
      ...(schema.parameters.to && {
        to: {
          ...schema.parameters.to,
          options: referenceData.users.map(u => u.email)
        }
      }),
      // Populate approval workflow options
      ...(schema.parameters.approvalWorkflowID && {
        approvalWorkflowID: {
          ...schema.parameters.approvalWorkflowID,
          options: referenceData.approvalWorkflows.map(w => w.id)
        }
      })
    }
  }));
}