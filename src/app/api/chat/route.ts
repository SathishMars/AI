import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";

// INSIGHTS-SPECIFIC: Chat API for natural language queries
import { getAttendeeSchemaText } from "@/app/lib/insights/sql/schema";
import { ensureSafeSelect, forceLimit, containsPII, PII_COLUMNS } from "@/app/lib/insights/sql/guard";
import { queryWithTimeout } from "@/app/lib/insights/sql/timeout";
import { formatResultToAnswer } from "@/app/lib/insights/sql/format";

import { detectScopeAndCategory, outOfScopeMessage } from "@/app/lib/insights/nlp/scope";
import { PII_BLOCKED_MESSAGE, ERROR_MESSAGES } from "@/app/lib/insights/messages";
import { buildContextSummary, type InsightsChatMsg } from "@/app/lib/insights/nlp/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  conversationId: z.string().optional(),
  question: z.string().min(3).max(400),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() })).optional(),
});

const SqlOut = z.object({
  sql: z.string().min(10),
  intent: z.string().optional(),
});

function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout") {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

// Detect UI actions from natural language commands
function detectUIAction(question: string): any {
  const q = question.toLowerCase().trim();
  
  // Column reordering patterns - improved regex
  const movePatterns = [
    /move\s+(.+?)\s+(?:to\s+)?(?:the\s+)?(front|beginning|start|first)/i,
    /move\s+(.+?)\s+(?:to\s+)?(?:the\s+)?(back|end|last)/i,
    /move\s+(.+?)\s+after\s+(.+)/i,
    /move\s+(.+?)\s+before\s+(.+)/i,
  ];
  
  for (const pattern of movePatterns) {
    const match = q.match(pattern);
    if (match) {
      const column = normalizeColumnName(match[1].trim());
      if (match[2] && (match[2].includes("front") || match[2].includes("beginning") || match[2].includes("start") || match[2].includes("first"))) {
        return { type: "reorder_column", column, position: 0 };
      } else if (match[2] && (match[2].includes("back") || match[2].includes("end") || match[2].includes("last"))) {
        return { type: "reorder_column", column, position: -1 };
      } else if (match[3]) {
        // After another column
        const afterCol = normalizeColumnName(match[3].trim());
        return { type: "reorder_column", column, afterColumn: afterCol };
      } else if (match[2] && match[2].includes("before")) {
        // This case is handled by the before pattern
        continue;
      }
    }
  }
  
  // Check for "before" pattern separately
  const beforeMatch = q.match(/move\s+(.+?)\s+before\s+(.+)/i);
  if (beforeMatch) {
    const column = normalizeColumnName(beforeMatch[1].trim());
    const beforeCol = normalizeColumnName(beforeMatch[2].trim());
    return { type: "reorder_column", column, beforeColumn: beforeCol };
  }
  
  // Filtering patterns
  const filterMatch = q.match(/(?:show|filter|display|only)\s+(?:only\s+)?(?:attendees|records|rows|data)\s+(?:from|with|where|that\s+have|that\s+are)\s+(.+?)(?:\s+companies?|\s+status|\s+type)?$/i);
  if (filterMatch) {
    const filterText = filterMatch[1].trim();
    // Try to detect column and value
    const columnValueMatch = filterText.match(/(.+?)\s+(?:is|are|contains?|equals?|like)\s+(.+)/i);
    if (columnValueMatch) {
      const col = normalizeColumnName(columnValueMatch[1]);
      const val = columnValueMatch[2].trim();
      return { type: "filter", column: col, value: val };
    }
    // Fallback: try common patterns
    if (filterText.includes("healthcare") || filterText.includes("health care")) {
      return { type: "filter", column: "company_name", value: "healthcare" };
    }
  }
  
  // Sorting patterns
  const sortMatch = q.match(/sort\s+(?:by|on)\s+(.+?)(?:\s+(ascending|descending|asc|desc))?$/i);
  if (sortMatch) {
    const column = normalizeColumnName(sortMatch[1]);
    const direction = sortMatch[2]?.toLowerCase().includes("desc") ? "desc" : "asc";
    return { type: "sort", column, direction };
  }
  
  // Clear filter/sort patterns
  if (q.match(/clear\s+(?:all\s+)?(?:filters?|filtering)/i)) {
    return { type: "clear_filter" };
  }
  if (q.match(/clear\s+(?:sort|sorting)/i)) {
    return { type: "clear_sort" };
  }
  
  return null;
}

