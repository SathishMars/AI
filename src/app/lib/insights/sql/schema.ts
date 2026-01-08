// INSIGHTS-SPECIFIC: PostgreSQL schema utilities for attendee data
import { insightsPool } from "@/app/lib/insights/db";

export async function getAttendeeSchemaText(eventId: number = 5281) {
  const sql = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendee'
    ORDER BY ordinal_position;
  `;

  const { rows = [] } = await (insightsPool as any).query(sql) || {};
  const cols = (rows as any[] || []).map(r => `- ${r.column_name} (${r.data_type})`).join("\n");

  return `
You are querying PostgreSQL.
For ALL questions about attendees, registrants, or companions, use the attendee report view.

Table: public.attendee
Columns:
${cols}

Rules:
- Only use SELECT
- **CRITICAL**: The user is currently viewing Event ID: ${eventId}.
- **IMPORTANT**: Always filter by event_id = ${eventId} unless the user explicitly asks for a different event.
- **IMPORTANT**: Always filter by parent_id IS NULL to avoid showing duplicates (companions are counted separately via the companion_count column).
- Prefer simple filters
- created_at and updated_at are TIMESTAMP type.
- Example: SELECT "first_name", "last_name" FROM attendee WHERE event_id = ${eventId} AND parent_id IS NULL
`;
}

