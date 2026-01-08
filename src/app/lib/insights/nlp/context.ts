// INSIGHTS-SPECIFIC: NLP context building for chat conversations
export type InsightsChatMsg = { role: "user" | "assistant"; text: string };

export function buildContextSummary(history: InsightsChatMsg[] = []) {
  // Keep it simple for sprint 1: send last few utterances.
  if (!Array.isArray(history)) return "";
  const recent = (history || []).slice(-6).map((m) => `${m.role?.toUpperCase() || 'USER'}: ${m.text || ''}`).join("\n");
  return recent ? `Conversation so far:\n${recent}` : "";
}

// Legacy export
export type ChatMsg = InsightsChatMsg;

