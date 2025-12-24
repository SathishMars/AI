// INSIGHTS-SPECIFIC: Arrivals table component
import { insightsAttendeeColumns } from "@/app/lib/insights/data";

type ArrivalsTableProps = {
  rows: Record<string, any>[];
  columnOrder: string[];
  loading: boolean;
  showAll: boolean;
};

export default function InsightsArrivalsTable({ rows, columnOrder, loading, showAll }: ArrivalsTableProps) {
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
    <div className="flex flex-col gap-4">
      <div className={`overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white max-w-full ${showAll ? "h-full" : ""}`}>
        <div className={`overflow-x-auto w-full ${showAll ? "overflow-y-auto h-full" : ""}`}>
          <table className="w-full border-collapse">
            <thead className="bg-[#f3f4f6] sticky top-0 z-10">
              <tr className="text-left text-[12px] text-[#111827]">
                {displayedHeaders.map((col) => (
                  <th key={col} className="px-4 py-2 font-medium whitespace-nowrap capitalize">
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedRows.length > 0 ? (
                displayedRows.map((row, idx) => (
                  <tr
                    key={row.email || idx}
                    className="border-t border-[#e5e7eb] text-[12px] text-[#111827] hover:bg-gray-50 transition-colors"
                  >
                    {displayedHeaders.map((col) => (
                      <td key={col} className="px-4 py-2 whitespace-nowrap">
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

