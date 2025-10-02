// src/app/utils/llm-workflow-context.ts

import { getLLMContext } from '@/app/data/workflow-conversation-autocomplete';

/**
 * Generates comprehensive context for LLM workflow generation
 * This includes all available functions, user context variables, date functions, etc.
 */
export function generateLLMWorkflowContext(): string {
  const contextData = getLLMContext();
  
  let context = `
# Workflow Builder Context

## Available Functions and Variables

You can use the following in workflow JSON generation:

`;

  // Group by category
  const categories = contextData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof contextData>);

  // Functions section
  if (categories.function) {
    context += `\n### 🔧 Available Functions (@)\n`;
    categories.function.forEach(item => {
      context += `\n**${item.name}**\n`;
      context += `- Description: ${item.description}\n`;
      context += `- Usage: ${item.usage}\n`;
      if (item.parameters && item.parameters.length > 0) {
        context += `- Parameters:\n`;
        item.parameters.forEach(param => {
          const required = param.required ? '(required)' : '(optional)';
          context += `  - ${param.name} ${required}: ${param.description}\n`;
        });
      }
      context += `- JSON Example:\n\`\`\`json\n${JSON.stringify(item.example, null, 2)}\n\`\`\`\n`;
    });
  }

  // User Context section
  if (categories.userContext) {
    context += `\n### 👤 User Context Variables (user.)\n`;
    context += `Access current user information in workflow conditions:\n`;
    categories.userContext.forEach(item => {
      context += `\n**user.${item.name}**\n`;
      context += `- Description: ${item.description}\n`;
      context += `- Usage: ${item.usage}\n`;
      context += `- JSON Example:\n\`\`\`json\n${JSON.stringify(item.example, null, 2)}\n\`\`\`\n`;
    });
  }

  // Date Functions section
  if (categories.dateFunction) {
    context += `\n### 📅 Date Functions (date.)\n`;
    context += `Use these for temporal logic and date comparisons:\n`;
    categories.dateFunction.forEach(item => {
      context += `\n**date.${item.name}**\n`;
      context += `- Description: ${item.description}\n`;
      context += `- Usage: ${item.usage}\n`;
      if (item.parameters && item.parameters.length > 0) {
        context += `- Parameters:\n`;
        item.parameters.forEach(param => {
          const required = param.required ? '(required)' : '(optional)';
          context += `  - ${param.name} ${required}: ${param.description}\n`;
        });
      }
      context += `- JSON Example:\n\`\`\`json\n${JSON.stringify(item.example, null, 2)}\n\`\`\`\n`;
    });
  }

  // Form Fields section
  if (categories.formField) {
    context += `\n### 📝 Form Field References (mrf.)\n`;
    context += `Reference form field values in workflow conditions:\n`;
    categories.formField.forEach(item => {
      context += `\n**mrf.{fieldName}**\n`;
      context += `- Description: ${item.description}\n`;
      context += `- Usage: ${item.usage}\n`;
      context += `- JSON Example:\n\`\`\`json\n${JSON.stringify(item.example, null, 2)}\n\`\`\`\n`;
    });
  }

  // Step References section
  if (categories.stepReference) {
    context += `\n### 🔗 Step References (#)\n`;
    context += `Reference workflow steps for navigation:\n`;
    categories.stepReference.forEach(item => {
      context += `\n**#{stepName}**\n`;
      context += `- Description: ${item.description}\n`;
      context += `- Usage: ${item.usage}\n`;
      context += `- JSON Example:\n\`\`\`json\n${JSON.stringify(item.example, null, 2)}\n\`\`\`\n`;
    });
  }

  // Add workflow structure guidance
  context += `\n### 📋 Workflow JSON Structure\n`;
  context += `\n**Complete Workflow Example:**\n`;
  context += `\`\`\`json\n`;
  context += JSON.stringify({
    steps: {
      start: {
        name: "Start",
        type: "trigger",
        action: "onMRFSubmit",
        params: { mrfID: "{{mrfID}}" },
        nextSteps: ["checkCondition"]
      },
      checkCondition: {
        name: "Check Approval Required",
        type: "condition",
        condition: {
          all: [
            { fact: "form.budget", operator: "greaterThan", value: 1000 },
            { fact: "user.role", operator: "notEqual", value: "admin" }
          ]
        },
        onSuccess: "requestApproval",
        onFailure: "autoApprove"
      },
      requestApproval: {
        name: "Request Approval",
        type: "action", 
        action: "functions.requestApproval",
        params: {
          approver: "{{user.managerId}}",
          reason: "Budget exceeds threshold"
        },
        onSuccess: "end",
        onFailure: "escalate"
      },
      autoApprove: {
        name: "Auto Approve",
        type: "action",
        action: "functions.sendEmail",
        params: {
          to: "{{user.email}}",
          template: "approval_granted"
        },
        nextSteps: ["end"]
      },
      end: {
        type: "end",
        result: "success"
      }
    }
  }, null, 2);
  context += `\n\`\`\`\n`;

  return context;
}

/**
 * Generates context specifically for parameter collection during conversations
 */
export function generateParameterContext(functionName: string): string {
  const contextData = getLLMContext();
  const functionItem = contextData.find(item => item.name === functionName && item.category === 'function');
  
  if (!functionItem || !functionItem.parameters) {
    return '';
  }

  let context = `\n## Parameter Collection for ${functionName}\n\n`;
  context += `${functionItem.description}\n\n`;
  context += `**Required Parameters:**\n`;
  
  functionItem.parameters.forEach(param => {
    const status = param.required ? '**Required**' : '*Optional*';
    context += `\n- **${param.name}** ${status}\n`;
    context += `  - Type: ${param.type}\n`;
    context += `  - Description: ${param.description}\n`;
    
    if (param.options && param.options.length > 0) {
      context += `  - Options:\n`;
      param.options.forEach(option => {
        context += `    - ${option.value}: ${option.label}\n`;
      });
    }
    
    if (param.validation) {
      context += `  - Validation: `;
      if (param.validation.min) context += `min: ${param.validation.min}, `;
      if (param.validation.max) context += `max: ${param.validation.max}, `;
      if (param.validation.pattern) context += `pattern: ${param.validation.pattern}`;
      context += `\n`;
    }
  });

  return context;
}

/**
 * Generates autocomplete context for conversation UI
 */
export function generateAutocompleteHelp(): string {
  return `
## 💡 Smart Autocomplete Help

Type these triggers to see available options:

- **@** - Functions (sendEmail, requestApproval, createEvent, etc.)
- **user.** - User variables (user.name, user.email, user.department, etc.)
- **mrf.** - Form fields (mrf.eventType, mrf.budget, mrf.attendees, etc.)
- **date.** - Date functions (date.now, date.today, date.addDays, etc.)
- **#** - Workflow steps (for navigation and references)

**Examples:**
- "Send @sendEmail to manager when mrf.budget > 1000"
- "If user.department is Engineering, route to #approvalStep"
- "When date.now > mrf.deadline, trigger notification"
`;
}