# Workflow Generation Test - Complex Condition Issue

## User Prompt
"On receiving the mrf, if either the mrf.location is not US or if the mrf.maxAttendees is greater than 100 it will need to go for approval from manager else it we can directly create an event."

## Expected Workflow Structure

The workflow should generate 5+ steps:

### Step 1: Trigger
- **Type**: trigger
- **Action**: onMRFSubmit
- **Name**: "Start: On MRF Submission"

### Step 2: Condition Check (Complex)
- **Type**: condition
- **Name**: "Check: Location Not US or Attendees Over 100"
- **Condition Logic** (json-rules-engine format):
```json
{
  "any": [
    {
      "fact": "mrf.location",
      "operator": "notEqual",
      "value": "US"
    },
    {
      "fact": "mrf.maxAttendees",
      "operator": "greaterThan",
      "value": 100
    }
  ]
}
```

### Step 3a: Approval Branch (onSuccess)
- **Type**: action
- **Action**: requestApproval
- **Name**: "Action: Request Manager Approval"
- **Params**: 
  - `to`: manager email
  - `approvalType`: "Manager Approval"

### Step 3b: Direct Event Creation (onFailure)
- **Type**: action
- **Action**: createAnEvent
- **Name**: "Action: Create Event Directly"

### Step 4: End Step
- **Type**: end
- **Action**: terminateWorkflow
- **Name**: "End: Workflow Complete"

## Problem

Currently only generating 2 steps - likely missing:
- Complex condition with `any` logic
- Approval action step
- Proper branching structure

## Root Cause Analysis

### 1. LLM Prompt Interpretation
The LLM may not be correctly interpreting the boolean logic:
- "**if either** X **or** Y" → Should use `"any": []` in json-rules-engine
- "not US" → Should use `"notEqual"` operator
- "> 100" → Should use `"greaterThan"` operator

### 2. Nested Structure Generation
The prompt templates include examples but may need:
- More explicit examples of `"any": []` conditions
- Clear demonstration of OR logic patterns
- Examples showing "not equal" conditions

### 3. Branching Pattern Selection
The LLM should choose between:
- **Inline nesting**: onSuccess/onFailure as nested objects
- **Step references**: onSuccessGoTo/onFailureGoTo as string IDs

## Debugging Steps

### 1. Check LLM Response
Look at the raw LLM response in browser console:
```javascript
// Look for these console logs:
console.log('🔍 API Response Structure:', ...)
console.log('🔍 Checking result.success:', ...)
console.log('✅ Updating workflow with:', ...)
```

### 2. Check Prompt Being Sent
The system prompt should include:
- NESTED_ARRAY_STRUCTURE_PROMPT with branching patterns
- STEP_ID_GENERATION_PROMPT with ID rules
- PROFESSIONAL_NAMING_PROMPT with prefix requirements
- Function definitions including `requestApproval` and `createAnEvent`

### 3. Verify Function Definitions
Ensure these functions are in the context:
- `requestApproval` (approval category)
- `createAnEvent` (event-management category)
- `onMRFSubmit` (trigger category)
- `terminateWorkflow` (workflow-control category)

## Potential Fixes

### Fix 1: Enhanced Condition Examples
Add more explicit OR condition examples to `NESTED_ARRAY_STRUCTURE_PROMPT`:

```typescript
// Example: Complex OR condition
{
  "id": "checkMultipleConditions",
  "name": "Check: Budget High or Location Foreign",
  "type": "condition",
  "condition": {
    "any": [  // ANY = OR logic
      { "fact": "mrf.budget", "operator": "greaterThan", "value": 10000 },
      { "fact": "mrf.location", "operator": "notEqual", "value": "US" }
    ]
  },
  "onSuccess": { "id": "requestApproval", ... },
  "onFailure": { "id": "proceedDirectly", ... }
}
```

### Fix 2: Explicit Boolean Logic Guidelines
Add to prompts:
```
BOOLEAN LOGIC PATTERNS:
- "if X OR Y" → use "any": [X, Y]
- "if X AND Y" → use "all": [X, Y]
- "not equal" → use "notEqual" operator
- "not X" → use negation or notEqual
```

### Fix 3: Testing with Simplified Prompts
Try these simpler variations to isolate the issue:

#### Test 1: Simple OR condition
"If attendees > 100 OR location is not US, request approval"

#### Test 2: Separate conditions
"If attendees > 100, request approval. Otherwise create event."

#### Test 3: Explicit step-by-step
"Create a workflow: 1) Trigger on MRF, 2) Check if attendees>100 OR location!=US, 3) If yes request approval, 4) If no create event"

## LLM Provider Considerations

### OpenAI (GPT-4)
- Should handle complex nested JSON well
- May need more explicit examples of `any` vs `all`
- Temperature should be low (0.1-0.3) for structured output

### Anthropic (Claude)
- Excellent at following structured formats
- May interpret "or" more strictly
- Provide clear json-rules-engine documentation

### LM Studio (Local)
- Model capability dependent
- May need simpler prompts
- Smaller models may struggle with complex nesting
- Consider using llama-3.1-8b-instruct or better

## Recommended Prompt Improvements

### For Your Use Case
Try rephrasing:

**Option 1 (Explicit logic)**:
"Create a workflow: On MRF submission, check if EITHER the location field is not 'US' OR the maxAttendees field is greater than 100. If this condition is TRUE, request manager approval. If this condition is FALSE, create the event directly."

**Option 2 (Step-by-step)**:
"1. Start when MRF is submitted
2. Add a condition check with OR logic: location != 'US' OR maxAttendees > 100
3. If condition passes, request manager approval
4. If condition fails, create event
5. End workflow"

**Option 3 (Rule-based)**:
"Create approval workflow with this rule: Require approval if (mrf.location is not US) OR (mrf.maxAttendees > 100), otherwise auto-approve"

## Next Steps

1. **Check browser console** for the actual generated workflow
2. **Verify LLM provider** being used (OpenAI vs Anthropic vs LM Studio)
3. **Try simplified prompts** from above to isolate issue
4. **Check function availability** in the context
5. **Review LLM temperature settings** - should be low for structured output

## Code to Check

### Files to Review:
1. `src/app/utils/workflow-prompt-templates.ts` - Prompt definitions
2. `src/app/utils/langchain/langchain-workflow-generator.ts` - LLM integration
3. `src/app/api/langchain/generate-workflow/route.ts` - API endpoint
4. Browser console - Actual LLM responses

### Key Points:
- System prompt should include all function definitions
- Response should be parsed correctly from JSON
- Nested array structure should be maintained
- Condition should use `any: []` for OR logic
