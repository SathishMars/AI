
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


const workflowTemplateStepFunctionsDefinitionsSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "definitions": {
        "stepId": { "$ref": "#/definitions/stepId" },
        "stepObject": {
            "type": "object",
            "additionalProperties": false,
            "required": ["id", "label", "type", "stepFunction", "functionParams"],
            "properties": {
                "id": { "$ref": "#/definitions/stepId" },
                "label": { "type": "string", "minLength": 1 },
                "type": {
                    "type": "string",
                    "enum": ["trigger", "task", "approval", "decision", "branch", "merge", "terminate"]
                },
                "stepFunction": {
                    "type": "string",
                    "enum": ["onRequest", "onMRF", "requestApproval", "checkCondition", "notify", "createEvent", "multiCheckCondition", "branch", "merge", "terminate"]
                },
                "functionParams": { "type": "object" },
                "next": {
                    "type": "array",
                    "items": {
                        "oneOf": [
                            { "$ref": "#/definitions/stepId", "description": "Step to execute after the current step" },
                            { "$ref": "#/definitions/stepObject" }
                        ]
                    },
                    "default": []
                },
                "onConditionPass": {
                    "oneOf": [
                        { "$ref": "#/definitions/stepId", "description": "Step to execute if the condition passes" },
                        { "$ref": "#/definitions/stepObject" }
                    ]
                },
                "onConditionFail": {
                    "oneOf": [
                        { "$ref": "#/definitions/stepId", "description": "Step to execute if the condition fails" },
                        { "$ref": "#/definitions/stepObject" }
                    ]
                },
                "conditions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "value": { "type": "string" },
                            "step": {
                                "oneOf": [
                                    { "$ref": "#/definitions/stepId", "description": "Step to execute if the condition matches the value" },
                                    { "$ref": "#/definitions/stepObject" }
                                ]
                            }
                        },
                        "required": ["conditionType", "value"]
                    }
                },
                "onTimeout": {
                    "oneOf": [
                        { "$ref": "#/definitions/stepId", "description": "Step to execute on timeout" },
                        { "$ref": "#/definitions/stepObject" }
                    ]
                },
                "onError": {
                    "oneOf": [
                        { "$ref": "#/definitions/stepId", "description": "Step to execute on error" },
                        { "$ref": "#/definitions/stepObject" }
                    ]
                },
                "timeout": { "type": "number", "minimum": 1 },
                "retryCount": { "type": "number", "minimum": 0 },
                "retryDelay": { "type": "number", "minimum": 0 }
            }
        }
    }
};


export const jsonRulesEngineConditionSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "json-rules-engine Condition",
    "description": "Validates a condition node (either a leaf condition or a nested all/any group).",
    "oneOf": [
        { "$ref": "#/definitions/conditionLeaf" },
        { "$ref": "#/definitions/conditionGroup" }
    ],
    "definitions": {
        "jsonValue": {
            "description": "Any JSON-compatible value.",
            "oneOf": [
                { "type": "string" },
                { "type": "number" },
                { "type": "boolean" },
                { "type": "null" },
                {
                    "type": "array",
                    "items": { "$ref": "#/definitions/jsonValue" }
                },
                {
                    "type": "object",
                    "additionalProperties": { "$ref": "#/definitions/jsonValue" }
                }
            ]
        },

        "valueFact": {
            "type": "object",
            "additionalProperties": false,
            "required": ["fact"],
            "properties": {
                "fact": { "type": "string", "minLength": 1 },
                "path": { "type": "string", "minLength": 1 },
                "params": { "type": "object" }
            },
            "description": "Represents another fact reference for comparison."
        },

        "conditionLeaf": {
            "type": "object",
            "additionalProperties": false,
            "required": ["fact", "operator"],
            "properties": {
                "fact": { "type": "string", "minLength": 1 },
                "operator": { "type": "string", "minLength": 1 },
                "value": { "$ref": "#/definitions/jsonValue" },
                "valueFact": { "$ref": "#/definitions/valueFact" },
                "path": { "type": "string", "minLength": 1 },
                "params": { "type": "object" }
            },
            "allOf": [
                {
                    "description": "At most one of value or valueFact may appear.",
                    "not": {
                        "allOf": [
                            { "required": ["value"] },
                            { "required": ["valueFact"] }
                        ]
                    }
                }
            ]
        },

        "conditionGroup": {
            "type": "object",
            "additionalProperties": false,
            "description": "Boolean condition group; either 'all' or 'any'.",
            "oneOf": [
                {
                    "required": ["all"],
                    "properties": {
                        "all": {
                            "type": "array",
                            "minItems": 1,
                            "items": { "$ref": "#" }
                        }
                    }
                },
                {
                    "required": ["any"],
                    "properties": {
                        "any": {
                            "type": "array",
                            "minItems": 1,
                            "items": { "$ref": "#" }
                        }
                    }
                }
            ]
        }
    }
}



const workflowOnRequestStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "onRequest Trigger Step",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "trigger" },
                "stepFunction": { "const": "onRequest" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestTemplateId"],
                    "properties": {
                        "additionalProperties": false,
                        "requestTemplateId": { "type": "string", "minLength": 1, "maxLength": 40 }
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams", "next"],
            "not": {
                "anyOf": [
                    { "required": ["onConditionPass"] },
                    { "required": ["onConditionFail"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                    { "required": ["onTimeout"] }
                ]
            }
        }
    ]
};

const workflowOnRequestStepLLMInstructions: string = `### This step function is to be used when we want to trigger the workflow on receiving a request.
** \`functionParams\`:**
- \`requestTemplateId\` *(string, required)* — Must be one of the **valid request types** available from the getListOfRequestTemplates tool.  
**Rules:**
- \`requestTemplateId\` is **mandatory**; you MUST call getListOfRequestTemplates first to get available templates.
- If the user mentions a request template name, show ALL available templates as \`followUpOptions\` (using label for display, id in value) so the user can select the correct one.
- NEVER try to get facts (getRequestFacts) until AFTER the user has selected a specific template from the options.
- Match based on user input only if there's an exact, unambiguous match. Otherwise, always show options via \`followUpOptions\`. Never invent new request template ids.  
**Minimal Example:**
\`\`\`json
{
  "id": "AAAAAAAAAA",
  "label": "On receiving the air travel request",
  "type": "trigger",
  "stepFunction": "onRequest",
  "functionParams": { "requestTemplateId": "Travel Request Form" },
  "next": [/* next steps as per schema Embed the step where possible */]
}
\`\`\`
`


const workflowOnMRFStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "onMRF Trigger Step",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "trigger" },
                "stepFunction": { "const": "onMRF" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["mrfTemplateId"],
                    "properties": {
                        "additionalProperties": false,
                        "mrfTemplateId": { "type": "string", "minLength": 1, "maxLength": 40 }
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams", "next"],
            "not": {
                "anyOf": [
                    { "required": ["onConditionPass"] },
                    { "required": ["onConditionFail"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                    { "required": ["onTimeout"] }
                ]
            }
        }
    ]
};

const workflowOnMRFStepLLMInstructions: string = `### This step function is to be used when we want to trigger the workflow on receiving a meeting request form (MRF).
** \`functionParams\`:**
- \`mrfTemplateId\` *(string, required)* — Must be one of the **valid MRF types** available from the getListOfMRFTemplates tool.  
**Rules:**
- \`mrfTemplateId\` is **mandatory**; match based on user input or ask via \`followUpOptions\`. Never invent new MRF template ids.  
**Minimal Example:**
\`\`\`json
{
  "id": "BBBBBBBBBB",
  "label": "On receiving Annual Executive Conference MRF",
  "type": "trigger",
  "stepFunction": "onMRF",
  "functionParams": { "mrfTemplateId": "hga787h7asy87" }, // the MRF template ID
  "next": [/* next steps as per schema Embed the step where possible */]
}
\`\`\`
`


const workflowNotifyStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Notify task step",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "task" },
                "stepFunction": { "const": "notify" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["to", "subject", "notificationTemplateId"],
                    "properties": {
                        "to": { "type": "string", "minLength": 1, "maxLength": 200 },
                        "subject": { "type": "string", "minLength": 2, "maxLength": 500 },
                        "notificationTemplateId": { "type": "string", "minLength": 1, "maxLength": 40 }
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams", "next"],
            "not": {
                "anyOf": [
                    { "required": ["onConditionPass"] },
                    { "required": ["onConditionFail"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                    { "required": ["onTimeout"] }
                ]
            }
        }
    ]
};

const workflowNotifyStepLLMInstructions: string = `### This step function is to be used when we want to send a notification (e.g., email) as part of the workflow.
** \`functionParams\`:**
- \`to\` *(string, required)* — Recipient of the notification (e.g., user ID or email address or variable).
- \`subject\` *(string, required)* — Subject line for the notification.
- \`notificationTemplateId\` *(string, required)* — Must be one of the **valid notification templates** available from the getListOfNotificationTemplates tool.  
**Rules:**
- All \`functionParams\` are **mandatory**; populate based on workflow context or ask via \`followUpOptions\`. Never invent new notification template ids.  
**Minimal Example:**
\`\`\`json
{
  "id": "CCCCCCCCCC",
  "label": "Notify requester of approval",
  "type": "task",
  "stepFunction": "notify",
  "functionParams": {
    "to": "\${requesterUserId}",
    "subject": "Your request has been approved",
    "notificationTemplateId": "Approval Notification Template"
  },
  "next": [/* next steps as per schema Embed the step where possible */]
}
\`\`\`
`


const workflowCreateEventStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "CreateEvent task step",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "task" },
                "stepFunction": { "const": "createEvent" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [],
                    "properties": {
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams", "next"],
            "not": {
                "anyOf": [
                    { "required": ["onConditionPass"] },
                    { "required": ["onConditionFail"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                    { "required": ["onTimeout"] }
                ]
            }
        }
    ]
};

const workflowCreateEventStepLLMInstructions: string = `### This step function is to be used when we want to create an event (e.g., calendar event) as part of the workflow.
** \`functionParams\`:**
- No parameters required for this step function.  
**Rules:**
- No \`functionParams\` are needed; the event details will be derived from the workflow context.  
**Minimal Example:**
\`\`\`json
{
  "id": "DDDDDDDDDD",
  "label": "Create event for approved request",
  "type": "task",
  "stepFunction": "createEvent",
  "functionParams": { },
  "next": [/* next steps as per schema Embed the step where possible, most probbaly a terminate step*/]
}
\`\`\`
`


const workflowRequestApprovalStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "RequestApproval approval step",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "approval" },
                "stepFunction": { "const": "requestApproval" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["approver", "reason", "approvalTemplateId"],
                    "properties": {
                        "approver": { "type": "string", "minLength": 1, "maxLength": 200 },
                        "reason": { "type": "string", "minLength": 2, "maxLength": 500 },
                        "approvalTemplateId": { "type": "string", "minLength": 1, "maxLength": 40 }
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams", "onConditionPass", "onConditionFail"],
            "not": {
                "anyOf": [
                    { "required": ["next"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                ]
            }
        }
    ]
};

const workflowRequestApprovalStepLLMInstructions: string = `### This step function is to be used when we want to request approval from a user as part of the workflow.
** \`functionParams\`:**
- \`approver\` *(string, required)* — User ID or email address of the approver.
- \`reason\` *(string, required)* — Reason for the approval request.
- \`approvalTemplateId\` *(string, required)* — Must be one of the **valid approval templates** available from the getListOfApprovalTemplates tool.  
**Rules:**
- All \`functionParams\` are **mandatory**; populate based on workflow context or ask via \`followUpOptions\`. Never invent new approval template ids.  
**Minimal Example:**
\`\`\`json
{
  "id": "EEEEEEEEEE",
  "label": "Request approval from manager",
  "type": "approval",
  "stepFunction": "requestApproval",
  "functionParams": {
    "approver": "\${managerUserId}",
    "reason": "Approval needed for travel request",
    "approvalTemplateId": "Manager Approval Template"
  },
  "onConditionPass": [/* next steps as per schema Embed the step where possible */],
  "onConditionFail": [/* next steps as per schema Embed the step where possible */]
}
\`\`\`
`


const workflowCheckConditionStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "CheckCondition decision step",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "decision" },
                "stepFunction": { "const": "checkCondition" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["evaluate"],
                    "properties": {
                        "evaluate": { "$ref": jsonRulesEngineConditionSchema },
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams", "onConditionPass", "onConditionFail"],
            "not": {
                "anyOf": [
                    { "required": ["next"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                ]
            }
        }
    ]
};

const workflowCheckConditionStepLLMInstructions: string = `### This step function is to be used when we want to evaluate a condition and branch the workflow based on the result.
** \`functionParams\`:**
- \`evaluate\` *(object, required)* — A condition object following the json-rules-engine format to evaluate.  
**Rules:**
- \`evaluate\` is **mandatory**; construct based on workflow context. Use facts available in the workflow or request data. Use the tool getRequestFacts to get a list of available facts based on what triggered the workflow.
<!-- Original: - \`evaluate\` is **mandatory**; construct based on workflow context. Use facts available in the workflow or mrf or request data.  Use the tool getMRFFacts or getRequestFacts to get a list of available facts based on what triggered the workflow. -->
**Minimal Example:**
\`\`\`json
{
  "id": "FFFFFFFFFF",
  "label": "Check if amount exceeds threshold",
  "type": "decision",
  "stepFunction": "checkCondition",
  "functionParams": {
    "evaluate": {
        all: [
            {
                "fact": "\${amount}",
                "operator": "greaterThan",
                "value": 10000
            },
            any: [
                {
                    "fact": "\${requiredAttendees}",
                    "operator": "greaterThanInclusive",
                    "value": 500
                },
                {
                    "fact": "\${department}",
                    "operator": "equal",
                    "value": "executive"
                }
            ]
        ]
    }
  },
  "onConditionPass": [/* next steps as per schema Embed the step where possible */],
  "onConditionFail": [/* next steps as per schema Embed the step where possible */]
}
\`\`\`
`


const workflowSwitchConditionStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Switch/Case decision task step",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "decision" },
                "stepFunction": { "const": "multiCheckCondition" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["evaluate"],
                    "properties": {
                        "evaluate": { "type": "string", "minLength": 1, "maxLength": 200 }
                    }
                },
                "required": ["type", "stepFunction", "functionParams", "conditions"],
                "not": {
                    "anyOf": [
                        { "required": ["next"] },
                        { "required": ["onConditionPass"] },
                        { "required": ["onConditionFail"] },
                        { "required": ["onError"] },
                    ]
                }
            }
        }
    ]
};

