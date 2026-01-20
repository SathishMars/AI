// INSIGHTS-SPECIFIC: Command History component for AIME panel
"use client";

import { useState, useMemo } from "react";
import { History, Repeat2, X, ArrowUpDown, GripVertical, Filter, SortAsc, SortDesc } from "lucide-react";
import { useInsightsUI } from "@/app/lib/insights/ui-store";

type CommandType = 
  | "sort"
  | "reorder_column"
  | "filter"
  | "clear_filter"
  | "clear_sort"
  | "reset_columns"
  | "remove_column";

type Command = {
  id: string;
  type: CommandType;
  text: string;
  timestamp: string;
  action: any;
};

type CommandHistoryProps = {
  messages: Array<{ id: string; role: "assistant" | "user"; text: string; ts: string; meta?: any }>;
  onRepeatCommand: (command: Command) => void;
};

function getCommandIcon(type: CommandType) {
  switch (type) {
    case "sort":
      return <SortAsc className="h-3 w-3" />;
    case "reorder_column":
      return <GripVertical className="h-3 w-3" />;
    case "filter":
      return <Filter className="h-3 w-3" />;
    case "clear_filter":
    case "clear_sort":
    case "reset_columns":
      return <X className="h-3 w-3" />;
    default:
      return <ArrowUpDown className="h-3 w-3" />;
  }
}

function formatCommandText(command: Command): string {
  const { type, action } = command;
  
  switch (type) {
    case "sort": {
      const col = action.column?.replace(/_/g, " ") || "column";
      const dir = action.direction === "desc" ? "descending" : "ascending";
      return `Sort by ${col} ${dir}`;
    }
    case "reorder_column": {
      const col = action.column?.replace(/_/g, " ") || "column";
      if (action.position === 0) return `Move ${col} to front`;
      if (action.position === -1) return `Move ${col} to back`;
      if (action.afterColumn) return `Move ${col} after ${action.afterColumn.replace(/_/g, " ")}`;
      if (action.beforeColumn) return `Move ${col} before ${action.beforeColumn.replace(/_/g, " ")}`;
      if (action.index !== undefined) return `Move ${col} to position ${action.index + 1}`;
      return `Reorder ${col}`;
    }
    case "filter": {
      const col = action.column?.replace(/_/g, " ") || "column";
      return `Filter ${col} = ${action.value}`;
    }
    case "clear_filter":
      return "Clear filters";
    case "clear_sort":
      return "Clear sort";
    case "reset_columns":
      return "Reset columns";
    case "remove_column": {
      const col = action.column?.replace(/_/g, " ") || "column";
      return `Remove ${col} column`;
    }
    default:
      return command.text;
  }
}

export function CommandHistory({ messages, onRepeatCommand }: CommandHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { setAimeAction } = useInsightsUI();

  // Extract commands from message history
  const commands = useMemo(() => {
    const extracted: Command[] = [];
    
    messages.forEach((msg) => {
      // Check if message has meta.action (UI action) - this is the primary source
      if (msg.meta?.action) {
        const action = msg.meta.action;
        // Only include actual UI commands, not SQL queries
        if (action.type && ['sort', 'reorder_column', 'filter', 'clear_filter', 'clear_sort', 'reset_columns', 'remove_column'].includes(action.type)) {
          extracted.push({
            id: `${msg.id}-action`,
            type: action.type as CommandType,
            text: msg.text,
            timestamp: msg.ts,
            action: action,
          });
        }
      }
      // Also check user messages that might be commands
      else if (msg.role === "user") {
        const text = msg.text.toLowerCase();
        // Detect command patterns in user messages
        if (text.includes("sort by") || text.includes("sort on")) {
          const sortMatch = text.match(/sort\s+(?:by|on)\s+(.+?)(?:\s+(ascending|descending|asc|desc))?/i);
          if (sortMatch) {
            extracted.push({
              id: `${msg.id}-sort`,
              type: "sort",
              text: msg.text,
              timestamp: msg.ts,
              action: {
                type: "sort",
                column: sortMatch[1].trim().replace(/\s+/g, "_"),
                direction: sortMatch[2]?.toLowerCase().includes("desc") ? "desc" : "asc",
              },
            });
          }
        } else if (text.includes("move")) {
          const moveMatch = text.match(/move\s+(.+?)\s+(?:to\s+)?(?:the\s+)?(front|beginning|start|first|back|end|last|after|before)/i);
          if (moveMatch) {
            extracted.push({
              id: `${msg.id}-move`,
              type: "reorder_column",
              text: msg.text,
              timestamp: msg.ts,
              action: {
                type: "reorder_column",
                column: moveMatch[1].trim().replace(/\s+/g, "_"),
                position: moveMatch[2].includes("front") || moveMatch[2].includes("first") ? 0 : -1,
              },
            });
          }
        }
      }
    });
    
    return extracted.reverse(); // Most recent first
  }, [messages]);

  const handleRepeat = (command: Command) => {
    setAimeAction(command.action);
    onRepeatCommand(command);
  };

  if (commands.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#6b7280] hover:text-[#111827] hover:bg-[#f9fafb] rounded-md transition-colors"
        aria-label="Command history"
        aria-expanded={isOpen}
      >
        <History className="h-4 w-4" />
        <span>History ({commands.length})</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-[#e5e7eb] rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
              <h3 className="text-[14px] font-semibold text-[#111827]">Command History</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#9ca3af] hover:text-[#111827] transition-colors"
                aria-label="Close history"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Commands List */}
            <div className="flex-1 overflow-y-auto">
              {commands.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-[#6b7280]">
                  No commands yet
                </div>
              ) : (
                <div className="divide-y divide-[#e5e7eb]">
                  {commands.map((command) => (
                    <div
                      key={command.id}
                      className="px-4 py-3 hover:bg-[#f9fafb] transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-[#9ca3af] group-hover:text-[#6b7280] transition-colors">
                          {getCommandIcon(command.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-[#111827] mb-1">
                            {formatCommandText(command)}
                          </div>
                          <div className="text-[11px] text-[#6b7280]">
                            {command.timestamp}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRepeat(command)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#6b7280] hover:text-[#111827] hover:bg-[#f3e8ff] rounded"
                          aria-label={`Repeat: ${formatCommandText(command)}`}
                          title="Repeat command"
                        >
                          <Repeat2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[#e5e7eb] text-[11px] text-[#6b7280]">
              {commands.length} command{commands.length !== 1 ? "s" : ""} in history
            </div>
          </div>
        </>
      )}
    </div>
  );
}
