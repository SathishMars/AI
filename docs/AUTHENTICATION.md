# Authentication & Authorization

This document describes the JWT-based authentication system for the Groupize Workflows Next.js application.

## Overview

The application uses JWT (JSON Web Tokens) for authentication with a defense-in-depth approach:

- **Production**: JWT signed with AWS KMS (PS256) via Rails
- **Development Embedded**: JWT signed with HS256 shared secret via Rails  
- **Development Standalone**: Mock JWT tokens for frontend-only development

## Architecture

### SSO Flow (Rails → Next.js)

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

### Authentication Flow

1. **User logs into Rails** at `groupize.local` (or production domain)
2. **Rails generates JWT** with user/account/org claims
3. **Rails sets `gpw_session` cookie** (HttpOnly, Secure, SameSite=Lax)
4. **User navigates to** `/aime/aimeworkflows/*`
5. **Nginx proxies** request to Next.js with cookies forwarded
6. **Next.js middleware** verifies JWT:
   - Extracts token from `gpw_session` cookie
   - Verifies signature using JWKS from Rails
   - Validates claims (exp, aud, iss, etc.)
   - Injects user headers for downstream use
7. **On success**: Request proceeds with user context
8. **On failure**: Redirect to Rails login

## JWT Claims

### Standard Claims (RFC 7519)

```typescript
{
  iss: "groupize",              // Issuer
  aud: "workflows",             // Audience
  sub: "user_id",               // Subject (user ID)
  exp: 1234567890,              // Expiration (Unix timestamp, 30 min)
  nbf: 1234567890,              // Not before (Unix timestamp)
  iat: 1234567890,              // Issued at (Unix timestamp)
}
```

### Custom Claims

```typescript
{
  account_id: "account_123",
  organization_id: "org_456",   // Optional (null for account-level)
  email: "user@example.com",
  user_first_name: "John",
  user_last_name: "Doe",
  user_name: "John Doe"
}
```

## Current User Pattern (SSR)

To avoid hydration mismatches, we use the **Current User Pattern**:

### Server Side (Layout)

```typescript
// app/layout.tsx
import { getCurrentUser } from './lib/currentUser';

export default async function RootLayout({ children }) {
  const initialCurrentUser = await getCurrentUser();
  
  return (
    <UnifiedUserProvider initialCurrentUser={initialCurrentUser}>
      {children}
    </UnifiedUserProvider>
  );
}
```

### Middleware

```typescript
// src/middleware.ts
// 1. Verifies JWT from cookie
// 2. Injects user headers (x-user-id, x-account-id, etc.)
// 3. Redirects to login on failure
```

### Server Components/Actions

```typescript
import { getCurrentUser, requireCurrentUser } from '@/app/lib/currentUser';

// Optional auth
const currentUser = await getCurrentUser();
if (currentUser.isAuthenticated) {
  // User is logged in
}

// Required auth
const currentUser = await requireCurrentUser(); // Throws if not authenticated
```

### Client Components

```typescript
'use client';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';

function MyComponent() {
  const { user, isAuthenticated } = useUnifiedUserContext();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Hello, {user.profile.firstName}!</div>;
}
```

## Cookie Transport

### Cookie Configuration

- **Name**: `gpw_session`
- **HttpOnly**: `true` (JavaScript cannot access)
- **Secure**: `true` (HTTPS only in production)
- **SameSite**: `Lax` (CSRF protection on shared domain)
- **Path**: `/` (available to all routes)
- **Max-Age**: `1800` (30 minutes)

### Security Features

1. **HttpOnly**: Prevents XSS attacks from stealing tokens
2. **Secure**: Ensures HTTPS-only transmission in production
3. **SameSite=Lax**: Prevents CSRF attacks while allowing navigation
4. **Short-lived**: 30-minute expiration reduces exposure window
5. **Server-side only**: Client never reads the JWT cookie

## JWKS and Key Rotation

**Note:** JWKS is **only used in embedded mode and production**. Standalone mode uses HS256 with a shared secret.

### Rails JWKS Endpoint (Embedded Mode & Production Only)

