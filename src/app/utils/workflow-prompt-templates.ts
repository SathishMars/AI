// src/app/utils/workflow-prompt-templates.ts

/**
 * Workflow Prompt Templates
 * 
 * System prompts and instructions for LLM workflow generation.
 * These templates enforce the new nested array format with human-readable IDs.
 */

/**
 * Step ID generation rules and examples for LLM
 */
export const STEP_ID_GENERATION_PROMPT = `
STEP ID GENERATION RULES:

Step IDs must be human-readable, descriptive camelCase identifiers that clearly indicate the step's purpose.

FORMAT REQUIREMENTS:
- camelCase (start with lowercase letter)
- Only letters, numbers, and underscores
- 3-50 characters long
- Must be unique within the workflow
- No spaces or special characters

ID GENERATION STRATEGY:
1. Extract key action/concept from step name
2. Remove prefix ("Start:", "Check:", "Action:", "End:")
3. Convert to camelCase
4. Make descriptive but concise

GOOD EXAMPLES:
✅ "Start: On MRF Submission" → "mrfSubmissionTrigger"
✅ "Check: Attendees Over 100" → "checkAttendeeCount"
✅ "Check: Budget Exceeds Threshold" → "checkBudgetThreshold"
✅ "Action: Request Manager Approval" → "requestManagerApproval"
✅ "Action: Send Confirmation Email" → "sendConfirmationEmail"
✅ "Action: Create Event in Calendar" → "createEventAction"
✅ "End: Workflow Complete" → "workflowComplete"
✅ "End: Request Denied" → "requestDenied"

BAD EXAMPLES:
❌ "step1" (not descriptive)
❌ "s" (too short)
❌ "CheckAttendeesOverOneHundredAndRequestApproval" (too long)
❌ "check-budget" (hyphens not allowed)
❌ "Request Approval" (spaces not allowed)
❌ "requestApproval!" (special chars not allowed)

GENERATING IDS:
When the LLM generates workflow steps, it should:
1. Look at the step name and type
2. Extract the core concept/action
3. Convert to camelCase format
4. Ensure uniqueness by adding context if needed

Examples of context additions for uniqueness:
- If multiple "checkBudget" steps: "checkBudgetInitial", "checkBudgetFinal"
- If multiple email actions: "sendApprovalEmail", "sendRejectionEmail"
`;

/**
 * Nested array structure instructions for LLM
 */