const workflowSwitchConditionStepLLMInstructions: string = `### This step function is to be used when we want to evaluate a value and branch the workflow based on multiple possible cases.
** \`functionParams\`:**
- \`evaluate\` *(string, required)* — A value or variable in the workflow context or request data to evaluate against multiple cases.
<!-- Original: - \`evaluate\` *(string, required)* — A value or variable in the workflow context or mrf or request data to evaluate against multiple cases. -->  
**Rules:**
- \`evaluate\` is **mandatory**; construct based on workflow context. Use facts available in the workflow or request data. Use the tool getRequestFacts to get a list of available facts based on what triggered the workflow.
<!-- Original: - \`evaluate\` is **mandatory**; construct based on workflow context. Use facts available in the workflow or mrf or request data. Use the tool getMRFFacts or getRequestFacts to get a list of available facts based on what triggered the workflow. -->
**Minimal Example:**
\`\`\`json
{
  "id": "GGGGGGGGGG",
  "label": "Switch on department",
  "type": "decision",
  "stepFunction": "multiCheckCondition",
  "functionParams": {
    "evaluate": "\${department}"
  },
  "conditions": [
    {
      "value": "sales",
      "step": [/* next steps for sales department as per schema Embed the step where possible */]
    },
    {
      "value": "engineering",
      "step": [/* next steps for engineering department as per schema Embed the step where possible */]
    }
  ]
}
\`\`\`
`


const workflowBranchStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Branch step for parallel execution paths",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "branch" },
                "stepFunction": { "const": "branch" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [],
                    "properties": {
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams", "next"],
            "not": {
                "anyOf": [
                    { "required": ["onConditionPass"] },
                    { "required": ["onConditionFail"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                    { "required": ["onTimeout"] }
                ]
            }
        }
    ]
};

const workflowBranchStepLLMInstructions: string = `### This step function is to be used when we want to branch the workflow into multiple parallel execution paths.
** \`functionParams\`:**
- No parameters required for this step function.  
**Rules:**
- No \`functionParams\` are needed; the branching will be handled by the workflow engine.  
**Minimal Example:**
\`\`\`json
{
  "id": "HHHHHHHHHH",
  "label": "Branch into parallel paths",
  "type": "branch",
  "stepFunction": "branch",
  "functionParams": { },
  "next": [
    /* first parallel path steps as per schema Embed the step where possible */,
    /* second parallel path steps as per schema Embed the step where possible */
  ]
}
\`\`\`
`


const workflowMergeStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Merge step from parallel execution paths back to one",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "merge" },
                "stepFunction": { "const": "merge" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["waitForSteps", "waitForAll", "timeout"],
                    "properties": {
                        "waitForSteps": {
                            "additionalProperties": false,
                            "type": "array",
                            "items": { "$ref": "#/definitions/stepId" }
                        },
                        "waitForAll": { "type": "boolean" },
                        "timeout": { "type": "number", "minimum": -1 }
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams", "next"],
            "not": {
                "anyOf": [
                    { "required": ["onConditionPass"] },
                    { "required": ["onConditionFail"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                    { "required": ["onTimeout"] }
                ]
            }
        }
    ]
};

const workflowMergeStepLLMInstructions: string = `### This step function is to be used when we want to merge multiple parallel execution paths back into a single path.
** \`functionParams\`:**
- \`waitForSteps\` *(array of step IDs, required)* — List of step IDs to wait for before proceeding.
- \`waitForAll\` *(boolean, required)* — Whether to wait for all specified steps or just any one of them.
- \`timeout\` *(number, required)* — Timeout in minutes to wait for the specified steps (-1 for no timeout).  
**Rules:**
- All \`functionParams\` are **mandatory**; configure based on the parallel paths in the workflow.  
**Minimal Example:**
\`\`\`json
{
  "id": "IIIIIIIIII",
  "label": "Merge parallel paths",
  "type": "merge",
  "stepFunction": "merge",
  "functionParams": {
    "waitForSteps": ["stepId1", "stepId2"],
    "waitForAll": true,
    "timeout": 300
  },
  "next": [/* next steps as per schema Embed the step where possible */]
}
\`\`\`
`   


const workflowTerminateStepSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "The terminate step. This is always the last step in the workflow or the branch.",
    "allOf": [
        { "$ref": workflowTemplateStepFunctionsDefinitionsSchema.definitions.stepObject as unknown as string },
        {
            "type": "object",
            "properties": {
                "type": { "const": "terminate" },
                "stepFunction": { "const": "terminate" },
                "functionParams": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [],
                    "properties": {
                    }
                }
            },
            "required": ["type", "stepFunction", "functionParams"],
            "not": {
                "anyOf": [
                    { 'required': ['next'] },
                    { "required": ["onConditionPass"] },
                    { "required": ["onConditionFail"] },
                    { "required": ["conditions"] },
                    { "required": ["onError"] },
                    { "required": ["onTimeout"] }
                ]
            }
        }
    ]
};

