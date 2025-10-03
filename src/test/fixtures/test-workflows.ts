// src/test/fixtures/test-workflows.ts
import { WorkflowJSON } from '@/app/types/workflow';

/**
 * Test workflow fixtures for testing autocomplete and visualization functionality
 */

export const sampleAutocompleteWorkflow: WorkflowJSON = {
  schemaVersion: '1.0.0',
  metadata: {
    id: 'test-autocomplete-workflow',
    name: 'Test Autocomplete Workflow',
    description: 'Testing autocomplete functionality',
    version: '1.0.0',
    status: 'draft',
    tags: ['test', 'autocomplete'],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  steps: {
    start: {
      name: 'Start Step',
      type: 'trigger',
      action: 'onFormSubmit',
      params: {},
      nextSteps: ['end']
    },
    end: {
      name: 'End Step',
      type: 'action',
      action: 'completeProcess',
      params: {},
      nextSteps: []
    }
  }
};

export const complexMermaidTestWorkflow: WorkflowJSON = {
  schemaVersion: "1.0.0",
  metadata: {
    id: "test-complex-mermaid-workflow",
    name: "Complex Mermaid Test Workflow",
    description: "Complex event approval workflow for testing enhanced Mermaid diagrams",
    version: "1.0.0",
    status: "draft",
    tags: ["event-management", "approval", "automation"],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  steps: {
    start: {
      name: "Event Request Submitted",
      type: "trigger",
      action: "onMRFSubmit",
      params: { mrfID: "evt-2024-001", eventName: "Annual Company Conference" },
      nextSteps: ["validateRequest"]
    },
    validateRequest: {
      name: "Validate Request",
      type: "condition",
      condition: {
        all: [
          { fact: "mrf.budget", operator: "lessThan", value: 10000 }
        ]
      },
      onSuccess: "autoApprove",
      onFailure: "requireApproval"
    },
    autoApprove: {
      name: "Auto Approve",
      type: "action",
      action: "approveEvent",
      params: { approver: "system" },
      nextSteps: ["notifyApproval"]
    },
    requireApproval: {
      name: "Require Manual Approval",
      type: "action", 
      action: "requestApproval",
      params: { approver: "manager" },
      nextSteps: ["waitApproval"]
    },
    waitApproval: {
      name: "Wait for Approval",
      type: "action",
      action: "waitForApproval",
      params: { timeout: "7d" },
      nextSteps: ["checkApprovalStatus"]
    },
    checkApprovalStatus: {
      name: "Check Approval Status",
      type: "condition",
      condition: {
        all: [
          { fact: "approval.status", operator: "equal", value: "approved" }
        ]
      },
      onSuccess: "notifyApproval",
      onFailure: "notifyRejection"
    },
    notifyApproval: {
      name: "Notify Approval",
      type: "action",
      action: "sendNotification",
      params: { message: "Event approved" },
      nextSteps: ["end"]
    },
    notifyRejection: {
      name: "Notify Rejection", 
      type: "action",
      action: "sendNotification",
      params: { message: "Event rejected" },
      nextSteps: ["end"]
    },
    end: {
      name: "End Process",
      type: "end",
      params: {},
      nextSteps: []
    }
  }
};

export const simpleMermaidChart = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;