import { getMongoDatabase } from './mongodb-connection';
import { WorkflowTemplate, WorkflowTemplateSchema } from '@/app/types/workflowTemplate';
import type { Document } from 'mongodb';

const COLLECTION = 'workflowTemplates';

export type ListFilters = {
  organization?: string | null;
  status?: string | string[];
  label?: string; // search text for metadata.label
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
};

export class WorkflowTemplateDbUtil {
  static async create(template: WorkflowTemplate): Promise<WorkflowTemplate> {
  // Validate and normalize timestamps (allow ISO strings)
  const normalized = WorkflowTemplateDbUtil.normalizeForDb(template);
  // Validate shape using Zod (result not needed beyond validation)
  WorkflowTemplateSchema.parse(normalized);

    const db = await getMongoDatabase();
    const collection = db.collection<Document>(COLLECTION);

  await collection.insertOne(normalized as unknown as Document);

  // Build returned object from normalized
  const insertedObj = { ...(normalized as unknown as Record<string, unknown>) } as Record<string, unknown>;
    // Do not expose MongoDB internal _id to API consumers
    if ('_id' in insertedObj) delete insertedObj._id;

    return insertedObj as unknown as WorkflowTemplate;
  }

  static async get(account: string, organization: string | null | undefined, id: string, version?: string): Promise<WorkflowTemplate | null> {
    const db = await getMongoDatabase();
    const collection = db.collection<Document>(COLLECTION);

    const filter: Record<string, unknown> = { account, id };
    if (organization !== undefined) filter.organization = organization;
    if (version) filter.version = version;

    const doc = await collection.findOne(filter);
    if (!doc) return null;
    return WorkflowTemplateDbUtil.normalizeFromDb(doc as unknown);
  }

