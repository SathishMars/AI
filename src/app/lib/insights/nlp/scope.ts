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
  { type: "logistics", words: ["logistics", "agenda", "venue", "av", "catering", "f&b", "transportation"] },
  { type: "sponsorship", words: ["sponsor package", "sponsorship", "booth", "exhibitor"] },
  { type: "speakers_content", words: ["speaker deck", "slides", "talk track", "session content"] },
  { type: "marketing", words: ["marketing", "campaign", "email blast", "social", "promotion"] },
  { type: "registration_system", words: ["cvent", "eventbrite", "swoogo", "registration website"] },
  { type: "legal_compliance", words: ["msa", "nda", "legal", "terms", "privacy", "gdpr"] },
  { type: "finance", words: ["finance", "tax", "gst", "tds"] },
  { type: "general_knowledge", words: ["who is", "what is", "tell me about", "explain", "define"] },
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
  const q = question.toLowerCase();

  // OUT-OF-SCOPE if it matches strong business areas beyond attendee dataset
  for (const bucket of OOS_KEYWORDS) {
    for (const w of bucket.words) {
      // Use regex with word boundaries but allow optional 's' for plurals
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}s?\\b`, 'i');
      if (regex.test(q)) {
        // Check if this is truly out of scope
        const hasAttendeeContext =
          q.includes("attendee") ||
          q.includes("registered") ||
          q.includes("count") ||
          q.includes("email") ||
          q.includes("phone") ||
          q.includes("mobile") ||
          q.includes("info") ||
          q.includes("detail");

        // General knowledge questions are always out of scope unless they mention attendee data/entity context
        if (bucket.type === "general_knowledge" && !hasAttendeeContext) {
          return { scope: "out_of_scope", outOfScopeType: bucket.type };
        }

        // Only trigger out-of-scope for other categories if it's a strong match and lacks attendee context
        if (!hasAttendeeContext) {
          return { scope: "out_of_scope", outOfScopeType: bucket.type };
        }
      }
    }
  }

  // IN-SCOPE category detection
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

  // default: assume in-scope but unknown category (LLM can decide)
  return { scope: "in_scope", category: "statistics_summaries" };
}

export function outOfScopeMessage() {
  return OUT_OF_SCOPE_MESSAGE;
}

// Legacy exports
export type Scope = InsightsScope;
export type InScopeCategory = InsightsInScopeCategory;

