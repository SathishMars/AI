import { WorkflowStepFunction } from "@/app/types/workflowStepFunction";

interface WorkflowFunctionTypeConfig {
  color: string;
  label: string;
  icon: string;
}

export const workflowFunctionTypeConfig: Record<string, WorkflowFunctionTypeConfig> = {
  trigger: {
    color: '#16A249',
    label: 'Trigger',
    icon: 'start' // Material UI stylesheet icon name
  },
  decision: {
    color: '#7C3BED',
    label: 'Decision',
    icon: 'help_center' // Material UI stylesheet icon name
  },
  approval: {
    color: '#7C3BED',
    label: 'Approval',
    icon: 'person_check' // Material UI stylesheet icon name
  },
  task: {
    color: '#7C3BED',
    label: 'Task',
    icon: 'task_alt' // Material UI stylesheet icon name
  },
  terminate: {
    color: '#090909',
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
            usageInstruction: `
### \`onRequest\` (Trigger)
**Purpose:** Trigger when a **request** is submitted.  
**Params (\`functionParams\`):**
- \`requestType\` *(string, required)* — Must be one of the **valid request types** available in context or via API.  
**Outputs:** Emits request payload into workflow context.  
**Rules:**
- \`requestType\` is **mandatory**; use exact match or ask via \`followUpOptions\`. Never invent new types.  
- Prefer using \`GetListOfWorkflowTemplates\` if templates are referenced by the user.  
**Minimal Example:**
\`\`\`json
{
  "id": "AAAAAAAAAA",
  "label": "On receiving the request",
  "type": "trigger",
  "stepFunction": "onRequest",
  "functionParams": { "requestType": "Meeting Request (MRF)" },
  "next": []
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
                name: 'mrfTemplateId',
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
            usageInstruction: `
### \`onMRF\` (Trigger)
**Purpose:** Trigger when an **MRF** (Meeting Request Form) is submitted.  
**Params:**
- \`mrfTemplateId\` *(string, optional; default "all")* — Specific MRF template to trigger on.  
**Outputs:** Emits MRF payload into workflow context.  
**Rules:**
- Use \`GetListOfMRFTemplates\` for template discovery when user names a template.  
**Minimal Example:**
\`\`\`json
{
  "id": "BBBBBBBBBB",
  "label": "On receiving MRF",
  "type": "trigger",
  "stepFunction": "onMRF",
  "functionParams": { "mrfTemplateId": "hga787h7asy87" }, // the MRF template ID
  "next": []
}
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
            usageInstruction: `
### \`notify\` (Task)
**Purpose:** Send a notification (email/message) to users/teams.  
**Params:**
- \`to\` *(string, required)* — Recipient spec (userId, group, or template var).  
- \`subject\` *(string, required)* — Subject line.  
- \`notificationTemplateName\` *(string, required)* — Must resolve via \`/api/notification-templates\`.  
**Outputs:** Result payload of notification send.  
**Rules:** Avoid PII leakage; use org identifiers or workflow variables (e.g., \`$\{manager}\`).  
**Minimal Example:**
\`\`\`json
{
  "id": "CCCCCCCCCC",
  "label": "Notify the manager",
  "type": "task",
  "stepFunction": "notify",
  "functionParams": {
    "to": "\${userManager}",
    "subject": "New meeting request submitted",
    "notificationTemplateName": "request-submitted"
  },
  "next": []
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
            usageInstruction: `
### \`createEvent\` (Task)
**Purpose:** Create a calendar event.  
**Params:** *(none required; include event details if available)*  
**Outputs:** Created event object.  
**Rules:** If user specifies calendar system or details, include them in \`functionParams\`.  
**Minimal Example:**
\`\`\`json
{
  "id": "DDDDDDDDDD",
  "label": "Create calendar event",
  "type": "task",
  "stepFunction": "createEvent",
  "functionParams": {},
  "next": []
}
\`\`\`
    `
        },
    },
    // DECISION FUNCTIONS
    {
        id: 'fn_request_approval',
        label: 'Request for approval',
        type: 'approval',
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
            usageInstruction: `
### \`requestApproval\` (Decision)
**Purpose:** Request approval from a designated approver; branches on result.  
**Params:**
- \`approver\` *(string, required)* — Use directory id or \`\${manager}\`.  
- \`reason\` *(string, optional; default "Please review and approve")*  
**Outputs:** \`pass\` (approved), \`fail\` (rejected), \`timeout\` (no response).  
**Rules:**
- Support aliases: \`onConditionPass\` ↔ \`on Approval|Yes\`; \`onConditionFail\` ↔ \`on Reject|No\`.  
- May include \`timeout\`, \`retryCount\`, \`retryDelay\`.  
**Minimal Example:**
\`\`\`json
{
  "id": "EEEEEEEEEE",
  "label": "Request approval from manager",
  "type": "decision",
  "stepFunction": "requestApproval",
  "functionParams": { "approver": "\${manager}", "reason": "Budget exceeds threshold" },
  "onConditionPass": "FFFFFFFFFF",
  "onConditionFail": "GGGGGGGGGG",
  "onTimeout": "HHHHHHHHHH",
  "timeout": 86400,
  "retryCount": 2,
  "retryDelay": 3600
}
\`\`\`
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
            usageInstruction: `
### \`checkCondition\` (Decision)
**Purpose:** Evaluate a **json-rules-engine** condition to choose pass/fail.  
**Params:**
- \`evaluate\` *(string, required)* — JSON **string** of rules (json-rules-engine format).  
**Outputs:** \`pass\`/ \`fail\`.  
**Rules:** Use only valid operators/structure per json-rules-engine; embed as JSON string.  
**Minimal Example:**
\`\`\`json
{
  "id": "IIIIIIIIII",
  "label": "Check budget and role",
  "type": "decision",
  "stepFunction": "checkCondition",
  "functionParams": {
    "evaluate": "{"any":[{"fact":"budget","operator":"greaterThan","value":5000},{"all":[{"fact":"role","operator":"notEqual","value":"manager"}]}]}"
  },
  "onConditionPass": "JJJJJJJJJJ",
  "onConditionFail": "KKKKKKKKKK"
}
\`\`\`
`
        },
    },
    {
        id: 'fn_switch_condition',
        label: 'Multi Decision Point',
        type: 'decision',
        name: 'multiCheckCondition',
        description: 'Evaluate a variable to determine workflow path with multiple outcomes based on its value',
        params: [
            {
                name: 'evaluate',
                label: 'Variable to evaluate',
                type: 'string',
                description: 'A variable value to check against multiple possible values',
                required: true,
            },
        ],
        outputs: [{
            type: 'condition', label: 'Passed', required: true, value: 'value of the matched condition', next: 'next step id for the matched condition'
        }],
        llmInstructions: {
            usageInstruction: `
### \`multiCheckCondition\` (Decision: Switch/Case)
**Purpose:** Multi-branch routing on a single variable’s value.  
**Params:**
- \`evaluate\` *(string, required)* — A variable name or expression (e.g., \`\${department}\`).
- \`conditions\` *(array, required)* — Items: \`{ "value": "<match>", "next": "<stepId>" }\`.  
- \`defaultNext\` *(string, optional)* — Fallback step id. 
**Outputs:** Branch to matching \`next\`.  
**Rules:** **Prefer embedding the steps** for \`next\`; use step IDs only if necessary.
**Minimal Example:**  
\`\`\`json
{
  "id": "LLLLLLLLLL",
  "label": "Branch by department",
  "type": "decision",
  "stepFunction": "multiCheckCondition",
  "functionParams": {
    "evaluate": "\${department}",
    "conditions": [
      { "value": "Finance", "next": "MMMMMMMMMM" },
      { "value": "HR", "next": "NNNNNNNNNN" }
    ],
    "defaultNext": "OOOOOOOOOO"
  }
}
\`\`\`    
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
            usageInstruction: `
### \`branch\` (Branch)
**Purpose:** Execute multiple paths in **parallel**.  
**Params:** *(none)*  
**Outputs:** Parallel execution of all \`next\` steps.  
**Rules:** \`next\` can list **step objects or ids**. If referencing, ensure those steps are defined elsewhere.  
**Minimal Example:**
\`\`\`json
{
  "id": "PPPPPPPPPP",
  "label": "Start parallel tasks",
  "type": "branch",
  "stepFunction": "branch",
  "functionParams": {},
  "next": ["QQQQQQQQQQ", "RRRRRRRRRR"]
}
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
            usageInstruction: `
### \`merge\` (Merge/Join)
**Purpose:** Wait for multiple branches to complete before continuing.  
**Params:**
- \`waitForSteps\` *(array<string>, required)* — Step IDs to wait for.  
- \`waitForAll\` *(boolean, required; default true)* — Whether all must succeed.  
- \`timeout\` *(number or string, optional)* — Max wait.  
**Outputs:** Result set of completed tasks.  
**Rules:** Ensure \`waitForSteps\` match previously defined ids.  
**Minimal Example:**
\`\`\`json
{
  "id": "SSSSSSSSSS",
  "label": "Merge parallel branches",
  "type": "merge",
  "stepFunction": "merge",
  "functionParams": {
    "waitForSteps": ["QQQQQQQQQQ", "RRRRRRRRRR"],
    "waitForAll": true,
    "timeout": 120
  },
  "next": ["TTTTTTTTTT"]
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
            usageInstruction: `
### \`terminate\` (Terminate)
**Purpose:** End the workflow.  
**Params:** *(none)*  
**Outputs:** None; workflow ends.  
**Rules:** Must be the **final** step in any path.  
**Minimal Example:**
\`\`\`json
{
  "id": "UUUUUUUUUU",
  "label": "Terminate workflow",
  "type": "terminate",
  "stepFunction": "terminate",
  "functionParams": {},
  "next": []
}
\`\`\`
    `
        },
    },
]


