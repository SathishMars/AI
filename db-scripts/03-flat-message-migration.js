/**
 * Flat Message Architecture Migration Script
 * 
 * This script updates the aimeWorkflowConversations collection to support
 * flat message documents instead of nested conversation documents.
 * 
 * New Architecture:
 * - Each message is stored as a separate document
 * - Messages are queried by account + organization + workflowTemplateName
 * - Unique constraint on account + organization + workflowTemplateName + id
 * - Results ordered by timestamp
 * 
 * Usage:
 *   mongosh < 03-flat-message-migration.js
 * 
 * Or with connection string:
 *   mongosh "mongodb://localhost:27017/workflowdb" < 03-flat-message-migration.js
 */

print('\n================================================');
print('🔄 Flat Message Architecture Migration');
print('================================================\n');

// Use the correct database
const dbName = 'workflowdb';
db = db.getSiblingDB(dbName);

print(`📁 Using database: ${dbName}\n`);

// ===========================================
// 1. Drop Old Collection (if starting fresh)
// ===========================================

print('🗑️  Dropping old aimeWorkflowConversations collection (if exists)...');
try {
  db.aimeWorkflowConversations.drop();
  print('✅ Old collection dropped\n');
} catch (_error) {
  print('ℹ️  Collection did not exist or could not be dropped\n');
}

// ===========================================
// 2. Create New Flat Message Collection
// ===========================================

print('💬 Creating aimeWorkflowConversations collection with flat message schema...\n');

db.createCollection('aimeWorkflowConversations', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["conversationId", "account", "workflowTemplateName", "id", "role", "content", "timestamp"],
      properties: {
        conversationId: {
          bsonType: "string",
          description: "Deterministic conversation ID (computed from account+org+template)"
        },
        account: {
          bsonType: "string",
          description: "Account identifier"
        },
        organization: {
          bsonType: ["string", "null"],
          description: "Organization identifier (null for account-wide templates)"
        },
        workflowTemplateName: {
          bsonType: "string",
          description: "Name of the workflow template"
        },
        id: {
          bsonType: "string",
          description: "Unique message ID within conversation"
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
              bsonType: ["string", "null"],
              description: "User agent string"
            },
            ipAddress: {
              bsonType: ["string", "null"],
              description: "IP address"
            },
            model: {
              bsonType: ["string", "null"],
              description: "AI model used (e.g., 'gpt-4', 'claude-3')"
            },
            provider: {
              bsonType: ["string", "null"],
              description: "AI provider (e.g., 'openai', 'anthropic')"
            },
            tokensUsed: {
              bsonType: ["int", "null"],
              description: "Tokens used for this message"
            },
            suggestedActions: {
              bsonType: ["array", "null"],
              description: "Suggested actions for the user",
              items: {
                bsonType: "string"
              }
            },
            workflowGenerated: {
              bsonType: ["bool", "null"],
              description: "Whether workflow was generated in this message"
            },
            mermaidDiagram: {
              bsonType: ["bool", "null"],
              description: "Whether Mermaid diagram was included"
            }
          }
        }
      }
    }
  }
});

print('✅ Collection created with flat message schema\n');

// ===========================================
// 3. Create Indexes
// ===========================================

print('📊 Creating indexes for efficient queries...\n');

// Composite unique index on account + organization + workflowTemplateName + id
print('  - Creating unique index on account+org+template+id...');
db.aimeWorkflowConversations.createIndex(
  { account: 1, organization: 1, workflowTemplateName: 1, id: 1 },
  { 
    name: "idx_unique_message",
    unique: true,
    background: true 
  }
);
print('    ✅ Unique message index created\n');

// Query index for fetching messages by conversation (ordered by timestamp)
print('  - Creating query index on account+org+template+timestamp...');
db.aimeWorkflowConversations.createIndex(
  { account: 1, organization: 1, workflowTemplateName: 1, timestamp: 1 },
  { 
    name: "idx_conversation_messages_chronological",
    background: true 
  }
);
print('    ✅ Chronological query index created\n');

// ConversationId index for quick lookups
print('  - Creating conversationId index...');
db.aimeWorkflowConversations.createIndex(
  { conversationId: 1, timestamp: 1 },
  { 
    name: "idx_conversationId_timestamp",
    background: true 
  }
);
print('    ✅ ConversationId index created\n');

// Account-level queries
print('  - Creating account index...');
db.aimeWorkflowConversations.createIndex(
  { account: 1, timestamp: -1 },
  { 
    name: "idx_account_recent",
    background: true 
  }
);
print('    ✅ Account index created\n');

// ===========================================
// 4. Verify Setup
// ===========================================

print('\n🔍 Verifying collection setup...\n');

const collectionStats = db.runCommand({ collStats: "aimeWorkflowConversations" });
print(`  - Collection exists: ${collectionStats.ok === 1 ? '✅' : '❌'}`);

const indexes = db.aimeWorkflowConversations.getIndexes();
print(`  - Number of indexes: ${indexes.length}`);
indexes.forEach(idx => {
  print(`    • ${idx.name}`);
});

print('\n================================================');
print('✅ Flat Message Architecture Migration Complete');
print('================================================\n');

print('📝 Summary:');
print('  - Collection: aimeWorkflowConversations');
print('  - Structure: Flat message documents');
print('  - Unique Key: account + organization + workflowTemplateName + id');
print('  - Query Pattern: By account + organization + workflowTemplateName');
print('  - Ordering: By timestamp (ascending)\n');

print('💡 Next Steps:');
print('  1. Use saveMessage() to store individual messages');
print('  2. Use getMessages() to retrieve all messages for a conversation');
print('  3. Frontend will construct message arrays from flat documents\n');
