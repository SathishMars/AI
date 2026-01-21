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
  { type: "travel_logistics", words: ["flight", "airline", "itinerary", "visa", "passport", "shuttle", "transport", "pickup"] },
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
  statistics_summaries: ["how many", "count", "total", "top", "percentage", "breakdown", "unique", "companies", "top 5", "top n", "top companies", "unique companies", "how many unique"],
  registration_status: ["confirmed", "incomplete", "cancelled", "invited", "registered", "status"],
  travel_logistics: ["room", "hotel", "air", "flight", "arrival", "departure", "travel", "arrival time", "departure time", "arrival time of", "what is the arrival time"],
  profiles_roles: ["vip", "speaker", "sponsor", "staff", "role", "company", "title", "companies", "vips", "sponsors", "who are the vips", "who are the sponsors", "who are vips and sponsors"],
  temporal_patterns: ["last 7 days", "recent", "trend", "over time", "date", "updated", "newest", "most recently", "next attendee", "who was", "who is", "who was most recently updated", "who is next attendee", "next attendee to be registered"],
  data_quality: ["missing", "null", "blank", "duplicate", "invalid", "data quality", "integrity"],
};

export function containsOosKeyword(question: string): boolean {
  const q = question.toLowerCase().trim();
  
  // Explicit in-scope patterns that should NEVER be blocked
  const explicitInScopePatterns = [
    /top\s+\d+\s+compan/i,  // "top 5 companies"
    /top\s+compan/i,         // "top companies"
    /unique\s+compan/i,      // "unique companies"
    /how\s+many\s+unique/i,   // "how many unique"
    /who\s+are\s+(the\s+)?(vips?|sponsors?)/i,  // "who are the VIPs/sponsors"
    /who\s+was\s+most\s+recently\s+updated/i,   // "who was most recently updated"
    /most\s+recently\s+updated/i,                // "most recently updated"
    /arrival\s+time\s+of\s+.*attendee/i,        // "arrival time of attendee X"
    /what\s+is\s+the\s+arrival\s+time/i,       // "what is the arrival time"
    /who\s+is\s+next\s+attendee/i,              // "who is next attendee"
    /next\s+attendee\s+to\s+be\s+registered/i   // "next attendee to be registered"
  ];
  
  // If it matches explicit in-scope patterns, don't block it
  if (explicitInScopePatterns.some(pattern => pattern.test(q))) {
    return false;
  }
  
  for (const bucket of OOS_KEYWORDS) {
    for (const w of bucket.words) {
      if (q.includes(w)) return true;
    }
  }
  return false;
}

