# Workflow Step Types Reference

This document provides a comprehensive reference for all available workflow step types, their parameters, and usage guidelines.

---

## Table of Contents

1. [Trigger Steps](#trigger-steps)
   - [onRequest](#onrequest)
   - [onMRF](#onmrf)
2. [Task Steps](#task-steps)
   - [notify](#notify)
   - [createEvent](#createevent)
3. [Approval Steps](#approval-steps)
   - [requestApproval](#requestapproval)
4. [Decision Steps](#decision-steps)
   - [checkCondition](#checkcondition)
   - [multiCheckCondition](#multicheckcondition)
5. [Flow Control Steps](#flow-control-steps)
   - [branch](#branch)
   - [merge](#merge)
6. [Termination Steps](#termination-steps)
   - [terminate](#terminate)
7. [Common Properties](#common-properties)
8. [Reserved Variables](#reserved-variables)

---

## Trigger Steps

### onRequest

**Type:** `trigger`  
**Step Function:** `onRequest`  
**Purpose:** Triggers the workflow when a request is received.

#### Function Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `requestTemplateId` | string | ✅ Yes | min: 1, max: 40 | Must be a valid request template ID from `getListOfRequestTemplates` tool |

#### Required Properties
- `type`: "trigger"
- `stepFunction`: "onRequest"
- `functionParams`: Object with `requestTemplateId`
- `next`: Array of next steps

#### Prohibited Properties
- `onConditionPass`
- `onConditionFail`
- `conditions`
- `onError`
- `onTimeout`

#### Example

```json
{
  "id": "AAAAAAAAAA",
  "label": "On receiving the air travel request",
  "type": "trigger",
  "stepFunction": "onRequest",
  "functionParams": {
    "requestTemplateId": "Travel Request Form"
  },
  "next": [
    // ... next steps
  ]
}
```

---

### onMRF

**Type:** `trigger`  
**Step Function:** `onMRF`  
**Purpose:** Triggers the workflow when a Meeting Request Form (MRF) is received.

#### Function Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `mrfTemplateId` | string | ✅ Yes | min: 1, max: 40 | Must be a valid MRF template ID from `getListOfMRFTemplates` tool |

#### Required Properties
- `type`: "trigger"
- `stepFunction`: "onMRF"
- `functionParams`: Object with `mrfTemplateId`
- `next`: Array of next steps

#### Prohibited Properties
- `onConditionPass`
- `onConditionFail`
- `conditions`
- `onError`
- `onTimeout`

#### Example

```json
{
  "id": "BBBBBBBBBB",
  "label": "On receiving Annual Executive Conference MRF",
  "type": "trigger",
  "stepFunction": "onMRF",
  "functionParams": {
    "mrfTemplateId": "hga787h7asy87"
  },
  "next": [
    // ... next steps
  ]
}
```

---

## Task Steps

### notify

**Type:** `task`  
**Step Function:** `notify`  
**Purpose:** Sends a notification (e.g., email) as part of the workflow.

#### Function Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `to` | string | ✅ Yes | min: 1, max: 200 | Recipient of the notification (user ID, email address, or variable) |
| `subject` | string | ✅ Yes | min: 2, max: 500 | Subject line for the notification |
| `notificationTemplateId` | string | ✅ Yes | min: 1, max: 40 | Must be a valid notification template ID from `getListOfNotificationTemplates` tool |

#### Required Properties
- `type`: "task"
- `stepFunction`: "notify"
- `functionParams`: Object with all three parameters
- `next`: Array of next steps

#### Prohibited Properties
- `onConditionPass`
- `onConditionFail`
- `conditions`
- `onError`
- `onTimeout`

#### Example

```json
{
  "id": "CCCCCCCCCC",
  "label": "Notify requester of approval",
  "type": "task",
  "stepFunction": "notify",
  "functionParams": {
    "to": "${requesterUserId}",
    "subject": "Your request has been approved",
    "notificationTemplateId": "Approval Notification Template"
  },
  "next": [
    // ... next steps
  ]
}
```

---

### createEvent

**Type:** `task`  
**Step Function:** `createEvent`  
**Purpose:** Creates an event (e.g., calendar event) as part of the workflow.

#### Function Parameters

**No parameters required.** Event details are derived from the workflow context.

#### Required Properties
- `type`: "task"
- `stepFunction`: "createEvent"
- `functionParams`: Empty object `{}`
- `next`: Array of next steps

#### Prohibited Properties
- `onConditionPass`
- `onConditionFail`
- `conditions`
- `onError`
- `onTimeout`

#### Example

```json
{
  "id": "DDDDDDDDDD",
  "label": "Create event for approved request",
  "type": "task",
  "stepFunction": "createEvent",
  "functionParams": {},
  "next": [
    // ... next steps (probably a terminate step)
  ]
}
```

---

## Approval Steps

### requestApproval

**Type:** `approval`  
**Step Function:** `requestApproval`  
**Purpose:** Requests approval from a user as part of the workflow.

#### Function Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `approver` | string | ✅ Yes | min: 1, max: 200 | User ID or email address of the approver |
| `reason` | string | ✅ Yes | min: 2, max: 500 | Reason for the approval request |
| `approvalTemplateId` | string | ✅ Yes | min: 1, max: 40 | Must be a valid approval template ID from `getListOfApprovalTemplates` tool |

#### Required Properties
- `type`: "approval"
- `stepFunction`: "requestApproval"
- `functionParams`: Object with all three parameters
- `onConditionPass`: Step(s) to execute if approval is granted
- `onConditionFail`: Step(s) to execute if approval is denied

#### Prohibited Properties
- `next`
- `conditions`
- `onError`

#### Example

```json
{
  "id": "EEEEEEEEEE",
  "label": "Request approval from manager",
  "type": "approval",
  "stepFunction": "requestApproval",
  "functionParams": {
    "approver": "${managerUserId}",
    "reason": "Approval needed for travel request",
    "approvalTemplateId": "Manager Approval Template"
  },
  "onConditionPass": [
    // ... steps if approved
  ],
  "onConditionFail": [
    // ... steps if denied
  ]
}
```

---

## Decision Steps

### checkCondition

**Type:** `decision`  
**Step Function:** `checkCondition`  
**Purpose:** Evaluates a condition and branches the workflow based on the result.

#### Function Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evaluate` | object | ✅ Yes | A condition object following the json-rules-engine format |

The `evaluate` object must conform to the **json-rules-engine** condition schema:

- **Leaf Condition**: Contains `fact`, `operator`, and optionally `value` or `valueFact`
- **Condition Group**: Contains either `all` (AND logic) or `any` (OR logic) with an array of conditions

#### Required Properties
- `type`: "decision"
- `stepFunction`: "checkCondition"
- `functionParams`: Object with `evaluate`
- `onConditionPass`: Step(s) to execute if condition passes
- `onConditionFail`: Step(s) to execute if condition fails

#### Prohibited Properties
- `next`
- `conditions`
- `onError`

#### Example

```json
{
  "id": "FFFFFFFFFF",
  "label": "Check if amount exceeds threshold",
  "type": "decision",
  "stepFunction": "checkCondition",
  "functionParams": {
    "evaluate": {
      "all": [
        {
          "fact": "${amount}",
          "operator": "greaterThan",
          "value": 10000
        },
        {
          "any": [
            {
              "fact": "${requiredAttendees}",
              "operator": "greaterThanInclusive",
              "value": 500
            },
            {
              "fact": "${department}",
              "operator": "equal",
              "value": "executive"
            }
          ]
        }
      ]
    }
  },
  "onConditionPass": [
    // ... steps if condition passes
  ],
  "onConditionFail": [
    // ... steps if condition fails
  ]
}
```

---

### multiCheckCondition

**Type:** `decision`  
**Step Function:** `multiCheckCondition`  
**Purpose:** Evaluates a value and branches the workflow based on multiple possible cases (switch/case logic).

#### Function Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `evaluate` | string | ✅ Yes | min: 1, max: 200 | A value or variable from the workflow context to evaluate |

#### Required Properties
- `type`: "decision"
- `stepFunction`: "multiCheckCondition"
- `functionParams`: Object with `evaluate`
- `conditions`: Array of condition objects with `value` and `step` properties

#### Condition Object Structure

Each condition in the `conditions` array must have:
- `value`: The value to match
- `step`: Step(s) to execute if the value matches

#### Prohibited Properties
- `next`
- `onConditionPass`
- `onConditionFail`
- `onError`

#### Example

```json
{
  "id": "GGGGGGGGGG",
  "label": "Switch on department",
  "type": "decision",
  "stepFunction": "multiCheckCondition",
  "functionParams": {
    "evaluate": "${department}"
  },
  "conditions": [
    {
      "value": "sales",
      "step": [
        // ... steps for sales department
      ]
    },
    {
      "value": "engineering",
      "step": [
        // ... steps for engineering department
      ]
    }
  ]
}
```

---

## Flow Control Steps

### branch

**Type:** `branch`  
**Step Function:** `branch`  
**Purpose:** Branches the workflow into multiple parallel execution paths.

#### Function Parameters

**No parameters required.** The branching is handled by the workflow engine.

#### Required Properties
- `type`: "branch"
- `stepFunction`: "branch"
- `functionParams`: Empty object `{}`
- `next`: Array of parallel execution paths

#### Prohibited Properties
- `onConditionPass`
- `onConditionFail`
- `conditions`
- `onError`
- `onTimeout`

#### Example

```json
{
  "id": "HHHHHHHHHH",
  "label": "Branch into parallel paths",
  "type": "branch",
  "stepFunction": "branch",
  "functionParams": {},
  "next": [
    // First parallel path
    {
      // ... steps for path 1
    },
    // Second parallel path
    {
      // ... steps for path 2
    }
  ]
}
```

---

### merge

**Type:** `merge`  
**Step Function:** `merge`  
**Purpose:** Merges multiple parallel execution paths back into a single path.

#### Function Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `waitForSteps` | array | ✅ Yes | Array of step IDs | List of step IDs to wait for before proceeding |
| `waitForAll` | boolean | ✅ Yes | - | Whether to wait for all specified steps (`true`) or just any one (`false`) |
| `timeout` | number | ✅ Yes | minimum: -1 | Timeout in minutes to wait for the specified steps (-1 for no timeout) |

#### Required Properties
- `type`: "merge"
- `stepFunction`: "merge"
- `functionParams`: Object with all three parameters
- `next`: Array of next steps

#### Prohibited Properties
- `onConditionPass`
- `onConditionFail`
- `conditions`
- `onError`
- `onTimeout`

#### Example

```json
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
  "next": [
    // ... next steps after merge
  ]
}
```

---

## Termination Steps

### terminate

**Type:** `terminate`  
**Step Function:** `terminate`  
**Purpose:** Terminates/ends the workflow path. Every workflow must have at least one terminate step.

#### Function Parameters

**No parameters required.** This step simply ends the workflow.

#### Required Properties
- `type`: "terminate"
- `stepFunction`: "terminate"
- `functionParams`: Empty object `{}`

#### Prohibited Properties
- `next`
- `onConditionPass`
- `onConditionFail`
- `conditions`
- `onError`
- `onTimeout`

#### Example

```json
{
  "id": "JJJJJJJJJJ",
  "label": "Finish line!!",
  "type": "terminate",
  "stepFunction": "terminate",
  "functionParams": {}
}
```

---

## Common Properties

All workflow steps share the following common properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique 10-character identifier for the step |
| `label` | string | ✅ Yes | Human-readable label for the step (min: 1 character) |
| `type` | string | ✅ Yes | Step type: `trigger`, `task`, `approval`, `decision`, `branch`, `merge`, `terminate` |
| `stepFunction` | string | ✅ Yes | The specific function to execute |
| `functionParams` | object | ✅ Yes | Parameters for the step function |

### Optional Common Properties

| Property | Type | Description |
|----------|------|-------------|
| `timeout` | number | Timeout in seconds (minimum: 1) |
| `retryCount` | number | Number of retry attempts (minimum: 0) |
| `retryDelay` | number | Delay between retries in seconds (minimum: 0) |

### Navigation Properties

Different step types use different navigation properties:

- **Sequential Steps** (trigger, task, branch, merge): Use `next` array
- **Conditional Steps** (approval, checkCondition): Use `onConditionPass` and `onConditionFail`
- **Switch Steps** (multiCheckCondition): Use `conditions` array with `value` and `step` pairs
- **Terminal Steps** (terminate): No navigation properties

---

## Reserved Variables

The following variables are reserved and available in all workflow contexts:

| Variable | Description |
|----------|-------------|
| `${requestorUserId}` | User ID of the person who initiated the request |
| `${requestorEmail}` | Email address of the requestor |
| `${requestorName}` | Full name of the requestor |
| `${requestorManager}` | Manager's user ID of the requestor |
| `${requestorDepartment}` | Department of the requestor |
| `${today}` | Current date |
| `${now}` | Current timestamp |

---

## Step Type Configuration

Each step type has associated UI configuration:

| Type | Label | Color | Icon |
|------|-------|-------|------|
| `trigger` | Trigger | #16A249 (Green) | start |
| `decision` | Decision | #7C3BED (Purple) | help_center |
| `approval` | Approval | #7C3BED (Purple) | person_check |
| `task` | Task | #7C3BED (Purple) | task_alt |
| `terminate` | End | #090909 (Black) | stop_circle |
| `branch` | Branch | #FFA000 (Orange) | graph_2 |
| `merge` | Merge | #0288D1 (Blue) | family_history |
| `workflow` | Workflow | #7B1FA2 (Purple) | flowchart |

---

## Validation Checklist

When creating workflow steps, ensure:

- ✅ Unique 10-character IDs for all steps
- ✅ Workflow starts with a trigger step
- ✅ Workflow ends with a terminate step
- ✅ All step references are resolvable
- ✅ Labels are human-readable
- ✅ JSON is valid per schema
- ✅ Template IDs reference valid templates (use appropriate `getList*` tools)
- ✅ No prohibited properties are present for each step type
- ✅ All required properties are present

---

## JSON-Rules-Engine Condition Schema

For `checkCondition` steps, the `evaluate` parameter must follow the json-rules-engine format:

### Leaf Condition

```json
{
  "fact": "factName",
  "operator": "operatorName",
  "value": "comparisonValue"
}
```

**Properties:**
- `fact` (required): The fact to evaluate
- `operator` (required): The comparison operator
- `value` (optional): Value to compare against (either `value` or `valueFact` must be present)
- `valueFact` (optional): Another fact to compare against
- `path` (optional): Path within the fact object
- `params` (optional): Additional parameters

### Condition Group

**AND Logic (all must be true):**
```json
{
  "all": [
    { "fact": "fact1", "operator": "equal", "value": "value1" },
    { "fact": "fact2", "operator": "greaterThan", "value": 100 }
  ]
}
```

**OR Logic (at least one must be true):**
```json
{
  "any": [
    { "fact": "fact1", "operator": "equal", "value": "value1" },
    { "fact": "fact2", "operator": "equal", "value": "value2" }
  ]
}
```

Condition groups can be nested to create complex logic.

---

## Notes

1. **Template IDs**: Never invent template IDs. Always use the appropriate tool (`getListOfRequestTemplates`, `getListOfMRFTemplates`, `getListOfNotificationTemplates`, `getListOfApprovalTemplates`) to retrieve valid template IDs.

2. **Step IDs**: Use unique 10-character identifiers for all steps. These can be generated using the `short-unique-id` package.

3. **Nesting**: Steps can be embedded within navigation properties (`next`, `onConditionPass`, `onConditionFail`, or `step` in conditions array) or referenced by ID.

4. **Facts**: When using `checkCondition` or `multiCheckCondition`, ensure facts are available in the workflow context. Use `getMRFFacts` or `getRequestFacts` tools to get available facts based on the workflow trigger.

---

**Last Updated:** October 24, 2025
