# AIME Insights - Complete Guide

This is the comprehensive guide for AIME Insights features integrated into this project. It covers setup, file organization, running the application, and troubleshooting.

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [File Organization & Separation](#-file-organization--separation)
3. [Setup Instructions](#-setup-instructions)
4. [Running the Application](#-running-the-application)
5. [Windows-Specific Instructions](#-windows-specific-instructions)
6. [Testing & Verification](#-testing--verification)
7. [Troubleshooting](#-troubleshooting)
8. [Usage Guide](#-usage-guide)
9. [Architecture & Function Flows](#-architecture--function-flows)

---

## ⚡ Quick Start

### Fastest Way to Get Started

```powershell
# 1. Navigate to project
cd D:\Sathish\AI\AI

# 2. Install dependencies
npm install

# 3. Setup PostgreSQL (first time only)
psql -U postgres -f db-scripts/attendee_setup.sql

# 4. Run the application
npm run dev:insights
```

Then open: **http://localhost:3000/aime/insights**

---

## 📁 File Organization & Separation

### ✅ Complete Separation Achieved

All insights-related files have been **completely separated** from existing workflow files with clear naming conventions and dedicated directory structures.

### Insights-Specific Files (Completely Isolated)

```
src/app/
├── lib/
│   └── insights/                    ← ALL insights lib files here
│       ├── db.ts                    ← PostgreSQL for insights (separate from workflow DB)
│       ├── data.ts                  ← Insights mock data
│       ├── ui-store.tsx             ← Insights UI state
│       ├── sql/
│       │   ├── guard.ts            ← SQL security
│       │   ├── schema.ts           ← Schema utilities
│       │   ├── timeout.ts          ← Query timeout
│       │   └── format.ts            ← Result formatting
│       └── nlp/
│           ├── scope.ts             ← Scope detection
│           └── context.ts           ← Context building
│
├── components/
│   ├── Shell/                       ← Insights shell components (renamed with Insights prefix)
│   │   ├── AppShell.tsx            → InsightsAppShell
│   │   ├── Sidebar.tsx              → InsightsSidebar
│   │   ├── Topbar.tsx               → InsightsTopbar
│   │   └── AimePanel.tsx           → InsightsAimePanel
│   ├── insights/                    ← Insights page components
│   │   ├── InsightsPage.tsx
│   │   ├── ReportCard.tsx          → InsightsReportCard
│   │   ├── ReportsAccordion.tsx    → InsightsReportsAccordion
│   │   └── SystemReports.tsx       → InsightsSystemReports
│   └── arrivals/                    ← Arrivals components
│       ├── ArrivalsPage.tsx        → InsightsArrivalsPage
│       └── ArrivalsTable.tsx       → InsightsArrivalsTable
│
└── api/
    ├── chat/                        ← Insights chat API
    │   └── route.ts
    └── graphql/                     ← Insights GraphQL API
        ├── route.ts
        └── schema.ts
```

### Existing Workflow Files (Unchanged)

```
src/app/
├── lib/
│   ├── dal.ts                       ← Workflow data access (UNCHANGED)
│   ├── env.ts                       ← Workflow env (UNCHANGED)
│   └── ...                          ← Other workflow libs (UNCHANGED)
│
├── utils/
│   └── mongodb-connection.ts       ← Workflow MongoDB (UNCHANGED)
│
├── components/
│   ├── AimeWorkflowPane.tsx         ← Workflow components (UNCHANGED)
│   └── ...                          ← All workflow components (UNCHANGED)
│
└── api/
    ├── generate-workflow/           ← Workflow APIs (UNCHANGED)
    └── ...                          ← All workflow APIs (UNCHANGED)
```

### Naming Conventions

**Function/Component Prefixes:**
- ✅ `getInsightsPool()` - PostgreSQL pool for insights
- ✅ `InsightsAppShell` - Insights shell component
- ✅ `InsightsSidebar` - Insights sidebar
- ✅ `InsightsAimePanel` - Insights chat panel
- ✅ `useInsightsUI()` - Insights UI hook

**Data Exports:**
- ✅ `insightsMyReports` - My reports data
- ✅ `insightsSharedReports` - Shared reports data
- ✅ `insightsAttendanceReports` - Attendance reports
- ✅ `insightsSuggestions` - Chat suggestions
- ✅ `insightsAttendeeColumns` - Column definitions

**Note:** Insights does not use MongoDB. Chat conversations are not persisted.

### Key Separation Points

1. **Database Connections:**
   - Workflow: `utils/mongodb-connection.ts` (MongoDB)
   - Insights: `lib/insights/db.ts` (PostgreSQL only - no MongoDB)

2. **Data Storage:**
   - Workflow: Uses MongoDB for `workflowTemplates`, `aimeConversations`, etc.
   - Insights: Uses PostgreSQL only - no conversation persistence

3. **Naming Conventions:**
   - All insights functions/components prefixed with `Insights`
   - All insights data prefixed with `insights`
   - Clear file headers: `// INSIGHTS-SPECIFIC:`

4. **Directory Structure:**
   - All insights lib files in `lib/insights/` subdirectory
   - No mixing with workflow files

### File Headers

All insights files include clear headers:

```typescript
// INSIGHTS-SPECIFIC: [Description]
```

This makes it immediately clear which files belong to insights vs workflows.

---

## 🚀 Setup Instructions

### 1. Install Dependencies

The package.json has been updated with insights-specific dependencies. Install them:

```powershell
cd D:\Sathish\AI\AI
npm install
```

**New Dependencies Added:**
- `pg` - PostgreSQL client
- `graphql` & `graphql-yoga` - GraphQL support
- `@ai-sdk/groq` & `@ai-sdk/openai` - Additional AI providers
- `xlsx` & `jspdf` - Export functionality
- `remark-gfm` - GitHub Flavored Markdown support
- `cross-env` - Cross-platform environment variables (for Windows)

**Note:** MongoDB is not required for insights. Only PostgreSQL is needed.

### 2. Environment Variables

Create a `.env.local` file in the project root with:

```env
# PostgreSQL Database (for attendee data)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/attendee

# AI API Keys (required for chat functionality)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GROQ_API_KEY=your_groq_key_here  # Optional
```

**Note:** MongoDB environment variables are not required for insights. Chat conversations are not persisted.

**Important:** Replace:
- `your_password` with your PostgreSQL password
- `your_openai_key_here` with your actual OpenAI API key
- `your_anthropic_key_here` with your actual Anthropic API key

### 3. Database Setup

#### PostgreSQL Setup

1. **Install PostgreSQL** (if not already installed)

2. **Create the attendee database:**
   ```powershell
   psql -U postgres -f db-scripts/attendee_setup.sql
   ```

   Or manually:
   ```sql
   CREATE DATABASE attendee;
   \c attendee
   -- Then run the SQL from attendee_setup.sql
   ```

3. **Verify the connection:**
   ```powershell
   psql -U postgres -d attendee -c "SELECT COUNT(*) FROM public.attendee;"
   ```

   Expected output: Should show a count (50 rows if setup was successful)

#### MongoDB Setup

**Note:** MongoDB is NOT required for insights. Chat conversations are not persisted. Only PostgreSQL is needed for insights functionality.

---

## 🖥️ Running the Application

### Standard Method (Cross-Platform)

After installing `cross-env`:

```powershell
npm run dev
```

### Insights-Specific Script (Recommended for Windows)

```powershell
npm run dev:insights
```

This script works on Windows and doesn't require SSL certificates.

### Manual Windows Command (Alternative)

If you prefer to run manually:

**PowerShell:**
```powershell
$env:PORT=3000; npx next dev
```

**Command Prompt:**
```cmd
set PORT=3000 && npx next dev
```

### Expected Output

When successful, you should see:

```
▲ Next.js 16.1.0
- Local:        http://localhost:3000

✓ Ready in 2.5s
○ Compiling /aime/insights ...
✓ Compiled /aime/insights in 1.2s
[Insights DB] DATABASE_URL presence: true
[Insights DB] DATABASE_URL starts with: postgresql://post...
[Insights DB] Initializing new pool...
```

### Access URLs

Once running, access:

- **Main App**: http://localhost:3000/aime/
- **Insights**: http://localhost:3000/aime/insights
- **Arrivals**: http://localhost:3000/aime/arrivals
- **Chat API**: http://localhost:3000/aime/api/chat
- **GraphQL API**: http://localhost:3000/aime/api/graphql

---

## 🪟 Windows-Specific Instructions

### Quick Fix for Windows

The `npm run dev` command uses Unix-style environment variables that don't work on Windows. Here's how to fix it:

### Option 1: Use the Insights-Specific Dev Script (Recommended)

```powershell
npm run dev:insights
```

This script doesn't require SSL certificates and works perfectly for insights development.

### Option 2: Install cross-env (For Full Compatibility)

The package.json has been updated to use `cross-env` for cross-platform support. Install it:

```powershell
npm install
```

Then use:
```powershell
npm run dev
```

### Option 3: Manual Windows Command

**PowerShell:**
```powershell
$env:PORT=3000; next dev
```

**Command Prompt:**
```cmd
set PORT=3000 && next dev
```

### Windows Setup Steps

1. **Install Dependencies:**
   ```powershell
   cd D:\Sathish\AI\AI
   npm install
   ```

2. **Setup Environment Variables** (create `.env.local`)

3. **Setup PostgreSQL:**
   ```powershell
   psql -U postgres -f db-scripts/attendee_setup.sql
   ```

4. **Start MongoDB:**
   ```powershell
   npm run mongodb up
   ```

5. **Run the Application:**
   ```powershell
   npm run dev:insights
   ```

---

## 🧪 Testing & Verification

### Test 1: Verify Insights Page Loads

1. Open: http://localhost:3000/aime/insights
2. You should see:
   - Sidebar on the left
   - Main content area with "Insights" heading
   - AIME chat panel on the right (if open)
   - "My Reports" and "System Reports" tabs

### Test 2: Test Chat Functionality

1. In the AIME panel (right side), try asking:
   - "How many attendees are registered?"
   - "Show me total attendance numbers"
   - "Which sessions had the highest attendance?"

2. The AI should:
   - Process your question
   - Generate SQL query
   - Execute against PostgreSQL
   - Return formatted answer

### Test 3: Test Arrivals Page

1. Navigate to: http://localhost:3000/aime/arrivals
2. Data should automatically load on page mount
3. You should see:
   - Attendee data automatically loaded from PostgreSQL
   - Table with attendee information
   - Search functionality working (press Enter to search)
   - Page fits viewport without vertical scrolling

### Test 4: Test GraphQL API

Open a new terminal and test the GraphQL endpoint:

```powershell
# Test GraphQL query (PowerShell)
Invoke-RestMethod -Uri "http://localhost:3000/aime/api/graphql" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"query":"{ arrivalColumns }"}'
```

Or use a GraphQL client like Postman or Insomnia.

### Success Checklist

- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env.local` file created with PostgreSQL and AI API keys
- [ ] PostgreSQL database `attendee` created and populated
- [ ] Development server starts without errors
- [ ] Can access http://localhost:3000/aime/insights
- [ ] Chat functionality works (can ask questions)
- [ ] Arrivals page auto-loads data from PostgreSQL
- [ ] Page layout fits viewport without vertical scrolling

---

## 🐛 Troubleshooting

### Common Issues

#### 1. PostgreSQL Connection Errors

**Error:** `Database pool not initialized. Check DATABASE_URL.`

**Solution:**
- Verify `DATABASE_URL` is set in `.env.local`
- Check PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -U postgres -l | grep attendee`
- Test connection: `psql -U postgres -d attendee -c "SELECT 1;"`

**Windows Commands:**
```powershell
# Check PostgreSQL is running
pg_isready

# Connect to database
psql -U postgres -d attendee

# Check table exists
\dt public.attendee

# Check data
SELECT COUNT(*) FROM public.attendee;

# View sample data
SELECT * FROM public.attendee LIMIT 5;
```

#### 2. MongoDB Not Required

**Note:** MongoDB is NOT required for insights. If you see MongoDB-related errors, they can be ignored as insights does not use MongoDB. Only PostgreSQL is needed.

#### 3. AI API Errors

**Error:** Chat API returns errors or timeouts

**Solution:**
- Verify API keys are set correctly in `.env.local`
- Check API key permissions and quotas
- Review console logs for specific error messages
- Try switching AI provider in `src/app/api/chat/route.ts` (line 49)

#### 4. GraphQL Query Errors

**Error:** GraphQL queries fail or return empty results

**Solution:**
- Verify PostgreSQL connection and data
- Check that `attendee` table exists and has data
- Review GraphQL schema in `src/app/api/graphql/schema.ts`
- Check browser console for specific GraphQL errors

#### 5. Import Path Errors

**Error:** Module not found or import errors

**Solution:**
- Ensure all dependencies are installed: `npm install`
- Check import paths use `@/app/lib/insights/` prefix
- Verify TypeScript paths in `tsconfig.json`

#### 6. Build Errors

**Error:** Build fails with TypeScript or dependency errors

**Solution:**
```powershell
# Clear Next.js cache
Remove-Item -Recurse -Force .next

# Reinstall dependencies
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install

# Rebuild
npm run build
```

#### 7. Port 3000 Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
$env:PORT=3002; npx next dev
```

#### 8. Windows Environment Variable Errors

**Error:** `'NODE_EXTRA_CA_CERTS' is not recognized`

**Solution:**
- Install `cross-env`: `npm install cross-env --save-dev`
- Use `npm run dev:insights` instead
- Or use manual PowerShell command: `$env:PORT=3000; npx next dev`

#### 9. cross-env Not Found

**Error:** `'cross-env' is not recognized`

**Solution:**
```powershell
npm install cross-env --save-dev
```

---

## 📝 Usage Guide

### Layout & Design

The insights pages are optimized for viewport fit:
- **No Vertical Scrolling**: Pages fit within the viewport height
- **Flexbox Layout**: Uses flexbox for proper space distribution
- **Auto-Loading**: Data automatically loads on page mount
- **Responsive**: Adapts to different screen sizes

### Accessing Insights

1. Navigate to `http://localhost:3000/aime/insights`
2. You'll see the Insights page with:
   - My Reports section
   - Shared Reports section
   - System Reports section
   - All content fits within viewport (no page scrolling)

### Using the Chat Feature

1. The AIME panel should be visible on the right side
2. Click on a suggested question or type your own
3. The AI will:
   - Analyze your question
   - Generate SQL query
   - Execute against PostgreSQL
   - Return formatted answer

**Example Questions:**
- "How many attendees are registered?"
- "Show me total attendance numbers by ticket type"
- "Which sessions had the highest attendance?"
- "Compare VIP vs regular attendee participation"
- "Show attendee registration trends over time"

### Viewing Arrivals Data

1. Navigate to `http://localhost:3000/aime/arrivals`
2. Page displays **"Attendance Report"** title with **"Attendance"** badge
3. Data automatically loads from PostgreSQL on page mount
4. **10 rows** displayed by default (fits viewport without scrolling)
5. Use search box and press Enter to filter attendees
6. Click **"Pick Columns"** to customize visible columns
7. Export data using **"Export"** button (with downward arrow icon)
8. **"Save to My Reports"** button available in top-right
9. When more than 10 rows exist, click **"Show More"** to enable scrolling
10. Excel exports include standardized header rows:
    - Row 1: "Event Data"
    - Row 2: "Downloaded data"
    - Row 3: Download timestamp (e.g., "Wednesday, December 10, 2025, 6:23 AM")
    - Row 4: Privacy notice
    - Row 5: Empty
    - Row 6: Column headers (in exact order matching table display)
    - Row 7+: Data rows (columns in exact order matching table display)
11. **Column Ordering**: Excel export columns match the exact order shown in the table (using `aoa_to_sheet` for precision)
12. **Table Display**: Read-only table (no drag-and-drop or sorting arrows in main view)
13. **Progress Indicator**: Real-time export progress with percentage and status messages
14. **Timeout Protection**: 30-second automatic timeout with user notification

### API Endpoints

**Chat API** (`/api/chat`):
- Accepts natural language questions
- Converts to SQL queries
- Returns formatted answers
- Note: Conversation history is not persisted (no MongoDB)

**GraphQL API** (`/api/graphql`):
- Provides `arrivals` query for attendee data
- Provides `arrivalColumns` query for column metadata
- Supports search and pagination

---

## 🏗️ Architecture & Function Flows

This section provides a comprehensive explanation of the AIME Insights architecture, function flows, component interactions, and data processing mechanisms.

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ InsightsPage │  │ArrivalsPage  │  │ AimePanel    │         │
│  │              │  │              │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          │ GraphQL         │ GraphQL         │ REST API
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼──────────────────┐
│         │                 │                 │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐         │
│  │ GraphQL API  │  │ GraphQL API  │  │ Chat API     │         │
│  │ (schema.ts)  │  │ (schema.ts)  │  │ (route.ts)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼──────────────────┐
│         │                 │                 │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐         │
│  │ SQL Guard    │  │ SQL Guard    │  │ NLP Scope    │         │
│  │ (guard.ts)   │  │ (guard.ts)   │  │ (scope.ts)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼──────────────────┐
│         │                 │                 │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐         │
│  │ Query        │  │ Query        │  │ AI/LLM       │         │
│  │ Timeout      │  │ Timeout      │  │ (generate)   │         │
│  │ (timeout.ts) │  │ (timeout.ts) │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │  PostgreSQL Pool   │
                  │    (db.ts)         │
                  └─────────┬─────────┘
                            │
                  ┌─────────▼─────────┐
                  │   PostgreSQL      │
                  │   Database        │
                  └───────────────────┘
```

### Core Components & Their Responsibilities

#### 1. **Client Components**

**`InsightsAimePanel.tsx`** - Chat Interface Component
- **Purpose**: Provides the UI for natural language queries and displays AI responses
- **Key Functions**:
  - `send(text: string)`: Sends user question to Chat API
  - `shouldShowExport(data: any[])`: Determines if Excel export button should be shown
  - `handleExport(data, format, filename)`: Exports data to Excel format
  - `push(role, text, sql?, data?)`: Adds message to conversation history

**`ArrivalsPage.tsx`** - Attendee Data Display Component
- **Purpose**: Displays attendee data in a table format with search capabilities
- **Key Features**:
  - **Page Title**: "Attendance Report" with "Attendance" badge
  - **Default Display**: Shows rows that fit viewport without scrolling
  - **Scrolling**: Enabled when "Show More" is clicked (for all data)
  - **Table Display**: Read-only table (no drag-and-drop or sorting arrows)
  - **Export Buttons**: 
    - "Save to My Reports" - Saves report configuration
    - "Export" - Exports to Excel with standardized header format and exact column ordering
- **Key Functions**:
  - `fetchArrivals(search?: string, eventId?: number, limit?: number)`: Fetches attendee data via GraphQL
  - `handleExport(direct: boolean)`: Exports data to Excel with header rows and exact column order matching table
  - Auto-loads data on component mount using `useEffect`
  - Column ordering preserved in export using `aoa_to_sheet` with `displayedColumns`

**`InsightsPickColumnsPanel.tsx`** - Column Selection Panel Component
- **Purpose**: Allows users to customize which columns are displayed in the arrivals table
- **Key Features**:
  - **Header**: "Pick Columns" title with close button (X icon)
  - **Search**: Search bar to filter columns by name
  - **Column List**: 
    - Drag-and-drop reordering (in panel only)
    - Checkbox selection for each column
    - Select all/none toggle
    - Shows selected count (e.g., "5/20")
  - **Footer Actions**:
    - **"Cancel"** button - Closes panel without applying changes
    - **"Save Changes"** button - Applies column selections and closes panel
  - **Close Button**: X icon in header - Same functionality as Cancel
- **Key Functions**:
  - `handleSaveChanges()`: Applies column selections and maintains order
  - `handleCancel()`: Closes panel and resets to original selections
  - `toggleColumn(column: string)`: Toggles individual column selection
  - `toggleAllColumns()`: Selects/deselects all columns
  - Drag-and-drop handlers for column reordering (panel only)
- **Note**: Main table display is read-only (no drag-and-drop or sorting in table itself)

#### 2. **API Layer**

**`/api/chat/route.ts`** - Natural Language Query Handler
- **Purpose**: Converts natural language questions to SQL and executes them
- **Flow**:
  1. Receives POST request with `question`, `conversationId`, and `history`
  2. Validates input using Zod schema
  3. Detects scope using `detectScopeAndCategory()`
  4. Checks for PII in question
  5. Builds context summary from conversation history
  6. Generates SQL using AI/LLM
  7. Validates and sanitizes SQL using security guards
  8. Executes query with timeout protection
  9. Formats results using AI/LLM for natural language answer
  10. Returns JSON response with answer, SQL, and data

**`/api/graphql/schema.ts`** - GraphQL Schema & Resolvers
- **Purpose**: Provides structured data access for attendee information
- **Resolvers**:
  - `arrivalColumns`: Returns list of column names from database schema
  - `arrivals`: Returns paginated attendee data with search support

#### 3. **Security Layer**

**`lib/insights/sql/guard.ts`** - SQL Security Guards
- **Purpose**: Ensures SQL queries are safe and don't expose PII
- **Key Functions**:
  - `ensureSafeSelect(sql)`: Validates SQL is SELECT-only, no forbidden keywords
  - `forceLimit(sql, limit)`: Ensures LIMIT clause exists and is capped
  - `containsPII(sql)`: Detects PII columns in SQL queries (hardened with comment removal, alias detection, function detection)

**`lib/insights/sql/timeout.ts`** - Query Timeout Protection
- **Purpose**: Prevents long-running queries from blocking the system
- **Key Functions**:
  - `queryWithTimeout(sql, params, ms)`: Executes query with statement timeout, ensures connection is always released

#### 4. **NLP Layer**

**`lib/insights/nlp/scope.ts`** - Scope Detection
- **Purpose**: Determines if a question is in-scope or out-of-scope
- **Key Functions**:
  - `detectScopeAndCategory(question)`: Analyzes question keywords to determine scope and category
  - `outOfScopeMessage()`: Returns standardized out-of-scope response

**`lib/insights/nlp/context.ts`** - Context Building
- **Purpose**: Builds conversation context for AI prompts
- **Key Functions**:
  - `buildContextSummary(history)`: Converts conversation history to context string

#### 5. **Database Layer**

**`lib/insights/db.ts`** - Database Connection Management
- **Purpose**: Manages PostgreSQL connection pool
- **Key Functions**:
  - `getInsightsPool()`: Lazy-loads and returns PostgreSQL connection pool
  - `insightsPool`: Proxy object that ensures pool is initialized before use

**`lib/insights/sql/schema.ts`** - Schema Utilities
- **Purpose**: Provides database schema information to AI
- **Key Functions**:
  - `getAttendeeSchemaText()`: Fetches column names and types from PostgreSQL

**`lib/insights/sql/format.ts`** - Result Formatting
- **Purpose**: Formats SQL results for display
- **Key Functions**:
  - `formatResultToAnswer(rows)`: Converts SQL result rows to readable format

---

### Detailed Function Flows

#### Flow 1: Chat Query Processing (Natural Language → SQL → Answer)

```
User Types Question
    │
    ▼
┌─────────────────────────────────────┐
│ InsightsAimePanel.send()            │
│ - Validates input (3-200 chars)     │
│ - Adds user message to state        │
│ - Sets isTyping = true              │
└──────────────┬──────────────────────┘
               │
               │ POST /api/chat
               │ { question, conversationId, history }
               ▼
┌─────────────────────────────────────┐
│ Chat API Route Handler              │
│ POST(req: Request)                  │
└──────────────┬──────────────────────┘
               │
               │ 1. Parse & Validate Body
               ▼
┌─────────────────────────────────────┐
│ BodySchema.parse()                  │
│ - Validates question (3-400 chars) │
│ - Validates history array           │
└──────────────┬──────────────────────┘
               │
               │ 2. Scope Detection
               ▼
┌─────────────────────────────────────┐
│ detectScopeAndCategory(question)    │
│ - Checks OOS_KEYWORDS               │
│ - Checks IN_SCOPE_HINTS             │
│ - Returns { scope, category }       │
└──────────────┬──────────────────────┘
               │
               ├─→ scope === "out_of_scope"
               │   └─→ Return outOfScopeMessage()
               │
               └─→ scope === "in_scope"
                   │
                   │ 3. PII Check (Question)
                   ▼
┌─────────────────────────────────────┐
│ containsPII(question)              │
│ - Checks for PII_COLUMNS            │
│ - Returns boolean                   │
└──────────────┬──────────────────────┘
               │
               ├─→ true → Return PII blocked message
               │
               └─→ false
                   │
                   │ 4. Build Context
                   ▼
┌─────────────────────────────────────┐
│ buildContextSummary(history)        │
│ - Takes last 6 messages             │
│ - Formats as "ROLE: text"          │
└──────────────┬──────────────────────┘
               │
               │ 5. Get Schema
               ▼
┌─────────────────────────────────────┐
│ getAttendeeSchemaText()            │
│ - Queries information_schema        │
│ - Returns formatted schema text     │
└──────────────┬──────────────────────┘
               │
               │ 6. Generate SQL (AI/LLM)
               ▼
┌─────────────────────────────────────┐
│ generateText() - SQL Generation     │
│ - System prompt: SQL rules          │
│ - User prompt: question + context   │
│ - Returns JSON: { sql, intent }     │
└──────────────┬──────────────────────┘
               │
               │ 7. Parse & Validate JSON
               ▼
┌─────────────────────────────────────┐
│ JSON.parse() + SqlOut.parse()      │
│ - Extracts JSON from AI response    │
│ - Validates structure with Zod      │
└──────────────┬──────────────────────┘
               │
               │ 8. PII Check (SQL)
               ▼
┌─────────────────────────────────────┐
│ containsPII(parsedSql.sql)         │
│ - Removes SQL comments              │
│ - Checks direct, alias, qualified   │
│ - Checks function patterns          │
└──────────────┬──────────────────────┘
               │
               ├─→ true → Return PII blocked message
               │
               └─→ false
                   │
                   │ 9. SQL Security Guards
                   ▼
┌─────────────────────────────────────┐
│ ensureSafeSelect(sql)              │
│ - Validates SELECT-only             │
│ - Blocks forbidden keywords         │
│ - Blocks semicolons                 │
└──────────────┬──────────────────────┘
               │
               │ forceLimit(sql, 50)
               ▼
┌─────────────────────────────────────┐
│ forceLimit()                        │
│ - Ensures LIMIT exists              │
│ - Caps at 50                        │
└──────────────┬──────────────────────┘
               │
               │ 10. Execute Query
               ▼
┌─────────────────────────────────────┐
│ queryWithTimeout(sql, [], 3000)    │
│ - Acquires connection from pool     │
│ - Sets statement_timeout = 3000ms   │
│ - Executes query                    │
│ - Always releases connection        │
└──────────────┬──────────────────────┘
               │
               │ 11. Generate Answer (AI/LLM)
               ▼
┌─────────────────────────────────────┐
│ generateText() - Answer Generation  │
│ - System prompt: Answer rules       │
│ - User prompt: question + SQL + data│
│ - Returns natural language answer   │
└──────────────┬──────────────────────┘
               │
               │ 12. Return Response
               ▼
┌─────────────────────────────────────┐
│ NextResponse.json()                 │
│ {                                   │
│   ok: true,                         │
│   answer: "...",                    │
│   sql: "...",                       │
│   rows: [...],                      │
│   meta: { scope, category, ms }     │
│ }                                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ InsightsAimePanel                   │
│ - Receives response                 │
│ - Adds assistant message            │
│ - Displays answer + data            │
│ - Shows export button if applicable │
└─────────────────────────────────────┘
```

#### Flow 2: Arrivals Page Data Loading

```
ArrivalsPage Component Mounts
    │
    ▼
┌─────────────────────────────────────┐
│ useEffect(() => {                  │
│   fetchArrivals();                  │
│ }, []);                             │
└──────────────┬──────────────────────┘
               │
               │ fetchArrivals()
               ▼
┌─────────────────────────────────────┐
│ Build GraphQL Query                 │
│ query Arrivals($q, $limit, $offset)│
│ {                                   │
│   arrivalColumns                    │
│   arrivals(...) {                   │
│     total, limit, offset, rows      │
│   }                                 │
│ }                                   │
└──────────────┬──────────────────────┘
               │
               │ POST /api/graphql
               │ { query, variables }
               ▼
┌─────────────────────────────────────┐
│ GraphQL Route Handler               │
│ - Parses GraphQL query              │
│ - Routes to schema resolvers        │
└──────────────┬──────────────────────┘
               │
               │ arrivalColumns resolver
               ▼
┌─────────────────────────────────────┐
│ arrivalColumns()                    │
│ - Queries information_schema         │
│ - Returns column names              │
└──────────────┬──────────────────────┘
               │
               │ arrivals resolver
               ▼
┌─────────────────────────────────────┐
│ arrivals(args)                      │
│ 1. Input Validation                 │
│    - Sanitize search query (q)      │
│    - Validate limit/offset         │
│ 2. Build Parameterized SQL          │
│    - If q: WHERE ... ILIKE $1      │
│    - LIMIT $2 OFFSET $3            │
│ 3. Execute Parallel Queries         │
│    - Data query                     │
│    - Count query                    │
└──────────────┬──────────────────────┘
               │
               │ Return { rows, total, limit, offset }
               ▼
┌─────────────────────────────────────┐
│ ArrivalsPage                        │
│ - Updates state:                    │
│   setColumns(cols)                  │
│   setRows(rows)                     │
│   setTotal(total)                   │
│ - Renders table                     │
└─────────────────────────────────────┘
```

#### Flow 3: Excel Export (Conditional Display)

```
Assistant Message with Data Rendered
    │
    ▼
┌─────────────────────────────────────┐
│ {m.data && shouldShowExport(...)}  │
│ Conditional Rendering               │
└──────────────┬──────────────────────┘
               │
               │ shouldShowExport(m.data)
               ▼
┌─────────────────────────────────────┐
│ shouldShowExport(data: any[])       │
│ 1. Check data exists & length > 0  │
│ 2. Check rows >= 2                  │
│ 3. Check is object array            │
│ 4. Check columns >= 2               │
│ Returns: boolean                    │
└──────────────┬──────────────────────┘
               │
               ├─→ false → No export button
               │
               └─→ true → Show export button
                   │
                   │ User clicks "Excel" button
                   ▼
┌─────────────────────────────────────┐
│ handleExport(data, "xlsx", filename)│
│ 1. Format download timestamp        │
│    Format: "Wednesday, Dec 10, 2025, 6:23 AM"
│ 2. Convert JSON to sheet            │
│    XLSX.utils.json_to_sheet(data)   │
│ 3. Add header rows:                 │
│    Row 1: "Event Data"              │
│    Row 2: "Downloaded data"         │
│    Row 3: Download timestamp        │
│    Row 4: Privacy notice            │
│    Row 5: Empty                     │
│    Row 6: Column headers (bold, centered)
│    Row 7+: Data rows                │
│ 4. Shift data down by 5 rows        │
│ 5. Create workbook                  │
│    XLSX.utils.book_new()            │
│ 6. Append sheet                     │
│    XLSX.utils.book_append_sheet()   │
│ 7. Write file                       │
│    XLSX.writeFile(wb, filename.xlsx)│
└─────────────────────────────────────┘
```

---

### Key Functions Explained

#### `detectScopeAndCategory(question: string)`

**Purpose**: Determines if a user's question is within the scope of attendee data analysis.

**Algorithm**:
1. Converts question to lowercase
2. Checks against `OOS_KEYWORDS` (out-of-scope keywords) with word boundary matching
3. If match found, checks for attendee context keywords
4. If no attendee context → returns `{ scope: "out_of_scope" }`
5. If attendee context present → continues to in-scope detection
6. Scores question against `IN_SCOPE_HINTS` categories
7. Returns category with highest score, or defaults to `statistics_summaries`

**Example**:
```typescript
detectScopeAndCategory("How many attendees are registered?")
// Returns: { scope: "in_scope", category: "statistics_summaries" }

detectScopeAndCategory("What's the hotel proposal status?")
// Returns: { scope: "out_of_scope", outOfScopeType: "hotel_proposals" }
```

#### `containsPII(sql: string)`

**Purpose**: Detects if SQL query attempts to access PII columns.

**Algorithm**:
1. Converts SQL to lowercase
2. Removes SQL comments (`--` and `/* */`)
3. Checks each PII column against multiple patterns:
   - **Direct**: `SELECT email`
   - **Alias**: `SELECT email AS e` or `SELECT e.email`
   - **Qualified**: `SELECT attendee.email`
   - **Function**: `SELECT CONCAT(email, ...)`

**PII Columns Protected**:
- `email`, `phone`, `mobile`, `mailing_address`
- `employee_id`, `concur_login_id`
- `internal_notes`, `dietary`, `dietary_restrictions`

**Example**:
```typescript
containsPII("SELECT first_name, email FROM attendee")
// Returns: true (email is PII)

containsPII("SELECT COUNT(*) FROM attendee")
// Returns: false (no PII columns)
```

#### `ensureSafeSelect(sql: string)`

**Purpose**: Validates SQL query is safe (SELECT-only, no dangerous operations).

**Checks**:
1. Must start with `SELECT`
2. No semicolons (prevents multi-statement injection)
3. No forbidden keywords: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, etc.

**Example**:
```typescript
ensureSafeSelect("SELECT * FROM attendee LIMIT 10")
// Returns: "SELECT * FROM attendee LIMIT 10"

ensureSafeSelect("DROP TABLE attendee;")
// Throws: Error("Forbidden keyword detected: drop")
```

#### `queryWithTimeout(sql: string, params: any[], ms: number)`

**Purpose**: Executes SQL query with timeout protection and guaranteed connection release.

**Flow**:
1. Acquires connection from pool
2. Begins transaction (`BEGIN`)
3. Sets `statement_timeout` to `ms` milliseconds
4. Executes query with parameters
5. Commits transaction (`COMMIT`)
6. Releases connection in `finally` block
7. On error: rolls back transaction, releases connection

**Critical Safety**:
- Connection is **always** released, even if `connect()` fails
- Transaction is rolled back on error
- Timeout is validated (100ms - 30s range)

**Example**:
```typescript
const result = await queryWithTimeout(
  "SELECT * FROM attendee LIMIT 10",
  [],
  3000  // 3 second timeout
);
```

#### `buildContextSummary(history: InsightsChatMsg[])`

**Purpose**: Converts conversation history into context string for AI prompts.

**Algorithm**:
1. Takes last 6 messages from history
2. Formats each as `ROLE: text`
3. Joins with newlines

**Example**:
```typescript
buildContextSummary([
  { role: "user", text: "How many attendees?" },
  { role: "assistant", text: "There are 50 attendees." }
])
// Returns: "Conversation so far:\nUSER: How many attendees?\nASSISTANT: There are 50 attendees."
```

#### `shouldShowExport(data: any[])`

**Purpose**: Determines if Excel export button should be displayed for a message.

**Criteria**:
1. Data exists and has length > 0
2. Has at least 2 rows (skips single-row aggregates)
3. First row is an object (tabular data)
4. Has at least 2 columns

**Example**:
```typescript
shouldShowExport([
  { name: "John", company: "Acme", email: "john@acme.com" },
  { name: "Jane", company: "Beta", email: "jane@beta.com" }
])
// Returns: true (2+ rows, 2+ columns)

shouldShowExport([{ count: 50 }])
// Returns: false (only 1 row)
```

#### `handleExport(direct: boolean)`

**Purpose**: Exports data to Excel format with standardized header rows and exact column ordering.

**Excel File Structure**:
- **Row 1**: "Event Data"
- **Row 2**: "Downloaded data"
- **Row 3**: Download timestamp formatted as "Wednesday, December 10, 2025, 6:23 AM"
- **Row 4**: Privacy notice: "Notice: This report may contain personally identifiable and other client confidential data. Usage and distribution of this report should be governed by relevant regulations and your own organization's policies."
- **Row 5**: Empty row
- **Row 6**: Column headers (in exact order matching table display)
- **Row 7+**: Data rows (columns in exact order matching table display)

**Implementation**:
1. Formats current date/time in specified format
2. Builds array of arrays (`aoaData`) to ensure exact column order matching `displayedColumns`
3. Creates worksheet using `XLSX.utils.aoa_to_sheet()` for precise column ordering
4. Shifts original data down by 5 rows
5. Adds header rows at the top
6. Copies column headers to row 6 (preserving exact order)
7. Creates workbook and writes file

**Key Features**:
- **Column Order Preservation**: Uses `aoa_to_sheet` with explicit `displayedColumns` order to ensure Excel columns match table exactly
- **30-Second Timeout**: Automatic cancellation with user notification if export exceeds 30 seconds
- **Progress Indicator**: Real-time progress updates (0-100%) with status messages
- **Error Handling**: Comprehensive error handling with retry option

**Example**:
```typescript
handleExport([
  { name: "John", email: "john@example.com" },
  { name: "Jane", email: "jane@example.com" }
], "xlsx", "export-2025-01-15")
// Creates Excel file with header rows + data starting at row 7
```

---

### Security Mechanisms

#### 1. **SQL Injection Prevention**

**Method**: Fully parameterized queries
- All user input is passed as parameters (`$1`, `$2`, etc.)
- No string interpolation in SQL queries
- Example:
  ```typescript
  // ✅ SAFE
  pool.query("SELECT * FROM attendee WHERE email ILIKE $1", [searchPattern]);
  
  // ❌ UNSAFE (not used)
  pool.query(`SELECT * FROM attendee WHERE email ILIKE '%${search}%'`);
  ```

#### 2. **Input Validation**

**Method**: Zod schema validation + manual sanitization
- Chat API: `BodySchema.parse()` validates question length (3-400 chars)
- GraphQL: Manual validation for search query (max 200 chars, alphanumeric only)
- Limit/Offset: Validated as integers, capped at reasonable bounds

#### 3. **PII Protection**

**Method**: Multi-layer detection
- Question-level: Checks user question for PII keywords
- SQL-level: Scans generated SQL for PII column references
- Pattern matching: Detects PII in aliases, qualified names, functions, comments

#### 4. **Query Safety**

**Method**: `ensureSafeSelect()` + `forceLimit()`
- Only SELECT queries allowed
- Forbidden keywords blocked
- LIMIT clause enforced (max 50 rows)
- Semicolons blocked (prevents multi-statement injection)

#### 5. **Connection Pool Management**

**Method**: Guaranteed release in `finally` block
- Connection acquired in try block
- Always released in finally block
- Transaction rolled back on error
- Prevents connection leaks

#### 6. **Timeout Protection**

**Method**: PostgreSQL `statement_timeout`
- Set per-query using `SET LOCAL statement_timeout`
- Default: 1500ms, Chat API: 3000ms
- Prevents long-running queries from blocking system

---

### Data Flow Diagrams

#### Chat Query Data Flow

```
User Input
    │
    ├─→ [Validation] → Input too short/long? → Error message
    │
    ├─→ [Scope Detection] → Out of scope? → Out-of-scope message
    │
    ├─→ [PII Check (Question)] → PII detected? → PII blocked message
    │
    ├─→ [Context Building] → Last 6 messages → Context string
    │
    ├─→ [Schema Fetch] → PostgreSQL information_schema → Schema text
    │
    ├─→ [AI SQL Generation] → OpenAI/Anthropic/Groq → JSON { sql, intent }
    │
    ├─→ [JSON Parsing] → Invalid JSON? → Error message
    │
    ├─→ [PII Check (SQL)] → PII detected? → PII blocked message
    │
    ├─→ [SQL Security] → Unsafe SQL? → Error message
    │
    ├─→ [Query Execution] → PostgreSQL → Rows data
    │
    ├─→ [AI Answer Generation] → OpenAI/Anthropic/Groq → Natural language answer
    │
    └─→ [Response] → { answer, sql, rows, meta } → Display in UI
```

#### GraphQL Query Data Flow

```
GraphQL Query
    │
    ├─→ [Parse Query] → Extract variables (q, limit, offset)
    │
    ├─→ [Input Validation] → Invalid input? → GraphQL error
    │
    ├─→ [Build SQL] → Parameterized query with $1, $2, $3
    │
    ├─→ [Parallel Execution] → Data query + Count query
    │
    ├─→ [PostgreSQL] → Execute queries → { rows, total }
    │
    └─→ [Response] → { rows, total, limit, offset } → Update UI state
```

---

### Component Interaction Patterns

#### 1. **Parent-Child Communication**

```
InsightsAppShell
    │
    ├─→ InsightsSidebar (navigation)
    ├─→ InsightsPage (main content)
    └─→ InsightsAimePanel (chat panel)
            │
            └─→ Uses useInsightsUI() hook for state
```

#### 2. **State Management**

```
useInsightsUI() Hook
    │
    ├─→ aimeOpen: boolean
    ├─→ setAimeOpen: (open: boolean) => void
    └─→ openAime: () => void
```

#### 3. **API Communication**

```
Component → apiFetch() → Next.js API Route → Database/LLM → Response → Component
```

---

### Error Handling Patterns

#### 1. **API Error Handling**

```typescript
try {
  const response = await apiFetch("/api/chat", {...});
  const data = await response.json();
  if (data.ok) {
    // Success path
  } else {
    // API returned error
  }
} catch (error) {
  // Network/parsing error
  console.error("Chat API error:", error);
  push("assistant", "Sorry, I'm having trouble connecting...");
}
```

#### 2. **Database Error Handling**

```typescript
try {
  const pool = getInsightsPool();
  if (!pool) throw new Error("Database pool not available");
  const result = await pool.query(sql, params);
  return result.rows;
} catch (err) {
  console.error("DB error:", err);
  // Fallback to mock data
  return insightsArrivalsRows;
}
```

#### 3. **SQL Security Error Handling**

```typescript
try {
  sql = ensureSafeSelect(sql);
  sql = forceLimit(sql, 50);
} catch (err) {
  // Security violation detected
  return NextResponse.json({
    ok: false,
    answer: "Query security check failed.",
    error: err.message
  });
}
```

---

### Performance Optimizations

1. **Connection Pooling**: Reuses database connections instead of creating new ones
2. **Lazy Loading**: Database pool initialized only when needed
3. **Query Timeout**: Prevents long-running queries from blocking
4. **Parallel Queries**: GraphQL executes data and count queries simultaneously
5. **Context Limiting**: Only last 6 messages sent to AI (reduces token usage)
6. **Conditional Rendering**: Export button only rendered when needed

---

### Testing Considerations

Each function should be tested for:
- **Happy Path**: Normal operation with valid inputs
- **Edge Cases**: Empty inputs, boundary values, null/undefined
- **Error Cases**: Invalid inputs, network failures, database errors
- **Security**: SQL injection attempts, PII detection, forbidden keywords

---

## 🔧 Configuration

### Next.js Configuration

The `next.config.ts` has been updated to include:
- `serverExternalPackages: ["pg"]` - Required for PostgreSQL support

### API Routes

**Chat API** (`/api/chat`):
- Accepts POST requests with `question`, `conversationId`, and optional `history`
- Returns JSON with `answer`, `sql`, `rows`, and `meta`

**GraphQL API** (`/api/graphql`):
- Accepts GET and POST requests
- Supports GraphQL queries for arrivals data
- Note: Chat mutation has been removed (no MongoDB persistence)

---

## 🔄 Integration with Existing Workflows

The insights features are designed to coexist with existing workflow features:

- **Separate Routes**: Insights use `/insights` and `/arrivals` routes
- **Separate Databases**: Insights uses PostgreSQL only (no MongoDB), workflows use MongoDB
- **Shared Dependencies**: Both use similar AI SDKs
- **Independent State**: UI state is managed separately
- **No Conflicts**: File paths are organized to avoid conflicts
- **Layout**: Insights pages fit viewport without vertical scrolling

**Both systems can run simultaneously without any interference!**

---

## 📚 Additional Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **GraphQL Documentation**: https://graphql.org/learn/
- **Next.js API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **AI SDK**: https://sdk.vercel.ai/docs

---

## 🆘 Getting Help

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set
3. Ensure databases are running and accessible
4. Review this documentation for common solutions
5. Check console logs in browser DevTools (F12)

---

## 🎯 Quick Command Reference

```powershell
# Install dependencies
npm install

# Start development server (insights)
npm run dev:insights

# Start development server (standard)
npm run dev

# Note: MongoDB not required for insights
# (Only needed if using workflow features)

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

---

## ✅ Summary

**Complete separation achieved:**
- ✅ Zero conflicts with workflow files
- ✅ Clear naming conventions (`Insights` prefix)
- ✅ Dedicated directory structure (`lib/insights/`)
- ✅ Separate database connections (PostgreSQL for insights, MongoDB for workflows)
- ✅ No MongoDB dependency for insights
- ✅ Clear file headers
- ✅ Workflow files completely untouched
- ✅ Layout optimized for viewport fit (no vertical scrolling)

**Both systems can run simultaneously without any interference!**

**Recent Changes:**
- ✅ Removed MongoDB dependency for insights (conversations not persisted)
- ✅ Removed "Load Attendee Data" button (data auto-loads on page mount)
- ✅ Optimized layout to fit viewport without vertical scrolling
- ✅ Auto-loading data on Arrivals page
- ✅ Excel export column ordering fixed - columns now match exact table order using `aoa_to_sheet`
- ✅ Removed drag-and-drop and sorting arrows from main table (read-only display)
- ✅ Background colors standardized to white (#FFFFFF) for main content area
- ✅ Table header and progress indicator backgrounds restored to grey (#f3f4f6)

---

**Note**: The insights features are integrated but maintain complete separation from workflow features. All insights files are clearly marked and organized separately.

