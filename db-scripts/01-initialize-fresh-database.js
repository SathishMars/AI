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

/**
 * WORKFLOW TEMPLATE SCHEMA
 * 
 * COMPOSITE KEY FIELDS AT TOP LEVEL: id, account, organization, version
 * DESCRIPTIVE FIELDS IN METADATA: name, description, status, author, timestamps, tags
 * 
 * Structure:
 * {
 *   id: "a1b2c3d4e5",              // 10-char short-id (composite key - shared across versions)
 *   account: "company123",          // Account identifier (composite key)
 *   organization: "dept456",        // Organization identifier (composite key - nullable)
 *   version: "1.0.0",               // Semantic version (composite key)
 *   workflowDefinition: {
 *     steps: [...]                  // Nested array of workflow steps
 *   },
 *   metadata: {                     // Descriptive fields
 *     name: "Event Approval Flow",  // Template name (user-editable)
 *     description: "...",
 *     status: "draft",              // Template lifecycle status
 *     author: "user@example.com",   // Creator
 *     updatedBy: "user@example.com", // Last updater
 *     createdAt: ISODate("..."),
 *     updatedAt: ISODate("..."),
 *     publishedAt: ISODate("..."),  // When published
 *     category: "approval",
 *     tags: ["ai-generated"]
 *   }
 * }
 */
db.createCollection('workflowTemplates', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "account", "version", "workflowDefinition", "metadata"],
      properties: {
        id: {
          bsonType: "string",
          minLength: 10,
          maxLength: 10,
          pattern: "^[a-zA-Z0-9]{10}$",
          description: "10-character Base62 short-id (composite key - shared across versions)"
        },
        account: {
          bsonType: "string",
          description: "Account identifier (composite key - REQUIRED)"
        },
        organization: {
          bsonType: ["string", "null"],
          description: "Organization identifier (composite key - nullable for account-wide templates)"
        },
        version: {
          bsonType: "string",
          pattern: "^\\d+\\.\\d+\\.\\d+$",
          description: "Semantic version (composite key - major.minor.patch)"
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
                    description: "Human-readable camelCase step ID (LLM-generated)"
                  },
                  name: {
                    bsonType: "string",
                    description: "Professional step name with prefix (Start:|Check:|Action:|End:) - NO EMOJIS"
                  },
                  type: {
                    bsonType: "string",
                    enum: ["trigger", "condition", "action", "end", "workflow"],
                    description: "Step type"
                  },
                  action: {
                    bsonType: "string",
                    description: "Function/trigger name to execute"
                  },
                  params: {
                    bsonType: "object",
                    description: "Function parameters (can be empty {} for parameter collection)"
                  },
                  condition: {
                    bsonType: "object",
                    description: "json-rules-engine condition (for condition type steps)"
                  },
                  children: {
                    bsonType: "array",
                    description: "Nested child steps (sequential execution)"
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
                    description: "Step ID reference to jump to on success"
                  },
                  onFailureGoTo: {
                    bsonType: "string",
                    description: "Step ID reference to jump to on failure"
                  },
                  result: {
                    bsonType: "string",
                    enum: ["success", "failure", "cancelled", "timeout"],
                    description: "End step result (for end type steps)"
                  },
                  workflowId: {
                    bsonType: "string",
                    description: "Template ID to trigger (for workflow type steps)"
                  },
                  workflowParams: {
                    bsonType: "object",
                    description: "Parameters to pass to triggered workflow"
                  }
                }
              }
            }
          }
        },
        mermaidDiagram: {
          bsonType: "string",
          description: "Auto-generated Mermaid flowchart representation"
        },
        metadata: {
          bsonType: "object",
          required: ["name", "status", "author", "createdAt", "updatedAt"],
          properties: {
            name: {
              bsonType: "string",
              description: "Template name - user-editable, descriptive"
            },
            description: { 
              bsonType: "string",
              description: "Template description"
            },
            status: {
              bsonType: "string",
              enum: ["draft", "published", "deprecated", "archived"],
              description: "Template lifecycle status"
            },
            author: { 
              bsonType: "string",
              description: "Email or identifier of user who created this version"
            },
            updatedBy: {
              bsonType: "string",
              description: "Email or identifier of user who last updated this version"
            },
            createdAt: { 
              bsonType: "date",
              description: "When this version was created"
            },
            updatedAt: { 
              bsonType: "date",
              description: "Last modification timestamp"
            },
            publishedAt: { 
              bsonType: "date",
              description: "When this version was published (published templates only)"
            },
            category: { 
              bsonType: "string",
              description: "Template category (e.g., 'approval', 'notification')"
            },
            tags: {
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Searchable tags (e.g., ['ai-generated', 'event-management'])"
            }
          }
        },
        parentVersion: {
          bsonType: "string",
          pattern: "^\\d+\\.\\d+\\.\\d+$",
          description: "Parent version reference (for draft templates created from published)"
        },
        usageStats: {
          bsonType: "object",
          properties: {
            instanceCount: { 
              bsonType: "int",
              minimum: 0,
              description: "Number of active workflow instances"
            },
            lastUsed: { 
              bsonType: "date",
              description: "Last time this template was used"
            }
          }
        }
      }
    }
  }
});

// Create indexes for workflowTemplates collection
print('📊 Creating indexes for workflowTemplates...');

// PRIMARY INDEX: Template resolution by account + organization + id
// Supports queries: getWorkflowTemplate(account, organization, id)
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, id: 1, "metadata.status": 1, version: -1 },
  { 
    name: "idx_account_org_id_status_version",
    background: true 
  }
);

