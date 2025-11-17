import { NextRequest, NextResponse } from 'next/server';
import AimeWorkflowMessagesDBUtil from '@/app/utils/aimeWorkflowMessagesDBUtil';
import WorkflowTemplateDbUtil from '@/app/utils/workflowTemplateDbUtil';
import type { AimeWorkflowConversationsRecord, WorkflowMessage } from '@/app/types/aimeWorkflowMessages';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: templateId } = await params;
    const account = req.headers.get('x-account') || 'groupize-demos';
    const organizationHeader = req.headers.get('x-organization');
    const organization = organizationHeader === null ? null : organizationHeader;
    
    try {
        // First, try to get the template to find its organization
        // Messages should be stored with the same organization as the template
        // Normalize organization: empty string becomes null (matching main route logic)
        const normalizedOrg = organization === '' ? null : organization;
        
        let templateOrg: string | null | undefined = normalizedOrg;
        
        try {
            // Try to get template with the provided organization context (matching main route logic)
            let template = await WorkflowTemplateDbUtil.get(account, normalizedOrg, templateId);
            if (!template && normalizedOrg === null) {
                template = await WorkflowTemplateDbUtil.get(account, undefined, templateId);
            }
            if (!template && normalizedOrg !== null) {
                template = await WorkflowTemplateDbUtil.get(account, null, templateId);
            }
            
            if (template) {
                templateOrg = template.organization;
                console.log('[AimeMessagesAPI] Template found, using organization:', templateOrg);
            }
        } catch (templateError) {
            console.error('[AimeMessagesAPI] Error fetching template:', templateError);
        }
        
        // Try querying with the template's organization first
        let records = await AimeWorkflowMessagesDBUtil.listMessages(account, templateOrg ?? null, templateId);
        
        // If no messages found and we tried a different org than provided, try with the normalized org
        if (records.length === 0 && templateOrg !== normalizedOrg) {
            records = await AimeWorkflowMessagesDBUtil.listMessages(account, normalizedOrg, templateId);
        }
        
        // Strip internal fields before returning to clients
        const messages = records.map((r: AimeWorkflowConversationsRecord) => {
            const copy = { ...(r as unknown as Record<string, unknown>) } as Record<string, unknown>;
            if ('_id' in copy) delete copy._id;
            if ('account' in copy) delete copy.account;
            if ('organization' in copy) delete copy.organization;
            if ('templateId' in copy) delete copy.templateId;
            return copy as unknown as WorkflowMessage;
        });
        
        return NextResponse.json(messages as WorkflowMessage[], { status: 200 });
    } catch (error) {
        console.error('[AimeMessagesAPI] GET aimeMessages error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: templateId } = await params;
    const account = req.headers.get('x-account') || 'groupize-demos';
    const organizationHeader = req.headers.get('x-organization');
    const organization = organizationHeader === null ? null : organizationHeader;
    try {
        const body = await req.json();
        const record = { ...(body as Record<string, unknown>), account, organization, templateId } as AimeWorkflowConversationsRecord;
        // ensure timestamp exists - create a new object rather than mutating the typed record
        const recordWithTimestamp = ('timestamp' in record && record.timestamp) ? record : ({ ...record, timestamp: new Date().toISOString() } as AimeWorkflowConversationsRecord);
        const result = await AimeWorkflowMessagesDBUtil.upsertMessage(recordWithTimestamp);
        const stored = { ...(result.message as unknown as Record<string, unknown>) } as Record<string, unknown>;
        if ('_id' in stored) delete stored._id;
        if ('account' in stored) delete stored.account;
        if ('organization' in stored) delete stored.organization;
        if ('templateId' in stored) delete stored.templateId;
        return NextResponse.json(stored as unknown as WorkflowMessage, { status: result.created ? 201 : 200 });
    } catch (error) {
        console.error('POST aimeMessages error:', error);
        return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: templateId } = await params;
    const account = req.headers.get('x-account') || 'groupize-demos';
    const organizationHeader = req.headers.get('x-organization');
    const organization = organizationHeader === null ? null : organizationHeader;
    try {
        const body = await req.json();
        if (!body.id) {
            return NextResponse.json({ error: 'Missing id in body' }, { status: 400 });
        }
        const record = { ...(body as Record<string, unknown>), account, organization, templateId } as AimeWorkflowConversationsRecord;
        const recordWithTimestamp = ('timestamp' in record && record.timestamp) ? record : ({ ...record, timestamp: new Date().toISOString() } as AimeWorkflowConversationsRecord);
        const result = await AimeWorkflowMessagesDBUtil.upsertMessage(recordWithTimestamp);
        const stored = { ...(result.message as unknown as Record<string, unknown>) } as Record<string, unknown>;
        if ('_id' in stored) delete stored._id;
        if ('account' in stored) delete stored.account;
        if ('organization' in stored) delete stored.organization;
        if ('templateId' in stored) delete stored.templateId;
        return NextResponse.json(stored as unknown as WorkflowMessage, { status: result.created ? 201 : 200 });
    } catch (error) {
        console.error('PUT aimeMessages error:', error);
        return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: templateId } = await params;
    const account = req.headers.get('x-account') || 'groupize-demos';
    const organizationHeader = req.headers.get('x-organization');
    const organization = organizationHeader === null ? null : organizationHeader;
    try {
        const body = await req.json();
        if (!body.id) {
            return NextResponse.json({ error: 'Missing id in body' }, { status: 400 });
        }
        const record = { id: body.id, account, organization, templateId } as AimeWorkflowConversationsRecord;
        const result = await AimeWorkflowMessagesDBUtil.deleteMessage(record);
        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }
        return NextResponse.json({ deleted: true }, { status: 200 });
    } catch (error) {
        console.error('DELETE aimeMessages error:', error);
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }
}