- **URL**: `/.well-known/jwks.json`
- **Cache-Control**: `public, max-age=300, stale-while-revalidate=60`
- **ETag**: For efficient revalidation
- **Not used in standalone mode** - standalone generates and verifies mock tokens with HS256

### Next.js JWKS Caching (Embedded Mode & Production Only)

The `jose` library's `createRemoteJWKSet` automatically:
- Caches keys based on `Cache-Control` headers
- Refetches on unknown `kid` (key ID)
- Respects 5-minute max-age from endpoint
- **Only activated when `AUTH_MODE=embedded`** (default)

### JWT Verification Strategy by Mode

| Mode | Verification Method | When Used |
|------|-------------------|-----------|
| **Standalone** (`AUTH_MODE=mock`) | HS256 with `JWT_SECRET` | Frontend-only development, no Rails |
| **Embedded** (`AUTH_MODE=embedded`) | JWKS with KMS public keys (PS256) | Development with Rails, Production |

### Key Rotation Strategy (Embedded Mode & Production Only)

1. **Rails** generates new key in KMS
2. **JWKS endpoint** serves both old and new keys
3. **Next.js** automatically fetches new keys on unknown `kid`
4. **Old keys** remain valid for grace period
5. **After grace period**, old keys removed from JWKS

## Development Modes

### Embedded Mode

Requires Rails running at `groupize.local`:

```bash
# Terminal 1: Start Rails
cd reg_app
rails s -p 3000

# Terminal 2: Start Next.js in embedded mode
cd Workflows
npm run dev:embedded
```

**Features:**
- Authenticates via Rails SSO
- **Verifies JWT via JWKS** (fetches from Rails)
- Uses KMS-signed tokens (PS256) from Rails
- Redirects to Rails login if unauthorized
- Full SSO experience
- Runs on PORT=3001

### Standalone Mode (Default)

No Rails required, great for frontend development:

```bash
cd Workflows
npm run dev
```

**Features:**
- **Default development mode** (runs on PORT=3000)
- Generates mock JWT tokens automatically using **HS256**
- No Rails connection needed
- No JWKS calls - all verification done with shared secret
- No authentication redirects
- Shows app as logged in with mock user
- Perfect for UI/component development

## Environment Configuration

Create a `.env.local` file (never commit!):

```bash
# Authentication Mode
AUTH_MODE=embedded              # or "mock" for standalone

# Rails Backend
RAILS_BASE_URL=http://groupize.local
JWKS_URL=http://groupize.local/.well-known/jwks.json

# JWT Configuration
JWT_ISSUER=groupize
JWT_AUDIENCE=workflows
JWT_SECRET=dev-secret-change-me  # Only for dev HS256

# Cookie Configuration
COOKIE_NAME=gpw_session

# Application
NEXT_PUBLIC_BASE_PATH=/aime/aimeworkflows
NODE_ENV=development
```

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
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
}
```

### HTTP Errors

Standardized HTTP errors across the application:

```typescript
import { HttpError, UnauthorizedError } from '@/app/types/errors';

try {
  const data = await apiFetchJSON('/api/workflows');
} catch (error) {
  if (HttpError.isHttpError(error)) {
    console.error(`HTTP ${error.statusCode}: ${error.message}`);
  }
}
```

### Middleware Error Handling

```typescript
// Embedded mode: Redirect to Rails login
if (!token || !verification.success) {
  return NextResponse.redirect(new URL('/', env.railsBaseUrl));
}

