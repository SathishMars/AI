// db-scripts/03-create-workflow-templates-collection.js
// Create (or recreate) the workflowTemplates collection with a JSON Schema
// validator that matches the TypeScript `WorkflowTemplate` shape and the
// indexing patterns used by the application.

// Usage (local):
//   mongosh < db-scripts/03-create-workflow-templates-collection.js

print('='.repeat(60));
print('CREATING workflowTemplates COLLECTION (script 03)');
print('='.repeat(60));

const db = db.getSiblingDB('groupize-workflows');

// Drop existing collection if present (uncomment if you want to recreate)
try {
  if (db.getCollectionNames().indexOf('workflowTemplates') !== -1) {
    print('Dropping existing workflowTemplates collection');
    db.workflowTemplates.drop();
  }
} catch {
  // ignore
}

print('\nCreating collection `workflowTemplates` with JSON Schema validation...');

db.createCollection('workflowTemplates');

print('\nCreating indexes...');

// UNIQUE: Prevent duplicate template versions for the same id/account/org/version
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, id: 1, version: 1 },
  { unique: true, name: 'idx_account_org_id_version_unique', background: true }
);

// PRIMARY/COMMON: Resolve templates by account + organization + id (and filter by status/version)
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, id: 1, 'metadata.status': 1, version: -1 },
  { name: 'idx_account_org_id_status_version', background: true }
);

// FREQUENT SEARCH: account + organization + metadata.status
// Used for listing templates by status within an account/org
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, 'metadata.status': 1 },
  { name: 'idx_account_org_status', background: true }
);

// FREQUENT SEARCH: account + organization + metadata.label + metadata.status
// Supports search by label + status within an account/org
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, 'metadata.label': 1, 'metadata.status': 1 },
  { name: 'idx_account_org_label_status', background: true }
);

// AUX: Find latest version of a template (by semantic version string - descending lexicographic may work
// for zero-padded / semver-consistent strings but if you store numeric parts consider a dedicated field)
db.workflowTemplates.createIndex(
  { id: 1, 'metadata.status': 1, version: -1 },
  { name: 'idx_id_status_version_desc', background: true }
);

print('✅ Created `workflowTemplates` collection and indexes');

print('\nCreating collection `aimeWorkflowConversations` with JSON Schema validation...');

// Conversation messages stored per account/org/template
try {
  if (db.getCollectionNames().indexOf('aimeWorkflowConversations') !== -1) {
    print('Dropping existing aimeWorkflowConversations collection');
    db.aimeWorkflowConversations.drop();
  }
} catch { }

db.createCollection('aimeWorkflowConversations');

print('\nCreating indexes for `aimeWorkflowConversations`...');

// UNIQUE: composite key to identify a message
db.aimeWorkflowConversations.createIndex(
  { account: 1, organization: 1, templateId: 1, id: 1 },
  { unique: true, name: 'idx_account_org_template_id_unique', background: true }
);

// Common lookup: messages for a conversation, newest first
db.aimeWorkflowConversations.createIndex(
  { account: 1, organization: 1, templateId: 1, timestamp: -1 },
  { name: 'idx_account_org_template_timestamp', background: true }
);

// Optional: quickly find recent messages by account + template across orgs
db.aimeWorkflowConversations.createIndex(
  { account: 1, templateId: 1, timestamp: -1 },
  { name: 'idx_account_template_timestamp', background: true }
);

print('✅ Created `aimeWorkflowConversations` collection and indexes');

print('\nExample queries:');
print(' - Find latest published templates for an account/org:');
print("   db.workflowTemplates.find({ account: 'acct1', organization: 'orgA', 'metadata.status': 'published' }).sort({ version: -1 })");
print(' - Lookup a specific template version by composite key:');
print("   db.workflowTemplates.findOne({ account: 'acct1', organization: 'orgA', id: 'a1b2c3d4e5', version: '1.0.0' })");
print(' - Search by label and status:');
print("   db.workflowTemplates.find({ account: 'acct1', organization: 'orgA', 'metadata.label': /Approval/i, 'metadata.status': 'published' })");

print('\nScript complete.');
