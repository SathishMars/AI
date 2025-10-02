// db-scripts/02-workflow-template-collections.js
// MongoDB collection update script for existing databases
// Run this script to update existing workflowTemplates collection with organization support

/*
 * Workflow Template Collections Update
 * 
 * This script updates existing collections for:
 * 1. workflowTemplates - Add organization field and new indexes
 * 2. workflowConfiguratorConversations - Update schema if needed
 * 
 * Use this script when you have an existing database that needs schema updates.
 * For fresh installations, use 01-initialize-fresh-database.js instead.
 */

// Connect to MongoDB (adjust connection string as needed)
// For local: mongodb://localhost:27017/groupize-workflows
// For DocumentDB: use appropriate DocumentDB connection string

const db = db.getSiblingDB('groupize-workflows');

print('='.repeat(60));
print('UPDATING EXISTING WORKFLOW COLLECTIONS');
print('='.repeat(60));

// ===========================================
// 1. Update workflowTemplates Collection Schema
// ===========================================

print('\n📝 Updating workflowTemplates collection schema...');

// Check if collection exists
const collections = db.getCollectionNames();
if (!collections.includes('workflowTemplates')) {
  print('❌ workflowTemplates collection does not exist. Use 01-initialize-fresh-database.js for fresh setup.');
  quit(1);
}

// Update collection validator to include organization field
try {
  db.runCommand({
    collMod: "workflowTemplates",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["account", "name", "status", "version", "workflowDefinition", "metadata"],
        properties: {
          account: {
            bsonType: "string",
            description: "Account identifier for multi-tenancy"
          },
          organization: {
            bsonType: "string",
            description: "Organization identifier within account (optional - if null, template is shared across all organizations in account)"
          },
          name: {
            bsonType: "string",
            description: "Template name (unique within account+organization combination)"
          },
          status: {
            bsonType: "string",
            enum: ["draft", "published", "deprecated", "archived"],
            description: "Template lifecycle status"
          },
          version: {
            bsonType: "string",
            pattern: "^\\d+\\.\\d+\\.\\d+$",
            description: "Semantic version (major.minor.patch)"
          },
          workflowDefinition: {
            bsonType: "object",
            description: "Complete json-rules-engine compatible workflow JSON"
          },
          mermaidDiagram: {
            bsonType: "string",
            description: "Generated Mermaid diagram representation"
          },
          metadata: {
            bsonType: "object",
            required: ["createdAt", "updatedAt"],
            properties: {
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
              publishedAt: { bsonType: "date" },
              author: { bsonType: "string" },
              description: { bsonType: "string" },
              category: { bsonType: "string" },
              tags: {
                bsonType: "array",
                items: { bsonType: "string" }
              }
            }
          },
          parentVersion: {
            bsonType: "string",
            description: "Reference to parent version for lineage tracking"
          },
          usageStats: {
            bsonType: "object",
            properties: {
              instanceCount: { bsonType: "int" },
              lastUsed: { bsonType: "date" }
            }
          }
        }
      }
    }
  });
  print('✅ Collection schema updated with organization field');
} catch (error) {
  print('⚠️ Schema update warning:', error.message);
}

// ===========================================
// 2. Add New Indexes for Organization Support
// ===========================================

print('\n📊 Adding new indexes for organization support...');

// Function to safely create index (skip if exists)
function createIndexSafely(collection, indexSpec, options) {
  try {
    collection.createIndex(indexSpec, options);
    print('✅ Created index:', options.name);
  } catch (error) {
    if (error.message.includes('already exists')) {
      print('ℹ️  Index already exists:', options.name);
    } else {
      print('❌ Error creating index:', options.name, error.message);
    }
  }
}

const templateCollection = db.workflowTemplates;

// Organization-based unique constraint
createIndexSafely(templateCollection,
  { account: 1, organization: 1, name: 1, version: 1 },
  { 
    name: "idx_account_org_name_version_unique",
    unique: true,
    background: true 
  }
);

// Partial index for account-wide templates (organization is null)
createIndexSafely(templateCollection,
  { account: 1, name: 1, version: 1 },
  { 
    name: "idx_account_name_version_null_org",
    unique: true,
    partialFilterExpression: { organization: { $eq: null } },
    background: true 
  }
);

// Organization-based queries index
createIndexSafely(templateCollection,
  { account: 1, organization: 1, status: 1, "metadata.createdAt": -1 },
  { 
    name: "idx_account_org_status_created",
    background: true 
  }
);

// ===========================================
// 3. Remove Old Unique Index (if exists)
// ===========================================