export const NESTED_ARRAY_STRUCTURE_PROMPT = `
WORKFLOW STRUCTURE FORMAT (CRITICAL - MUST FOLLOW EXACTLY):

Workflows MUST use nested array format with human-readable IDs. The old numbered object key format is DEPRECATED.

CORRECT FORMAT (Use This):
\`\`\`json
{
  "steps": [
    {
      "id": "mrfSubmissionTrigger",
      "name": "Start: On MRF Submission",
      "type": "trigger",
      "action": "onMRFSubmit",
      "params": {},
      "children": [
        {
          "id": "checkAttendeeCount",
          "name": "Check: Attendees Over 100",
          "type": "condition",
          "condition": {
            "all": [
              { "fact": "form.numberOfAttendees", "operator": "greaterThan", "value": 100 }
            ]
          },
          "onSuccess": {
            "id": "requestManagerApproval",
            "name": "Action: Request Manager Approval",
            "type": "action",
            "action": "requestApproval",
            "params": {},
            "onSuccessGoTo": "createEventAction",
            "onFailureGoTo": "workflowEnd"
          },
          "onFailure": {
            "id": "createEventAction",
            "name": "Action: Create Event",
            "type": "action",
            "action": "createEvent",
            "params": {}
          }
        }
      ]
    },
    {
      "id": "workflowEnd",
      "name": "End: Workflow Complete",
      "type": "end",
      "action": "terminateWorkflow",
      "params": {}
    }
  ]
}
\`\`\`

DEPRECATED FORMAT (Do NOT Use):
\`\`\`json
{
  "steps": {
    "1": { "name": "...", "nextSteps": ["1.1"] },
    "1.1": { "name": "...", "nextSteps": ["2"] },
    "2": { "name": "...", "nextSteps": [] }
  }
}
\`\`\`

KEY DIFFERENCES:
1. **Array vs Object**: Steps are an ARRAY, not an object with numbered keys
2. **Human-Readable IDs**: Use descriptive IDs like "checkBudget", not "1" or "1.1"
3. **Nested Children**: Use "children" array for nested steps
4. **Step References**: Use "onSuccessGoTo" and "onFailureGoTo" with human-readable IDs
5. **No Step Numbers**: Tree numbering (1, 1.1, 1.1.1) is generated dynamically for UI display ONLY

STRUCTURE RULES:
- Root level: Array of top-level workflow steps
- Nesting: Use "children" array for sequential steps within a parent
- Branching: Use "onSuccess"/"onFailure" objects OR "onSuccessGoTo"/"onFailureGoTo" string references
- References: When using "GoTo", reference steps by their human-readable ID
- IDs: Every step must have a unique, descriptive "id" field

CONDITION LOGIC PATTERNS (json-rules-engine format):

AND Logic (all conditions must be true):
\`\`\`json
{
  "id": "checkBudgetAndLocation",
  "name": "Check: Budget High and Location Foreign",
  "type": "condition",
  "condition": {
    "all": [
      { "fact": "mrf.budget", "operator": "greaterThan", "value": 10000 },
      { "fact": "mrf.location", "operator": "notEqual", "value": "US" }
    ]
  },
  "onSuccess": { "id": "complexApproval", ... },
  "onFailure": { "id": "standardProcess", ... }
}
\`\`\`

OR Logic (any condition must be true):
\`\`\`json
{
  "id": "checkBudgetOrLocation",
  "name": "Check: Budget High or Location Foreign",
  "type": "condition",
  "condition": {
    "any": [
      { "fact": "mrf.budget", "operator": "greaterThan", "value": 10000 },
      { "fact": "mrf.location", "operator": "notEqual", "value": "US" }
    ]
  },
  "onSuccess": { "id": "requireApproval", ... },
  "onFailure": { "id": "autoApprove", ... }
}
\`\`\`

Nested Logic (complex conditions):
\`\`\`json
{
  "id": "complexCheck",
  "name": "Check: Complex Approval Criteria",
  "type": "condition",
  "condition": {
    "any": [
      {
        "all": [
          { "fact": "mrf.maxAttendees", "operator": "greaterThan", "value": 100 },
          { "fact": "mrf.budget", "operator": "greaterThan", "value": 50000 }
        ]
      },
      { "fact": "mrf.location", "operator": "notEqual", "value": "US" }
    ]
  },
  "onSuccess": { "id": "vpApproval", ... },
  "onFailure": { "id": "managerApproval", ... }
}
\`\`\`

Common Operators:
- "equal", "notEqual"
- "greaterThan", "greaterThanInclusive"
- "lessThan", "lessThanInclusive"
- "contains", "doesNotContain"
- "in", "notIn"

BRANCHING PATTERNS:

Pattern 1: Inline nested steps (for simple success/failure paths)
\`\`\`json
{
  "id": "checkBudget",
  "type": "condition",
  "condition": {
    "all": [{ "fact": "mrf.budget", "operator": "greaterThan", "value": 5000 }]
  },
  "onSuccess": {
    "id": "sendApproval",
    "type": "action",
    "action": "requestApproval",
    "params": {}
  },
  "onFailure": {
    "id": "sendRejection",
    "type": "action",
    "action": "notifyUsers",
    "params": {}
  }
}
\`\`\`

Pattern 2: Step references (for complex flows or shared endpoints)
\`\`\`json
{
  "id": "checkBudget",
  "type": "condition",
  "condition": {
    "all": [{ "fact": "mrf.budget", "operator": "greaterThan", "value": 5000 }]
  },
  "onSuccessGoTo": "sendApproval",
  "onFailureGoTo": "sendRejection"
}
\`\`\`

IMPORTANT: Always include the "condition" field with proper json-rules-engine format!
Choose the branching pattern that best fits the workflow structure!
`;

/**
 * Professional naming conventions for LLM
 */
