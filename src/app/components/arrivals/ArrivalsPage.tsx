// INSIGHTS-SPECIFIC: Arrivals page component
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import InsightsArrivalsTable from "./ArrivalsTable";
import { InsightsPickColumnsPanel } from "./PickColumnsPanel";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { Upload, Search, ChevronLeft, Columns3, ChevronDown, User, FileDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/utils/api";

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />;
}

type Attendee = Record<string, any>;

export default function InsightsArrivalsPage() {
  const { openAime } = useInsightsUI();
  const router = useRouter();
  const [rows, setRows] = useState<Attendee[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [retryCount, setRetryCount] = useState(0);
  const [fetchMessage, setFetchMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "error">("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const [visibleRowCount, setVisibleRowCount] = useState<number>(0);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { setPickColumnsOpen, setAimeOpen, setPickColumnsData, aimeAction, setAimeAction, eventId, setEventId } = useInsightsUI();

  // Helper function to validate column exists
  const validateColumn = (columnName: string, availableColumns: string[]): boolean => {
    return availableColumns.includes(columnName);
  };

  // Helper function to get available columns (selected or all)
  const getAvailableColumns = (): string[] => {
    return selectedColumns.length > 0 ? selectedColumns : columns;
  };

  // Handle AIME actions
  useEffect(() => {
    if (!aimeAction) return;

    // Clear any previous errors
    setCommandError(null);

    switch (aimeAction.type) {
      case "reorder_column": {
        const { column, position, afterColumn, beforeColumn } = aimeAction;
        setSelectedColumns((prev) => {
          const newCols = [...prev];
          const colIndex = newCols.indexOf(column);
          if (colIndex === -1) return prev;

          newCols.splice(colIndex, 1);

          if (position === 0) {
            newCols.unshift(column);
          } else if (position === -1) {
            newCols.push(column);
          } else if (afterColumn) {
            const afterIndex = newCols.indexOf(afterColumn);
            if (afterIndex !== -1) {
              newCols.splice(afterIndex + 1, 0, column);
            } else {
              newCols.push(column);
            }
          } else if (beforeColumn) {
            const beforeIndex = newCols.indexOf(beforeColumn);
            if (beforeIndex !== -1) {
              newCols.splice(beforeIndex, 0, column);
            } else {
              newCols.unshift(column);
            }
          } else if (aimeAction.index !== undefined) {
            newCols.splice(aimeAction.index, 0, column);
          }

          return newCols;
        });
        break;
      }
      case "filter": {
        setFilters((prev) => ({
          ...prev,
          [aimeAction.column]: aimeAction.value,
        }));
        break;
      }
      case "clear_filter": {
        if (aimeAction.column) {
          setFilters((prev) => {
            const newFilters = { ...prev };
            delete newFilters[aimeAction.column!];
            return newFilters;
          });
        } else {
          setFilters({});
        }
        break;
      }
      case "sort": {
        const availableCols = getAvailableColumns();
        if (!validateColumn(aimeAction.column, availableCols)) {
          setCommandError(
            `Column "${aimeAction.column.replace(/_/g, " ")}" is not available. Available columns: ${availableCols.slice(0, 5).map(c => c.replace(/_/g, " ")).join(", ")}${availableCols.length > 5 ? "..." : ""}`
          );
          // Clear the action to prevent retry
          setAimeAction(null);
          return;
        }
        setSortColumn(aimeAction.column);
        setSortDirection(aimeAction.direction);
        break;
      }
      case "clear_sort": {
        setSortColumn(null);
        setSortDirection("asc");
        break;
      }
      case "reset_columns": {
        setSelectedColumns([]);
        break;
      }
      case "remove_column": {
        setSelectedColumns((prev) => {
          const current = prev.length > 0 ? prev : columns;
          return current.filter(c => c !== aimeAction.column);
        });
        break;
      }
    }

    // Clear the action after processing
    setAimeAction(null);
  }, [aimeAction, setAimeAction]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };

    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [exportMenuOpen]);

  // Apply filters and sorting to rows
  const processedRows = useMemo(() => {
    let result = [...rows];

    // Apply filters
    Object.entries(filters).forEach(([column, value]) => {
      if (value.trim()) {
        result = result.filter(row => {
          const cellValue = String(row[column] || "").toLowerCase();
          return cellValue.includes(value.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Compare values
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [rows, filters, sortColumn, sortDirection]);

  // Pass all processed rows to table - it will handle viewport height limiting
  const displayedRows = processedRows;
  const displayedColumns = selectedColumns.length > 0 ? selectedColumns : columns;

  // Auto-load data on component mount or eventId change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (eventId > 0) {
        fetchArrivals(q, eventId);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [eventId]);

  async function fetchArrivals(search?: string, targetEventId?: number, requestedLimit?: number) {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds gap

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setLoading(true);
        setFetchStatus("loading");
        setRetryCount(attempt);
        setFetchMessage(attempt > 1 ? `Trying to fetch data (Attempt ${attempt} of ${maxRetries})...` : "Loading data...");

        const currentEventId = targetEventId || eventId;
        const query = `
          query Arrivals($q: String, $eventId: Int, $limit: Int!, $offset: Int!) {
            arrivalColumns
            arrivals(q: $q, eventId: $eventId, limit: $limit, offset: $offset) {
              total
              limit
              offset
              rows {
                first_name
                middle_name
                last_name
                email
                companion_count
                company_name
                phone
                mobile
                attendee_type
                emergency_contact
                registration_status
                manual_status
                room_status
                air_status
                created_at
                updated_at
                concur_login_id
                internal_notes
              }
            }
          }
        `;

        const res = await apiFetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            variables: { q: search?.trim() || null, eventId: currentEventId, limit: requestedLimit || 50000, offset: 0 },
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`GraphQL Fetch Error (Attempt ${attempt}):`, res.status, errorText);
          throw new Error(`Fetch failed: ${res.status}`);
        }

        const json = await res.json();
        if (json.errors) {
          console.error(`GraphQL Response Errors (Attempt ${attempt}):`, json.errors);
          throw new Error(json.errors[0].message);
        }

        const cols = json?.data?.arrivalColumns ?? [];
        const payload = json?.data?.arrivals;
        const fetchedRows = payload?.rows ?? [];

        setColumns(cols);
        setRows(fetchedRows);
        setTotal(payload?.total ?? 0);
        setFetchStatus("success");
        setFetchMessage("");
        setRetryCount(0);
        setLoading(false);

        // Initialize selected columns with all columns if not set
        setSelectedColumns((prev) => (prev.length === 0 ? cols : prev));

        return fetchedRows;
      } catch (err: any) {
        console.error(`fetchArrivals error (Attempt ${attempt}):`, err);

        if (attempt < maxRetries) {
          setFetchMessage(`Attempt ${attempt} failed. Retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          setFetchStatus("error");
          setFetchMessage(`Failed to load data after ${maxRetries} attempts. Please check the console for details.`);
          setLoading(false);
          throw err;
        }
      }
    }
  }

  async function handleExport(direct = false) {
    if (exportStatus === "exporting") return;

    setExportStatus("exporting");
    setExportProgress(0);
    setExportMessage("Preparing export...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setExportStatus("error");
      setExportMessage("Export timed out after 30 seconds. Please try again with fewer rows or columns.");
    }, 30000);

    try {
      let dataToExport = processedRows;
      const needsFullFetch = total > rows.length;

      // Ensure we have all data if there's more on the server than in memory
      if (direct || needsFullFetch || dataToExport.length === 0) {
        setExportProgress(10);
        setExportMessage("Fetching complete dataset for export...");
        try {
          // Fetch data with a limit equal to the total count (up to backend cap)
          const fetched = await fetchArrivals(q, eventId, total || 50000);
          setExportProgress(40);

          if (direct || needsFullFetch) {
            // Re-apply local filters if they exist to the newly fetched data
            let filtered = [...fetched];
            Object.entries(filters).forEach(([column, value]) => {
              if (value.trim()) {
                filtered = filtered.filter(row =>
                  String(row[column] || "").toLowerCase().includes(value.toLowerCase())
                );
              }
            });
            dataToExport = filtered;
          }
          setExportProgress(50);
        } catch (fetchErr: any) {
          throw fetchErr;
        }
      } else {
        setExportProgress(30);
      }

      if (dataToExport.length === 0) {
        setExportStatus("idle");
        setExportMessage("No data found to export.");
        setTimeout(() => {
          setExportStatus("idle");
          setExportMessage("");
        }, 3000);
        return;
      }

      setExportProgress(60);
      setExportMessage("Preparing columns...");

      const columnsToExport = displayedColumns.map(col => ({
        header: col,
        key: col,
      }));

      setExportProgress(70);
      setExportMessage("Generating Excel file...");

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
      const ws = XLSX.utils.json_to_sheet(dataToExport);

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

      setExportProgress(85);
      setExportMessage("Finalizing export...");

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Arrivals");
      
      setExportProgress(95);
      setExportMessage("Saving file...");
      
      XLSX.writeFile(wb, `Arrivals_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

      setExportProgress(100);
      setExportMessage("Export complete!");
      
      console.log("Export complete!");
      
      // Reset after brief success message
      setTimeout(() => {
        setExportStatus("idle");
        setExportMessage("");
        setExportProgress(0);
      }, 1500);
    } catch (err: any) {
      console.error("Export Error Caught:", err);

      if (err?.name === 'AbortError' || err?.message === 'Export cancelled') {
        console.log("Export was cancelled or timed out");
      } else {
        const errorMessage = err?.message || String(err) || "An unexpected error occurred during export.";
        setExportStatus("error");
        setExportMessage(errorMessage);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return (
    <div className="flex h-full max-w-full flex-col overflow-hidden">
      {/* Row 1: Back + Actions */}
      <div className="mb-2 flex items-center justify-between pt-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[13px] font-medium text-[#111827] hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {exportStatus === "exporting" ? (
            <div className="flex items-center gap-3 rounded-md bg-[#f3f4f6] px-3 py-1.5 border border-[#e5e7eb]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-[#111827]">{exportProgress}%</span>
                <span className="text-[9px] text-[#6b7280] truncate max-w-[100px]">{exportMessage}</span>
              </div>
            </div>
          ) : (
            <>
              {exportStatus === "error" && (
                <div className="mr-2 flex items-center gap-2 text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 shadow-sm animate-in fade-in slide-in-from-right-2">
                  <span className="max-w-[150px] truncate" title={exportMessage}>{exportMessage || "Export failed"}</span>
                  <div className="flex items-center gap-1 border-l border-red-200 pl-2 ml-1">
                    <button onClick={() => handleExport(false)} className="font-bold hover:underline">Retry</button>
                    <button onClick={() => setExportStatus("idle")} className="text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              )}
              <button className="rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb]">
                Save to My Reports
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="flex items-center gap-2 rounded-md bg-[#a855f7] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#9333ea] transition-all shadow-sm active:scale-95"
                >
                  <FileDown className="h-3 w-3" />
                  Export
                  <ChevronDown className={`h-3 w-3 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-md border border-[#e5e7eb] bg-white shadow-lg z-50">
                    <button
                      onClick={() => {
                        handleExport(false);
                        setExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-[12px] text-[#374151] hover:bg-[#f9fafb] transition-colors flex items-center gap-2"
                    >
                      <FileDown className="h-3 w-3" />
                      <div className="flex flex-col">
                        <span className="font-medium">Export Preview</span>
                        <span className="text-[10px] text-[#6b7280]">Export currently visible data</span>
                      </div>
                    </button>
                    <div className="border-t border-[#e5e7eb]"></div>
                    <button
                      onClick={() => {
                        handleExport(true);
                        setExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-[12px] text-[#374151] hover:bg-[#f9fafb] transition-colors flex items-center gap-2"
                    >
                      <FileDown className="h-3 w-3" />
                      <div className="flex flex-col">
                        <span className="font-medium">Export All Data</span>
                        <span className="text-[10px] text-[#6b7280]">Export complete dataset without preview</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Title & Badge */}
      <div className="mb-1 flex items-center gap-3 flex-shrink-0">
        <h1 className="text-[20px] font-bold text-[#111827]">Attendance Report</h1>
        <span className="flex items-center rounded-full bg-[#f3e8ff] px-2 py-0.5 text-[10px] font-medium text-[#9333ea]">
          <User className="mr-1 h-3 w-3" />
          Attendance
        </span>
      </div>

      {/* Row 3: Toolbar */}
      <div className="mb-2 flex items-end justify-between flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="text-[12px] text-[#6b7280]">Realtime data from your event</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-medium text-[#374151]">Event ID:</span>
            <input
              type="number"
              value={eventId}
              onChange={(e) => setEventId(Number(e.target.value))}
              className="w-20 rounded-md border border-[#e5e7eb] bg-white px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-[#a855f7]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 shadow-sm">
            <Search className="mr-2 h-3 w-3 text-[#9ca3af]" />
            <Input
              className="w-[180px] border-none bg-transparent p-0 text-[12px] outline-none placeholder:text-[#9ca3af]"
              placeholder="Search columns"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchArrivals(q, eventId);
              }}
            />
          </div>

          <button
            onClick={() => {
              setPickColumnsData({
                allColumns: columns,
                selectedColumns: selectedColumns.length > 0 ? selectedColumns : columns,
                onApply: (cols) => setSelectedColumns(cols),
              });
              setPickColumnsOpen(true);
              // Keep AIME panel open - both panels can coexist
            }}
            className="flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] shadow-sm"
          >
            <Columns3 className="h-3 w-3 text-[#6b7280]" />
            Pick Columns
          </button>
        </div>
      </div>

      {/* Command Error Display */}
      {commandError && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-red-700">
            <span className="font-medium">Command Error:</span>
            <span>{commandError}</span>
          </div>
          <button
            onClick={() => setCommandError(null)}
            className="text-red-500 hover:text-red-700 text-[12px] font-medium"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Row 5: Status Summary */}
      <div className="pb-1 flex items-center gap-3 text-[11px] text-[#6b7280] flex-shrink-0">
        <span>
          {fetchMessage || (rows.length > 0 ? `Showing ${visibleRowCount > 0 ? visibleRowCount : displayedRows.length} of ${total}${!showAll && visibleRowCount > 0 && visibleRowCount < processedRows.length ? ` (${processedRows.length - visibleRowCount} more rows available)` : ""}` : "")}
        </span>
        {processedRows.length > (visibleRowCount > 0 ? visibleRowCount : displayedRows.length) && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[#9333ea] font-semibold hover:underline bg-[#f3e8ff] px-2 py-0.5 rounded-full transition-all hover:bg-[#e9d5ff]"
            title={showAll ? "Limit rows to viewport height" : `Show all ${processedRows.length} rows`}
          >
            {showAll ? "Show Less" : `Show All (${processedRows.length})`}
          </button>
        )}
      </div>

      {/* Table Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent"></div>
              <span>{fetchMessage || "Loading data..."}</span>
            </div>
          </div>
        ) : fetchStatus === "error" ? (
          <div className="p-4 flex flex-col items-center justify-center gap-3 min-h-[200px]">
            <div className="flex flex-col items-center gap-2 text-red-500">
              <div className="text-[14px] font-medium">Failed to load data</div>
              <div className="text-[12px] text-red-400 max-w-md text-center">
                {fetchMessage || "An error occurred while loading data. Please try again."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFetchStatus("idle");
                  fetchArrivals(q, eventId);
                }}
                className="flex items-center gap-2 rounded-md bg-[#a855f7] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#9333ea] transition-all shadow-sm active:scale-95"
              >
                <span>Retry</span>
              </button>
              <button
                onClick={() => {
                  setFetchStatus("idle");
                  setFetchMessage("");
                }}
                className="flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : rows.length > 0 ? (
          <div className={`h-full ${showAll ? 'overflow-auto' : 'overflow-hidden'}`}>
            <InsightsArrivalsTable
              rows={displayedRows}
              columnOrder={displayedColumns}
              loading={loading}
              showAll={showAll}
              filters={filters}
              onFilterChange={setFilters}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortChange={(col, dir) => {
                setSortColumn(col);
                setSortDirection(dir);
              }}
              onColumnOrderChange={(newOrder) => {
                setSelectedColumns(newOrder);
              }}
              onVisibleRowsChange={(visibleCount, totalCount) => {
                setVisibleRowCount(visibleCount);
              }}
            />
          </div>
        ) : fetchStatus === "success" ? (
          <div className="p-4 text-center text-gray-500">
            No data found. The query returned 0 rows.
          </div>
        ) : null}
      </div>
    </div>
  );
}

