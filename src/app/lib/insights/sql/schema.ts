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

  // Check if dietary_restrictions column exists
  const hasDietaryColumn = cols.toLowerCase().includes('dietary_restrictions');
  
  return `
You are querying PostgreSQL.
For ALL questions about attendees, registrants, or companions, use the attendee report view.

Table: public.attendee
Columns:
${cols}

${hasDietaryColumn ? '' : `
⚠️ IMPORTANT NOTE ABOUT DIETARY RESTRICTIONS:
- The column "dietary_restrictions" does NOT exist in this database.
- If asked about dietary restrictions, dietary preferences, food allergies, or meal preferences:
  * DO NOT generate SQL with "dietary_restrictions" or "dietary_restriction" columns
  * Instead, inform the user that dietary restriction data is not available in this database
  * Use this response: "The database contains no attendee records with documented dietary restrictions in the available fields. Dietary restriction information is not currently captured or populated in the attendee database."
`}

Rules:
- Only use SELECT
- **CRITICAL**: The user is currently viewing Event ID: ${eventId}.
- **IMPORTANT**: Always filter by event_id = ${eventId} unless the user explicitly asks for a different event.
- **IMPORTANT**: Always filter by parent_id IS NULL to avoid showing duplicates (companions are counted separately via the companion_count column).
- Prefer simple filters
- created_at and updated_at are TIMESTAMP type.
- **CRITICAL**: Only use columns that exist in the Columns list above. DO NOT invent column names.
- Example: SELECT "first_name", "last_name" FROM attendee WHERE event_id = ${eventId} AND parent_id IS NULL
`;
}

