# GraphQL Server Setup - Complete Guide

## 📋 Table of Contents
1. [Quick Summary](#quick-summary)
2. [Current Architecture Explained](#current-architecture-explained)
3. [What is Prisma?](#what-is-prisma)
4. [Files Required for Separate GraphQL Server](#files-required-for-separate-graphql-server)
5. [Code Changes Needed](#code-changes-needed)
6. [Environment Variables](#environment-variables)
7. [Deployment Checklist](#deployment-checklist)
8. [Quick Start Guide](#quick-start-guide)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Summary

### **Current Setup:**
- **GraphQL Server**: Runs locally on port 4000 (`insights-server.ts`)
- **Database**: PostgreSQL (using `pg` library, **NOT Prisma**)
- **Frontend**: Next.js proxies requests via `/api/graphql/route.ts`

### **What Your Boss Needs:**
1. **Core Files**: `schema.ts`, `insights-server.ts`, supporting library files (~14 files)
2. **Dependencies**: All packages from `package.json`
3. **Environment Variables**: Database URL, AI API keys, server config
4. **Database Access**: Connection to the same PostgreSQL database

### **What Changes You Need to Make:**
- **Minimal!** Just update `GRAPHQL_URL` environment variable in `src/app/api/graphql/route.ts`
- The proxy will automatically forward to the new server
- No code changes needed in components

### **What is Prisma?**
- **Prisma** = ORM tool (you're **NOT** using it)
- You're using **raw SQL** with `pg` library instead
- This gives you more control and flexibility for AI-generated queries

---

## 🏗️ Current Architecture Explained

### Current Setup (Local Development)

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Current Setup                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐      │
│  │  Next.js Server   │         │  GraphQL Server    │      │
│  │  (Port 3000)      │────────▶│  (Port 4000)      │      │
│  │                   │  Proxy  │                   │      │
│  │  - Frontend UI    │         │  - GraphQL Yoga   │      │
│  │  - API Routes     │         │  - Schema/Resolvers│      │
│  │  - Proxy Layer    │         │  - AI Integration │      │
│  └──────────────────┘         └──────────────────┘      │
│           │                              │                  │
│           │                              │                  │
│           ▼                              ▼                  │
│  ┌──────────────────┐         ┌──────────────────┐      │
│  │   PostgreSQL     │         │   PostgreSQL      │      │
│  │   (Workflows DB)  │         │   (Attendee DB)   │      │
│  └──────────────────┘         └──────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**How it works:**
1. **Frontend** (Browser) → Calls `/api/graphql` (Next.js)
2. **Next.js Proxy** (`/api/graphql/route.ts`) → Forwards to `http://localhost:4000/graphql`
3. **GraphQL Server** (`insights-server.ts`) → Processes GraphQL queries
4. **Database** → PostgreSQL queries via `pg` library (NOT Prisma)

---

## ❓ What is Prisma?

### **Prisma** (NOT USED IN YOUR PROJECT)

**Prisma** is a modern **ORM (Object-Relational Mapping)** tool that:
- Generates type-safe database clients
- Provides a query builder API
- Auto-generates TypeScript types from your database schema
- Handles migrations and schema management

**Example Prisma Usage:**
```typescript
// With Prisma (you're NOT using this)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const users = await prisma.user.findMany();
```

### **Your Current Setup** (Raw PostgreSQL)

You're using **raw PostgreSQL queries** with the `pg` library:

```typescript
// Your current approach (in schema.ts)
import { Pool } from 'pg';
const pool = getInsightsPool();
const result = await pool.query('SELECT * FROM attendee WHERE event_id = $1', [eventId]);
const rows = result.rows;
```

**Why you're NOT using Prisma:**
- You're using direct SQL queries for flexibility
- You have a SQL VIEW (`public.attendee`) that Prisma might not handle well
- You need full control over SQL generation for AI queries
- Simpler setup - no schema generation needed

---

## 📦 Files Required for Separate GraphQL Server

### **Core Files (MUST HAVE)**

1. **`src/insights-server.ts`**
   - **Purpose**: Standalone GraphQL server entry point
   - **Contains**: Express server setup, GraphQL Yoga configuration
   - **Size**: ~89 lines
   - **Note**: This is what runs on port 4000

2. **`src/app/api/graphql/schema.ts`**
   - **Purpose**: GraphQL schema definitions and resolvers
   - **Contains**: 
     - GraphQL type definitions (`typeDefs`)
     - Resolver functions (including the `chat` mutation)
     - AI integration logic
     - SQL query execution
   - **Size**: ~1373 lines
   - **Dependencies**: All the imports at the top

### **Supporting Files (REQUIRED)**

3. **`src/app/lib/insights/db.ts`**
   - **Purpose**: PostgreSQL connection pool management
   - **Contains**: Database connection logic
   - **Why needed**: GraphQL resolvers need database access

4. **`src/app/lib/insights/sql/schema.ts`**
   - **Purpose**: Database schema information for AI
   - **Contains**: Table/column metadata that AI uses to generate SQL

5. **`src/app/lib/insights/sql/guard.ts`**
   - **Purpose**: SQL safety checks (prevents malicious SQL)
   - **Contains**: `ensureSafeSelect`, `containsPII`, etc.

6. **`src/app/lib/insights/sql/timeout.ts`**
   - **Purpose**: Query timeout handling
   - **Contains**: `queryWithTimeout` function

7. **`src/app/lib/insights/sql/format.ts`**
   - **Purpose**: SQL formatting utilities
   - **Contains**: SQL formatting functions

8. **`src/app/lib/insights/nlp/scope.ts`**
   - **Purpose**: Determines if queries are in-scope or out-of-scope
   - **Contains**: `detectScopeAndCategory`, `containsOosKeyword`

9. **`src/app/lib/insights/nlp/context.ts`**
   - **Purpose**: Builds conversation context for AI
   - **Contains**: `buildContextSummary`, `InsightsChatMsg` type

10. **`src/app/lib/insights/messages.ts`**
    - **Purpose**: Centralized error messages
    - **Contains**: `ERROR_MESSAGES`, `OUT_OF_SCOPE_MESSAGE`, etc.

11. **`src/app/lib/insights/data.ts`**
    - **Purpose**: Fallback data if database is unavailable
    - **Contains**: `insightsAttendeeColumns`, `insightsArrivalsRows`

### **Configuration Files**

12. **`src/app/lib/env.ts`** (Optional - may need simplification)
    - **Purpose**: Environment variable configuration
    - **Note**: This file is designed for Next.js. For standalone server, you can:
      - **Option A**: Use it as-is (it will work, but has Next.js-specific configs)
      - **Option B**: Simplify it to only use `process.env` directly
      - **Option C**: Remove the import from `db.ts` and use `process.env` directly there
    - **Current usage**: Only used for logging configuration in `db.ts`

13. **`package.json`**
    - **Purpose**: Lists all required npm dependencies
    - **Key dependencies**:
      - `graphql-yoga`: GraphQL server framework
      - `graphql`: GraphQL core library
      - `graphql-scalars`: JSON scalar support
      - `pg`: PostgreSQL client
      - `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/groq`: AI SDKs
      - `ai`: AI SDK core
      - `express`: HTTP server
      - `cors`: CORS middleware
      - `zod`: Schema validation

14. **`tsconfig.json`**
    - **Purpose**: TypeScript configuration

### **Complete Directory Structure**

```
AI/
├── src/
│   ├── insights-server.ts                    ⭐ MAIN SERVER FILE
│   └── app/
│       ├── api/
│       │   └── graphql/
│       │       └── schema.ts                ⭐ GRAPHQL SCHEMA & RESOLVERS
│       └── lib/
│           ├── env.ts                       ⭐ ENVIRONMENT CONFIG (if exists)
│           └── insights/
│               ├── db.ts                    ⭐ DATABASE CONNECTION
│               ├── messages.ts              ⭐ ERROR MESSAGES
│               ├── data.ts                  ⭐ FALLBACK DATA
│               ├── sql/
│               │   ├── schema.ts            ⭐ DB SCHEMA FOR AI
│               │   ├── guard.ts             ⭐ SQL SAFETY
│               │   ├── timeout.ts          ⭐ QUERY TIMEOUT
│               │   └── format.ts            (SQL formatting)
│               └── nlp/
│                   ├── scope.ts             ⭐ SCOPE DETECTION
│                   └── context.ts            ⭐ CONTEXT BUILDING
├── package.json                              ⭐ DEPENDENCIES
└── tsconfig.json                             ⭐ TYPESCRIPT CONFIG
```

**⭐ = Critical files (must have)**

### **How to Identify All Required Files**

The GraphQL server (`schema.ts`) imports these files. Check the imports at the top of `schema.ts`:

```typescript
import { ... } from "@/app/lib/insights/data";
import { ... } from "@/app/lib/insights/sql/schema";
import { ... } from "@/app/lib/insights/sql/guard";
import { ... } from "@/app/lib/insights/sql/timeout";
import { ... } from "@/app/lib/insights/nlp/scope";
import { ... } from "@/app/lib/insights/nlp/context";
import { ... } from "@/app/lib/insights/messages";
import { getInsightsPool } from "@/app/lib/insights/db";
```

**All these imported files are required!**

---

## 🔧 Code Changes Needed

### **Option 1: Keep Next.js Proxy (Recommended)**

**If your boss sets up the GraphQL server on a separate server (e.g., `https://graphql.yourcompany.com`):**

#### **Changes in `src/app/api/graphql/route.ts`:**

```typescript
// Change this line (line 6):
const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:4000/graphql';

// To:
const GRAPHQL_URL = process.env.GRAPHQL_URL || 'https://graphql.yourcompany.com/graphql';
```

#### **Changes in `.env.local` or production environment:**

```env
# Old (local)
GRAPHQL_URL=http://localhost:4000/graphql

# New (separate server)
GRAPHQL_URL=https://graphql.yourcompany.com/graphql
```

#### **No other code changes needed!** ✅

The Next.js proxy will automatically forward all requests to the new server.

---

### **Option 2: Direct Connection (No Proxy)**

**If you want the frontend to connect directly to the GraphQL server:**

#### **Changes in `src/app/components/Shell/AimePanel.tsx`:**

```typescript
// OLD (via Next.js proxy):
const response = await apiFetch("/api/graphql", { ... });

// NEW (direct connection):
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://graphql.yourcompany.com/graphql';
const response = await fetch(GRAPHQL_URL, { ... });
```

#### **Changes needed:**
1. Update `AimePanel.tsx` to use direct URL
2. Ensure CORS is configured on GraphQL server
3. Remove or disable `/api/graphql/route.ts` (or keep as fallback)

---

## 🔐 Environment Variables

### **For the Separate GraphQL Server:**

Create a `.env` file on the GraphQL server:

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/database

# AI API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...  # Optional

# Server Configuration
PORT=4000
CORS_ORIGIN=https://your-frontend-domain.com
# OR for multiple origins:
# CORS_ORIGIN=https://app1.com,https://app2.com

# Optional: Logging
NODE_ENV=production
```

### **For Next.js (Frontend):**

```env
# GraphQL Server URL
GRAPHQL_URL=https://graphql.yourcompany.com/graphql

# OR if using direct connection:
NEXT_PUBLIC_GRAPHQL_URL=https://graphql.yourcompany.com/graphql
```

---

## 📝 Deployment Checklist

### **✅ Files Checklist (Share with Your Boss)**

#### **Core Server Files**
- [ ] `src/insights-server.ts` - Main server entry point
- [ ] `src/app/api/graphql/schema.ts` - GraphQL schema & resolvers (~1373 lines)

#### **Database & SQL Files**
- [ ] `src/app/lib/insights/db.ts` - PostgreSQL connection pool
- [ ] `src/app/lib/insights/sql/schema.ts` - Database schema for AI
- [ ] `src/app/lib/insights/sql/guard.ts` - SQL safety checks
- [ ] `src/app/lib/insights/sql/timeout.ts` - Query timeout
- [ ] `src/app/lib/insights/sql/format.ts` - SQL formatting

#### **AI & NLP Files**
- [ ] `src/app/lib/insights/nlp/scope.ts` - Scope detection
- [ ] `src/app/lib/insights/nlp/context.ts` - Context building

#### **Configuration Files**
- [ ] `src/app/lib/insights/messages.ts` - Error messages
- [ ] `src/app/lib/insights/data.ts` - Fallback data
- [ ] `src/app/lib/env.ts` - Environment config (optional - can simplify)
- [ ] `package.json` - Dependencies list
- [ ] `tsconfig.json` - TypeScript configuration

---

### **🔧 Code Changes Checklist (For You)**

#### **When Separate Server is Ready:**

- [ ] Update `src/app/api/graphql/route.ts` line 6:
  ```typescript
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'https://graphql.yourcompany.com/graphql';
  ```
  
- [ ] OR set environment variable:
  ```env
  GRAPHQL_URL=https://graphql.yourcompany.com/graphql
  ```

- [ ] Restart Next.js dev server

- [ ] Test a query in AIME panel

- [ ] Verify logs show `[Next.js GraphQL Proxy]` messages

---

### **🔐 Environment Variables Checklist (For Your Boss)**

#### **Required:**
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `OPENAI_API_KEY` - OpenAI API key
- [ ] `ANTHROPIC_API_KEY` - Anthropic API key
- [ ] `PORT` - Server port (default: 4000)

#### **Optional:**
- [ ] `GROQ_API_KEY` - Groq API key (optional)
- [ ] `CORS_ORIGIN` - CORS origin (default: `*`)
- [ ] `NODE_ENV` - Environment (production/development)

---

### **🚀 Deployment Steps Checklist (For Your Boss)**

- [ ] Copy all files from checklist above
- [ ] Run `npm install` to install dependencies
- [ ] Create `.env` file with all environment variables
- [ ] Test locally: `npx tsx src/insights-server.ts`
- [ ] Verify health endpoint: `curl http://localhost:4000/health`
- [ ] Test GraphQL endpoint with a simple query:
  ```bash
  curl -X POST http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __typename }"}'
  ```
- [ ] Deploy to production server
- [ ] Configure firewall/security rules
- [ ] Set up SSL/HTTPS (if needed)
- [ ] Share production URL with you
- [ ] Monitor logs for errors

---

### **✅ Verification Checklist (After Deployment)**

- [ ] Health endpoint returns `{"status":"ok","service":"insights-backend"}`
- [ ] GraphQL endpoint accepts POST requests
- [ ] CORS is configured correctly (if frontend is on different domain)
- [ ] Database connection works
- [ ] AI API keys are valid
- [ ] Test query works: `{"query": "{ __typename }"}`
- [ ] Test chat query works: `{"query": "mutation { chat(input: {question: \"test\"}) { ok answer } }"}`

---

## 🚀 Quick Start Guide

### **For Your Boss (GraphQL Server Setup):**

1. **Copy all files** from the structure above
2. **Run**: `npm install`
3. **Create `.env`** with database and API keys:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/database
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   PORT=4000
   CORS_ORIGIN=https://your-frontend-domain.com
   ```
4. **Run**: `npx tsx src/insights-server.ts`
5. **Test**: `curl http://localhost:4000/health`
   - Should return: `{"status":"ok","service":"insights-backend"}`
6. **Test GraphQL**: 
   ```bash
   curl -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"{ __typename }"}'
   ```
7. **Deploy** to production server
8. **Share** the production URL with you

### **For You (Next.js Frontend Changes):**

1. **Update Environment Variable**:
   ```env
   GRAPHQL_URL=https://graphql.yourcompany.com/graphql
   ```
2. **Test Connection**:
   - Restart Next.js dev server
   - Try a query in the AIME panel
   - Check logs for `[Next.js GraphQL Proxy]` messages
3. **Verify CORS**:
   - If you get CORS errors, ask your boss to update `CORS_ORIGIN` in GraphQL server `.env`
4. **Remove Local Server** (optional):
   - You can stop running `insights-server.ts` locally
   - Or keep it for local development

---

## 🆘 Troubleshooting

### **If CORS errors:**
- Update `CORS_ORIGIN` in GraphQL server `.env` to include your frontend domain
- Example: `CORS_ORIGIN=https://app.yourcompany.com,https://localhost:3000`

### **If connection errors:**
- Verify `GRAPHQL_URL` is correct
- Check firewall rules
- Verify SSL certificate (if using HTTPS)
- Check network connectivity between servers

### **If database errors:**
- Verify `DATABASE_URL` is correct
- Check database is accessible from server
- Verify database user has proper permissions
- Check database connection pool limits

### **If AI errors:**
- Verify API keys are correct
- Check API key has access to requested models (e.g., `gpt-5-mini`)
- Check API rate limits
- Verify API key format (no extra spaces or quotes)

### **If GraphQL query errors:**
- Check GraphQL server logs for detailed error messages
- Verify schema matches between frontend and backend
- Check request format (Content-Type: application/json)
- Verify query syntax is correct

### **If 500 Internal Server Error:**
- Check GraphQL server logs for detailed error
- Verify all environment variables are set correctly
- Check database connection is working
- Verify all required files are present
- Check for serialization errors in response

---

## 📧 Files to Share in Google Drive

Create a folder structure:

```
GraphQL-Server-Setup/
├── 01-Core-Server/
│   ├── insights-server.ts
│   └── README.md (instructions)
├── 02-GraphQL-Schema/
│   ├── schema.ts
│   └── README.md (explanation)
├── 03-Supporting-Libraries/
│   ├── db.ts
│   ├── messages.ts
│   ├── data.ts
│   ├── sql/
│   │   ├── schema.ts
│   │   ├── guard.ts
│   │   ├── timeout.ts
│   │   └── format.ts
│   └── nlp/
│       ├── scope.ts
│       └── context.ts
├── 04-Configuration/
│   ├── package.json
│   ├── tsconfig.json (if exists)
│   ├── env.ts (if exists)
│   └── .env.example
└── 05-Documentation/
    └── GRAPHQL_SERVER_SETUP_COMPLETE.md (this file)
```

---

## 📚 Summary

### **What You're Currently Using:**
- ✅ **Raw PostgreSQL** (`pg` library) - NOT Prisma
- ✅ **GraphQL Yoga** - GraphQL server framework
- ✅ **Standalone Express Server** - Runs on port 4000
- ✅ **Next.js Proxy** - Routes `/api/graphql` → `localhost:4000/graphql`

### **What Your Boss Needs:**
1. **Core Files**: `schema.ts`, `insights-server.ts`, supporting library files
2. **Dependencies**: All packages from `package.json`
3. **Environment Variables**: Database URL, AI API keys, server config
4. **Database Access**: Connection to the same PostgreSQL database

### **What Changes You Need to Make:**
- **Minimal!** Just update `GRAPHQL_URL` environment variable
- The proxy will automatically forward to the new server
- No code changes needed in components

### **What is Prisma?**
- **Prisma** = ORM tool (you're NOT using it)
- You're using **raw SQL** with `pg` library instead
- This gives you more control and flexibility for AI-generated queries

---

**That's it!** 🎉
