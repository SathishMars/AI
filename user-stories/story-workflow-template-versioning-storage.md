# User Story: Workflow Template Versioning and Storage System

**As a** workflow administrator and meeting planner  
**I want** a comprehensive workflow template storage system with versioning, conversation persistence, and draft/publish lifecycle management  
**So that** I can create reusable workflow templates, maintain conversation history across versions, and safely iterate through draft/publish cycles before deploying workflows

## Summary
Implement a robust database storage system for workflow templates with version control, conversation history management, and a clear distinction between templates (reusable definitions) and workflow instances (actual executions).

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- **Template vs Instance Clarity**: Clear visual distinction between workflow templates (reusable) and workflow instances (executions)
- **Version Status Indicators**: Visual badges for draft, published, and deprecated template versions
- **Draft Creation Prompt**: "aime" proactively asks to create new draft when only published versions exist
- **Conversation Continuity**: Seamless conversation history display across all template versions
- **Version Selection UI**: Dropdown or timeline interface for selecting template versions
- **Publishing Workflow**: Clear publish confirmation with impact warnings (affects new workflow instances)
- **Template Library View**: Browse and search existing workflow templates with version information
- **Draft State Persistence**: Auto-save draft changes with clear unsaved indicators
- **Template Metadata Display**: Creation date, last modified, author, and usage statistics
- **Responsive Design**: Template management interface works on all device sizes

## Acceptance Criteria

### Database Schema and Storage
- [ ] **Workflow Template Storage Schema:**
  - [ ] `workflow_templates` collection with unique template IDs
  - [ ] Support for multiple versions per template with semantic versioning
  - [ ] Template metadata: name, description, author, created_at, updated_at
  - [ ] Template categories and tags for organization
  - [ ] Usage statistics and analytics tracking

- [ ] **Template Version Management:**
  - [ ] `workflow_template_versions` collection with version-specific data
  - [ ] Version states: draft, published, deprecated
  - [ ] JSON workflow definition storage (json-rules-engine compatible)
  - [ ] Version comparison and diff tracking
  - [ ] Automatic semantic versioning (major.minor.patch)

- [ ] **Conversation History Storage:**
  - [ ] `workflow_conversations` collection linked to template (not version)
  - [ ] Conversation persistence across all template versions
  - [ ] Message threading and conversation context preservation
  - [ ] Support for conversation branching when creating new templates from existing ones
  - [ ] 5-year retention policy with archival strategy

### Template vs Workflow Instance Distinction
- [ ] **Clear Conceptual Separation:**
  - [ ] Workflow templates are reusable definitions created in the configurator
  - [ ] Workflow instances are actual executions triggered by events (MRF submissions, etc.)
  - [ ] Templates define the blueprint; instances execute the logic
  - [ ] Instance execution data stored separately from template definitions

- [ ] **Template Deployment Pipeline:**
  - [ ] Only published template versions can generate workflow instances
  - [ ] Draft versions are for development and testing only
  - [ ] Template publication creates immutable version for production use
  - [ ] Instance generation references specific published template version

### Draft/Publish Lifecycle Management
- [ ] **Draft Creation and Management:**
  - [ ] Automatic draft creation when modifying published templates
  - [ ] "aime" prompts for new draft creation when only published versions exist
  - [ ] Multiple draft iterations allowed before publishing
  - [ ] Draft auto-save with conflict resolution for concurrent edits

- [ ] **Publishing Process:**
  - [ ] Explicit publish action with confirmation dialog
  - [ ] Version impact analysis (how many instances might be affected)
  - [ ] Validation before publishing (schema compliance, function availability)
  - [ ] Atomic publish operation with rollback capability

- [ ] **Version State Transitions:**
  - [ ] Draft → Published (normal flow)
  - [ ] Published → Deprecated (when superseded)
  - [ ] Draft → Archived (abandoned drafts)
  - [ ] Published versions remain immutable for audit trail

### AI Integration with Versioning
- [ ] **"aime" Version Awareness:**
  - [ ] AI recognizes current template version and state
  - [ ] Proactive draft creation prompts for edit requests on published templates
  - [ ] Context-aware suggestions based on template history
  - [ ] Version comparison explanations in natural language

- [ ] **Conversation Context Management:**
  - [ ] AI accesses complete conversation history for template
  - [ ] Context preservation across version changes
  - [ ] Smart conversation threading when creating new template versions
  - [ ] Edit intent detection with appropriate draft creation prompts

### Advanced Features
- [ ] **Template Library Management:**
  - [ ] Browse and search workflow templates with version filtering
  - [ ] Template categorization and tagging system
  - [ ] Usage analytics and popularity metrics
  - [ ] Template sharing and collaboration features

- [ ] **Version Control Operations:**
  - [ ] Compare versions with visual diff highlighting
  - [ ] Rollback to previous published versions
  - [ ] Branch templates to create variations
  - [ ] Merge improvements between template variants

