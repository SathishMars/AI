# Authentication and Security

This document describes the complete authentication system, including user authentication, service-to-service authentication, and security best practices for the Groupize Workflows application.

## Architecture Overview

The application uses a **single-issuer JWT architecture** where Rails is the sole authority for authentication. Next.js validates and trusts JWTs issued by Rails.

```
┌─────────────────────────────────────────────────────────┐
│ Rails (Authorization Authority)                         │
│ - Authenticates users                                   │
│ - Verifies account/org access permissions              │
│ - Issues signed JWT with scope claims                  │
│ - Signs with AWS KMS (PS256) in production            │
└─────────────────────────────────────────────────────────┘
                         ↓ JWT Tokens
┌─────────────────────────────────────────────────────────┐
│ Next.js (Scope Enforcer)                                │
│ - Validates JWT signature & expiration                  │
│ - Trusts JWT claims (Rails already verified)           │
│ - Enforces scope in ALL database queries               │
│ - Validates URL scope matches JWT claims               │
└─────────────────────────────────────────────────────────┘
```

## Authentication Types

### 1. User Authentication (Browser → Next.js)

**Purpose**: Authenticate end users accessing the Workflows application

**Token Type**: User JWT  
**Audience**: `workflows`  
**Transport**: HttpOnly cookie (`gpw_session`)

#### JWT Claims

```json
{
  "iss": "groupize",
  "aud": "workflows",
  "sub": "user_id",
  "exp": 1234567890,
  "nbf": 1234567890,
  "iat": 1234567890,
  "context": {
    "user_id": "456",
    "account_id": "123",
    "organization_id": "789",
    "email": "user@example.com",
    "user_first_name": "John",
    "user_last_name": "Doe",
    "user_name": "John Doe"
  }
}
```

#### Authentication Flow

```
1. User logs into Rails
   │
   ├─► Rails validates credentials
   └─► Rails generates user JWT (aud="workflows")
       └─► Rails sets HttpOnly cookie: gpw_session
       
2. User navigates to /aime
   │
   ├─► Browser sends gpw_session cookie
   │
   ├─► Next.js middleware extracts cookie
   │
   ├─► Next.js verifies token via Rails JWKS
   │   └─► Validates: iss, aud="workflows", exp, signature
   │
   ├─► Next.js validates URL scope
   │   └─► Account/org in URL must match token claims
   │
   └─► Request proceeds with user context in headers
       └─► x-user-id, x-account-id, x-organization-id, etc.
```

#### Cookie Configuration

- **Name**: `gpw_session`
- **HttpOnly**: `true` (JavaScript cannot access - XSS protection)
- **Secure**: `true` (HTTPS only in production)
- **SameSite**: `Lax` (CSRF protection on shared domain)
- **Path**: `/` (available to all routes)
- **Max-Age**: `1800` (30 minutes)

#### Token Renewal

The application implements **proactive token renewal** to prevent expired tokens:

- Client-side hook (`useJwtRenewal`) renews tokens **5 minutes before expiry**
- Calls Rails `/auth/renew` endpoint
- Middleware only verifies - no renewal logic there
- Ensures tokens rarely expire during active sessions

```typescript
// Renewal happens automatically in embedded mode
useJwtRenewal({
  expiresAt: currentUser.expiresAt,
  onRenewalSuccess: (newExpiresAt) => {
    // Update user context with new expiry
  },
  onRenewalFailure: (error) => {
    // Handle renewal failure (redirect to login)
  }
});
```

### 2. Service-to-Service Authentication (Rails → Next.js)

**Purpose**: Authenticate Rails when calling Next.js `/api/internal/**` endpoints

**Token Type**: Service JWT  
**Audience**: `workflows-api`  
**Subject**: `service:rails`  
**Transport**: `Authorization: Bearer <token>` header

#### JWT Claims

```json
{
  "iss": "groupize",
  "aud": "workflows-api",
  "sub": "service:rails",
  "exp": 1234567890,
  "iat": 1234567890,
  "nbf": 1234567890,
  "jti": "unique_id",
  "context": {
    "service_name": "rails",
    "service_version": "1.0",
    "user_id": "456",
    "account_id": "123",
    "organization_id": "789",
    "request_id": "uuid",
    "environment": "production"
  }
}
```

#### Authentication Flow

