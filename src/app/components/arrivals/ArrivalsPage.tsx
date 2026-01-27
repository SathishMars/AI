// INSIGHTS-SPECIFIC: Arrivals page component
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import InsightsArrivalsTable from "./ArrivalsTable";
import { InsightsPickColumnsPanel } from "./PickColumnsPanel";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { Upload, Search, ChevronLeft, Columns3, User, FileDown, Lock, CheckCircle2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/utils/api";

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />;
}

type Attendee = Record<string, any>;

export default function InsightsArrivalsPage() {
  const { openAime, setPickColumnsOpen, setAimeOpen, setPickColumnsData, aimeAction, setAimeAction, eventId, setEventId, setExportState } = useInsightsUI();
  
  // Store setExportState in a ref to ensure it's stable
  const setExportStateRef = useRef(setExportState);
  useEffect(() => {
    setExportStateRef.current = setExportState;
  }, [setExportState]);
  const router = useRouter();
  const [rows, setRows] = useState<Attendee[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
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
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "error" | "success">("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [visibleRowCount, setVisibleRowCount] = useState<number>(0);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");

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


  // Apply filters, global search, and sorting to rows
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

    // Apply global search across all columns
    if (globalSearchQuery.trim()) {
      const searchLower = globalSearchQuery.toLowerCase();
      result = result.filter(row => {
        // Search across all columns in the row
        return Object.values(row).some(cellValue => {
          if (cellValue == null) return false;
          return String(cellValue).toLowerCase().includes(searchLower);
        });
      });
    }

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
  }, [rows, filters, globalSearchQuery, sortColumn, sortDirection]);

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
            arrivalColumnTypes {
              name
              type
            }
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

        // Check content type before parsing
        const contentType = res.headers.get("content-type") || "";
        const isJsonResponse = contentType.includes("application/json");

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`GraphQL Fetch Error (Attempt ${attempt}):`, res.status, contentType, errorText.substring(0, 200));
          throw new Error(`Fetch failed: ${res.status} - ${errorText.substring(0, 100)}`);
        }

        // Read response body once and parse appropriately
        let json;
        try {
          // Read response as text first (works for both JSON and non-JSON)
          const responseText = await res.text();
          
          // Check if content type indicates JSON
          if (!isJsonResponse) {
            console.error(`GraphQL Response is not JSON (Attempt ${attempt}):`, contentType, responseText.substring(0, 200));
            throw new Error(`Invalid response format: expected JSON but got ${contentType || 'unknown'}`);
          }
          
          // Try to parse as JSON
          json = JSON.parse(responseText);
        } catch (parseError: any) {
          // Handle different error types
          if (parseError.message && parseError.message.includes("Invalid response format")) {
            throw parseError; // Re-throw our custom error
          }
          
          // JSON parsing failed
          console.error(`JSON Parse Error (Attempt ${attempt}):`, parseError.message);
          throw new Error(`Failed to parse JSON response: ${parseError.message}. Content-Type: ${contentType}`);
        }
        
        // Check for GraphQL errors, but allow partial data if arrivalColumnTypes fails
        if (json.errors) {
          const criticalErrors = json.errors.filter((err: any) => 
            !err.path?.includes('arrivalColumnTypes')
          );
          if (criticalErrors.length > 0) {
            console.error(`GraphQL Response Errors (Attempt ${attempt}):`, json.errors);
            throw new Error(criticalErrors[0].message);
          }
          // If only arrivalColumnTypes failed, log warning but continue
          console.warn(`arrivalColumnTypes query failed, continuing without column types:`, json.errors);
        }

        const cols = json?.data?.arrivalColumns ?? [];
        const columnTypesData = json?.data?.arrivalColumnTypes ?? [];
        const payload = json?.data?.arrivals;
        const fetchedRows = payload?.rows ?? [];

        // Convert column types array to map (handle both array and null/undefined)
        const typesMap: Record<string, string> = {};
        if (Array.isArray(columnTypesData)) {
          columnTypesData.forEach((item: { name: string; type: string }) => {
            if (item && item.name && item.type) {
              typesMap[item.name] = item.type;
            }
          });
        }

        setColumns(cols);
        setColumnTypes(typesMap);
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

  const handleExport = useCallback(async (direct = false) => {
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

      // Build array of arrays (aoa) to ensure exact column order matching displayedColumns
      // This gives us complete control over column ordering
      const aoaData: any[][] = [];
      
      // Add header row first (will be at row 5 after adding metadata rows)
      aoaData.push(displayedColumns.map(col => col));
      
      // Add data rows in the exact same column order
      dataToExport.forEach(row => {
        const rowData = displayedColumns.map(col => row[col] ?? '');
        aoaData.push(rowData);
      });

      // Create worksheet from array of arrays - this preserves exact column order
      const ws = XLSX.utils.aoa_to_sheet(aoaData);

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
      
      // Show success notification
      setExportStatus("success");
      setShowExportSuccess(true);
      
      // Hide success notification after 5 seconds
      setTimeout(() => {
        setShowExportSuccess(false);
        setExportStatus("idle");
        setExportMessage("");
        setExportProgress(0);
      }, 5000);
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
  }, [exportStatus, processedRows, total, rows.length, q, eventId, filters, displayedColumns, fetchArrivals, setExportStatus, setExportProgress, setExportMessage, setShowExportSuccess]);

  // Sync export state to UI store for Topbar
  const prevExportStateRef = useRef<{ status: string; progress: number; message: string } | null>(null);
  
  // Store callbacks in refs so they don't need to be in dependency array
  const onExportRef = useRef(() => handleExport(false));
  const onRetryRef = useRef(() => handleExport(false));
  const onDismissRef = useRef(() => {
    setExportStatus("idle");
    setExportMessage("");
    setExportProgress(0);
  });
  
  // Update refs when handlers change
  useEffect(() => {
    onExportRef.current = () => handleExport(false);
    onRetryRef.current = () => handleExport(false);
    onDismissRef.current = () => {
      setExportStatus("idle");
      setExportMessage("");
      setExportProgress(0);
    };
  }, [handleExport, setExportStatus, setExportMessage, setExportProgress]);
  
  useEffect(() => {
    const currentState = {
      status: exportStatus,
      progress: exportProgress,
      message: exportMessage
    };
    
    // Only update if the actual values have changed
    const prevState = prevExportStateRef.current;
    if (!prevState || 
        prevState.status !== currentState.status || 
        prevState.progress !== currentState.progress || 
        prevState.message !== currentState.message) {
      prevExportStateRef.current = currentState;
      setExportStateRef.current({
        status: exportStatus,
        progress: exportProgress,
        message: exportMessage,
        onExport: () => onExportRef.current(),
        onRetry: () => onRetryRef.current(),
        onDismiss: () => onDismissRef.current()
      });
    }
  }, [exportStatus, exportProgress, exportMessage]);

  // Memoize the visible rows change callback to prevent infinite loops
  const handleVisibleRowsChange = useCallback((visibleCount: number, totalCount: number) => {
    setVisibleRowCount(visibleCount);
  }, []);

  return (
    <>
      {/* Main Content */}
      <div className="flex max-w-full flex-col" style={{ marginTop: '0px', paddingTop: '0', height: 'calc(100vh - 56px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* PageHeader */}
      <div className="flex flex-row items-end p-0 gap-6 flex-shrink-0" style={{ width: '100%', height: '64px', marginTop: '0', paddingTop: '0' }}>
        {/* Left Container */}
        <div className="flex flex-row items-center p-0 gap-2 flex-1" style={{ maxWidth: '1280px', height: '64px' }}>
          <div className="flex flex-col justify-end items-start p-0 gap-2 flex-1" style={{ height: '64px' }}>
            {/* Title */}
            <div className="flex flex-row items-center p-0 gap-2" style={{ width: '100%', height: '32px' }}>
              <div className="flex flex-row items-center p-0 gap-1" style={{ height: '32px' }}>
                <h1 
                  className="flex-none"
                  style={{
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontStyle: 'normal',
                    fontWeight: 700,
                    fontSize: '24px',
                    lineHeight: '32px',
                    color: '#161C24',
                    width: '210px',
                    height: '32px'
                  }}
                >
                  Attendee Report
                </h1>
              </div>
              {/* Badge */}
              <span 
                className="flex flex-row justify-center items-center px-2 py-0.5 gap-1 flex-none rounded-lg"
                style={{
                  background: '#E0E7FF',
                  width: '99px',
                  height: '20px'
                }}
              >
                <Users className="w-3 h-3 flex-none" style={{ color: '#312E81', strokeWidth: 1.25 }} />
                <span 
                  className="flex-none"
                  style={{
                    fontFamily: "'Open Sans', sans-serif",
                    fontStyle: 'normal',
                    fontWeight: 600,
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: '#312E81',
                    width: '67px',
                    height: '16px'
                  }}
                >
                  Attendance
                </span>
              </span>
            </div>
            {/* Description */}
            <div 
              className="flex-none self-stretch"
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontStyle: 'normal',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '24px',
                color: '#637584',
                width: '100%',
                height: '24px'
              }}
            >
              Realtime data from your event
            </div>
          </div>
        </div>

        {/* Right Container */}
        <div className="flex flex-row justify-end items-center p-0 gap-4 flex-none" style={{ width: '484px', height: '36px' }}>
          {/* Global Search InputGroup - searches across all columns */}
          <div 
            className="flex flex-row items-center px-3 py-1 gap-2 flex-none rounded-lg"
            role="search"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E6EAF0',
              width: '296px',
              maxWidth: '296px',
              height: '36px'
            }}
          >
            <div className="flex flex-row justify-center items-center p-0 gap-2 flex-none" style={{ width: '16px', height: '16px' }}>
              <Search className="w-4 h-4 flex-none" style={{ color: '#637584', strokeWidth: 1.33 }} aria-hidden="true" />
            </div>
            <Input
              className="flex-1 border-none bg-transparent p-0 outline-none flex-none"
              placeholder="Search across all columns (Ctrl+F)"
              value={globalSearchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setGlobalSearchQuery(value);
                // Clear filter when search is removed
                if (!value.trim()) {
                  setGlobalSearchQuery("");
                }
              }}
              onKeyDown={(e) => {
                // Support Ctrl+F / Cmd+F to focus search
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                  e.preventDefault();
                  e.currentTarget.focus();
                }
                // Escape to clear search
                if (e.key === 'Escape' && globalSearchQuery) {
                  setGlobalSearchQuery("");
                }
              }}
              aria-label="Search across all columns in the report"
              aria-describedby={globalSearchQuery ? "search-results-count" : undefined}
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontStyle: 'normal',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '20px',
                color: '#637584',
                width: '215px',
                height: '20px'
              }}
            />
            {globalSearchQuery && (
              <button
                onClick={() => setGlobalSearchQuery("")}
                className="flex items-center justify-center p-0 flex-none"
                style={{
                  width: '16px',
                  height: '16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                aria-label="Clear search"
                type="button"
              >
                <span style={{ color: '#637584', fontSize: '14px' }} aria-hidden="true">×</span>
              </button>
            )}
          </div>
          {/* Search results count - accessible announcement */}
          {globalSearchQuery && (
            <div 
              id="search-results-count" 
              className="sr-only" 
              aria-live="polite"
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: '0',
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                borderWidth: '0'
              }}
            >
              {processedRows.length === 0 
                ? 'No results found' 
                : `${processedRows.length} result${processedRows.length === 1 ? '' : 's'} found`}
            </div>
          )}

          {/* Configure Report Button */}
          <button
            onClick={() => {
              setPickColumnsData({
                allColumns: columns,
                selectedColumns: selectedColumns.length > 0 ? selectedColumns : columns,
                columnTypes: columnTypes,
                onApply: (cols) => setSelectedColumns(cols),
              });
              setPickColumnsOpen(true);
            }}
            className="flex flex-row justify-center items-center px-4 py-2 gap-2 flex-none rounded-lg"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E6EAF0',
              width: '172px',
              height: '36px'
            }}
          >
            <Columns3 className="w-4 h-4 flex-none" style={{ color: '#161C24', strokeWidth: 1.33 }} />
            <span 
              className="flex-none flex items-center"
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontStyle: 'normal',
                fontWeight: 600,
                fontSize: '14px',
                lineHeight: '20px',
                color: '#161C24',
                width: '116px',
                height: '20px'
              }}
            >
              Configure Report
            </span>
          </button>
        </div>
      </div>

      {/* Command Error Display */}
      {commandError && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <span className="font-medium">Command Error:</span>
            <span>{commandError}</span>
          </div>
          <button
            onClick={() => setCommandError(null)}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Row 5: Status Summary */}
      {fetchMessage && (
        <div className="pb-1 flex items-center gap-3 text-xs text-[#6b7280] flex-shrink-0">
          <span>{fetchMessage}</span>
        </div>
      )}

      {/* Table Area */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ height: '100%', maxHeight: '100%' }}>
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
              <div className="text-sm font-medium">Failed to load data</div>
              <div className="text-sm text-red-400 max-w-md text-center">
                {fetchMessage || "An error occurred while loading data. Please try again."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFetchStatus("idle");
                  fetchArrivals(q, eventId);
                }}
                className="flex items-center gap-2 rounded-md bg-[#a855f7] px-4 py-2 text-sm font-medium text-white hover:bg-[#9333ea] transition-all shadow-sm active:scale-95"
              >
                <span>Retry</span>
              </button>
              <button
                onClick={() => {
                  setFetchStatus("idle");
                  setFetchMessage("");
                }}
                className="flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : rows.length > 0 ? (
          <div className={`h-full relative ${showAll ? 'overflow-auto' : 'overflow-hidden'}`} style={{ height: '100%', maxHeight: '100%', overflow: showAll ? 'auto' : 'hidden' }}>
            {globalSearchQuery && processedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center" style={{ height: '200px' }}>
                <Search className="w-12 h-12 mb-4" style={{ color: '#9ca3af', strokeWidth: 1.5 }} />
                <p className="text-lg font-medium" style={{ color: '#374151', marginBottom: '8px' }}>
                  No results found
                </p>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  No rows match "{globalSearchQuery}". Try a different search term.
                </p>
              </div>
            ) : (
              <InsightsArrivalsTable
                rows={displayedRows}
                columnOrder={displayedColumns}
                loading={loading}
                showAll={showAll}
                filters={filters}
                onFilterChange={setFilters}
                onVisibleRowsChange={handleVisibleRowsChange}
              />
            )}
            {/* Dimming overlay - only show when showAll is false */}
            {!showAll && (
              <div 
                className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
                style={{
                  height: '260px',
                  minHeight: '260px',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0) 0.32%, #FFFFFF 73.64%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '48px',
                  boxSizing: 'border-box'
                }}
              >
                {/* Text container */}
                <div 
                  className="flex flex-col items-center gap-1.5"
                  style={{
                    width: '348px',
                    paddingTop: '0',
                    paddingBottom: '0'
                  }}
                >
                  {/* Lock icon */}
                  <Lock className="w-5 h-5 flex-none" style={{ color: '#637584', strokeWidth: 1.5, height: '20px', width: '20px' }} />
                  {/* Message text */}
                  <div 
                    className="w-[348px] text-center"
                    style={{
                      fontFamily: 'Open Sans, sans-serif',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#637584',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      minHeight: '36px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <span>This view shows a subset of the data.</span>
                    <span>Download the report to see all results!</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : fetchStatus === "success" ? (
          <div className="p-4 text-center text-gray-500">
            No data found. The query returned 0 rows.
          </div>
        ) : null}
      </div>
      </div>

      {/* Export Success Notification */}
      {showExportSuccess && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 bottom-6 flex flex-row items-start p-0 z-50"
          style={{ width: '397px', height: '44px' }}
        >
          <div 
            className="flex flex-row items-center px-4 py-3 gap-3 w-full h-full rounded-[10px]"
            style={{
              background: '#F0FFEC',
              border: '1px solid #447634',
              boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Flex container for icon and text */}
            <div className="flex flex-row items-start p-0 gap-3 flex-none" style={{ width: '365px', height: '20px' }}>
              {/* Icon container */}
              <div className="flex flex-row items-start pt-0.5 px-0 pb-0 flex-none" style={{ width: '16px', height: '18px' }}>
                <CheckCircle2 
                  className="w-4 h-4 flex-none" 
                  style={{ color: '#447634', strokeWidth: 1.33 }}
                />
              </div>
              {/* Text container */}
              <div className="flex flex-col justify-center items-start p-0 gap-1 flex-none" style={{ width: '337px', height: '20px' }}>
                <div 
                  className="w-full h-5 flex-none"
                  style={{
                    fontFamily: 'Open Sans, sans-serif',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#447634',
                    fontStretch: '75%'
                  }}
                >
                  Dashboard export has been exported successfully.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

