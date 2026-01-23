// INSIGHTS-SPECIFIC: Arrivals table component
import React, { useState, useEffect, useRef, useMemo } from "react";
import { insightsAttendeeColumns } from "@/app/lib/insights/data";

type ArrivalsTableProps = {
  rows: Record<string, any>[];
  columnOrder: string[];
  loading: boolean;
  showAll: boolean;
  filters?: Record<string, string>;
  onFilterChange?: (filters: Record<string, string>) => void;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc";
  onVisibleRowsChange?: (visibleCount: number, totalCount: number) => void;
};

// Helper function to detect data type of a column
function getColumnDataType(rows: Record<string, any>[], columnName: string): string {
  if (!rows || rows.length === 0) return "text";

  // Sample a few rows to determine type
  const sampleSize = Math.min(5, rows.length);
  const samples = rows.slice(0, sampleSize).map(row => row[columnName]).filter(val => val !== null && val !== undefined && val !== "");

  if (samples.length === 0) return "text";

  // Check if all samples are numbers
  const allNumbers = samples.every(val => {
    if (typeof val === 'number') return true;
    if (typeof val === 'string') {
      // Check if it's a valid number string
      const num = Number(val);
      return !isNaN(num) && val.trim() !== '';
    }
    return false;
  });

  if (allNumbers) {
    // Check if it's an integer or float
    const hasDecimal = samples.some(val => {
      const str = String(val);
      return str.includes('.');
    });
    return hasDecimal ? "number" : "integer";
  }

  // Check if all samples are dates
  const allDates = samples.every(val => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  });

  if (allDates) return "date";

  // Check if all samples are booleans
  const allBooleans = samples.every(val => typeof val === 'boolean' || val === 'true' || val === 'false');
  if (allBooleans) return "boolean";

  // Default to text
  return "text";
}

export default function InsightsArrivalsTable({
  rows,
  columnOrder,
  loading,
  showAll,
  filters = {},
  onFilterChange,
  onVisibleRowsChange,
}: ArrivalsTableProps) {
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(columnOrder);
  const [viewportHeight, setViewportHeight] = useState<number>(0);
  const [rowHeight, setRowHeight] = useState<number>(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const firstRowRef = useRef<HTMLTableRowElement>(null);

  // Sync local order when prop changes
  useEffect(() => {
    setLocalColumnOrder(columnOrder);
  }, [columnOrder]);

  // Calculate viewport height and row height
  useEffect(() => {
    const calculateDimensions = () => {
      if (!tableContainerRef.current) return;

      const container = tableContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const availableHeight = containerRect.height;

      // Measure header height
      let headerHeight = 0;
      if (headerRef.current) {
        headerHeight = headerRef.current.getBoundingClientRect().height;
      }

      // Measure row height (use first row if available)
      let measuredRowHeight = 0;
      if (firstRowRef.current) {
        measuredRowHeight = firstRowRef.current.getBoundingClientRect().height;
      } else {
        // Default row height estimate (including border)
        measuredRowHeight = 40; // Approximate height for a row with padding
      }

      setViewportHeight(availableHeight);
      setRowHeight(measuredRowHeight);
    };

    // Calculate on mount and when showAll changes
    calculateDimensions();

    // Recalculate on window resize
    const handleResize = () => {
      calculateDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showAll, rows.length]);

  // Calculate how many rows fit in viewport
  const maxVisibleRows = useMemo(() => {
    if (showAll || viewportHeight === 0 || rowHeight === 0) {
      return rows.length; // Show all rows if showAll is true or dimensions not calculated
    }

    // Account for header height
    const headerHeight = headerRef.current?.getBoundingClientRect().height || 60;
    const availableHeight = viewportHeight - headerHeight;
    const calculatedRows = Math.floor(availableHeight / rowHeight);

    // Ensure at least 1 row is shown, and add buffer for smooth scrolling
    return Math.max(1, calculatedRows + 2); // +2 for buffer
  }, [showAll, viewportHeight, rowHeight, rows.length]);

  // Limit displayed rows based on viewport height
  const visibleRows = useMemo(() => {
    if (showAll) {
      return rows;
    }
    return rows.slice(0, maxVisibleRows);
  }, [rows, showAll, maxVisibleRows]);

  // Notify parent of visible row count
  const prevVisibleCountRef = useRef<number | null>(null);
  const prevTotalCountRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (onVisibleRowsChange) {
      const visibleCount = visibleRows.length;
      const totalCount = rows.length;
      
      // Only call callback if values have actually changed
      if (prevVisibleCountRef.current !== visibleCount || prevTotalCountRef.current !== totalCount) {
        prevVisibleCountRef.current = visibleCount;
        prevTotalCountRef.current = totalCount;
        onVisibleRowsChange(visibleCount, totalCount);
      }
    }
  }, [visibleRows.length, rows.length, onVisibleRowsChange]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading table data...</div>;
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data available. Please click "Load Attendee Data" to fetch data.
      </div>
    );
  }

  // Use localColumnOrder if available, fall back to prop or row keys
  const allHeaders = localColumnOrder.length > 0
    ? localColumnOrder
    : columnOrder.length > 0
      ? columnOrder
      : rows.length > 0
        ? Object.keys(rows[0])
        : insightsAttendeeColumns;

  const displayedHeaders = allHeaders;
  const displayedRows = visibleRows;

  console.log("ArrivalsTable rendering:", {
    rowsCount: rows.length,
    visibleRowsCount: visibleRows.length,
    maxVisibleRows,
    viewportHeight,
    rowHeight,
    headersCount: displayedHeaders.length,
    firstRow: rows[0]
  });

  return (
    <div className="flex flex-col h-full" ref={tableContainerRef}>
      <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white h-full flex flex-col">
        <div className={`w-full h-full overflow-x-auto flex flex-col ${showAll ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
          <table className="w-full border-collapse">
            <thead ref={headerRef} className="bg-[#f3f4f6] sticky top-0 z-10">
              <tr className="text-left text-[12px] text-[#111827]">
                {displayedHeaders.map((col) => {
                  return (
                    <th
                      key={col}
                      className="px-4 py-1.5 font-medium whitespace-nowrap"
                    >
                      <span className="capitalize">{col.replace(/_/g, " ")}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayedRows.length > 0 ? (
                displayedRows.map((row, idx) => (
                  <tr
                    key={row.id || row.email || idx}
                    ref={idx === 0 ? firstRowRef : null}
                    className="border-t border-[#e5e7eb] text-[12px] text-[#111827] hover:bg-gray-50 transition-colors"
                  >
                    {displayedHeaders.map((col) => (
                      <td key={col} className="px-4 py-1.5 whitespace-nowrap">
                        {row[col] || ""}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={displayedHeaders.length}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No data loaded. Click "Load Attendee Data" to fetch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

