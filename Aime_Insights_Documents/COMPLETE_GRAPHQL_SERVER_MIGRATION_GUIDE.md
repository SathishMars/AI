# Complete GraphQL Server Migration Guide

## 📋 Overview

This comprehensive guide covers everything needed to migrate from a local GraphQL server to a separate company-hosted GraphQL server.

**For You (Next.js Developer):**
- ✅ Only ONE environment variable change needed
- ✅ No code changes required
- ✅ ~2 minutes to complete

**For Your Boss (Server Administrator):**
- ✅ ~15 files to copy
- ✅ Standard Node.js/Express setup
- ✅ Complete setup instructions included

---

## 🎯 Part 1: Code Changes Required (For You)

### **Summary**

**Only ONE change needed**: Update environment variable.

**No code changes required** - your code already supports connecting to any GraphQL server URL!

### **Step 1: Update Environment Variable**

In your `.env` file (or `.env.local`), change:

```env
# OLD (if exists)
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql

# NEW (update to your boss's server URL)
NEXT_PUBLIC_GRAPHQL_URL=https://graphql.yourcompany.com/graphql
```

### **Step 2: Restart Next.js Server**

```bash
# Stop your current dev server (Ctrl+C)
# Then restart:
npm run dev:insights
```

**That's it!** Your app will now connect to the new GraphQL server.

### **How It Works**

Your code already uses `getGraphQLUrl()` function which reads from `NEXT_PUBLIC_GRAPHQL_URL`:

**File**: `src/app/utils/api.ts`
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

**Used in**:
- `src/app/components/arrivals/ArrivalsPage.tsx` (line 822)
- `src/app/components/Shell/AimePanel.tsx` (line 146)

Both files already call `getGraphQLUrl()` and connect directly via `fetch()`. No code changes needed!

### **Verification Checklist**

After updating the environment variable:

- [ ] Updated `NEXT_PUBLIC_GRAPHQL_URL` in `.env` file
- [ ] Restarted Next.js dev server
- [ ] Tested AIME chat panel - queries work
- [ ] Tested Arrivals page - data loads correctly
- [ ] No connection errors in browser console
- [ ] GraphQL queries return expected results

---

## 📦 Part 2: Critical Files to Share with Boss

### **Quick File List**

**Total Files**: ~15 files

**Most Critical** (3 files):
1. `src/insights-server.ts` (entry point)
2. `src/app/api/graphql/schema.ts` (GraphQL API)
3. `src/app/lib/insights/db.ts` (database connection)

### **Complete File List**

#### **1. Main Server Entry Point** ⭐ CRITICAL
```
src/insights-server.ts
```

#### **2. GraphQL Schema & Resolvers** ⭐ CRITICAL
```
src/app/api/graphql/schema.ts
```

#### **3. Database & Connection** ⭐ CRITICAL
```
src/app/lib/insights/db.ts
src/app/lib/env.ts
src/app/lib/logger.ts
```

#### **4. SQL Utilities** ⭐ REQUIRED
```
src/app/lib/insights/sql/schema.ts
src/app/lib/insights/sql/guard.ts
src/app/lib/insights/sql/timeout.ts
src/app/lib/insights/sql/format.ts
```

#### **5. NLP & Scope Detection** ⭐ REQUIRED
```
src/app/lib/insights/nlp/scope.ts
src/app/lib/insights/nlp/context.ts
```

#### **6. Messages & Data** ⭐ REQUIRED
```
src/app/lib/insights/messages.ts
src/app/lib/insights/data.ts
```

#### **7. Configuration Files** ⭐ REQUIRED
```
package.json
tsconfig.json
```

#### **8. Database Scripts** (Optional but Recommended)
```
db-scripts/datadump_view.sql
```

### **Quick Copy Command (Linux/Mac)**

```bash
# Create directory structure
mkdir -p graphql-server/src/app/{api/graphql,lib/{insights/{sql,nlp},logger.ts,env.ts}}

# Copy files
cp src/insights-server.ts graphql-server/src/
cp src/app/api/graphql/schema.ts graphql-server/src/app/api/graphql/
cp src/app/lib/insights/*.ts graphql-server/src/app/lib/insights/
cp src/app/lib/insights/sql/*.ts graphql-server/src/app/lib/insights/sql/
cp src/app/lib/insights/nlp/*.ts graphql-server/src/app/lib/insights/nlp/
cp src/app/lib/logger.ts graphql-server/src/app/lib/
cp src/app/lib/env.ts graphql-server/src/app/lib/
cp package.json graphql-server/
cp tsconfig.json graphql-server/
cp db-scripts/datadump_view.sql graphql-server/ 2>/dev/null || true
```

