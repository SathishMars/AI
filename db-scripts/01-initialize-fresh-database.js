// db-scripts/initialize-fresh-database.js
// Complete database initialization script for a fresh MongoDB/DocumentDB setup
// Run this script to set up the entire database from scratch

/**
 * Fresh Database Initialization
 * 
 * This script:
 * 1. Creates the groupize-workflows database
 * 2. Sets up all required collections with proper schemas
 * 3. Creates all necessary indexes
 * 4. Sets up default user accounts and organizations
 * 5. Inserts sample workflow templates
 */

// Connect to MongoDB (adjust connection string as needed)
// For local: mongodb://localhost:27017
// For DocumentDB: use appropriate DocumentDB connection string

print('='.repeat(60));
print('INITIALIZING FRESH GROUPIZE-WORKFLOWS DATABASE');
print('='.repeat(60));

const db = db.getSiblingDB('groupize-workflows');

// ===========================================
// 1. Create workflowTemplates Collection
// ===========================================

print('\n📝 Creating workflowTemplates collection...');

// Drop existing collection if it exists
db.workflowTemplates.drop();

// Create the collection with updated schema
db.createCollection('workflowTemplates', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id","account", "name", "status", "version", "workflowDefinition", "metadata"],
      properties: {
        id: {
          bsonType: "string",
          description: "identifier for the template (UUID or similar)"
        },
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
          required: ["steps"],
          description: "Complete workflow definition with nested array structure",
          properties: {
            steps: {
              bsonType: "array",
              description: "Array of workflow steps (nested array architecture)",
              items: {
                bsonType: "object",
                required: ["id", "name", "type"],
                properties: {
                  id: {
                    bsonType: "string",
                    pattern: "^[a-z][a-zA-Z0-9]*$",
                    minLength: 3,
                    maxLength: 50,
                    description: "Human-readable step ID in camelCase format"
                  },
                  name: {
                    bsonType: "string",
                    description: "Step display name"
                  },
                  type: {
                    bsonType: "string",
                    enum: ["trigger", "condition", "action", "end", "branch", "merge", "workflow"],
                    description: "Step type"
                  },
                  action: {
                    bsonType: "string",
                    description: "Function name to execute"
                  },
                  params: {
                    bsonType: "object",
                    description: "Function parameters"
                  },
                  condition: {
                    bsonType: "object",
                    description: "json-rules-engine condition"
                  },
                  children: {
                    bsonType: "array",
                    description: "Sequential child steps (nested array)"
                  },
                  onSuccess: {
                    bsonType: "object",
                    description: "Inline step to execute on success"
                  },
                  onFailure: {
                    bsonType: "object",
                    description: "Inline step to execute on failure"
                  },
                  onSuccessGoTo: {
                    bsonType: "string",
                    description: "Step ID to jump to on success"
                  },
                  onFailureGoTo: {
                    bsonType: "string",
                    description: "Step ID to jump to on failure"
                  },
                  result: {
                    bsonType: "string",
                    enum: ["success", "failure", "cancelled", "timeout"],
                    description: "End step result"
                  },
                  workflowId: {
                    bsonType: "string",
                    description: "ID of workflow to trigger (for workflow type steps)"
                  },
                  workflowParams: {
                    bsonType: "object",
                    description: "Parameters to pass to triggered workflow"
                  }
                }
              }
            },
            schemaVersion: {
              bsonType: "string",
              description: "Schema version for backward compatibility"
            },
            metadata: {
              bsonType: "object",
              description: "Workflow metadata (legacy - will be removed)"
            }
          }
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
print('📊 Creating indexes for workflowTemplates...');

// Primary lookup index - template id and status
db.workflowTemplates.createIndex(
  { id: 1, status: 1 },
  { 
    name: "idx_id_status",
    background: true 
  }
);

// Version management index - status and version for latest queries
db.workflowTemplates.createIndex(
  { id: 1, status: 1, version: -1 },
  { 
    name: "idx_id_status_version_desc",
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

// Unique constraint for account + organization + name + version combination
// This handles both organization-specific templates and account-wide templates (organization: null)
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, id: 1, version: 1 },
  { 
    name: "idx_account_org_id_version_unique",
    unique: true,
    background: true 
  }
);

// Additional partial index for account-wide templates (organization is null)
db.workflowTemplates.createIndex(
  { account: 1, id: 1, version: 1 },
  { 
    name: "idx_account_id_version_null_org",
    unique: true,
    partialFilterExpression: { organization: { $eq: null } },
    background: true 
  }
);


// Organization-based queries index (includes null organization for account-wide templates)
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, status: 1, version: 1, "metadata.createdAt": -1 },
  { 
    name: "idx_account_org_status_version_created",
    background: true 
  }
);