print('\n🔧 Updating unique constraints...');

// Try to drop old unique index that doesn't include organization
try {
  templateCollection.dropIndex("idx_account_name_version_unique");
  print('✅ Removed old unique index without organization');
} catch (error) {
  if (error.message.includes('index not found')) {
    print('ℹ️  Old unique index not found (already updated)');
  } else {
    print('⚠️ Could not remove old index:', error.message);
  }
}

// ===========================================
// 4. Data Migration (Add organization field to existing templates)
// ===========================================

print('\n🔄 Migrating existing template data...');

// Add organization: null to existing templates that don't have the field
const updateResult = templateCollection.updateMany(
  { organization: { $exists: false } },
  { $set: { organization: null } }
);

print(`✅ Updated ${updateResult.modifiedCount} existing templates with organization: null`);

// ===========================================
// 5. Update Sample Template Account
// ===========================================

print('\n📋 Updating sample template account...');

// Update any existing "default-account" templates to use "groupize-demos"
const accountUpdateResult = templateCollection.updateMany(
  { account: "default-account" },
  { 
    $set: { 
      account: "groupize-demos",
      organization: null // Ensure they're account-wide templates
    } 
  }
);

if (accountUpdateResult.modifiedCount > 0) {
  print(`✅ Updated ${accountUpdateResult.modifiedCount} templates to use "groupize-demos" account`);
} else {
  print('ℹ️  No templates with "default-account" found');
}

// ===========================================
// 6. Update workflowConfiguratorConversations Collection Schema
// ===========================================

print('\n💬 Updating workflowConfiguratorConversations collection schema...');

// Check if conversation collection exists
if (!collections.includes('workflowConfiguratorConversations')) {
  print('ℹ️  workflowConfiguratorConversations collection does not exist - will be created on first use');
} else {
  const conversationCollection = db.workflowConfiguratorConversations;
  
  // Add workflowTemplateName field to existing conversations
  print('📝 Adding workflowTemplateName field to existing conversations...');
  
  // Since this is a breaking change, we need to handle existing data carefully
  const conversationCount = conversationCollection.countDocuments();
  if (conversationCount > 0) {
    print(`⚠️  Found ${conversationCount} existing conversations. Manual migration required:`);
    print('   1. Update existing conversations to include workflowTemplateName field');
    print('   2. Map existing sessionId to appropriate template names');
    print('   3. Drop and recreate unique indexes');
    print('   For now, we will add the field as optional and let application handle migration');
    
    // Add workflowTemplateName field (initially null) to existing conversations
    const migrationResult = conversationCollection.updateMany(
      { workflowTemplateName: { $exists: false } },
      { $set: { workflowTemplateName: null } }
    );
    print(`✅ Added workflowTemplateName field to ${migrationResult.modifiedCount} conversations`);
  }
  
  // Update collection validator
  try {
    db.runCommand({
      collMod: "workflowConfiguratorConversations",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["account", "workflowTemplateName", "conversationId", "sessionInfo"],
          properties: {
            account: {
              bsonType: "string",
              description: "Account identifier for the conversation"
            },
            organization: {
              bsonType: "string",
              description: "Organization identifier within account (optional - null for account-wide templates)"
            },
            workflowTemplateName: {
              bsonType: "string",
              description: "Name of the workflow template this conversation belongs to"
            },
            conversationId: {
              bsonType: "string",
              description: "Unique conversation identifier"
            },
            messages: {
              bsonType: "array",
              description: "Array of conversation messages"
            },
            sessionInfo: {
              bsonType: "object",
              description: "Session information for the conversation"
            },
            retentionPolicy: {
              bsonType: "object",
              description: "Conversation retention policy"
            }
          }
        }
      }
    });
    print('✅ Updated workflowConfiguratorConversations schema validator');
  } catch (error) {
    print('⚠️ Schema validator update warning:', error.message);
  }
  
  // Update indexes for conversations
  print('📊 Updating conversation indexes...');
  
  // Remove old indexes
  try {
    conversationCollection.dropIndex("idx_account_org_session");
    print('✅ Dropped old index: idx_account_org_session');
  } catch (error) {
    print('ℹ️  Old index not found: idx_account_org_session');
  }
  
  try {
    conversationCollection.dropIndex("idx_account_org_status_created");
    print('✅ Dropped old index: idx_account_org_status_created');
  } catch (error) {
    print('ℹ️  Old index not found: idx_account_org_status_created');
  }
  
  // Create new indexes
  createIndexSafely(conversationCollection,
    { account: 1, organization: 1, workflowTemplateName: 1, conversationId: 1 },
    { 
      name: "idx_account_org_template_conversation",
      unique: true,
      background: true 
    }
  );
  
  createIndexSafely(conversationCollection,
    { account: 1, workflowTemplateName: 1, "sessionInfo.lastActivity": -1 },
    { 
      name: "idx_account_template_activity",
      background: true 
    }
  );
  
  createIndexSafely(conversationCollection,
    { account: 1, organization: 1, "sessionInfo.isActive": 1, "sessionInfo.startedAt": -1 },
    { 
      name: "idx_account_org_session_activity",
      background: true 
    }
  );
  
  createIndexSafely(conversationCollection,
    { "sessionInfo.userId": 1, "sessionInfo.startedAt": -1 },
    { 
      name: "idx_user_activity",
      background: true 
    }
  );
}