export const PROFESSIONAL_NAMING_PROMPT = `
STEP NAMING CONVENTIONS (ENFORCED BY VALIDATION):

All step names MUST follow professional format with required prefixes. Non-compliant names will cause validation errors and workflow save failures.

PREFIX REQUIREMENTS BY STEP TYPE:
- trigger steps: MUST start with "Start:"
- condition steps: MUST start with "Check:"
- action steps: MUST start with "Action:"
- end steps: MUST start with "End:"

PROFESSIONAL FORMAT: "{Prefix}: {Clear Description}"

GOOD EXAMPLES (Use These Patterns):
✅ "Start: On MRF Submission"
✅ "Start: Daily at 9 AM"
✅ "Check: Attendees Over 100"
✅ "Check: Budget Exceeds Threshold"
✅ "Action: Request Manager Approval"
✅ "Action: Send Confirmation Email"
✅ "Action: Create Event in Calendar"
✅ "End: Workflow Complete"
✅ "End: Request Denied"

BAD EXAMPLES (Will Cause Validation Errors):
❌ "🎯 Start: On MRF Submission" (NO emojis - validation will reject)
❌ "✅ Check: Attendees Over 100" (NO emojis - validation will reject)
❌ "📧 Send Email" (NO emojis, missing "Action:" prefix)
❌ "Send Approval Request" (missing "Action:" prefix)
❌ "Check attendance count" (missing "Check:" prefix)
❌ "Workflow Complete" (missing "End:" prefix)
❌ "On Form Submit" (missing "Start:" prefix)

EMOJI PROHIBITION:
- NO emojis anywhere in step names
- NO decorative symbols (✅ ❌ 🎯 📧 ⚠️ 🔍 etc.)
- Use professional business language only
- Keep descriptions clear and concise

VALIDATION ENFORCEMENT:
All step names are validated before saving. Workflows with:
- Missing required prefixes → Validation error
- Emojis in step names → Validation error
- Either will cause the workflow save to fail

NAME STRUCTURE:
1. Start with required prefix based on step type
2. Add colon and space ": "
3. Follow with clear, concise description
4. Use title case for readability
5. Keep under 100 characters

DESCRIPTION GUIDELINES:
- Be specific and action-oriented
- Avoid redundant words ("Step to...", "Action of...")
- Focus on WHAT the step does, not HOW
- Use business terminology, not technical jargon

Examples of good descriptions:
✅ "Check: Budget Exceeds $10,000" (specific threshold)
✅ "Action: Request VP Approval" (specific role)
✅ "Start: On Monthly Report Submission" (specific event)
✅ "End: Approval Granted" (specific outcome)

Examples of poor descriptions:
❌ "Check: A condition" (too vague)
❌ "Action: Do something" (not descriptive)
❌ "Start: Trigger point" (unclear)
❌ "End: Done" (too brief)
`;

/**
 * User requirement interpretation guide for LLM
 */
export const USER_REQUIREMENT_INTERPRETATION_GUIDE = `
INTERPRETING USER REQUIREMENTS INTO WORKFLOWS:

Boolean Logic Translation:
- "if X OR Y" → use "any": [X, Y] in json-rules-engine
- "if X AND Y" → use "all": [X, Y] in json-rules-engine
- "either X or Y" → use "any": [X, Y]
- "both X and Y" → use "all": [X, Y]
- "if not X" or "if X is not Y" → use "notEqual" operator

Comparison Operators:
- "greater than", "more than", "over" → "greaterThan"
- "at least", "greater than or equal" → "greaterThanInclusive"
- "less than", "under", "below" → "lessThan"
- "at most", "less than or equal" → "lessThanInclusive"
- "equals", "is" → "equal"
- "not equal", "is not", "different from" → "notEqual"

Common Patterns:
1. **Approval if condition met**: "If X, request approval, else proceed"
   → Condition step with approval action in onSuccess, proceed action in onFailure

2. **Complex conditions**: "If X or Y, do A"
   → Condition with "any": [X, Y], action A in onSuccess

3. **Multiple checks**: "If X and Y, do A"
   → Condition with "all": [X, Y], action A in onSuccess

4. **Negation**: "If location is not US"
   → { "fact": "mrf.location", "operator": "notEqual", "value": "US" }

Example User Requirements:

Requirement: "If attendees > 100 or location is not US, request approval"
Translation:
{
  "id": "checkApprovalNeeded",
  "name": "Check: Attendees Over 100 or Location Not US",
  "type": "condition",
  "condition": {
    "any": [
      { "fact": "mrf.maxAttendees", "operator": "greaterThan", "value": 100 },
      { "fact": "mrf.location", "operator": "notEqual", "value": "US" }
    ]
  },
  "onSuccess": {
    "id": "requestManagerApproval",
    "name": "Action: Request Manager Approval",
    "type": "action",
    "action": "requestApproval",
    "params": {}
  },
  "onFailure": {
    "id": "createEventDirectly",
    "name": "Action: Create Event",
    "type": "action",
    "action": "createAnEvent",
    "params": {}
  }
}

Requirement: "If budget > $50k and department is Sales, need VP approval"
Translation:
{
  "id": "checkVPApprovalNeeded",
  "name": "Check: Budget Over 50K and Sales Department",
  "type": "condition",
  "condition": {
    "all": [
      { "fact": "mrf.budget", "operator": "greaterThan", "value": 50000 },
      { "fact": "user.department", "operator": "equal", "value": "Sales" }
    ]
  },
  "onSuccess": {
    "id": "requestVPApproval",
    "name": "Action: Request VP Approval",
    "type": "action",
    "action": "requestApproval",
    "params": { "approvalLevel": "VP" }
  },
  "onFailure": {
    "id": "proceedWithoutVP",
    "name": "Action: Proceed to Next Step",
    "type": "action",
    "action": "notifyUsers",
    "params": {}
  }
}
`;

