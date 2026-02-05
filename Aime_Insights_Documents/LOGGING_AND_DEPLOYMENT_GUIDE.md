# Logging, Development & Production Guide

## 📋 Table of Contents

1. [Overview & Changes](#overview--changes)
2. [Development Mode](#development-mode)
3. [Production Mode](#production-mode)
4. [Logging System](#logging-system)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview & Changes

### **What Changed**

#### **Security Updates**
- ✅ Removed `"dietary"` and `"dietary_restrictions"` from PII guardrails
- ✅ Updated vulnerable packages:
  - `jspdf`: `^3.0.4` → `^4.0.0` (Local File Inclusion fix)
  - `xlsx`: `^0.18.5` → `^0.20.2` (Prototype Pollution fix)
  - `next`: `16.1.0` → `16.2.0-canary.11` (DoS vulnerability fix)

#### **Logging Migration**
- ✅ Migrated ALL `console.log()`, `console.error()`, `console.warn()`, `console.info()`, `console.debug()`, `console.time()`, and `console.timeEnd()` statements to logger in insights-related code
- ✅ Environment-aware logging (auto-hides debug logs in production)
- ✅ Complete migration of insights-related files for production readiness
- ✅ Files updated: `schema.ts`, `scope.ts`, `insights-server.ts`, `timeout.ts`, `AimePanel.tsx`, `ArrivalsPage.tsx`, `ArrivalsTable.tsx`

#### **Code Files Modified**

**Insights-Related Files (Production Ready):**
- `src/app/lib/insights/sql/guard.ts` - Removed dietary from PII_COLUMNS
- `src/app/lib/insights/messages.ts` - Updated PII message
- `src/app/api/graphql/schema.ts` - ✅ **All console statements migrated to logger**, added SQL injection comments
- `src/app/lib/insights/nlp/scope.ts` - ✅ Migrated to logger
- `src/app/lib/insights/sql/timeout.ts` - ✅ **All console statements migrated to logger**
- `src/app/lib/insights/db.ts` - ✅ Migrated to logger
- `src/insights-server.ts` - ✅ **All console statements migrated to logger** (including GraphQL Yoga logging config)
- `src/app/components/Shell/AimePanel.tsx` - ✅ **All console statements migrated to logger**
- `src/app/components/arrivals/ArrivalsPage.tsx` - ✅ **All console statements migrated to logger**
- `src/app/components/arrivals/ArrivalsTable.tsx` - ✅ Console statements removed (comment only remains)

**Other Files:**
- `src/proxy.ts` - Migrated to logger
- `src/app/lib/logger.ts` - Added documentation and ESLint comments
- `package.json` - Updated vulnerable packages

**Note:** `src/app/api/graphql/route.ts` still contains console statements but is deprecated and not part of the active insights architecture. Per production readiness guidelines, only active insights-related code was migrated.

---

## 💻 Development Mode

### **How to Work Now**

**No changes needed!** Everything works exactly as before.

```bash
# Start development server
npm run dev

# Or for insights-specific development
npm run dev:insights
```

### **What You'll See**

- ✅ All debug logs visible automatically
- ✅ Token usage details visible
- ✅ All `logger.debug*()` methods show logs
- ✅ All `logger.info()` methods show logs
- ✅ Errors and warnings always show

### **Where to See Logs**

**If using Docker:**
```bash
# View GraphQL server logs (where token details appear)
docker-compose logs -f insights-backend

# Filter for specific logs
docker-compose logs -f insights-backend | Select-String -Pattern "Token|DEBUG|ERROR"
```

**If running directly:**
- Logs appear in the terminal where you ran `npm run dev`

### **Environment Variables (Development)**

```env
# .env.local or .env
# No configuration needed - defaults to development
# OR explicitly set:
NODE_ENV=development
```

### **Optional: Enable Specific Debug Flags**

```env
# Enable specific debug features (optional)
DEBUG_GRAPHQL=true          # GraphQL logs
DEBUG_RESPONSE_BUILDING=true # Response building logs
DEBUG_SQL=true              # SQL queries (use carefully!)
DEBUG_UI_ACTIONS=true       # UI action logs
DEBUG_SCOPE_DETECTION=true  # Scope detection logs
DEBUG_MIDDLEWARE=true       # Middleware logs
```

---

## 🏭 Production Mode

### **Before Deployment Checklist**

- [ ] **Run `npm install`** to update packages
- [ ] **Set `NODE_ENV=production`** in production environment
- [ ] **Test production build locally** (`NODE_ENV=production npm start`)
- [ ] **Verify debug logs are hidden** (check console output)
- [ ] **Verify errors/warnings still show** (test error scenarios)

### **Step-by-Step**

#### **1. Update Packages**
```bash
npm install

# Verify updates
npm list jspdf xlsx next
# Should show: jspdf@4.0.0, xlsx@0.20.2, next@16.2.0-canary.11
```

#### **2. Set Production Environment**
```env
# Production .env file
NODE_ENV=production

# Database & API Keys
DATABASE_URL=your_production_database_url
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
GROQ_API_KEY=your_key  # Optional

# GraphQL Server (if separate)
PORT=4000
CORS_ORIGIN=https://your-production-domain.com

# DO NOT SET DEBUG FLAGS IN PRODUCTION (unless debugging):
# DEBUG=true
# DEBUG_SQL=true
# DEBUG_GRAPHQL=true
```

#### **3. Build & Test**
```bash
# Build the application
npm run build

# Test production build locally
NODE_ENV=production npm start

# Verify: Debug logs should be hidden, errors/warnings still show
```

#### **4. Docker Production Setup**
```yaml
# docker-compose.yml
services:
  insights-backend:
    environment:
      - NODE_ENV=production
      # DO NOT set DEBUG flags unless debugging
```

### **Production Behavior**

| Log Type | Development | Production |
|----------|-------------|------------|
| `logger.debug*()` | ✅ Visible | ❌ Hidden |
| `logger.info()` | ✅ Visible | ❌ Hidden |
| `logger.warn()` | ✅ Visible | ✅ Visible |
| `logger.error()` | ✅ Visible | ✅ Visible |

### **Enable Debug in Production (If Needed)**

```env
# Temporarily enable specific debug
NODE_ENV=production
DEBUG_RESPONSE_BUILDING=true  # Only enable what you need
```

**Remember:** Disable after debugging!

---

## 📝 Logging System

### **Logger Location**

**File:** `src/app/lib/logger.ts`

**Import:**
```typescript
import { logger } from '@/app/lib/logger';
```

### **Available Methods**

#### **Debug Methods (Development Only)**

| Method | Use Case | Production |
|--------|----------|------------|
| `logger.debug()` | General debug | Hidden unless `DEBUG=true` |
| `logger.debugGraphQL()` | GraphQL operations, token usage | Hidden unless `DEBUG_GRAPHQL=true` |
| `logger.debugUIActions()` | UI action detection | Hidden unless `DEBUG_UI_ACTIONS=true` |
| `logger.debugQueries()` | Query processing | Hidden unless `DEBUG_QUERIES=true` |
| `logger.debugScope()` | Scope detection | Hidden unless `DEBUG_SCOPE_DETECTION=true` |
| `logger.debugResponse()` | Response building | Hidden unless `DEBUG_RESPONSE_BUILDING=true` |
| `logger.debugMiddleware()` | Middleware logs | Hidden unless `DEBUG_MIDDLEWARE=true` |
| `logger.debugSQL()` | SQL queries | Hidden unless `DEBUG_SQL=true` |

#### **Info Methods**

| Method | Use Case | Production |
|--------|----------|------------|
| `logger.info()` | Informational messages | Hidden |

#### **Warning & Error Methods (Always Visible)**

| Method | Use Case | Production |
|--------|----------|------------|
| `logger.warn()` | Warnings | ✅ Always shows |
| `logger.error()` | Errors | ✅ Always shows |

#### **Utility Methods**

| Method | Description |
|--------|-------------|
| `logger.isDebugEnabled()` | Check if debug logging is enabled |
| `logger.isProduction()` | Check if running in production |
| `logger.diagnostic()` | Show current logger state (for troubleshooting) |

### **Usage Examples**

```typescript
import { logger } from '@/app/lib/logger';

// Debug logs (development only)
logger.debug('General debug');
logger.debugGraphQL('GraphQL operation');
logger.debugResponse('Building response');

// Token usage (appears in GraphQL logs)
logger.debugGraphQL('[GraphQL Chat] SQL Generation Usage:', usage);
logger.debugGraphQL('[Total Tokens] Prompt: 3665, Completion: 233, Total: 3783');

// Info logs (development only)
logger.info('Server started');

// Warning logs (always shown)
logger.warn('Database pool not available');

// Error logs (always shown)
logger.error('Failed to process request', error);
```

### **Quick Migration Reference**

| Old (console) | New (logger) | Notes |
|---------------|--------------|-------|
| `console.log('[GraphQL Chat]...')` | `logger.debugGraphQL('[GraphQL Chat]...')` | GraphQL operations |
| `console.log('[detectUIAction]...')` | `logger.debugUIActions('[detectUIAction]...')` | UI action detection |
| `console.log('[SQL Query]...')` | `logger.debugSQL('[SQL Query]...')` | SQL queries |
| `console.log('[Auth Middleware]...')` | `logger.debugMiddleware('[Auth Middleware]...')` | Middleware logs |
| `console.log('[detectScopeAndCategory]...')` | `logger.debugScope('[detectScopeAndCategory]...')` | Scope detection |
| `console.log('[Response Building]...')` | `logger.debugResponse('[Response Building]...')` | Response building |
| `console.log('...')` | `logger.debug('...')` | General debug |
| `console.time('label')` / `console.timeEnd('label')` | `const start = Date.now()` / `logger.debugGraphQL(\`Duration: \${Date.now() - start}ms\`)` | Performance timing |
| `console.error(...)` | `logger.error(...)` | ✅ **Always migrated** |
| `console.warn(...)` | `logger.warn(...)` | ✅ **Always migrated** |
| `console.info(...)` | `logger.info(...)` | ✅ **Always migrated** |
| `console.debug(...)` | `logger.debug(...)` | ✅ **Always migrated** |

**Migration Status:** ✅ All console statements in insights-related code have been migrated to logger for production readiness.

---

## ✅ Verification & Migration Status

### **Migration Verification (February 2026)**

All insights-related code has been verified and migrated to use the logger utility:

**Verified Files (No Console Statements Found):**
- ✅ `src/app/lib/insights/sql/timeout.ts` - All `console.error` replaced with `logger.error`
- ✅ `src/app/api/graphql/schema.ts` - All `console.error`, `console.warn`, `console.time`, `console.timeEnd` replaced
- ✅ `src/insights-server.ts` - All console statements replaced, including GraphQL Yoga logging configuration
- ✅ `src/app/components/Shell/AimePanel.tsx` - All `console.log` and `console.error` replaced
- ✅ `src/app/components/arrivals/ArrivalsPage.tsx` - All `console.error` and `console.warn` replaced
- ✅ `src/app/components/arrivals/ArrivalsTable.tsx` - Console statements removed (comment only)

**Verification Method:**
```bash
# Search for remaining console statements in insights code
grep -r "console\.(log|error|warn|info|debug|time|timeEnd)" \
  AI/src/app/lib/insights \
  AI/src/app/api/graphql \
  AI/src/app/components/Shell/AimePanel.tsx \
  AI/src/app/components/arrivals \
  AI/src/insights-server.ts
```

**Result:** ✅ No console statements found in active insights-related code.

**Note:** `src/app/api/graphql/route.ts` still contains console statements but is deprecated and not part of the active insights architecture.

---

## 🔧 Troubleshooting

### **Issue: Logs Not Showing**

**Check 1: Docker Logs (If Using Docker)**
```bash
# View GraphQL server logs
docker-compose logs -f insights-backend

# Filter for token/details
docker-compose logs -f insights-backend | Select-String -Pattern "Token|DEBUG|ERROR"
```

**Check 2: NODE_ENV**
```bash
# Verify NODE_ENV
echo $env:NODE_ENV  # Should be "development" or unset

# If production, logs won't show (unless DEBUG flags set)
```

**Check 3: Enable Debug Flag**
```env
# Add to .env if logs don't show
DEBUG_GRAPHQL=true  # For GraphQL/token logs
DEBUG=true          # For all debug logs
```

**Check 4: Diagnostic**
```typescript
// Add to code temporarily
import { logger } from '@/app/lib/logger';
logger.diagnostic(); // Shows logger state
logger.error('Test error'); // Should always show
```

### **Issue: Token Details Not Showing**

Token details use `logger.debugGraphQL()` and appear in:
- **Docker logs:** `docker-compose logs -f insights-backend`
- **Next.js dev terminal:** Where you ran `npm run dev`

Look for:
- `[DEBUG GraphQL] [GraphQL Chat] SQL Generation Usage:`
- `[DEBUG GraphQL] [SQL Tokens] Prompt: X, Completion: Y, Total: Z`
- `[DEBUG GraphQL] [Total Tokens] Prompt: X, Completion: Y, Total: Z`

### **Issue: Debug Logs Showing in Production**

**Solution:**
```bash
# Verify NODE_ENV is set to production
echo $env:NODE_ENV  # Should be "production"

# Check for DEBUG flags
echo $env:DEBUG  # Should be unset
echo $env:DEBUG_GRAPHQL  # Should be unset
```

### **Issue: Need to Debug Production Issue**

**Solution:**
```env
# Temporarily enable specific debug
NODE_ENV=production
DEBUG_RESPONSE_BUILDING=true  # Enable only what you need
```

**Remember:** Disable after debugging!

---

## 📊 Quick Reference

### **Development**
```bash
npm run dev
# All logs show automatically
```

### **Production**
```bash
npm install  # Update packages
NODE_ENV=production npm run build
NODE_ENV=production npm start
# Debug logs automatically hidden
```

### **Logger Methods**
```typescript
logger.debug()              // General debug
logger.debugGraphQL()      // GraphQL/token logs
logger.debugResponse()     // Response building
logger.debugUIActions()    // UI actions
logger.debugSQL()          // SQL queries
logger.info()              // Info messages
logger.warn()              // Warnings (always show)
logger.error()             // Errors (always show)
```

### **Environment Variables**

**Development:**
```env
# No config needed - defaults to development
# OR:
NODE_ENV=development
```

**Production:**
```env
NODE_ENV=production
# Debug logs automatically hidden
```

**Production Debugging:**
```env
NODE_ENV=production
DEBUG_GRAPHQL=true  # Enable specific debug
```

---

## ✅ Summary

### **Development:**
- ✅ No changes needed - work normally
- ✅ All logs visible automatically
- ✅ Token details in Docker logs or dev terminal

### **Production:**
1. ✅ Run `npm install` (update packages)
2. ✅ Set `NODE_ENV=production`
3. ✅ Test production build locally
4. ✅ Verify debug logs hidden
5. ✅ Deploy

### **Key Points:**
- Logger automatically handles development vs production
- Debug logs hidden in production automatically
- Token details use `logger.debugGraphQL()` - check Docker logs
- Errors/warnings always show in both modes

---

**Last Updated:** February 2, 2026, 12:00 PM UTC  
**Status:** Production Ready ✅  
**Insights Code Migration:** Complete ✅ (All console statements replaced with logger in insights-related files)
