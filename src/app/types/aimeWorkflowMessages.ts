import { WorkflowDefinition } from "./workflowTemplate";
import { z } from "zod";
import { WorkflowDefinitionSchema } from "./workflowTemplate";

// This defines the record stored in the databse. It has the account,organization,conversationId fields in addition to the message fields
export interface AimeWorkflowConversationsRecord extends WorkflowMessage {
    account: string;
    organization?: string | null;
    templateId: string; // ID to group messages in a conversation
}


export interface WorkflowMessage {
    id: string; // Unique message ID (use UUID or similar)
    sender: 'system' | 'user' | 'aime';
    userId?: string; // ID of the user who sent the message
    userName?: string; // Name of the user who sent the message
    content: WorkflowMessageContent; // Message content or structured content
    timestamp: string; // ISO 8601 format
    type?: 'text' | 'image' | 'file'; // Optional message type
    metadata?: Record<string, unknown>; // Optional additional metadata
}

export interface WorkflowMessageContent {
    text: string;
    actions?: Array<{
        type: 'api_call' | 'workflow_step' | 'external_tool';
        name: string;
        params?: Record<string, unknown>;
    }>;
    followUpQuestions?: Array<string>;
    followUpOptions?: Record<string, Array<FollowUpOption>>;
    workflowDefinition?: WorkflowDefinition; // Optional updated workflow definition
}
export interface FollowUpOption {
    label: string;
    value: unknown;
}


// FollowUpOption schema
export const FollowUpOptionSchema = z.object({
    label: z.string(),
    value: z.unknown(),
});

// WorkflowMessageContent schema
export const WorkflowMessageContentSchema = z.object({
    text: z.string(),
    actions: z
        .array(
            z.object({
                type: z.enum(["api_call", "workflow_step", "external_tool"]),
                name: z.string(),
                params: z.record(z.unknown()).optional(),
            })
        )
        .optional(),
    followUpQuestions: z.array(z.string()).optional(),
    followUpOptions: z
        .record(z.array(FollowUpOptionSchema))
        .optional(),
    workflowDefinition: WorkflowDefinitionSchema.optional(),
});

// WorkflowMessage schema
export const WorkflowMessageSchema = z.object({
    id: z.string(),
    sender: z.enum(["system", "user", "aime"]),
    userId: z.string().optional(),
    userName: z.string().optional(),
    content: WorkflowMessageContentSchema,
    timestamp: z.string(),
    type: z.enum(["text", "image", "file"]).optional(),
    metadata: z.record(z.unknown()).optional(),
});

// AimeWorkflowConversationsRecord schema
export const AimeWorkflowConversationsRecordSchema = WorkflowMessageSchema.extend({
    account: z.string(),
    organization: z.string().nullable().optional(),
    templateId: z.string(),
});

// Validator
export const validateAimeWorkflowConversationsRecord = (data: unknown) =>
    AimeWorkflowConversationsRecordSchema.safeParse(data);