const workflowTerminateStepLLMInstructions: string = `### This step function is to be used when we want to terminate/end the workflow path. There is always atleast 1 per workflow template
** \`functionParams\`:**
- No parameters required for this step function.  
**Rules:**
- No \`functionParams\` are needed; this step simply ends the workflow.  
**Minimal Example:**
\`\`\`json
{
  "id": "JJJJJJJJJJ",
  "label": "Finish line!!",
  "type": "terminate",
  "stepFunction": "terminate",
  "functionParams": { }
}
\`\`\`
`


export const workflowStepFunctions: Array<{ schema: unknown, llmInstructions: string }> = [
    // TRIGGER FUNCTIONS
    {
        schema: workflowOnRequestStepSchema,
        llmInstructions: workflowOnRequestStepLLMInstructions
    },
    // DISABLED: MRF functionality is not currently available
    // {
    //     schema: workflowOnMRFStepSchema,
    //     llmInstructions: workflowOnMRFStepLLMInstructions
    // },
    // TASK FUNCTIONS
    {
        schema: workflowNotifyStepSchema,
        llmInstructions: workflowNotifyStepLLMInstructions
    },
    {
        schema: workflowCreateEventStepSchema,
        llmInstructions: workflowCreateEventStepLLMInstructions
    },
    // DECISION FUNCTIONS
    {
        schema: workflowRequestApprovalStepSchema,
        llmInstructions: workflowRequestApprovalStepLLMInstructions
    },
    {
        schema: workflowCheckConditionStepSchema,
        llmInstructions: workflowCheckConditionStepLLMInstructions
    },
    {
        schema: workflowSwitchConditionStepSchema,
        llmInstructions: workflowSwitchConditionStepLLMInstructions
    },
    // Branch / Merge functions
    {
        schema: workflowBranchStepSchema,
        llmInstructions: workflowBranchStepLLMInstructions
    },
    {
        schema: workflowMergeStepSchema,
        llmInstructions: workflowMergeStepLLMInstructions   
    },
    // TERMINATE FUNCTION
    {
        schema: workflowTerminateStepSchema,
        llmInstructions: workflowTerminateStepLLMInstructions
    },
]