// ===========================================
// 6. Add Sample Template if Database is Empty
// ===========================================

print('\n📝 Checking for sample data...');

const templateCount = templateCollection.countDocuments();
if (templateCount === 0) {
  print('📋 Adding sample workflow template...');
  
  // Sample workflow template for testing
  const sampleTemplate = {
    account: "groupize-demos",
    organization: null, // Account-wide template
    name: "Sample Event Approval Workflow",
    status: "published",
    version: "1.0.0",
    workflowDefinition: {
      schemaVersion: "1.0",
      metadata: {
        id: "sample-workflow-001",
        name: "Event Approval Workflow",
        description: "Automated workflow for event approval process",
        version: "1.0.0",
        status: "published"
      },
      steps: {
        start: {
          name: "MRF Submitted",
          type: "trigger",
          action: "onMRF",
          params: { mrfTemplateName: "Event Request" },
          nextSteps: ["checkApprovalNeeded"]
        },
        checkApprovalNeeded: {
          name: "Check Approval Requirements",
          type: "condition",
          condition: {
            any: [
              { fact: "mrf.maxAttendees", operator: "greaterThan", value: 100 },
              { fact: "user.role", operator: "notEqual", value: "admin" }
            ]
          },
          onSuccess: "requestApproval",
          onFailure: "createEvent"
        },
        requestApproval: {
          name: "Request Manager Approval",
          type: "action",
          action: "requestApproval",
          params: { approverRole: "manager" },
          onSuccess: "createEvent",
          onFailure: "notifyFailure"
        },
        createEvent: {
          name: "Create Event",
          type: "action",
          action: "createEvent",
          params: { mrfID: "dynamic" },
          nextSteps: ["end"]
        },
        notifyFailure: {
          name: "Notify Failure",
          type: "action",
          action: "sendNotification",
          params: { message: "Approval failed" },
          nextSteps: ["end"]
        },
        end: {
          name: "End",
          type: "end",
          result: "success"
        }
      }
    },
    mermaidDiagram: `flowchart TD
      A[MRF Submitted] --> B{Check Approval Needed}
      B -->|Yes| C[Request Approval]
      B -->|No| D[Create Event]
      C -->|Approved| D
      C -->|Rejected| E[Notify Failure]
      D --> F[End]
      E --> F`,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
      author: "system",
      description: "Sample workflow template for event approval process",
      category: "event-management",
      tags: ["approval", "event", "sample"]
    },
    parentVersion: null,
    usageStats: {
      instanceCount: 0,
      lastUsed: null
    }
  };

  // Insert sample template
  templateCollection.insertOne(sampleTemplate);
  print('✅ Sample workflow template inserted successfully');
} else {
  print(`ℹ️  Database already contains ${templateCount} templates`);
}

// ===========================================
// 7. Verification
// ===========================================

print('\n🔍 Verifying collection updates...');

// Check collections exist
const updatedCollections = db.getCollectionNames();
print('Collections:', updatedCollections);

// Check indexes
print('workflowTemplates indexes:');
templateCollection.getIndexes().forEach(index => {
  print('  -', index.name, ':', JSON.stringify(index.key));
});

// Check sample data
const finalTemplateCount = templateCollection.countDocuments();
print('Total workflow templates:', finalTemplateCount);

// Check organization field coverage
const templatesWithOrg = templateCollection.countDocuments({ organization: { $exists: true } });
print(`Templates with organization field: ${templatesWithOrg}/${finalTemplateCount}`);

print('\n' + '='.repeat(60));
print('✅ COLLECTION UPDATE COMPLETE');
print('='.repeat(60));
print('\nCollection updates applied successfully!');
print('\nNext steps:');
print('1. Verify your application works with the updated schema');
print('2. Test organization-based template filtering');
print('3. Update any application code that relies on old indexes');