```
1. Rails needs to call Next.js internal API
   │
   ├─► Rails generates service JWT (aud="workflows-api")
   │   └─► Includes user context (on_behalf_of_user)
   │
   ├─► Rails makes HTTP request to /api/internal/**
   │   └─► Authorization: Bearer <service_token>
   │
   ├─► Next.js /api/internal middleware intercepts
   │
   ├─► Next.js verifies token via Rails JWKS
   │   └─► Validates: iss, aud="workflows-api", sub="service:rails", exp, signature
   │
   └─► Request proceeds with service context
       └─► userId, accountId, organizationId, serviceName, requestId, etc.
```

#### Service Token Lifetime

- **Lifetime**: 5 minutes
- **Caching**: Rails caches service tokens for 2 minutes
- **Rotation**: Automatic via JWKS key rotation

## JWKS and Key Management

### JWKS Endpoint

Rails exposes public keys at `/.well-known/jwks.json`:

- **URL**: `${NEXT_PUBLIC_RAILS_BASE_URL}/.well-known/jwks.json`
- **Cache-Control**: `public, max-age=300, stale-while-revalidate=60`
- **ETag**: For efficient revalidation
- **Format**: Standard JWKS (RFC 7517)

### Key Rotation Strategy

1. **Rails** generates new key in AWS KMS
2. **JWKS endpoint** serves both old and new keys
3. **Next.js** automatically fetches new keys on unknown `kid` (key ID)
4. **Old keys** remain valid for grace period
5. **After grace period**, old keys removed from JWKS

### Production Key Signing

- **Algorithm**: PS256 (RSA-PSS with SHA-256)
- **Key Management**: AWS KMS
- **Key ID**: `ENV['JWT_GSSO_GROUPIZE_KEY_ID']` in Rails
- **Development**: HS256 with shared secret (for local dev)

## URL-Based Scoping

### Account-Level Access

**URL Pattern**: `/accounts/:accountId/...`

**JWT Requirements**:
- `account_id` must match URL account ID
- `organization_id` can be present or null

**Access Rights**:
- ✅ Can view/edit account-level workflows (`organization_id = null`)
- ✅ Can view/edit ALL organization workflows within the account
- ✅ Full administrative access to workflows in the entire account

### Organization-Level Access

**URL Pattern**: `/accounts/:accountId/orgs/:orgId/...`

**JWT Requirements**:
- `account_id` must match URL account ID
- `organization_id` must match URL org ID (required)

**Access Rights**:
- ✅ Can view/edit ONLY workflows for the specific organization
- ❌ Cannot access account-level workflows
- ❌ Cannot access other organizations' workflows

### Middleware Validation

```typescript
// Middleware validates URL scope matches JWT claims (embedded mode only)
if (urlAccountId && urlAccountId !== jwtAccountId) {
  return 403; // Forbidden: Account access denied
}

if (urlOrgId) {
  if (!jwtOrgId) {
    return 403; // Forbidden: User has no org access
  }
  if (urlOrgId !== jwtOrgId) {
    return 403; // Forbidden: Org ID mismatch
  }
}
```

## Security Best Practices

### ✅ Implemented Security Measures

1. **Defense in Depth**
   - JWT verification in middleware
   - Server-side user context pattern
   - HttpOnly cookies
   - Short token lifetime (30 min for user, 5 min for service)
   - URL scope validation

2. **No Client-Side Token Access**
   - JWT never exposed to JavaScript
   - User context passed via props/headers, not cookies
   - No hydration mismatches

3. **Proper Claims Validation**
   - Expiration (exp) with 60s tolerance
   - Audience (aud) validation
   - Issuer (iss) validation
   - Not-before (nbf) validation
   - Subject (sub) validation for service tokens

4. **JWKS Caching & Rotation**
   - Automatic key caching (5 minutes)
   - Graceful key rotation
   - Unknown `kid` triggers automatic refetch

5. **Typed Error Handling**
   - Standardized error codes
   - HTTP error types
   - Consistent error responses

6. **CSRF Protection**
   - SameSite=Lax cookies prevent CSRF attacks
   - Allows navigation from Rails to Next.js
   - Blocks cross-site POST requests

7. **XSS Protection**
   - HttpOnly cookies prevent XSS token theft
   - No client-side JWT decoding
   - Server-side only token access

8. **HTTPS Enforcement**
   - Secure flag ensures HTTPS in production
   - Prevents man-in-the-middle attacks
   - Protects token transmission

### 🔒 Additional Security Considerations

1. **Token Refresh**
   - Tokens expire after 30 minutes (user) or 5 minutes (service)
   - Proactive renewal prevents expired token errors
   - Automatic redirect to Rails login on failure

2. **Audit Logging**
   - Log authentication events (implement in Rails)
   - Track token renewals
   - Monitor authentication failures

3. **Rate Limiting**
   - Consider per-user rate limits
   - Prevent token renewal abuse
   - Limit JWKS endpoint calls

