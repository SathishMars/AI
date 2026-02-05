# GraphQL Direct Connection Migration

## Overview
Migrated from Next.js proxy route to direct connection to standalone GraphQL server.

**Date**: February 2, 2026  
**Status**: ✅ **COMPLETED**

---

## Changes Made

### 1. Updated `src/app/utils/api.ts`
**Added**: `getGraphQLUrl()` helper function
```typescript
export const getGraphQLUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use public env var or default to localhost
    return process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
  }
  // Server-side: use server env var or default to localhost
  return process.env.GRAPHQL_URL || 'http://localhost:4000/graphql';
};
```

### 2. Updated `src/app/components/arrivals/ArrivalsPage.tsx`
**Changed**: 
- Import: Added `getGraphQLUrl` import
- `fetchArrivals()`: Added `abortSignal?: AbortSignal` parameter
- GraphQL call: Changed from `apiFetch("/api/graphql", ...)` to `fetch(getGraphQLUrl(), ...)`
- Abort signal: Properly passed to fetch options

**Before**:
```typescript
const res = await apiFetch("/api/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables }),
});
```

**After**:
```typescript
const graphqlUrl = getGraphQLUrl();
const res = await fetch(graphqlUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables }),
  ...(abortSignal ? { signal: abortSignal } : {}),
});
```

### 3. Updated `src/app/components/Shell/AimePanel.tsx`
**Changed**:
- Import: Changed from `apiFetch` to `getGraphQLUrl`
- GraphQL call: Changed from `apiFetch("/api/graphql", ...)` to `fetch(getGraphQLUrl(), ...)`

**Before**:
```typescript
const response = await apiFetch("/api/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables }),
});
```

**After**:
```typescript
const graphqlUrl = getGraphQLUrl();
const response = await fetch(graphqlUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables }),
});
```

### 4. Updated `src/proxy.ts`
**Changed**: Removed `/api/graphql` from auth middleware skip list
- GraphQL route no longer needs to be skipped since it's not used
- Only `/api/chat` remains in the skip list

### 5. Updated `src/app/api/graphql/route.ts`
**Changed**: Added deprecation comment
- File marked as deprecated but kept for reference
- Can be deleted if not needed in the future

---

## Architecture Change

### Before (Proxy Architecture):
```
Client Browser
    ↓
Next.js API Route (/api/graphql/route.ts)
    ↓ (proxies request)
Standalone GraphQL Server (port 4000)
```

### After (Direct Connection):
```
Client Browser
    ↓ (direct connection)
Standalone GraphQL Server (port 4000)
```

---

## Benefits

1. ✅ **Reduced Latency**: One less network hop
2. ✅ **Simpler Architecture**: Direct connection, no proxy layer
3. ✅ **Better Error Handling**: Direct GraphQL errors, no proxy translation
4. ✅ **Easier Debugging**: Direct connection to GraphQL server
5. ✅ **Timeout Support**: Abort signals work directly with fetch

---

## Environment Variables

### Required for Client-Side:
```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
```

### For Production:
```env
NEXT_PUBLIC_GRAPHQL_URL=https://graphql.yourcompany.com/graphql
```

### For Server-Side (if needed):
```env
GRAPHQL_URL=http://localhost:4000/graphql
```

---

## CORS Configuration

The GraphQL server (`insights-server.ts`) already has CORS configured:
```typescript
app.use(
    cors<cors.CorsRequest>({
        origin: process.env.CORS_ORIGIN || '*',  // Allows all origins by default
        credentials: true,
    })
);
```

**For Production**: Set `CORS_ORIGIN` environment variable to restrict origins:
```env
CORS_ORIGIN=https://yourdomain.com
```

---

## Testing Checklist

- [x] ArrivalsPage GraphQL queries work
- [x] AimePanel GraphQL mutations work
- [x] Abort signal support maintained
- [x] Error handling works correctly
- [x] CORS configured properly
- [x] Environment variables documented

---

## Migration Notes

1. **Proxy Route**: The `/api/graphql/route.ts` file is deprecated but kept for reference. It can be safely deleted if not needed.

2. **Backward Compatibility**: If you need to keep the proxy route for some clients, you can keep both implementations. The proxy route will still work.

3. **Base Path**: The `getGraphQLUrl()` function doesn't use `basePath` since it connects directly to the GraphQL server. If your GraphQL server is behind a base path, include it in the `GRAPHQL_URL` environment variable.

4. **Authentication**: The GraphQL server doesn't require authentication. If you need to add authentication headers, modify the fetch calls to include them.

---

## Rollback Plan

If you need to rollback to the proxy approach:

1. Revert changes to `ArrivalsPage.tsx` and `AimePanel.tsx`
2. Change `fetch(getGraphQLUrl(), ...)` back to `apiFetch("/api/graphql", ...)`
3. Remove `abortSignal` parameter from `fetchArrivals()` if not needed
4. The proxy route (`route.ts`) will work as before

---

## Files Modified

1. ✅ `src/app/utils/api.ts` - Added `getGraphQLUrl()` helper
2. ✅ `src/app/components/arrivals/ArrivalsPage.tsx` - Direct GraphQL connection
3. ✅ `src/app/components/Shell/AimePanel.tsx` - Direct GraphQL connection
4. ✅ `src/proxy.ts` - Removed GraphQL route from skip list
5. ✅ `src/app/api/graphql/route.ts` - Marked as deprecated

---

## Status

✅ **Migration Complete** - All code updated to use direct GraphQL connection.

---

**Last Updated:** February 2, 2026, 12:00 PM UTC
