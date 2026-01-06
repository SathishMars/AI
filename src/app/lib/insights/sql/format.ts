// INSIGHTS-SPECIFIC: SQL result formatting utilities
export function formatResultToAnswer(rows: any[]) {
  if (!rows || rows.length === 0) {
    return "I didn't find any matching records.";
  }

  // If it looks like an aggregate (single row, few keys)
  if (rows.length === 1 && Object.keys(rows[0]).length <= 4) {
    const parts = Object.entries(rows[0]).map(([k, v]) => `${k}: ${v}`);
    return `Here's what I found:\n${parts.join("\n")}`;
  }

  // Otherwise summarize + show first few rows
  const preview = rows.slice(0, 5);
  const cols = Object.keys(preview[0]);
  const lines = preview.map((r) => cols.map((c) => String(r[c] ?? "")).join(" | "));

  return [
    `I found **${rows.length}** rows. Here are the first ${preview.length}:`,
    cols.join(" | "),
    ...lines,
  ].join("\n");
}

