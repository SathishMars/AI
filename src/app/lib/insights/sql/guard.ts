// INSIGHTS-SPECIFIC: SQL security and safety guards
const FORBIDDEN = [
  "insert", "update", "delete", "drop", "alter", "truncate", "create",
  "grant", "revoke", "commit", "rollback",
  "copy", "vacuum", "analyze",
];

export function ensureSafeSelect(sql: string) {
  const s = sql.trim();

  // must be a single SELECT statement
  if (!/^select\s/i.test(s)) {
    throw new Error("Only SELECT queries are allowed.");
  }

  // block semicolons to prevent multi-statement
  if (s.includes(";")) {
    throw new Error("Semicolons are not allowed.");
  }

  // block forbidden keywords
  const lower = s.toLowerCase();
  for (const kw of FORBIDDEN) {
    if (lower.includes(` ${kw} `) || lower.startsWith(`${kw} `)) {
      throw new Error(`Forbidden keyword detected: ${kw}`);
    }
  }

  return s;
}

export function forceLimit(sql: string, limit = 50) {
  const lower = sql.toLowerCase();
  // If already has limit, keep it but cap it
  const m = lower.match(/\blimit\s+(\d+)/);
  if (m) {
    const current = Number(m[1]);
    if (!Number.isFinite(current)) return sql;
    const capped = Math.min(current, limit);
    return sql.replace(/\blimit\s+\d+/i, `LIMIT ${capped}`);
  }
  return `${sql}\nLIMIT ${limit}`;
}
export const PII_COLUMNS = [
  "concur_login_id", "internal_notes"
];

/**
 * CRITICAL FIX #5: Hardened PII detection to prevent bypasses
 * Checks for PII columns in multiple contexts:
 * - Direct column references
 * - Column aliases (SELECT email AS e)
 * - Table-qualified columns (attendee.email)
 * - Comments (-- email)
 * - String literals that might contain PII
 */
export function containsPII(sql: string) {
  const lower = sql.toLowerCase();
  
  // Remove SQL comments to prevent bypass via comments
  // Handles both -- and /* */ style comments
  const withoutComments = lower
    .replace(/--.*$/gm, '') // Remove -- comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ comments
  
  // Check for any of the PII columns in multiple contexts
  return PII_COLUMNS.some(col => {
    // Pattern 1: Direct column reference (SELECT email)
    const directPattern = new RegExp(`\\b${col}\\b`, 'i');
    if (directPattern.test(withoutComments)) {
      return true;
    }
    
    // Pattern 2: Column with alias (SELECT email AS e, SELECT e.email)
    const aliasPattern = new RegExp(`\\b${col}\\s+as\\s+\\w+|\\w+\\.${col}\\b`, 'i');
    if (aliasPattern.test(withoutComments)) {
      return true;
    }
    
    // Pattern 3: Table-qualified column (SELECT attendee.email, public.attendee.email)
    const qualifiedPattern = new RegExp(`\\w+\\.${col}\\b`, 'i');
    if (qualifiedPattern.test(withoutComments)) {
      return true;
    }
    
    // Pattern 4: In SELECT clause with potential string manipulation
    // Matches patterns like: SELECT CONCAT(email, ...), SELECT SUBSTRING(email, ...)
    const functionPattern = new RegExp(`(concat|substring|substr|lower|upper|trim|coalesce)\\s*\\([^)]*\\b${col}\\b`, 'i');
    if (functionPattern.test(withoutComments)) {
      return true;
    }
    
    return false;
  });
}