const INSTRUCTIONS_HEADER = `## 🧩 Step Functions (Catalog)
The following are the available step functions that can be used to build workflow definition. 
Each step function includes its purpose, parameters, rules for usage, and a minimal example of how to structure it within a workflow definition.
`;

const INSTRUCTIONS_FOOTER = `---

## 🧪 Validation Checklist
- [x] Unique 10-char IDs only (from provided shortUUID list).  
- [x] Workflow validated by \`workflowDefinitionValidator\`.  
- [x] Starts with trigger, ends with terminate.  
- [x] All references resolvable.  
- [x] Labels are human-readable.  
- [x] JSON valid per schema.

---

## ✳️ Reserved Variables
\`\${requestorUserId}\`, \`\${requestorEmail}\`, \`\${requestorName}\`, \`\${requestorManager}\`, \`\${requestorDepartment}\`, \`\${today}\`, \`\${now}\`

---
`

export const workflowFunctionInstructions: string = INSTRUCTIONS_HEADER + workflowStepFunctions.map(def => {
    // Create a shallow copy and remove llmInstructions
    const { llmInstructions } = def;
    return `${llmInstructions} \n**Use the following step schema:** \`\`\`json\n${JSON.stringify(def.schema, null, 2)}\n\`\`\``;
}).join("\n") + INSTRUCTIONS_FOOTER;
