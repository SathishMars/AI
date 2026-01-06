import { getMongoDatabase } from './mongodb-connection';
import ShortUniqueId from 'short-unique-id';

// 10-char alphanumeric short id generator (reusable instance)
const uid = new ShortUniqueId({ length: 10, dictionary: 'alphanum' });

// Helper to produce an id string
function generateShortId(): string {
    // use rnd() to generate id string with this package version
    // (instance is not directly callable in typings)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return uid.rnd();
}

import type { Document } from 'mongodb';
import type { AimeWorkflowConversationsRecord } from '@/app/types/aimeWorkflowMessages';

const COLLECTION_NAME = 'aimeWorkflowConversations';

// ... existing types are imported from `src/app/types/aimeWorkflowMessages.ts`

// Helper to safely remove MongoDB internal _id if present
function removeInternalId(obj: unknown): void {
    if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, '_id')) {
        try {
            const o = obj as Record<string, unknown>;
            delete o._id;
        } catch {
            // noop
        }
    }
}

export default class AimeWorkflowMessagesDBUtil {
    static async listMessages(account: string, organization: string | null, templateId: string): Promise<AimeWorkflowConversationsRecord[]> {
        const db = await getMongoDatabase();
        const coll = db.collection(COLLECTION_NAME);
        const query: Record<string, unknown> = { account, templateId };
        if (organization !== undefined) {
            if (organization && organization.trim() !== '') {
                query.organization = organization;
            } else {
                query.$or = [
                    { organization: null },
                    { organization: '' },
                    { organization: { $exists: false } }
                ];
            }
        }
        
        // Sort by timestamp ascending to get chronological order
        const options = { sort: { timestamp: 1 as const } };
        
        try {
            const docs = await coll.find(query, options).toArray() as Document[];
            return docs.map((d) => d as unknown as AimeWorkflowConversationsRecord);
        } catch (error) {
            console.error('[AimeWorkflowMessagesDBUtil] MongoDB query error:', error);
            throw error;
        }
    }

    static async upsertMessage(record: AimeWorkflowConversationsRecord): Promise<{ message: AimeWorkflowConversationsRecord; created: boolean }> {
        const db = await getMongoDatabase();
        const coll = db.collection(COLLECTION_NAME);

        console.log('[AimeWorkflowMessagesDBUtil] Upserting message record:', record.account, record.organization, record.templateId, record.id);
        // Ensure id exists
        const doc = { ...record } as AimeWorkflowConversationsRecord;
        if (!doc.id) doc.id = generateShortId();

        const { account, organization, templateId, id: messageId, ...rest } = doc;
        const filter: Record<string, unknown> = { templateId, id: messageId, account };
        if (organization !== undefined) filter.organization = organization;

        // Prepare fields to set on update
        const setFields = { ...rest } as Record<string, unknown>;
        // never overwrite internal identifiers
        removeInternalId(setFields);
        if ('id' in setFields) delete (setFields as Record<string, unknown>).id;
        if ('account' in setFields) delete (setFields as Record<string, unknown>).account;
        if ('organization' in setFields) delete (setFields as Record<string, unknown>).organization;
        if ('templateId' in setFields) delete (setFields as Record<string, unknown>).templateId;

        // Remove optional fields that are explicitly null to avoid MongoDB JSON Schema validation errors.
        // Only remove top-level optional fields that our schema treats as optional/nullable in practice.
        const OPTIONAL_NULLABLE_FIELDS = ['userId', 'userName', 'type', 'metadata'];
        for (const key of OPTIONAL_NULLABLE_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(setFields, key) && setFields[key] === null) {
                delete setFields[key];
            }
        }

        const update = {
            $set: setFields,
            $setOnInsert: { id: messageId, account, templateId, organization }
        } as Record<string, unknown>;

        let res;
        try {
            res = await coll.updateOne(filter, update as Document, { upsert: true });
        } catch (err: unknown) {
            // Attempt to log as much useful information as possible for debugging
            try {
                console.error('[AimeWorkflowMessagesDBUtil] Upsert failed for filter:', JSON.stringify(filter));
            } catch {
                console.error('[AimeWorkflowMessagesDBUtil] Upsert failed for filter (non-serializable)');
            }
            try {
                console.error('[AimeWorkflowMessagesDBUtil] Upsert attempted update:', JSON.stringify(update));
            } catch {
                console.error('[AimeWorkflowMessagesDBUtil] Upsert attempted update (non-serializable)');
            }

            if (err && typeof err === 'object') {
                // Prefer MongoServerError fields if available
                const anyErr = err as Record<string, unknown>;
                try {
                    console.error('[AimeWorkflowMessagesDBUtil] Mongo error code:', anyErr.code);
                } catch {}
                try {
                    console.error('[AimeWorkflowMessagesDBUtil] Mongo error index:', anyErr.index);
                } catch {}
                try {
                    console.error('[AimeWorkflowMessagesDBUtil] Mongo errInfo:', JSON.stringify(anyErr.errInfo));
                } catch {
                    console.error('[AimeWorkflowMessagesDBUtil] Mongo errInfo (non-serializable)');
                }
                try {
                    console.error('[AimeWorkflowMessagesDBUtil] Mongo errorResponse:', JSON.stringify(anyErr.errorResponse));
                } catch {
                    console.error('[AimeWorkflowMessagesDBUtil] Mongo errorResponse (non-serializable)');
                }
            }

            // rethrow after logging so callers can handle the error as before
            throw err;
        }

        // Determine created via upsertedCount or upsertedId
        // safe check for upsertedId without using `any`
        const resUnknown = res as unknown as Record<string, unknown>;
        const hasUpsertedId = Object.prototype.hasOwnProperty.call(resUnknown, 'upsertedId') && resUnknown.upsertedId !== undefined;
        const created = (res.upsertedCount ?? 0) > 0 || Boolean(hasUpsertedId);

        // Fetch the stored document
        const stored = await coll.findOne(filter) as unknown as AimeWorkflowConversationsRecord;
        return { message: stored, created };
    }

    static async deleteMessage(record: AimeWorkflowConversationsRecord): Promise<{ deletedCount: number }> {
        const db = await getMongoDatabase();
        const coll = db.collection(COLLECTION_NAME);
        const { account, organization, templateId, id: messageId } = record;
        const filter: Record<string, unknown> = { templateId, id: messageId, account };
        if (organization !== undefined) filter.organization = organization;
        const res = await coll.deleteOne(filter);
        return { deletedCount: res.deletedCount ?? 0 };
    }

    static async deleteMessagesForTemplate(account: string, templateId: string, organization?: string | null): Promise<{ deletedCount: number }> {
        const db = await getMongoDatabase();
        const coll = db.collection(COLLECTION_NAME);
        const filter: Record<string, unknown> = { templateId, account };
        if (organization !== undefined) filter.organization = organization;
        const res = await coll.deleteMany(filter);
        return { deletedCount: res.deletedCount ?? 0 };
    }
}
