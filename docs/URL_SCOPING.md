# URL-Based Account & Organization Scoping

This document explains the URL scoping pattern for multi-tenant access control.

## Overview

Next.js routes can be scoped to accounts and organizations via URL patterns:

```
/aime/aimeworkflows/accounts/:accountId/...                    # Account-scoped
/aime/aimeworkflows/accounts/:accountId/orgs/:orgId/...       # Organization-scoped
/aime/aimeworkflows/...                                        # Global (allowed in standalone mode only)
```

**Important:** URL scoping is **required in embedded/production mode** but **optional in standalone mode** for easier development.

## How It Works

### 1. URL Rewriting (Next.js)

Next.js rewrites scoped URLs to internal routes:

```typescript
// next.config.ts
{
  source: '/accounts/:accountId/orgs/:orgId/:rest*',
  destination: '/:rest*',
}
```

**Example:**
- Browser sees: `/accounts/123/orgs/456/workflows/configure/new`
- Next.js serves: `/workflows/configure/new`
- Middleware sees: Original URL with account/org IDs

### 2. Authorization Validation (Middleware)

Middleware validates URL parameters against JWT claims **in embedded/production mode**:

```
EMBEDDED MODE:
URL:  /accounts/123/orgs/456/...
JWT:  { account_id: "123", organization_id: "456" }
✅ MATCH → Allow

URL:  /accounts/999/...
JWT:  { account_id: "123" }
❌ MISMATCH → 403 Forbidden

STANDALONE MODE:
URL:  /...                          (no scoping)
✅ ALLOWED → Validation skipped

URL:  /accounts/123/...            (optional scoping)
✅ ALLOWED → Validation skipped
```

### 3. Header Injection

Valid requests get scoping headers:

```
x-account-id: "123"
x-organization-id: "456"
x-url-account-id: "123"
x-url-org-id: "456"
```

## Security Benefits

✅ **Defense in Depth** - JWT validation + URL validation (embedded/prod)  
✅ **URL Manipulation Protection** - Can't access other accounts by changing URL  
✅ **Authorization Guard** - Automatic check on every request  
✅ **Audit Trail** - Clear logs of what user accessed what scope  
✅ **Dev-Friendly** - Optional in standalone mode for easier development  

## Rails Integration

### SSO Controller Method

Update your Rails `sso` method to generate scoped URLs:

```ruby
def sso
  # Security checks...
  set_jwt_cookie

  # Determine scope and build URL
  if @organization
    # Organization-scoped URL
    destination = "/aime/aimeworkflows/accounts/#{@account.id}/orgs/#{@organization.id}/"
    destination += params[:destination].presence || ""
  else
    # Account-scoped URL
    destination = "/aime/aimeworkflows/accounts/#{@account.id}/"
    destination += params[:destination].presence || ""
  end

  # Clean up any double slashes
  destination = destination.gsub(/\/+/, '/')

  # Log and redirect
  Rails.logger.info "SSO handoff: user=#{current_user.id} scope=#{destination}"
  redirect_to destination, allow_other_host: false
end
```

### Rails View Helpers

```ruby
# app/helpers/workflows_helper.rb
module WorkflowsHelper
  def workflows_path_for(account, organization = nil, path = '')
    base = "/aime/aimeworkflows/accounts/#{account.id}"
    base += "/orgs/#{organization.id}" if organization
    base += "/#{path}" if path.present?
    base.gsub(/\/+/, '/') # Clean double slashes
  end

  def workflow_link(text, account, organization = nil, path = '', **options)
    url = sso_workflows_path(account, organization, destination: path)
    link_to text, url, **options
  end
end
```

### Rails View Examples

```erb
<!-- Organization-scoped workflow builder -->
<%= link_to "Open Workflow Builder", 
    sso_account_organization_rules_workflows_path(
      @account, 
      @organization,
      destination: "workflows/configure/new"
    ),
    class: "btn btn-primary" %>

<!-- Account-scoped workflows list -->
<%= link_to "View Workflows",
    sso_account_rules_workflows_path(
      @account,
      destination: "workflows"
    ),
    class: "btn btn-secondary" %>

<!-- Using helper -->
<%= workflow_link "Edit Workflow", 
    @account, 
    @organization, 
    "workflows/configure/#{workflow.id}",
    class: "btn btn-sm" %>
```

## URL Patterns

### Account-Scoped

```
/aime/aimeworkflows/accounts/123/workflows
/aime/aimeworkflows/accounts/123/workflows/configure/new
/aime/aimeworkflows/accounts/123/workflows/configure/456
```

**JWT Requirements:**
- `account_id` must match URL account ID
- `organization_id` can be present or null

### Organization-Scoped

```
/aime/aimeworkflows/accounts/123/orgs/456/workflows
/aime/aimeworkflows/accounts/123/orgs/456/workflows/configure/new
/aime/aimeworkflows/accounts/123/orgs/456/workflows/configure/789
```

**JWT Requirements:**
- `account_id` must match URL account ID
- `organization_id` must match URL org ID (required)

## Middleware Validation Logic

```typescript
// 1. Parse URL
const urlAccountId = "123"    // from /accounts/123/... (or null)
const urlOrgId = "456"         // from /orgs/456/... (or null)

// 2. Extract from JWT
const jwtAccountId = currentUser.accountId      // "123"
const jwtOrgId = currentUser.organizationId     // "456"

// 3. Validate (ONLY in embedded/production mode)
if (!env.isMockMode) {
  // URL scoping required in embedded/production
  if (urlAccountId && urlAccountId !== jwtAccountId) {
    return 403 // Forbidden: Account access denied
  }

  if (urlOrgId) {
    if (!jwtOrgId) {
      return 403 // Forbidden: User has no org access
    }
    if (urlOrgId !== jwtOrgId) {
      return 403 // Forbidden: Org ID mismatch
    }
  }
} else {
  // Standalone mode: URL scoping is optional
  // No validation, just log for debugging
  console.log('Standalone mode: validation skipped')
}

// 4. Allow request through
```