// Mock mode: Generate new token and continue
if (env.isMockMode) {
  const mockToken = await createMockToken();
  response.cookies.set(env.cookieName, mockToken, { ... });
  return response;
}
```

## Route Protection

### All Routes Protected

By default, **ALL routes** under `/aime/aimeworkflows/*` require authentication:

```typescript
// src/middleware.ts
export const config = {
  matcher: ['/:path*']  // Protects all routes
};
```

Static assets are excluded automatically.

### Future: Public Routes

To add public routes (not implemented yet):

```typescript
const publicRoutes = ['/public', '/landing'];

if (publicRoutes.some(route => pathname.startsWith(route))) {
  return NextResponse.next();
}
```

## Security Best Practices

### ✅ Implemented

1. **Defense in Depth**
   - JWT verification in middleware
   - Server-side viewer pattern
   - HttpOnly cookies
   - Short token lifetime (30 min)

2. **No Client-Side Token Access**
   - JWT never exposed to JavaScript
   - Viewer passed via props, not cookies
   - No hydration mismatches

3. **Proper Claims Validation**
   - Expiration (exp) with 60s tolerance
   - Audience (aud) validation
   - Issuer (iss) validation
   - Not-before (nbf) validation

4. **JWKS Caching & Rotation**
   - Automatic key caching
   - Graceful key rotation
   - Unknown kid refetch

5. **Typed Error Handling**
   - Standardized error codes
   - HTTP error types
   - Consistent error responses

### 🔒 Additional Considerations

1. **CSRF Protection**: SameSite=Lax provides CSRF protection
2. **XSS Protection**: HttpOnly cookies prevent XSS token theft
3. **HTTPS Only**: Secure flag ensures HTTPS in production
4. **Token Refresh**: Tokens expire after 30 minutes (redirect to Rails)
5. **Audit Logging**: Log authentication events (implement in Rails)

## Testing

### Test JWT Verification

```typescript
import { verifyJWT } from '@/app/lib/jwt';

const result = await verifyJWT(token);
if (result.success) {
  console.log('Valid token:', result.viewer);
} else {
  console.error('Invalid token:', result.error);
}
```

### Test Current User Access

```typescript
import { getCurrentUser } from '@/app/lib/currentUser';

const currentUser = await getCurrentUser();
console.log('Authenticated:', currentUser.isAuthenticated);
```

### Mock Token Generation

```typescript
import { createMockToken } from '@/app/lib/jwt';

const token = await createMockToken(
  'user-123',
  'account-456',
  'org-789'
);
```

## Troubleshooting

### Token Verification Fails

1. **Check JWKS endpoint**: `curl http://groupize.local/.well-known/jwks.json`
2. **Check token claims**: Decode at jwt.io
3. **Check environment**: Is `RAILS_BASE_URL` correct?
4. **Check Rails logs**: Look for JWT signing errors

### Redirects to Rails Login

1. **Check cookie**: Is `gpw_session` set?
2. **Check token expiration**: Tokens expire after 30 minutes
3. **Check Rails session**: Are you logged into Rails?

### Hydration Mismatch

1. **Never read cookies on client**: Use initialCurrentUser from SSR
2. **Check UnifiedUserProvider**: Is initialCurrentUser passed?
3. **Check layout**: Is it a Server Component?

## Migration from Old System

The new system maintains backward compatibility:

```typescript
// Client-side (still works)
const { user, isAuthenticated } = useUnifiedUserContext();

// Server-side (new)
const currentUser = await getCurrentUser();
```

## Production Deployment

### Environment Variables

```bash
# Production
AUTH_MODE=embedded
RAILS_BASE_URL=https://app.groupize.com
JWKS_URL=https://app.groupize.com/.well-known/jwks.json
JWT_ISSUER=groupize
JWT_AUDIENCE=workflows
COOKIE_NAME=gpw_session
NODE_ENV=production
```

### Verification Checklist

- [ ] Rails JWKS endpoint accessible
- [ ] KMS key configured in Rails
- [ ] Cookie domain matches (groupize.com)
- [ ] HTTPS enforced (Secure cookies)
- [ ] basePath matches nginx config
- [ ] Token expiration appropriate (30 min)
- [ ] Monitoring/alerting configured

## Future Enhancements

### Not Yet Implemented

1. **Service-to-Service Auth**: API keys for backend-to-backend
2. **Token Refresh**: Automatic token refresh before expiration
3. **Multi-factor Auth**: MFA support in Rails
4. **Session Management**: View active sessions, revoke tokens
5. **Rate Limiting**: Per-user rate limits
6. **Audit Logging**: Complete audit trail

---

For questions or issues, contact the platform team.