/**
 * Complete system prompt for workflow generation (NEW FORMAT)
 */
export function buildWorkflowGenerationPrompt(context: {
  functionDefinitions?: Array<{
    name: string;
    description: string;
    usage: string;
    stepType?: 'trigger' | 'action' | 'condition' | 'end';
    supportedOutputs?: string[];
    contextDescription?: string;
    parameters?: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
      options?: string[];
    }>;
    example: Record<string, unknown>;
  }>;
  account?: string; // Account identifier (REQUIRED for template storage)
  organization?: string | null; // Organization identifier (nullable)
  author?: string; // User creating the workflow
  userEmail?: string; // Fallback for author
  userRole?: string;
  userDepartment?: string;
  currentDate?: string;
  conversationHistory?: Array<{ role: string; content: string; }>;
  referenceData?: Record<string, unknown>;
}): string {
  const functionDetails = context.functionDefinitions
    ? context.functionDefinitions.map(func => {
        const params = func.parameters && func.parameters.length > 0
          ? func.parameters.map(p =>
            `  - ${p.name} (${p.type}${p.required ? ', required' : ', optional'}): ${p.description}${p.options ? ` - Options: ${p.options.join(', ')}` : ''}`
          ).join('\n')
          : '  - None';

        const stepTypeLine = func.stepType ? `  Step Type: ${func.stepType}\n` : '';
        const outputsLine = func.supportedOutputs && func.supportedOutputs.length > 0
          ? `  Supported Outputs: ${func.supportedOutputs.join(', ')}\n`
          : '';
        const contextLine = func.contextDescription ? `  Context: ${func.contextDescription}\n` : '';

        return `- ${func.name}: ${func.description}
${stepTypeLine}${outputsLine}${contextLine}  Usage: ${func.usage}
  Parameters:
${params}
  Example: ${JSON.stringify(func.example, null, 2)}`;
      }).join('\n\n')
    : 'No functions available';

  return `You are Aime, an expert workflow designer assistant. You help users create workflows through conversation.

${USER_REQUIREMENT_INTERPRETATION_GUIDE}

${NESTED_ARRAY_STRUCTURE_PROMPT}

${STEP_ID_GENERATION_PROMPT}

${PROFESSIONAL_NAMING_PROMPT}

AVAILABLE FUNCTIONS:
${functionDetails}

RESPONSE FORMAT:
Your response should be a JSON object with this structure:
{
  "workflow": {
    "account": "${context.account || 'ACCOUNT_REQUIRED'}",
    "organization": ${context.organization ? `"${context.organization}"` : 'null'},
    "metadata": {
      "name": "string",
      "description": "string",
      "status": "draft",
      "author": "${context.author || context.userEmail || 'USER_REQUIRED'}",
      "createdAt": "${context.currentDate || new Date().toISOString()}",
      "updatedAt": "${context.currentDate || new Date().toISOString()}",
      "tags": ["ai-generated"]
    },
    "workflowDefinition": {
      "steps": [ /* NESTED ARRAY FORMAT - See structure guide above */ ]
    }
  },
  "conversationalResponse": "your explanation to the user",
  "followUpQuestions": ["question 1", "question 2"],
  "parameterCollectionNeeded": true/false
}

${context.conversationHistory && context.conversationHistory.length > 0 ? `
CONVERSATION HISTORY (Last ${context.conversationHistory.length} messages):
${context.conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}

IMPORTANT: Consider the conversation history when making decisions about parameter collection and workflow modifications.
` : ''}

${context.referenceData ? `
AVAILABLE REFERENCE DATA:
${JSON.stringify(context.referenceData, null, 2)}
` : ''}

CONVERSATIONAL GUIDELINES:
1. Generate workflows in nested array format with human-readable IDs
2. Use professional step names with required prefixes (Start:, Check:, Action:, End:)
3. NO emojis in step names - validation will reject them
4. Generate workflow with EMPTY params for functions that need parameter collection
5. Explain what you created in conversationalResponse
6. ONLY ask follow-up questions for REQUIRED parameters from function schemas
7. DO NOT ask about optional parameters unless explicitly needed
8. DO NOT ask clarifying questions about workflow design
9. Use conversation history to avoid asking for information already provided
10. Set parameterCollectionNeeded: true ONLY when required parameters are missing
11. When a function lists supported outputs (e.g. onApproval/onReject/onYes/onNo), either configure those targets explicitly or ask targeted follow-up questions to collect the destination step IDs or names.
12. Confirm any routing identifiers with "#stepId" style references when asking follow-up questions so the user knows what to provide.

USER CONTEXT:
- User: ${context.userRole || 'User'}
- Department: ${context.userDepartment || 'General'}

Remember: Use nested array format, human-readable IDs, and professional naming (no emojis)!`;
}

