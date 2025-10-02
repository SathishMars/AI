// db-scripts/workflow-template-collections.js
// MongoDB collection setup script for workflow templates and configurator conversations
// Run this script to set up the required collections and indexes

/**
 * Workflow Template Collections Setup
 * 
 * This script creates the necessary collections and indexes for:
 * 1. workflowTemplates - Primary collection for workflow template storage
 * 2. workflowConfiguratorConversations - AI conversation history storage
 */

// Connect to MongoDB (adjust connection string as needed)
// For local: mongodb://localhost:27017/groupize-workflows
// For DocumentDB: use appropriate DocumentDB connection string

const db = db.getSiblingDB('groupize-workflows');

// ===========================================
// 1. Create workflowTemplates Collection
// ===========================================

print('Creating workflowTemplates collection...');

// Create the collection if it doesn't exist
db.createCollection('workflowTemplates', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["account", "name", "status", "version", "workflowDefinition", "metadata"],
      properties: {
        account: {
          bsonType: "string",
          description: "Account identifier for multi-tenancy"
        },
        name: {
          bsonType: "string",
          description: "Template name (unique within account)"
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

// Create indexes for workflowTemplates collection
print('Creating indexes for workflowTemplates...');

// Primary lookup index - template name and status
db.workflowTemplates.createIndex(
  { name: 1, status: 1 },
  { 
    name: "idx_name_status",
    background: true 
  }
);

// Version management index - status and version for latest queries
db.workflowTemplates.createIndex(
  { status: 1, version: -1 },
  { 
    name: "idx_status_version_desc",
    background: true 
  }
);

// Template search index - category and tags
db.workflowTemplates.createIndex(
  { category: 1, "metadata.tags": 1 },
  { 
    name: "idx_category_tags",
    background: true 
  }
);

// Usage analytics index
db.workflowTemplates.createIndex(
  { "usageStats.lastUsed": -1 },
  { 
    name: "idx_last_used_desc",
    background: true 
  }
);

// Unique constraint for account + name + version combination
db.workflowTemplates.createIndex(
  { account: 1, name: 1, version: 1 },
  { 
    name: "idx_account_name_version_unique",
    unique: true,
    background: true 
  }
);

// Account-based queries index
db.workflowTemplates.createIndex(
  { account: 1, status: 1, "metadata.createdAt": -1 },
  { 
    name: "idx_account_status_created",
    background: true 
  }
);

print('✅ workflowTemplates collection and indexes created successfully');

// ===========================================
// 2. Create workflowConfiguratorConversations Collection
// ===========================================

print('Creating workflowConfiguratorConversations collection...');

// Create the collection with validation
db.createCollection('workflowConfiguratorConversations', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["account", "templateName", "conversationId", "messages", "sessionInfo"],
      properties: {
        account: {
          bsonType: "string",
          description: "Account identifier matching the template"
        },
        templateName: {
          bsonType: "string",
          description: "Links to workflowTemplates.name within account"
        },
        conversationId: {
          bsonType: "string",
          description: "Unique conversation identifier"
        },
        messages: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["messageId", "role", "content", "timestamp"],
            properties: {
              messageId: { bsonType: "string" },
              role: { 
                bsonType: "string",
                enum: ["user", "assistant", "system"]
              },
              content: { bsonType: "string" },
              timestamp: { bsonType: "date" },
              metadata: {
                bsonType: "object",
                properties: {
                  templateVersion: { bsonType: "string" },
                  model: { bsonType: "string" },
                  tokenCount: { bsonType: "int" }
                }
              }
            }
          }
        },
        sessionInfo: {
          bsonType: "object",
          required: ["startedAt", "lastActivity"],
          properties: {
            startedAt: { bsonType: "date" },
            lastActivity: { bsonType: "date" },
            isActive: { bsonType: "bool" },
            userAgent: { bsonType: "string" }
          }
        },
        retentionPolicy: {
          bsonType: "object",
          properties: {
            expiresAt: { bsonType: "date" },
            archived: { bsonType: "bool" }
          }
        }
      }
    }
  }
});

// Create indexes for workflowConfiguratorConversations collection
print('Creating indexes for workflowConfiguratorConversations...');

// Primary lookup index - account and template name
db.workflowConfiguratorConversations.createIndex(
  { account: 1, templateName: 1 },
  { 
    name: "idx_account_template_name",
    background: true 
  }
);

// Conversation management index
db.workflowConfiguratorConversations.createIndex(
  { conversationId: 1 },
  { 
    name: "idx_conversation_id",
    background: true 
  }
);

// Account-based session activity index for cleanup
db.workflowConfiguratorConversations.createIndex(
  { account: 1, "sessionInfo.lastActivity": -1 },
  { 
    name: "idx_account_last_activity_desc",
    background: true 
  }
);

// Retention policy index for automated cleanup
db.workflowConfiguratorConversations.createIndex(
  { "retentionPolicy.expiresAt": 1 },
  { 
    name: "idx_expires_at",
    background: true,
    expireAfterSeconds: 0  // MongoDB TTL index for automatic cleanup
  }
);

// Message timestamp index for chronological queries
db.workflowConfiguratorConversations.createIndex(
  { "messages.timestamp": -1 },
  { 
    name: "idx_message_timestamp_desc",
    background: true 
  }
);

print('✅ workflowConfiguratorConversations collection and indexes created successfully');

// ===========================================
// 3. Insert Sample Data (Optional)
// ===========================================

print('Inserting sample workflow template...');

// Sample workflow template for testing
const sampleTemplate = {
  account: "default-account",
  name: "sample-event-approval-workflow",
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
        action: "onMRFSubmit",
        params: { mrfID: "dynamic" },
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
        action: "functions.requestApproval",
        params: { to: "manager@example.com" },
        onSuccess: "createEvent",
        onFailure: "notifyFailure"
      },
      createEvent: {
        name: "Create Event",
        type: "action",
        action: "functions.createEvent",
        params: { mrfID: "dynamic" },
        nextSteps: ["end"]
      },
      notifyFailure: {
        name: "Notify Failure",
        type: "action",
        action: "functions.sendNotification",
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
db.workflowTemplates.insertOne(sampleTemplate);

print('✅ Sample workflow template inserted successfully');

// ===========================================
// 4. Verification
// ===========================================

print('Verifying collection setup...');

// Check collections exist
const collections = db.getCollectionNames();
print('Collections:', collections);

// Check indexes
print('workflowTemplates indexes:');
db.workflowTemplates.getIndexes().forEach(index => {
  print('  -', index.name, ':', JSON.stringify(index.key));
});

print('workflowConfiguratorConversations indexes:');
db.workflowConfiguratorConversations.getIndexes().forEach(index => {
  print('  -', index.name, ':', JSON.stringify(index.key));
});

// Check sample data
const templateCount = db.workflowTemplates.countDocuments();
print('Total workflow templates:', templateCount);

print('\n🎉 Workflow template collections setup complete!');
print('\nNext steps:');
print('1. Update your application connection string to use this database');
print('2. Implement the TypeScript types and database utilities');
print('3. Create API endpoints for template management');
print('4. Run tests to verify functionality');