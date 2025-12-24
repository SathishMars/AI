// INSIGHTS-SPECIFIC: Chat conversation and message storage
// This is separate from workflow data access (see lib/dal.ts)

import type { Db } from "mongodb";

export type InsightsChatRole = "user" | "assistant" | "system";

export async function upsertInsightsConversation(
  db: Db,
  params: { conversationId: string; userId?: string | null; title?: string | null }
) {
  const now = new Date();
  await db.collection("insights_conversations").updateOne(
    { conversationId: params.conversationId },
    {
      $setOnInsert: {
        conversationId: params.conversationId,
        userId: params.userId ?? null,
        createdAt: now,
      },
      $set: { title: params.title ?? "Aime Insights Chat", updatedAt: now },
    },
    { upsert: true }
  );
}

export async function saveInsightsMessage(
  db: Db,
  params: {
    conversationId: string;
    userId?: string | null;
    role: InsightsChatRole;
    content: string;
    meta?: Record<string, any>;
  }
) {
  await db.collection("insights_messages").insertOne({
    conversationId: params.conversationId,
    userId: params.userId ?? null,
    role: params.role,
    content: params.content,
    meta: params.meta ?? {},
    createdAt: new Date(),
  });
}

// Legacy exports for backward compatibility
export type ChatRole = InsightsChatRole;
export async function upsertConversation(db: Db, params: { conversationId: string; userId?: string | null; title?: string | null }) {
  return upsertInsightsConversation(db, params);
}
export async function saveMessage(db: Db, params: { conversationId: string; userId?: string | null; role: ChatRole; content: string; meta?: Record<string, any> }) {
  return saveInsightsMessage(db, params);
}