### **Complete File Structure**

```
graphql-server/
├── src/
│   ├── insights-server.ts                    ⭐ MAIN ENTRY POINT
│   └── app/
│       ├── api/
│       │   └── graphql/
│       │       └── schema.ts                ⭐ GRAPHQL SCHEMA
│       └── lib/
│           ├── insights/
│           │   ├── db.ts                     ⭐ DATABASE CONNECTION
│           │   ├── messages.ts
│           │   ├── data.ts
│           │   ├── sql/
│           │   │   ├── schema.ts
│           │   │   ├── guard.ts
│           │   │   ├── timeout.ts
│           │   │   └── format.ts
│           │   └── nlp/
│           │       ├── scope.ts
│           │       └── context.ts
│           ├── logger.ts
│           └── env.ts
├── package.json                              ⭐ DEPENDENCIES
├── tsconfig.json                             ⭐ TYPESCRIPT CONFIG
└── .env.example                              ⭐ ENVIRONMENT TEMPLATE
```

---

## 🚀 Part 3: Complete Setup Guide (For Your Boss)

### **Overview**

This section provides complete setup instructions for creating the standalone GraphQL server.

### **1. Core Server Files (REQUIRED)**

#### **Main Server Entry Point**
- **File**: `src/insights-server.ts`
- **Purpose**: Express server with GraphQL Yoga endpoint
- **What it does**: Starts HTTP server on port 4000, handles CORS, exposes `/graphql` endpoint

#### **GraphQL Schema & Resolvers**
- **File**: `src/app/api/graphql/schema.ts`
- **Purpose**: GraphQL type definitions and resolver functions
- **What it does**: Defines the GraphQL API (queries, mutations, types), handles chat queries, generates SQL

### **2. Supporting Library Files (REQUIRED)**

#### **Database Connection**
- **File**: `src/app/lib/insights/db.ts`
- **Purpose**: PostgreSQL connection pool
- **Dependencies**: `src/app/lib/env.ts`, `src/app/lib/logger.ts`

#### **SQL Utilities**
- **File**: `src/app/lib/insights/sql/schema.ts` - Generates dynamic schema text from database
- **File**: `src/app/lib/insights/sql/guard.ts` - SQL security guards (PII detection, safe SELECT enforcement)
- **File**: `src/app/lib/insights/sql/timeout.ts` - SQL query timeout wrapper
- **File**: `src/app/lib/insights/sql/format.ts` - SQL result formatting utilities

#### **NLP & Scope Detection**
- **File**: `src/app/lib/insights/nlp/scope.ts` - Detects if queries are in-scope or out-of-scope
- **File**: `src/app/lib/insights/nlp/context.ts` - Builds conversation context for AI

#### **Messages & Data**
- **File**: `src/app/lib/insights/messages.ts` - User-facing error messages and constants
- **File**: `src/app/lib/insights/data.ts` - Static data (column names, suggestions)

#### **Logger & Environment**
- **File**: `src/app/lib/logger.ts` - Centralized logging utility
- **File**: `src/app/lib/env.ts` - Environment variable management

### **3. Configuration Files (REQUIRED)**

#### **Package Dependencies**
- **File**: `package.json`
- **Purpose**: Lists all npm dependencies
- **Key dependencies needed**:
  ```json
  {
    "graphql-yoga": "^5.0.0",
    "graphql": "^16.12.0",
    "express": "^4.22.1",
    "cors": "^2.8.5",
    "pg": "^8.16.3",
    "@ai-sdk/anthropic": "^2.0.56",
    "@ai-sdk/openai": "^2.0.88",
    "@ai-sdk/groq": "^2.0.33",
    "ai": "^5.0.116",
    "zod": "^3.x.x",
    "graphql-scalars": "^1.25.0"
  }
  ```

#### **TypeScript Configuration**
- **File**: `tsconfig.json`
- **Purpose**: TypeScript compiler configuration
- **Note**: May need path aliases (`@/app/*`) configured

### **4. Database Scripts (OPTIONAL but Recommended)**

#### **Database View Definition**
- **File**: `db-scripts/datadump_view.sql`
- **Purpose**: Creates the `public.attendee` view that the GraphQL server queries
- **Note**: Your boss needs access to the same PostgreSQL database or needs to create this view

### **Environment Variables Required**

Your boss needs to set up these environment variables:

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/database

# AI API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# Server Configuration
PORT=4000
CORS_ORIGIN=https://your-frontend-domain.com

