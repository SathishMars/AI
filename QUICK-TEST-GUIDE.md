# Quick Test Guide - Workflow Generation with OR Logic

## Your Original Prompt (Try Again)
```
On receiving the mrf, if either the mrf.location is not US or if the mrf.maxAttendees is greater than 100 it will need to go for approval from manager else it we can directly create an event.
```

## Expected Output: 5 Steps

1. **Start: On MRF Submission** (trigger)
2. **Check: Location Not US or Attendees Over 100** (condition with OR logic)
3. **Action: Request Manager Approval** (if condition passes)
4. **Action: Create Event** (if condition fails)
5. **End: Workflow Complete** (end step)

## Alternative Prompts (If Original Still Fails)

### Option 1: More Explicit
```
Create a workflow that starts when an MRF is submitted. Add a condition check with OR logic: if location is not equal to 'US' OR if maxAttendees is greater than 100, then request manager approval. Otherwise, create the event directly.
```

### Option 2: Step-by-Step
```
Build this workflow step by step:
1. Trigger on MRF submission
2. Check: (mrf.location != "US") OR (mrf.maxAttendees > 100)
3. If true: Request approval from manager
4. If false: Create event automatically
5. End workflow
```

### Option 3: Rule Format
```
Create approval workflow with this rule: Approval required if location is not US or attendees exceed 100, otherwise proceed with event creation
```

## How to Check the Result

### In Browser Console
Look for these logs:
```
🔍 API Response Structure: ...
✅ Updating workflow with: ...
```

### Check for These Key Elements

1. **Condition step exists** with:
   - `"type": "condition"`
   - `"condition"` object present

2. **OR logic present**:
   ```json
   "condition": {
     "any": [
       { "fact": "mrf.location", "operator": "notEqual", "value": "US" },
       { "fact": "mrf.maxAttendees", "operator": "greaterThan", "value": 100 }
     ]
   }
   ```

3. **Branching exists**:
   - `onSuccess` with approval action
   - `onFailure` with create event action

4. **Step count**: Should have 4-5 steps total

## If Still Only 2 Steps Generated

### Check:
1. **Which LLM provider** is being used (console should show `🤖 Using LLM provider: ...`)
2. **Function definitions** are loaded (check `availableFunctions` count in console)
3. **Temperature setting** (should be 0.1-0.3 for structured output)

### Try:
1. **Restart the server** to load new prompt templates
2. **Clear conversation history** to start fresh
3. **Use simpler test** like: "If attendees > 100, request approval, else create event"

## Success Criteria

✅ Workflow has 4-5 steps (not just 2)
✅ Condition step uses `"any": []` for OR logic
✅ `notEqual` operator used for "not US"
✅ `greaterThan` operator used for "> 100"
✅ Approval action in onSuccess branch
✅ Create event action in onFailure branch

## Report Back

If successful: ✅ Share the step count and condition structure

If still failing: Share:
1. Number of steps generated
2. LLM provider (from console)
3. Any error messages
4. The actual JSON structure generated

---

**Note**: The improvements are now in the system. The LLM should have much better examples and guidance for OR logic and complex conditions!
