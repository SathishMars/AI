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
- created_at and updated_at are TEXT in 'YYYY-MM-DD HH:mm' format.
- To compare dates, use: created_at::timestamp >= CURRENT_DATE - INTERVAL '7 days'
`;
}

