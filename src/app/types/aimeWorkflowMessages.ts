import { WorkflowDefinition } from "./workflowTemplate";
import { z } from "zod";
import { WorkflowDefinitionSchema } from "./workflowTemplate";

export const FOLLOWUP_OPTION_CATEGORIES = [
    'template_request',
    'template_approval', 
    'template_mrf',
    'template_workflow',
    'field',
    'general'
] as const;

export type FollowUpOptionCategory = typeof FOLLOWUP_OPTION_CATEGORIES[number];

// This defines the record stored in the databse. It has the account,organization,conversationId fields in addition to the message fields
export interface AimeWorkflowConversationsRecord extends WorkflowMessage {
    account: string;
    organization?: string | null;
    templateId: string; // ID to group messages in a conversation
}


export interface WorkflowMessage {
    id: string; // Unique message ID (use UUID or similar)
    sender: 'system' | 'user' | 'aime';
    userId?: string|null; // ID of the user who sent the message
    userName?: string|null; // Name of the user who sent the message
    content: WorkflowMessageContent; // Message content or structured content
    timestamp: string; // ISO 8601 format
    type?: 'text' | 'image' | 'file'; // Optional message type
    metadata?: Record<string, string|number|boolean|object>; // Optional additional metadata
}

export interface WorkflowMessageContent {
    text: string;
    actions?: Array<{
        type: 'api_call' | 'workflow_step' | 'external_tool';
        name: string;
        params?: Record<string, string | number | boolean | object>;
    }>|null;
    followUpQuestions?: Array<string>|null;
    followUpOptions?: Record<string, Array<FollowUpOption>>|null;
    workflowDefinition?: WorkflowDefinition|null; // Optional updated workflow definition
}
export interface FollowUpOption {
    label: string;
    value: string | number | boolean; // Value associated with the option
    category?: FollowUpOptionCategory; // Category for UI behavior
    metadata?: Record<string, any>; // Additional metadata (e.g., templateId, version)
}


// FollowUpOption schema
export const FollowUpOptionSchema = z.object({
    label: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
    category: z.enum(FOLLOWUP_OPTION_CATEGORIES).optional(),
    metadata: z.record(z.any()).optional(),
});

// WorkflowMessageContent schema
export const WorkflowMessageContentSchema = z.object({
    text: z.string().regex(/^[^{}`]*$/, {
        message: 'Text must not contain {, }, or ` characters.',
    }),
    actions: z
        .array(
            z.object({
                type: z.enum(["api_call", "workflow_step", "external_tool"]),
                name: z.string(),
                params: z.record(z.string(), z.union([
                    z.string(),
                    z.number(),
                    z.boolean(),
                    z.object({}).strict(),
                ])).optional().nullable(),
            })
        )
        .optional().nullable(),
    followUpQuestions: z.array(z.string()).optional().nullable(),
    followUpOptions: z
        .record(z.string(), z.array(FollowUpOptionSchema))
        .optional().nullable(),
    workflowDefinition: WorkflowDefinitionSchema.optional().nullable(),
});


// WorkflowMessage schema
export const WorkflowMessageSchema = z.object({
    id: z.string(),
    sender: z.enum(["system", "user", "aime"]),
    userId: z.string().optional().nullable(),
    userName: z.string().optional().nullable(),
    content: WorkflowMessageContentSchema,
    timestamp: z.string(),
    type: z.enum(["text", "image", "file"]).optional().nullable(),
    metadata: z.record(z.string(), z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.object({}).strict(),
    ])).optional().nullable(),
});

// AimeWorkflowConversationsRecord schema
export const AimeWorkflowConversationsRecordSchema = WorkflowMessageSchema.extend({
    account: z.string(),
    organization: z.string().optional().nullable(),
    templateId: z.string(),
});

// Validator
export const validateAimeWorkflowConversationsRecord = (data: unknown) =>
    AimeWorkflowConversationsRecordSchema.safeParse(data);