// INSIGHTS-SPECIFIC: AIME chat panel component
"use client";

import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { insightsSuggestions } from "@/app/lib/insights/data";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getGraphQLUrl } from "@/app/utils/api";
import { ERROR_MESSAGES } from "@/app/lib/insights/messages";
import { env } from "@/app/lib/env";
import { logger } from "@/app/lib/logger";
import { CommandHistory } from "./CommandHistory";

type Msg = { id: string; role: "assistant" | "user"; text: string; ts: string; sql?: string; data?: any[]; meta?: any };

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function InsightsAimePanel() {
  const { aimeOpen, setAimeOpen, setAimeAction, eventId } = useInsightsUI();
  const [conversationId] = useState(() => crypto.randomUUID());

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const canSend = useMemo(() => input.trim().length >= 3 && input.trim().length <= 200, [input]);

  function push(role: Msg["role"], text: string, sql?: string, data?: any[], meta?: any) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text, ts: nowTime(), sql, data, meta }]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  /**
   * Checks if data is substantial enough to warrant Excel export.
   * Only exports tabular data with multiple rows and columns.
   */
  function shouldShowExport(data: any[]): boolean {
    if (!data || data.length === 0) return false;

    // Skip single-row results (likely aggregates like COUNT, SUM, etc.)
    if (data.length < 2) return false;

    // Check if it's tabular data (array of objects)
    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object' || Array.isArray(firstRow)) return false;

    // Must have multiple columns to be worth exporting
    const keys = Object.keys(firstRow);
    if (keys.length < 2) return false;

    return true;
  }

  async function handleExport(data: any[], format: "xlsx", filename = "aime-export") {
    if (format === "xlsx") {
      const XLSX = await import("xlsx");

      // Format date: "Wednesday, December 10, 2025, 6:23 AM"
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const downloadedTime = `${dateStr}, ${timeStr}`;

      // Create worksheet from data
      const ws = XLSX.utils.json_to_sheet(data);

      // Get the range of existing data
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

      // Create new worksheet data object
      const newData: any = {};

      // Copy header row (row 0) to row 5
      for (let C = range.s.c; C <= range.e.c; C++) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
        const newHeaderCell = XLSX.utils.encode_cell({ r: 5, c: C });
        if (ws[headerCell]) {
          newData[newHeaderCell] = ws[headerCell];
        }
      }

      // Shift data rows (rows 1+) down by 5 rows (to rows 6+)
      for (let R = 1; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R + 5, c: C });
          const oldAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[oldAddress]) {
            newData[cellAddress] = ws[oldAddress];
          }
        }
      }

      // Add header rows at the top
      newData['A1'] = { t: 's', v: 'Event Data' };
      newData['A2'] = { t: 's', v: 'Downloaded data' };
      newData['A3'] = { t: 's', v: downloadedTime };
      newData['A4'] = { t: 's', v: 'Notice: This report may contain personally identifiable and other client confidential data. Usage and distribution of this report should be governed by relevant regulations and your own organization\'s policies.' };
      // Row 5 is empty (no cell added)

      // Clear old cells and update worksheet with new data
      Object.keys(ws).forEach(key => {
        if (key.startsWith('!')) {
          // Keep worksheet metadata
          return;
        }
        delete ws[key];
      });
      Object.assign(ws, newData);

      // Update the range to include header rows
      ws['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: range.s.c },
        e: { r: range.e.r + 5, c: range.e.c }
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }
  }

  async function send(text: string) {
    const q = text.trim();
    if (q.length < 3 || isTyping) return;

    push("user", q);
    setInput("");
    setIsTyping(true);

    try {
      // No timeout - allow queries to complete regardless of duration
      // Connect directly to GraphQL server (no proxy)
      const graphqlUrl = getGraphQLUrl();
      logger.debugGraphQL("[AimePanel] Connecting to GraphQL server at:", graphqlUrl);
      
      let response: Response;
      try {
        response = await fetch(graphqlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              mutation chat($input: ChatInput!) {
                chat(input: $input) {
                  ok
                  answer
                  sql
                  rows
                  meta
                }
              }
            `,
            variables: {
              input: {
                conversationId,
                question: q,
                eventId,
                history: messages.map(m => ({ role: m.role, text: m.text }))
              }
            }
          }),
        });
      } catch (fetchError: any) {
        // Network error (server not running, CORS, connection refused, etc.)
        logger.error("[AimePanel] Fetch error:", fetchError);
        const errorMessage = fetchError?.message || "Failed to connect to GraphQL server";
        logger.debugGraphQL(`[AimePanel] GraphQL URL was: ${graphqlUrl}`);
        logger.debugGraphQL(`[AimePanel] Error details:`, {
          message: fetchError?.message,
          name: fetchError?.name,
          stack: fetchError?.stack
        });
        logger.debugGraphQL(`[AimePanel] Troubleshooting:`);
        logger.debugGraphQL(`  1. Start the GraphQL server: npx tsx src/insights-server.ts (or docker-compose up insights-backend)`);
        logger.debugGraphQL(`  2. Verify server is running: curl http://localhost:4000/health`);
        logger.debugGraphQL(`  3. Check NEXT_PUBLIC_GRAPHQL_URL environment variable (current: ${graphqlUrl})`);
        logger.debugGraphQL(`  4. Verify CORS is configured on the GraphQL server`);
        
        push("assistant", `⚠️ Connection Error: Unable to connect to GraphQL server at ${graphqlUrl}.\n\nTo fix this:\n1. Start the GraphQL server: \`npx tsx src/insights-server.ts\`\n2. Or use Docker: \`docker-compose up insights-backend\`\n3. Verify server is running: \`curl http://localhost:4000/health\`\n4. Check browser console for more details`);
        setIsTyping(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Chat API HTTP error:", response.status, response.statusText, errorText);
        
        // Check for timeout status codes
        if (response.status === 504 || response.status === 408) {
          push("assistant", ERROR_MESSAGES.TIMEOUT_ERROR);
        } else {
          push("assistant", ERROR_MESSAGES.SERVICE_UNAVAILABLE);
        }
        return;
      }

      const resJson = await response.json();
      logger.debugGraphQL("Chat API response:", { status: response.status, hasData: !!resJson.data, hasChat: !!resJson.data?.chat, errors: resJson.errors });
      
      // Check for GraphQL errors
      if (resJson.errors && resJson.errors.length > 0) {
        logger.error("GraphQL errors:", resJson.errors);
        const errorMessage = resJson.errors[0]?.message || "Unknown GraphQL error";
        push("assistant", `Error: ${errorMessage}`);
        return;
      }
      
      const data = resJson.data?.chat;

      if (data && data.ok) {
        // Store message with meta information (including action)
        push("assistant", data.answer, data.sql, data.rows, data.meta);

        // Handle UI actions from AIME (actions are nested in meta)
        if (data.meta?.action) {
          setAimeAction(data.meta.action);
        }
      } else {
        logger.error("Chat API data error:", { data, resJson });
        push("assistant", data?.answer || ERROR_MESSAGES.PROCESSING_ERROR);
      }
    } catch (error) {
      logger.error("Chat API error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : '';
      
      // Detect timeout errors
      const isTimeout = 
        errorName === 'AbortError' ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Timeout') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('network timeout');
      
      // Detect network errors
      const isNetworkError =
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND');
      
      logger.debugGraphQL("Chat API error details:", { 
        errorMessage, 
        errorName, 
        isTimeout, 
        isNetworkError,
        error 
      });
      
      // Provide specific error messages
      if (isTimeout) {
        push("assistant", ERROR_MESSAGES.TIMEOUT_ERROR);
      } else if (isNetworkError) {
        push("assistant", ERROR_MESSAGES.NETWORK_ERROR);
      } else {
        push("assistant", ERROR_MESSAGES.SERVICE_UNAVAILABLE);
      }
    } finally {
      setIsTyping(false);
    }
  }

  if (!aimeOpen) {
    return (
      <button
        onClick={() => setAimeOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 50,
          display: 'flex',
          minHeight: '24px',
          padding: '16px',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '9999px',
          background: '#F3E8FF',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--tailwind-colors-purple-900, #581C87)',
          fontFamily: 'var(--font-heading, "Instrument Sans")',
          fontSize: 'var(--text-2xl-font-size, 24px)',
          fontStyle: 'normal',
          fontWeight: 'var(--font-weight-bold, 700)',
          lineHeight: 'var(--text-2xl-line-height, 32px)',
        }}
        className="hover:bg-purple-200 transition-all hover:scale-105 active:scale-95"
      >
        <img
          src={`${env.basePath}/aime-star.png`}
          alt="aime logo"
          width={24}
          height={24}
          style={{
            width: '24px',
            height: '24px',
            display: 'block',
          }}
          loading="eager"
        />
        <span>
          Ask aime
        </span>
      </button>
    );
  }

  return (
    <aside
      style={{
        display: 'flex',
        width: '382px',
        height: '960px',
        padding: 'var(--Space-400, 16px)',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '16px',
        borderLeft: '1px solid var(--base-border, #E6EAF0)',
        background: 'var(--base-card, #FFF)',
      }}
      className="flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '24px',
          alignSelf: 'stretch',
        }}
      >
        {/* aime branding */}
        <div
          style={{
            display: 'flex',
            minHeight: '24px',
            alignItems: 'center',
            gap: 'var(--spacing-2-5, 10px)',
            flex: '1 0 0',
          }}
        >
          {/* aimeicon */}
          <div
            style={{
              display: 'flex',
              width: '24px',
              height: '24px',
              justifyContent: 'center',
              alignItems: 'center',
              aspectRatio: '1/1',
            }}
          >
            <img
              src={`${env.basePath}/aime-star.png`}
              alt="aime icon"
              width={24}
              height={24}
              style={{
                width: '24px',
                height: '24px',
                display: 'block',
              }}
              loading="eager"
            />
          </div>
          {/* aimeprofile */}
          <span
            style={{
              color: 'var(--base-foreground, #161C24)',
              fontFamily: 'var(--font-heading, "Instrument Sans")',
              fontSize: 'var(--text-xl-font-size, 20px)',
              fontStyle: 'normal',
              fontWeight: 'var(--font-weight-bold, 700)',
              lineHeight: 'var(--text-xl-line-height, 28px)',
              display: 'flex',
            }}
          >
            aime
          </span>
        </div>

        {/* CTAGroup */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 'var(--spacing-1, 4px)',
          }}
        >
          {/* Button (minimize) */}
          <button
            type="button"
            onClick={() => setAimeOpen(false)}
            style={{
              display: 'flex',
              minWidth: '32px',
              maxWidth: '32px',
              minHeight: '32px',
              maxHeight: '32px',
              padding: 'var(--spacing-2, 8px)',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              background: 'var(--tailwind-colors-base-transparent, rgba(255, 255, 255, 0.00))',
              border: 'none',
              cursor: 'pointer',
            }}
            className="hover:bg-[#f9fafb] transition-colors"
            title="Minimize"
          >
            <img
              src={`${env.basePath}/dash_bottom.svg`}
              alt="Minimize"
              width={16}
              height={16}
              style={{
                width: '16px',
                height: '16px',
                flexShrink: 0,
                aspectRatio: '1/1',
                display: 'block',
              }}
              loading="eager"
            />
          </button>
        </div>
      </div>

      {/* contentcontainer */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '16px',
          flex: '1 0 0',
          alignSelf: 'stretch',
          width: '100%',
          maxWidth: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
        }}
      >
        {messages.length === 0 && (
          <>
            {/* Description */}
            <div
              style={{
                display: 'flex',
                padding: '0 8px',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                flex: '1 0 0',
                alignSelf: 'stretch',
              }}
            >
              {/* icon */}
              <div
                style={{
                  display: 'flex',
                  width: 'var(--width-w-12, 48px)',
                  height: '48px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  aspectRatio: '1/1',
                }}
              >
                <img
                  src={`${env.basePath}/aime-star.png`}
                  alt="aime icon"
                  width={48}
                  height={48}
                  style={{
                    width: '48px',
                    height: '48px',
                    display: 'block',
                  }}
                  loading="eager"
                />
              </div>
              {/* text */}
              <div
                style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-heading, "Instrument Sans")',
                  fontSize: 'var(--text-xl-font-size, 20px)',
                  fontStyle: 'normal',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  lineHeight: 'var(--text-xl-line-height, 28px)',
                  letterSpacing: '-0.2px',
                  color: 'var(--base-foreground, #161C24)',
                }}
              >
                Meet aime — your AI assistant for analyzing & creating your event reports.
              </div>
            </div>
          </>
        )}

        {/* suggestions - always visible */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 'var(--spacing-1-5, 6px)',
            alignSelf: 'stretch',
          }}
        >
          {insightsSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              style={{
                display: 'flex',
                padding: 'var(--spacing-4, 16px)',
                alignItems: 'flex-start',
                gap: 'var(--spacing-4, 16px)',
                alignSelf: 'stretch',
                borderRadius: 'var(--border-radius-rounded-md, 8px)',
                border: '1px solid var(--base-border, #E6EAF0)',
                background: 'var(--base-card, #FFF)',
                width: '100%',
                maxWidth: '100%',
              }}
              className="w-full text-left hover:bg-[#f9fafb] transition-colors"
            >
              <span
                style={{
                  fontFamily: 'var(--font-body, "Open Sans")',
                  fontSize: 'var(--text-sm-font-size, 14px)',
                  fontStyle: 'normal',
                  fontWeight: 'var(--font-weight-normal, 400)',
                  lineHeight: 'var(--text-sm-line-height, 20px)',
                  color: 'var(--base-foreground, #161C24)',
                  flex: '1 0 0',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
              >
                {s}
              </span>
            </button>
          ))}
          {/* button */}
          <button
            type="button"
            style={{
              display: 'flex',
              height: 'var(--height-h-8, 32px)',
              padding: 'var(--spacing-2, 8px) var(--spacing-3, 12px)',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              alignSelf: 'stretch',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              background: 'var(--base-secondary, #F1F3F7)',
            }}
            className="hover:bg-[#e5e7eb] transition-colors"
          >
            <img
              src={`${env.basePath}/Sparkles.svg`}
              alt="Sparkles"
              width={16}
              height={16}
              style={{
                width: '16px',
                height: '16px',
                display: 'block',
              }}
              loading="eager"
            />
            <span
              style={{
                fontFamily: 'var(--font-body, "Open Sans")',
                fontSize: 'var(--text-xs-font-size, 12px)',
                fontStyle: 'normal',
                fontWeight: 'var(--font-weight-semibold, 600)',
                lineHeight: 'var(--text-xs-line-height, 16px)',
                color: 'var(--base-foreground, #161C24)',
              }}
            >
              View all aime suggestions
            </span>
          </button>
        </div>

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-4 w-full" style={{ width: '100%', maxWidth: '100%' }}>
            {messages.map((m) => (
              <div key={m.id} className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`} style={{ width: '100%', maxWidth: '100%' }}>
                <div
                  className={[
                    "rounded-2xl border px-3 py-2 shadow-sm",
                    m.role === "user"
                      ? "border-[#111827] bg-[#111827] text-white"
                      : "border-[#e5e7eb] bg-white text-[#111827]",
                  ].join(" ")}
                  style={{
                    maxWidth: '90%',
                    width: 'fit-content',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  <div className="mb-1 text-[10px] opacity-75">
                    {m.role === "assistant" ? "aime" : "You"} · {m.ts}
                  </div>

                  <div className="prose prose-sm prose-slate text-[12px] leading-snug" style={{ maxWidth: '100%', width: '100%' }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-2 rounded-lg border border-gray-100" style={{ maxWidth: '100%', width: '100%' }}>
                            <table className="min-w-full divide-y divide-gray-200" style={{ width: '100%', tableLayout: 'auto' }} {...props} />
                          </div>
                        ),
                        th: ({ node, ...props }) => (
                          <th 
                            className="bg-gray-50 px-2 py-1.5 text-left text-[11px] font-semibold text-gray-700" 
                            style={{ wordBreak: 'break-word', maxWidth: '120px' }}
                            {...props} 
                          />
                        ),
                        td: ({ node, ...props }) => (
                          <td 
                            className="px-2 py-1 border-t border-gray-100 text-[11px]" 
                            style={{ wordBreak: 'break-word', maxWidth: '120px' }}
                            {...props} 
                          />
                        ),
                        p: ({ node, ...props }) => (
                          <p style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }} {...props} />
                        ),
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>

                  {m.data && m.data.length > 0 && shouldShowExport(m.data) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleExport(m.data!, "xlsx", `aime-export-${new Date().toISOString().split('T')[0]}`)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#374151] hover:bg-gray-50 transition-colors"
                        title="Export to Excel"
                      >
                        <span className="text-[#10b981]">⬇</span> Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start w-full" style={{ width: '100%', maxWidth: '100%' }}>
                <div 
                  className="rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2 text-[#111827] shadow-sm"
                  style={{
                    maxWidth: '90%',
                    width: 'fit-content',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  <div className="mb-0.5 text-[10px] opacity-75">aime · thinking...</div>
                  <div className="flex gap-1 py-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c3aed] [animation-delay:-0.3s]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c3aed] [animation-delay:-0.15s]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c3aed]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input Group */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          alignSelf: 'stretch',
          borderRadius: 'var(--border-radius-rounded-md, 8px)',
          border: 'var(--border-width-border, 1px) solid var(--base-input, #E6EAF0)',
          background: 'var(--custom-background-dark-input-30, #FFF)',
        }}
      >
        {/* Label text */}
        <div
          style={{
            paddingTop: 'var(--spacing-3, 12px)',
            paddingRight: 'var(--spacing-3, 12px)',
            paddingBottom: '0px',
            paddingLeft: 'var(--spacing-3, 12px)',
            alignSelf: 'stretch',
          }}
        >
          <div
            style={{
              color: 'var(--base-muted-foreground, #637584)',
              fontFamily: 'var(--font-body, "Open Sans")',
              fontSize: 'var(--text-sm-font-size, 14px)',
              fontStyle: 'normal',
              fontWeight: 'var(--font-weight-normal, 400)',
              lineHeight: 'var(--text-sm-line-height, 20px)',
            }}
          >
            Ask aime to analyse anything or use suggested prompt for the start.
          </div>
        </div>

        {/* textarea */}
        <div
          style={{
            display: 'flex',
            height: '64px',
            minHeight: 'var(--height-h-16, 64px)',
            paddingTop: 'var(--spacing-3, 12px)',
            paddingRight: 'var(--spacing-3, 12px)',
            paddingBottom: 'var(--spacing-3, 12px)',
            paddingLeft: 'var(--spacing-3, 12px)',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            alignSelf: 'stretch',
          }}
        >
          <textarea
            className="flex-1 resize-none border-0 bg-transparent outline-none focus:ring-0"
            placeholder=""
            value={input}
            onChange={(event) => {
              const value = event.target.value;
              setInput(value.slice(0, 200));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) send(input);
              }
            }}
            autoFocus
            rows={1}
            style={{
              flex: '1 0 0',
              alignSelf: 'stretch',
              color: 'var(--base-foreground, #161C24)',
              fontFamily: 'var(--font-body, "Open Sans")',
              fontSize: 'var(--text-sm-font-size, 14px)',
              fontStyle: 'normal',
              fontWeight: 'var(--font-weight-normal, 400)',
              lineHeight: 'var(--text-sm-line-height, 20px)',
              minHeight: '40px',
            }}
          />
          {/* Send button */}
          <button
            type="button"
            disabled={!canSend}
            onClick={() => send(input)}
            style={{
              display: 'flex',
              width: '32px',
              minWidth: '32px',
              maxWidth: '32px',
              minHeight: '32px',
              maxHeight: '32px',
              padding: 'var(--spacing-2, 8px)',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              background: '#9333EA',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            className="hover:opacity-90 disabled:opacity-40 transition-opacity"
            title="Send"
          >
            <img
              src={`${env.basePath}/Send.svg`}
              alt="Send"
              width={16}
              height={16}
              style={{
                width: '16px',
                height: '16px',
                flexShrink: 0,
                aspectRatio: '1/1',
                filter: 'brightness(0) invert(1)',
                display: 'block',
              }}
              loading="eager"
            />
          </button>
        </div>
      </div>
    </aside>
  );
}