## Testing

### Test Standalone Mode (URL scoping optional)

```bash
# Start in standalone mode
npm run dev

# Access without scoping (works!)
curl http://localhost:3000/aime/aimeworkflows/
# → 200 OK (JWT verification skipped, uses mocked API)

# Access with scoping (also works, validation skipped)
curl http://localhost:3000/aime/aimeworkflows/accounts/123/workflows
# → 200 OK (validation skipped in standalone)
```

### Test Embedded Mode (URL scoping required)

```bash
# Start in embedded mode
npm run dev:embedded

# 1. Get valid JWT cookie from Rails
curl -c cookies.txt http://groupize.local/login

# 2. Access matching account (should work)
curl -b cookies.txt http://groupize.local/aime/aimeworkflows/accounts/123/workflows
# → 200 OK

# 3. Access different account (should fail)
curl -b cookies.txt http://groupize.local/aime/aimeworkflows/accounts/999/workflows
# → 403 Forbidden: Account access denied
```

### Test Org Scoping (Embedded mode only)

```bash
# Account token: { account_id: "123", organization_id: null }
curl -b cookies.txt http://groupize.local/aime/aimeworkflows/accounts/123/orgs/456/workflows
# → 403 Forbidden: Organization access denied

# Org token: { account_id: "123", organization_id: "456" }
curl -b cookies.txt http://groupize.local/aime/aimeworkflows/accounts/123/orgs/456/workflows
# → 200 OK
```

## Server-Side Access

Your pages and API routes can access validated IDs via headers:

```typescript
// app/workflows/page.tsx (Server Component)
import { headers } from 'next/headers';

export default async function WorkflowsPage() {
  const headersList = await headers();
  
  // These are guaranteed to be validated by middleware
  const accountId = headersList.get('x-account-id');
  const orgId = headersList.get('x-organization-id');
  
  // Fetch data scoped to this account/org
  const workflows = await fetchWorkflows(accountId, orgId);
  
  return <div>...</div>;
}
```

```typescript
// app/api/workflows/route.ts (API Route)
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const headersList = await headers();
  
  const accountId = headersList.get('x-url-account-id');
  const orgId = headersList.get('x-url-org-id');
  
  // Query database scoped to account/org
  const workflows = await db.workflows.findMany({
    where: {
      accountId,
      ...(orgId && { organizationId: orgId }),
    },
  });
  
  return NextResponse.json({ workflows });
}
```

## Error Responses

### 403 Forbidden: Account Access Denied

```json
{
  "error": "Forbidden: Account access denied"
}
```

**Cause:** URL account ID doesn't match JWT account ID

**Solution:** User must have JWT for the account they're trying to access

### 403 Forbidden: Organization Access Denied

```json
{
  "error": "Forbidden: Organization access denied"
}
```

**Causes:**
1. URL has org ID but JWT has no org
2. URL org ID doesn't match JWT org ID

**Solution:** User must have org-scoped JWT matching the URL

## Migration from Non-Scoped URLs

### Option 1: Redirect to Scoped URLs

```typescript
// middleware.ts - Add before auth check
if (!pathname.includes('/accounts/')) {
  // Redirect to scoped URL
  const newUrl = `/accounts/${currentUser.accountId}${pathname}`;
  if (currentUser.organizationId) {
    newUrl = `/accounts/${currentUser.accountId}/orgs/${currentUser.organizationId}${pathname}`;
  }
  return NextResponse.redirect(new URL(newUrl, request.url));
}
```

### Option 2: Support Both

Non-scoped URLs still work but use JWT claims for context. Scoped URLs add extra validation layer.

## Best Practices

### ✅ DO

- Always use scoped URLs in production
- Generate URLs from Rails based on user's scope
- Log scope in middleware for audit
- Validate both account and org IDs
- Use helpers to generate consistent URLs

### ❌ DON'T

- Don't trust URL params without validation
- Don't allow users to access other accounts via URL
- Don't skip middleware for scoped routes
- Don't hard-code account/org IDs in URLs
- Don't expose internal route structure

## Troubleshooting

### Issue: 403 Forbidden on valid access

**Check:**
1. JWT has correct account_id
2. URL account ID matches JWT
3. If org-scoped, JWT has organization_id
4. Account/org IDs are strings (not numbers)

### Issue: Rewrites not working

**Check:**
1. URL includes `/accounts/` segment
2. Trailing slashes match config
3. basePath is correct
4. Next.js dev server restarted after config change

### Issue: Middleware sees wrong URL

**Check:**
1. Rewrites use `destination` not `redirect`
2. Middleware runs before rewrites
3. Original URL is preserved in `request.nextUrl.pathname`

## Mode-Based Behavior

| Mode | URL Scoping | Validation | Use Case |
|------|-------------|------------|----------|
| **Standalone** | Optional | ❌ Skipped | Frontend development without Rails |
| **Embedded** | Required | ✅ Enforced | Development with Rails SSO |
| **Production** | Required | ✅ Enforced | Production deployment |

## Summary

This pattern provides:
- **Security**: Defense in depth with JWT + URL validation (embedded/prod)
- **UX**: Clean, shareable, RESTful URLs
- **Developer Experience**: Simple internal structure, optional scoping in dev
- **Flexibility**: Works with account or org scoping
- **Audit**: Clear logs of access patterns
- **Dev-Friendly**: Standalone mode doesn't require scoped URLs

Perfect for multi-tenant SaaS applications! 🎯

