# Security Implementation Guide - Insights Module

## ✅ Completed Security Fixes

### 1. Removed Authentication Bypasses ✅

**File**: `src/proxy.ts`
- **Before**: Insights routes bypassed JWT authentication
- **After**: All insights routes now go through `handleUserAuth()` middleware
- **Impact**: Users must be authenticated to access `/insights/*` routes

### 2. Added GraphQL Server Authentication ✅

**File**: `src/insights-server.ts`
- **Added**: JWT token verification in GraphQL Yoga context
- **Implementation**: Extracts token from `Authorization` header or cookies
- **Impact**: All GraphQL queries now require authentication

### 3. Added Authorization Checks ✅

**Files**: 
- `src/app/lib/insights/auth.ts` (new)
- `src/app/api/graphql/schema.ts`

**Implementation**:
- Created `requireEventAccess()` function for eventId authorization
- Added authorization checks to all GraphQL resolvers:
  - `arrivals` query
  - `eventExists` query  
  - `chat` mutation

**Impact**: Users can only access eventIds they have permission for

### 4. Updated Client-Side GraphQL Calls ✅

**Files**:
- `src/app/utils/graphql-auth.ts` (new)
- `src/app/components/attendee/AttendeePage.tsx`

**Implementation**:
- Created `getGraphQLAuthHeadersWithCookies()` helper
- Updated all GraphQL `fetch()` calls to include auth headers
- Ensures cookies are sent with cross-origin requests

**Impact**: Client-side GraphQL calls now authenticate properly

---

## 🔧 How It Works

### Authentication Flow

```
1. User visits /insights/attendee/5281
   ↓
2. Next.js middleware (proxy.ts) checks for JWT token
   ↓
3. If authenticated → Continue to page
   If not authenticated → Redirect to Rails login
   ↓
4. Client-side component makes GraphQL request
   ↓
5. GraphQL request includes Authorization header (from cookie)
   ↓
6. GraphQL server (insights-server.ts) verifies token
   ↓
7. GraphQL resolver checks eventId authorization
   ↓
8. If authorized → Return data
   If not authorized → Return error
```

### Authorization Flow

```
1. GraphQL resolver receives request with eventId
   ↓
2. Calls requireEventAccess(context.user, eventId)
   ↓
3. TODO: Verify eventId belongs to user's account/org
   ↓
4. If authorized → Proceed with query
   If not authorized → Throw AuthorizationError
```

---

## ⚠️ IMPORTANT: TODO Items

### Critical: Implement EventId Authorization

**File**: `src/app/lib/insights/auth.ts`

The `requireEventAccess()` function currently has a **placeholder implementation**. You **MUST** implement actual authorization logic:

```typescript
export async function requireEventAccess(session: Session, eventId: number): Promise<void> {
  // TODO: Implement actual eventId ownership verification
  // Example:
  // 1. Query database to get event details
  // 2. Verify event.accountId === session.accountId
  // 3. Verify event.organizationId === session.organizationId (if applicable)
  // 4. Throw AuthorizationError if access denied
}
```

**Why This Matters**:
- Currently, any authenticated user can access any eventId
- You need to verify event ownership/access in your database
- This prevents cross-account data access

### Recommended: Add Rate Limiting

**Where**: GraphQL server middleware

**Implementation**:
```typescript
// Add rate limiting middleware before GraphQL endpoint
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user to 100 requests per windowMs
  keyGenerator: (req) => {
    // Use user ID from JWT token
    return req.user?.userId || req.ip;
  }
});

app.use('/graphql', limiter, yoga.requestListener);
```

### Recommended: Add Audit Logging

**Where**: GraphQL resolvers

**Implementation**:
```typescript
// Log all data access attempts
logger.info('[Audit]', {
  userId: context.user.userId,
  accountId: context.user.accountId,
  eventId: eventId,
  query: 'arrivals',
  timestamp: new Date().toISOString()
});
```

---

## 🧪 Testing Checklist

- [ ] **Authentication Tests**
  - [ ] Unauthenticated user cannot access `/insights/attendee/5281`
  - [ ] Unauthenticated user gets redirected to login
  - [ ] Authenticated user can access insights routes

- [ ] **GraphQL Authentication Tests**
  - [ ] GraphQL request without token returns 401
  - [ ] GraphQL request with invalid token returns 401
  - [ ] GraphQL request with valid token succeeds

- [ ] **Authorization Tests** (After implementing `requireEventAccess`)
  - [ ] User can access their own eventIds
  - [ ] User cannot access other accounts' eventIds
  - [ ] User gets authorization error for unauthorized eventIds

- [ ] **Client-Side Tests**
  - [ ] GraphQL requests include Authorization header
  - [ ] Cookies are sent with cross-origin requests
  - [ ] Error handling for 401/403 responses

---

## 📝 Configuration

### Environment Variables

Make sure these are set:

```bash
# Cookie name (must match Rails)
COOKIE_NAME=gpw_session

# GraphQL server URL
GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql

# CORS origin (restrict in production!)
CORS_ORIGIN=http://localhost:3000
```

### Production Considerations

1. **Restrict CORS**: Update `CORS_ORIGIN` to your production domain
2. **HTTPS Only**: Ensure cookies are `Secure` in production
3. **SameSite Cookies**: Already configured in Rails
4. **Rate Limiting**: Implement before production deployment
5. **EventId Authorization**: **MUST** be implemented before production

---

## 🚨 Security Notes

### What's Protected Now ✅
- ✅ Route-level authentication (via middleware)
- ✅ GraphQL server authentication (via context)
- ✅ Client-side auth headers (via helper)

### What Still Needs Work ⚠️
- ⚠️ EventId authorization (placeholder implementation)
- ⚠️ Rate limiting (not implemented)
- ⚠️ Audit logging (not implemented)
- ⚠️ CORS restrictions (currently allows all origins)

---

## 📚 Related Files

- `src/proxy.ts` - Next.js middleware (authentication)
- `src/insights-server.ts` - GraphQL server (authentication)
- `src/app/lib/insights/auth.ts` - Authorization helpers
- `src/app/api/graphql/schema.ts` - GraphQL resolvers (authorization)
- `src/app/utils/graphql-auth.ts` - Client-side auth helpers
- `src/app/components/attendee/AttendeePage.tsx` - Client-side GraphQL calls

---

**Last Updated**: February 2, 2026  
**Status**: ✅ Authentication implemented, ⚠️ Authorization needs database integration
