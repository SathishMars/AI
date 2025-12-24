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
import { buildContextSummary, type InsightsChatMsg } from "@/app/lib/insights/nlp/context";
import { getInsightsMongoDb } from "@/app/lib/insights/mongo";
import { upsertInsightsConversation, saveInsightsMessage } from "@/app/lib/insights/chatRepo";

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

export async function POST(req: Request) {
  const start = Date.now();

  // AI Provider Initializations
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

  // Active Model Selection
  //const model = anthropic("claude-3-5-haiku-latest");
  const model = openai("gpt-4o"); // or "gpt-3.5-turbo"
  //const model = groq("llama-3.3-70b-versatile");

  try {
    const body = BodySchema.parse(await req.json());
    const question = body.question.trim();
    const history = (body.history ?? []) as InsightsChatMsg[];
    const conversationId = body.conversationId ?? "fallback-session";

    // 0) MongoDB Logging Start
    let db: any = null;
    try {
      db = await getInsightsMongoDb();
      await upsertInsightsConversation(db, {
        conversationId,
        title: "Aime Insights Chat",
      });
      await saveInsightsMessage(db, {
        conversationId,
        role: "user",
        content: question,
      });
    } catch (mongoErr) {
      console.error("[Chat API] MongoDB pre-log failed:", mongoErr);
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
        answer: "AIME Insights policy prohibits the disclosure of personal data, including dietary restrictions. This information is considered out of scope and PII, and cannot be disclosed. I can provide statistical trends or high-level attendee profiles upon request.",
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

    const jsonMatch = sqlResult.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }

    const parsedSql = SqlOut.parse(JSON.parse(jsonMatch[0]));

    // CHECK FOR PII IN GENERATED SQL
    if (containsPII(parsedSql.sql)) {
      console.warn(`[Chat API] PII DETECTED IN SQL: ${parsedSql.sql}`);
      return NextResponse.json({
        ok: true,
        answer: "AIME Insights policy prohibits the disclosure of personal data, including dietary restrictions. This information is considered out of scope and PII, and cannot be disclosed. I can provide statistical trends or high-level attendee profiles upon request.",
        meta: { scope: "pii_blocked", ms: Date.now() - start },
      });
    }

    let sql = ensureSafeSelect(parsedSql.sql);
    sql = forceLimit(sql, 50);

    console.log(`[Chat API] Executing SQL: ${sql}`);
    const dbRes = await queryWithTimeout(sql, [], 3000);
    const rows = (dbRes as any).rows;

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
    // 4) MongoDB Log Answer
    if (db) {
      try {
        await saveInsightsMessage(db, {
          conversationId,
          role: "assistant",
          content: answerResult.text,
          meta: { sql, rowCount: rows?.length || 0 },
        });
      } catch (mongoErr) {
        console.error("[Chat API] MongoDB post-log failed:", mongoErr);
      }
    }

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
      { ok: true, answer: "I'm having trouble connecting to my brain right now. Please try again.", meta: { scope: "fallback_error", error: String(err) } },
      { status: 200 }
    );
  }
}