# Optional: Logging
NODE_ENV=production
DATABASE_INIT_LOGGING=normal
```

### **Setup Instructions**

#### **Step 1: Copy Files**
Copy all files listed above to a new directory.

#### **Step 2: Install Dependencies**
```bash
npm install
```

#### **Step 3: Configure Environment**
Create `.env` file with database and API keys (see above).

#### **Step 4: Set Up Database**
Ensure the `public.attendee` view exists (from `datadump_view.sql`).

#### **Step 5: Start Server**
```bash
# Development
npx tsx src/insights-server.ts

# Production (with PM2 or similar)
pm2 start src/insights-server.ts --interpreter tsx
```

#### **Step 6: Verify**
```bash
# Health check
curl http://localhost:4000/health

# GraphQL test
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

### **What Happens After Setup**

#### **On Your Side (Next.js App):**
1. Update `.env`: `NEXT_PUBLIC_GRAPHQL_URL=https://graphql.yourcompany.com/graphql`
2. Restart Next.js server
3. Done! No code changes needed.

#### **On Boss's Side (GraphQL Server):**
1. Deploy server to production
2. Configure firewall/security
3. Set up SSL/HTTPS
4. Share production URL with you
5. Monitor logs

### **Verification Checklist (For Your Boss)**

- [ ] All files copied
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Database connection works
- [ ] `public.attendee` view exists
- [ ] Server starts without errors
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] GraphQL endpoint accepts queries
- [ ] CORS configured correctly
- [ ] Production deployment complete
- [ ] SSL/HTTPS configured
- [ ] Production URL shared

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────┐
│   Your Next.js App (Port 3000) │
│                                 │
│   - ArrivalsPage.tsx            │
│   - AimePanel.tsx               │
│   - Uses: getGraphQLUrl()       │
└──────────────┬──────────────────┘
               │
               │ Direct Connection
               │ (via fetch)
               │
               ▼
┌─────────────────────────────────┐
│  Boss's GraphQL Server          │
│  (Port 4000 or Production URL)  │
│                                 │
│  - insights-server.ts           │
│  - schema.ts (resolvers)        │
│  - Database connection          │
└──────────────┬──────────────────┘
               │
               │ SQL Queries
               │
               ▼
┌─────────────────────────────────┐
│   PostgreSQL Database           │
│   - public.attendee view        │
└─────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### **Connection Errors (For You)**

#### **Connection Error: "Failed to fetch"**
- ✅ Verify `NEXT_PUBLIC_GRAPHQL_URL` is correct
- ✅ Check if the GraphQL server is running
- ✅ Verify CORS is configured on the GraphQL server
- ✅ Check browser console for detailed error messages

#### **CORS Error**
Your boss needs to configure CORS on the GraphQL server:
```typescript
// In insights-server.ts
app.use(
    cors({
        origin: 'https://your-frontend-domain.com', // Your Next.js app URL
        credentials: true,
    })
);
```

#### **Environment Variable Not Working**
- ✅ Make sure variable name is `NEXT_PUBLIC_GRAPHQL_URL` (exact spelling)
- ✅ Restart Next.js server after changing `.env`
- ✅ Check `.env` file is in project root (same level as `package.json`)
- ✅ For production, set environment variable in deployment platform

### **Database Errors (For Your Boss)**
- ✅ Verify `DATABASE_URL` is correct
- ✅ Ensure `public.attendee` view exists
- ✅ Check database permissions
- ✅ Verify network connectivity

### **AI API Errors (For Your Boss)**
- ✅ Verify at least one AI API key is set
- ✅ Check API key validity
- ✅ Monitor API rate limits

---

## 📝 Summary

### **For You:**
- ✅ **One line change**: Update `NEXT_PUBLIC_GRAPHQL_URL` in `.env`
- ✅ **No code changes**: Everything else already works!
- ✅ **Time required**: ~2 minutes (update env var + restart server)

### **For Your Boss:**
- ✅ **~15 files** to copy (listed above)
- ✅ **Standard Node.js/Express setup**
- ✅ **Same dependencies** as your current setup
- ✅ **Same database** connection requirements

### **Files That Already Support This:**
- ✅ `src/app/utils/api.ts` - Has `getGraphQLUrl()` function
- ✅ `src/app/components/arrivals/ArrivalsPage.tsx` - Uses `getGraphQLUrl()`
- ✅ `src/app/components/Shell/AimePanel.tsx` - Uses `getGraphQLUrl()`

---

## 📞 Support

If your boss needs help:
1. Share this document
2. Point them to `src/insights-server.ts` as the entry point
3. Ensure they have database access
4. Verify environment variables are set correctly

---

**Last Updated:** February 2, 2026, 12:00 PM UTC
