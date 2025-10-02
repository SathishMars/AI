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

// Create indexes for workflowTemplates collection
print('📊 Creating indexes for workflowTemplates...');

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

// Unique constraint for account + organization + name + version combination
// This handles both organization-specific templates and account-wide templates (organization: null)
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, name: 1, version: 1 },
  { 
    name: "idx_account_org_name_version_unique",
    unique: true,
    background: true 
  }
);

// Additional partial index for account-wide templates (organization is null)
db.workflowTemplates.createIndex(
  { account: 1, name: 1, version: 1 },
  { 
    name: "idx_account_name_version_null_org",
    unique: true,
    partialFilterExpression: { organization: { $eq: null } },
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

// Organization-based queries index (includes null organization for account-wide templates)
db.workflowTemplates.createIndex(
  { account: 1, organization: 1, status: 1, "metadata.createdAt": -1 },
  { 
    name: "idx_account_org_status_created",
    background: true 
  }
);

print('✅ workflowTemplates collection and indexes created successfully');

// ===========================================
// 2. Create workflowConfiguratorConversations Collection
// ===========================================

print('\n💬 Creating workflowConfiguratorConversations collection...');

// Drop existing collection if it exists
db.workflowConfiguratorConversations.drop();

// Create the collection with schema validation
db.createCollection('workflowConfiguratorConversations', {
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
        sessionInfo: {
          bsonType: "object",
          description: "Session information for the conversation"
        },
        messages: {
          bsonType: "array",
          description: "Array of conversation messages",
          items: {
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
                description: "Additional message metadata"
              }
            }
          }
        },
        currentWorkflow: {
          bsonType: "object",
          description: "Current state of the workflow being built"
        },
        generatedMermaid: {
          bsonType: "string",
          description: "Generated Mermaid diagram"
        },
        collectedParameters: {
          bsonType: "object",
          description: "Parameters collected during conversation"
        },
        metadata: {
          bsonType: "object",
          required: ["createdAt", "updatedAt"],
          properties: {
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" },
            completedAt: { bsonType: "date" },
            userId: { bsonType: "string" },
            userAgent: { bsonType: "string" },
            source: { bsonType: "string" }
          }
        }
      }
    }
  }
});

// Create indexes for workflowConfiguratorConversations collection
print('📊 Creating indexes for workflowConfiguratorConversations...');

// Primary lookup index - one conversation per template per account/organization
db.workflowConfiguratorConversations.createIndex(
  { account: 1, organization: 1, workflowTemplateName: 1, conversationId: 1 },
  { 
    name: "idx_account_org_template_conversation",
    unique: true,
    background: true 
  }
);

// Template-based lookup (organization can be null for account-wide templates)
db.workflowConfiguratorConversations.createIndex(
  { account: 1, workflowTemplateName: 1, "sessionInfo.lastActivity": -1 },
  { 
    name: "idx_account_template_activity",
    background: true 
  }
);

// Session activity queries
db.workflowConfiguratorConversations.createIndex(
  { account: 1, organization: 1, "sessionInfo.isActive": 1, "sessionInfo.startedAt": -1 },
  { 
    name: "idx_account_org_session_activity",
    background: true 
  }
);

// User activity tracking
db.workflowConfiguratorConversations.createIndex(
  { "sessionInfo.userId": 1, "sessionInfo.startedAt": -1 },
  { 
    name: "idx_user_activity",
    background: true 
  }
);

print('✅ workflowConfiguratorConversations collection and indexes created successfully');

// ===========================================
// 3. Create Demo Account and Organizations
// ===========================================

print('\n🏢 Setting up demo account and organizations...');

// Demo account setup
const demoAccount = "groupize-demos";
const organizations = [
  {
    id: "hr-department",
    name: "Human Resources",
    type: "department"
  },
  {
    id: "it-department", 
    name: "Information Technology",
    type: "department"
  },
  {
    id: "finance-department",
    name: "Finance",
    type: "department"
  }
];

print(`✅ Demo account "${demoAccount}" configured with ${organizations.length} organizations`);

// ===========================================
// 4. Insert Sample Workflow Templates
// ===========================================

print('\n📋 Inserting sample workflow templates...');

