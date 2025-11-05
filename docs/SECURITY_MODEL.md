# Security and Access Control Model

## Overview

This application uses JWT-based authentication with a hierarchical access control model. Rails is the authorization authority, and Next.js validates and enforces the scopes defined in the JWT.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Rails (Authorization Authority)                         │
│ - Authenticates users                                   │
│ - Verifies account/org access permissions              │
│ - Issues signed JWT with scope claims                  │
└─────────────────────────────────────────────────────────┘
                         ↓ JWT Cookie
┌─────────────────────────────────────────────────────────┐
│ Next.js (Scope Enforcer)                                │
│ - Validates JWT signature & expiration                  │
│ - Trusts JWT claims (Rails already verified)           │
│ - Enforces scope in ALL database queries               │
└─────────────────────────────────────────────────────────┘
```

## JWT Structure

The JWT issued by Rails contains the following claims:

```json
{
  "user_id": 456,
  "email": "user@example.com",
  "user_name": "John Doe",
  "account_id": 123,
  "organization_id": 789,  // null for account-level access
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Access Control Rules

### Account-Level Access

**Entry Point:** `/accounts/:account_id/rules/workflows`

**JWT Claims:**
```json
{
  "account_id": 123,
  "organization_id": null
}
```

**Access Rights:**
- ✅ Can view/edit account-level workflows (`organization_id = null`)
- ✅ Can view/edit ALL organization workflows within the account
- ✅ Full administrative access to workflows in the entire account

**Database Query Pattern:**
```typescript
// Account-level sees everything in the account
{
  account_id: jwt.account_id
  // No organization_id filter
}
```

### Organization-Level Access

**Entry Point:** `/accounts/:account_id/organizations/:org_id/rules/workflows`

**JWT Claims:**
```json
{
  "account_id": 123,
  "organization_id": 456
}
```

**Access Rights:**
- ✅ Can view/edit ONLY workflows for organization 456
- ❌ Cannot access account-level workflows
- ❌ Cannot access other organizations' workflows

**Database Query Pattern:**
```typescript
// Org-level only sees their specific org
{
  account_id: jwt.account_id,
  organization_id: jwt.organization_id
}
```

## Data Model

### Workflow Document Structure

```typescript
interface Workflow {
  _id: string
  name: string
  account_id: string              // Required - always present
  organization_id: string | null  // null = account-level workflow
  triggered_by: string
  type: string
  created_on: Date
  level: 'Account' | 'Organization'
  published: boolean
  // ... other fields
}
```

## Implementation Guidelines

### 1. Always Validate JWT

Every API route must validate the JWT before processing:

```typescript
import { validateJWTAndGetScope } from '@/app/utils/auth'

export async function GET(request: Request) {
  const scope = validateJWTAndGetScope(request)
  // scope now contains { account_id, organization_id, user_id }
  
  // Use scope in queries...
}
```

### 2. Always Scope Database Queries

**NEVER trust URL parameters or request body for account/org identifiers.**

```typescript
// ❌ WRONG - URL parameter can be manipulated
const workflow = await db.workflows.findOne({ 
  _id: params.id 
})

// ✅ CORRECT - Always include scope from JWT
const workflow = await db.workflows.findOne({ 
  _id: params.id,
  ...buildScopeQuery(scope)
})
```

### 3. Build Scope Query Helper

```typescript
export function buildScopeQuery(scope: Scope) {
  if (scope.organization_id) {
    // Organization-level: strict isolation
    return {
      account_id: scope.account_id,
      organization_id: scope.organization_id
    }
  } else {
    // Account-level: hierarchical access
    return {
      account_id: scope.account_id
      // No organization_id filter = sees all
    }
  }
}
```

### 4. Create Operation Scoping

When creating workflows, set the scope from JWT (not request):

```typescript
export async function POST(request: Request) {
  const scope = validateJWTAndGetScope(request)
  const body = await request.json()
  
  const workflow = await db.workflows.create({
    ...body,
    account_id: scope.account_id,           // From JWT
    organization_id: scope.organization_id, // From JWT
    level: scope.organization_id ? 'Organization' : 'Account'
  })
  
  return Response.json(workflow)
}
```

## Security Guarantees

With this model, the following security properties are guaranteed:

1. **Cannot forge JWTs** - Cryptographic signature validation
2. **Cannot access other accounts** - All queries scoped to JWT account_id
3. **Cannot access unauthorized orgs** - Org-level users can only access their org
4. **Cannot elevate privileges** - Cannot change account/org in request body
5. **Cannot use expired tokens** - JWT expiration enforced (24 hours)
6. **Cannot bypass Rails** - No valid JWT = no access to Next.js

## JWT Cookie Configuration

The JWT is stored in an HTTP-only cookie with the following properties:

```ruby
cookies[:workflows_token] = {
  value: token,
  httponly: true,                # JavaScript cannot access (XSS protection)
  secure: Rails.env.production?, # HTTPS only in production
  same_site: :lax,               # CSRF protection
  path: "/",                     # Available to all paths
  expires: 24.hours.from_now
}
```

## Attack Vectors & Mitigations

### Scenario 1: Direct URL Bookmark

**Attack:** User bookmarks `/app/aimeworkflows/configure/123` and visits later.

**Mitigation:** 
- JWT validation in middleware redirects to Rails if missing/expired
- Even with valid JWT, can only access workflows in their scope

### Scenario 2: Parameter Tampering

**Attack:** User modifies workflow ID in URL to access another account's workflow.

**Mitigation:** 
- Database query includes JWT scope
- Will return 404 if workflow not in user's account/org

### Scenario 3: Request Body Manipulation

**Attack:** User sends `account_id: 999` in POST body to create workflow in another account.

**Mitigation:** 
- Never trust request body for account/org
- Always use JWT claims for scoping

### Scenario 4: JWT Replay Attack

**Attack:** User copies JWT cookie from one browser to another.

**Mitigation:** 
- JWT contains user_id - attacker would need both cookie AND session
- JWT expires in 24 hours
- Rails session still required for main application

## Future Considerations

### Rate Limiting

Consider adding rate limiting per account/user to prevent abuse:

```typescript
// Check rate limit before processing
await checkRateLimit(scope.account_id, scope.user_id)
```

### Audit Logging

Log all workflow modifications with user context:

```typescript
await auditLog.create({
  user_id: scope.user_id,
  account_id: scope.account_id,
  action: 'workflow.update',
  workflow_id: workflow._id
})
```

### Multi-tenancy Indexes

Ensure database indexes include account_id for performance:

```typescript
// MongoDB indexes
db.workflows.createIndex({ account_id: 1, organization_id: 1 })
db.workflows.createIndex({ account_id: 1, _id: 1 })
```