4. **Multi-Tenancy Isolation**
   - All database queries scoped to account/org
   - URL validation prevents cross-tenant access
   - Service tokens include user context for audit

## Error Handling

### Authentication Errors

All authentication errors are typed:

```typescript
enum AuthErrorCode {
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_NOT_YET_VALID = 'TOKEN_NOT_YET_VALID',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  JWKS_FETCH_FAILED = 'JWKS_FETCH_FAILED',
  CLAIMS_INVALID = 'CLAIMS_INVALID',
  AUDIENCE_MISMATCH = 'AUDIENCE_MISMATCH',
  ISSUER_MISMATCH = 'ISSUER_MISMATCH',
  SUBJECT_MISMATCH = 'SUBJECT_MISMATCH',  // Service tokens only
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
}
```

### HTTP Error Responses

```typescript
// User authentication failure (embedded mode)
if (!token || !verification.success) {
  return NextResponse.redirect(new URL('/', env.railsBaseUrl));
}

// Service authentication failure
if (!serviceToken || !verification.success) {
  return NextResponse.json(
    { error: 'Unauthorized', code: 'TOKEN_INVALID' },
    { status: 401 }
  );
}

// Scope validation failure
if (urlAccountId !== jwtAccountId) {
  return NextResponse.json(
    { error: 'Forbidden: Account access denied' },
    { status: 403 }
  );
}
```

## Standalone Mode Behavior

In **standalone mode** (`AUTH_MODE=standalone`), authentication is **completely skipped**:

- ❌ No JWT verification
- ❌ No JWKS calls
- ❌ No token generation
- ❌ No URL scope validation
- ✅ Uses mocked API responses for user data
- ✅ Perfect for frontend-only development

**Security Note**: Standalone mode has **no security** and should **never** be used in production.

## Testing Authentication

### Test User JWT Verification

```typescript
import { verifyUserToken } from '@/app/lib/jwt-verifier';

const result = await verifyUserToken(token);
if (result.success) {
  console.log('Valid token:', result.claims);
} else {
  console.error('Invalid token:', result.error);
}
```

### Test Service Token Verification

```typescript
import { verifyServiceToken } from '@/app/lib/jwt-verifier';

const result = await verifyServiceToken(token);
if (result.success) {
  console.log('Valid service token:', result.claims);
} else {
  console.error('Invalid service token:', result.error);
}
```

### Test JWKS Endpoint

```bash
# Check JWKS endpoint is accessible
curl ${NEXT_PUBLIC_RAILS_BASE_URL}/.well-known/jwks.json

# Should return JSON with keys array
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "...",
      "use": "sig",
      "alg": "PS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

## Production Deployment Checklist

- [ ] Rails JWKS endpoint accessible
- [ ] AWS KMS key configured in Rails (`JWT_GSSO_GROUPIZE_KEY_ID`)
- [ ] Cookie domain matches (e.g., `groupize.com`)
- [ ] HTTPS enforced (Secure cookies)
- [ ] `basePath` matches nginx config
- [ ] Token expiration appropriate (30 min user, 5 min service)
- [ ] Monitoring/alerting configured for auth failures
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Key rotation process documented

## Troubleshooting

### Token Verification Fails

1. **Check JWKS endpoint**: `curl ${NEXT_PUBLIC_RAILS_BASE_URL}/.well-known/jwks.json`
2. **Check token claims**: Decode at jwt.io
3. **Check environment**: Is `NEXT_PUBLIC_RAILS_BASE_URL` correct?
4. **Check Rails logs**: Look for JWT signing errors
5. **Check KMS key**: Is `JWT_GSSO_GROUPIZE_KEY_ID` set in Rails?

### Redirects to Rails Login

1. **Check cookie**: Is `gpw_session` set?
2. **Check token expiration**: Tokens expire after 30 minutes
3. **Check Rails session**: Are you logged into Rails?
4. **Check renewal**: Is token renewal working?

### Service Token Failures

1. **Check audience**: Must be `workflows-api`
2. **Check subject**: Must be `service:rails`
3. **Check expiration**: Service tokens expire after 5 minutes
4. **Check JWKS**: Same JWKS endpoint as user tokens

## Summary

- **User Auth**: HttpOnly cookie, 30-minute lifetime, proactive renewal
- **Service Auth**: Bearer token, 5-minute lifetime, user delegation
- **Key Management**: AWS KMS (PS256) in production, JWKS for verification
- **Security**: Defense in depth with multiple validation layers
- **Standalone Mode**: No security (dev only)

For questions or issues, contact the platform team.

