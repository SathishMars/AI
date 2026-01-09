// INSIGHTS-SPECIFIC: Arrivals table component
import { insightsAttendeeColumns } from "@/app/lib/insights/data";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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
}: ArrivalsTableProps) {
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

  // Use columnOrder if available, fall back to row keys or insightsAttendeeColumns
  const allHeaders = columnOrder.length > 0
    ? columnOrder
    : rows.length > 0
      ? Object.keys(rows[0])
      : insightsAttendeeColumns;

  const displayedHeaders = allHeaders;
  const displayedRows = rows;

  console.log("ArrivalsTable rendering:", {
    rowsCount: rows.length,
    headersCount: displayedHeaders.length,
    firstRow: rows[0]
  });

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white h-full flex flex-col">
        <div className={`w-full h-full overflow-x-auto flex flex-col ${showAll ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
          <table className="w-full border-collapse">
            <thead className="bg-[#f3f4f6] sticky top-0 z-10">
              <tr className="text-left text-[12px] text-[#111827]">
                {displayedHeaders.map((col) => {
                  const dataType = getColumnDataType(rows, col);
                  const isSorted = sortColumn === col;
                  return (
                    <th key={col} className="px-4 py-1.5 font-medium whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="capitalize">{col.replace(/_/g, " ")}</span>
                          {onSortChange && (
                            <button
                              onClick={() => {
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
                        <span className="text-[10px] font-normal text-[#6b7280]">{dataType}</span>
                        {onFilterChange && (
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={filters[col] || ""}
                            onChange={(e) => {
                              const newFilters = { ...filters };
                              if (e.target.value.trim()) {
                                newFilters[col] = e.target.value;
                              } else {
                                delete newFilters[col];
                              }
                              onFilterChange(newFilters);
                            }}
                            className="mt-1 w-full rounded border border-[#e5e7eb] bg-white px-2 py-0.5 text-[10px] outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                        )}
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

