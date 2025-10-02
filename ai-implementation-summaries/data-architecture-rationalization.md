# Data Architecture Rationalization

## Problem Identified

The current implementation has data duplication and inconsistency issues:

1. **Account Data Duplication**: User API includes `accountId` but Account API provides full account data
2. **Organization Data Duplication**: AccountContext creates demo organizations, but User API references different organization structure
3. **Data Source Conflicts**: Multiple sources of truth for the same entities

## Proposed Solution: Normalized Data Architecture

### 🏗️ **Single Source of Truth Principle**

Each entity should have exactly one authoritative API endpoint:

```
/api/account        → Account data only
/api/user          → User data only (with references)
/api/organizations → Organization data only
```

### 📊 **Data Flow Architecture**

```
UserContext
├── Loads user data from /api/user (includes accountId, organizationIds)
├── References AccountContext for account data
└── References OrganizationContext for organization data

AccountContext
├── Loads account data from /api/account
├── Loads organizations from /api/organizations
└── Provides current organization state

OrganizationContext (Future)
├── Loads organization data from /api/organizations
└── Manages organization switching
```

### 🔗 **Reference-Based Data Model**

#### **User API Response** (`/api/user`):
```json
{
  "user": {
    "id": "user-123",
    "profile": { ... },
    "preferences": { ... },
    "roles": [ ... ],
    "accountId": "groupize-demos",           // Reference only
    "organizationIds": ["main-org"],         // References only
    "currentOrganizationId": "main-org"     // Reference only
  }
}
```

#### **Account API Response** (`/api/account`):
```json
{
  "account": {
    "id": "groupize-demos",
    "name": "Groupize Demos",
    "organizations": [                       // Full organization data
      {
        "id": "main-org",
        "name": "Main Organization",
        "settings": { ... }
      }
    ]
  }
}
```

### 🎯 **Context Coordination**

#### **UserContext Responsibilities**:
- User profile and preferences
- User roles and permissions
- Session management
- References to account/organization IDs

#### **AccountContext Responsibilities**:
- Account information and subscription
- Organization data and switching
- Account-level permissions and features
- Current organization state

#### **Data Consistency Rules**:
1. User.accountId MUST match Account.id
2. User.organizationIds MUST be subset of Account.organizations[].id
3. User.currentOrganizationId MUST be in User.organizationIds
4. Contexts should coordinate to ensure consistency

### 🔧 **Implementation Strategy**

1. **Keep User API clean**: Only user-specific data, references for external entities
2. **Account API provides full organization tree**: Since organizations belong to accounts
3. **UserContext queries AccountContext**: For resolved account/organization data
4. **Eliminate data duplication**: Single source of truth for each entity

### 💡 **Benefits of This Architecture**

1. **Data Consistency**: No conflicts between different data sources
2. **Maintainability**: Changes to entities happen in one place
3. **Performance**: Avoid duplicate API calls and data storage
4. **Scalability**: Easy to add new entity types and relationships
5. **Testability**: Clear boundaries between different data concerns

### 📝 **Next Steps**

1. ✅ Clean up User API to remove duplicated account/org data
2. ✅ Document the proper data flow
3. 🔄 Update UserContext to reference AccountContext for resolved data
4. 🔄 Add validation to ensure ID references are valid
5. 🔄 Create integration tests for cross-context data consistency

This normalized approach follows enterprise SaaS best practices and ensures scalable, maintainable data architecture.