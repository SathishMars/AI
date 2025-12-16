/**
 * Database Initialization Script v1.0.0
 * 
 * Creates the initial database schema with all required collections and indexes
 * - workflowTemplates: Stores workflow template definitions
 * - aimeWorkflowConversations: Stores AI conversation messages
 * - workflowExecutions: Tracks currently executing workflows with step-level status
 * 
 * This script is idempotent and safe to run multiple times.
 */

import { Db, IndexSpecification } from 'mongodb';

interface MigrationResult {
  success: boolean;
  message: string;
  details: {
    collectionsCreated: string[];
    indexesCreated: string[];
    collectionsSkipped: string[];
    indexesSkipped: string[];
  };
}

interface IndexDefinition {
  name: string;
  spec: IndexSpecification;
  options: {
    unique?: boolean;
    background?: boolean;
    sparse?: boolean;
  };
}

/**
 * Migrate database schema for v1.0.0
 * @param db - MongoDB database instance
 * @returns Migration result with summary of actions taken
 */
export async function migrate(db: Db): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    message: 'v1.0.0 migration completed',
    details: {
      collectionsCreated: [],
      indexesCreated: [],
      collectionsSkipped: [],
      indexesSkipped: [],
    },
  };

  try {
    console.log('[DB Init v1.0.0] Starting migration...');
    const startTime = Date.now();

    // ===== workflowTemplates Collection =====
    console.log('[DB Init v1.0.0] Creating workflowTemplates collection...');
    await createWorkflowTemplatesCollection(db, result);
    console.log(`[DB Init v1.0.0] workflowTemplates: ${result.details.collectionsCreated.includes('workflowTemplates') ? 'created' : 'already exists'} with ${result.details.indexesCreated.filter((idx) => idx.startsWith('workflowTemplates')).length} new indexes`);

    // ===== aimeWorkflowConversations Collection =====
    console.log('[DB Init v1.0.0] Creating aimeWorkflowConversations collection...');
    await createAimeWorkflowConversationsCollection(db, result);
    console.log(`[DB Init v1.0.0] aimeWorkflowConversations: ${result.details.collectionsCreated.includes('aimeWorkflowConversations') ? 'created' : 'already exists'} with ${result.details.indexesCreated.filter((idx) => idx.startsWith('aimeWorkflowConversations')).length} new indexes`);

    // ===== workflowExecutions Collection =====
    console.log('[DB Init v1.0.0] Creating workflowExecutions collection...');
    await createWorkflowExecutionsCollection(db, result);
    console.log(`[DB Init v1.0.0] workflowExecutions: ${result.details.collectionsCreated.includes('workflowExecutions') ? 'created' : 'already exists'} with ${result.details.indexesCreated.filter((idx) => idx.startsWith('workflowExecutions')).length} new indexes`);

    const duration = Date.now() - startTime;
    console.log(`[DB Init v1.0.0] Migration completed in ${duration}ms`);
    console.log(`[DB Init v1.0.0] Summary: ${result.details.collectionsCreated.length} collections created, ${result.details.indexesCreated.length} indexes created`);

    result.success = true;
    return result;
  } catch (error) {
    result.success = false;
    result.message = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[DB Init v1.0.0] Migration failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Create workflowTemplates collection with indexes
 */
async function createWorkflowTemplatesCollection(
  db: Db,
  result: MigrationResult
): Promise<void> {
  const collectionName = 'workflowTemplates';
  const collections = await db.listCollections().toArray();
  const collectionExists = collections.some((c) => c.name === collectionName);

  if (!collectionExists) {
    await db.createCollection(collectionName);
    result.details.collectionsCreated.push(collectionName);
    console.log(`  ✓ Collection created: ${collectionName}`);
  } else {
    result.details.collectionsSkipped.push(collectionName);
    console.log(`  ⊘ Collection already exists: ${collectionName}`);
  }

  const collection = db.collection(collectionName);

  // Get existing indexes
  const existingIndexes = await collection.listIndexes().toArray();
  const existingIndexNames = new Set(existingIndexes.map((idx) => idx.name));

  // Create indexes
  const indexDefinitions: IndexDefinition[] = [
    {
      name: 'idx_account_org_id_version_unique',
      spec: { account: 1, organization: 1, id: 1, version: 1 } as IndexSpecification,
      options: { unique: true, background: true },
    },
    {
      name: 'idx_account_org_id_status_version',
      spec: { account: 1, organization: 1, id: 1, 'metadata.status': 1, version: -1 } as IndexSpecification,
      options: { background: true },
    },
    {
      name: 'idx_account_org_status',
      spec: { account: 1, organization: 1, 'metadata.status': 1 } as IndexSpecification,
      options: { background: true },
    },
    {
      name: 'idx_account_org_label_status',
      spec: { account: 1, organization: 1, 'metadata.label': 1, 'metadata.status': 1 } as IndexSpecification,
      options: { background: true },
    },
    {
      name: 'idx_id_status_version_desc',
      spec: { id: 1, 'metadata.status': 1, version: -1 } as IndexSpecification,
      options: { background: true },
    },
  ];

  for (const index of indexDefinitions) {
    if (!existingIndexNames.has(index.name)) {
      await collection.createIndex(index.spec, index.options);
      result.details.indexesCreated.push(`${collectionName}.${index.name}`);
      console.log(`    → Index created: ${index.name}`);
    } else {
      result.details.indexesSkipped.push(`${collectionName}.${index.name}`);
      console.log(`    ⊘ Index already exists: ${index.name}`);
    }
  }
}

/**
 * Create aimeWorkflowConversations collection with indexes
 */
async function createAimeWorkflowConversationsCollection(
  db: Db,
  result: MigrationResult
): Promise<void> {
  const collectionName = 'aimeWorkflowConversations';
  const collections = await db.listCollections().toArray();
  const collectionExists = collections.some((c) => c.name === collectionName);

  if (!collectionExists) {
    await db.createCollection(collectionName);
    result.details.collectionsCreated.push(collectionName);
    console.log(`  ✓ Collection created: ${collectionName}`);
  } else {
    result.details.collectionsSkipped.push(collectionName);
    console.log(`  ⊘ Collection already exists: ${collectionName}`);
  }

  const collection = db.collection(collectionName);

  // Get existing indexes
  const existingIndexes = await collection.listIndexes().toArray();
  const existingIndexNames = new Set(existingIndexes.map((idx) => idx.name));

  // Create indexes
  const indexDefinitions: IndexDefinition[] = [
    {
      name: 'idx_account_org_template_id_unique',
      spec: { account: 1, organization: 1, templateId: 1, id: 1 } as IndexSpecification,
      options: { unique: true, background: true },
    },
    {
      name: 'idx_account_org_template_timestamp',
      spec: { account: 1, organization: 1, templateId: 1, timestamp: -1 } as IndexSpecification,
      options: { background: true },
    },
    {
      name: 'idx_account_template_timestamp',
      spec: { account: 1, templateId: 1, timestamp: -1 } as IndexSpecification,
      options: { background: true },
    },
  ];

  for (const index of indexDefinitions) {
    if (!existingIndexNames.has(index.name)) {
      await collection.createIndex(index.spec, index.options);
      result.details.indexesCreated.push(`${collectionName}.${index.name}`);
      console.log(`    → Index created: ${index.name}`);
    } else {
      result.details.indexesSkipped.push(`${collectionName}.${index.name}`);
      console.log(`    ⊘ Index already exists: ${index.name}`);
    }
  }
}

/**
 * Create workflowExecutions collection with indexes
 * Flexible schema - no strict validation
 * Tracks currently executing workflows with step-level status
 */
async function createWorkflowExecutionsCollection(
  db: Db,
  result: MigrationResult
): Promise<void> {
  const collectionName = 'workflowExecutions';
  const collections = await db.listCollections().toArray();
  const collectionExists = collections.some((c) => c.name === collectionName);

  if (!collectionExists) {
    await db.createCollection(collectionName);
    result.details.collectionsCreated.push(collectionName);
    console.log(`  ✓ Collection created: ${collectionName}`);
  } else {
    result.details.collectionsSkipped.push(collectionName);
    console.log(`  ⊘ Collection already exists: ${collectionName}`);
  }

  const collection = db.collection(collectionName);

  // Get existing indexes
  const existingIndexes = await collection.listIndexes().toArray();
  const existingIndexNames = new Set(existingIndexes.map((idx) => idx.name));

  // Create indexes
  const indexDefinitions: IndexDefinition[] = [
    {
      name: 'idx_account_org_execution_id_unique',
      spec: { account: 1, organization: 1, workflowExecutionId: 1 } as IndexSpecification,
      options: { unique: true, background: true },
    },
    {
      name: 'idx_account_org_template_status_created',
      spec: { account: 1, organization: 1, templateId: 1, status: 1, createdAt: -1 } as IndexSpecification,
      options: { background: true },
    },
    {
      name: 'idx_account_org_status_created',
      spec: { account: 1, organization: 1, status: 1, createdAt: -1 } as IndexSpecification,
      options: { background: true },
    },
    {
      name: 'idx_account_org_request_id_created',
      spec: { account: 1, organization: 1, requestId: 1, createdAt: -1 } as IndexSpecification,
      options: { background: true, sparse: true },
    },
    {
      name: 'idx_account_org_parent_workflow_created',
      spec: { account: 1, organization: 1, parentWorkflowId: 1, createdAt: -1 } as IndexSpecification,
      options: { background: true, sparse: true },
    },
    {
      name: 'idx_account_org_status_completed',
      spec: { account: 1, organization: 1, status: 1, completedAt: 1 } as IndexSpecification,
      options: { background: true },
    },
  ];

  for (const index of indexDefinitions) {
    if (!existingIndexNames.has(index.name)) {
      await collection.createIndex(index.spec, index.options);
      result.details.indexesCreated.push(`${collectionName}.${index.name}`);
      console.log(`    → Index created: ${index.name}`);
    } else {
      result.details.indexesSkipped.push(`${collectionName}.${index.name}`);
      console.log(`    ⊘ Index already exists: ${index.name}`);
    }
  }
}