// UNIQUE CONSTRAINT: Prevent duplicate template versions
// One unique combination of account + organization + id + version
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, id: 1, version: 1 },
  { 
    name: "idx_account_org_id_version_unique",
    unique: true,
    background: true 
  }
);

// VERSION MANAGEMENT: Find latest version by status
// Supports queries: Get latest draft or published version for a template
db.workflowTemplates.createIndex(
  { id: 1, "metadata.status": 1, version: -1 },
  { 
    name: "idx_id_status_version_desc",
    background: true 
  }
);

// LIST TEMPLATES: Browse templates by account/organization
// Supports queries: List all templates for an account or organization
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, "metadata.status": 1, "metadata.createdAt": -1 },
  { 
    name: "idx_account_org_status_created",
    background: true 
  }
);

// SEARCH BY NAME: Find templates by name
// Supports queries: Search templates by name within account/organization
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, "metadata.name": 1, "metadata.status": 1 },
  { 
    name: "idx_account_org_name_status",
    background: true 
  }
);

// SEARCH BY CATEGORY: Find templates by category
// Supports queries: Filter templates by category
db.workflowTemplates.createIndex(
  { account: 1, "metadata.category": 1, "metadata.status": 1 },
  { 
    name: "idx_account_category_status",
    background: true 
  }
);

// SEARCH BY TAGS: Find templates by tags
// Supports queries: Filter templates by tags (e.g., 'ai-generated')
db.workflowTemplates.createIndex(
  { account: 1, "metadata.tags": 1, "metadata.status": 1 },
  { 
    name: "idx_account_tags_status",
    background: true 
  }
);

// USAGE ANALYTICS: Recently used templates
// Supports queries: Find most recently used templates
db.workflowTemplates.createIndex(
  { account: 1, "usageStats.lastUsed": -1 },
  { 
    name: "idx_account_last_used_desc",
    background: true 
  }
);

// AUTHOR QUERIES: Find templates by author
// Supports queries: List templates created by specific user
db.workflowTemplates.createIndex(
  { account: 1, "metadata.author": 1, "metadata.createdAt": -1 },
  { 
    name: "idx_account_author_created",
    background: true 
  }
);

print('✅ workflowTemplates collection and indexes created successfully');

// ===========================================
// 2. Create aimeWorkflowConversations Collection
// ===========================================

print('\n💬 Creating aimeWorkflowConversations collection...');
print('    (Includes flat message schema + per-message unique key)');

// Drop existing collection if it exists
db.aimeWorkflowConversations.drop();
// Create the collection with schema validation (flat message documents)
db.createCollection('aimeWorkflowConversations', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "account",
        "workflowTemplateId",
        "conversationId",
        "id",
        "role",
        "content",
        "timestamp"
      ],
      properties: {
        account: {
          bsonType: "string",
          description: "Account identifier for the conversation"
        },
        organization: {
          bsonType: ["string", "null"],
          description: "Organization identifier within account (null for account-wide templates)"
        },
        workflowTemplateId: {
          bsonType: "string",
          description: "Template short-id this conversation message belongs to"
        },
        workflowTemplateName: {
          bsonType: "string",
          description: "Template name (stored for historical lookups)"
        },
        conversationId: {
          bsonType: "string",
          description: "Deterministic conversation identifier (account+org+template)"
        },
        id: {
          bsonType: "string",
          description: "Unique message ID (ObjectID string)"
        },
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
            ipAddress: {
              bsonType: "string",
              description: "IP address of the sender"
            },
            model: {
              bsonType: "string",
              description: "LLM model used for the message"
            },
            provider: {
              bsonType: "string",
              description: "LLM provider"
            },
            tokensUsed: {
              bsonType: ["int", "long", "double"],
              description: "Number of tokens consumed"
            },
            suggestedActions: {
              bsonType: "array",
              items: { bsonType: "string" },
              description: "List of suggested actions"
            },
            workflowGenerated: {
              bsonType: "bool",
              description: "Whether message generated a workflow"
            },
            mermaidDiagram: {
              bsonType: "bool",
              description: "Whether message includes a Mermaid diagram"
            },
            workflowStepGenerated: {
              bsonType: "string",
              description: "Step ID impacted by this message"
            },
            functionsCalled: {
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Functions referenced in message"
            },
            validationErrors: {
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Validation issues detected"
            },
            editIntent: {
              bsonType: "bool",
              description: "Whether message indicates edit intent"
            }
          }
        }
      }
    }
  }
});

// Create indexes for aimeWorkflowConversations collection
print('📊 Creating indexes for aimeWorkflowConversations...');

// UNIQUE CONSTRAINT: One saved message per account/org/template/messageId
db.aimeWorkflowConversations.createIndex(
  { account: 1, organization: 1, workflowTemplateId: 1, id: 1 },
  {
    name: "idx_account_org_template_message_unique",
    unique: true,
    background: true
  }
);

// CONVERSATION LOOKUP: Fetch messages by conversationId
db.aimeWorkflowConversations.createIndex(
  { account: 1, organization: 1, conversationId: 1, timestamp: 1 },
  {
    name: "idx_account_org_conversation_timestamp",
    background: true
  }
);

// TEMPLATE TIMELINE: Retrieve messages by template in chronological order
db.aimeWorkflowConversations.createIndex(
  { account: 1, workflowTemplateId: 1, timestamp: -1 },
  {
    name: "idx_account_template_timestamp_desc",
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