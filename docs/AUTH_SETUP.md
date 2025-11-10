# JWT Authentication Setup Guide

Quick setup guide for the JWT authentication system between Rails and Next.js.

## Quick Start

### 1. Environment Configuration

Create `.env.local` in the Workflows directory:

```bash
AUTH_MODE=embedded
RAILS_BASE_URL=http://groupize.local
JWT_SECRET=dev-secret-change-me
JWT_ISSUER=groupize
JWT_AUDIENCE=workflows
COOKIE_NAME=gpw_session
```

### 2. Run in Embedded Mode (with Rails)

```bash
# Terminal 1: Start Rails
cd reg_app
rails s -p 3000

# Terminal 2: Start Next.js
cd Workflows
npm run dev:embedded
```

Navigate to: `http://groupize.local/aime/aimeworkflows/`

### 3. Run in Standalone Mode (no Rails) - Default

```bash
cd Workflows
npm run dev
```

Navigate to: `http://localhost:3000/aime/aimeworkflows/`

**Note:** Standalone mode uses **HS256** for mock tokens, not JWKS.

## What Was Implemented

### Rails Side

#### 1. Updated Controllers

**Both workflows controllers updated:**
- `/reg_app/app/controllers/admin/accounts/rules/workflows_controller.rb`
- `/reg_app/app/controllers/admin/accounts/organizations/rules/workflows_controller.rb`

**Changes:**
- Cookie name changed to `gpw_session`
- JWT expiration reduced to 30 minutes
- Added proper JWT claims (iss, aud, sub, nbf)
- Enabled `before_action :set_jwt_cookie`

#### 2. JWKS Endpoint Enhanced

**File:** `/reg_app/app/controllers/api/v1/jwks_controller.rb`

**Added:**
- Cache-Control headers (max-age=300, stale-while-revalidate=60)
- ETag for efficient revalidation
- Key rotation support

### Next.js Side

#### 1. Type System

**New files:**
- `src/app/types/auth.ts` - JWT claims, Viewer, AuthError types
- `src/app/types/errors.ts` - HTTP error classes

#### 2. Core Libraries

**New files:**
- `src/app/lib/env.ts` - Environment configuration
- `src/app/lib/jwt.ts` - JWT verification (JWKS for embedded, HS256 for standalone)
- `src/app/lib/currentUser.ts` - Server-side current user access

#### 3. Middleware

**File:** `src/middleware.ts`

**Completely rewritten to:**
- Verify JWT from `gpw_session` cookie
- Inject user context headers
- Handle mock mode for standalone dev
- Redirect to Rails login on auth failure

#### 4. Layout & Context

**Updated files:**
- `src/app/layout.tsx` - Now passes initialCurrentUser from SSR
- `src/app/contexts/UnifiedUserContext.tsx` - Accepts initialCurrentUser
- `src/app/types/unified-user-context.ts` - Added initialCurrentUser prop

#### 5. API Utilities

**File:** `src/app/utils/api.ts`

**Enhanced with:**
- HTTP error handling
- Typed JSON fetching
- Error response mapping

#### 6. Development Scripts

**File:** `package.json`

**New scripts:**
```json
{
  "dev": "PORT=3000 AUTH_MODE=mock next dev --turbopack",
  "dev:embedded": "PORT=3001 AUTH_MODE=embedded next dev --turbopack"
}
```

**Note:** `npm run dev` is now standalone mode (default) - uses HS256 mock tokens, no JWKS.

#### 7. Documentation

**New files:**
- `docs/AUTHENTICATION.md` - Complete authentication guide  
- `docs/AUTH_SETUP.md` - This file
- `docs/ENV_VARIABLES.md` - Environment variables reference

## File Structure

```
Workflows/
├── src/
│   ├── app/
│   │   ├── lib/
│   │   │   ├── env.ts          # Environment config
│   │   │   ├── jwt.ts          # JWT verification (JWKS/HS256)
│   │   │   └── currentUser.ts  # Server-side current user
│   │   ├── types/
│   │   │   ├── auth.ts         # Auth types
│   │   │   └── errors.ts       # Error types
│   │   ├── contexts/
│   │   │   └── UnifiedUserContext.tsx  # Updated for viewer
│   │   ├── layout.tsx          # SSR viewer pattern
│   │   └── utils/
│   │       └── api.ts          # Enhanced API utilities
│   └── middleware.ts           # Auth middleware
├── docs/
│   ├── AUTHENTICATION.md       # Full guide
│   ├── AUTH_SETUP.md          # This file
│   └── ENV_VARIABLES.md       # Environment variables
└── package.json               # Dev scripts
```

## Testing the Implementation

### 1. Test Embedded Mode