- [ ] **Audit and Compliance:**
  - [ ] Complete audit trail for all template changes
  - [ ] Change attribution with user identification
  - [ ] Compliance reporting for workflow governance
  - [ ] Export/import capabilities for backup and migration

## Database Schema Specifications

### Workflow Templates Collection
```javascript
{
  _id: ObjectId,
  templateId: String, // Unique identifier across versions
  name: String,
  description: String,
  category: String,
  tags: [String],
  author: {
    userId: String,
    name: String,
    email: String
  },
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    isActive: Boolean,
    usageCount: Number,
    lastUsed: Date
  },
  currentPublishedVersion: String, // Reference to published version
  currentDraftVersion: String, // Reference to draft version if exists
  versions: [String] // Array of version identifiers
}
```

### Workflow Template Versions Collection
```javascript
{
  _id: ObjectId,
  templateId: String, // Reference to parent template
  version: String, // Semantic version (e.g., "1.2.3")
  status: String, // "draft", "published", "deprecated", "archived"
  workflowDefinition: Object, // json-rules-engine compatible JSON
  mermaidDiagram: String, // Generated Mermaid diagram
  validation: {
    isValid: Boolean,
    errors: [Object],
    warnings: [Object]
  },
  metadata: {
    createdAt: Date,
    publishedAt: Date,
    createdBy: String,
    publishedBy: String,
    changeLog: String,
    parentVersion: String // For tracking version lineage
  },
  deployment: {
    canDeploy: Boolean,
    activeInstances: Number,
    testResults: Object
  }
}
```

### Workflow Conversations Collection
```javascript
{
  _id: ObjectId,
  templateId: String, // Linked to template, not version
  conversationId: String,
  messages: [{
    messageId: String,
    type: String, // "user", "assistant", "system"
    content: String,
    timestamp: Date,
    metadata: {
      tokenCount: Number,
      model: String,
      responseTime: Number
    }
  }],
  context: {
    activeVersion: String,
    editMode: Boolean,
    lastActivity: Date,
    conversationState: String
  },
  retention: {
    createdAt: Date,
    expiresAt: Date, // 5-year retention
    archived: Boolean
  }
}
```

## Implementation Tasks

### Phase 1: Core Storage Infrastructure
- [ ] Implement MongoDB collections with proper indexing
- [ ] Create database connection utilities using existing connection pool
- [ ] Implement template CRUD operations with version support
- [ ] Build conversation persistence layer

### Phase 2: Version Management System
- [ ] Implement semantic versioning logic
- [ ] Build draft/publish workflow with state management
- [ ] Create version comparison and diff utilities
- [ ] Implement template deployment pipeline

### Phase 3: AI Integration
- [ ] Update "aime" to recognize template versioning
- [ ] Implement draft creation prompts for published templates
- [ ] Build conversation context preservation across versions
- [ ] Create version-aware AI responses

### Phase 4: UI Integration
- [ ] Build template library interface
- [ ] Implement version selection and management UI
- [ ] Create draft/publish workflow interface
- [ ] Add conversation history display with version context

## Security Considerations
- **Access Control**: Role-based permissions for template creation, editing, and publishing
- **Data Encryption**: Conversation and template data encryption at rest
- **Audit Logging**: Complete audit trail for all template and version operations
- **Input Validation**: Comprehensive validation for workflow JSON and conversation data
- **API Security**: Secure endpoints for template operations with authentication

## Performance Considerations
- **Indexing Strategy**: Optimized database indexes for template searches and version queries
- **Conversation Pagination**: Efficient pagination for large conversation histories
- **Caching Strategy**: Template and version caching for frequently accessed workflows
- **Background Processing**: Asynchronous operations for diagram generation and validation

## Testing Requirements
- **Unit Tests**: 90%+ coverage for all storage operations and version management
- **Integration Tests**: End-to-end template lifecycle testing
- **Performance Tests**: Load testing for concurrent template operations
- **Data Migration Tests**: Testing for schema changes and data migrations

## Migration Strategy
- **Existing Data**: Migration plan for any existing workflow data
- **Backward Compatibility**: Ensure existing workflows continue to function
- **Gradual Rollout**: Phased deployment with feature flags
- **Rollback Plan**: Complete rollback strategy for production issues

## Success Metrics
- **Template Creation Rate**: Number of templates created per month
- **Version Utilization**: Average number of versions per template
- **Conversation Retention**: Successful conversation history retrieval rate
- **Draft to Publish Ratio**: Percentage of drafts that reach published state
- **System Performance**: Database query response times and throughput

## Developer Notes

### Database Implementation Details

#### Primary Database: MongoDB (Document Database)
- **Local Development**: MongoDB localhost instance
- **Production**: AWS DocumentDB (MongoDB 5.0 compatible)
- Use existing MongoDB connection pool utility from [Database Connection Pool Story](story-database-connection-pool.md)

