// INSIGHTS-SPECIFIC: AIME chat panel component
"use client";

import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { insightsSuggestions } from "@/app/lib/insights/data";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as XLSX from "xlsx";
import { apiFetch } from "@/app/utils/api";

type Msg = { id: string; role: "assistant" | "user"; text: string; ts: string; sql?: string; data?: any[] };

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function InsightsAimePanel() {
  const { aimeOpen, setAimeOpen } = useInsightsUI();
  const [conversationId] = useState(() => crypto.randomUUID());

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m1",
      role: "assistant",
      text: "Welcome to aime™! I'm your AI assistant designed to help you analyze your event reports and attendee data efficiently. Please feel free to ask a custom question or select one of the suggested prompts below to get started.",
      ts: nowTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const canSend = useMemo(() => input.trim().length >= 3 && input.trim().length <= 200, [input]);

  function push(role: Msg["role"], text: string, sql?: string, data?: any[]) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text, ts: nowTime(), sql, data }]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function handleExport(data: any[], format: "xlsx", filename = "aime-export") {
    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(data);
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
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          question: q,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        }),
      });

      const data = await response.json();

      if (data.ok) {
        push("assistant", data.answer, data.sql, data.rows);
      } else {
        push("assistant", "I'm sorry, I encountered an error while processing your request.");
      }
    } catch (error) {
      console.error("Chat API error:", error);
      push("assistant", "Sorry, I'm having trouble connecting to the service right now.");
    } finally {
      setIsTyping(false);
    }
  }

  if (!aimeOpen) {
    return (
      <>
        <button
          onClick={() => setAimeOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-3 shadow-lg hover:bg-gray-50 transition-colors"
        >
          <span className="text-[#7c3aed]">✦</span>
          <span className="text-[14px] font-semibold">aime</span>
        </button>
      </>
    );
  }

  return (
    <aside className="flex h-full flex-col border-l border-[#e5e7eb] bg-white px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-[#111827]">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f5f3ff] text-[11px] text-[#7c3aed]">
            ✦
          </span>
          <span className="text-[13px]">aime</span>
        </div>
        <button
          onClick={() => setAimeOpen(false)}
          className="h-6 w-6 rounded-full text-[#9ca3af] hover:bg-[#f3f4f6]"
          title="Collapse"
        >
          –
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mt-2 flex flex-col items-center text-center">
            <div className="text-[32px] text-[#7c3aed]">✦</div>
            <div className="mt-1 text-[14px] font-semibold leading-snug text-[#111827]">
              Meet aime — your AI assistant for
              <br />
              analyzing & creating your event
              <br />
              reports.
            </div>
          </div>

          <div className="mt-2 space-y-1">
            {insightsSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[11px] text-[#374151] hover:bg-[#f3f4f6]"
              >
                {s}
              </button>
            ))}
            <button className="w-full rounded-xl px-3 py-2 text-center text-[11px] text-[#4f46e5] hover:bg-[#f5f5f7]">
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

                  {m.data && m.data.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleExport(m.data!, "xlsx")}
                        className="flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#374151] hover:bg-gray-50 transition-colors"
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

      <div className="mt-2 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-2">
        <div className="mb-1 text-[10px] text-[#6b7280]">
          Min 3 chars, max 200.
        </div>
        <div className="flex items-end gap-2">
          <textarea
            className="h-[48px] w-full resize-none rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[12px] outline-none focus:ring-1 focus:ring-[#7c3aed]"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 200))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) send(input);
              }
            }}
          />
          <button
            disabled={!canSend}
            onClick={() => send(input)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed] text-white shadow-sm hover:bg-[#6d28d9] disabled:opacity-40 transition-colors"
            title="Send"
          >
            <span className="text-sm">➤</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

