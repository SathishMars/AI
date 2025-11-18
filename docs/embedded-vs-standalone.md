# Embedded Mode vs Standalone Mode

This document explains the differences between embedded mode and standalone mode, when to use each, and how they work.

## Overview

The Workflows application supports two distinct modes of operation:

- **Embedded Mode**: Full integration with Rails backend, JWT authentication, and production-ready security
- **Standalone Mode**: Frontend-only development mode with mocked authentication and no backend dependencies

## Embedded Mode

### What It Is

Embedded mode is the **default and production mode**. It provides full integration with the Rails backend application, including:

- JWT-based authentication via Rails SSO
- Real user context from Rails sessions
- JWKS token verification with AWS KMS (PS256) in production
- URL-based account/organization scoping
- Service-to-service authentication support

### When to Use

- ✅ **Production deployments** - Always use embedded mode
- ✅ **Full-stack development** - When working with Rails integration
- ✅ **Testing SSO flows** - When verifying authentication integration
- ✅ **Testing service-to-service calls** - When testing Rails → Next.js API calls

### How It Works

```
┌──────────┐           ┌──────────┐           ┌──────────────┐
│          │           │          │           │              │
│  User    │──Login───▶│  Rails   │──Cookie──▶│   Next.js    │
│          │           │          │           │  Workflows   │
└──────────┘           └──────────┘           └──────────────┘
                            │                        │
                            │                        │
                       Issues JWT              Verifies JWT
                     (gpw_session)            via JWKS
                            │                        │
                            ▼                        ▼
                      ┌──────────┐           ┌──────────┐
                      │   KMS    │           │  JWKS    │
                      │ (Prod)   │           │ Endpoint │
                      └──────────┘           └──────────┘
```

### Key Features

1. **JWT Verification**
   - Extracts token from `gpw_session` HttpOnly cookie
   - Verifies signature using JWKS endpoint from Rails
   - Validates claims (exp, aud, iss, nbf)
   - Validates URL scope matches JWT claims

2. **Authentication Flow**
   - User logs into Rails at `groupize.local` (or production domain)
   - Rails generates JWT with user/account/org claims
   - Rails sets `gpw_session` cookie (HttpOnly, Secure, SameSite=Lax)
   - User navigates to `/aime/aimeworkflows/*`
   - Nginx proxies request to Next.js with cookies forwarded
   - Next.js middleware verifies JWT and injects user headers
   - On failure: Redirects to Rails login

3. **URL Scoping**
   - **Required** in embedded mode
   - URLs must include account/org IDs: `/accounts/:accountId/orgs/:orgId/...`
   - Middleware validates URL IDs match JWT claims
   - Returns 403 Forbidden if mismatch

4. **Token Renewal**
   - Client-side hook (`useJwtRenewal`) proactively renews tokens 5 minutes before expiry
   - Calls Rails `/auth/renew` endpoint
   - Ensures tokens rarely expire during active sessions

5. **Service-to-Service Auth**
   - Rails can call Next.js `/api/internal/**` endpoints
   - Uses service tokens with `aud="workflows-api"` and `sub="service:rails"`
   - Verified via JWKS with service context

### Configuration

```bash
# .env.local or production environment
AUTH_MODE=embedded                    # or omit (default)
RAILS_BASE_URL=https://app.groupize.com
NEXT_PUBLIC_RAILS_BASE_URL=https://app.groupize.com
JWKS_URL=https://app.groupize.com/.well-known/jwks.json
JWT_ISSUER=groupize
JWT_AUDIENCE=workflows
COOKIE_NAME=gpw_session
NEXT_PUBLIC_BASE_PATH=/aime/aimeworkflows
NODE_ENV=production
```

### Running in Embedded Mode

```bash
# Development with Rails
npm run dev:embedded

# Production
npm start
```

**Port**: Runs on PORT=3001 in development (Rails on 3000)

## Standalone Mode

### What It Is

Standalone mode is a **development-only mode** that allows frontend development without requiring Rails or authentication infrastructure:

- **Skips JWT verification entirely**
- Uses mocked API responses for user data
- No Rails connection needed
- No JWKS calls or token generation
- URL scoping is optional (validation skipped)

### When to Use

- ✅ **Frontend-only development** - UI/component work without backend
- ✅ **Rapid prototyping** - Quick iteration without Rails setup
- ✅ **Design system work** - Testing components in isolation
- ✅ **Offline development** - When Rails isn't available

### How It Works

```
┌──────────┐           ┌──────────────┐
│          │           │              │
│  User    │──────────▶│   Next.js    │
│          │           │  Workflows   │
└──────────┘           └──────────────┘
                              │
                              │
                         Uses Mocked API
                         (/api/user-session)
                              │
                              ▼
                      ┌──────────┐
                      │  Mocked  │
                      │   User   │
                      │   Data   │
                      └──────────┘
```

### Key Features

1. **No JWT Verification**
   - Middleware skips token extraction and verification
   - No JWKS calls
   - No token validation errors

2. **Mocked User API**
   - Fetches user data from `/api/user-session` endpoint
   - Returns mocked user context
   - Supports account/org via query params, headers, or cookies

3. **Flexible Scoping**
   - URL scoping is **optional**
   - Can access routes without `/accounts/:id/` prefix
   - No validation of account/org IDs
   - Perfect for UI development

