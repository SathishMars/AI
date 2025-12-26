// INSIGHTS-SPECIFIC: Arrivals page component
"use client";

import React, { useState, useEffect } from "react";
import InsightsArrivalsTable from "./ArrivalsTable";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { Lock, LayoutTemplate, Upload, Search, ChevronLeft, Columns3, Calendar } from "lucide-react";
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
  const [showAll, setShowAll] = useState(false);

  const displayedRows = showAll ? rows : rows.slice(0, 10);
  const displayedColumns = columns;

  // Auto-load data on component mount
  useEffect(() => {
    fetchArrivals();
  }, []);

  async function fetchArrivals(search?: string) {
    setLoading(true);
    setFetchStatus("loading");
    const query = `
      query Arrivals($q: String, $limit: Int!, $offset: Int!) {
        arrivalColumns
        arrivals(q: $q, limit: $limit, offset: $offset) {
          total
          limit
          offset
          rows {
            first_name
            middle_name
            last_name
            email
            phone
            mobile
            title
            mailing_address
            city
            state
            postal_code
            country
            company_name
            prefix
            employee_id
            concur_login_id
            attendee_type
            registration_status
            manual_status
            room_status
            air_status
            created_at
            updated_at
            internal_notes
          }
        }
      }
    `;

    try {
      const res = await apiFetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { q: search?.trim() || null, limit: 100, offset: 0 },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("GraphQL Fetch Error:", res.status, errorText);
        throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      console.log("GraphQL Response:", json);
      
      if (json.errors) {
        console.error("GraphQL Response Errors:", json.errors);
        throw new Error(json.errors[0].message);
      }

      const cols = json?.data?.arrivalColumns ?? [];
      const payload = json?.data?.arrivals;
      const fetchedRows = payload?.rows ?? [];

      console.log("Fetched columns:", cols);
      console.log("Fetched rows:", fetchedRows);
      console.log("Fetched total:", payload?.total ?? 0);

      setColumns(cols);
      setRows(fetchedRows);
      setTotal(payload?.total ?? 0);
      setFetchStatus("success");
    } catch (err) {
      console.error(err);
      setFetchStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full max-w-full flex-col">
      {/* Row 1: Back + Actions */}
      <div className="mb-4 flex items-center justify-between pt-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[13px] font-medium text-[#111827] hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <button className="rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb]">
            Save Changes
          </button>
          <button
            onClick={openAime}
            className="flex items-center gap-2 rounded-md bg-[#a855f7] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#9333ea]"
          >
            <Upload className="h-3 w-3" />
            Export
          </button>
        </div>
      </div>

      {/* Row 2: Title & Badges */}
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-[20px] font-bold text-[#111827]">Arrivals by Date</h1>
        <div className="flex items-center gap-2">
          <span className="flex items-center rounded-full bg-[#f3e8ff] px-2 py-0.5 text-[10px] font-medium text-[#9333ea]">
            <Lock className="mr-1 h-3 w-3" />
            My Reports
          </span>
          <span className="flex items-center rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-medium text-[#4b5563]">
            <LayoutTemplate className="mr-1 h-3 w-3" />
            Template
          </span>
        </div>
      </div>

      {/* Row 3: Date */}
      <div className="mb-4 flex items-center gap-2 text-[11px] text-[#6b7280]">
        <Calendar className="h-3 w-3" />
        <span>Nov 8, 2025</span>
      </div>

      {/* Row 4: Toolbar */}
      <div className="mb-3 flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-[12px] text-[#6b7280]">Realtime data from your event</div>
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
                if (e.key === "Enter") fetchArrivals(q);
              }}
            />
          </div>

          <button className="flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] shadow-sm">
            <Columns3 className="h-3 w-3 text-[#6b7280]" />
            Pick Columns
          </button>
        </div>
      </div>

      {/* Row 5: Status Summary */}
      <div className="pb-2 flex items-center gap-3 text-[11px] text-[#6b7280]">
        <span>
          {loading ? "Loading..." : rows.length > 0 ? `Showing ${displayedRows.length} of ${total}` : ""}
        </span>
        {rows.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[#9333ea] font-semibold hover:underline bg-[#f3e8ff] px-2 py-0.5 rounded-full"
          >
            {showAll ? "Show Less" : "Show More"}
          </button>
        )}
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-hidden pb-4">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading data...</div>
        ) : fetchStatus === "error" ? (
          <div className="p-4 text-center text-red-500">
            Error loading data. Please check the console for details.
          </div>
        ) : rows.length > 0 ? (
          <div className="h-full overflow-hidden">
            <InsightsArrivalsTable rows={displayedRows} columnOrder={displayedColumns} loading={loading} showAll={showAll} />
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