#### Collection Structure
1. **`workflowTemplates`** - Primary collection for workflow template storage
   - Stores workflow templates generated by the configurator
   - Contains template metadata, versioning information, and workflow JSON definitions
   - Uses template `name` field (from JSON) as unique identifier for page routing

2. **`workflowConfiguratorConversations`** - Conversation history storage
   - Stores all "aime" conversations linked to workflow templates
   - Conversations persist across all template versions
   - Linked to templates via template `name` field

#### Page Loading Logic
When a workflow configurator page is loaded with a template ID (using the `name` field from JSON):

1. **Template Resolution Priority:**
   ```javascript
   // Load template with this priority order:
   // 1. Draft version (if available)
   // 2. Latest published version (if no draft exists)
   // 3. Create new template (if none exists)
   ```

2. **Data Retrieval Process:**
   ```javascript
   async function loadWorkflowTemplate(templateName) {
     // 1. Load conversation history
     const conversations = await workflowConfiguratorConversations
       .find({ templateName })
       .sort({ timestamp: 1 });
     
     // 2. Load template (draft priority)
     let template = await workflowTemplates
       .findOne({ name: templateName, status: 'draft' });
     
     if (!template) {
       template = await workflowTemplates
         .findOne({ name: templateName, status: 'published' })
         .sort({ version: -1 }); // Latest published
     }
     
     return { template, conversations };
   }
   ```

3. **Template State Handling:**
   - **Draft Available**: Load draft version with full edit capabilities
   - **Published Only**: Load published version, "aime" prompts for draft creation on edit requests
   - **No Template**: Initialize new template creation flow

#### Database Schema Refinements

**workflowTemplates Collection:**
```javascript
{
  _id: ObjectId,
  name: String, // Unique identifier from workflow JSON (used for routing)
  displayName: String, // Human-readable name
  status: String, // "draft", "published", "deprecated"
  version: String, // Semantic version
  workflowDefinition: Object, // Complete json-rules-engine JSON
  mermaidDiagram: String,
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    publishedAt: Date,
    author: String,
    description: String,
    category: String,
    tags: [String]
  },
  parentVersion: String, // For version lineage tracking
  usageStats: {
    instanceCount: Number,
    lastUsed: Date
  }
}
```

**workflowConfiguratorConversations Collection:**
```javascript
{
  _id: ObjectId,
  templateName: String, // Links to workflowTemplates.name
  conversationId: String, // Unique conversation identifier
  messages: [{
    messageId: String,
    role: String, // "user", "assistant", "system"
    content: String,
    timestamp: Date,
    metadata: {
      templateVersion: String, // Version when message was created
      model: String, // AI model used
      tokenCount: Number
    }
  }],
  sessionInfo: {
    startedAt: Date,
    lastActivity: Date,
    isActive: Boolean,
    userAgent: String
  },
  retentionPolicy: {
    expiresAt: Date, // 5-year retention
    archived: Boolean
  }
}
```

### Database Integration Points
- Leverage existing MongoDB connection pool from [Database Connection Pool Story](story-database-connection-pool.md)
- Follow established patterns for MongoDB 5.0 / AWS DocumentDB compatibility
- Use existing validation patterns from workflow JSON schema implementation
- Implement proper indexing for template name lookups and conversation queries

### AI Integration Points
- Build on conversation interface from [AI Conversation Interface Story](story-ai-conversation-interface.md)
- Integrate with workflow creation flow from [Workflow Creation Flow Story](story-workflow-creation-flow.md)
- Extend edit mode functionality from [Workflow Edit Mode Story](story-workflow-edit-mode-history.md)
- "aime" context includes template state (draft/published) for appropriate responses

### API Endpoints Design
```javascript
// Template loading endpoint
GET /api/workflow-templates/:templateName
// Returns: { template, conversations, templateState }

// Conversation persistence endpoint  
POST /api/workflow-conversations
// Payload: { templateName, message, role, metadata }

// Template saving endpoint
PUT /api/workflow-templates/:templateName
// Payload: { workflowDefinition, action: "saveDraft" | "publish" }
```

### Performance Optimizations
- **Indexing Strategy:**
  ```javascript
  // workflowTemplates indexes
  db.workflowTemplates.createIndex({ name: 1, status: 1 });
  db.workflowTemplates.createIndex({ status: 1, version: -1 });
  
  // workflowConfiguratorConversations indexes
  db.workflowConfiguratorConversations.createIndex({ templateName: 1 });
  db.workflowConfiguratorConversations.createIndex({ "sessionInfo.lastActivity": 1 });
  ```

- **Conversation Pagination:** Implement efficient pagination for large conversation histories
- **Template Caching:** Cache frequently accessed templates in memory
- **Background Processing:** Asynchronous Mermaid diagram generation and validation

### Future Enhancements
- **Template Marketplace**: Community sharing of workflow templates
- **Advanced Analytics**: Template performance and optimization insights
- **API Integration**: REST/GraphQL APIs for external template management
- **Collaborative Editing**: Real-time collaborative template editing
- **Template Testing**: Automated testing framework for template validation