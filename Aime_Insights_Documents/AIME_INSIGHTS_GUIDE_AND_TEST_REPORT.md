# AIME Insights - Complete Guide (Standalone Server Architecture)

This guide documents the AIME Insights feature, which runs as a **Standalone Apollo GraphQL Server** (Dockerized) separate from the Next.js application logic. The system is designed for high-performance data analysis using live database views and AI.

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Data Architecture (Live Views)](#-data-architecture-live-views)
3. [Dynamic Event Filtering (Event ID)](#-dynamic-event-filtering-event-id)
4. [Adding New Reports/Views](#-adding-new-reportsviews)
5. [Key Components & File Organization](#-key-components--file-organization)
6. [Troubleshooting](#-troubleshooting)

---

## ⚡ Quick Start

### 1. Start the Standalone GraphQL Server
```powershell
# Build and start the backend
docker-compose up -d --build insights-backend
```
*This starts the server at `http://localhost:4000/graphql`.*

### 2. Start the Frontend (Next.js)
```powershell
npm run dev:insights
```
*The frontend proxies `/api/graphql` -> `http://localhost:4000/graphql`.*

### 3. Verify
Open **http://localhost:3000/aime/insights**

---

## 🏗️ Data Architecture (Live Views)

AIME Insights uses a **View-First Architecture**. Instead of creating redundant physical tables, we create PostgreSQL Views that join multiple sources in real-time.

### The `attendee` View
The primary view is `public.attendee` (defined in `db-scripts/datadump_view.sql`).
- **Sources**: Joins `registrations`, `attendee_types`, `room_requests`, and `air_requests`.
- **Live Data**: Any updates to the underlying tables are immediately visible to AIME.
- **Normalization**: Timestamps (`created_at`, `updated_at`) are automatically formatted to `YYYY-MM-DD HH:mm` for professional reporting.

### Benefits
- **Zero Latency**: No "data sync" or background jobs needed.
- **Simplified AI Schema**: The AI only needs to know about one flattened view rather than 5+ relational tables.
- **Read-Only Safety**: The database user only needs SELECT permissions on the view.

---

## 🎯 Dynamic Event Filtering (Event ID)

The system supports real-time switching between different events.

### How it Works:
1. **Frontend**: In `ArrivalsPage.tsx`, an "Event ID" input box allows users to specify an ID (default: `5281`).
2. **Global State**: The `eventId` is stored in the `useInsightsUI` state (`ui-store.tsx`).
3. **GraphQL**: Both the `arrivals` query and the `chat` mutation accept an `eventId` parameter.
4. **AI Context**: When sending a question to AIME, the `eventId` is injected into the AI's "system prompt". Even if the user just asks "Show me all people", the AI knows to automatically add `WHERE event_id = 5281` to the SQL.

---

## ➕ Adding New Reports/Views

You can easily add new analysis areas (e.g., Finance, Feedback) following this pattern:

### 1. Create a View
Add a new view to your database (similar to `datadump_view.sql`):
```sql
CREATE OR REPLACE VIEW public.finance_report AS
SELECT ... FROM ...
```

### 2. Update AI Schema (`src/app/lib/insights/sql/schema.ts`)
Add a new helper to fetch columns for the new view and provide instructions to the AI on when to use it.

### 3. Update Resolver (`src/app/api/graphql/schema.ts`)
Modify the `chat` mutation to include the new view's schema text in the NLP loop.

---

## 📁 File Organization

```
src/
├── insights-server.ts         ← Entry point for standalone server
├── app/
│   ├── api/
│   │   ├── graphql/
│   │   │   └── schema.ts      ← Unified Schema (Arrivals + Chat Logic + Normalization)
│   ├── components/
│   │   ├── arrivals/          ← UI for the Report Table (Dynamic Filters)
│   │   └── Shell/AimePanel    ← Chat UI (GraphQL Mutation)
├── lib/
│   └── insights/              ← Shared logic (State, SQL Guardrails, Schema Discovery)
root/
├── Dockerfile.insights        ← Docker build definition
├── docker-compose.yml         ← Service orchestration
└── .env                       ← API keys and DB URI
```

---

## 🧪 Unit Test Report

Comprehensive unit tests have been implemented to ensure the reliability and safety of the Insights system.

### Test Execution Summary (2025-01-23)
- **Total Tests**: 25
- **Passed**: 25
- **Failed**: 0
- **Duration**: ~2.5s

### Recent Updates (2025-01-23)
- ✅ Excel export column ordering fixed - columns now match exact table order using `aoa_to_sheet`
- ✅ Removed drag-and-drop and sorting arrows from main table (read-only display)
- ✅ Background colors standardized to white (#FFFFFF) for main content area
- ✅ Table header and progress indicator backgrounds restored to grey (#f3f4f6)
- ✅ Export uses `aoa_to_sheet` for precise column ordering matching `displayedColumns`
- ✅ 30-second timeout with progress indicator implemented
- ✅ Export progress tracking (0-100%) with status messages
- ✅ Error handling with retry option

### Export Functionality Details
- **Column Order Preservation**: Excel columns match exact table order using array-of-arrays approach
- **Format**: .xlsx format only (never CSV)
- **Timeout**: 30-second automatic timeout with user notification
- **Progress**: Real-time progress indicator with percentage and status messages
- **Error Recovery**: Comprehensive error handling with retry button
- **Header Format**: Standardized Excel header rows (Event Data, timestamp, privacy notice)

### Coverage Highlights:
1. **GraphQL Resolver Logic (`schema.test.ts`)**:
   - Verified `arrivals` query with dynamic `eventId` and search filtering.
   - Validated `chat` mutation SQL generation and response handling.
   - Confirmed input validation (limit/offset bounds).
   - Verified professional timestamp normalization (`YYYY-MM-DD HH:mm`).

2. **AI SQL Schema Discovery (`sql/schema.test.ts`)**:
   - Verified that the AI always receives the correct `eventId` context.
   - Confirmed the removal of hardcoded `LIMIT 50` instructions.
   - Validated dynamic column fetching from `information_schema`.

3. **Safety & Security (`guard.ts`)**:
   - Verified PII detection (blocking queries for phone, dietary restrictions, etc.).
   - Confirmed SQL injection prevention via `ensureSafeSelect`.

### To Run Tests:
```powershell
npm test src/test/api/graphql/schema.test.ts src/test/lib/insights/sql/schema.test.ts
```

---

## 🛠️ Troubleshooting

| Issue | Potential Cause | Fix |
| :--- | :--- | :--- |
| **Empty Results** | Wrong Event ID | Check the Event ID input in the header. |
| **Chat Errors** | API Keys missing | Restart container: `docker-compose up -d`. |
| **Old Data** | View out of date | Run the latest `datadump_view.sql` script. |
| **Limit Applied** | Logic Cap | Ensure `forceLimit` is removed in `schema.ts`. |

---

**Last Updated:** February 2, 2026, 12:00 PM UTC
