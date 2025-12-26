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
2. Data automatically loads from PostgreSQL on page mount
3. Use search box and press Enter to filter attendees
4. Export data using the Export button
5. Page layout fits viewport - no vertical scrolling required

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

---

**Note**: The insights features are integrated but maintain complete separation from workflow features. All insights files are clearly marked and organized separately.

