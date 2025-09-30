# Focused Parameter Collection Enhancement

## Overview

Enhanced the LLM conversational system to ensure the AI agent stays focused and only asks follow-up questions that are strictly required by the workflow schema and predefined function parameters. This prevents the AI from going off-track or asking irrelevant questions about workflow design or optional enhancements.

## Key Improvements

### 1. Restrictive Conversational Guidelines

**Before**: LLM could ask any clarifying questions about workflow design
**After**: LLM can ONLY ask about missing required parameters from function schemas

### 2. Parameter Classification System

- **Required Parameters**: Must be collected before workflow execution
- **Optional Parameters**: Should be left empty unless explicitly provided by user
- **Focus Rule**: Only ask questions for parameters marked as `required: true`

### 3. Enhanced Function Schema Validation

Added validation functions to ensure proper parameter definitions:
- `validateFunctionSchemas()` - Ensures schemas have proper required/optional classification
- `getRequiredParameters()` - Extracts only required parameters for a function
- `hasAllRequiredParameters()` - Checks if workflow step has all required parameters

## Implementation Details

### Updated Conversational Guidelines

```typescript
CONVERSATIONAL GUIDELINES:
1. Generate workflow with EMPTY params for functions that need parameter collection
2. Explain what you created in conversationalResponse
3. ONLY ask follow-up questions for parameters that are REQUIRED by the function schemas
4. DO NOT ask questions about optional parameters unless explicitly needed for workflow logic
5. DO NOT ask clarifying questions about workflow design preferences or general requirements
6. Use conversation history to avoid asking for information already provided
7. Reference available templates/users/workflows when suggesting parameters
8. For onMRFSubmit triggers with empty params, ask ONLY: "Which MRF form should trigger this workflow?"
9. For requestApproval actions with empty params, ask ONLY: "Who should receive the approval request?"
10. For createEvent actions with empty params, ask ONLY: "Which MRF should be used for event creation?"
11. For sendNotification actions with empty params, ask ONLY: "Who should receive the notification?" and "What should the subject line be?"
12. For onScheduledEvent triggers with empty params, ask ONLY: "What schedule should trigger this workflow?"
13. Set parameterCollectionNeeded: true ONLY when required parameters are missing from function schemas
14. Keep responses professional and avoid excessive emojis or icons
15. Focus ONLY on collecting missing required parameters - do not suggest workflow improvements or alternatives
16. If all required parameters are present, set parameterCollectionNeeded: false and do not ask follow-up questions
```

### Valid vs Invalid Questions

**✅ VALID Questions (Parameter Collection)**:
- "Which MRF form should trigger this workflow?" (for onMRFSubmit.mrfID)
- "Who should receive the approval request?" (for requestApproval.to)
- "What should the notification subject be?" (for sendNotification.subject)
- "What schedule should trigger this workflow?" (for onScheduledEvent.schedule)

**❌ INVALID Questions (Design/Enhancement)**:
- "Would you like to add error handling to this workflow?"
- "Should we add a delay between steps?"
- "Do you want to customize the workflow name?"
- "Would you like to add logging for this step?"
- "Should we include additional notification recipients?"
- "Do you want to set a different approval threshold?"
- "Would you like to add validation steps?"

## Function Schema Requirements

Each function schema must clearly define required vs optional parameters:

```typescript
{
  name: 'requestApproval',
  parameters: {
    to: {
      type: 'string',
      description: 'Email address of the person who should approve',
      required: true,     // REQUIRED - LLM will ask about this
      options: ['manager@company.com', 'director@company.com']
    },
    cc: {
      type: 'string', 
      description: 'Additional email addresses to copy',
      required: false     // OPTIONAL - LLM will NOT ask about this
    },
    subject: {
      type: 'string',
      description: 'Subject line for the approval request',
      required: false     // OPTIONAL - LLM will NOT ask about this
    }
  }
}
```

## Validation Logic

The system now validates that:

1. **Parameter Requirements**: Only required parameters trigger follow-up questions
2. **Schema Completeness**: Function schemas have proper required/optional classification
3. **Question Relevance**: Follow-up questions directly map to missing required parameters
4. **Completion Logic**: `parameterCollectionNeeded` is true only when required parameters are missing

## Benefits

### 1. **Focused Conversations**
- LLM stays on task and doesn't ask irrelevant questions
- Users get prompted only for essential information
- Reduced conversation length and faster workflow completion

### 2. **Predictable Behavior**
- Consistent questioning based on function schema requirements
- No subjective design questions or optional enhancements
- Clear completion criteria for parameter collection

### 3. **Better User Experience**
- No overwhelm with unnecessary questions
- Clear, actionable prompts for missing required information
- Faster path to functional workflow creation

### 4. **Maintainable System**
- Question logic tied directly to function schemas
- Easy to update parameter requirements by modifying schemas
- Validation functions ensure schema quality

## Example Workflow

**User Request**: "Create a workflow for event approvals"

**LLM Response**:
```json
{
  "workflow": {
    "steps": {
      "triggerOnMRF": {
        "name": "MRF Submitted",
        "type": "trigger", 
        "action": "onMRFSubmit",
        "params": {}  // Empty - needs mrfID
      },
      "requestApproval": {
        "name": "Request Approval",
        "type": "action",
        "action": "requestApproval", 
        "params": {}  // Empty - needs to
      }
    }
  },
  "conversationalResponse": "I've created an event approval workflow with two steps: a trigger when an MRF is submitted, and an approval request action.",
  "followUpQuestions": [
    "Which MRF form should trigger this workflow? Options: Event Request Form, Equipment Request Form",
    "Who should receive the approval request? Options: sarah.manager@company.com, mike.director@company.com"
  ],
  "parameterCollectionNeeded": true
}
```

**Key Points**:
- Only asks about required parameters (`mrfID` and `to`)
- Doesn't ask about optional parameters (`mrfName`, `cc`, `subject`)
- Provides specific options when available
- Clear completion criteria

## Future Enhancements

1. **Dynamic Schema Updates**: Update function schemas based on actual API changes
2. **Parameter Dependencies**: Handle cases where one parameter's value affects another's requirements
3. **Conditional Requirements**: Support parameters that are required only under certain conditions
4. **Auto-completion**: Pre-fill parameters based on conversation context when possible

This focused approach ensures the AI assistant remains helpful while staying strictly within the bounds of what's actually needed for workflow functionality.