// INSIGHTS-SPECIFIC: AIME chat panel component
"use client";

import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { insightsSuggestions } from "@/app/lib/insights/data";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch } from "@/app/utils/api";
import { ERROR_MESSAGES } from "@/app/lib/insights/messages";
import { Sparkles, Send, Minus, X } from "lucide-react";
import Image from "next/image";
import { env } from "@/app/lib/env";
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
      const response = await apiFetch("/api/graphql", {
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chat API HTTP error:", response.status, response.statusText, errorText);
        
        // Check for timeout status codes
        if (response.status === 504 || response.status === 408) {
          push("assistant", ERROR_MESSAGES.TIMEOUT_ERROR);
        } else {
          push("assistant", ERROR_MESSAGES.SERVICE_UNAVAILABLE);
        }
        return;
      }

      const resJson = await response.json();
      console.log("Chat API response:", { status: response.status, hasData: !!resJson.data, hasChat: !!resJson.data?.chat, errors: resJson.errors });
      
      // Check for GraphQL errors
      if (resJson.errors && resJson.errors.length > 0) {
        console.error("GraphQL errors:", resJson.errors);
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
        console.error("Chat API data error:", { data, resJson });
        push("assistant", data?.answer || ERROR_MESSAGES.PROCESSING_ERROR);
      }
    } catch (error) {
      console.error("Chat API error:", error);
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
      
      console.error("Chat API error details:", { 
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
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-purple-100 px-4 py-3 shadow-lg hover:bg-purple-200 transition-all hover:scale-105 active:scale-95"
      >
        <Image
          src={`${env.basePath}/aime-star.png`}
          alt="aime logo"
          width={20}
          height={20}
          className="w-5 h-5"
          unoptimized
        />
        <span className="text-[14px] font-semibold text-purple-700">Ask aime</span>
      </button>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-[#e5e7eb] bg-white px-3 py-3 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0px',
          gap: '24px',
          width: '100%',
          height: '32px',
          background: '#FFFFFF',
          flex: 'none',
          order: 0,
          alignSelf: 'stretch',
          flexGrow: 0
        }}
      >
        {/* aime section */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0px',
            gap: '10px',
            width: '258px',
            height: '28px',
            minHeight: '24px',
            flex: 'none',
            order: 0,
            flexGrow: 1
          }}
        >
          {/* Icon */}
          <div style={{ width: '24px', height: '24px', flex: 'none', order: 0, flexGrow: 0, position: 'relative' }}>
            <Image
              src={`${env.basePath}/aime-star.png`}
              alt="aime logo"
              width={24}
              height={24}
              className="w-6 h-6"
              unoptimized
              style={{
                position: 'absolute',
                width: '24px',
                left: 'calc(50% - 24px/2)',
                top: '0%',
                bottom: '0%'
              }}
            />
          </div>
          {/* Profile Name */}
          <span 
            style={{
              width: '47px',
              height: '28px',
              fontFamily: "'Instrument Sans', sans-serif",
              fontStyle: 'normal',
              fontWeight: 700,
              fontSize: '20px',
              lineHeight: '28px',
              color: '#161C24',
              flex: 'none',
              order: 1,
              flexGrow: 0
            }}
          >
            aime
          </span>
        </div>

        {/* Minimize Button */}
        <button
          onClick={() => setAimeOpen(false)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px',
            gap: '8px',
            width: '32px',
            minWidth: '32px',
            maxWidth: '32px',
            height: '32px',
            minHeight: '32px',
            maxHeight: '32px',
            borderRadius: '8px',
            flex: 'none',
            order: 1,
            flexGrow: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer'
          }}
          title="Minimize"
        >
          <Minus 
            style={{ 
              width: '16px', 
              height: '16px',
              flex: 'none',
              order: 0,
              flexGrow: 0,
              color: '#161C24'
            }} 
            strokeWidth={1.33}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mt-2 flex flex-col items-center text-center">
            <Image
              src={`${env.basePath}/aime-star.png`}
              alt="aime logo"
              width={64}
              height={64}
              className="w-16 h-16"
              unoptimized
            />
            <div className="mt-4 text-[14px] font-semibold leading-snug text-[#111827]">
              Meet aime — your AI assistant for
              <br />
              analyzing & creating your event
              <br />
              reports.
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {insightsSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[11px] text-[#374151] hover:bg-[#f3f4f6]"
              >
                {s}
              </button>
            ))}
            <button className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-center text-[11px] text-[#374151] hover:bg-[#f3f4f6] flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#374151]" strokeWidth={2} />
              View all aime suggestions
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[95%] rounded-2xl border px-3 py-2 shadow-sm",
                    m.role === "user"
                      ? "border-[#111827] bg-[#111827] text-white"
                      : "border-[#e5e7eb] bg-white text-[#111827]",
                  ].join(" ")}
                >
                  <div className="mb-1 text-[10px] opacity-75">
                    {m.role === "assistant" ? "aime" : "You"} · {m.ts}
                  </div>

                  <div className="prose prose-sm prose-slate max-w-none text-[12px] leading-snug">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-2 rounded-lg border border-gray-100">
                            <table className="min-w-full divide-y divide-gray-200" {...props} />
                          </div>
                        ),
                        th: ({ node, ...props }) => <th className="bg-gray-50 px-2 py-1.5 text-left text-[11px] font-semibold text-gray-700" {...props} />,
                        td: ({ node, ...props }) => <td className="px-2 py-1 border-t border-gray-100 text-[11px]" {...props} />
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
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2 text-[#111827] shadow-sm">
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
        </div>
      </div>

      <div className={`mt-2 rounded-2xl border p-3 transition-all ${input.trim().length > 0 ? 'border-[#7c3aed] bg-[#faf5ff] shadow-sm' : 'border-[#e5e7eb] bg-white'}`}>
        <div className="text-[12px] text-[#9ca3af] px-2 pb-1">
          Ask aime to analyse anything or use suggested prompt for the start.
        </div>
        <div className="flex items-start gap-2">
          <textarea
            className="flex-1 resize-none rounded-lg border-0 bg-transparent px-2 py-1.5 text-[12px] leading-relaxed outline-none focus:ring-0"
            placeholder=""
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 200))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) send(input);
              }
            }}
            autoFocus
            rows={2}
            style={{ minHeight: '40px' }}
          />
          <button
            disabled={!canSend}
            onClick={() => send(input)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white shadow-sm hover:bg-[#6d28d9] disabled:opacity-40 transition-colors mt-0.5"
            title="Send"
          >
            <Send className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