// Normalize column names from natural language
function normalizeColumnName(name: string): string {
  const normalized = name.toLowerCase().trim();
  const mappings: Record<string, string> = {
    "company": "company_name",
    "company name": "company_name",
    "registration date": "created_at",
    "registration": "created_at",
    "date": "created_at",
    "created at": "created_at",
    "name": "first_name",
    "first name": "first_name",
    "firstname": "first_name",
    "surname": "last_name",
    "last name": "last_name",
    "lastname": "last_name",
    "email": "email",
    "phone": "phone",
    "status": "registration_status",
    "registration status": "registration_status",
    "attendee type": "attendee_type",
    "attendee_type": "attendee_type",
  };
  
  // Check exact match first
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Check if it already matches a column name format (snake_case)
  if (normalized.includes("_")) {
    return normalized;
  }
  
  // Try to match partial names
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Default: convert spaces to underscores
  return normalized.replace(/\s+/g, "_");
}

// Get confirmation message for actions
function getActionConfirmationMessage(action: any): string {
  switch (action.type) {
    case "reorder_column":
      if (action.position === 0) {
        return `I've moved the "${action.column.replace(/_/g, " ")}" column to the front.`;
      } else if (action.position === -1) {
        return `I've moved the "${action.column.replace(/_/g, " ")}" column to the end.`;
      } else if (action.afterColumn) {
        return `I've moved the "${action.column.replace(/_/g, " ")}" column after "${action.afterColumn.replace(/_/g, " ")}".`;
      } else if (action.beforeColumn) {
        return `I've moved the "${action.column.replace(/_/g, " ")}" column before "${action.beforeColumn.replace(/_/g, " ")}".`;
      }
      return `I've reordered the "${action.column.replace(/_/g, " ")}" column.`;
    case "filter":
      return `I've applied a filter: showing only records where "${action.column.replace(/_/g, " ")}" contains "${action.value}".`;
    case "clear_filter":
      return `I've cleared all filters.`;
    case "sort":
      return `I've sorted the data by "${action.column.replace(/_/g, " ")}" in ${action.direction === "asc" ? "ascending" : "descending"} order.`;
    case "clear_sort":
      return `I've cleared the sorting.`;
    default:
      return "Action completed.";
  }
}