const INSTRUCTIONS_HEADER = `## 🧩 Core Step Functions (Catalog)

Each function block includes **Purpose**, **Params**, **Outputs**, **Rules**, and a **Minimal Example**.  
Unless specified, \`functionParams\` object fields are optional; required fields are marked **required**.
`;

const INSTRUCTIONS_FOOTER = `---

## 🔄 RequestType Handling
- \`requestType\` is **mandatory** for triggers like \`onRequest\`.
- Map user intent → closest valid type; if ambiguous, ask via \`followUpOptions\`.
- Never invent new request types.
- Echo the resolved \`requestType\` exactly.

---

## 🧪 Validation Checklist
- [x] Unique 10-char IDs only (from provided shortUUID list).  
- [x] Workflow validated by \`workflowDefinitionValidator\`.  
- [x] Starts with trigger, ends with terminate.  
- [x] All references resolvable.  
- [x] Labels are human-readable.  
- [x] JSON valid per schema.

---

## ✳️ Reserved Variables
\`\${userId}\`, \`\${userEmail}\`, \`\${userName}\`, \`\${userManager}\`, \`\${userDepartment}\`, \`\${today}\`, \`\${now}\`

---
`

export const workflowFunctionInstructions:string = INSTRUCTIONS_HEADER + workflowFunctionDefinitions.map(def => {
    // Create a shallow copy and remove llmInstructions
    const { llmInstructions } = def;
    return `${llmInstructions.usageInstruction}`;
}).join("\n") + INSTRUCTIONS_FOOTER;
