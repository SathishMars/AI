# Workflow Template Collections Setup

This directory contains database scripts for setting up MongoDB collections required for the workflow template versioning and storage system.

## Collections Created

### 1. workflowTemplates
Primary collection for storing workflow templates with versioning support.

**Schema:**
- `name` (string, required) - Unique template identifier used for routing
- `displayName` (string) - Human-readable template name
- `status` (enum) - Template lifecycle status: draft, published, deprecated, archived
- `version` (string, required) - Semantic version (major.minor.patch)
- `workflowDefinition` (object, required) - Complete json-rules-engine compatible workflow JSON
- `mermaidDiagram` (string) - Generated Mermaid diagram representation
- `metadata` (object, required) - Creation, update, and publication timestamps, author info, etc.
- `parentVersion` (string) - Reference to parent version for lineage tracking
- `usageStats` (object) - Instance count and last used timestamp

**Indexes:**
- `idx_name_status` - Primary lookup by template name and status
- `idx_status_version_desc` - Version management queries
- `idx_category_tags` - Template search and filtering
- `idx_last_used_desc` - Usage analytics
- `idx_name_version_unique` - Unique constraint for name + version

### 2. workflowConfiguratorConversations
Collection for storing AI conversation history linked to workflow templates.

**Schema:**
- `templateName` (string, required) - Links to workflowTemplates.name
- `conversationId` (string, required) - Unique conversation identifier
- `messages` (array, required) - Array of conversation messages with metadata
- `sessionInfo` (object, required) - Session management data
- `retentionPolicy` (object) - 5-year retention with automatic cleanup

**Indexes:**
- `idx_template_name` - Primary lookup by template name
- `idx_conversation_id` - Conversation management
- `idx_last_activity_desc` - Session cleanup
- `idx_expires_at` - TTL index for automatic data cleanup
- `idx_message_timestamp_desc` - Chronological message queries

## Usage

### Setup Collections
```bash
# Connect to MongoDB and run the setup script
mongosh mongodb://localhost:27017/groupize-workflows workflow-template-collections.js
```

### For AWS DocumentDB
```bash
# Connect to DocumentDB cluster
mongosh "mongodb://username:password@docdb-cluster.cluster-xyz.us-east-1.docdb.amazonaws.com:27017/groupize-workflows?ssl=true&replicaSet=rs0" workflow-template-collections.js
```

## Features

### Validation
- JSON Schema validation ensures data integrity
- Required field enforcement
- Enum validation for status fields
- Semantic version pattern validation

### Performance
- Optimized indexes for common query patterns
- Background index creation to minimize impact
- Compound indexes for efficient filtering

### Data Management
- Automatic cleanup via TTL indexes
- Unique constraints prevent duplicates
- Retention policy enforcement

### Monitoring
- Usage statistics tracking
- Session management
- Activity timestamps for analytics

## Integration

This setup integrates with:
- MongoDB connection pool utility (`@/app/utils/mongodb-connection`)
- Workflow template types and validators
- API routes for template management
- AI conversation persistence system

## Next Steps

1. **Implement TypeScript Types** - Create interfaces for template and conversation data
2. **Database Utilities** - Build CRUD operations for templates and conversations
3. **API Routes** - Create endpoints for template management
4. **Testing** - Comprehensive test coverage for all database operations
5. **Documentation** - Update API documentation with new endpoints