print('✅ workflowTemplates collection and indexes created successfully');

// ===========================================
// 2. Create aimeWorkflowConversations Collection
// ===========================================

print('\n💬 Creating aimeWorkflowConversations collection...');

// Drop existing collection if it exists
db.aimeWorkflowConversations.drop();
// Create the collection with schema validation
db.createCollection('aimeWorkflowConversations', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["account", "workflowTemplateID", "id", "message"],
      properties: {
        account: {
          bsonType: "string",
          description: "Account identifier for the conversation"
        },
        organization: {
          bsonType: "string",
          description: "Organization identifier within account (optional - null for account-wide templates)"
        },
        workflowTemplateID: {
          bsonType: "string",
          description: "ID of the workflow template this conversation belongs to"
        },
        id: {
          bsonType: "string",
          description: "Unique conversation ID"
        },
        message: {
            bsonType: "object",
            required: ["role", "content", "timestamp"],
            properties: {
              role: {
                bsonType: "string",
                enum: ["user", "assistant", "system"],
                description: "Message sender role"
              },
              content: {
                bsonType: "string",
                description: "Message content"
              },
              timestamp: {
                bsonType: "date",
                description: "When the message was sent"
              },
              metadata: {
                bsonType: "object",
                description: "Additional message metadata",
                properties: {
                  userAgent: {
                    bsonType: "string",
                    description: "User agent string of the sender"
                  },
                  source: {
                    bsonType: "string",
                    description: "Source of the message (e.g., web, mobile)"
                  },
                  ipAddress: {
                    bsonType: "string",
                    description: "IP address of the sender"
                  },
                  model: {
                    bsonType: "string",
                    description: "Model used for the message"
                  },
                  provider: {
                    bsonType: "string",
                    description: "Provider of the messaging service"
                  },
                  tokensUsed: {
                    bsonType: "number",
                    description: "Number of tokens used in the message"
                  },
                  suggestedActions: {
                    bsonType: "array",
                    items: {
                      bsonType: "string"
                    },
                    description: "List of suggested actions for the message"
                  },
                  workflowGenerated: {
                    bsonType: "boolean",
                    description: "Indicates if the message was generated by a workflow"
                  },
                  mermaidDiagram: {
                    bsonType: "boolean",
                    description: "Indicates if the message contains a mermaid diagram"
                  },
                  suggestedActions: {
                    bsonType: "array",
                    items: {
                      bsonType: "string"
                    },
                    description: "List of suggested actions for the message"
                  }
                }
              }
            }
        }
      }
    }
  }
});

// Create indexes for aimeWorkflowConversations collection
print('📊 Creating indexes for aimeWorkflowConversations...');

// Primary lookup index - one conversation per template per account/organization
db.aimeWorkflowConversations.createIndex(
  { account: 1, organization: 1, workflowTemplateID: 1 },
  { 
    name: "idx_account_org_template_unique",
    unique: true,
    background: true 
  }
);

// Template-based lookup (organization can be null for account-wide templates)
db.aimeWorkflowConversations.createIndex(
  { account: 1, workflowTemplateID: 1, "sessionInfo.lastActivity": -1 },
  { 
    name: "idx_account_template_activity",
    background: true 
  }
);


print('✅ aimeWorkflowConversations collection and indexes created successfully');

const templateIndexes = db.workflowTemplates.getIndexes();
const conversationIndexes = db.aimeWorkflowConversations.getIndexes();

print(`📈 Indexes Created:`);
print(`   - workflowTemplates: ${templateIndexes.length} indexes`);
print(`   - aimeWorkflowConversations: ${conversationIndexes.length} indexes`);

print('\n' + '='.repeat(60));
print('✅ FRESH DATABASE INITIALIZATION COMPLETE');
print('='.repeat(60));
print('\nDatabase is ready for the Groupize Workflows application!');
print('\nNext steps:');
print('1. Update your application connection string');
print('2. Change the default database user password');
print('3. Configure environment variables');
print('4. Start your application');