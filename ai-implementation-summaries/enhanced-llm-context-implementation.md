# Enhanced LLM Context Implementation

## Summary

Successfully implemented enhanced context for LLM conversations to provide more intelligent parameter collection and workflow generation. The LLM now receives comprehensive context including conversation history, detailed function schemas, and reference data.

## Key Enhancements

### 1. Conversation History (Last 10 Message Pairs)
- **Location**: `WorkflowCreationPane.tsx` - `getConversationHistory()` function
- **Format**: Array of `{role: 'user'|'assistant', content: string, timestamp: string}`
- **Purpose**: Allows LLM to avoid asking for information already provided
- **Implementation**: Filters out welcome messages, takes last 20 messages (up to 10 conversation pairs)

### 2. Detailed Function Schemas
- **Location**: `src/app/utils/function-schemas.ts`
- **Functions Covered**: 
  - `onMRFSubmit` - MRF form submission triggers
  - `requestApproval` - Approval request actions
  - `createEvent` - Event creation actions
  - `sendNotification` - Notification actions
  - `onScheduledEvent` - Scheduled triggers
  - `onApprovalReceived` - Approval response triggers
  - `updateMRFStatus` - MRF status updates
- **Schema Structure**: 
  ```typescript
  {
    name: string,
    description: string,
    parameters: {
      [key]: {
        type: string,
        description: string,
        required: boolean,
        options?: string[]
      }
    }
  }
  ```

### 3. Reference Data for Intelligent Suggestions
- **MRF Templates**: Available form templates with categories
- **Users**: Available users with roles for approval assignments
- **Approval Workflows**: Predefined approval processes
- **Purpose**: Enables LLM to suggest specific values instead of asking generic questions

### 4. Enhanced Context Types
- **New Interface**: `ConversationHistoryMessage` for conversation tracking
- **Enhanced Interface**: `WorkflowGenerationContext` with optional enhanced fields
- **New Interface**: `FunctionSchema` for detailed function definitions

## Technical Implementation

### Context Flow
1. **Frontend** (`WorkflowCreationPane.tsx`):
   - Gathers conversation history via `getConversationHistory()`
   - Populates function schemas via `populateFunctionSchemas()`
   - Creates enhanced context with reference data
   - Sends to API endpoint

2. **API Endpoint** (`/api/generate-workflow/route.ts`):
   - Preserves enhanced context fields during merging
   - Passes complete context to LLM generator

3. **LLM Generator** (`llm-workflow-generator.ts`):
   - Enhanced system prompt includes:
     - Detailed function schemas with parameters
     - Conversation history analysis
     - Available reference data for suggestions
   - Smarter parameter collection guidelines

### Context Structure Sent to LLM
```typescript
{
  // Standard context
  user: { id, name, email, role, department, manager },
  mrf: { id, title, purpose, maxAttendees, dates, location, budget },
  availableFunctions: string[],
  currentDate: string,
  
  // Enhanced context
  functionSchemas?: FunctionSchema[], // Detailed parameter definitions
  conversationHistory?: ConversationHistoryMessage[], // Last 10 message pairs
  referenceData?: {
    mrfTemplates: Array<{id, name, category}>,
    users: Array<{id, name, email, role}>,
    approvalWorkflows: Array<{id, name, approvers}>
  }
}
```

## Expected Benefits

### 1. Smarter Parameter Collection
- LLM won't ask for information already provided in conversation
- LLM can suggest specific users/templates instead of generic prompts
- LLM understands parameter requirements for each function

### 2. Better Conversation Flow
- Contextual awareness of previous requests
- Ability to build on earlier conversation points
- More natural parameter collection process

### 3. Intelligent Suggestions
- "Which MRF form should trigger this workflow?" → Suggests available templates
- "Who should receive the approval request?" → Suggests available users/workflows
- Function parameters include example values and constraints

## Example Enhanced Prompts

### Before Enhancement
```
"For onMRFSubmit triggers, ask 'Which MRF form should trigger this workflow?'"
```

### After Enhancement
```
"For onMRFSubmit triggers, ask 'Which MRF form should trigger this workflow?' 
Available options: Event Request Form (Events), Equipment Request Form (Resources)
Based on conversation history, user mentioned 'event approval' so suggest Event Request Form"
```

## Configuration

### Function Schema Updates
- Modify `src/app/utils/function-schemas.ts` to add new functions or parameters
- Update `DEFAULT_REFERENCE_DATA` for new templates/users/workflows

### Conversation History Limits
- Currently set to last 20 messages (10 pairs) in `getConversationHistory()`
- Adjustable based on token limits and performance needs

## Testing

The implementation has been tested with:
- ✅ Function schema structure validation
- ✅ Conversation history format verification
- ✅ Reference data population
- ✅ Context merging in API endpoint
- ✅ Enhanced system prompt generation

## Future Enhancements

1. **Dynamic Reference Data**: Fetch MRF templates and users from actual APIs
2. **Context Compression**: Summarize old conversation history for longer sessions
3. **User Preferences**: Remember user's common choices for faster parameter collection
4. **Validation Rules**: Add parameter validation based on function schemas