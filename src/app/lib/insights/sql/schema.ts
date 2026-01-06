// INSIGHTS-SPECIFIC: PostgreSQL schema utilities for attendee data
import { insightsPool } from "@/app/lib/insights/db";

export async function getAttendeeSchemaText() {
  const sql = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendee'
    ORDER BY ordinal_position;
  `;

  const { rows } = await (insightsPool as any).query(sql);

  const cols = (rows as any[]).map(r => `- ${r.column_name} (${r.data_type})`).join("\n");

  return `
You are querying PostgreSQL.
Database has one main table:

Table: public.attendee
Columns:
${cols}

Rules:
- Only use SELECT
- Prefer simple filters
- Always include LIMIT
- created_at and updated_at are TIMESTAMP type.
- To compare dates, use: created_at >= CURRENT_DATE - INTERVAL '7 days'
- When grouping by date or selecting dates, use DATE(created_at) to extract just the date part.
- When displaying dates, use TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date to ensure consistent string format.
- Example: SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS registration_date, COUNT(*) FROM attendee GROUP BY DATE(created_at)
`;
}