export async function POST(req: Request) {
  const start = Date.now();

  // AI Provider Initializations
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

  // Active Model Selection
  const model = anthropic("claude-3-5-haiku-latest");
  //const model = openai("gpt-4o"); // or "gpt-3.5-turbo"
  //const model = groq("llama-3.3-70b-versatile");

  try {
    const body = BodySchema.parse(await req.json());
    const question = body.question.trim();
    const history = (body.history ?? []) as InsightsChatMsg[];
    const conversationId = body.conversationId ?? "fallback-session";

    // 0.5) Check for UI action commands (column reorder, filter, sort)
    const action = detectUIAction(question);
    if (action) {
      console.log(`[Chat API] UI Action detected:`, action);
      return NextResponse.json({
        ok: true,
        answer: getActionConfirmationMessage(action),
        action,
        meta: { scope: "ui_action", ms: Date.now() - start },
      });
    }

    // 1) Fast scope detection (no LLM) — ensures graceful out-of-scope
    const scope = detectScopeAndCategory(question);
    console.log(`[Chat API] Question: "${question}", Scope: ${scope.scope}, Category: ${scope.category}`);

    if (scope.scope === "out_of_scope") {
      return NextResponse.json({
        ok: true,
        answer: outOfScopeMessage(),
        meta: { scope: "out_of_scope", ms: Date.now() - start },
      });
    }

    // 2.5) CHECK FOR PII IN QUESTION
    if (containsPII(question)) {
      console.warn(`[Chat API] PII DETECTED IN QUESTION: ${question}`);
      return NextResponse.json({
        ok: true,
        answer: PII_BLOCKED_MESSAGE,
        meta: { scope: "pii_blocked", ms: Date.now() - start },
      });
    }

    // 2) Build prompt with schema + conversation context
    const schemaText = await getAttendeeSchemaText();
    const ctx = buildContextSummary(history);

    const sqlSystem = `
You are Aime Insights, an expert in PostgreSQL.
Convert the user's request into a single PostgreSQL SELECT query over public.attendee.

MATH SAFETY:
- CRITICAL: Prevent "division by zero" errors by using NULLIF(denominator, 0). 
- Example: count(*) * 100.0 / NULLIF(total, 0)
- ALWAYS cast at least one operand to float (e.g. use 100.0) before division to avoid integer division issues.

NAME MATCHING:
- When a person's name is provided (e.g., "Rahul P. Das", "John Smith"), match ALL name parts if provided.
- Names are stored in separate columns: first_name, middle_name, last_name
- CRITICAL: Always use ILIKE with wildcards for flexible matching, never use exact equality (=)
- Handle NULL values: Use COALESCE(middle_name, '') ILIKE '%P%' to handle NULL middle names
- For first and last names: first_name ILIKE '%Rahul%' AND last_name ILIKE '%Das%'
- For middle names/initials:
  * If user provides "P." or "P", use: COALESCE(middle_name, '') ILIKE '%P%' (matches "P", "P.", "Paul", NULL becomes empty string)
  * If user provides full middle name, use: COALESCE(middle_name, '') ILIKE '%John%'
- Example queries:
  * "Rahul P. Das" -> SELECT phone FROM attendee WHERE first_name ILIKE '%Rahul%' AND COALESCE(middle_name, '') ILIKE '%P%' AND last_name ILIKE '%Das%' LIMIT 50
  * "John Smith" -> SELECT phone FROM attendee WHERE first_name ILIKE '%John%' AND last_name ILIKE '%Smith%' LIMIT 50
- IMPORTANT: 
  * Use wildcards (%) on both sides: ILIKE '%value%'
  * Always include the requested field (e.g., phone, email) in the SELECT clause
  * Match all provided name parts with AND conditions
  * Use COALESCE for middle_name to handle NULL values
- If multiple people match, return all matching results with their distinguishing information

STATUS MAPPINGS:
- "Confirmed" -> Use registration_status = 'Registered'
- "Requested" -> For room/housing, use room_status = 'Booked'. For flight/travel, use air_status = 'Ticketed'.

SECURITY RULES:
- NEVER select personal identifiable information (PII).
- FORBIDDEN COLUMNS: ${PII_COLUMNS.join(", ")}
- If the user asks for PII, you must still generate a valid SQL query but OMIT the forbidden columns. 
- Example: If asked for "emails of all people", just count them or list their names instead.

Hard rules:
- SELECT only
- No semicolons
- Always LIMIT <= 50
- Use ILIKE for text filters
- Return ONLY valid JSON: { "sql": "...", "intent": "..." }
- Table schema: ${schemaText}
`;

    const sqlResult = await generateText({
      model,
      system: sqlSystem,
      prompt: `Context: ${ctx}\n\nUser Question: ${question}\n\nReturn JSON.`,
    });

    // CRITICAL FIX #3: Safe JSON parsing with proper error handling
    let parsedSql;
    try {
      const jsonMatch = sqlResult.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in AI response");
      }

      // Validate JSON structure before parsing
      const jsonStr = jsonMatch[0];
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonStr);
      } catch (parseError) {
        throw new Error(`Invalid JSON format in AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Validate parsed JSON matches expected schema
      parsedSql = SqlOut.parse(parsedJson);
    } catch (parseError) {
      console.error("[Chat API] JSON parsing error:", parseError);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // CHECK FOR PII IN GENERATED SQL
    if (containsPII(parsedSql.sql)) {
      console.warn(`[Chat API] PII DETECTED IN SQL: ${parsedSql.sql}`);
      return NextResponse.json({
        ok: true,
        answer: PII_BLOCKED_MESSAGE,
        meta: { scope: "pii_blocked", ms: Date.now() - start },
      });
    }

    let sql = ensureSafeSelect(parsedSql.sql);
    sql = forceLimit(sql, 50);

    console.log(`[Chat API] Executing SQL: ${sql}`);
    const dbRes = await queryWithTimeout(sql, [], 3000);
    let rows = (dbRes as any).rows;
    
    // Log query results for debugging
    if (rows.length === 0) {
      console.log(`[Chat API] Query returned 0 rows for SQL: ${sql}`);
    } else {
      console.log(`[Chat API] Query returned ${rows.length} row(s)`);
    }

    // Normalize date/timestamp values to prevent timezone conversion issues
    // Convert Date objects and timestamp strings to YYYY-MM-DD format
    rows = rows.map((row: any) => {
      const normalized: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date) {
          // For Date objects from TIMESTAMP columns:
          // If the key suggests it's a date (contains 'date' or ends with '_at'), 
          // extract the date part. Since TIMESTAMP WITHOUT TIME ZONE stores local time,
          // we need to check if the Date was incorrectly converted to UTC.
          // Best approach: use the original SQL value if available, otherwise use local date
          // For now, use local date methods to preserve the original date
          const year = value.getFullYear();
          const month = String(value.getMonth() + 1).padStart(2, '0');
          const day = String(value.getDate()).padStart(2, '0');
          normalized[key] = `${year}-${month}-${day}`;
        } else if (typeof value === 'string') {
          // Handle various date string formats
          if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            // Extract YYYY-MM-DD from strings like "2025-09-01" or "2025-09-01T00:00:00.000Z"
            normalized[key] = value.substring(0, 10);
          } else {
            normalized[key] = value;
          }
        } else {
          normalized[key] = value;
        }
      }
      return normalized;
    });

    // 3) Natural language answer pass
    const answerSystem = `
You are Aime Insights, a sophisticated data analysis executive.
Provide a crisp and direct executive summary.

STRICT INSTRUCTIONS:
- ONLY use the provided "Data Result".
- FORBIDDEN: Do not use any internal training data, historical facts, or general knowledge to answer. 
- FORMAT: For multi-row results or summaries, use clean Markdown tables with clear headers.
- If the "Data Result" is empty/empty-array and no policy violation occurred, state "No records match the specified criteria." and stop. 
- Do not provide biographical, historical, or external context for people or entities not found in the data.

DATE HANDLING:
- All dates in the Data Result are in YYYY-MM-DD format (e.g., "2025-09-01").
- Interpret dates EXACTLY as provided - do NOT apply any timezone conversion or date arithmetic.
- If a date is "2025-09-01", report it as "September 1, 2025" - do NOT convert it to August 31 or any other date.
- Dates are already normalized and correct - use them as-is.

SPECIFIC PERSON QUERIES:
- When asked about a specific person (e.g., "phone of Rahul P. Das"), provide the exact answer directly.
- If multiple people match, list all matches with their distinguishing information (middle name, company, etc.).
- If only one person matches, provide the answer directly without extra explanation.
- Example: If asked "what is phone of Rahul P. Das?" and result shows phone: "+44 20 2257 8848", answer: "The phone number for Rahul P. Das is +44 20 2257 8848."

Tone & Style:
- Focus strictly on facts and data.
- Do not use conversational filler, apologies, or personal pronouns (I, my).
- NEVER mention technical terms like "query", "result set", "database", or "empty".
- Use structured points or tables for findings.
- Tone: Authoritative, efficient, and sophisticated.
`;

    const answerResult = await generateText({
      model,
      system: answerSystem,
      prompt: `Question: ${question}\nSQL Query: ${sql}\nData Result: ${JSON.stringify(rows)}\n\nPlease provide a natural language answer.`,
    });

    return NextResponse.json({
      ok: true,
      answer: answerResult.text,
      sql,
      rows,
      meta: {
        scope: "in_scope",
        category: scope.category,
        intent: parsedSql.intent ?? "",
        ms: Date.now() - start,
      },
    });
  } catch (err: any) {
    console.error("[Chat API ERROR]", err);
    return NextResponse.json(
      { ok: true, answer: ERROR_MESSAGES.CONNECTION_ERROR, meta: { scope: "fallback_error", error: String(err) } },
      { status: 200 }
    );
  }
}

