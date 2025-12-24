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
  "email", "phone", "mobile", "mailing_address",
  "employee_id", "concur_login_id", "internal_notes", "dietary", "dietary_restrictions"
];

export function containsPII(sql: string) {
  const lower = sql.toLowerCase();
  // Check for any of the PII columns as standalone words to avoid partial matches
  // like 'phone_count' (though unlikely in this schema, it's safer)
  return PII_COLUMNS.some(col => {
    const regex = new RegExp(`\\b${col}\\b`, 'i');
    return regex.test(lower);
  });
}