4. **Development-Friendly**
   - No authentication redirects
   - No expired token errors
   - Instant access to all features
   - Works offline

### Configuration

```bash
# .env.local
AUTH_MODE=standalone
NEXT_PUBLIC_BASE_PATH=/aime/aimeworkflows
NODE_ENV=development
```

**Note**: Rails-related variables are not needed in standalone mode.

### Running in Standalone Mode

```bash
# Default development mode
npm run dev
```

**Port**: Runs on PORT=3000

### Mocked User Data

The mocked API provides default user data:

```typescript
{
  userId: 'john.doe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  accountId: 'groupize-demos',  // or from query/header/cookie
  organizationId: null           // or from query/header/cookie
}
```

You can override account/org via:
- Query params: `?account=123&organization=456`
- Headers: `x-account: 123`, `x-organization: 456`
- Cookies: `account`, `organization`

## Comparison Table

| Feature | Embedded Mode | Standalone Mode |
|---------|--------------|-----------------|
| **JWT Verification** | ✅ Yes (via JWKS) | ❌ No (skipped) |
| **Rails Required** | ✅ Yes | ❌ No |
| **JWKS Calls** | ✅ Yes | ❌ No |
| **URL Scoping** | ✅ Required & Validated | ⚠️ Optional (validation skipped) |
| **Token Renewal** | ✅ Yes (proactive) | ❌ No |
| **Service Auth** | ✅ Yes | ❌ No |
| **User Context** | From JWT claims | From mocked API |
| **Production Ready** | ✅ Yes | ❌ No (dev only) |
| **Security** | ✅ Full (KMS, JWKS) | ⚠️ None (dev only) |
| **Use Case** | Production, Full-stack dev | Frontend-only dev |

## Mode Detection

The application automatically detects the mode based on `AUTH_MODE` environment variable:

```typescript
// src/app/lib/env.ts
function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE?.toLowerCase();
  
  if (mode === 'standalone') {
    return 'standalone';
  }
  
  return 'embedded';  // Default
}
```

## Switching Between Modes

### From Standalone to Embedded

1. Ensure Rails is running
2. Update `.env.local`:
   ```bash
   AUTH_MODE=embedded
   RAILS_BASE_URL=http://groupize.local
   NEXT_PUBLIC_RAILS_BASE_URL=http://groupize.local
   ```
3. Restart Next.js: `npm run dev:embedded`

### From Embedded to Standalone

1. Update `.env.local`:
   ```bash
   AUTH_MODE=standalone
   ```
2. Restart Next.js: `npm run dev`

## Security Considerations

### Embedded Mode

- ✅ **Production-grade security**
- ✅ JWT signed with AWS KMS (PS256) in production
- ✅ HttpOnly cookies prevent XSS token theft
- ✅ SameSite=Lax prevents CSRF
- ✅ Short token lifetime (30 minutes)
- ✅ URL scope validation prevents unauthorized access
- ✅ Service tokens for backend-to-backend calls

### Standalone Mode

- ⚠️ **Development only - no security**
- ⚠️ No authentication or authorization
- ⚠️ Mocked user data can be manipulated
- ⚠️ Never use in production
- ⚠️ Never commit `.env.local` with `AUTH_MODE=standalone` to production

## Troubleshooting

### Embedded Mode Issues

**Problem**: "No token found, redirecting to rails app"
- **Solution**: Log into Rails first at `RAILS_BASE_URL`
- **Check**: Rails is running and `gpw_session` cookie is set

**Problem**: "Token verification failed: JWKS_FETCH_FAILED"
- **Solution**: Check `RAILS_BASE_URL` is correct and Rails JWKS endpoint is accessible
- **Test**: `curl ${RAILS_BASE_URL}/.well-known/jwks.json`

**Problem**: "403 Forbidden: Account access denied"
- **Solution**: URL account ID must match JWT `account_id` claim
- **Check**: JWT claims match the URL you're accessing

### Standalone Mode Issues

**Problem**: "User session fetch failed"
- **Solution**: This is non-critical - app falls back to default mocked user
- **Check**: `/api/user-session` endpoint is accessible

**Problem**: "Cannot access account-scoped routes"
- **Solution**: In standalone mode, URL scoping is optional - use query params or headers instead
- **Example**: `?account=123&organization=456`

## Best Practices

### Embedded Mode

1. ✅ Always use in production
2. ✅ Ensure Rails JWKS endpoint is accessible
3. ✅ Use URL scoping for all routes
4. ✅ Monitor token renewal success rates
5. ✅ Set up alerts for authentication failures

### Standalone Mode

1. ✅ Use only for frontend development
2. ✅ Never commit standalone config to production
3. ✅ Test in embedded mode before deploying
4. ✅ Use query params/headers for testing different account/org contexts
5. ✅ Document any mocked data assumptions

## Summary

- **Embedded Mode**: Production-ready, full security, requires Rails
- **Standalone Mode**: Development-only, no security, no Rails needed
- **Default**: Embedded mode (when `AUTH_MODE` is omitted)
- **Switch**: Change `AUTH_MODE` environment variable and restart

Choose the mode that matches your development workflow and deployment requirements.