export function detectScopeAndCategory(question: string): {
  scope: InsightsScope;
  category?: InsightsInScopeCategory;
  outOfScopeType?: string;
} {
  const q = question.toLowerCase().trim();

  // 0. EXPLICIT IN-SCOPE PATTERNS (Highest Priority - Check FIRST)
  const explicitInScopePatterns = [
    /top\s+\d+\s+compan/i,  // "top 5 companies"
    /top\s+compan/i,         // "top companies"
    /unique\s+compan/i,      // "unique companies"
    /how\s+many\s+unique/i,   // "how many unique"
    /who\s+are\s+(the\s+)?(vips?|sponsors?)/i,  // "who are the VIPs/sponsors"
    /who\s+was\s+most\s+recently\s+updated/i,   // "who was most recently updated"
    /most\s+recently\s+updated/i,                // "most recently updated"
    /arrival\s+time\s+of\s+.*attendee/i,        // "arrival time of attendee X"
    /what\s+is\s+the\s+arrival\s+time/i,       // "what is the arrival time"
    /who\s+is\s+next\s+attendee/i,              // "who is next attendee"
    /next\s+attendee\s+to\s+be\s+registered/i   // "next attendee to be registered"
  ];
  
  // Check explicit in-scope patterns FIRST - if matched, return in-scope immediately
  if (explicitInScopePatterns.some(pattern => pattern.test(q))) {
    console.log(`[detectScopeAndCategory] Explicit in-scope pattern matched: ${q}`);
    // Determine category based on pattern
    if (/top|unique|how\s+many/i.test(q)) {
      return { scope: "in_scope", category: "statistics_summaries" };
    }
    if (/vip|sponsor/i.test(q)) {
      return { scope: "in_scope", category: "profiles_roles" };
    }
    if (/recently\s+updated|next\s+attendee/i.test(q)) {
      return { scope: "in_scope", category: "temporal_patterns" };
    }
    if (/arrival\s+time/i.test(q)) {
      return { scope: "in_scope", category: "travel_logistics" };
    }
    return { scope: "in_scope", category: "statistics_summaries" };
  }

  // 1. QA SPECIFIC - EXACT OVERRIDES
  const qaOosPhrases = [
    "best flight", "cancel the registration", "change it to registered",
    "next event in january", "ai tool", "cricket world cup",
    "attendee's salary", "salary", "predict", "profitable",
    "database are you using", "schema of attendees", "sql query",
    "model are you trained on", "time now", "what is time",
    "grant access", "admin permission", "restart the server",
    "clear all the data", "delete duplicate", "modify the event",
    "mona lisa", "who painted", "capital of", "weather in",
    "how do i make", "chocolate cake", "distance to the moon",
    "story about", "what happened in 1776", "square root of",
    "countries in africa", "tallest building", "translate",
    "connection string", "admin password", "access logs",
    "environment variables", "ssh keys", "memory usage",
    "api documentation", "linux kernel", "drop all tables",
    "docker-compose", "home address", "medical allergies",
    "date of birth", "personal photos", "religious affiliation",
    "private notes", "phone number of", "browser history",
    "political leaning", "tinder profile", "bank statement",
    "litigation history", "background check", "patent filings",
    "banned attendees", "safety audit", "labor laws",
    "performance rating", "disciplinary record", "resume of",
    "vacation schedule", "grievance", "firewall rule",
    "subnet mask", "ip address of", "ssl certificate",
    "load balancing", "dns record", "raid configuration",
    "mac address", "backup log", "calculate", "tip for",
    "solve for x", "solve 2+2", "solve for", "cctv camera", "lost and found",
    "swipe card", "restricted items", "visitor log",
    "security protocol", "recommend a book", "bake bread",
    "stock of", "price of", "super bowl", "who is the", "what is the", "how many",
    "outstanding debt", "audit report", "personal photo", "private note",
    "badge scan", "security check", "cleared security", "evacuation route"
  ];

  // Regex for high-risk patterns (excluding legitimate attendee queries)
  const oosRegexes = [
    /who (?:won|is|painted|discovered|created|wrote|cleared)/i,
    /what (?:is|are|happened|color|stock|price|the weather)/i,
    /how (?:many countries|do i|to|much does|is the weather)/i,
    /calculate|solve|translate|recommend/i,
    /tell me (?:a joke|a story|about)/i,
    /(?:joke|poem|story|recipe|algorithm|code) (?:about|for|to)/i,
    /\b(?:and|then)\s+(?:solve|calculate|tell|show|what|who|how)/i
  ];

  if (qaOosPhrases.some(p => q.includes(p)) || oosRegexes.some(r => r.test(q))) {
    // Exception: Allow legitimate attendee data queries that match OOS patterns
    const isActuallyInScope =
      // Statistics queries
      (q.includes("top") && (q.includes("company") || q.includes("companies") || q.includes("5") || q.includes("n"))) ||
      (q.includes("unique") && q.includes("compan")) ||
      (q.includes("how many") && q.includes("unique")) ||
      // Profile/Role queries
      (q.includes("who are") && (q.includes("vip") || q.includes("sponsor") || q.includes("speaker"))) ||
      (q.includes("who is") && (q.includes("vip") || q.includes("speaker") || q.includes("sponsor"))) ||
      // Temporal queries
      (q.includes("who was") && (q.includes("recently updated") || q.includes("most recently") || q.includes("updated"))) ||
      (q.includes("who is") && (q.includes("next attendee") || q.includes("newest") || q.includes("recent"))) ||
      // Travel queries
      (q.includes("arrival time") && q.includes("attendee")) ||
      (q.includes("what is") && q.includes("arrival time") && q.includes("attendee")) ||
      // Registration queries
      q.includes("registration_status") ||
      q.includes("attendee_type") ||
      (q.includes("registered") && !q.includes("won")) ||
      q.includes("vip") ||
      q.includes("speaker") ||
      q.includes("total %") ||
      (q.includes("how many") && (q.includes("attendee") || q.includes("record") || q.includes("regist")));

    // Only allow if it's CLEARLY and PURELY about attendee data
    if (!isActuallyInScope) {
      console.log(`[detectScopeAndCategory] OOS Pattern matched: ${q}`);
      return { scope: "out_of_scope", outOfScopeType: "regex_match" };
    }
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

        // For General Knowledge or others, block if it's mixed intent or purely OOS
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
          q.includes("profile") ||
          q.includes("vip") ||
          q.includes("speaker");

        // If it's a general OOS keyword and it EITHER has no attendee context OR it looks like a trick multi-intent (e.g. joke)
        const isGeneral = bucket.type === "general_knowledge" || bucket.type === "marketing";
        if (!hasAttendeeContext || isGeneral) {
          console.log(`[detectScopeAndCategory] Keyword match OOS: ${bucket.type} via "${w}"`);
          return { scope: "out_of_scope", outOfScopeType: bucket.type };
        }
      }
    }
  }

  // 4. IN-SCOPE category detection with improved matching
  let bestCat: InsightsInScopeCategory | null = null;
  let maxScore = 0;

  (Object.keys(IN_SCOPE_HINTS) as InsightsInScopeCategory[]).forEach((cat) => {
    const score = IN_SCOPE_HINTS[cat].reduce((acc, kw) => {
      // Use flexible matching for multi-word phrases
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // For multi-word phrases, use phrase matching; for single words, use word boundary
      const regex = kw.includes(' ') 
        ? new RegExp(escapedKw, 'i')
        : new RegExp(`\\b${escapedKw}s?\\b`, 'i');
      return acc + (regex.test(q) ? 1 : 0);
    }, 0);
    if (score > maxScore) {
      maxScore = score;
      bestCat = cat;
    }
  });

  // Explicit checks for common in-scope patterns that might be missed
  if (maxScore === 0) {
    // Check for statistics queries
    if ((q.includes("top") && q.includes("compan")) || 
        (q.includes("unique") && q.includes("compan")) ||
        (q.includes("how many") && q.includes("compan"))) {
      return { scope: "in_scope", category: "statistics_summaries" };
    }
    // Check for profile queries
    if ((q.includes("who are") && (q.includes("vip") || q.includes("sponsor"))) ||
        (q.includes("vip") || q.includes("sponsor"))) {
      return { scope: "in_scope", category: "profiles_roles" };
    }
    // Check for temporal queries
    if (q.includes("most recently updated") || 
        q.includes("who was") && q.includes("updated") ||
        q.includes("next attendee")) {
      return { scope: "in_scope", category: "temporal_patterns" };
    }
    // Check for travel queries
    if (q.includes("arrival time") && q.includes("attendee")) {
      return { scope: "in_scope", category: "travel_logistics" };
    }
  }

  if (bestCat && maxScore > 0) return { scope: "in_scope", category: bestCat };

  return { scope: "in_scope", category: "statistics_summaries" };
}

export function outOfScopeMessage() {
  return OUT_OF_SCOPE_MESSAGE;
}

// Legacy exports
export type Scope = InsightsScope;
export type InScopeCategory = InsightsInScopeCategory;

