import { WorkflowVariable } from "@/app/types/workflowVariable";

export const workflowVariableDefinitions:Array<WorkflowVariable> = [
    { label: 'user', name: '${userId}' },
    { label: 'email', name: '${userEmail}' },
    { label: 'Name', name: '${userName}' },
    { label: 'First Name', name: '${userFirstName}' },
    { label: 'Last Name', name: '${userLastName}' },
    { label: 'Department', name: '${userDepartment}' },
    { label: 'Manager', name: '${userManager}' },
    { label: 'today', name: '${today}' },
    { label: 'now', name: '${now}' }
];

export const workflowVariableLLMInstructions = `
Workflow Variables:
${workflowVariableDefinitions.map(def => 
    `- ${def.label}: ${def.name}`
).join('\n')}

Instructions:
Reference variable types to validate input and guide follow-up questions as well as using them in functionParams.
`;
