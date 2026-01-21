// INSIGHTS-SPECIFIC: Arrivals table component
import React, { useState, useEffect, useRef, useMemo } from "react";
import { insightsAttendeeColumns } from "@/app/lib/insights/data";
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";

type ArrivalsTableProps = {
  rows: Record<string, any>[];
  columnOrder: string[];
  loading: boolean;
  showAll: boolean;
  filters?: Record<string, string>;
  onFilterChange?: (filters: Record<string, string>) => void;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc";
  onSortChange?: (column: string | null, direction: "asc" | "desc") => void;
  onColumnOrderChange?: (newOrder: string[]) => void;
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
  sortColumn,
  sortDirection = "asc",
  onSortChange,
  onColumnOrderChange,
  onVisibleRowsChange,
}: ArrivalsTableProps) {
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
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
  useEffect(() => {
    if (onVisibleRowsChange) {
      onVisibleRowsChange(visibleRows.length, rows.length);
    }
  }, [visibleRows.length, rows.length, onVisibleRowsChange]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, column: string) => {
    setDraggedColumn(column);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", column);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    if (!draggedColumn || draggedColumn === targetColumn) {
      setDragOverColumn(null);
      return;
    }

    setDragOverColumn(targetColumn);

    // Reorder columns
    const draggedIndex = localColumnOrder.indexOf(draggedColumn);
    const targetIndex = localColumnOrder.indexOf(targetColumn);

    if (draggedIndex === -1 || targetIndex === -1) return;
    if (draggedIndex === targetIndex) return;

    const newOrder = [...localColumnOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    setLocalColumnOrder(newOrder);
    
    // Notify parent immediately for real-time updates
    if (onColumnOrderChange) {
      onColumnOrderChange(newOrder);
    }
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear dragOver if we're leaving the table area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    // Restore opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
    
    // Final update to parent
    if (onColumnOrderChange && draggedColumn) {
      onColumnOrderChange(localColumnOrder);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedColumn || draggedColumn === targetColumn) {
      setDragOverColumn(null);
      return;
    }

    // Final update
    if (onColumnOrderChange) {
      onColumnOrderChange(localColumnOrder);
    }
    
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

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
                  const isSorted = sortColumn === col;
                  const isDragging = draggedColumn === col;
                  const isDragOver = dragOverColumn === col;
                  return (
                    <th
                      key={col}
                      draggable={onColumnOrderChange !== undefined}
                      onDragStart={(e) => handleDragStart(e, col)}
                      onDragOver={(e) => handleDragOver(e, col)}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, col)}
                      className={`px-4 py-1.5 font-medium whitespace-nowrap transition-all ${
                        isDragging ? "opacity-50" : ""
                      } ${
                        isDragOver ? "bg-[#e5e7eb] border-l-2 border-l-[#7c3aed]" : ""
                      } ${
                        onColumnOrderChange ? "cursor-move hover:bg-[#e5e7eb]" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {onColumnOrderChange && (
                            <GripVertical className="h-3 w-3 text-[#9ca3af] cursor-grab active:cursor-grabbing flex-shrink-0" />
                          )}
                          <span className="capitalize">{col.replace(/_/g, " ")}</span>
                          {onSortChange && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSorted) {
                                  // Toggle direction or remove sort
                                  if (sortDirection === "asc") {
                                    onSortChange(col, "desc");
                                  } else {
                                    onSortChange(null, "asc");
                                  }
                                } else {
                                  onSortChange(col, "asc");
                                }
                              }}
                              className="ml-1 flex items-center text-[#6b7280] hover:text-[#111827] transition-colors"
                              title={`Sort by ${col.replace(/_/g, " ")}`}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              {isSorted ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
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