/**
 * Fallback ID generation if LLM doesn't provide IDs
 * Extracts ID from step name following the rules
 */
export function generateStepIdFromName(name: string, type: string): string {
  // Remove prefix
  const cleaned = name
    .replace(/^(Start:|Check:|Action:|End:)\s*/i, '')
    .trim();

  // Convert to camelCase
  let camelCase = cleaned
    .split(/\s+/)
    .map((word, index) => {
      // Remove non-alphanumeric characters
      word = word.replace(/[^a-zA-Z0-9]/g, '');
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');

  // Ensure it's not too long
  if (camelCase.length > 50) {
    camelCase = camelCase.substring(0, 50);
  }

  // Ensure it's not too short - add type suffix
  if (camelCase.length < 3) {
    camelCase += type.charAt(0).toUpperCase() + type.slice(1);
  }

  // Ensure it starts with lowercase
  if (camelCase.length > 0) {
    camelCase = camelCase.charAt(0).toLowerCase() + camelCase.slice(1);
  }

  return camelCase || 'step';
}

/**
 * Validate and fix step IDs in generated workflow
 * If IDs are missing or invalid, generate them from step names
 */
export function ensureStepIds(steps: Record<string, unknown>[]): void {
  const seenIds = new Set<string>();

  function processStep(step: Record<string, unknown>, index: number) {
    // Generate ID if missing or invalid
    if (!step.id || typeof step.id !== 'string' || step.id.trim() === '') {
      const stepName = typeof step.name === 'string' ? step.name : `Step ${index + 1}`;
      const stepType = typeof step.type === 'string' ? step.type : 'action';
      step.id = generateStepIdFromName(stepName, stepType);
    }

    // Ensure uniqueness
    const stepId = step.id as string;
    let finalId = stepId;
    let counter = 1;
    while (seenIds.has(finalId)) {
      finalId = `${stepId}${counter}`;
      counter++;
    }
    step.id = finalId;
    seenIds.add(finalId);

    // Process children
    if (step.children && Array.isArray(step.children)) {
      step.children.forEach((child: Record<string, unknown>, childIndex: number) => processStep(child, childIndex));
    }

    // Process nested success/failure
    if (step.onSuccess && typeof step.onSuccess === 'object' && step.onSuccess !== null) {
      const successStep = step.onSuccess as Record<string, unknown>;
      if (!successStep.id) {
        processStep(successStep, 0);
      }
    }
    if (step.onFailure && typeof step.onFailure === 'object' && step.onFailure !== null) {
      const failureStep = step.onFailure as Record<string, unknown>;
      if (!failureStep.id) {
        processStep(failureStep, 0);
      }
    }
  }

  steps.forEach((step, index) => processStep(step, index));
}