// Account-wide template (organization: null)
const accountWideTemplate = {
  account: demoAccount,
  organization: null, // Account-wide template
  name: "Employee Onboarding",
  status: "published",
  version: "1.0.0",
  workflowDefinition: {
    steps: {
      start: {
        name: "New Employee Request",
        type: "trigger",
        action: "onRequest",
        params: { requestType: "employee_onboarding" },
        nextSteps: ["checkDepartment"]
      },
      checkDepartment: {
        name: "Check Department Requirements",
        type: "condition",
        condition: {
          all: [
            { fact: "employee.department", operator: "in", value: ["IT", "Finance"] }
          ]
        },
        onSuccess: "requireApproval",
        onFailure: "autoApprove"
      },
      requireApproval: {
        name: "Request Manager Approval",
        type: "action",
        action: "requestApproval",
        params: { approverRole: "department_manager" },
        onSuccess: "createAccounts",
        onFailure: "notifyRejection"
      },
      autoApprove: {
        name: "Auto Approve",
        type: "action",
        action: "autoApprove",
        params: { reason: "Standard department onboarding" },
        nextSteps: ["createAccounts"]
      },
      createAccounts: {
        name: "Create User Accounts",
        type: "action",
        action: "createUserAccounts",
        params: { systems: ["AD", "Email", "Groupize"] },
        nextSteps: ["end"]
      },
      notifyRejection: {
        name: "Notify Rejection",
        type: "action", 
        action: "sendEmail",
        params: { template: "onboarding_rejected" },
        nextSteps: ["end"]
      },
      end: { type: "end", result: "success" }
    }
  },
  mermaidDiagram: "flowchart TD\n    A[New Employee Request] --> B{Check Department}\n    B -->|IT/Finance| C[Require Approval]\n    B -->|Other| D[Auto Approve]\n    C --> E[Create Accounts]\n    D --> E\n    C -->|Rejected| F[Notify Rejection]\n    E --> G[End]\n    F --> G",
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    author: "system",
    description: "Standard employee onboarding workflow for all departments",
    category: "HR",
    tags: ["onboarding", "employee", "approval", "accounts"]
  },
  usageStats: {
    instanceCount: 0,
    lastUsed: null
  }
};

// Organization-specific template
const hrSpecificTemplate = {
  account: demoAccount,
  organization: "hr-department",
  name: "Performance Review Workflow",
  status: "published", 
  version: "1.0.0",
  workflowDefinition: {
    steps: {
      start: {
        name: "Performance Review Due",
        type: "trigger",
        action: "onMRF",
        params: { mrfTemplateName: "Performance Review" },
        nextSteps: ["notifyEmployee"]
      },
      notifyEmployee: {
        name: "Notify Employee",
        type: "action",
        action: "sendEmail",
        params: { template: "performance_review_notification" },
        nextSteps: ["collectSelfAssessment"]
      },
      collectSelfAssessment: {
        name: "Collect Self Assessment",
        type: "action",
        action: "collectForm",
        params: { formType: "self_assessment" },
        nextSteps: ["managerReview"]
      },
      managerReview: {
        name: "Manager Review",
        type: "action",
        action: "assignTask",
        params: { assigneeRole: "direct_manager", taskType: "performance_review" },
        nextSteps: ["finalizeReview"]
      },
      finalizeReview: {
        name: "Finalize Review",
        type: "action",
        action: "generateDocument",
        params: { documentType: "performance_review_summary" },
        nextSteps: ["end"]
      },
      end: { type: "end", result: "success" }
    }
  },
  mermaidDiagram: "flowchart TD\n    A[Performance Review Due] --> B[Notify Employee]\n    B --> C[Collect Self Assessment]\n    C --> D[Manager Review]\n    D --> E[Finalize Review]\n    E --> F[End]",
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    author: "hr-admin",
    description: "HR department specific performance review workflow",
    category: "HR",
    tags: ["performance", "review", "assessment", "manager"]
  },
  usageStats: {
    instanceCount: 0,
    lastUsed: null
  }
};

// Insert templates
try {
  db.workflowTemplates.insertOne(accountWideTemplate);
  print('✅ Account-wide template "Employee Onboarding" inserted');
  
  db.workflowTemplates.insertOne(hrSpecificTemplate);
  print('✅ HR-specific template "Performance Review Workflow" inserted');
} catch (error) {
  print('❌ Error inserting templates:', error.message);
}

// ===========================================
// 5. Create MongoDB User (if needed)
// ===========================================

print('\n👤 Setting up database user...');

try {
  db.createUser({
    user: "groupize-workflows-app",
    pwd: "secure-password-change-in-production",
    roles: [
      { role: "readWrite", db: "groupize-workflows" },
      { role: "dbAdmin", db: "groupize-workflows" }
    ]
  });
  print('✅ Database user "groupize-workflows-app" created');
} catch (error) {
  if (error.message.includes("already exists")) {
    print('ℹ️  Database user already exists');
  } else {
    print('❌ Error creating user:', error.message);
  }
}

// ===========================================
// 6. Verification
// ===========================================

print('\n🔍 Verifying database setup...');

const templateCount = db.workflowTemplates.countDocuments();
const conversationCount = db.workflowConfiguratorConversations.countDocuments();

print(`📊 Database Statistics:`);
print(`   - workflowTemplates: ${templateCount} documents`);
print(`   - workflowConfiguratorConversations: ${conversationCount} documents`);

const templateIndexes = db.workflowTemplates.getIndexes();
const conversationIndexes = db.workflowConfiguratorConversations.getIndexes();

print(`📈 Indexes Created:`);
print(`   - workflowTemplates: ${templateIndexes.length} indexes`);
print(`   - workflowConfiguratorConversations: ${conversationIndexes.length} indexes`);

print('\n' + '='.repeat(60));
print('✅ FRESH DATABASE INITIALIZATION COMPLETE');
print('='.repeat(60));
print('\nDatabase is ready for the Groupize Workflows application!');
print('\nNext steps:');
print('1. Update your application connection string');
print('2. Change the default database user password');
print('3. Configure environment variables');
print('4. Start your application');