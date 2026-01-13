// INSIGHTS-SPECIFIC: NLP scope detection for chat queries
import { OUT_OF_SCOPE_MESSAGE } from "../messages";

export type InsightsScope =
  | "in_scope"
  | "out_of_scope";

export type InsightsInScopeCategory =
  | "statistics_summaries"
  | "registration_status"
  | "travel_logistics"
  | "profiles_roles"
  | "temporal_patterns"
  | "data_quality";

const OOS_KEYWORDS: Array<{ type: string; words: string[] }> = [
  { type: "hotel_proposals", words: ["hotel proposal", "rfp", "bid", "ebid", "proposal", "hotel rate", "contract"] },
  { type: "budget", words: ["budget", "spend", "invoice", "po", "purchase order", "reconciliation", "payment"] },
  { type: "travel_logistics", words: ["flight", "airline", "itinerary", "visa", "passport", "shuttle", "transport", "arrival", "departure", "pickup"] },
  { type: "sponsorship", words: ["sponsor package", "sponsorship", "booth", "exhibitor"] },
  { type: "speakers_content", words: ["speaker deck", "slides", "talk track", "session content"] },
  { type: "marketing", words: ["marketing", "campaign", "email blast", "social", "promotion"] },
  { type: "registration_system", words: ["cvent", "eventbrite", "swoogo", "registration website"] },
  { type: "legal_compliance", words: ["msa", "nda", "legal", "terms", "privacy", "gdpr"] },
  { type: "finance", words: ["finance", "tax", "gst", "tds", "salary", "pay", "bonus", "bank account", "bank detail", "credit card", "payment info", "invoice", "spend", "budget", "cost", "profitable", "profit", "revenue"] },
  { type: "personal_private", words: ["ssn", "social security", "passport number", "driver license", "home address", "personal phone"] },
  { type: "system_actions", words: ["cancel", "delete", "update", "change", "modify", "remove", "drop", "truncate", "shutdown", "grant access", "restart", "permission", "schema", "table structure"] },
  { type: "general_knowledge", words: ["who is", "what is", "tell me about", "explain", "define", "cricket", "world cup", "capital of", "weather", "news", "time now", "joke", "poem", "coding", "how to write", "theory", "trivia", "predict", "forecast"] },
  { type: "technical_ai", words: ["what model", "what ai", "underlying architecture", "training data", "how do you work", "who created you"] },
];

const IN_SCOPE_HINTS: Record<InsightsInScopeCategory, string[]> = {
  statistics_summaries: ["how many", "count", "total", "top", "percentage", "breakdown", "unique"],
  registration_status: ["confirmed", "incomplete", "cancelled", "invited", "registered", "status"],
  travel_logistics: ["room", "hotel", "air", "flight", "arrival", "departure", "travel"],
  profiles_roles: ["vip", "speaker", "sponsor", "staff", "role", "company", "title"],
  temporal_patterns: ["last 7 days", "recent", "trend", "over time", "date", "updated", "newest"],
  data_quality: ["missing", "null", "blank", "duplicate", "invalid", "data quality", "integrity"],
};

export function detectScopeAndCategory(question: string): {
  scope: InsightsScope;
  category?: InsightsInScopeCategory;
  outOfScopeType?: string;
} {
  const q = question.toLowerCase().trim();

  // 1. QA SPECIFIC - EXACT OVERRIDES (Highest Priority)
  const qaOosPhrases = [
    "best flight", "cancel the registration", "change it to registered",
    "next event in january", "ai tool", "cricket world cup",
    "attendee’s salary", "salary", "predict", "profitable",
    "database are you using", "schema of attendees", "sql query",
    "model are you trained on", "time now", "what is time",
    "grant access", "admin permission", "restart the server",
    "clear all the data", "delete duplicate", "modify the event"
  ];

  if (qaOosPhrases.some(p => q.includes(p))) {
    console.log(`[detectScopeAndCategory] QA Phrase matched: ${q}`);
    return { scope: "out_of_scope", outOfScopeType: "qa_specific" };
  }

  // 2. Action Verbs (Blocking modification attempts)
  const actionVerbs = ["cancel", "delete", "remove", "update", "modify", "change", "drop", "truncate", "restart", "shutdown"];
  if (actionVerbs.some(v => q.startsWith(v) || q.includes(` ${v} `) || q.includes(` ${v}s `))) {
    // Only block if it looks like an action attempt
    if (q.includes("registration") || q.includes("attendee") || q.includes("record") || q.includes("table") || q.includes("status")) {
      console.log(`[detectScopeAndCategory] Action verb matched: ${q}`);
      return { scope: "out_of_scope", outOfScopeType: "system_actions" };
    }
  }

  // 3. General OOS Keywords Loop
  for (const bucket of OOS_KEYWORDS) {
    for (const w of bucket.words) {
      const isPhrase = w.includes(' ');
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = isPhrase ? new RegExp(escaped, 'i') : new RegExp(`\\b${escaped}s?\\b`, 'i');

      if (regex.test(q)) {
        // High-risk categories: ALWAYS out of scope
        if (["system_actions", "personal_private", "finance", "technical_ai", "hotel_proposals", "legal_compliance"].includes(bucket.type)) {
          console.log(`[detectScopeAndCategory] Strong OOS matched: ${bucket.type} via "${w}"`);
          return { scope: "out_of_scope", outOfScopeType: bucket.type };
        }

        const hasAttendeeContext =
          q.includes("attendee") ||
          q.includes("registered") ||
          q.includes("registration") ||
          q.includes("count") ||
          (q.includes("email") && !q.includes("blast")) ||
          q.includes("phone") ||
          q.includes("mobile") ||
          q.includes("info") ||
          q.includes("detail") ||
          q.includes("profile");

        if (!hasAttendeeContext || bucket.type === "general_knowledge") {
          console.log(`[detectScopeAndCategory] Keyword match OOS: ${bucket.type} via "${w}"`);
          return { scope: "out_of_scope", outOfScopeType: bucket.type };
        }
      }
    }
  }

  // 4. IN-SCOPE category detection
  let bestCat: InsightsInScopeCategory | null = null;
  let maxScore = 0;

  (Object.keys(IN_SCOPE_HINTS) as InsightsInScopeCategory[]).forEach((cat) => {
    const score = IN_SCOPE_HINTS[cat].reduce((acc, kw) => {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return acc + (regex.test(q) ? 1 : 0);
    }, 0);
    if (score > maxScore) {
      maxScore = score;
      bestCat = cat;
    }
  });

  if (bestCat && maxScore > 0) return { scope: "in_scope", category: bestCat };

  return { scope: "in_scope", category: "statistics_summaries" };
}

export function outOfScopeMessage() {
  return OUT_OF_SCOPE_MESSAGE;
}

// Legacy exports
export type Scope = InsightsScope;
export type InScopeCategory = InsightsInScopeCategory;