  static async list(account: string, filters: ListFilters = {}, page = 1, pageSize = 20) {
    const db = await getMongoDatabase();
    const collection = db.collection<Document>(COLLECTION);

    const match: Record<string, unknown> = { account };
    if (filters.organization !== undefined) match.organization = filters.organization;
    if (filters.status) match['metadata.status'] = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
    if (filters.tags && filters.tags.length) match['metadata.tags'] = { $in: filters.tags };
    if (filters.createdAfter || filters.createdBefore) {
      const createdAtFilter: Record<string, Date> = {};
      if (filters.createdAfter) createdAtFilter.$gte = filters.createdAfter;
      if (filters.createdBefore) createdAtFilter.$lte = filters.createdBefore;
      match['metadata.createdAt'] = createdAtFilter;
    }
    if (filters.label) {
      match['metadata.label'] = { $regex: filters.label, $options: 'i' };
    }

    // Aggregate to deduplicate by id keeping latest updatedAt
    const pipeline: unknown[] = [
      { $match: match },
      { $sort: { 'metadata.updatedAt': -1 } },
      { $group: { _id: '$id', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { 'metadata.label': 1 } }
    ];

    const all = await collection.aggregate(pipeline as Document[]).toArray();
    const totalCount = all.length;
    const start = (page - 1) * pageSize;
    const pageItems = all.slice(start, start + pageSize).map((d: unknown) => WorkflowTemplateDbUtil.normalizeFromDb(d));

    return {
      templates: pageItems,
      totalCount,
      page,
      pageSize,
      hasMore: start + pageSize < totalCount
    };
  }

  static async update(account: string, id: string, version: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | null> {
    const db = await getMongoDatabase();
    const collection = db.collection<Document>(COLLECTION);

    // Prevent accidental overwrite of composite keys
    const up: Record<string, unknown> = { ...(updates as Record<string, unknown>) };
    delete up.account;
    delete up.id;
    delete up.version;

    // Normalize timestamps in updates if present
    if (up.metadata && typeof up.metadata === 'object') {
      const md = up.metadata as Record<string, unknown>;
      if (md.createdAt && typeof md.createdAt === 'string') md.createdAt = new Date(md.createdAt as string);
      if (md.updatedAt && typeof md.updatedAt === 'string') md.updatedAt = new Date(md.updatedAt as string);
      if (md.lastUsedAt && typeof md.lastUsedAt === 'string') md.lastUsedAt = new Date(md.lastUsedAt as string);
    }

    const res = await collection.findOneAndUpdate(
      { account, id, version },
      { $set: up },
      { returnDocument: 'after' }
    );

    if (!res || !res.value) return null;
    return WorkflowTemplateDbUtil.normalizeFromDb(res.value as unknown);
  }

  /**
   * Upsert a full WorkflowTemplate using the composite key (account, organization, id, version).
   * If a document exists it will be replaced with the provided template, otherwise it will be inserted.
   */
  static async upsert(account: string, organization: string | null | undefined, id: string, version: string, template: WorkflowTemplate): Promise<WorkflowTemplate> {
    const db = await getMongoDatabase();
    const collection = db.collection<Document>(COLLECTION);

    // Ensure composite key fields are set on the template we will persist
    const copy = JSON.parse(JSON.stringify(template)) as Record<string, unknown>;
    copy.account = account;
    copy.id = id;
    copy.version = version;
    // Explicitly set organization to provided value (can be null)
    if (organization !== undefined) {
      copy.organization = organization;
    }

  // Validate shape (result not needed beyond validation)
  WorkflowTemplateSchema.parse(copy);

    // Normalize dates for DB
    const normalized = WorkflowTemplateDbUtil.normalizeForDb(copy as unknown as WorkflowTemplate);


    // Replace existing document or insert new (upsert)
    const filter: Record<string, unknown> = { account, id, version };
    if (organization !== undefined) filter.organization = organization;

    await collection.replaceOne(filter, normalized as unknown as Document, { upsert: true });

    // Return the document as stored (convert dates back to ISO)
    const stored = await collection.findOne(filter);
    return WorkflowTemplateDbUtil.normalizeFromDb(stored as unknown);
  }

  static async delete(account: string, id: string, version: string): Promise<boolean> {
    const db = await getMongoDatabase();
    const collection = db.collection<Document>(COLLECTION);
    const res = await collection.deleteOne({ account, id, version });
    return (res.deletedCount ?? 0) > 0;
  }

  // Convert incoming template object to DB-friendly shape (dates)
  private static normalizeForDb(t: WorkflowTemplate): WorkflowTemplate {
    const copy = JSON.parse(JSON.stringify(t)) as Record<string, unknown>;
    if (copy.metadata && typeof copy.metadata === 'object') {
      const md = copy.metadata as Record<string, unknown>;
      if (typeof md.createdAt === 'string') md.createdAt = new Date(md.createdAt as string);
      if (typeof md.updatedAt === 'string') md.updatedAt = new Date(md.updatedAt as string);
      if (typeof md.lastUsedAt === 'string') md.lastUsedAt = new Date(md.lastUsedAt as string);
    }
    return copy as unknown as WorkflowTemplate;
  }

  private static normalizeFromDb(doc: unknown): WorkflowTemplate {
    const copy = { ...(doc as Record<string, unknown>) } as Record<string, unknown>;
    // Remove MongoDB internal id before returning to API
    if ('_id' in copy) {
      try {
        delete copy._id;
      } catch {
        // noop
      }
    }
    if (copy.metadata && typeof copy.metadata === 'object') {
      const md = copy.metadata as Record<string, unknown>;
      const toIso = (v: unknown) => (v instanceof Date ? v.toISOString() : v);
      if (md.createdAt) md.createdAt = toIso(md.createdAt);
      if (md.updatedAt) md.updatedAt = toIso(md.updatedAt);
      if (md.lastUsedAt) md.lastUsedAt = toIso(md.lastUsedAt);
    }
    return copy as unknown as WorkflowTemplate;
  }
}

export default WorkflowTemplateDbUtil;