```bash
# Start Rails and log in
open http://groupize.local

# Start Next.js
npm run dev:embedded

# Navigate to workflows
open http://groupize.local/aime/aimeworkflows/

# Should see your user logged in
# Check browser console for auth logs
```

### 2. Test Standalone Mode (Default)

```bash
# Start Next.js in standalone mode (default)
npm run dev

# Navigate to workflows
open http://localhost:3000/aime/aimeworkflows/

# Should automatically log in as "Mock User"
# Check browser console for mock token generation
# Uses HS256 tokens - no JWKS calls
```

### 3. Test Token Verification

Open browser console:

```javascript
// Check cookies
document.cookie

// Should see: gpw_session=eyJ...

// Check user context
// The app should display user information
```

### 4. Test Middleware

Check terminal logs for:
```
[Auth Middleware] Authenticated user: user_123 (user@example.com)
[JWT] Token verified successfully for user: user_123
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_MODE` | No | `embedded` | `embedded` or `mock` |
| `RAILS_BASE_URL` | Yes (embedded) | `http://groupize.local` | Rails app URL |
| `JWKS_URL` | No | `${RAILS_BASE_URL}/.well-known/jwks.json` | JWKS endpoint |
| `JWT_ISSUER` | No | `groupize` | JWT issuer claim |
| `JWT_AUDIENCE` | No | `workflows` | JWT audience claim |
| `JWT_SECRET` | Yes (dev) | `dev-secret-change-me` | Shared secret for HS256 |
| `COOKIE_NAME` | No | `gpw_session` | Cookie name |
| `NEXT_PUBLIC_BASE_PATH` | No | `/aime/aimeworkflows` | Next.js basePath |
| `NODE_ENV` | No | `development` | Node environment |

## Common Issues

### Issue: "No token found in cookie"

**Solution:**
1. Make sure you're logged into Rails first
2. Check that `COOKIE_NAME` matches Rails (gpw_session)
3. Check nginx config forwards cookies

### Issue: "Token verification failed: JWKS_FETCH_FAILED"

**Solution:**
1. This only happens in **embedded mode** (JWKS is not used in standalone)
2. Check Rails is running: `curl http://groupize.local/.well-known/jwks.json`
3. Check `RAILS_BASE_URL` is correct
4. Check Rails JWKS controller is working
5. Or switch to standalone mode: `npm run dev` (uses HS256, no JWKS)

### Issue: "Redirecting to login" in embedded mode

**Solution:**
1. Log into Rails first at `http://groupize.local`
2. Make sure Rails set the `gpw_session` cookie
3. Check Rails workflows controller has `before_action :set_jwt_cookie`

### Issue: Hydration mismatch error

**Solution:**
1. Check layout.tsx is passing `initialCurrentUser`
2. Check UnifiedUserProvider accepts `initialCurrentUser`
3. Never read cookies on the client side

## Development Workflow

### Frontend Development Only (Default)

```bash
npm run dev
```

Work on UI without Rails running. Mock user is automatically logged in.
Uses **HS256 mock tokens** - no JWKS, no network calls to Rails.
Runs on PORT=3000.

### Full Stack Development

```bash
# Terminal 1
cd reg_app && rails s -p 3000

# Terminal 2  
cd Workflows && npm run dev:embedded
```

Work with real Rails authentication and JWT tokens.
Uses **JWKS verification** with KMS-signed tokens (PS256).
Runs on PORT=3001.

### Testing Production-like Setup

1. Configure KMS in Rails
2. Set `JWT_GSSO_GROUPIZE_KEY_ID` in Rails
3. Start Rails in production mode
4. Start Next.js with `AUTH_MODE=embedded` (default)
5. Tokens will use **PS256 with JWKS verification** (not HS256)

## Next Steps

1. **Test the implementation** with both modes
2. **Configure production** environment variables
3. **Deploy to staging** and verify
4. **Monitor auth logs** for errors
5. **Implement service-to-service auth** (future)

## Support

For issues or questions:
- Check `docs/AUTHENTICATION.md` for detailed documentation
- Review middleware logs in terminal
- Check Rails logs for JWT generation
- Verify JWKS endpoint is accessible

---

## JWT Verification Summary

| Mode | Command | Verification | JWKS Used? |
|------|---------|--------------|------------|
| **Standalone** | `npm run dev` | HS256 with shared secret | ❌ No |
| **Embedded** | `npm run dev:embedded` | JWKS with KMS public keys | ✅ Yes |
| **Production** | `npm start` | JWKS with KMS public keys | ✅ Yes |

**Summary:** The implementation provides secure JWT authentication with Rails SSO, standalone development mode (HS256), embedded/production mode (JWKS/PS256), typed errors, proper caching, and follows all security best practices.

